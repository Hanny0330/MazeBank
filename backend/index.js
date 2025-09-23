require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.BACKEND_PORT || 3000;

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'mazebank.db');
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role_id INTEGER,
  FOREIGN KEY(role_id) REFERENCES roles(id)
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS bank_accounts (account_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, account_number TEXT, balance REAL, status TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS cards (card_id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER, card_number TEXT, expiration_date INTEGER, credit_limit REAL, status TEXT, FOREIGN KEY(account_id) REFERENCES bank_accounts(account_id));
CREATE TABLE IF NOT EXISTS loans (loan_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, interest_rate REAL, term_months INTEGER, application_date INTEGER, status TEXT, pending_balance REAL, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS transactions (transaction_id INTEGER PRIMARY KEY AUTOINCREMENT, source_account_id INTEGER, destination_account_id INTEGER, type TEXT, amount REAL, description TEXT, date INTEGER, status TEXT, FOREIGN KEY(source_account_id) REFERENCES bank_accounts(account_id), FOREIGN KEY(destination_account_id) REFERENCES bank_accounts(account_id));
CREATE TABLE IF NOT EXISTS beneficiaries (beneficiary_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, account_number TEXT, bank TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
`);

// Seed initial data
const countRoles = db.prepare('SELECT COUNT(*) as c FROM roles').get().c;
if (countRoles === 0) {
  db.prepare('INSERT INTO roles (name) VALUES (?)').run('cliente');
  db.prepare('INSERT INTO roles (name) VALUES (?)').run('ejecutivo');
  db.prepare('INSERT INTO roles (name) VALUES (?)').run('gerente');
}
const countUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (countUsers === 0) {
  const pw = crypto.createHash('sha256').update('password123').digest('hex');
  const role = db.prepare('SELECT id FROM roles WHERE name = ?').get('cliente');
  db.prepare('INSERT INTO users (email, password_hash, name, role_id) VALUES (?, ?, ?, ?)').run('juan.perez@email.com', pw, 'Juan Perez', role.id);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_EXPIRES_SECONDS = 60 * 15; // 15 minutes
const REFRESH_EXPIRES_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashToken(t) { return crypto.createHash('sha256').update(t).digest('hex'); }

function createAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, roleId: user.role_id }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_SECONDS });
}

app.get('/api/ping', (req, res) => res.json({ ok: true, time: Date.now() }));

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'username and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'invalid' });
    const pw = crypto.createHash('sha256').update(password).digest('hex');
    if (pw !== user.password_hash) return res.status(401).json({ error: 'invalid' });

    const accessToken = createAccessToken(user);
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshToken);
    const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_EXPIRES_SECONDS;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expiresAt);

    res.json({ accessToken, refreshToken, expiresIn: ACCESS_EXPIRES_SECONDS, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'missing' });
    const tokenHash = hashToken(refreshToken);
    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash);
    if (!row) return res.status(401).json({ error: 'invalid' });
    if (row.expires_at < Math.floor(Date.now() / 1000)) {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
      return res.status(401).json({ error: 'expired' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    if (!user) return res.status(401).json({ error: 'invalid' });
    const accessToken = createAccessToken(user);
    res.json({ accessToken, expiresIn: ACCESS_EXPIRES_SECONDS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.json({ ok: true });
    const tokenHash = hashToken(refreshToken);
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no-auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid' });
  }
}

app.get('/api/profile', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, role_id FROM users WHERE id = ?').get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'notfound' });
    const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(user.role_id);
    res.json({ id: user.id, email: user.email, name: user.name, role: role ? role.name : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/api/accounts/:userId', authMiddleware, (req, res) => {
  res.json([{ id: 1, userId: Number(req.params.userId), accountNumber: '123-456', balance: 1000 }]);
});

app.get('/api/cards/:userId', authMiddleware, (req, res) => {
  res.json([{ id: 1, userId: Number(req.params.userId), number: '4111-1111-1111-1111', expiry: '12/26' }]);
});

app.get('/api/loans/:userId', authMiddleware, (req, res) => { res.json([]); });
app.get('/api/transactions/:accountId', authMiddleware, (req, res) => { res.json([]); });
app.get('/api/beneficiaries/:userId', authMiddleware, (req, res) => { res.json([]); });
app.get('/api/dashboard/:userId', authMiddleware, (req, res) => { res.json({ accounts: [], cards: [], loans: [] }); });

app.listen(port, function() { console.log('Backend (SQLite) listening on http://localhost:' + port); });

