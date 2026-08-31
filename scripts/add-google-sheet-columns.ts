import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function migrate() {
  console.log('Connecting to database to add google_sheet_url and google_sheet_last_synced_at columns...');
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
      ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_sheet_url TEXT DEFAULT NULL;
      ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_sheet_last_synced_at TIMESTAMPTZ DEFAULT NULL;
    `);

    console.log('Successfully added google_sheet_url and google_sheet_last_synced_at columns to public.events.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
