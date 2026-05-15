@echo off
REM ===========================================
REM OUTFLO - Start Development Server (Windows)
REM ===========================================

color 0A
echo.
echo ===========================================
echo    Starting Outflo Development Server
echo ===========================================
echo.

REM Start Backend
echo [INFO] Starting Backend Server on port 8000...
cd apps\backend
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)
start /B cmd /c "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [INFO] Starting Frontend Server on port 3000...
cd ..\frontend
start /B cmd /c "npm run dev"

echo.
echo ===========================================
echo    Servers Starting!
echo ===========================================
echo.
echo    Backend:   http://localhost:8000
echo    Frontend:  http://localhost:3000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    Press any key to open browser...
echo ===========================================
pause >nul

start http://localhost:3000