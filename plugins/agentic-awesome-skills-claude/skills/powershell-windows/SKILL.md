---
name: powershell-windows
description: "PowerShell Windows patterns. Critical pitfalls, operator syntax, error handling."
risk: critical
source: community
date_added: "2026-02-27"
---

# PowerShell Windows Patterns

> Critical patterns and pitfalls for Windows PowerShell.

---

## 1. Operator Syntax Rules

### CRITICAL: Parentheses Required

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `if (Test-Path "a" -or Test-Path "b")` | `if ((Test-Path "a") -or (Test-Path "b"))` |
| `if (Get-Item $x -and $y -eq 5)` | `if ((Get-Item $x) -and ($y -eq 5))` |

**Rule:** Each cmdlet call MUST be in parentheses when using logical operators.

---

## 2. Encoding Compatibility

### Prefer portable log markers

| Purpose | ❌ Don't Use | ✅ Use |
|---------|-------------|--------|
| Success | ✅ ✓ | [OK] [+] |
| Error | ❌ ✗ 🔴 | [!] [X] |
| Warning | ⚠️ 🟡 | [*] [WARN] |
| Info | ℹ️ 🔵 | [i] [INFO] |
| Progress | ⏳ | [...] |

PowerShell supports Unicode. ASCII log markers are a portability choice, not a syntax requirement. For non-ASCII scripts read by Windows PowerShell 5.1, use UTF-8 with BOM; PowerShell 7 uses UTF-8 without BOM by default. Check the consuming tool before choosing file encoding.

---

## 3. Null Check Patterns

### Always Check Before Access

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `$array.Count -gt 0` | `($null -ne $array) -and (@($array).Count -gt 0)` |
| `$text.Length` | `if ($null -ne $text) { $text.Length }` |

---

## 4. String Interpolation

### Complex Expressions

`"Value: $($obj.prop.sub)"` is valid subexpression interpolation. Store a complex expression in a variable when that improves readability.

**Pattern:**
```
$value = $obj.prop.sub
Write-Output "Value: $value"
```

---

## 5. Error Handling

### ErrorActionPreference

| Value | Use |
|-------|-----|
| Stop | Required cmdlet failures must enter catch |
| Continue | Report a non-terminating error and continue deliberately |
| SilentlyContinue | When errors expected |

### Try/Catch Pattern

- A return inside try is valid; finally still runs
- Use finally for cleanup
- Return after try/catch

---

## 6. File Paths

### Windows Path Rules

| Pattern | Use |
|---------|-----|
| Literal path | `C:\Users\User\file.txt` |
| Variable path | `Join-Path $env:USERPROFILE "file.txt"` |
| Relative | `Join-Path $ScriptDir "data"` |

**Rule:** Use Join-Path for cross-platform safety.

---

## 7. Array Operations

### Correct Patterns

| Operation | Syntax |
|-----------|--------|
| Empty array | `$array = @()` |
| Add item | `$array += $item` |
| ArrayList add | `$list.Add($item) | Out-Null` |

---

## 8. JSON Operations

### CRITICAL: Depth Parameter

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `ConvertTo-Json` | `ConvertTo-Json -Depth 10` |

**Rule:** Always specify `-Depth` for nested objects.

### File Operations

| Operation | Pattern |
|-----------|---------|
| Read | `Get-Content "file.json" -Raw | ConvertFrom-Json` |
| Write | `$data | ConvertTo-Json -Depth 10 | Out-File "file.json" -Encoding UTF8` |

---

## 9. Common Errors

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "parameter 'or'" | Missing parentheses | Wrap cmdlets in () |
| "Unexpected token" | Parsing or quoting error | Inspect the reported token and file encoding |
| "Cannot find property" | Null object | Check null first |
| "Cannot convert" | Type mismatch | Validate input and convert to the required type |

---

## 10. Script Template

```powershell
# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Main
try {
    # Cmdlet logic here; check $LASTEXITCODE after native executables.
    Write-Output "[OK] Done"
    exit 0
}
catch {
    Write-Warning "Error: $_"
    exit 1
}
```

---

> **Remember:** Check shell version, encoding, null semantics and native exit codes. `try/catch` alone does not reliably turn native command failures into exceptions.

References: [encoding](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_Character_Encoding), [quoting](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules).

## When to Use
Use when writing or debugging Windows PowerShell or PowerShell 7 scripts, especially command expressions, encoding, paths and error handling.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
