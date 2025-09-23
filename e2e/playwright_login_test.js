const { chromium } = require('playwright');

async function apiLoginGetToken(backend, credentials) {
  const resp = await fetch(`${backend}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`API login failed: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  if (!json.token) throw new Error('No token returned from login');
  return { token: json.token, refreshToken: json.refreshToken };
}

(async () => {
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:4200';
  const credentials = { username: 'juan.perez@email.com', password: 'password123' };

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    // Try UI login first
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });
    // fill username and password by placeholder
    try {
      const userSelector = 'input[placeholder="Usuario"]';
      const passSelector = 'input[placeholder="Contraseña"]';
      await page.fill(userSelector, credentials.username);
      await page.fill(passSelector, credentials.password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => null),
        page.click('button.login-btn'),
      ]);

      // After UI login attempt, check for profile content
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Juan') || bodyText.includes('Juan Pérez')) {
        console.log('E2E success: UI login produced profile content');
        await browser.close();
        process.exit(0);
      }
      console.log('UI login did not reach profile; falling back to API token injection');
    } catch (uiErr) {
      console.log('UI login attempt failed or selectors not present, falling back to API:', uiErr.message);
    }

    // Fallback: API login + inject token
    const { token } = await apiLoginGetToken(BACKEND, credentials);
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('maze_token', t), token);
    await page.goto(`${FRONTEND}/#/profile`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    console.log('Page body snippet:', body.substring(0, 300));
    if (body.includes('Juan') || body.includes('Juan Pérez')) {
      console.log('E2E success: profile content appears to contain user name');
      await browser.close();
      process.exit(0);
    }

    console.error('E2E failure: expected user name not found in profile page');
    await browser.close();
    process.exit(2);
  } catch (err) {
    console.error('E2E runtime error', err);
    await browser.close();
    process.exit(1);
  }
})();
