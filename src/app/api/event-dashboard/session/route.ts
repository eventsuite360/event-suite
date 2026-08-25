import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || (session.role !== 'event_admin' && session.role !== 'event_sub_user') || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getPgClient();
    await client.connect();
    try {
      const eventRes = await client.query(
        `SELECT id, name, slug, event_admin_email FROM public.events WHERE id = $1`,
        [session.eventId]
      );

      if (eventRes.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      let canAccessRegistration = true;
      let canAccessExpenseRevenue = true;

      if (session.role === 'event_sub_user') {
        const subUserRes = await client.query(
          `SELECT can_access_registration, can_access_expense_revenue FROM public.event_users WHERE lower(email) = lower($1) AND event_id = $2`,
          [session.email, session.eventId]
        );
        if (subUserRes.rows.length > 0) {
          canAccessRegistration = !!subUserRes.rows[0].can_access_registration;
          canAccessExpenseRevenue = !!subUserRes.rows[0].can_access_expense_revenue;
        }
      }

      return NextResponse.json({
        session: {
          email: session.email,
          role: session.role,
          eventId: session.eventId,
          canAccessRegistration,
          canAccessExpenseRevenue,
        },
        event: eventRes.rows[0],
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/session Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
