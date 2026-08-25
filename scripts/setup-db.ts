import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function setupDatabase() {
  console.log('Connecting to Supabase PostgreSQL database...');

  // Parse connection details or pass explicit parameters to avoid URL encoding issues
  const user = 'postgres';
  const password = 'n@gYV/k8Wqf3e!=';
  const host = 'db.bskmtfanhwsvzacprhos.supabase.co';
  const port = 5432;
  const database = 'postgres';

  const client = new Client({
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected to database.');

    // 1. Run schema DDL
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Executing database schema and RLS policies...');
    await client.query(schemaSql);
    console.log('Schema DDL executed successfully.');

    // 2. Check if admin user exists in auth.users
    const adminEmail = 'event.admin@gmail.com';
    const adminPass = 'EventAdmin2026!SecurePass#';
    
    const existingUserRes = await client.query(
      `SELECT id FROM auth.users WHERE email = $1`,
      [adminEmail]
    );

    let userId: string;

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;
      console.log(`Admin user ${adminEmail} already exists in auth.users (ID: ${userId}).`);
      
      // Update password to ensure login works reliably
      await client.query(`
        UPDATE auth.users
        SET encrypted_password = crypt($1, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = $2
      `, [adminPass, userId]);
      console.log('Admin password updated.');
    } else {
      console.log(`Seeding initial admin user (${adminEmail})...`);
      const createUserRes = await client.query(`
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
          '{"full_name":"Event Suite Admin"}',
          NOW(),
          NOW()
        )
        RETURNING id;
      `, [adminEmail, adminPass]);

      userId = createUserRes.rows[0].id;
      console.log(`Admin user created in auth.users with ID: ${userId}`);
    }

    // 3. Ensure profile row exists
    await client.query(`
      INSERT INTO public.profiles (id, full_name, email, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = 'admin';
    `, [userId, 'Event Suite Admin', adminEmail]);

    console.log('Admin profile ensured in public.profiles table.');
    console.log('\n==========================================');
    console.log('         SUPABASE DB SETUP COMPLETE       ');
    console.log('==========================================');
    console.log(`Admin Email:    ${adminEmail}`);
    console.log(`Admin Password: ${adminPass}`);
    console.log('==========================================');

  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
