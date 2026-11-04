@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" goto launch
set "RESEARCH_PYTHON=python"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" set "RESEARCH_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
echo Creating the application environment...
"%RESEARCH_PYTHON%" -m venv .venv
if errorlevel 1 goto failure
:launch
".venv\Scripts\python.exe" -c "import fastapi,uvicorn,numpy" >nul 2>nul
if errorlevel 1 (
  echo Installing application dependencies. Internet is needed on first launch.
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto failure
)
".venv\Scripts\python.exe" run.py
pause
exit /b
:failure
echo Setup did not complete. See README.md for manual instructions. Python 3.10+ is required.
pause
exit /b 1
