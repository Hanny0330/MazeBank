require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || 'testuser';
  const password = args[1] || 'testpass';
  const role = args[2] || 'Cliente';

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mazebank',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    // Upsert user using existing schema: user_id, name, email, password, role_id
    const [res] = await pool.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [username]);
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (res.length > 0) {
      console.log('User already exists:', username);
    } else {
      // default role_id = 1 (Cliente)
      await pool.query('INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)', [username, username, hash, 1]);
      console.log('Created user:', username, 'with role_id', 1);
    }
  } catch (err) {
    console.error('Error creating test user:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
