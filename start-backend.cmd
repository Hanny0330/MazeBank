@echo off
REM Start backend (Node) in JSON fallback mode
SET USE_JSON_DB=true
node backend/index.js
