@echo off
REM Start static frontend (production build) on port 4201
REM Serve the "browser" output and ensure a default index is available
IF /I "%1"=="dev" (
	REM Use the auto-fix dev launcher (kills existing ng serves and starts on 4201)
	powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-front-4201.ps1" -KillExisting
	exit /b 0
)

REM Default: serve production browser output via Express wrapper
node tools\serve-browser.js -p 4201

echo Launched express static server on port 4201. Press any key to continue in this window...
pause >nul
