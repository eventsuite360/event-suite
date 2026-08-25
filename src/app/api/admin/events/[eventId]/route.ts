import { NextRequest, NextResponse } from 'next/server';
import { isServerPlatformAdminAuthenticated } from '@/lib/session';
import { getPgClient } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!(await isServerPlatformAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized — Platform Admin access required' }, { status: 401 });
  }

  const { eventId } = await params;

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  const client = getPgClient();
  try {
    await client.connect();

    // 1. Fetch Event Metadata
    const eventRes = await client.query(
      `SELECT id, name, slug, status, event_admin_email, event_admin_password, created_at, updated_at 
       FROM public.events 
       WHERE id = $1`,
      [eventId]
    );

    if (eventRes.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2. Fetch Event Sub-Users
    const subUsersRes = await client.query(
      `SELECT id, full_name, email, password, can_access_registration, can_access_expense_revenue, created_at 
       FROM public.event_users 
       WHERE event_id = $1 
       ORDER BY created_at DESC`,
      [eventId]
    );

    // 3. Fetch Expense & Revenue Totals
    const totalsRes = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
         COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS total_revenue
       FROM public.expense_revenue_entries
       WHERE event_id = $1`,
      [eventId]
    );

    const totalExpenses = parseFloat(totalsRes.rows[0].total_expenses || '0');
    const totalRevenue = parseFloat(totalsRes.rows[0].total_revenue || '0');
    const netBalance = totalRevenue - totalExpenses;

    // 4. Fetch All Expense & Revenue Entries (With Creator Names)
    const entriesRes = await client.query(
      `SELECT id, event_id, created_by_user_id, created_by_user_name, type, subject, amount, created_at 
       FROM public.expense_revenue_entries 
       WHERE event_id = $1 
       ORDER BY created_at DESC`,
      [eventId]
    );

    return NextResponse.json({
      event: eventRes.rows[0],
      subUsers: subUsersRes.rows,
      totals: {
        totalExpenses,
        totalRevenue,
        netBalance,
      },
      entries: entriesRes.rows,
    });
  } catch (err: any) {
    console.error('[API /api/admin/events/[eventId] GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  } finally {
    await client.end();
  }
}
