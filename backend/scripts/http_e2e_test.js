const child_process = require('child_process');
const jwt = require('jsonwebtoken');
const fetch = global.fetch || (async (...args) => {
  // fallback minimal fetch using node's undici if present
  try {
    const undici = require('undici');
    return undici.fetch(...args);
  } catch (e) {
    throw new Error('No global fetch available and undici not installed.');
  }
});

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';

async function waitForBackend(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${BACKEND}/api/ping`);
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Backend did not respond in time');
}

(async () => {
  try {
    console.log('Starting backend as child process...');
    const child = child_process.spawn(process.execPath, ['backend/index.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    // ensure child is terminated on exit
    const killChild = () => {
      try { child.kill(); } catch (e) {}
    };
    process.on('exit', killChild);
    process.on('SIGINT', () => { killChild(); process.exit(1); });

    console.log('Waiting for backend to respond to /api/ping...');
    await waitForBackend(20000);
    console.log('Backend is up, ping OK');

    const loginRes = await fetch(`${BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'juan.perez@email.com', password: 'password123' }),
    });
    const loginJson = await loginRes.json();
    console.log('Login response:', loginJson);
    if (!loginJson.token) {
      killChild();
      throw new Error('Login failed, no token');
    }

    const profileRes = await fetch(`${BACKEND}/api/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${loginJson.token}` },
    });
    const profileJson = await profileRes.json();
    console.log('Profile response:', profileJson);

    // shutdown backend child
    killChild();
  } catch (err) {
    console.error('HTTP E2E test failed:', err);
    process.exit(1);
  }
})();
