import { Client } from 'pg';
import dotenv from 'dotenv';
import { generateEventAdminEmail } from '../src/lib/credentials';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function shortenEmails() {
  console.log('Shortening existing event admin email addresses in database...');
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
    const result = await client.query(`SELECT id, slug, event_admin_email FROM public.events`);

    for (const row of result.rows) {
      const shortEmail = generateEventAdminEmail(row.slug || 'evt');
      await client.query(
        `UPDATE public.events SET event_admin_email = $1 WHERE id = $2`,
        [shortEmail, row.id]
      );
      console.log(`Updated event ${row.id} (${row.slug}): ${shortEmail}`);
    }

    console.log('All existing event emails updated to short format.');
  } catch (err) {
    console.error('Failed to shorten emails:', err);
  } finally {
    await client.end();
  }
}

shortenEmails();
