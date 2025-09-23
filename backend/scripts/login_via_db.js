require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

(async () => {
  const email = 'juan.perez@email.com';
  const password = 'password123';
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mazebank',
    waitForConnections: true,
    connectionLimit: 5,
  });
  try {
    const [rows] = await pool.query(
      'SELECT u.user_id, u.name, u.email, u.password, r.role_name AS role FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE u.email = ? LIMIT 1',
      [email],
    );
    if (!rows || rows.length === 0) {
      console.error('No user found with that email');
      process.exit(1);
    }
    const user = rows[0];
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hash) {
      console.error('Password mismatch');
      process.exit(1);
    }
    const payload = { id: user.user_id, username: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
    // ensure refresh_tokens table exists and migrate legacy schema if needed
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    try {
      const [tables] = await pool.query("SHOW TABLES LIKE 'refresh_tokens'");
      if (!tables || tables.length === 0) {
        await pool.query('CREATE TABLE refresh_tokens (token_hash VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL)');
      } else {
        const [cols] = await pool.query('SHOW COLUMNS FROM refresh_tokens');
        const colNames = (cols || []).map((c) => c.Field);
        if (!colNames.includes('token_hash') && colNames.includes('token')) {
          console.log('Migrating refresh_tokens.token -> token_hash');
          await pool.query('CREATE TABLE IF NOT EXISTS refresh_tokens_new (token_hash VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL)');
          await pool.query('INSERT INTO refresh_tokens_new (token_hash, user_id, expires_at) SELECT SHA2(token,256) AS token_hash, user_id, expires_at FROM refresh_tokens');
          await pool.query('DROP TABLE refresh_tokens');
          await pool.query('RENAME TABLE refresh_tokens_new TO refresh_tokens');
        }
      }
    } catch (mErr) {
      console.error('Migration error (ignored):', mErr);
    }

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query('INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)', [refreshHash, user.user_id, expiresAt]);
  console.log('Authenticated. Token:');
  console.log(token);
    console.log('Refresh token (raw):', refreshToken);
    console.log('Profile:');
    console.log({ id: user.user_id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('Error during DB login test:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
