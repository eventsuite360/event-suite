import { NextRequest, NextResponse } from 'next/server';
import { isServerAdminAuthenticated } from '@/lib/session';
import { generateRandomPassword, generateEventAdminEmail } from '@/lib/credentials';
import { getPgClient } from '@/lib/db';

// GET /api/admin/events - List all events including credentials
export async function GET() {
  if (!(await isServerAdminAuthenticated())) {
    console.warn('[API /api/admin/events GET Warning]: Request unauthenticated (no valid session cookie).');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getPgClient();
  try {
    await client.connect();
    const result = await client.query(`
      SELECT 
        id,
        name,
        slug,
        status,
        event_admin_email,
        event_admin_password,
        created_by,
        created_at,
        updated_at
      FROM public.events
      ORDER BY created_at DESC
    `);
    console.log(`[API /api/admin/events GET Success]: Retracted ${result.rows.length} events from DB.`);
    return NextResponse.json({ events: result.rows });
  } catch (err: any) {
    console.error('[API /api/admin/events GET Error Message]:', err?.message || err);
    console.error('[API /api/admin/events GET Error Stack]:', err?.stack || 'No stack trace');
    if (err && typeof err === 'object') {
      try {
        console.error('[API /api/admin/events GET Error Details]:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

// POST /api/admin/events - Create new event with short permanent credentials
export async function POST(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    console.warn('[API /api/admin/events POST Warning]: Request unauthenticated.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Event name and slug are required.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase();
    const client = getPgClient();
    await client.connect();

    try {
      // Check slug uniqueness
      const checkRes = await client.query(
        `SELECT id FROM public.events WHERE slug = $1`,
        [cleanSlug]
      );

      if (checkRes.rows.length > 0) {
        return NextResponse.json(
          { error: 'An event with this slug already exists.' },
          { status: 400 }
        );
      }

      // Auto-generate short per-event admin credentials
      const eventAdminEmail = generateEventAdminEmail(cleanSlug);
      const eventAdminPassword = generateRandomPassword(12);

      const res = await client.query(
        `
        INSERT INTO public.events (
          name,
          slug,
          status,
          event_admin_email,
          event_admin_password
        ) VALUES ($1, $2, 'draft', $3, $4)
        RETURNING id;
      `,
        [
          name.trim(),
          cleanSlug,
          eventAdminEmail,
          eventAdminPassword,
        ]
      );

      return NextResponse.json({
        message: 'Event created successfully',
        id: res.rows[0].id,
        event_admin_email: eventAdminEmail,
        event_admin_password: eventAdminPassword,
        plain_password: eventAdminPassword,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/events POST Error Message]:', err?.message || err);
    console.error('[API /api/admin/events POST Error Stack]:', err?.stack || 'No stack trace');
    return NextResponse.json({ error: err.message || 'Failed to create event' }, { status: 500 });
  }
}

// PUT /api/admin/events - Edit event name and slug
export async function PUT(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    console.warn('[API /api/admin/events PUT Warning]: Request unauthenticated.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, slug } = await req.json();

    if (!id || !name || !slug) {
      return NextResponse.json(
        { error: 'Event ID, name, and slug are required.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase();
    const client = getPgClient();
    await client.connect();

    try {
      // Check slug collision with another event
      const checkRes = await client.query(
        `SELECT id FROM public.events WHERE slug = $1 AND id != $2`,
        [cleanSlug, id]
      );

      if (checkRes.rows.length > 0) {
        return NextResponse.json(
          { error: 'An event with this slug already exists.' },
          { status: 400 }
        );
      }

      await client.query(
        `
        UPDATE public.events
        SET name = $1,
            slug = $2,
            updated_at = NOW()
        WHERE id = $3
      `,
        [
          name.trim(),
          cleanSlug,
          id,
        ]
      );

      return NextResponse.json({ message: 'Event updated successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/events PUT Error Message]:', err?.message || err);
    console.error('[API /api/admin/events PUT Error Stack]:', err?.stack || 'No stack trace');
    return NextResponse.json({ error: err.message || 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/admin/events - Delete event
export async function DELETE(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    console.warn('[API /api/admin/events DELETE Warning]: Request unauthenticated.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID parameter missing.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(`DELETE FROM public.events WHERE id = $1`, [id]);
      return NextResponse.json({ message: 'Event deleted successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/events DELETE Error Message]:', err?.message || err);
    console.error('[API /api/admin/events DELETE Error Stack]:', err?.stack || 'No stack trace');
    return NextResponse.json({ error: err.message || 'Failed to delete event' }, { status: 500 });
  }
}
