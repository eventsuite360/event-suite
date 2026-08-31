import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';

// GET /api/event-dashboard/registration/duplicates - Fetch recorded duplicate submissions for event
export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can view duplicate submissions.' },
        { status: 403 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      const res = await client.query(
        `SELECT 
           d.id,
           d.event_id,
           d.matched_registration_id,
           d.full_name,
           d.phone_number,
           d.gender,
           d.age,
           d.email,
           d.source,
           d.submitted_at,
           d.created_at,
           r.full_name AS matched_original_name,
           r.email AS matched_original_email,
           r.phone_number AS matched_original_phone
         FROM public.registration_duplicate_submissions d
         LEFT JOIN public.registrations r ON d.matched_registration_id = r.id
         WHERE d.event_id = $1
         ORDER BY d.created_at DESC`,
        [session.eventId]
      );

      return NextResponse.json({
        duplicates: res.rows,
        count: res.rows.length,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/duplicates GET Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch duplicate submissions.' },
      { status: 500 }
    );
  }
}
