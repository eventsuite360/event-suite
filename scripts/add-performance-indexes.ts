import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrateIndexes() {
  console.log('Connecting to database to add performance indexes...');
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
      -- Registrations table indexes
      CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_created_by ON public.registrations(created_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_registrations_event_created_by ON public.registrations(event_id, created_by_user_id);

      -- Expense & Revenue table indexes
      CREATE INDEX IF NOT EXISTS idx_expense_revenue_event_id ON public.expense_revenue_entries(event_id);
      CREATE INDEX IF NOT EXISTS idx_expense_revenue_created_by ON public.expense_revenue_entries(created_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_expense_revenue_created_at ON public.expense_revenue_entries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_expense_revenue_event_created_by ON public.expense_revenue_entries(event_id, created_by_user_id);

      -- Event Users table indexes
      CREATE INDEX IF NOT EXISTS idx_event_users_event_id ON public.event_users(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_users_email ON public.event_users(email);
      CREATE INDEX IF NOT EXISTS idx_event_users_event_email ON public.event_users(event_id, lower(email));
    `);

    console.log('Successfully created all performance database indexes in Supabase.');
  } catch (err) {
    console.error('Index migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateIndexes();
