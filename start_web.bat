@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    start "" py server.py
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        start "" python server.py
    ) else (
        echo Python khong duoc cai tren may.
        pause
        exit /b 1
    )
)
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8000/"
