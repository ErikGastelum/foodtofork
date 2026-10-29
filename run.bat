@echo off
rem FoodToFork: starts the backend and the frontend (phone mode) for testing
rem on a phone on the same Wi-Fi. Put this file in the top FoodToFork folder.
setlocal
cd /d "%~dp0"

echo === FoodToFork ===

rem ---- First run only: set up the backend's Python environment ----
if not exist "backend\venv\Scripts\activate.bat" (
  echo Setting up the backend, first run only...
  python -m venv backend\venv || goto :fail
  call backend\venv\Scripts\activate.bat
  pip install -r backend\requirements.txt || goto :fail
  call deactivate
)

rem ---- First run only: install the frontend packages ----
if not exist "frontend\node_modules" (
  echo Installing frontend packages, first run only...
  pushd frontend
  call npm install || (popd & goto :fail)
  popd
)

rem ---- Start each server in its own window ----
start "FoodToFork backend" /d "%~dp0backend" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --reload"
start "FoodToFork frontend" /d "%~dp0frontend" cmd /k "npm run phone"

rem ---- Find this PC's Wi-Fi address (the adapter that has internet) ----
set "IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "((Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address | Select-Object -First 1).IPAddress"`) do set "IP=%%i"

echo.
echo Backend and frontend are starting in two new windows.
echo.
if defined IP (
  echo   On your phone, open:  https://%IP%:5173
) else (
  echo   On your phone, open the https://192.168... "Network" address
  echo   shown in the frontend window.
)
echo   On this PC, open:     https://localhost:5173
echo.
echo   Your phone will warn the connection isn't private. Tap Advanced, then Proceed.
echo   To stop everything, close the two server windows.
echo.
pause
exit /b 0

:fail
echo.
echo Setup failed. Read the error above.
pause
exit /b 1
