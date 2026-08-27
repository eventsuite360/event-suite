import { Client } from 'pg';

export function getPgClient() {
  if (process.env.POSTGRES_URL) {
    return new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  console.warn('[DB Warning] POSTGRES_URL environment variable is not defined. Falling back to default Supabase host.');

  const user = 'postgres';
  const password = 'n@gYV/k8Wqf3e!=';
  const host = 'db.bskmtfanhwsvzacprhos.supabase.co';
  const port = 5432;
  const database = 'postgres';

  return new Client({
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false },
  });
}
