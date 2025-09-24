@echo off
REM Start Angular frontend using npx.cmd to avoid PowerShell execution policy issues
npx.cmd ng serve --proxy-config proxy.conf.json
