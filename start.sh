#!/bin/bash

set -e

echo "=== Sci-Copilot Launcher ==="

if ! command -v python3 >/dev/null 2>&1; then
    echo "Python 3 is required."
    exit 1
fi

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
VENV_DIR="$PWD/venv"

source "$VENV_DIR/bin/activate"
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

echo "Installing dependencies..."
"$VENV_PIP" install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating backend/.env from template..."
    cp .env.example .env
    echo "Edit backend/.env — see backend/.env.example (set at least one text provider: CODEX_API_KEY, GOOGLE_API_KEY, or OPEN_API_KEY)."
fi

echo "Starting API server on http://localhost:8000 ..."
"$VENV_PYTHON" main.py &
BACKEND_PID=$!

sleep 3

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:8000" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:8000" >/dev/null 2>&1 || true
fi

echo "Frontend: http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "Press Enter to stop the server."
read -r

kill "$BACKEND_PID"
