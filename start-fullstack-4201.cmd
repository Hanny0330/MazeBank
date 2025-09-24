@echo off
REM Start backend in new window (JSON fallback)
start cmd /k "set USE_JSON_DB=true && node backend/index.js"
REM Start frontend in new window on port 4201
start cmd /k "npx.cmd ng serve --port 4201 --proxy-config proxy.conf.json"
echo Launched backend and frontend (frontend on port 4201) in new windows.
