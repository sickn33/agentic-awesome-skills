# Windows 截断崩溃循环恢复

如果 Antigravity 或基于 Jetski/Cortex 的集成在 Windows 上陷入重启循环,并出现如下错误,请使用本指南:

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

这通常意味着上一次运行存储了损坏的轨迹,或尝试将太多技能指令加载到一个消息中。

## 何时使用本指南

- Antigravity 在 Windows 上启动后立即崩溃
- 应用程序持续恢复同一个损坏的会话
- 新安装的技能或捆绑包导致了故障
- 您已经删除了问题技能,但应用程序仍然打开到同一个错误

## 安全第一

在删除任何内容之前,如果这些文件夹存在,请先备份:

- `%USERPROFILE%\.gemini\antigravity-browser-profile\Default`
- `%AppData%\antigravity`
- `%USERPROFILE%\.gemini\antigravity`

如果您将技能安装到不同位置,也请备份该自定义目录。

## 手动恢复步骤

1. 完全关闭 Antigravity。
2. 从您的 Antigravity 技能安装中删除有问题的技能或包。
   默认路径:

   ```text
   %USERPROFILE%\.gemini\antigravity\plugins\skills
   ```

3. 如果存在,删除存储的浏览器数据库文件夹:

   ```text
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\Local Storage
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\Session Storage
   %USERPROFILE%\.gemini\antigravity-browser-profile\Default\IndexedDB
   ```

4. 如果存在,删除 Antigravity 应用存储文件夹:

   ```text
   %AppData%\antigravity\Local Storage
   %AppData%\antigravity\Session Storage
   ```

5. 清除您的 Windows 临时目录:

   ```text
   %TEMP%
   ```

6. 重启 Antigravity。
7. 仅重新安装您实际需要的技能,或将您的集成切换到具有明确限制的延迟加载。

## 推荐的预防措施

- 不要将每个 `SKILL.md` 连接到一个系统提示中。
- 使用根目录 `skills_index.json` 作为规范轻量级清单；仅在宿主必须读取 `data/` 子树时使用 `data/skills_index.json` 兼容性镜像。
- 仅在实际请求技能时加载 `SKILL.md` 文件。
- 为每个轮次的技能设置明确限制。
- 在参考 Jetski/Gemini 加载器中首选 `overflowBehavior: "error"`,以便主机在上下文窗口被静默过度填充之前清晰地失败。

参见:

- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)
- [`docs/integrations/jetski-gemini-loader/README.md`](../integrations/jetski-gemini-loader/README.md)

## 可选的 Windows 批处理助手

以下脚本改编自 [@DiggaX](https://github.com/DiggaX) 在 [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274) 中分享的社区恢复工作流。在运行之前请先查看它。

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
