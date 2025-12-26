(async function(){
  const fetch = (globalThis as any).fetch || require('node-fetch');
  const API_BASE = process.env.API_BASE || 'http://localhost:5000';
  const email = `test_text_${Date.now()}@example.com`;
  const password = 'Test123A';
  const username = 'test-text';

  console.log('Creating user:', email);
  // Register
  let res;
  try {
    res = await fetch(`${API_BASE}/api/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
  } catch (err: any) {
    console.error('Failed to reach server at', API_BASE, '. Is the server running? Error:', err.message || err);
    process.exit(1);
  }

  if (!res.ok) {
    console.error('Failed to register user', await res.text());
    process.exit(1);
  }

  console.log('Logging in');
  res = await fetch(`${API_BASE}/api/v1/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    console.error('Failed to login', await res.text());
    process.exit(1);
  }
  const loginJson = await res.json();
  const token = loginJson.token;

  console.log('Token obtained, creating text content');
  const body = { title: 'Automated Test Note', contentType: 'Text', text: 'This is an automated test note created by testTextContent script', tags: ['test'] };
  res = await fetch(`${API_BASE}/api/v1/addcontent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error('Failed to add content', await res.text());
    process.exit(1);
  }

  console.log('Content added, fetching content list');
  res = await fetch(`${API_BASE}/api/v1/content`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    console.error('Failed to fetch content', await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const found = (data.data || []).find((c: any) => c.title === body.title && c.contentType === 'Text');

  if (found) {
    console.log('TEST OK — Text content saved and found.');
    console.log('Saved item:', found);
    process.exit(0);
  } else {
    console.error('TEST FAILED — Text content not found in user contents');
    process.exit(1);
  }
})();