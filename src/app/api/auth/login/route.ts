import { NextRequest, NextResponse } from 'next/server';
import { setAdminSessionCookie } from '@/lib/session';
import { getPgClient } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const submittedPassword = password.trim();

    // 1. Platform Admin Check
    const expectedEmail = (process.env.ADMIN_EMAIL || 'event.admin@gmail.com').trim().toLowerCase();
    const expectedPassword = (process.env.ADMIN_PASSWORD || 'EventAdmin2026!SecurePass#').trim();

    if (normalizedEmail === expectedEmail && submittedPassword === expectedPassword) {
      await setAdminSessionCookie(normalizedEmail, 'admin', null);
      return NextResponse.json({ success: true, redirect: '/admin' });
    }

    // Database Checks (Event Admin & Event Sub-User)
    const client = getPgClient();
    await client.connect();

    try {
      // 2. Per-Event Admin Credential Check
      const eventRes = await client.query(
        `SELECT id, name, slug, event_admin_email, event_admin_password 
         FROM public.events 
         WHERE lower(event_admin_email) = $1`,
        [normalizedEmail]
      );

      if (eventRes.rows.length > 0) {
        const event = eventRes.rows[0];

        if (event.event_admin_password && event.event_admin_password.trim() === submittedPassword) {
          await setAdminSessionCookie(event.event_admin_email, 'event_admin', event.id, {
            canAccessRegistration: true,
            canAccessExpenseRevenue: true,
          });
          return NextResponse.json({ success: true, redirect: '/event-dashboard' });
        }
      }

      // 3. Event Sub-User Credential Check
      const subUserRes = await client.query(
        `SELECT id, event_id, full_name, email, password, can_access_registration, can_access_expense_revenue 
         FROM public.event_users 
         WHERE lower(email) = $1`,
        [normalizedEmail]
      );

      if (subUserRes.rows.length > 0) {
        const subUser = subUserRes.rows[0];

        if (subUser.password && subUser.password.trim() === submittedPassword) {
          await setAdminSessionCookie(subUser.email, 'event_sub_user', subUser.event_id, {
            canAccessRegistration: !!subUser.can_access_registration,
            canAccessExpenseRevenue: !!subUser.can_access_expense_revenue,
          });
          return NextResponse.json({ success: true, redirect: '/event-dashboard' });
        }
      }
    } finally {
      await client.end();
    }

    // 4. Fallback: No credential matched
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('[API /api/auth/login Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
