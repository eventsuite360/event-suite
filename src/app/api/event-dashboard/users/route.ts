import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { generateRandomPassword, generateSubUserEmail } from '@/lib/credentials';
import { getPgClient } from '@/lib/db';

// GET /api/event-dashboard/users - List users for the current logged-in event
export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || session.role !== 'event_admin' || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getPgClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT id, event_id, full_name, email, password, can_access_registration, can_access_expense_revenue, created_at 
         FROM public.event_users 
         WHERE event_id = $1 
         ORDER BY created_at DESC`,
        [session.eventId]
      );

      return NextResponse.json({ users: res.rows });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/users GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/event-dashboard/users - Add a user to the current event (Auto-generate email & password)
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || session.role !== 'event_admin' || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name, can_access_registration, can_access_expense_revenue } = await req.json();

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Full Name is required.' },
        { status: 400 }
      );
    }

    const trimmedName = full_name.trim();
    const generatedEmail = generateSubUserEmail(trimmedName);
    const generatedPassword = generateRandomPassword(12);
    const canReg = Boolean(can_access_registration);
    const canExp = Boolean(can_access_expense_revenue);

    const client = getPgClient();
    await client.connect();

    try {
      const res = await client.query(
        `INSERT INTO public.event_users (event_id, full_name, email, password, can_access_registration, can_access_expense_revenue)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [session.eventId, trimmedName, generatedEmail, generatedPassword, canReg, canExp]
      );

      return NextResponse.json({
        message: 'Event user added successfully',
        id: res.rows[0].id,
        full_name: trimmedName,
        email: generatedEmail,
        password: generatedPassword,
        can_access_registration: canReg,
        can_access_expense_revenue: canExp,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/users POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to add user' }, { status: 500 });
  }
}

// PUT /api/event-dashboard/users - Update a user's details & module permissions
export async function PUT(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || session.role !== 'event_admin' || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, full_name, can_access_registration, can_access_expense_revenue } = await req.json();

    if (!id || !full_name || !full_name.trim()) {
      return NextResponse.json(
        { error: 'User ID and Full Name are required.' },
        { status: 400 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(
        `UPDATE public.event_users 
         SET full_name = $1, can_access_registration = $2, can_access_expense_revenue = $3
         WHERE id = $4 AND event_id = $5`,
        [full_name.trim(), Boolean(can_access_registration), Boolean(can_access_expense_revenue), id, session.eventId]
      );

      return NextResponse.json({ message: 'User updated successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/users PUT Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/event-dashboard/users - Remove a user from the current event
export async function DELETE(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || session.role !== 'event_admin' || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(
        `DELETE FROM public.event_users WHERE id = $1 AND event_id = $2`,
        [userId, session.eventId]
      );

      return NextResponse.json({ message: 'User removed successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/users DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to remove user' }, { status: 500 });
  }
}
