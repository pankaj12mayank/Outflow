@echo off
setlocal

set "PROJECT_ROOT=%~dp0"

echo ============================================================
echo   OUTFLO - AI OUTREACH AUTOMATION PLATFORM
echo   Starting Services...
echo ============================================================
echo.

echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Python not found! Please install Python 3.9+
    pause
    exit /b 1
)
echo   [OK] Python detected

echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found! Please install Node.js
    pause
    exit /b 1
)
echo   [OK] Node.js detected

echo [3/5] Setting Up Backend...
cd /d "%PROJECT_ROOT%apps\backend"

if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv
    echo   [OK] Virtual environment created
)

echo   Installing Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt --upgrade -q
echo   [OK] Python dependencies ready

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul 2>&1
    )
)

findstr /C:"SYSTEM_OWNER_EMAIL" .env >nul 2>&1
if errorlevel 1 (
    echo SYSTEM_OWNER_EMAIL=admin@outflo.com >> .env
    echo SYSTEM_OWNER_PASSWORD=Outflo@2024! >> .env
    echo SYSTEM_OWNER_JWT_SECRET=so-jwt-secret-dev-change-in-prod-xyz123 >> .env
    echo   [OK] System Owner credentials created
)

if not exist "storage" mkdir storage

echo.
echo [4/5] Setting Up Frontend...
cd /d "%PROJECT_ROOT%apps\frontend"

if not exist "node_modules" (
    echo   Installing npm packages...
    call npm install -q
    echo   [OK] npm packages installed
) else (
    call npm install -q
    echo   [OK] npm packages ready
)

if not exist ".env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000 >> .env.local
)

call npm list recharts -q >nul 2>&1
if errorlevel 1 (
    call npm install recharts --legacy-peer-deps -q
)

echo   [OK] Frontend ready

echo.
echo [5/5] Starting Services...
echo.

echo   Stopping any existing services...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo   Starting backend server...
start "OUTFLO_BACKEND" cmd /k "cd /d "%PROJECT_ROOT%apps\backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 5 /nobreak >nul

echo   Starting frontend server (clean .next cache)...
start "OUTFLO_FRONTEND" cmd /k "cd /d "%PROJECT_ROOT%apps\frontend" && set PORT=3000&& npm run dev:clean"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   OUTFLO IS RUNNING!
echo ============================================================
echo.
echo   ACCESS POINTS:
echo   - Frontend:     http://localhost:3000
echo   - Backend API:  http://localhost:8000
echo   - API Docs:     http://localhost:8000/docs
echo.
echo   ============================================================
echo   LOGIN CREDENTIALS
echo   ============================================================
echo.
echo   SYSTEM OWNER LOGIN:
echo   - URL:      http://localhost:3000/system-owner/login
echo   - Email:    admin@outflo.com
echo   - Password: Outflo@2024!
echo.
echo   ORGANIZATION LOGIN:
echo   - URL:      http://localhost:3000/login
echo   - Register new organization at /register
echo.
echo   Opening browser...
start http://localhost:3000/landing
echo.
echo   Press any key to exit...
pause >nul