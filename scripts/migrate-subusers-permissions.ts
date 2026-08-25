import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to migrate public.event_users table...');
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
      ALTER TABLE public.event_users
      ADD COLUMN IF NOT EXISTS can_access_registration BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS can_access_expense_revenue BOOLEAN NOT NULL DEFAULT true;
    `);

    console.log('Successfully added module access permission columns to public.event_users.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
