@echo off
REM Launch dev-mode auto-fix frontend (kills existing ng serve and starts on 4201)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-front-4201.ps1" -KillExisting
