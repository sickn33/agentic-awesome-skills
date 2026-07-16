@echo off
setlocal
TITLE Agentic Skills App

echo ===================================================
echo      Agentic Awesome Skills - Web App
echo ===================================================

:: Check for Node.js
WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Check/Install dependencies
cd apps\web-app

if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing...
    goto :INSTALL_DEPS
)

:: Verify dependencies aren't corrupted
echo [INFO] Verifying app dependencies...
call npx -y vite --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Dependencies appear corrupted or outdated.
    echo [INFO] Cleaning up and reinstalling fresh dependencies...
    rmdir /s /q "node_modules" >nul 2>nul
    goto :INSTALL_DEPS
)
goto :DEPS_OK

:INSTALL_DEPS
call npm install
call npm install @supabase/supabase-js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies. Please check your internet connection.
    pause
    exit /b 1
)

:DEPS_OK
cd ..\..

:: Run setup script
echo [INFO] Updating skills data...
call npm run app:setup

:: Start App
echo [INFO] Starting Web App...
echo [INFO] Opening default browser...
echo [INFO] Use the Sync Skills button in the app to update skills from GitHub!
cd apps\web-app
call npx -y vite --open

endlocal
