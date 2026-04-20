@echo off
chcp 65001 >nul
setlocal

echo === Sci-Copilot Launcher ===

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not available in PATH.
    pause
    exit /b 1
)

cd /d "%~dp0backend"

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
set "VENV_DIR=%CD%\\venv"

set "VENV_PYTHON=%VENV_DIR%\\Scripts\\python.exe"
set "VENV_PIP=%VENV_DIR%\\Scripts\\pip.exe"

echo Installing dependencies...
"%VENV_PIP%" install -r requirements.txt

if not exist ".env" (
    echo Creating backend\.env from template...
    copy .env.example .env >nul
    echo Edit backend\.env — see backend\.env.example for all keys ^(at minimum set one text provider: CODEX_API_KEY or GOOGLE_API_KEY or OPEN_API_KEY^).
)

echo Starting API server on http://localhost:8000 ...
start "Sci-Copilot API" cmd /c "\"%VENV_PYTHON%\" main.py"

timeout /t 3 /nobreak >nul
start "" "http://localhost:8000"

echo Frontend: http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.
echo Close the API window when you are done.
pause
