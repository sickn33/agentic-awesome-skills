# Details (moved from SKILL.md)

> Extended reference content for `windows-hardening`, kept under `references/` so the entrypoint stays within the audit budget.

## BitLocker Drive Encryption

```powershell
# ============================================
# Enable BitLocker on OS drive with TPM
# ============================================

# Check TPM status
Get-Tpm

# Enable BitLocker with TPM protector
Enable-BitLocker -MountPoint "C:" -TpmProtector -EncryptionMethod XtsAes256

# Add recovery password protector
Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector

# Backup recovery key to Active Directory
Backup-BitLockerKeyProtector -MountPoint "C:" -KeyProtectorId (
    (Get-BitLockerVolume -MountPoint "C:").KeyProtector |
    Where-Object { $_.KeyProtectorType -eq "RecoveryPassword" }
).KeyProtectorId

# Enable BitLocker on data drives
Enable-BitLocker -MountPoint "D:" -RecoveryPasswordProtector -EncryptionMethod XtsAes256 -Password (
    Read-Host -AsSecureString "Enter BitLocker password for D:"
)

# Check BitLocker status
Get-BitLockerVolume | Format-Table MountPoint, VolumeStatus, EncryptionMethod, ProtectionStatus

# Configure BitLocker via Group Policy
# Computer Configuration > Administrative Templates > Windows Components > BitLocker Drive Encryption
# - Require additional authentication at startup: Enabled (Allow BitLocker without a compatible TPM: unchecked)
# - Choose drive encryption method: XTS-AES 256-bit
```


## Credential Guard

```powershell
# ============================================
# Enable Windows Credential Guard
# ============================================

# Check hardware compatibility
# Requires: UEFI, Secure Boot, TPM 2.0, VBS-compatible CPU
systeminfo | findstr /i "Hyper-V"

# Enable via registry
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" `
    -Name "EnableVirtualizationBasedSecurity" -Value 1
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" `
    -Name "RequirePlatformSecurityFeatures" -Value 3  # 3 = Secure Boot + DMA Protection
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" `
    -Name "LsaCfgFlags" -Value 1  # 1 = Enabled with UEFI lock

# Verify Credential Guard status
Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
    Select-Object SecurityServicesRunning, VirtualizationBasedSecurityStatus
```


## AppLocker Configuration

```powershell
# ============================================
# Configure AppLocker for application whitelisting
# ============================================

# Generate default rules
# Computer Configuration > Policies > Windows Settings > Security Settings > Application Control Policies > AppLocker

# Create default executable rules via PowerShell
$ruleCollection = @"
<AppLockerPolicy Version="1">
  <RuleCollection Type="Exe" EnforcementMode="AuditOnly">
    <FilePathRule Id="921cc481-6e17-4653-8f75-050b80acca20" Name="Allow Program Files" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
      <Conditions>
        <FilePathCondition Path="%PROGRAMFILES%\*"/>
      </Conditions>
    </FilePathRule>
    <FilePathRule Id="a61c8b2c-a319-4cd0-9690-d2177cad7b51" Name="Allow Windows" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
      <Conditions>
        <FilePathCondition Path="%WINDIR%\*"/>
      </Conditions>
    </FilePathRule>
    <FilePublisherRule Id="b7af7102-efde-4369-8a89-7a6a392d1473" Name="Allow signed by Microsoft" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
      <Conditions>
        <FilePublisherCondition PublisherName="O=MICROSOFT CORPORATION*" ProductName="*" BinaryName="*">
          <BinaryVersionRange LowSection="*" HighSection="*"/>
        </FilePublisherCondition>
      </Conditions>
    </FilePublisherRule>
  </RuleCollection>
</AppLockerPolicy>
"@

# Start AppLocker service
Set-Service -Name AppIDSvc -StartupType Automatic
Start-Service AppIDSvc

# Set to Audit mode first, then switch to Enforce after tuning
# Review logs: Event Viewer > Applications and Services Logs > Microsoft > Windows > AppLocker
```


## Security Audit Script

```powershell
# windows-security-audit.ps1 - Comprehensive security audit

Write-Host "=== Windows Security Audit Report ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC' -AsUTC)"
Write-Host "Host: $env:COMPUTERNAME"
Write-Host ""

# OS Info
Write-Host "--- OS Information ---" -ForegroundColor Yellow
Get-CimInstance Win32_OperatingSystem | Format-Table Caption, Version, BuildNumber, OSArchitecture

# Firewall status
Write-Host "--- Firewall Status ---" -ForegroundColor Yellow
Get-NetFirewallProfile | Format-Table Name, Enabled, DefaultInboundAction, DefaultOutboundAction

# SMBv1 status
Write-Host "--- SMB Status ---" -ForegroundColor Yellow
$smb1 = Get-SmbServerConfiguration | Select-Object EnableSMB1Protocol
if ($smb1.EnableSMB1Protocol) { Write-Host "WARNING: SMBv1 is ENABLED" -ForegroundColor Red }
else { Write-Host "OK: SMBv1 is disabled" -ForegroundColor Green }

# Windows Defender status
Write-Host "--- Windows Defender ---" -ForegroundColor Yellow
Get-MpComputerStatus | Format-Table AMServiceEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated

# BitLocker status
Write-Host "--- BitLocker ---" -ForegroundColor Yellow
Get-BitLockerVolume | Format-Table MountPoint, ProtectionStatus, EncryptionMethod

# Open ports
Write-Host "--- Listening Ports ---" -ForegroundColor Yellow
Get-NetTCPConnection -State Listen | Sort-Object LocalPort |
    Format-Table LocalAddress, LocalPort, OwningProcess,
    @{N="Process";E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name}}

# Local administrators
Write-Host "--- Local Administrators ---" -ForegroundColor Yellow
Get-LocalGroupMember -Group "Administrators" | Format-Table Name, ObjectClass, PrincipalSource

# Pending updates
Write-Host "--- Windows Update ---" -ForegroundColor Yellow
$updateSession = New-Object -ComObject Microsoft.Update.Session
$updateSearcher = $updateSession.CreateUpdateSearcher()
$pendingUpdates = $updateSearcher.Search("IsInstalled=0")
Write-Host "Pending updates: $($pendingUpdates.Updates.Count)"

# Audit policy
Write-Host "--- Audit Policy ---" -ForegroundColor Yellow
auditpol /get /category:* | Select-String "Success|Failure|No Auditing"

Write-Host "`n=== Audit Complete ===" -ForegroundColor Cyan
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| GPO not applying | GPO not linked or filtered | Run `gpresult /r`; check OU linking and security filtering |
| BitLocker fails to enable | TPM not present or enabled | Check BIOS/UEFI for TPM; run `manage-bde -status` |
| AppLocker blocks legitimate apps | Rules too restrictive | Start in Audit mode; review AppLocker event logs; add exceptions |
| Credential Guard breaks apps | Legacy auth protocols blocked | Identify apps using NTLM/CredSSP; migrate to Kerberos/modern auth |
| SMBv1 removal breaks legacy devices | Old devices require SMBv1 | Isolate legacy devices; plan migration; document risk acceptance |
| Windows Defender exclusions too broad | Performance tuning added wide paths | Review and narrow exclusions; document business justification |
| Audit logs filling disk | Too many audit events | Increase log size; configure log forwarding to SIEM; tune audit categories |
| Firewall rules not persisting | Rules created without -PolicyStore | Use `-PolicyStore PersistentStore`; verify with `Get-NetFirewallRule` |


## Best Practices

- Apply Microsoft security baselines as a starting point
- Disable SMBv1 on all systems (no exceptions without documented risk acceptance)
- Enable Credential Guard on all compatible hardware
- Configure AppLocker in audit mode first, then enforce after tuning
- Enable all recommended audit subcategories and forward to SIEM
- Enable PowerShell script block and module logging on all servers
- Implement LAPS for local administrator password management
- Enable BitLocker on all drives with TPM and recovery key backup
- Apply Attack Surface Reduction rules in Windows Defender
- Perform monthly security audits with the audit script
- Keep Windows fully patched with automated update management
- Disable unnecessary services and features to reduce attack surface
- Use Windows Firewall with explicit allow rules per application


## Related Skills

- cis-benchmarks (`cis-benchmarks`) - Compliance scanning
- windows-server (`windows-server`) - Server administration
- linux-hardening (`linux-hardening`) - Linux security hardening

