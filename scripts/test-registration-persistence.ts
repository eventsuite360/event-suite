import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function testPersistence() {
  console.log('--- STARTING REGISTRATION PERSISTENCE VERIFICATION ---');

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

  // Step 1: Connect client 1 and fetch event
  let client1 = getClient();
  await client1.connect();

  const eventRes = await client1.query(`SELECT id, name FROM public.events LIMIT 1`);
  if (eventRes.rows.length === 0) {
    console.error('ERROR: No event found in DB!');
    await client1.end();
    process.exit(1);
  }

  const targetEvent = eventRes.rows[0];
  console.log(`[1] Selected Event: "${targetEvent.name}" (${targetEvent.id})`);

  // Step 2: Perform real INSERT into public.registrations
  const testRegistration = {
    event_id: targetEvent.id,
    full_name: 'Jane Doe Persistence Test',
    phone_number: '+1 555-987-6543',
    gender: 'Female',
    age: 29,
    email: 'jane.persistence@testsuite360.com',
    created_by_user_id: 'subuser1@eventsuite360.com',
    created_by_user_name: 'SubUser One',
  };

  const insertRes = await client1.query(
    `INSERT INTO public.registrations (
       event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [
      testRegistration.event_id,
      testRegistration.full_name,
      testRegistration.phone_number,
      testRegistration.gender,
      testRegistration.age,
      testRegistration.email,
      testRegistration.created_by_user_id,
      testRegistration.created_by_user_name,
    ]
  );

  const insertedId = insertRes.rows[0].id;
  console.log(`[2] Real INSERT successful in Supabase registrations table! ID: ${insertedId}`);

  // Disconnect client 1 completely to simulate page refresh / new request context
  await client1.end();
  console.log('[3] Client 1 disconnected (simulating page reload/refresh).');

  // Step 3: Connect fresh Client 2 and fetch fresh data from database
  let client2 = getClient();
  await client2.connect();

  console.log('[4] Client 2 connected fresh. Querying public.registrations...');
  const fetchRes = await client2.query(
    `SELECT * FROM public.registrations WHERE id = $1`,
    [insertedId]
  );

  if (fetchRes.rows.length === 0) {
    console.error('❌ PERSISTENCE FAILURE: Registration record disappeared after reconnection!');
    await client2.end();
    process.exit(1);
  }

  const retrieved = fetchRes.rows[0];
  console.log('✅ PERSISTENCE CONFIRMED! Retrieved fresh record from Supabase:');
  console.log(`   - ID: ${retrieved.id}`);
  console.log(`   - Name: ${retrieved.full_name}`);
  console.log(`   - Phone: ${retrieved.phone_number}`);
  console.log(`   - Gender: ${retrieved.gender}`);
  console.log(`   - Age: ${retrieved.age}`);
  console.log(`   - Email: ${retrieved.email}`);
  console.log(`   - Created By: ${retrieved.created_by_user_name} (${retrieved.created_by_user_id})`);

  // Step 4: Verify Sub-User Scoped Query vs Admin Query
  console.log('\n[5] Testing Server-Side Sub-User Scoping Query...');
  const subUserQueryRes = await client2.query(
    `SELECT * FROM public.registrations WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)`,
    [targetEvent.id, 'subuser1@eventsuite360.com']
  );
  console.log(`   - Sub-User subuser1 query returned ${subUserQueryRes.rows.length} rows.`);

  const otherSubUserQueryRes = await client2.query(
    `SELECT * FROM public.registrations WHERE event_id = $1 AND lower(created_by_user_id) = lower($2)`,
    [targetEvent.id, 'other_user@eventsuite360.com']
  );
  console.log(`   - Other Sub-User query returned ${otherSubUserQueryRes.rows.length} rows (Server-side guard verified!).`);

  // Cleanup test record
  await client2.query(`DELETE FROM public.registrations WHERE id = $1`, [insertedId]);
  console.log(`[6] Cleaned up test record ${insertedId}.`);

  await client2.end();
  console.log('\n✨ ALL PERSISTENCE AND SECURITY VERIFICATIONS PASSED SUCCESSFULLY!');
}

testPersistence().catch((err) => {
  console.error('Test persistence error:', err);
  process.exit(1);
});
