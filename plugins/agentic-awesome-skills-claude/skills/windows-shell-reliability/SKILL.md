---
name: windows-shell-reliability
description: "Reliable command execution on Windows: paths, encoding, and common binary pitfalls."
risk: safe
source: community
date_added: "2026-03-19"
---

# Windows Shell Reliability Patterns

> Best practices for running commands on Windows via PowerShell and CMD.

## When to Use
Use this skill when developing or debugging scripts and automation that run on Windows systems, especially when involving file paths, character encoding, or standard CLI tools.

---

## 1. Encoding & Redirection

### CRITICAL: Redirection Differences Across PowerShell Versions
Older Windows PowerShell releases can rewrite native-command output in ways that break
later processing. PowerShell 7.4+ preserves the byte stream when redirecting stdout,
so only apply the UTF-8 conversion workaround when you are dealing with older shell
behavior or a log file that is already unreadable.

| Problem | Symptom | Solution |
|---------|---------|----------|
| `dotnet > log.txt` | `view_file` fails in older Windows PowerShell | `Get-Content log.txt | Set-Content -Encoding utf8 log_utf8.txt` |
| `npm run > log.txt` | Need a UTF-8 text log with errors included | `npm run ... 2>&1 | Out-File -Encoding UTF8 log.txt` |

**Rule:** Prefer native redirection as-is on PowerShell 7.4+, and use explicit UTF-8
conversion only when older Windows PowerShell redirection produces an unreadable log.

---

## 2. Handling Paths & Spaces

### CRITICAL: Quoting
Windows paths often contain spaces.

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `dotnet build src/my project/file.fsproj` | `dotnet build "src/my project/file.fsproj"` |
| `& C:\Path With Spaces\bin.exe` | `& "C:\Path With Spaces\bin.exe"` |

**Rule:** Always quote absolute and relative paths that may contain spaces.

### The Call Operator (&)
In PowerShell, if an executable path starts with a quote, you MUST use the `&` operator.

**Pattern:**
```powershell
& "C:\Program Files\dotnet\dotnet.exe" build ...
```

---

## 3. Common Binary & Cmdlet Pitfalls

| Action | ❌ CMD Style | ✅ PowerShell Choice |
|--------|-------------|---------------------|
| Delete | `del /f /q file` | `Remove-Item -Force file` |
| Copy | `copy a b` | `Copy-Item a b` |
| Move | `move a b` | `Move-Item a b` |
| Make Dir | `mkdir folder` | `New-Item -ItemType Directory -Path folder` |

**Tip:** Using CLI aliases like `ls`, `cat`, and `cp` in PowerShell is usually fine, but using full cmdlets in scripts is more robust.

---

## 4. Dotnet CLI Reliability

### Build Speed & Consistency
| Context | Command | Why |
|---------|---------|-----|
| Fast Iteration | `dotnet build --no-restore` | Skips redundant nuget restore. |
| Clean Build | `dotnet build --no-incremental` | Ensures no stale artifacts. |
| Background | `Start-Process dotnet -ArgumentList 'run' -RedirectStandardOutput output.txt -RedirectStandardError error.txt` | Launches the app without blocking the shell and keeps logs. |

---

## 5. Environment Variables

| Shell | Syntax |
|-------|--------|
| PowerShell | `$env:VARIABLE_NAME` |
| CMD | `%VARIABLE_NAME%` |

---

## 6. Long Paths
Windows has a 260-character path limit by default.

**Fix:** If you hit long path errors, use the extended path prefix:
`\\?\C:\Very\Long\Path\...`

---

## 7. Troubleshooting Shell Errors

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `The term 'xxx' is not recognized` | Path not in $env:PATH | Use absolute path or fix PATH. |
| `Access to the path is denied` | File in use or permissions | Stop process or run as Admin. |
| `Encoding mismatch` | Older shell redirection rewrote the output | Re-export the file as UTF-8 or capture with `2>&1 | Out-File -Encoding UTF8`. |

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
