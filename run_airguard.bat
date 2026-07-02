@echo off
title AirGuard AI Launcher
echo ===================================================
echo   🛡️ AirGuard AI - Smart Startup Launcher 🛡️
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python v3.10+ before running.
    pause
    exit /b
)

:: Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js v18+ before running.
    pause
    exit /b
)

echo [1/3] Starting FastAPI Backend server (Port 8000)...
start "AirGuard Backend" cmd /k "cd backend && python run.py"

echo [2/3] Starting React Vite Frontend client (Port 5173)...
start "AirGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [3/3] Waiting 5 seconds for servers to prime...
timeout /t 5 /nobreak > nul

echo.
echo [SUCCESS] Launching browser to http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo   System is running! 
echo   - Close the popped-up command windows to stop.
echo ===================================================
echo.
pause
