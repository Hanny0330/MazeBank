MazeBank backend (SQLite / JSON fallback)

This backend is an Express server that can run in two modes:

- SQLite mode (recommended for realistic local testing) using `better-sqlite3` (native binding).
- JSON-file mode (fallback) which stores data in `backend/data/db.json` and requires no native builds. This mode is used when native bindings are unavailable.

Quick start (recommended: SQLite mode)

1) Install a Node LTS version that has prebuilt `better-sqlite3` binaries (Node 18.x or 20.x) using `nvm-windows` (recommended) or install Node LTS manually.

PowerShell (run as Administrator to install nvm if you don't have it):

```powershell
# Install nvm-windows via winget (or download installer from releases)
winget install -e --id ChrisTitusTech.NVM
# Close and reopen PowerShell, then install a Node LTS version (example 18.20.0)
nvm install 18.20.0
nvm use 18.20.0
node -v
```

2) In the project root, install dependencies:

```powershell
npm install
```

3) Start backend (SQLite mode):

```powershell
node backend/index.js
```

If `better-sqlite3` fails to compile, check `node -v` and switch to Node 18 or 20. Only if you cannot get a compatible Node version, use the JSON fallback:

JSON fallback mode (no native builds)

The repo includes a JSON-file mode already present. To use it, set an environment variable `USE_JSON_DB=true` before starting the server. Example:

```powershell
$env:USE_JSON_DB='true'
node backend/index.js
```

Endpoints

- `GET /api/ping` — health check
- `POST /api/auth/login` — body `{ email, password }` returns `{ accessToken, refreshToken, expiresIn, userId }`
- `POST /api/auth/refresh` — body `{ refreshToken }` returns a new access token
- `POST /api/auth/logout` — body `{ refreshToken }` to revoke
- `GET /api/profile` — requires `Authorization: Bearer <accessToken>`
- Additional sample endpoints: `/api/accounts/:userId`, `/api/cards/:userId`, `/api/loans/:userId`, `/api/transactions/:accountId`, `/api/beneficiaries/:userId`, `/api/dashboard/:userId`

Seeded test user

- email: `juan.perez@email.com`
- password: `password123`

Examples

PowerShell (login):

```powershell
$body = @{ email = 'juan.perez@email.com'; password = 'password123' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body $body
```

curl (login):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan.perez@email.com","password":"password123"}'
```

Notes about native builds and troubleshooting

- Prebuilt `better-sqlite3` binaries exist for popular Node LTS versions. Use Node 18.x or 20.x for best results.
- If `npm install` fails with native build errors, avoid installing global build tools immediately; instead try switching Node LTS with `nvm` to use prebuilt binaries.
- If you must compile from source, install Visual Studio Build Tools and Python and run `npm install` again.

Security recommendations

- Use `bcrypt` or `argon2` (with per-user salts) for password hashing in production; SHA-256 here is only for demo.
- Set a secure `JWT_SECRET` in your environment before running the server in any non-dev environment.
- Use HTTPS and secure cookie flags if you store tokens in cookies; set short expiry for access tokens and rotate refresh tokens.

Automation / convenience

- `package.json` contains a `start:backend` script that runs `node backend/index.js`.
- If you want, I can add a `setup-dev.ps1` script that automates `nvm` install, Node install, `npm install`, and `node backend/index.js` (requires admin privileges).

Automation helper

I added `backend/setup-dev.ps1` — a convenience PowerShell script that will attempt to:

- Install `nvm-windows` via `winget` (if not present)
- Install Node LTS `18.20.0` via `nvm` and switch to it
- Run `npm install` in the repository root
- Start the backend

Usage examples (PowerShell):

```powershell
# Normal run (will try to install nvm if missing)
.\backend\setup-dev.ps1

# Force JSON fallback mode (no native sqlite build)
.\backend\setup-dev.ps1 -UseJson
```

If you'd like, I will now:
- 1) Add a runtime flag `USE_JSON_DB=true` support to the current `backend/index.js` so the server can fallback automatically if `better-sqlite3` is not present, and
- 2) Provide a `setup-dev.ps1` script that automates the Node LTS and dependency setup on Windows.
MazeBank backend (JSON-file DB)

This backend is a lightweight Express server for local development and demos. It uses a JSON file (`backend/data/db.json`) as a simple persistent store to avoid native compilation steps.

Quick start

1. Install dependencies (from repo root):

```powershell
npm install
```

2. Start backend:

```powershell
# from repo root
node backend/index.js
# or (if you prefer) npm run start:backend (see package.json)
```

Endpoints

- `GET /api/ping` — health check
- `POST /api/auth/login` — body `{ email, password }` returns `{ accessToken, refreshToken, expiresIn, userId }`
- `POST /api/auth/refresh` — body `{ refreshToken }` returns a new access token
- `POST /api/auth/logout` — body `{ refreshToken }` to revoke
- `GET /api/profile` — requires `Authorization: Bearer <accessToken>`
- Additional sample endpoints: `/api/accounts/:userId`, `/api/cards/:userId`, `/api/loans/:userId`, `/api/transactions/:accountId`, `/api/beneficiaries/:userId`, `/api/dashboard/:userId`

Seeded test user

- email: `juan.perez@email.com`
- password: `password123`

Examples

PowerShell (login):

```powershell
$body = @{ email = 'juan.perez@email.com'; password = 'password123' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body $body
```

curl (login):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan.perez@email.com","password":"password123"}'
```

Notes & next steps

- This JSON DB is intended for development and demos only. For production use a real DB (SQLite/Postgres/MySQL).
- To move back to a native SQLite DB using `better-sqlite3` you can:
  1. Install a Node version with prebuilt `better-sqlite3` binaries (Node 18/20 LTS) using `nvm-windows` or install Node LTS directly.
  2. Reinstall dependencies and revert `backend/index.js` to use SQLite.

- Security: passwords are hashed with SHA-256 for demo. Use `bcrypt`/`argon2` with a salt in real deployments.

If you want, I can: add `npm` scripts, revert to SQLite once you confirm the Node version, or convert to a WASM-based SQL engine to keep SQL but avoid native builds.
