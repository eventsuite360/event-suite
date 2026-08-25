import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to create public.event_users table...');
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
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.event_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE public.event_users ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admin full access on event_users" ON public.event_users;
      CREATE POLICY "Admin full access on event_users" ON public.event_users FOR ALL TO authenticated USING (true);
    `);

    console.log('Successfully created public.event_users table.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
