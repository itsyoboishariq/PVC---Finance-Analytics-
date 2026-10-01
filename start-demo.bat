@echo off
setlocal enabledelayedexpansion

title Startup Financial Models - Local Demo Launcher
echo =====================================================================
echo           Startup Financial Models - Local Platform Launcher
echo =====================================================================
echo.

cd /d "%~dp0"

REM Step 1: Detect Python Environment
set PYTHON_EXE=
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    echo [OK] Existing virtual environment detected at .venv
    goto :check_packages
)

echo [INFO] Searching for Python runtime...
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where python') do (
        if not defined PYTHON_CMD set "PYTHON_CMD=%%i"
    )
    echo [OK] System Python found: !PYTHON_CMD!
    goto :create_venv
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
    echo [OK] Python launcher 'py' found.
    goto :create_venv
)

if exist "%USERPROFILE%\.local\bin\uv.exe" (
    echo [INFO] Astral uv package manager detected. Creating virtual environment...
    "%USERPROFILE%\.local\bin\uv.exe" venv .venv --python 3.11
    if exist ".venv\Scripts\python.exe" (
        set "PYTHON_EXE=.venv\Scripts\python.exe"
        echo [OK] Created .venv with uv!
        goto :check_packages
    )
)

echo.
echo [ERROR] Python is not installed or not in PATH!
echo Please install Python 3.10+ from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:create_venv
echo [INFO] Creating Python virtual environment in .venv...
%PYTHON_CMD% -m venv .venv
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)
set "PYTHON_EXE=.venv\Scripts\python.exe"
echo [OK] Virtual environment created successfully.

:check_packages
echo [INFO] Verifying and installing required packages from requirements.txt...
if exist "%USERPROFILE%\.local\bin\uv.exe" (
    "%USERPROFILE%\.local\bin\uv.exe" pip install -r requirements.txt
) else (
    "%PYTHON_EXE%" -m pip install -r requirements.txt
)

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Encountered non-zero exit during package install. Attempting startup...
)

echo.
echo =====================================================================
echo [SUCCESS] Starting FastAPI Local Server at http://127.0.0.1:8000
echo           Opening web interface in your default browser...
echo =====================================================================
echo.

REM Step 5: Automatically open default browser after a brief pause
start "" http://127.0.0.1:8000

REM Step 4: Start FastAPI Server
"%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] FastAPI server terminated unexpectedly with code %errorlevel%.
    pause
)
