require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mazebank',
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const email = 'juan.perez@email.com';

    // find user
    const [users] = await pool.query('SELECT u.user_id, u.name, u.email FROM users u WHERE u.email = ? LIMIT 1', [email]);
    if (!users || users.length === 0) {
      console.error('user not found');
      process.exit(1);
    }
    const user = users[0];

    // create refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // migrate old schema if present
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'refresh_tokens'");
    if (!tables || tables.length === 0) {
      await pool.query('CREATE TABLE refresh_tokens (token_hash VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL)');
    } else {
      const [cols] = await pool.query('SHOW COLUMNS FROM refresh_tokens');
      const colNames = (cols || []).map((c) => c.Field);
      if (!colNames.includes('token_hash') && colNames.includes('token')) {
        await pool.query('CREATE TABLE IF NOT EXISTS refresh_tokens_new (token_hash VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL)');
        await pool.query('INSERT INTO refresh_tokens_new (token_hash, user_id, expires_at) SELECT SHA2(token,256) AS token_hash, user_id, expires_at FROM refresh_tokens');
        await pool.query('DROP TABLE refresh_tokens');
        await pool.query('RENAME TABLE refresh_tokens_new TO refresh_tokens');
      }
    }
  } catch (mErr) {
    console.error('Migration error (ignored):', mErr);
  }
  await pool.query('INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)', [tokenHash, user.user_id, expiresAt]);
  console.log('Created refresh token (raw):', refreshToken);

    // Exchange refresh token for access token (mimic /api/auth/refresh)
    const [rows] = await pool.query('SELECT token_hash, user_id, expires_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
    if (!rows || rows.length === 0) {
      console.error('refresh token not found after insert');
      process.exit(1);
    }
    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) {
      console.error('refresh token expired unexpectedly');
      process.exit(1);
    }

  const [urows] = await pool.query('SELECT u.user_id, u.name, u.email, r.role_name AS role FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ? LIMIT 1', [row.user_id]);
    const u = urows[0];
    const payload = { id: u.user_id, username: u.email, role: u.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
    console.log('Exchanged for access token:', token);

    // Revoke the refresh token
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
  console.log('Revoked refresh token');

  // Confirm revoke
  const [after] = await pool.query('SELECT token_hash FROM refresh_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
  console.log('Exists after revoke:', after.length > 0);
  } catch (err) {
    console.error('Error in refresh_token_via_db:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
