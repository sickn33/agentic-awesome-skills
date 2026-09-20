---
name: windows-hardening
description: Harden Windows servers per security baselines and CIS benchmarks. Configure
  Group Policy, Windows Defender, and security features. Use when securing Windows
  Server environments.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Windows Hardening

Secure Windows servers following Microsoft security baselines and CIS benchmarks.

## Prerequisites

- Windows Server 2019 or later (2022 recommended)
- Local Administrator or Domain Admin access
- PowerShell 5.1+ (built into Windows Server)
- Group Policy Management Console for domain environments
- Microsoft Security Compliance Toolkit (recommended)

## Security Baseline Deployment

```powershell
# Download and apply Microsoft Security Baseline
# Download from: https://www.microsoft.com/en-us/download/details.aspx?id=55319

# Install Security Compliance Toolkit modules
Install-Module -Name SecurityPolicyDsc -Force
Install-Module -Name AuditPolicyDsc -Force
Install-Module -Name PSDesiredStateConfiguration -Force

# Import and apply a security baseline GPO (from Security Compliance Toolkit)
# Extract the toolkit, then:
Import-Module "$env:USERPROFILE\Downloads\SCT\LGPO.exe"

# Apply local group policy from baseline
.\LGPO.exe /g ".\GPO\{baseline-gpo-guid}"

# Export current security policy for review
secedit /export /cfg C:\SecurityAudit\current-policy.inf
```

## Account Policies

```powershell
# ============================================
# Password Policy Configuration
# ============================================

# Set password policy via net accounts
net accounts /minpwlen:14 /maxpwage:90 /minpwage:1 /uniquepw:24

# Or configure via PowerShell DSC
Configuration PasswordPolicy {
    Import-DscResource -ModuleName SecurityPolicyDsc

    Node localhost {
        AccountPolicy PasswordPolicy {
            Name                                = "PasswordPolicy"
            Minimum_Password_Length              = 14
            Maximum_Password_Age                = 90
            Minimum_Password_Age                = 1
            Enforce_password_history             = 24
            Password_must_meet_complexity_requirements = "Enabled"
            Store_passwords_using_reversible_encryption = "Disabled"
        }
    }
}

# ============================================
# Account Lockout Policy
# ============================================
net accounts /lockoutthreshold:5 /lockoutwindow:30 /lockoutduration:30

# ============================================
# User Account Hardening
# ============================================

# Rename and disable default accounts
Rename-LocalUser -Name "Administrator" -NewName "LocalAdmin"
Disable-LocalUser -Name "Guest"
Disable-LocalUser -Name "DefaultAccount"

# Remove unnecessary local accounts
$unnecessaryAccounts = Get-LocalUser | Where-Object {
    $_.Enabled -eq $true -and
    $_.Name -notin @("LocalAdmin", "SYSTEM", "NetworkService", "LocalService")
}
foreach ($account in $unnecessaryAccounts) {
    Write-Host "Review account: $($account.Name) - Last logon: $($account.LastLogon)"
}

# Configure Local Administrator Password Solution (LAPS)
# Install LAPS module
Install-WindowsFeature -Name RSAT-AD-PowerShell
Import-Module AdmPwd.PS

# Configure LAPS for the OU
Set-AdmPwdComputerSelfPermission -OrgUnit "OU=Servers,DC=example,DC=com"
Set-AdmPwdReadPasswordPermission -OrgUnit "OU=Servers,DC=example,DC=com" -AllowedPrincipals "Domain Admins"
```

## Group Policy Security Settings

```powershell
# ============================================
# User Rights Assignment (via GPO or local policy)
# ============================================

# Restrict remote desktop access
# Computer Configuration > Policies > Windows Settings > Security Settings > Local Policies > User Rights Assignment
# "Allow log on through Remote Desktop Services" = Administrators, Remote Desktop Users

# Deny log on locally for service accounts
# "Deny log on locally" = Service accounts

# Configure via registry (alternative to GPO)
# Restrict anonymous enumeration of SAM accounts
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" `
    -Name "RestrictAnonymousSAM" -Value 1

# Restrict anonymous enumeration of shares
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" `
    -Name "RestrictAnonymous" -Value 1

# Do not display last user name
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    -Name "DontDisplayLastUserName" -Value 1

# ============================================
# Security Options
# ============================================

# Disable SMBv1 (critical security hardening)
Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force

# Require SMB signing
Set-SmbServerConfiguration -RequireSecuritySignature $true -Force
Set-SmbClientConfiguration -RequireSecuritySignature $true -Force

# Disable LLMNR (prevent credential theft)
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" `
    -Name "EnableMulticast" -Value 0

# Disable NetBIOS over TCP/IP
$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true }
foreach ($adapter in $adapters) {
    $adapter.SetTcpipNetbios(2)  # 2 = Disable
}

# Disable WDigest (prevent plaintext password caching)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest" `
    -Name "UseLogonCredential" -Value 0

# Enable LSA Protection
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" `
    -Name "RunAsPPL" -Value 1

# Configure UAC
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    -Name "EnableLUA" -Value 1
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    -Name "ConsentPromptBehaviorAdmin" -Value 2
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    -Name "PromptOnSecureDesktop" -Value 1
```

## Windows Firewall Configuration

```powershell
# ============================================
# Enable Windows Firewall on all profiles
# ============================================
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True

# Default deny inbound, allow outbound
Set-NetFirewallProfile -Profile Domain -DefaultInboundAction Block -DefaultOutboundAction Allow
Set-NetFirewallProfile -Profile Public -DefaultInboundAction Block -DefaultOutboundAction Allow
Set-NetFirewallProfile -Profile Private -DefaultInboundAction Block -DefaultOutboundAction Allow

# Enable logging
Set-NetFirewallProfile -Profile Domain -LogAllowed True -LogBlocked True `
    -LogFileName "%SystemRoot%\System32\LogFiles\Firewall\pfirewall.log" `
    -LogMaxSizeKilobytes 32768

# ============================================
# Inbound Rules
# ============================================

# Allow RDP from management network only
New-NetFirewallRule -DisplayName "Allow RDP - Management" `
    -Direction Inbound -Protocol TCP -LocalPort 3389 `
    -RemoteAddress 10.0.100.0/24 -Action Allow -Profile Domain

# Allow WinRM from management network
New-NetFirewallRule -DisplayName "Allow WinRM - Management" `
    -Direction Inbound -Protocol TCP -LocalPort 5985,5986 `
    -RemoteAddress 10.0.100.0/24 -Action Allow -Profile Domain

# Allow ICMP from internal networks
New-NetFirewallRule -DisplayName "Allow ICMP - Internal" `
    -Direction Inbound -Protocol ICMPv4 -IcmpType 8 `
    -RemoteAddress 10.0.0.0/8 -Action Allow

# Allow specific application
New-NetFirewallRule -DisplayName "Allow IIS HTTPS" `
    -Direction Inbound -Protocol TCP -LocalPort 443 `
    -Action Allow -Profile Domain,Private

# Block all other inbound by default (already set above)

# ============================================
# Outbound Rules (optional - restrict egress)
# ============================================

# Allow DNS
New-NetFirewallRule -DisplayName "Allow DNS" `
    -Direction Outbound -Protocol UDP -RemotePort 53 `
    -Action Allow

# Allow HTTPS for updates
New-NetFirewallRule -DisplayName "Allow HTTPS Out" `
    -Direction Outbound -Protocol TCP -RemotePort 443 `
    -Action Allow

# Allow NTP
New-NetFirewallRule -DisplayName "Allow NTP" `
    -Direction Outbound -Protocol UDP -RemotePort 123 `
    -Action Allow

# ============================================
# Firewall Audit
# ============================================

# List all enabled firewall rules
Get-NetFirewallRule -Enabled True | Format-Table DisplayName, Direction, Action, Profile

# Export firewall rules
netsh advfirewall export "C:\SecurityAudit\firewall-rules.wfw"

# Find overly permissive rules
Get-NetFirewallRule -Enabled True -Direction Inbound |
    Where-Object { $_.RemoteAddress -eq "Any" -and $_.Action -eq "Allow" } |
    Format-Table DisplayName, LocalPort, RemoteAddress, Profile
```

## Audit Policy Configuration

```powershell
# ============================================
# Advanced Audit Policy
# ============================================

# Account Logon
auditpol /set /subcategory:"Credential Validation" /success:enable /failure:enable
auditpol /set /subcategory:"Kerberos Authentication Service" /success:enable /failure:enable
auditpol /set /subcategory:"Kerberos Service Ticket Operations" /success:enable /failure:enable

# Account Management
auditpol /set /subcategory:"Computer Account Management" /success:enable
auditpol /set /subcategory:"Security Group Management" /success:enable
auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable

# Logon/Logoff
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Logoff" /success:enable
auditpol /set /subcategory:"Account Lockout" /success:enable /failure:enable
auditpol /set /subcategory:"Special Logon" /success:enable

# Object Access
auditpol /set /subcategory:"File System" /success:enable /failure:enable
auditpol /set /subcategory:"Registry" /success:enable /failure:enable
auditpol /set /subcategory:"SAM" /success:enable /failure:enable

# Policy Change
auditpol /set /subcategory:"Audit Policy Change" /success:enable /failure:enable
auditpol /set /subcategory:"Authentication Policy Change" /success:enable
auditpol /set /subcategory:"Authorization Policy Change" /success:enable

# Privilege Use
auditpol /set /subcategory:"Sensitive Privilege Use" /success:enable /failure:enable

# System
auditpol /set /subcategory:"Security State Change" /success:enable /failure:enable
auditpol /set /subcategory:"Security System Extension" /success:enable /failure:enable
auditpol /set /subcategory:"System Integrity" /success:enable /failure:enable

# Verify audit policy
auditpol /get /category:*

# Export audit policy
auditpol /backup /file:C:\SecurityAudit\audit-policy.csv

# ============================================
# PowerShell Logging (Critical for forensics)
# ============================================

# Enable Script Block Logging
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" `
    -Name "EnableScriptBlockLogging" -Value 1

# Enable Module Logging
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging" `
    -Name "EnableModuleLogging" -Value 1
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging\ModuleNames" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging\ModuleNames" `
    -Name "*" -Value "*"

# Enable Transcription Logging
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription" `
    -Name "EnableTranscripting" -Value 1
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription" `
    -Name "OutputDirectory" -Value "C:\PSLogs"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription" `
    -Name "EnableInvocationHeader" -Value 1

# Configure Windows Event Forwarding (WEF) for centralized logging
wecutil qc /q
```

## Windows Defender Configuration

```powershell
# ============================================
# Real-time Protection
# ============================================
Set-MpPreference -DisableRealtimeMonitoring $false
Set-MpPreference -DisableBehaviorMonitoring $false
Set-MpPreference -DisableIOAVProtection $false
Set-MpPreference -DisableScriptScanning $false

# ============================================
# Cloud Protection
# ============================================
Set-MpPreference -MAPSReporting Advanced
Set-MpPreference -SubmitSamplesConsent SendAllSamples
Set-MpPreference -CloudBlockLevel High
Set-MpPreference -CloudExtendedTimeout 50

# ============================================
# Scan Configuration
# ============================================
Set-MpPreference -ScanScheduleDay Everyday
Set-MpPreference -ScanScheduleTime 02:00:00
Set-MpPreference -ScanParameters FullScan

# Quick scan daily, full scan weekly
Set-MpPreference -ScanScheduleQuickScanTime 12:00:00

# Scan removable drives
Set-MpPreference -DisableRemovableDriveScanning $false

# Scan network files
Set-MpPreference -DisableScanningNetworkFiles $false

# ============================================
# Attack Surface Reduction (ASR) Rules
# ============================================

# Block executable content from email and webmail
Add-MpPreference -AttackSurfaceReductionRules_Ids BE9BA2D9-53EA-4CDC-84E5-9B1EEEE46550 `
    -AttackSurfaceReductionRules_Actions Enabled

# Block Office applications from creating child processes
Add-MpPreference -AttackSurfaceReductionRules_Ids D4F940AB-401B-4EFC-AADC-AD5F3C50688A `
    -AttackSurfaceReductionRules_Actions Enabled

# Block credential stealing from LSASS
Add-MpPreference -AttackSurfaceReductionRules_Ids 9E6C4E1F-7D60-472F-BA1A-A39EF669E4B2 `
    -AttackSurfaceReductionRules_Actions Enabled

# Block process creations from PSExec and WMI commands
Add-MpPreference -AttackSurfaceReductionRules_Ids D1E49AAC-8F56-4280-B9BA-993A6D77406C `
    -AttackSurfaceReductionRules_Actions Enabled

# Block JavaScript and VBScript from launching downloaded content
Add-MpPreference -AttackSurfaceReductionRules_Ids D3E037E1-3EB8-44C8-A917-57927947596D `
    -AttackSurfaceReductionRules_Actions Enabled

# Block Office macros from calling Win32 API
Add-MpPreference -AttackSurfaceReductionRules_Ids 92E97FA1-2EDF-4476-BDD6-9DD0B4DDDC7B `
    -AttackSurfaceReductionRules_Actions Enabled

# View ASR rule status
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Ids
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Actions

# ============================================
# Exclusions (minimize these)
# ============================================
# Only add exclusions when absolutely necessary and document the reason
Add-MpPreference -ExclusionPath "C:\AppData\SpecificApp" # Reason: false positive on app binary

# Review current exclusions
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
Get-MpPreference | Select-Object -ExpandProperty ExclusionExtension

# Update definitions manually
Update-MpSignature
```


## Contents

- [BitLocker Drive Encryption](references/details.md)
- [Credential Guard](references/details.md)
- [AppLocker Configuration](references/details.md)
- [Security Audit Script](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Hardening new Windows Server deployments
- Implementing CIS benchmarks or Microsoft security baselines
- Preparing for compliance audits (SOC2, PCI-DSS, HIPAA)
- Configuring security features after a security incident
- Setting up Windows Defender and advanced threat protection
- Establishing Group Policy security standards for a domain

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
