@echo off
setlocal

cd /d "%~dp0"

echo Starting Landlordly...
echo.
echo A new terminal window will open and start the app.
echo Keep that new window open while using Landlordly.
echo.

start "Landlordly Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev:clean"

echo Waiting a few seconds, then opening the app in your browser...
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo If the browser says it cannot connect yet, wait another 10 seconds and refresh.
pause
