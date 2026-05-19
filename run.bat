@echo off
setlocal

cd /d "%~dp0"

echo ================================================================================
echo                    OUTFLO - AI OUTREACH AUTOMATION
echo ================================================================================
echo.

echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Install Python from python.org
    pause
    exit
)
echo [OK] Python ready

echo [2/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Install Node.js from nodejs.org
    pause
    exit
)
echo [OK] Node.js ready

echo [3/4] Backend Setup...
cd apps\backend

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\pip.exe install -r requirements.txt -q 2>nul
echo [OK] Backend ready

cd ..\frontend

if not exist "node_modules" (
    call npm install --legacy-peer-deps -q 2>nul
)
echo [OK] Frontend ready

echo [4/4] Starting servers...
echo.

cd ..\backend
echo Starting backend on http://localhost:8000 ...
start "OUTFLO-BACKEND" cmd /k "cd /d "%~dp0apps\backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

cd ..\frontend
echo Starting frontend on http://localhost:3000 ...
start "OUTFLO-FRONTEND" cmd /k "cd /d "%~dp0apps\frontend" && npm run dev"

echo.
echo ================================================================================
echo   OUTFLO IS RUNNING!
echo ================================================================================
echo.
echo   Frontend:    http://localhost:3000
echo   Backend:     http://localhost:8000
echo   API Docs:    http://localhost:8000/docs
echo.
echo   Login:       http://localhost:3000/login
echo   Register:   http://localhost:3000/register
echo.
echo   System Owner: admin@outflo.com / Outflo@2024!
echo ================================================================================
echo.
echo Press Enter to open browser...
pause >nul

start http://localhost:3000/login