@echo off
setlocal enabledelayedexpansion

:: ============================================
:: OUTFLO - SMART ONE-CLICK STARTUP SYSTEM
:: ============================================

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: Color codes
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

cls
echo.
echo %CYAN%╔═══════════════════════════════════════════════════════════╗%NC%
echo %CYAN%║%NC%          🤖 OUTFLO - AI OUTREACH AUTOMATION            %CYAN%║%NC%
echo %CYAN%║%NC%             Smart Development Environment              %CYAN%║%NC%
echo %CYAN%╚═══════════════════════════════════════════════════════════╝%NC%
echo.

:: ============================================
:: GLOBAL VARIABLES
:: ============================================
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=3000"
set "INSTALL_PYTHON=0"
set "INSTALL_NPM=0"
set "START_BACKEND=0"
set "START_FRONTEND=0"

:: ============================================
:: PHASE 1: ENVIRONMENT CHECK & AUTO-INSTALL
:: ============================================
echo %GREEN%▸ PHASE 1: ENVIRONMENT VERIFICATION%NC%
echo   ─────────────────────────────────────────

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo   [!] Python not found - Will attempt to install...
    set "INSTALL_PYTHON=1"
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set "PYTHON_VER=%%i"
    echo   %GREEN%✓%NC% Python: !PYTHON_VER!
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo   [!] Node.js not found - Will attempt to install...
    set "INSTALL_NPM=1"
) else (
    for /f "tokens=2" %%i in ('node --version 2^>^&1') do set "NODE_VER=%%i"
    echo   %GREEN%✓%NC% Node.js: !NODE_VER!
)

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [!] npm not found
) else (
    for /f "tokens=2" %%i in ('npm --version 2^>^&1') do set "NPM_VER=%%i"
    echo   %GREEN%✓%NC% npm: !NPM_VER!
)

:: Check MongoDB
mongod --version >nul 2>&1
if errorlevel 1 (
    echo   %YELLOW%⚠%NC% MongoDB: Not installed
) else (
    echo   %GREEN%✓%NC% MongoDB: Installed
    :: Try to start MongoDB service
    sc query MongoDB >nul 2>&1
    if not errorlevel 1 (
        sc query MongoDB | findstr "RUNNING" >nul 2>&1
        if errorlevel 1 (
            echo   → Starting MongoDB service...
            sc start MongoDB >nul 2>&1
        )
    )
)

:: Check Ollama
ollama --version >nul 2>&1
if errorlevel 1 (
    echo   %YELLOW%⚠%NC% Ollama: Not installed ^(AI features disabled^)
) else (
    echo   %GREEN%✓%NC% Ollama: Installed
)

echo.

:: ============================================
:: PHASE 2: BACKEND SETUP
:: ============================================
echo %GREEN%▸ PHASE 2: BACKEND SETUP%NC%
echo   ─────────────────────────────────────────

cd /d "%PROJECT_ROOT%apps\backend"

:: Check if virtual environment exists
if not exist "venv" (
    echo   [!] Virtual environment not found - Creating...
    python -m venv venv
    if errorlevel 1 (
        echo   %RED%✗%NC% Failed to create virtual environment
        pause
        exit /b 1
    )
    echo   %GREEN%✓%NC% Virtual environment created
) else (
    echo   %GREEN%✓%NC% Virtual environment exists
)

:: Activate virtual environment
call venv\Scripts\activate.bat >nul 2>&1

:: Check if requirements are installed
pip show motor >nul 2>&1
if errorlevel 1 (
    echo   [!] Python dependencies not found - Installing...
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo   %RED%✗%NC% Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo   %GREEN%✓%NC% Python dependencies installed
) else (
    echo   %GREEN%✓%NC% Python dependencies ready
)

:: Create .env if not exists
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul 2>&1
        echo   %GREEN%✓%NC% Created .env file
    )
)

:: Create required directories
if not exist "logs" mkdir logs
if not exist "storage" mkdir storage

:: ============================================
:: PHASE 3: FRONTEND SETUP
:: ============================================
echo.
echo %GREEN%▸ PHASE 3: FRONTEND SETUP%NC%
echo   ─────────────────────────────────────────

cd /d "%PROJECT_ROOT%apps\frontend"

:: Check if node_modules exists
if not exist "node_modules" (
    echo   [!] npm packages not found - Installing...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo   %RED%✗%NC% Failed to install npm packages
        pause
        exit /b 1
    )
    echo   %GREEN%✓%NC% npm packages installed
) else (
    echo   %GREEN%✓%NC% npm packages ready
)

:: Create .env.local if not exists
if not exist ".env.local" (
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo NEXT_PUBLIC_APP_URL=http://localhost:3000
    ) > .env.local
    echo   %GREEN%✓%NC% Created frontend .env.local
)

:: ============================================
:: PHASE 4: AI MODEL VERIFICATION
:: ============================================
echo.
echo %GREEN%▸ PHASE 4: AI ENGINE VERIFICATION%NC%
echo   ─────────────────────────────────────────

cd /d "%PROJECT_ROOT%apps\backend"
call venv\Scripts\activate.bat >nul 2>&1

:: Check if Ollama is accessible
curl -s http://localhost:11434/api/version >nul 2>&1
if not errorlevel 1 (
    echo   %GREEN%✓%NC% Ollama service running
    
    :: Check for llama3.2 model
    ollama list | findstr /I "llama3.2" >nul 2>&1
    if errorlevel 1 (
        echo   [!] llama3.2 model not found - Pulling...
        echo   (This may take several minutes on first run)
        ollama pull llama3.2 >nul 2>&1
        echo   %GREEN%✓%NC% llama3.2 model ready
    ) else (
        echo   %GREEN%✓%NC% llama3.2 model ready
    )
) else (
    echo   %YELLOW%⚠%NC% Ollama service not running - Skipping AI setup
)

:: ============================================
:: PHASE 5: CLEANUP OLD PROCESSES
:: ============================================
echo.
echo %GREEN%▸ PHASE 5: PORT MANAGEMENT%NC%
echo   ─────────────────────────────────────────

echo   Checking for processes on ports...

:: Kill existing backend process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    echo   → Stopping existing backend on port %BACKEND_PORT%
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill existing frontend process  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    echo   → Stopping existing frontend on port %FRONTEND_PORT%
    taskkill /F /PID %%a >nul 2>&1
)

:: ============================================
:: PHASE 6: START SERVICES
:: ============================================
echo.
echo %GREEN%▸ PHASE 6: STARTING SERVICES%NC%
echo   ─────────────────────────────────────────

cd /d "%PROJECT_ROOT%apps\backend"
call venv\Scripts\activate.bat >nul 2>&1

:: Create logs directory in root
if not exist "%PROJECT_ROOT%logs" mkdir "%PROJECT_ROOT%logs"

:: Start backend server with logging
echo   → Starting backend server on port %BACKEND_PORT%...
start "Outflo Backend [8000]" cmd /k "cd /d "%PROJECT_ROOT%apps\backend" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload >> ..\..\logs\backend.log 2>&1"

:: Wait for backend to initialize
timeout /t 4 /nobreak >nul

:: Verify backend started
curl -s http://localhost:%BACKEND_PORT%/api/v1/health >nul 2>&1
if not errorlevel 1 (
    echo   %GREEN%✓%NC% Backend server running at http://localhost:%BACKEND_PORT%
) else (
    echo   %YELLOW%⚠%NC% Backend still starting...
)

:: Start frontend
cd /d "%PROJECT_ROOT%apps\frontend"
echo   → Starting frontend server on port %FRONTEND_PORT%...
start "Outflo Frontend [3000]" cmd /k "cd /d "%PROJECT_ROOT%apps\frontend" && npm run dev >> ..\logs\frontend.log 2>&1"

:: Wait for frontend to initialize
timeout /t 6 /nobreak >nul

:: Verify frontend started
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if not errorlevel 1 (
    echo   %GREEN%✓%NC% Frontend server running at http://localhost:%FRONTEND_PORT%
) else (
    echo   %YELLOW%⚠%NC% Frontend still starting...
)

:: ============================================
:: PHASE 7: OPEN BROWSER
:: ============================================
echo.
echo %GREEN%▸ PHASE 7: LAUNCHING APPLICATION%NC%
echo   ─────────────────────────────────────────

timeout /t 2 /nobreak >nul

:: Check if frontend is ready before opening browser
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if not errorlevel 1 (
    echo   → Opening browser...
    start http://localhost:%FRONTEND_PORT%
) else (
    echo   %YELLOW%⚠%NC% Browser will not open - services still starting
)

:: ============================================
:: FINAL STATUS
:: ============================================
echo.
echo %CYAN%═══════════════════════════════════════════════════════════════%NC%
echo %GREEN%                    🎉 SYSTEM READY! 🎉%NC%
echo %CYAN%═══════════════════════════════════════════════════════════════%NC%
echo.
echo   📍 ACCESS POINTS:
echo   ─────────────────────────────────────────
echo   🌐 Frontend:    http://localhost:%FRONTEND_PORT%
echo   🔌 Backend:     http://localhost:%BACKEND_PORT%
echo   📚 API Docs:    http://localhost:%BACKEND_PORT%/docs
echo.
echo   📁 LOG FILES:
echo   ─────────────────────────────────────────
echo   - Backend:  logs\backend.log
echo   - Frontend: logs\frontend.log
echo.
echo   ⏹️  TO STOP: Press Ctrl+C in each terminal OR close the terminal windows
echo.
echo %YELLOW%   💡 Tip: Keep these terminal windows open to see live logs%NC%
echo.

:: Keep terminals open - user can Ctrl+C to stop
pause