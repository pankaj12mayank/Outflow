@echo off
chcp 65001 >nul
title Outflo - Startup Script

echo ========================================
echo   OUTFLO - AI Outreach Automation
echo ========================================
echo.

cd /d "%~dp0.."

echo [1/5] Checking Python...
python --version 2>nul
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [2/5] Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo [4/5] Installing backend dependencies...
pip install -q -r apps\backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo [5/5] Installing Playwright browsers...
playwright install chromium
if errorlevel 1 (
    echo WARNING: Failed to install Playwright browsers
    echo Run: playwright install chromium
)

echo.
echo ========================================
echo   Environment setup complete!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Install Ollama (https://ollama.ai)
echo    ollama pull llama3.2
echo.
echo 2. Create .env file:
echo    copy apps\backend\.env.example apps\backend\.env
echo    (edit with your database URL)
echo.
echo 3. Run database migrations:
echo    cd apps\backend
echo    alembic upgrade head
echo.
echo 4. Start the backend:
echo    uvicorn app.main:app --reload --port 8000
echo.
echo 5. Start the frontend (new terminal):
echo    cd apps\frontend
echo    npm run dev
echo.
pause