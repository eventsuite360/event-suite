import { NextRequest, NextResponse } from 'next/server';
import { isServerAdminAuthenticated } from '@/lib/session';
import { getPgClient } from '@/lib/db';

// GET /api/admin/users - List all users
export async function GET() {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getPgClient();
  try {
    await client.connect();
    const result = await client.query(`
      SELECT 
        p.id,
        p.full_name,
        p.email,
        p.role,
        p.created_at
      FROM public.profiles p
      ORDER BY p.created_at DESC
    `);
    return NextResponse.json({ users: result.rows });
  } catch (err: any) {
    console.error('[API /api/admin/users GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}

// POST /api/admin/users - Create new user (auth.users + profiles)
export async function POST(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { full_name, email, password, role } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      // Check existing email
      const checkRes = await client.query(
        `SELECT id FROM auth.users WHERE email = $1`,
        [email.trim()]
      );

      if (checkRes.rows.length > 0) {
        return NextResponse.json(
          { error: 'A user with this email address already exists.' },
          { status: 400 }
        );
      }

      // Insert into auth.users
      const createUserRes = await client.query(
        `
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          $3,
          NOW(),
          NOW()
        )
        RETURNING id;
      `,
        [email.trim(), password.trim(), JSON.stringify({ full_name: full_name.trim() })]
      );

      const userId = createUserRes.rows[0].id;

      // Insert into public.profiles
      await client.query(
        `
        INSERT INTO public.profiles (id, full_name, email, role)
        VALUES ($1, $2, $3, $4)
      `,
        [userId, full_name.trim(), email.trim(), role || 'admin']
      );

      return NextResponse.json({ message: 'User created successfully', id: userId });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/users POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/admin/users - Edit user details (name/role)
export async function PUT(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, full_name, role } = await req.json();

    if (!id || !full_name) {
      return NextResponse.json({ error: 'User ID and full name are required.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(
        `
        UPDATE public.profiles
        SET full_name = $1,
            role = $2
        WHERE id = $3
      `,
        [full_name.trim(), role || 'admin', id]
      );

      return NextResponse.json({ message: 'User updated successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/users PUT Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete user
export async function DELETE(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID parameter missing.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(`DELETE FROM auth.users WHERE id = $1`, [userId]);
      return NextResponse.json({ message: 'User deleted successfully' });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/admin/users DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 500 });
  }
}
