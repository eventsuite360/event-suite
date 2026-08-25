import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to create public.expense_revenue_entries table...');
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
      CREATE TABLE IF NOT EXISTS public.expense_revenue_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        created_by_user_id TEXT NOT NULL,
        created_by_user_name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'revenue')),
        subject TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE public.expense_revenue_entries ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admin full access on expense_revenue_entries" ON public.expense_revenue_entries;
      CREATE POLICY "Admin full access on expense_revenue_entries" ON public.expense_revenue_entries FOR ALL TO authenticated USING (true);
    `);

    console.log('Successfully created public.expense_revenue_entries table.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
