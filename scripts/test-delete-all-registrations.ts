import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function testDeleteAll() {
  console.log('--- TESTING DELETE ALL REGISTRATIONS FEATURE ---');

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

  await client.connect();

  try {
    // 1. Get event ID
    const eventRes = await client.query(`SELECT id, name FROM public.events LIMIT 1`);
    if (eventRes.rows.length === 0) {
      console.error('No event found!');
      process.exit(1);
    }
    const eventId = eventRes.rows[0].id;
    console.log(`[1] Selected Event: "${eventRes.rows[0].name}" (${eventId})`);

    // 2. Count existing expense_revenue_entries and event_users before test
    const initialExpensesRes = await client.query(`SELECT COUNT(*) FROM public.expense_revenue_entries WHERE event_id = $1`, [eventId]);
    const initialSubUsersRes = await client.query(`SELECT COUNT(*) FROM public.event_users WHERE event_id = $1`, [eventId]);

    const initialExpensesCount = parseInt(initialExpensesRes.rows[0].count, 10);
    const initialSubUsersCount = parseInt(initialSubUsersRes.rows[0].count, 10);

    console.log(`[2] Initial State -> Expense entries: ${initialExpensesCount}, Sub-users: ${initialSubUsersCount}`);

    // 3. Insert 3 test registrations
    console.log('[3] Inserting 3 test registration entries...');
    for (let i = 1; i <= 3; i++) {
      await client.query(
        `INSERT INTO public.registrations (
           event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [eventId, `Bulk User ${i}`, `+1 555-000${i}`, i % 2 === 0 ? 'Female' : 'Male', 20 + i, `bulk${i}@test.com`, 'admin@eventsuite360.com', 'Event Admin']
      );
    }

    const regCountRes = await client.query(`SELECT COUNT(*) FROM public.registrations WHERE event_id = $1`, [eventId]);
    console.log(`[4] Registrations in DB before Delete All: ${regCountRes.rows[0].count}`);

    // 4. Perform DELETE ALL Registrations for event_id
    console.log('[5] Executing DELETE ALL FROM public.registrations WHERE event_id = $1...');
    const deleteRes = await client.query(`DELETE FROM public.registrations WHERE event_id = $1`, [eventId]);
    console.log(`   - Deleted ${deleteRes.rowCount} registration rows.`);

    // 5. Verify registrations count is now 0
    const finalRegCountRes = await client.query(`SELECT COUNT(*) FROM public.registrations WHERE event_id = $1`, [eventId]);
    const finalRegCount = parseInt(finalRegCountRes.rows[0].count, 10);
    console.log(`[6] Registrations count after Delete All: ${finalRegCount}`);

    if (finalRegCount !== 0) {
      console.error('❌ FAILURE: Registrations table still contains rows!');
      process.exit(1);
    }

    // 6. Verify expense_revenue_entries and event_users were NOT touched
    const finalExpensesRes = await client.query(`SELECT COUNT(*) FROM public.expense_revenue_entries WHERE event_id = $1`, [eventId]);
    const finalSubUsersRes = await client.query(`SELECT COUNT(*) FROM public.event_users WHERE event_id = $1`, [eventId]);

    const finalExpensesCount = parseInt(finalExpensesRes.rows[0].count, 10);
    const finalSubUsersCount = parseInt(finalSubUsersRes.rows[0].count, 10);

    console.log(`[7] Verification -> Expense entries: ${finalExpensesCount} (was ${initialExpensesCount}), Sub-users: ${finalSubUsersCount} (was ${initialSubUsersCount})`);

    if (finalExpensesCount !== initialExpensesCount || finalSubUsersCount !== initialSubUsersCount) {
      console.error('❌ FAILURE: Other tables were modified by Delete All Registrations!');
      process.exit(1);
    }

    console.log('\n✨ DELETE ALL REGISTRATIONS VERIFICATION PASSED PERFECTLY!');
  } finally {
    await client.end();
  }
}

testDeleteAll().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
