import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testApiFlow() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. Testing Admin Login ---');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'event.admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'EventAdmin2026!SecurePass#',
    }),
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login Status:', loginRes.status);
  console.log('Set-Cookie Header present:', !!cookieHeader);

  if (!cookieHeader) {
    console.error('Failed to get session cookie from login response!');
    return;
  }

  const cookieValue = cookieHeader.split(';')[0];
  console.log('Cookie Value:', cookieValue);

  console.log('\n--- 2. Testing GET /api/admin/events ---');
  const getEventsRes = await fetch(`${baseUrl}/api/admin/events`, {
    headers: { Cookie: cookieValue },
  });
  const getEventsData = await getEventsRes.json();
  console.log('GET Events Status:', getEventsRes.status);
  console.log('GET Events Data:', JSON.stringify(getEventsData, null, 2));

  console.log('\n--- 3. Testing POST /api/admin/events (Creating test event) ---');
  const testSlug = `test-event-${Date.now()}`;
  const postEventRes = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
    },
    body: JSON.stringify({
      name: `Test Event Persistence ${Date.now()}`,
      slug: testSlug,
    }),
  });

  const postEventData = await postEventRes.json();
  console.log('POST Event Status:', postEventRes.status);
  console.log('POST Event Response:', JSON.stringify(postEventData, null, 2));

  console.log('\n--- 4. Testing GET /api/admin/events AFTER CREATION (Refresh check) ---');
  const refreshRes = await fetch(`${baseUrl}/api/admin/events`, {
    headers: { Cookie: cookieValue },
  });
  const refreshData = await refreshRes.json();
  console.log('Refresh GET Status:', refreshRes.status);
  console.log('Refresh GET Data Count:', refreshData.events?.length);
  console.log('Refresh GET Events:', JSON.stringify(refreshData.events, null, 2));
}

testApiFlow();
