import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function testConnections() {
  console.log('--- 1. Env Variable Checks ---');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey.substring(0, 15) + '...' + anonKey.slice(-5));
  console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'Defined' : 'Not Defined');

  console.log('\n--- 2. Testing HTTP REST Call to https://bskmtfanhwsvzacprhos.supabase.co ---');
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });
    console.log('Supabase HTTP REST Status:', res.status);
    const data = await res.json();
    console.log('Supabase HTTP REST Data:', data);
  } catch (err: any) {
    console.error('Supabase HTTP REST Error:', err.message);
  }

  console.log('\n--- 3. Testing PG Connection to db.bskmtfanhwsvzacprhos.supabase.co ---');
  const pgClient = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log('PG Connection SUCCESS!');
    const res = await pgClient.query('SELECT count(*) FROM public.events;');
    console.log('PG Events Count:', res.rows[0].count);
  } catch (err: any) {
    console.error('PG Connection Error:', err.message);
  } finally {
    await pgClient.end();
  }
}

testConnections();
