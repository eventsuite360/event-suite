import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';

// GET /api/event-dashboard/expense-revenue - List scoped entries and event totals
export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user' && session.canAccessExpenseRevenue === false) {
      return NextResponse.json({ error: 'Forbidden — Module access required' }, { status: 403 });
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
      let totals = null;
      let entriesRes;
      let totalCount = 0;

      if (session.role === 'event_sub_user') {
        // Sub-users see ONLY their own individual entries and MUST NOT receive event aggregate totals
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS count
           FROM public.expense_revenue_entries
           WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)`,
          [targetEventId, session.email]
        );
        totalCount = countRes.rows[0]?.count || 0;

        entriesRes = await client.query(
          `SELECT id, event_id, created_by_user_id, created_by_user_name, type, subject, amount, created_at 
           FROM public.expense_revenue_entries 
           WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`,
          [targetEventId, session.email, limit, offset]
        );
      } else {
        // Event Admin & Platform Admin see ALL entries with creator names and event totals
        const totalsRes = await client.query(
          `SELECT 
             COUNT(*)::int AS count,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
             COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS total_revenue
           FROM public.expense_revenue_entries
           WHERE event_id = $1`,
          [targetEventId]
        );

        totalCount = totalsRes.rows[0]?.count || 0;
        const totalExpenses = parseFloat(totalsRes.rows[0]?.total_expenses || '0');
        const totalRevenue = parseFloat(totalsRes.rows[0]?.total_revenue || '0');
        const netBalance = totalRevenue - totalExpenses;

        totals = {
          totalExpenses,
          totalRevenue,
          netBalance,
        };

        entriesRes = await client.query(
          `SELECT id, event_id, created_by_user_id, created_by_user_name, type, subject, amount, created_at 
           FROM public.expense_revenue_entries 
           WHERE event_id = $1 
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [targetEventId, limit, offset]
        );
      }

      const totalPages = Math.ceil(totalCount / limit) || 1;

      return NextResponse.json({
        totals,
        entries: entriesRes.rows,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
        userRole: session.role,
        currentUserEmail: session.email,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/expense-revenue GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/event-dashboard/expense-revenue - Create a new expense/revenue entry
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user' && session.canAccessExpenseRevenue === false) {
      return NextResponse.json({ error: 'Forbidden — Module access required' }, { status: 403 });
    }

    const { type, subject, amount } = await req.json();

    if (!type || (type !== 'expense' && type !== 'revenue')) {
      return NextResponse.json({ error: 'Type must be "expense" or "revenue".' }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
    }

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
        if (subUserRes.rows.length > 0) {
          creatorName = subUserRes.rows[0].full_name;
        } else {
          creatorName = session.email;
        }
      } else if (session.role === 'admin') {
        creatorName = 'Platform Admin';
      }

      const insertRes = await client.query(
        `INSERT INTO public.expense_revenue_entries (
           event_id, 
           created_by_user_id, 
           created_by_user_name, 
           type, 
           subject, 
           amount
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [session.eventId, session.email, creatorName, type, subject.trim(), numericAmount]
      );

      return NextResponse.json({
        message: 'Entry created successfully',
        entry: insertRes.rows[0],
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/expense-revenue POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to create entry' }, { status: 500 });
  }
}

// PUT /api/event-dashboard/expense-revenue - Edit an entry
export async function PUT(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, type, subject, amount } = await req.json();

    if (!id || !type || (type !== 'expense' && type !== 'revenue')) {
      return NextResponse.json({ error: 'Valid entry ID and type are required.' }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      // Permission Check: Sub-users can only edit their own entries
      if (session.role === 'event_sub_user') {
        const checkRes = await client.query(
          `SELECT created_by_user_id FROM public.expense_revenue_entries WHERE id = $1 AND event_id = $2`,
          [id, session.eventId]
        );

        if (checkRes.rows.length === 0) {
          return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
        }

        if (checkRes.rows[0].created_by_user_id.toLowerCase() !== session.email.toLowerCase()) {
          return NextResponse.json({ error: 'Forbidden — You can only edit your own entries.' }, { status: 403 });
        }
      }

      await client.query(
        `UPDATE public.expense_revenue_entries
         SET type = $1, subject = $2, amount = $3, updated_at = NOW()
         WHERE id = $4 AND event_id = $5`,
        [type, subject.trim(), numericAmount, id, session.eventId]
      );

      return NextResponse.json({ message: 'Entry updated successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/expense-revenue PUT Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE /api/event-dashboard/expense-revenue - Delete an entry
export async function DELETE(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      // Permission Check: Sub-users can only delete their own entries
      if (session.role === 'event_sub_user') {
        const checkRes = await client.query(
          `SELECT created_by_user_id FROM public.expense_revenue_entries WHERE id = $1 AND event_id = $2`,
          [entryId, session.eventId]
        );

        if (checkRes.rows.length === 0) {
          return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
        }

        if (checkRes.rows[0].created_by_user_id.toLowerCase() !== session.email.toLowerCase()) {
          return NextResponse.json({ error: 'Forbidden — You cannot delete other users\' entries.' }, { status: 403 });
        }
      }

      await client.query(
        `DELETE FROM public.expense_revenue_entries WHERE id = $1 AND event_id = $2`,
        [entryId, session.eventId]
      );

      return NextResponse.json({ message: 'Entry deleted successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/expense-revenue DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete entry' }, { status: 500 });
  }
}
