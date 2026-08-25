import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkEvents() {
  const client = new Client({
    user: 'postgres',
    password: 'n@gYV/k8Wqf3e!=',
    host: 'db.bskmtfanhwsvzacprhos.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query('SELECT name, slug, event_admin_email, event_admin_password FROM public.events');
    console.log('Events in DB:', res.rows);
  } finally {
    await client.end();
  }
}

checkEvents();
