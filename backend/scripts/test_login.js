(async () => {
  try {
    console.log('Attempting login request...');
    const loginResp = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'juan.perez@email.com', password: 'password123' }),
    });
    const loginJson = await loginResp.json();
    console.log('login response status:', loginResp.status);
    console.log('login response body:', loginJson);
    if (!loginJson || !loginJson.token) {
      console.error('Login did not return a token');
      return;
    }
    const token = loginJson.token;

    console.log('Requesting profile with token...');
    const profileResp = await fetch('http://localhost:3000/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profileJson = await profileResp.json();
    console.log('profile status:', profileResp.status);
    console.log('profile response body:', profileJson);
  } catch (err) {
    console.error('error:', err);
  }
})();
