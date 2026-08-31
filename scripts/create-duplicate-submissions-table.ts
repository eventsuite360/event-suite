import { getPgClient } from '../src/lib/db';

async function runMigration() {
  console.log('Running migration: Creating public.registration_duplicate_submissions table...');
  const client = getPgClient();
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.registration_duplicate_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        matched_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
        full_name TEXT NOT NULL DEFAULT '',
        phone_number TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        age INTEGER NOT NULL DEFAULT 0,
        email TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'google_sheet_sync',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reg_dupes_event_id ON public.registration_duplicate_submissions(event_id);
    `);

    console.log('✓ Successfully created public.registration_duplicate_submissions table and index.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
