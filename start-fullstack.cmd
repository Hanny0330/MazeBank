@echo off
REM Start backend in new window (JSON fallback)
start cmd /k "set USE_JSON_DB=true && node backend/index.js"
REM Build production and serve via express wrapper in a second window
start cmd /k "npx.cmd ng build --configuration production && node scripts/copy-index-to-indexhtml.js && node tools/serve-browser.js -p 4201"
echo Launched backend and frontend (production build served) in new windows.
