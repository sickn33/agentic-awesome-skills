# Windows Recovery for Truncation Crash Loops

Use this guide if Antigravity or a Jetski/Cortex-based integration on Windows gets stuck in a restart loop with an error like:

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

This usually means a previous run stored a broken trajectory or tried to load too many skill instructions into one message.

## When to use this guide

- Antigravity crashes immediately after launch on Windows
- the app keeps resuming the same broken session
- a newly installed skill or bundle caused the failure
- you already removed the offending skill but the app still reopens into the same error

## Safety first

Before deleting anything, back up these folders if they exist:

- `%USERPROFILE%\.gemini\antigravity-browser-profile\Default`
- `%AppData%\antigravity`
- `%USERPROFILE%\.gemini\antigravity`

If you installed skills into a different location, also back up that custom directory.

## Manual recovery steps

1. Fully close Antigravity.
2. Remove the offending skill or package from your Antigravity skill install.
   Default path:

   ```text
   %USERPROFILE%\.gemini\antigravity\plugins\skills
   ```

3. Delete the stored browser database folders if they exist:

   ```text
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\Local Storage
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\Session Storage
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\IndexedDB
   ```

4. Delete the Antigravity app storage folders if they exist:

   ```text
   %AppData%\antigravity\Local Storage
   %AppData%\antigravity\Session Storage
   ```

5. Clear your Windows temp directory:

   ```text
   %TEMP%
   ```

6. Restart Antigravity.
7. Reinstall only the skills you actually need, or switch your integration to lazy loading with explicit limits.

## Recommended prevention

- Do not concatenate every `SKILL.md` into one system prompt.
- Use the stable manifest contract:
  - `skills_index.json` as canonical discovery source;
  - `data/skills_index.json` only as compatibility mirror.
- Load `SKILL.md` files only when a skill is actually requested.
- Set explicit limits for skills per turn.
- Prefer `overflowBehavior: "error"` in the reference Jetski/Gemini loader so the host fails clearly instead of silently overfilling the context window.
- See the schema and contract details in [`discovery-manifest.md`](discovery-manifest.md).

See:

- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)
- [`docs/integrations/jetski-gemini-loader/README.md`](../integrations/jetski-gemini-loader/README.md)

## Optional Windows batch helper

The following script is adapted from the community recovery workflow shared by [@DiggaX](https://github.com/DiggaX) in [issue #274](https://github.com/sickn33/agentic-awesome-skills/issues/274). Review it before running it.

```bat
@echo off
setlocal enabledelayedexpansion
title Anti-Gravity_Recovery_Tool_Universal

set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_DIR=%USERPROFILE%\Desktop\AG_Emergency_Backup_%TIMESTAMP%"

set "PATH_BROWSER=%USERPROFILE%\.gemini\antigravity-browser-profile\Default"
set "PATH_APPCONFIG=%AppData%\antigravity"
set "PATH_MAIN=%USERPROFILE%\.gemini\antigravity"

echo ============================================================
echo      ANTI-GRAVITY RECOVERY ^& REPAIR TOOL (UNIVERSAL)
echo ============================================================
echo.
echo This tool targets the truncation crash loop on Windows.
echo [INFO] Backup location: %BACKUP_DIR%
echo.

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if exist "%PATH_BROWSER%" xcopy "%PATH_BROWSER%" "%BACKUP_DIR%\Browser_Profile" /E /I /Y /Q
if exist "%PATH_APPCONFIG%" xcopy "%PATH_APPCONFIG%" "%BACKUP_DIR%\App_Config" /E /I /Y /Q
if exist "%PATH_MAIN%" xcopy "%PATH_MAIN%" "%BACKUP_DIR%\Main_Skills" /E /I /Y /Q

(
echo === ANTI-GRAVITY RESTORATION GUIDE ===
echo.
echo Restore Browser_Profile to: %PATH_BROWSER%
echo Restore App_Config to: %PATH_APPCONFIG%
echo Restore Main_Skills to: %PATH_MAIN%
echo.
echo Close Antigravity before restoring.
) > "%BACKUP_DIR%\RECOVERY_INSTRUCTIONS.txt"

set /p "repair=Start the repair now? [Y/N]: "

if /i "%repair%"=="Y" (
    if exist "%PATH_BROWSER%\Local Storage" rd /s /q "%PATH_BROWSER%\Local Storage"
    if exist "%PATH_BROWSER%\Session Storage" rd /s /q "%PATH_BROWSER%\Session Storage"
    if exist "%PATH_BROWSER%\IndexedDB" rd /s /q "%PATH_BROWSER%\IndexedDB"
    if exist "%PATH_APPCONFIG%\Local Storage" rd /s /q "%PATH_APPCONFIG%\Local Storage"
    if exist "%PATH_APPCONFIG%\Session Storage" rd /s /q "%PATH_APPCONFIG%\Session Storage"
    del /q /s %temp%\* >nul 2>&1
    for /d %%x in (%temp%\*) do @rd /s /q "%%x" >nul 2>&1
    echo [SUCCESS] Recovery cleanup completed.
) else (
    echo Recovery skipped. No files were deleted.
)

echo.
echo Next step: remove the broken skill from %PATH_MAIN%\plugins\skills
pause
```
