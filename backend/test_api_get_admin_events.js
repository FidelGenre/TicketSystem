async function main() {
  console.log('Logging in as admin...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@lpticket.com',
      password: '123456',
    }),
  });
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Successfully logged in. Token:', token ? 'OK' : 'FAILED');
  
  console.log('Fetching admin events...');
  const eventsRes = await fetch('http://localhost:3001/api/admin/events', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  const eventsData = await eventsRes.json();
  const targetEvent = eventsData.events.find(e => e.id === 'b304a4b8-9e79-4db2-bc6e-532179fcc7e2');
  console.log('--- TARGET EVENT FROM API ---');
  console.log(targetEvent);
}

main().catch(console.error);
