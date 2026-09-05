import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';

// GET /api/event-dashboard/registration - List scoped registrations with DB pagination & server-side SQL analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user' && session.canAccessRegistration === false) {
      return NextResponse.json({ error: 'Forbidden — Registration module access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetEventId = searchParams.get('eventId') || session.eventId;
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = searchParams.get('limit') || '25';
    const isExport = rawLimit === 'all' || rawLimit === '0';
    const limit = isExport ? 10000 : Math.max(1, Math.min(100, parseInt(rawLimit, 10)));
    const offset = (page - 1) * limit;

    const client = getPgClient();
    await client.connect();

    try {
      let analytics = null;
      let registrationsRes;
      let totalCount = 0;

      if (session.role === 'event_sub_user') {
        // Sub-users see ONLY their own entries (DB filtered) & NO analytics
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS count
           FROM public.registrations
           WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)`,
          [targetEventId, session.email]
        );
        totalCount = countRes.rows[0]?.count || 0;

        registrationsRes = await client.query(
          `SELECT id, event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name, created_at, updated_at
           FROM public.registrations
           WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`,
          [targetEventId, session.email, limit, offset]
        );
      } else {
        // Event Admin & Platform Admin: Server-Side SQL Analytics Aggregation
        const analyticsRes = await client.query(
          `SELECT 
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE lower(gender) IN ('male', 'm'))::int AS male,
             COUNT(*) FILTER (WHERE lower(gender) IN ('female', 'f'))::int AS female,
             COUNT(*) FILTER (WHERE lower(gender) NOT IN ('male', 'm', 'female', 'f'))::int AS other,
             COUNT(*) FILTER (WHERE age > 0 AND age <= 18)::int AS age_0_18,
             COUNT(*) FILTER (WHERE age > 18 AND age <= 30)::int AS age_19_30,
             COUNT(*) FILTER (WHERE age > 30 AND age <= 45)::int AS age_31_45,
             COUNT(*) FILTER (WHERE age > 45)::int AS age_46_plus
           FROM public.registrations
           WHERE event_id = $1`,
          [targetEventId]
        );

        const aRow = analyticsRes.rows[0] || {};
        totalCount = aRow.total || 0;

        analytics = {
          total: totalCount,
          gender: {
            Male: aRow.male || 0,
            Female: aRow.female || 0,
            Other: aRow.other || 0,
          },
          age: {
            '0-18': aRow.age_0_18 || 0,
            '19-30': aRow.age_19_30 || 0,
            '31-45': aRow.age_31_45 || 0,
            '46+': aRow.age_46_plus || 0,
          },
        };

        // Scoped DB Paginated list query
        registrationsRes = await client.query(
          `SELECT id, event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name, created_at, updated_at
           FROM public.registrations
           WHERE event_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [targetEventId, limit, offset]
        );
      }

      const eventRes = await client.query(
        `SELECT google_sheet_url, google_sheet_last_synced_at FROM public.events WHERE id = $1`,
        [targetEventId]
      );
      const eventInfo = eventRes.rows[0] || {};

      const totalPages = Math.ceil(totalCount / limit) || 1;

      return NextResponse.json({
        registrations: registrationsRes.rows,
        analytics,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
        userRole: session.role,
        currentUserEmail: session.email,
        googleSheetUrl: eventInfo.google_sheet_url || null,
        googleSheetLastSyncedAt: eventInfo.google_sheet_last_synced_at || null,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/event-dashboard/registration - Add single or bulk registrations
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user' && session.canAccessRegistration === false) {
      return NextResponse.json({ error: 'Forbidden — Registration module access required' }, { status: 403 });
    }

    const body = await req.json();

    const client = getPgClient();
    await client.connect();

    try {
      // Determine display name of creator
      let creatorName = 'Event Admin';
      if (session.role === 'event_sub_user') {
        const subUserRes = await client.query(
          `SELECT full_name FROM public.event_users WHERE lower(email) = lower($1) AND event_id = $2`,
          [session.email, session.eventId]
        );
        if (subUserRes.rows.length > 0 && subUserRes.rows[0].full_name) {
          creatorName = subUserRes.rows[0].full_name;
        } else {
          creatorName = session.email;
        }
      } else if (session.role === 'admin') {
        creatorName = 'Platform Admin';
      }

      // Check if bulk insert (Import CSV)
      if (Array.isArray(body.registrations)) {
        if (session.role === 'event_sub_user') {
          return NextResponse.json({ error: 'Forbidden — Only admins can import CSV registrations.' }, { status: 403 });
        }

        const items = body.registrations;
        if (items.length === 0) {
          return NextResponse.json({ error: 'No registrations provided for import.' }, { status: 400 });
        }

        await client.query('BEGIN');
        let insertedCount = 0;

        for (const item of items) {
          const rawName = (item.full_name || '').trim();
          const rawPhone = (item.phone_number || '').trim();
          const rawGender = (item.gender || '').trim();
          const rawEmail = (item.email || '').trim().toLowerCase();
          const rawAge = item.age;

          // Skip ONLY completely empty rows (no data in any column)
          if (!rawName && !rawPhone && !rawGender && !rawEmail && (rawAge === undefined || rawAge === null || rawAge === '')) {
            continue;
          }

          let parsedAge = parseInt(rawAge, 10);
          if (isNaN(parsedAge) || parsedAge < 0) {
            parsedAge = 0;
          }

          await client.query(
            `INSERT INTO public.registrations (
               event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [session.eventId, rawName, rawPhone, rawGender, parsedAge, rawEmail, session.email, creatorName]
          );

          insertedCount++;
        }

        await client.query('COMMIT');

        const message = `${insertedCount} registration${insertedCount === 1 ? '' : 's'} imported`;

        return NextResponse.json({
          message,
          count: insertedCount,
        });
      }

      // Single Registration Insert (All fields optional)
      const { full_name, phone_number, gender, age, email } = body;

      const cleanName = (full_name || '').trim();
      const cleanPhone = (phone_number || '').trim();
      const cleanGender = (gender || '').trim();
      let parsedAge = 0;
      if (age !== undefined && age !== null && age !== '') {
        const num = parseInt(age, 10);
        if (!isNaN(num) && num >= 0) {
          parsedAge = num;
        }
      }
      const cleanEmail = (email || '').trim().toLowerCase();

      const insertRes = await client.query(
        `INSERT INTO public.registrations (
           event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [session.eventId, cleanName, cleanPhone, cleanGender, parsedAge, cleanEmail, session.email, creatorName]
      );

      return NextResponse.json({
        message: 'Registration added successfully',
        registration: insertRes.rows[0],
      });
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to add registration' }, { status: 500 });
  }
}

// PUT /api/event-dashboard/registration - Update registration entry
export async function PUT(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, full_name, phone_number, gender, age, email } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
    }

    const cleanName = (full_name || '').trim();
    const cleanPhone = (phone_number || '').trim();
    const cleanGender = (gender || '').trim();
    let parsedAge = 0;
    if (age !== undefined && age !== null && age !== '') {
      const num = parseInt(age, 10);
      if (!isNaN(num) && num >= 0) {
        parsedAge = num;
      }
    }
    const cleanEmail = (email || '').trim().toLowerCase();

    const client = getPgClient();
    await client.connect();

    try {
      if (session.role === 'event_sub_user') {
        const checkRes = await client.query(
          `SELECT created_by_user_id FROM public.registrations WHERE id = $1 AND event_id = $2`,
          [id, session.eventId]
        );

        if (checkRes.rows.length === 0) {
          return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
        }

        if (checkRes.rows[0].created_by_user_id.toLowerCase() !== session.email.toLowerCase()) {
          return NextResponse.json({ error: 'Forbidden — You can only edit your own registration entries.' }, { status: 403 });
        }
      }

      await client.query(
        `UPDATE public.registrations
         SET full_name = $1, phone_number = $2, gender = $3, age = $4, email = $5, updated_at = NOW()
         WHERE id = $6 AND event_id = $7`,
        [cleanName, cleanPhone, cleanGender, parsedAge, cleanEmail, id, session.eventId]
      );

      return NextResponse.json({ message: 'Registration updated successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration PUT Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update registration' }, { status: 500 });
  }
}

// DELETE /api/event-dashboard/registration - Delete single or ALL registration entries (Admins only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json({ error: 'Forbidden — Only admins can delete registration entries.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true' || id === 'all';

    const client = getPgClient();
    await client.connect();

    try {
      if (deleteAll) {
        const deleteRes = await client.query(
          `DELETE FROM public.registrations WHERE event_id = $1`,
          [session.eventId]
        );

        return NextResponse.json({
          message: 'All registrations for this event deleted successfully',
          deletedCount: deleteRes.rowCount,
        });
      }

      if (!id) {
        return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
      }

      await client.query(
        `DELETE FROM public.registrations WHERE id = $1 AND event_id = $2`,
        [id, session.eventId]
      );

      return NextResponse.json({ message: 'Registration deleted successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete registration' }, { status: 500 });
  }
}
