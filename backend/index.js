require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.BACKEND_PORT || 3000;

app.use(express.json());

// Simple CORS headers so you can open http://localhost:3000/api from the browser
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Friendly root for GUI testing so visiting /api shows a JSON payload instead of "Cannot GET /api"
app.get('/api', (req, res) => {
  res.json({ ok: true, api: 'MazeBank', mode: dbMode, time: Date.now() });
});

// Redirect root to /api so opening http://localhost:3000 shows useful info in the browser
app.get('/', (req, res) => {
  res.redirect('/api');
});

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const useJson = (process.env.USE_JSON_DB === 'true') || false;
let dbMode = 'sqlite';
let sqliteDb = null;

// Minimal JSON DB helpers (file-backed)
const JSON_DB_FILE = path.join(DATA_DIR, 'db.json');
function loadJsonDb() {
  if (!fs.existsSync(JSON_DB_FILE)) {
    const seed = {
      roles: [ { id: 1, name: 'cliente' }, { id: 2, name: 'ejecutivo' }, { id: 3, name: 'gerente' } ],
      users: [ { id: 1, email: 'juan.perez@email.com', password_hash: crypto.createHash('sha256').update('password123').digest('hex'), name: 'Juan Perez', role_id: 1 } ],
      refresh_tokens: []
    };
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(seed, null, 2));
  }
  const raw = fs.readFileSync(JSON_DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveJsonDb(data) {
  fs.writeFileSync(JSON_DB_FILE, JSON.stringify(data, null, 2));
}

let jsonDb = null;

// Try to load native sqlite unless USE_JSON_DB is set
if (useJson) {
  console.log('USE_JSON_DB=true -> using JSON-file DB');
  dbMode = 'json';
  jsonDb = loadJsonDb();
} else {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(DATA_DIR, 'mazebank.db');
    sqliteDb = new Database(dbPath);
    // Initialize tables
    sqliteDb.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT, role_id INTEGER, FOREIGN KEY(role_id) REFERENCES roles(id));
    CREATE TABLE IF NOT EXISTS refresh_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));
    `);

    // Seed
    const r = sqliteDb.prepare('SELECT COUNT(*) as c FROM roles').get();
    if (r.c === 0) {
      sqliteDb.prepare('INSERT INTO roles (name) VALUES (?)').run('cliente');
      sqliteDb.prepare('INSERT INTO roles (name) VALUES (?)').run('ejecutivo');
      sqliteDb.prepare('INSERT INTO roles (name) VALUES (?)').run('gerente');
    }
    const u = sqliteDb.prepare('SELECT COUNT(*) as c FROM users').get();
    if (u.c === 0) {
      const pw = crypto.createHash('sha256').update('password123').digest('hex');
      const role = sqliteDb.prepare('SELECT id FROM roles WHERE name = ?').get('cliente');
      sqliteDb.prepare('INSERT INTO users (email, password_hash, name, role_id) VALUES (?, ?, ?, ?)').run('juan.perez@email.com', pw, 'Juan Perez', role.id);
    }

    dbMode = 'sqlite';
    console.log('Using better-sqlite3 database at', dbPath);
  } catch (err) {
    console.warn('better-sqlite3 not available or failed to load; falling back to JSON DB. Error:', err && err.message ? err.message : err);
    dbMode = 'json';
    jsonDb = loadJsonDb();
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_EXPIRES_SECONDS = 60 * 15; // 15 minutes
const REFRESH_EXPIRES_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashToken(t) { return crypto.createHash('sha256').update(t).digest('hex'); }

function createAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, roleId: user.role_id }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_SECONDS });
}

function findUserByEmail(email) {
  if (dbMode === 'sqlite') {
    return sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }
  return jsonDb.users.find(u => u.email === email) || null;
}

function findUserById(id) {
  if (dbMode === 'sqlite') {
    return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  return jsonDb.users.find(u => u.id === id) || null;
}

function insertRefreshToken(userId, tokenHash, expiresAt) {
  if (dbMode === 'sqlite') {
    sqliteDb.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, tokenHash, expiresAt);
    return;
  }
  const id = (jsonDb.refresh_tokens.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1;
  jsonDb.refresh_tokens.push({ id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  saveJsonDb(jsonDb);
}

function findRefreshTokenByHash(tokenHash) {
  if (dbMode === 'sqlite') {
    return sqliteDb.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash);
  }
  return jsonDb.refresh_tokens.find(r => r.token_hash === tokenHash) || null;
}

function deleteRefreshTokenByHash(tokenHash) {
  if (dbMode === 'sqlite') {
    sqliteDb.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
    return;
  }
  const before = jsonDb.refresh_tokens.length;
  jsonDb.refresh_tokens = jsonDb.refresh_tokens.filter(r => r.token_hash !== tokenHash);
  if (jsonDb.refresh_tokens.length !== before) saveJsonDb(jsonDb);
}

function getRoleNameById(roleId) {
  if (dbMode === 'sqlite') {
    const r = sqliteDb.prepare('SELECT name FROM roles WHERE id = ?').get(roleId);
    return r ? r.name : null;
  }
  const r = jsonDb.roles.find(r => r.id === roleId);
  return r ? r.name : null;
}

app.get('/api/ping', (req, res) => res.json({ ok: true, mode: dbMode, time: Date.now() }));

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'username and password required' });
    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'invalid' });
    const pw = crypto.createHash('sha256').update(password).digest('hex');
    if (pw !== user.password_hash) return res.status(401).json({ error: 'invalid' });

    const accessToken = createAccessToken(user);
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshToken);
    const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_EXPIRES_SECONDS;
    insertRefreshToken(user.id, tokenHash, expiresAt);

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
    const row = findRefreshTokenByHash(tokenHash);
    if (!row) return res.status(401).json({ error: 'invalid' });
    if (row.expires_at < Math.floor(Date.now() / 1000)) {
      // delete expired
      if (dbMode === 'sqlite') sqliteDb.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
      else {
        jsonDb.refresh_tokens = jsonDb.refresh_tokens.filter(r => r.id !== row.id);
        saveJsonDb(jsonDb);
      }
      return res.status(401).json({ error: 'expired' });
    }
    const user = findUserById(row.user_id);
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
    deleteRefreshTokenByHash(tokenHash);
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
    const user = findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'notfound' });
    const roleName = getRoleNameById(user.role_id);
    res.json({ id: user.id, email: user.email, name: user.name, role: roleName });
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

app.listen(port, function() { console.log('Backend (' + dbMode + ') listening on http://localhost:' + port); });

