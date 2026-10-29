#!/usr/bin/env bash
# FoodToFork: starts the backend and the frontend (phone mode) for testing on
# a phone on the same Wi-Fi. Mac/Linux version of run.bat.
# Put this file in the top FoodToFork folder, then run:  bash run.sh
# Press Ctrl+C to stop both servers.
set -e
cd "$(dirname "$0")"

echo "=== FoodToFork ==="

# ---- First run only: backend Python environment ----
if [ ! -f backend/venv/bin/activate ]; then
  echo "Setting up the backend, first run only..."
  python3 -m venv backend/venv
  backend/venv/bin/pip install -r backend/requirements.txt
fi

# ---- First run only: frontend packages ----
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend packages, first run only..."
  (cd frontend && npm install)
fi

# ---- Find this computer's Wi-Fi address ----
IP=""
if [ "$(uname)" = "Darwin" ]; then
  IFACE=$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')
  [ -n "$IFACE" ] && IP=$(ipconfig getifaddr "$IFACE" 2>/dev/null || true)
else
  IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi

# ---- Backend in the background, stopped when this script ends ----
(cd backend && exec venv/bin/python -m uvicorn main:app --reload) &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT INT TERM

echo
if [ -n "$IP" ]; then
  echo "  On your phone, open:  https://$IP:5173"
else
  echo "  On your phone, open the https://192.168... 'Network' address shown below."
fi
echo "  On this computer:     https://localhost:5173"
echo "  Your phone will warn the connection isn't private. Tap Advanced, then Proceed."
echo "  Press Ctrl+C to stop everything."
echo

# ---- Frontend in this window ----
cd frontend
npm run phone
