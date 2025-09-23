require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mazebank',
  });
  try {
    const [createRows] = await pool.query("SHOW CREATE TABLE users");
    console.log('SHOW CREATE TABLE users result:');
    console.log(createRows[0]);
  } catch (err) {
    console.error('SHOW CREATE failed:', err.message);
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('Sample rows:', rows);
  } catch (err) {
    console.error('SELECT failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
