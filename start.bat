@echo off
echo Starting ImpairmentOS...

echo Starting backend (FastAPI on port 8001)...
start "ImpairmentOS Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python -m uvicorn main:app --port 8001 --reload"

timeout /t 3 /nobreak > nul

echo Starting frontend (Vite on port 5173)...
start "ImpairmentOS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ImpairmentOS is running:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8001
echo   API Docs:  http://localhost:8001/docs
echo.
start "" http://localhost:5173
