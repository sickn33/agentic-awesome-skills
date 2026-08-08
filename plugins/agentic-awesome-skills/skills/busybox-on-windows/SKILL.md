---
name: busybox-on-windows
description: "How to use a Win32 build of BusyBox to run many of the standard UNIX command line tools on Windows."
risk: safe
source: community
date_added: "2026-02-27"
---

BusyBox is a single binary that implements many common Unix tools.

Use this skill only on Windows. If you are on UNIX, then stop here.

Run the following steps only if you cannot find a `busybox.exe` file in the same directory as this document is. 
These are PowerShell commands, if you have a classic `cmd.exe` terminal, then you must use `powershell -Command "..."` to run them.
1. Print the type of CPU: `Get-CimInstance -ClassName Win32_Processor | Select-Object Name, NumberOfCores, MaxClockSpeed`
2. Print the OS versions: `Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" | Select-Object ProductName, DisplayVersion, CurrentBuild`
3. Download a suitable build of BusyBox by running one of these PowerShell commands:
   - 32-bit x86 (ANSI): `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://frippery.org/files/busybox/busybox.exe -OutFile busybox.exe`
   - 64-bit x86 (ANSI): `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://frippery.org/files/busybox/busybox64.exe -OutFile busybox.exe`
   - 64-bit x86 (Unicode): `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://frippery.org/files/busybox/busybox64u.exe -OutFile busybox.exe`
   - 64-bit ARM (Unicode): `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://frippery.org/files/busybox/busybox64a.exe -OutFile busybox.exe`

Useful commands:
- Help: `busybox.exe --list`
- Available UNIX commands: `busybox.exe --list`

Usage: Prefix the UNIX command with `busybox.exe`, for example: `busybox.exe ls -1`

If you need to run a UNIX command under another CWD, then use the absolute path to `busybox.exe`.

Documentation: https://frippery.org/busybox/
Original BusyBox: https://busybox.net/

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
