// Simple smoke test: wait for backend /api/ping, then POST /api/auth/login and GET /api/profile
const fetch = globalThis.fetch || require('node-fetch');

const backend = process.env.BACKEND || 'http://localhost:3000';
const pingUrl = backend + '/api/ping';
const loginUrl = backend + '/api/auth/login';
const profileUrl = backend + '/api/profile';

async function waitForPing(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(pingUrl, { method: 'GET' });
      if (r.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('timeout waiting for backend ping');
}

(async () => {
  console.log('Smoke test: waiting for backend ping at', pingUrl);
  try {
    await waitForPing(30000);
  } catch (e) {
    console.error('Backend not responding:', e.message || e);
    process.exit(2);
  }

  const creds = { email: 'juan.perez@email.com', password: 'password123' };
  console.log('Sending login request...');
  try {
    const res = await fetch(loginUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) });
    const body = await res.json().catch(() => null);
    console.log('Login response status:', res.status);
    console.log('Login response body:', body);
    if (!res.ok) {
      console.error('Login failed');
      process.exit(3);
    }
    const token = body && body.accessToken;
    const rt = body && body.refreshToken;
    if (!token) {
      console.error('No accessToken in response');
      process.exit(4);
    }
    console.log('Access token length:', token.length, ' refresh present:', !!rt);

    console.log('Fetching profile with token...');
    const p = await fetch(profileUrl, { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    const pbody = await p.json().catch(() => null);
    console.log('Profile status:', p.status);
    console.log('Profile body:', pbody);
    if (!p.ok) {
      console.error('Profile fetch failed');
      process.exit(5);
    }

    console.log('Smoke test succeeded.');
    process.exit(0);
  } catch (err) {
    console.error('Error during smoke test:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
