@echo off
setlocal EnableDelayedExpansion

:: --- CONFIGURATION ---
set "BASE_DIR=%AG_BASE_DIR%"
if not defined BASE_DIR set "BASE_DIR=%USERPROFILE%\.agents"
set "SKILLS_DIR=%AG_SKILLS_DIR%"
if not defined SKILLS_DIR set "SKILLS_DIR=%BASE_DIR%\skills"
set "LIBRARY_DIR=%AG_LIBRARY_DIR%"
if not defined LIBRARY_DIR set "LIBRARY_DIR=%BASE_DIR%\skills_library"
set "ARCHIVE_PREFIX=%AG_ARCHIVE_PREFIX%"
if not defined ARCHIVE_PREFIX set "ARCHIVE_PREFIX=%BASE_DIR%\skills_archive"
set "REPO_SKILLS=%AG_REPO_SKILLS_DIR%"
if not defined REPO_SKILLS set "REPO_SKILLS=%~dp0..\skills"
set "BUNDLE_HELPER=%AG_BUNDLE_HELPER%"
if not defined BUNDLE_HELPER set "BUNDLE_HELPER=%~dp0..\tools\scripts\get-bundle-skills.py"
set "PYTHON_BIN=%AG_PYTHON_BIN%"
if not defined PYTHON_BIN set "PYTHON_BIN=python"

echo Activating Antigravity skills...

:: --- ARGUMENT HANDLING ---
set "DO_CLEAR=0"
set "EXTRA_ARGS="
set "SKILLS_LIST_FILE=%TEMP%\skills_list_%RANDOM%_%RANDOM%.txt"

for %%a in (%*) do (
    if /I "%%a"=="--clear" (
        set "DO_CLEAR=1"
    ) else (
        if "!EXTRA_ARGS!"=="" (set "EXTRA_ARGS=%%a") else (set "EXTRA_ARGS=!EXTRA_ARGS! %%a")
    )
)

:: --- LIBRARY SYNC ---
:: If running from the repo, ensure the library is synced with the 1,200+ skills source.
if exist "%REPO_SKILLS%" (
    echo Syncing library with repository source...
    if not exist "%LIBRARY_DIR%" mkdir "%LIBRARY_DIR%" 2>nul
    robocopy "%REPO_SKILLS%" "%LIBRARY_DIR%" /E /NFL /NDL /NJH /NJS /XO >nul 2>&1
)

:: If still no library, try to create one from current skills or archives.
if not exist "%LIBRARY_DIR%" (
    echo Initializing skills library from local state...
    mkdir "%LIBRARY_DIR%" 2>nul
    
    :: 1. Migrate from current skills folder
    if exist "%SKILLS_DIR%" (
        echo   + Moving current skills to library...
        robocopy "%SKILLS_DIR%" "%LIBRARY_DIR%" /E /MOVE /NFL /NDL /NJH /NJS >nul 2>&1
    )
    
    :: 2. Merge from all archives
    for /f "delims=" %%i in ('dir /b /ad "%BASE_DIR%\skills_archive*" 2^>nul') do (
        echo   + Merging skills from %%i...
        robocopy "%BASE_DIR%\%%i" "%LIBRARY_DIR%" /E /NFL /NDL /NJH /NJS >nul 2>&1
    )
)

:: --- PREPARE ACTIVE FOLDER ---
if "!DO_CLEAR!"=="1" (
    echo [RESET] Archiving and clearing existing skills...
    if exist "%SKILLS_DIR%" (
        set "ts=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
        set "ts=!ts: =0!"
        robocopy "%SKILLS_DIR%" "%ARCHIVE_PREFIX%_!ts!" /E /MOVE /NFL /NDL /NJH /NJH >nul 2>&1
    )
) else (
    echo [APPEND] Layering new skills onto existing folder...
)
mkdir "%SKILLS_DIR%" 2>nul


:: --- BUNDLE EXPANSION ---
echo Expanding bundles...

if exist "%SKILLS_LIST_FILE%" del "%SKILLS_LIST_FILE%" 2>nul

if exist "%BUNDLE_HELPER%" (
    "%PYTHON_BIN%" --version >nul 2>&1
    if not errorlevel 1 (
        :: Safely pass all arguments to Python (filtering out --clear)
        "%PYTHON_BIN%" "%BUNDLE_HELPER%" !EXTRA_ARGS! > "%SKILLS_LIST_FILE%" 2>nul
        
        :: If no other arguments, expand Essentials
        if "!EXTRA_ARGS!"=="" "%PYTHON_BIN%" "%BUNDLE_HELPER%" Essentials > "%SKILLS_LIST_FILE%" 2>nul
    )
)

:: Empty output should be treated the same as failure so fallback logic still runs
if exist "%SKILLS_LIST_FILE%" (
    for %%i in ("%SKILLS_LIST_FILE%") do if %%~zi EQU 0 del "%SKILLS_LIST_FILE%" 2>nul
)

:: Fallback if Python fails or returned empty
if not exist "%SKILLS_LIST_FILE%" (
    if "!EXTRA_ARGS!"=="" (
        echo Using default essentials...
        > "%SKILLS_LIST_FILE%" (
            echo api-security-best-practices
            echo auth-implementation-patterns
            echo backend-security-coder
            echo frontend-security-coder
            echo cc-skill-security-review
            echo pci-compliance
            echo frontend-design
            echo react-best-practices
            echo react-patterns
            echo nextjs-best-practices
            echo tailwind-patterns
            echo form-cro
            echo seo-audit
            echo ui-ux-pro-max
            echo 3d-web-experience
            echo canvas-design
            echo mobile-design
            echo scroll-experience
            echo senior-fullstack
            echo frontend-developer
            echo backend-dev-guidelines
            echo api-patterns
            echo database-design
            echo stripe-integration
            echo agent-evaluation
            echo langgraph
            echo mcp-builder
            echo prompt-engineering
            echo ai-agents-architect
            echo rag-engineer
            echo llm-app-patterns
            echo rag-implementation
            echo prompt-caching
            echo context-window-management
            echo langfuse
        )
    ) else (
        :: Use only literal arguments that match the safe skill-id allowlist
        > "%SKILLS_LIST_FILE%" (
            for %%a in (%*) do (
                if /I not "%%a"=="--clear" (
                    echo(%%a| findstr /c:".." >nul || (
                        echo(%%a| findstr /r /x "[A-Za-z0-9._/-][A-Za-z0-9._/-]*" >nul && echo %%a
                    )
                )
            )
        )
    )
)

:: --- RESTORATION ---
echo Restoring selected skills...
if exist "%SKILLS_LIST_FILE%" (
    for /f "usebackq delims=" %%s in ("%SKILLS_LIST_FILE%") do (
        set "SKILL_PATH=%%s"
        set "SKILL_PATH=!SKILL_PATH:/=\!"
        if exist "%SKILLS_DIR%\!SKILL_PATH!" (
            echo   . %%s ^(already active^)
        ) else if exist "%LIBRARY_DIR%\!SKILL_PATH!" (
            echo   + %%s
            robocopy "%LIBRARY_DIR%\!SKILL_PATH!" "%SKILLS_DIR%\!SKILL_PATH!" /E /NFL /NDL /NJH /NJS >nul 2>&1
        ) else (
            echo   - %%s ^(not found in library^)
        )
    )
)
if exist "%SKILLS_LIST_FILE%" del "%SKILLS_LIST_FILE%" 2>nul

echo.
setlocal DisableDelayedExpansion
echo Done! Antigravity skills are now activated.
if /I not "%AG_NO_PAUSE%"=="1" pause
