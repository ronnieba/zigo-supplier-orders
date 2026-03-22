@echo off
echo ============================
echo   מערכת הזמנות ספקים
echo ============================
echo.

REM --- Backend ---
echo [1/2] מפעיל Backend...
cd /d "%~dp0backend"

IF NOT EXIST "venv" (
    echo יוצר סביבה וירטואלית...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt

start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000"

echo Backend רץ על http://localhost:8000
echo.

REM --- Frontend ---
echo [2/2] מפעיל Frontend...
cd /d "%~dp0frontend"

IF NOT EXIST "node_modules" (
    echo מתקין חבילות npm...
    npm install
)

start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Frontend רץ על http://localhost:5173
echo.
echo ============================
echo פתח את http://localhost:5173
echo ============================
timeout /t 3
start http://localhost:5173
