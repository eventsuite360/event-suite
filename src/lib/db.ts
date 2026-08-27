import { Client } from 'pg';

export function getPgClient() {
  const connectionString = process.env.POSTGRES_URL;

  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);
      console.log(`[DB] Connecting to PostgreSQL host: ${parsedUrl.hostname} (Port: ${parsedUrl.port || '5432'})`);
    } catch {
      console.log('[DB] Connecting to PostgreSQL using POSTGRES_URL environment variable.');
    }

    return new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  console.warn('[DB Warning] POSTGRES_URL environment variable is not defined. Falling back to default direct Supabase host.');

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
