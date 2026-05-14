@echo off
setlocal
cd /d "%~dp0"

echo.
echo   ===========================================
echo      FaceSwap Studio  v1.0  ^| CPU mode
echo   ===========================================
echo.

:: Check Python
where python >nul 2>&1
if errorlevel 1 (
  echo   [ERRORE] Python non trovato.
  echo   Scarica e installa Python 3.10+ da https://www.python.org/downloads/
  echo   Assicurati di spuntare "Add Python to PATH" durante l'installazione.
  pause & exit /b 1
)

:: Check Python version >= 3.10
python -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if errorlevel 1 (
  echo   [ERRORE] Serve Python 3.10 o superiore.
  python --version
  pause & exit /b 1
)

:: Virtual env
if not exist ".venv" (
  echo   Creazione ambiente virtuale...
  python -m venv .venv
  if errorlevel 1 (
    echo   [ERRORE] Impossibile creare il venv.
    pause & exit /b 1
  )
)

call .venv\Scripts\activate.bat

echo   Aggiornamento pip...
python -m pip install --upgrade pip -q

echo   Installazione dipendenze (CPU mode, prima volta richiede qualche minuto)...
pip install -q -r requirements.txt
if errorlevel 1 (
  echo   [ERRORE] Installazione dipendenze fallita.
  pause & exit /b 1
)

:: Check model
if not exist "models\inswapper_128.onnx" (
  echo.
  echo   ================================================
  echo   ATTENZIONE: modello mancante^^!
  echo   Scarica  inswapper_128.onnx  e mettilo in:
  echo   %CD%\models\
  echo.
  echo   Dove trovarlo:
  echo   - HuggingFace: cerca "inswapper_128 insightface"
  echo   - Community InsightFace su GitHub
  echo   ================================================
  echo.
)

:: Check ffmpeg
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo   INFO: ffmpeg non trovato - i video usano codec mp4v
  echo   Per compatibilita' ottimale installa ffmpeg e aggiungilo al PATH
  echo.
)

echo   Avvio server su http://localhost:8000
echo   Apri il browser e vai su: http://localhost:8000
echo   Premi Ctrl+C per fermare
echo.

python -m uvicorn app:app --host 127.0.0.1 --port 8000

pause
