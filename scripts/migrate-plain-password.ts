import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to add event_admin_password column...');
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
      ALTER TABLE public.events
      ADD COLUMN IF NOT EXISTS event_admin_password TEXT;
    `);

    // Backfill any existing events where password was empty
    await client.query(`
      UPDATE public.events
      SET event_admin_password = 'EventPass2026!'
      WHERE event_admin_password IS NULL;
    `);

    console.log('Successfully added event_admin_password column to public.events table.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
