# MazeBank — Authentication & Testing Guide

This document describes the authentication flow used by the backend, how to test it locally (PowerShell / curl), and notes for integrating the frontend.

Prerequisites
- Node.js (v18+ recommended)
- MySQL with the provided schema and data (database `mazebank`)
- `.env` in the project root with DB credentials and `JWT_SECRET` (example below)

Example `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=Password.123
DB_NAME=mazebank
JWT_SECRET=your_jwt_secret
BACKEND_PORT=3000
```

Auth flow
1. Login: `POST /api/auth/login` with JSON `{ "username": "email", "password": "plainPassword" }`.
   - On success returns `{ token, refreshToken, user }` where `token` is a JWT (short-lived), and `refreshToken` is a long-lived opaque token stored in DB.
2. Use `Authorization: Bearer <token>` for protected endpoints like `GET /api/profile`.
3. When access token expires, exchange refresh token:
   - `POST /api/auth/refresh` with `{ "refreshToken": "..." }` → returns `{ token }` (new access token).
4. Logout: `POST /api/auth/logout` with `{ "refreshToken": "..." }` to revoke refresh token.

DB details
- The backend uses the following tables (from your SQL scripts): `users`, `roles`, `bank_accounts`, `cards`, `transactions`, `loans`, `beneficiaries`.
- The refresh tokens are stored in `refresh_tokens(token PRIMARY KEY, user_id, expires_at)` and are created automatically by the backend if missing.

PowerShell testing (copy/paste)
Start backend in background and test login + profile:
```powershell
# Start backend in background
$proc=Start-Process -FilePath 'node' -ArgumentList 'backend/index.js' -NoNewWindow -PassThru
Start-Sleep -Seconds 2

# Login
$login=Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body (@{ username='juan.perez@email.com'; password='password123' } | ConvertTo-Json) -ContentType 'application/json'
$login | ConvertTo-Json -Depth 3

# Use token to fetch profile
$token=$login.token
$profile=Invoke-RestMethod -Uri 'http://localhost:3000/api/profile' -Method GET -Headers @{ Authorization = "Bearer $token" }
$profile | ConvertTo-Json -Depth 3

# Stop backend
$proc.Kill()
```

curl testing (Linux/macOS or Windows with curl)
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"juan.perez@email.com","password":"password123"}'

# Refresh
curl -X POST http://localhost:3000/api/auth/refresh -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken>"}'

# Logout
curl -X POST http://localhost:3000/api/auth/logout -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken>"}'
```

Frontend integration notes
- The frontend should store `token` in memory or in a short-lived storage and store `refreshToken` in an httpOnly cookie if possible (safer than localStorage). If not using cookies, treat the `refreshToken` as sensitive and store with care.
- On 401 responses from protected endpoints, call `/api/auth/refresh` with the stored `refreshToken` to obtain a new access token, then retry the original request.
- In Angular, implement an `HttpInterceptor` that attaches `Authorization: Bearer <token>` and handles 401 + refresh flow.

Files added/modified
- `backend/index.js` — added refresh token endpoints and small fixes to SQL column names.
- `backend/scripts/*` — helper scripts for DB-only login and refresh token tests.

If you want, I can now:
- Add an Angular `HttpInterceptor` implementation that performs automatic refresh on 401 and retries the original request, or
- Add a tiny CI test that runs the HTTP E2E script inside GitHub Actions (requires DB host/credentials as secrets).

Playwright E2E CI
- I added a Playwright-based browser E2E in `e2e/playwright_login_test.js` and extended the GitHub Actions workflow `.github/workflows/e2e.yml`.
- The CI will build the frontend, serve it on port `4200`, start the backend, then run the Playwright test which logs in via backend, injects the JWT into `localStorage`, navigates to the profile route and checks for the user's name.
- Requirements: the seed data for `juan.perez` must exist in `src/BD/BD-MazeBank.sql` imported by the workflow. For production CI, replace plaintext DB password with GitHub Secrets.

Tell me which one to do next and I'll implement it.
