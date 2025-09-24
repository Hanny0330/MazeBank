# MazeBankProject

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Running fullstack locally (Windows PowerShell)

Quick options to run both frontend and backend for manual testing.

1) Recommended: use the convenience PowerShell helper (automates nvm/node/npm install and starts backend)

```powershell
# From repo root (may require admin for nvm install)
.\backend\setup-dev.ps1

# Force JSON fallback (no native sqlite build required)
.\backend\setup-dev.ps1 -UseJson
```

2) Manual steps (if you prefer):

```powershell
# Install dependencies
npm install

# Start backend in JSON fallback mode
$env:USE_JSON_DB='true'
node backend/index.js

# In another shell, start frontend dev server
npm start
```

3) Shortcut fullstack (runs frontend and backend together using concurrently)

```powershell
# This uses the npm script 'start:dev' which runs both servers in one window
npm run start:dev
```

Open the frontend at `http://localhost:4200` and the backend listens on `http://localhost:3000` by default.

Seeded test user (for login):

- email: `juan.perez@email.com`
- password: `password123`

If you run into native build errors for `better-sqlite3`, either use the JSON fallback (`USE_JSON_DB=true`) or install a Node LTS version with prebuilt binaries (Node 18.x/20.x) via `nvm-windows`.

Windows convenience launchers

If PowerShell prevents npm scripts from running due to execution policy, you can use the included `.cmd` launchers from the repo root:

- `start-frontend.cmd` — starts the Angular dev server (uses `npx.cmd`)
- `start-backend.cmd` — starts the backend with `node backend/index.js`
- `start-fullstack.cmd` — opens two new cmd windows and starts backend + frontend

Run them by double-clicking or from PowerShell/CMD with:

```powershell
.\start-frontend.cmd
.\start-backend.cmd
.\start-fullstack.cmd
```

If port `4200` is already in use you can use the alternate launchers that run the frontend on `4201`:

```powershell
.\start-frontend-4201.cmd
.\start-fullstack-4201.cmd
```
