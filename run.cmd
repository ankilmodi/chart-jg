@echo off
echo ===================================================
echo   Starting Stock AI Analyzer - chart-jg
echo   (Merged: stock-gemini + stock-gemini-all)
echo ===================================================
echo.

echo Starting FastAPI Backend Server on port 8000...
start "Stock AI Backend API" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting React Vite Frontend Server on port 3000...
start "Stock AI Frontend React" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   Both servers launched successfully!
echo   Frontend URL: http://localhost:3000
echo   Backend URL:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ===================================================
pause
