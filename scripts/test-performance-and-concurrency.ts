import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function testPerformanceAndConcurrency() {
  console.log('--- STARTING PERFORMANCE & CONCURRENCY SCALABILITY VERIFICATION ---');

  const connectionString = process.env.POSTGRES_URL;
  const getClient = () =>
    connectionString
      ? new Client({ connectionString, ssl: { rejectUnauthorized: false } })
      : new Client({
          user: 'postgres',
          password: 'n@gYV/k8Wqf3e!=',
          host: 'db.bskmtfanhwsvzacprhos.supabase.co',
          port: 5432,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
        });

  const mainClient = getClient();
  await mainClient.connect();

  try {
    const eventRes = await mainClient.query(`SELECT id, name FROM public.events LIMIT 1`);
    if (eventRes.rows.length === 0) {
      console.error('No event found!');
      process.exit(1);
    }
    const eventId = eventRes.rows[0].id;
    console.log(`[1] Target Event: "${eventRes.rows[0].name}" (${eventId})`);

    // 1. Simulate 10 Concurrent Sub-User Registration Inserts using Promise.all
    console.log('\n[2] Firing 10 CONCURRENT registration inserts in parallel via Promise.all...');
    const startTime = Date.now();

    const insertPromises = Array.from({ length: 10 }).map(async (_, idx) => {
      const c = getClient();
      await c.connect();
      try {
        const res = await c.query(
          `INSERT INTO public.registrations (
             event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            eventId,
            `Concurrent User ${idx + 1}`,
            `+1 555-900-${idx + 100}`,
            idx % 2 === 0 ? 'Male' : 'Female',
            22 + idx,
            `concurrent${idx + 1}@scalability.test`,
            `subuser_${(idx % 2) + 1}@test.com`,
            `SubUser ${(idx % 2) + 1}`,
          ]
        );
        return res.rows[0].id;
      } finally {
        await c.end();
      }
    });

    const insertedIds = await Promise.all(insertPromises);
    const duration = Date.now() - startTime;

    console.log(`✅ 10 Concurrent Inserts Completed in ${duration} ms! All IDs returned:`);
    console.log(`   ${insertedIds.join(', ')}`);

    // 2. Test Server-Side SQL Analytics Aggregation Latency
    console.log('\n[3] Testing Server-Side SQL Analytics Aggregation speed...');
    const aggStart = Date.now();

    const analyticsRes = await mainClient.query(
      `SELECT 
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE lower(gender) IN ('male', 'm'))::int AS male,
         COUNT(*) FILTER (WHERE lower(gender) IN ('female', 'f'))::int AS female,
         COUNT(*) FILTER (WHERE lower(gender) NOT IN ('male', 'm', 'female', 'f'))::int AS other,
         COUNT(*) FILTER (WHERE age <= 18)::int AS age_0_18,
         COUNT(*) FILTER (WHERE age > 18 AND age <= 30)::int AS age_19_30,
         COUNT(*) FILTER (WHERE age > 30 AND age <= 45)::int AS age_31_45,
         COUNT(*) FILTER (WHERE age > 45)::int AS age_46_plus
       FROM public.registrations
       WHERE event_id = $1`,
      [eventId]
    );

    const aggDuration = Date.now() - aggStart;
    const a = analyticsRes.rows[0];

    console.log(`⚡ Server-side SQL Analytics Aggregation completed in ${aggDuration} ms!`);
    console.log(`   - Total: ${a.total}`);
    console.log(`   - Male: ${a.male}, Female: ${a.female}, Other: ${a.other}`);
    console.log(`   - Age 0-18: ${a.age_0_18}, 19-30: ${a.age_19_30}, 31-45: ${a.age_31_45}, 46+: ${a.age_46_plus}`);

    // 3. Clean up test records
    console.log('\n[4] Cleaning up test records...');
    await mainClient.query(`DELETE FROM public.registrations WHERE id = ANY($1::uuid[])`, [insertedIds]);
    console.log('✅ Cleanup finished.');

    console.log('\n✨ CONCURRENCY & PERFORMANCE SCALABILITY VERIFICATION PASSED PERFECTLY!');
  } finally {
    await mainClient.end();
  }
}

testPerformanceAndConcurrency().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
