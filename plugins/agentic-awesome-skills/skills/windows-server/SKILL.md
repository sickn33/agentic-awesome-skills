---
name: windows-server
description: Administer Windows Server systems. Manage IIS, Active Directory, and
  PowerShell automation. Use when administering Windows infrastructure.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Windows Server Administration

Windows Server management and PowerShell automation for production workloads including IIS web hosting, Active Directory domain services, and system maintenance.

## When to Use

- Provisioning or configuring Windows Server 2019/2022 instances
- Setting up IIS websites, application pools, and bindings
- Managing Active Directory users, groups, and Group Policy
- Automating administrative tasks with PowerShell
- Reviewing Windows Event Logs for troubleshooting
- Applying and managing Windows Updates on servers

## Prerequisites

- Administrator account on the target server
- PowerShell 5.1+ (built-in) or PowerShell 7+ installed
- Remote Desktop or WinRM access configured
- Windows Server 2019 or 2022 (Desktop Experience or Server Core)

## PowerShell Administration Essentials

```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Get system information
Get-ComputerInfo | Select-Object CsName, OsName, OsVersion, OsArchitecture

# List running processes sorted by CPU
Get-Process | Sort-Object CPU -Descending | Select-Object -First 20

# List all services and their status
Get-Service | Where-Object { $_.Status -eq 'Running' }

# Restart a service
Restart-Service -Name W3SVC -Force

# Get disk space on all drives
Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='Used(GB)';E={[math]::Round($_.Used/1GB,2)}}, @{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}}

# Check uptime
(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime

# Open firewall port
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# List firewall rules
Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' } | Select-Object DisplayName, Action

# Set DNS client server addresses
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("10.0.0.2","10.0.0.3")

# PowerShell remoting to another server
Enter-PSSession -ComputerName server02 -Credential (Get-Credential)

# Run a command on multiple remote servers
Invoke-Command -ComputerName server01,server02,server03 -ScriptBlock { Get-Service W3SVC }
```

## Server Roles and Features

```powershell
# List all available roles and features
Get-WindowsFeature

# Install IIS with management tools
Install-WindowsFeature -Name Web-Server -IncludeManagementTools -IncludeAllSubFeature

# Install Active Directory Domain Services
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# Install DNS Server
Install-WindowsFeature -Name DNS -IncludeManagementTools

# Install DHCP Server
Install-WindowsFeature -Name DHCP -IncludeManagementTools

# Install File Server with deduplication
Install-WindowsFeature -Name FS-FileServer, FS-Data-Deduplication

# List installed features only
Get-WindowsFeature | Where-Object Installed | Select-Object Name, InstallState

# Remove a feature
Uninstall-WindowsFeature -Name Telnet-Client
```

## IIS Web Server Setup

```powershell
# Import the IIS administration module
Import-Module WebAdministration

# Create a new application pool
New-WebAppPool -Name "ProductionPool"
Set-ItemProperty IIS:\AppPools\ProductionPool -Name processModel.identityType -Value 3  # NetworkService
Set-ItemProperty IIS:\AppPools\ProductionPool -Name managedRuntimeVersion -Value ""     # No managed code (reverse proxy)

# Create a new website
New-Website -Name "MyApp" `
  -Port 443 `
  -Protocol https `
  -PhysicalPath "C:\inetpub\myapp" `
  -ApplicationPool "ProductionPool" `
  -SslFlags 1

# Add an HTTP binding that redirects to HTTPS
New-WebBinding -Name "MyApp" -Protocol http -Port 80

# Bind an SSL certificate to the HTTPS site
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*example.com*" }
New-Item IIS:\SslBindings\0.0.0.0!443 -Value $cert

# Create a virtual directory
New-WebVirtualDirectory -Site "MyApp" -Name "static" -PhysicalPath "C:\inetpub\static"

# Start, stop, and restart a site
Start-Website -Name "MyApp"
Stop-Website  -Name "MyApp"
Restart-WebAppPool -Name "ProductionPool"

# List all websites and their state
Get-Website | Select-Object Name, State, PhysicalPath, @{N='Bindings';E={$_.Bindings.Collection.bindingInformation}}

# Enable IIS logging with W3C format
Set-WebConfigurationProperty -PSPath "IIS:\Sites\MyApp" `
  -Filter "system.webServer/httpLogging" `
  -Name "dontLog" -Value $false

# URL Rewrite: redirect HTTP to HTTPS (requires URL Rewrite module)
# web.config rule:
@'
<rule name="HTTP to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
'@
```

## Active Directory Basics

```powershell
# Promote server to a new domain controller in a new forest
Install-ADDSForest `
  -DomainName "corp.example.com" `
  -DomainNetBIOSName "CORP" `
  -InstallDns:$true `
  -SafeModeAdministratorPassword (ConvertTo-SecureString "P@ssw0rd!" -AsPlainText -Force) `
  -Force:$true

# Create an Organizational Unit
New-ADOrganizationalUnit -Name "Engineering" -Path "DC=corp,DC=example,DC=com"

# Create a new AD user
New-ADUser -Name "Jane Smith" `
  -SamAccountName "jsmith" `
  -UserPrincipalName "jsmith@corp.example.com" `
  -Path "OU=Engineering,DC=corp,DC=example,DC=com" `
  -AccountPassword (ConvertTo-SecureString "TempP@ss1" -AsPlainText -Force) `
  -Enabled $true `
  -ChangePasswordAtLogon $true

# Add user to a group
Add-ADGroupMember -Identity "Domain Admins" -Members "jsmith"

# Search for users in an OU
Get-ADUser -Filter * -SearchBase "OU=Engineering,DC=corp,DC=example,DC=com" | Select-Object Name, SamAccountName, Enabled

# Disable a user account
Disable-ADAccount -Identity "jsmith"

# Unlock a locked-out account
Unlock-ADAccount -Identity "jsmith"

# Reset a user password
Set-ADAccountPassword -Identity "jsmith" -Reset -NewPassword (ConvertTo-SecureString "NewP@ss1" -AsPlainText -Force)

# List all domain controllers
Get-ADDomainController -Filter * | Select-Object Name, IPv4Address, Site

# Check AD replication status
Get-ADReplicationPartnerMetadata -Target "dc01.corp.example.com"
repadmin /replsummary
```

## Windows Update Management

```powershell
# Install the PSWindowsUpdate module (from PowerShell Gallery)
Install-Module -Name PSWindowsUpdate -Force

# Check for available updates
Get-WindowsUpdate

# Install all available updates (auto-reboot if needed)
Install-WindowsUpdate -AcceptAll -AutoReboot

# Install only critical and security updates
Install-WindowsUpdate -Category "Security Updates","Critical Updates" -AcceptAll

# View update history
Get-WUHistory | Select-Object -First 20 Title, Date, Result

# Schedule monthly patching via Task Scheduler
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -Command Install-WindowsUpdate -AcceptAll -AutoReboot"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "MonthlyPatching" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest

# WSUS configuration via Group Policy (registry keys)
# HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate
# WUServer = http://wsus.corp.example.com:8530
# WUStatusServer = http://wsus.corp.example.com:8530
```

## Event Log Analysis

```powershell
# View the 50 most recent System log errors
Get-EventLog -LogName System -EntryType Error -Newest 50

# Search for specific event IDs (e.g., unexpected shutdowns = 6008)
Get-EventLog -LogName System -InstanceId 6008

# Use Get-WinEvent for advanced filtering (newer cmdlet)
Get-WinEvent -FilterHashtable @{
    LogName   = 'Application'
    Level     = 2   # Error
    StartTime = (Get-Date).AddDays(-1)
} | Select-Object TimeCreated, Id, Message -First 20

# Search Security log for failed logons (Event ID 4625)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id      = 4625
} | Select-Object TimeCreated, @{N='Account';E={$_.Properties[5].Value}}, @{N='Source';E={$_.Properties[19].Value}} -First 30

# Export events to CSV for analysis
Get-WinEvent -FilterHashtable @{ LogName='System'; Level=1,2 } |
  Export-Csv -Path C:\Logs\system-errors.csv -NoTypeInformation

# Clear old event log entries (use cautiously)
Clear-EventLog -LogName Application

# Set maximum log size
Limit-EventLog -LogName Application -MaximumSize 512MB -OverflowAction OverwriteAsNeeded
```

## Scheduled Tasks

```powershell
# Create a scheduled task to run a script daily at 3 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -File C:\Scripts\daily-maintenance.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "DailyMaintenance" -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM"

# List all scheduled tasks
Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' } | Select-Object TaskName, State, TaskPath

# Run a task immediately
Start-ScheduledTask -TaskName "DailyMaintenance"

# Disable and remove a task
Disable-ScheduledTask -TaskName "DailyMaintenance"
Unregister-ScheduledTask -TaskName "DailyMaintenance" -Confirm:$false
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| IIS site returns 503 | `Get-WebAppPoolState` | Restart the application pool; check Event Log for crash |
| High CPU on server | `Get-Process \| Sort CPU -Desc` | Identify process; check for runaway w3wp or service |
| Disk running low | `Get-PSDrive -PSProvider FileSystem` | Clear temp files, IIS logs, Windows Update cache |
| AD account locked out | `Search-ADAccount -LockedOut` | `Unlock-ADAccount`; find lockout source in Security log |
| Windows Update fails | `Get-WindowsUpdate -Verbose` | Run `sfc /scannow`, reset update components |
| Service fails to start | `Get-EventLog -LogName System -Newest 20` | Check dependencies, credentials, and port conflicts |
| RDP connection refused | `Get-ItemProperty 'HKLM:\System\...\Terminal Server'` | Ensure RDP is enabled and firewall allows port 3389 |
| DNS resolution fails | `Resolve-DnsName example.com` | Check DNS server settings and forwarder config |

## Related Skills

- `linux-administration` -- Cross-platform comparison and hybrid management
- `ssh-configuration` -- SSH access for Windows OpenSSH Server
- `user-management` -- Parallel concepts for Linux user/group management
- `systemd-services` -- Linux equivalent of Windows Services and Task Scheduler
- `performance-tuning` -- Performance monitoring and optimization patterns

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

