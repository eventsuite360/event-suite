import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';

// GET /api/event-dashboard/registration - List scoped registrations and analytics
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

    const client = getPgClient();
    await client.connect();

    try {
      let analytics = null;
      let registrationsRes;

      if (session.role === 'event_sub_user') {
        // Sub-users see ONLY their own created entries and MUST NOT receive analytics/totals
        registrationsRes = await client.query(
          `SELECT id, event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name, created_at, updated_at
           FROM public.registrations
           WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)
           ORDER BY created_at DESC`,
          [targetEventId, session.email]
        );
      } else {
        // Event Admin & Platform Admin see ALL registrations and aggregate analytics
        registrationsRes = await client.query(
          `SELECT id, event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name, created_at, updated_at
           FROM public.registrations
           WHERE event_id = $1
           ORDER BY created_at DESC`,
          [targetEventId]
        );

        const rows = registrationsRes.rows;
        const total = rows.length;

        const genderCounts = { Male: 0, Female: 0, Other: 0 };
        const ageCounts = { '0-18': 0, '19-30': 0, '31-45': 0, '46+': 0 };

        rows.forEach((r) => {
          // Gender analytics
          const g = (r.gender || '').toLowerCase();
          if (g === 'male' || g === 'm') genderCounts.Male++;
          else if (g === 'female' || g === 'f') genderCounts.Female++;
          else genderCounts.Other++;

          // Age range analytics
          const age = parseInt(r.age, 10) || 0;
          if (age <= 18) ageCounts['0-18']++;
          else if (age <= 30) ageCounts['19-30']++;
          else if (age <= 45) ageCounts['31-45']++;
          else ageCounts['46+']++;
        });

        analytics = {
          total,
          gender: genderCounts,
          age: ageCounts,
        };
      }

      return NextResponse.json({
        registrations: registrationsRes.rows,
        analytics,
        userRole: session.role,
        currentUserEmail: session.email,
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
        // Bulk import is ONLY allowed for Event Admin & Platform Admin
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
          const { full_name, phone_number, gender, age, email } = item;
          if (!full_name || !phone_number || !gender || age === undefined || !email) {
            continue;
          }

          const parsedAge = parseInt(age, 10);
          if (isNaN(parsedAge) || parsedAge < 0) continue;

          await client.query(
            `INSERT INTO public.registrations (
               event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [session.eventId, full_name.trim(), phone_number.trim(), gender.trim(), parsedAge, email.trim(), session.email, creatorName]
          );
          insertedCount++;
        }

        await client.query('COMMIT');

        return NextResponse.json({
          message: `Successfully imported ${insertedCount} registrations.`,
          count: insertedCount,
        });
      }

      // Single Registration Insert
      const { full_name, phone_number, gender, age, email } = body;

      if (!full_name || !full_name.trim()) {
        return NextResponse.json({ error: 'Full Name is required.' }, { status: 400 });
      }
      if (!phone_number || !phone_number.trim()) {
        return NextResponse.json({ error: 'Phone Number is required.' }, { status: 400 });
      }
      if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
        return NextResponse.json({ error: 'Gender must be Male, Female, or Other.' }, { status: 400 });
      }
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0) {
        return NextResponse.json({ error: 'Age must be a valid non-negative number.' }, { status: 400 });
      }
      if (!email || !email.trim() || !email.includes('@')) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
      }

      const insertRes = await client.query(
        `INSERT INTO public.registrations (
           event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [session.eventId, full_name.trim(), phone_number.trim(), gender, parsedAge, email.trim().toLowerCase(), session.email, creatorName]
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
    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Full Name is required.' }, { status: 400 });
    }
    if (!phone_number || !phone_number.trim()) {
      return NextResponse.json({ error: 'Phone Number is required.' }, { status: 400 });
    }
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      return NextResponse.json({ error: 'Gender must be Male, Female, or Other.' }, { status: 400 });
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0) {
      return NextResponse.json({ error: 'Age must be a valid non-negative number.' }, { status: 400 });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      // Server-side Ownership Check for Sub-users
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
        [full_name.trim(), phone_number.trim(), gender, parsedAge, email.trim().toLowerCase(), id, session.eventId]
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

// DELETE /api/event-dashboard/registration - Delete registration entry (Admins only)
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

    if (!id) {
      return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
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
