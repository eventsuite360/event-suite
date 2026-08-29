import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to create public.registrations table...');
  const connectionString = process.env.POSTGRES_URL;

  const client = connectionString
    ? new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    : new Client({
        user: 'postgres',
        password: 'n@gYV/k8Wqf3e!=',
        host: 'db.bskmtfanhwsvzacprhos.supabase.co',
        port: 5432,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
      });

  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        gender TEXT NOT NULL,
        age INTEGER NOT NULL,
        email TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        created_by_user_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_created_by ON public.registrations(created_by_user_id);

      ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admin full access on registrations" ON public.registrations;
      CREATE POLICY "Admin full access on registrations" ON public.registrations FOR ALL TO authenticated USING (true);
    `);

    console.log('Successfully created public.registrations table.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
