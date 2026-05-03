@echo off
title ATLAS - Academic Load Tracking & Assignment System
color 0b

echo ======================================================
echo           ATLAS SYSTEM LAUNCHER
echo ======================================================
echo.

echo [1/3] Starting ATLAS Backend (PHP)...
start "ATLAS Backend" cmd /k "cd backend && php -S 127.0.0.1:8000 -t public"

echo [2/3] Starting ATLAS Frontend (Vite)...
start "ATLAS Frontend" cmd /k "cd frontend && npm.cmd run dev"

echo [3/3] Initializing System...
timeout /t 5 /nobreak > nul

echo.
echo Launching ATLAS Browser...
start http://localhost:5173

echo.
echo ======================================================
echo    ATLAS is now running! Keep this window open.
echo ======================================================
pause
