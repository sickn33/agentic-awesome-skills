# Details (moved from SKILL.md)

> Extended reference content for `mdm-device-management`, kept under `references/` so the entrypoint stays within the audit budget.

## 6. Security Policies — Cross-Platform

### 6.1 Password / passcode requirements

```xml
<!-- macOS configuration profile — password policy -->
<dict>
    <key>PayloadType</key>
    <string>com.apple.mobiledevice.passwordpolicy</string>
    <key>minLength</key>
    <integer>12</integer>
    <key>requireAlphanumeric</key>
    <true/>
    <key>maxInactivity</key>
    <integer>5</integer>
    <key>maxPINAgeInDays</key>
    <integer>90</integer>
</dict>
```

```json
// Intune Windows password policy (JSON for Graph API)
{
  "@odata.type": "#microsoft.graph.windows10GeneralConfiguration",
  "passwordRequired": true,
  "passwordMinimumLength": 12,
  "passwordRequiredType": "alphanumeric",
  "passwordMinutesOfInactivityBeforeScreenTimeout": 5,
  "passwordExpirationDays": 90,
  "passwordBlockSimple": true
}
```

### 6.2 Screen lock enforcement

```bash
# macOS — require password after sleep/screensaver (via script or profile)
sudo defaults write /Library/Preferences/com.apple.screensaver askForPassword -int 1
sudo defaults write /Library/Preferences/com.apple.screensaver askForPasswordDelay -int 0
sudo defaults write /Library/Preferences/com.apple.screensaver idleTime -int 300
```

```powershell
# Windows — lock screen after 5 minutes of inactivity
powercfg /change monitor-timeout-ac 5
# Registry-based enforcement
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
  -Name "InactivityTimeoutSecs" -Value 300
```

### 6.3 Encryption enforcement summary

| OS | Tool | Verify Command |
|----|------|----------------|
| macOS | FileVault | `fdesetup status` |
| Windows | BitLocker | `manage-bde -status C:` |
| Linux | LUKS | `lsblk -o NAME,FSTYPE,MOUNTPOINT \| grep crypt` |
| iOS | Native (always-on with passcode) | Managed via MDM profile |
| Android | Native | `adb shell getprop ro.crypto.state` |

---


## 7. Software Deployment

### 7.1 macOS — Homebrew Bundle

```ruby
# Brewfile — deploy via MDM script or Git checkout
tap "homebrew/bundle"

# Core tools
brew "git"
brew "gh"
brew "jq"
brew "wget"
brew "gnupg"

# Security
brew "1password-cli"
cask "1password"
cask "tailscale"
cask "cloudflare-warp"

# Development
cask "visual-studio-code"
cask "iterm2"
cask "docker"
brew "node"
brew "python@3.12"

# Communication
cask "slack"
cask "zoom"
```

```bash
# Deploy Brewfile on a new Mac
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle --file=/path/to/Brewfile --no-lock
```

### 7.2 Windows — winget / Chocolatey

```powershell
# winget import from a JSON manifest
# packages.json
@"
{
  "Sources": [{
    "Packages": [
      { "PackageIdentifier": "Git.Git" },
      { "PackageIdentifier": "Microsoft.VisualStudioCode" },
      { "PackageIdentifier": "Docker.DockerDesktop" },
      { "PackageIdentifier": "SlackTechnologies.Slack" },
      { "PackageIdentifier": "Zoom.Zoom" },
      { "PackageIdentifier": "Tailscale.Tailscale" },
      { "PackageIdentifier": "AgileBits.1Password" },
      { "PackageIdentifier": "OpenJS.NodeJS.LTS" },
      { "PackageIdentifier": "Python.Python.3.12" }
    ],
    "SourceDetails": {
      "Name": "winget",
      "Type": "Microsoft.Winget.Source.Type.Microsoft"
    }
  }]
}
"@ | Out-File -FilePath packages.json -Encoding utf8

winget import -i packages.json --accept-package-agreements --accept-source-agreements
```

### 7.3 Automatic update enforcement

```bash
# macOS — enable automatic updates via MDM or command
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticDownload -bool true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticallyInstallMacOSUpdates -bool true
sudo softwareupdate --schedule on
```

```powershell
# Windows — configure Windows Update via registry
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" `
  -Name "NoAutoUpdate" -Value 0
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" `
  -Name "AUOptions" -Value 4  # 4 = Auto download and schedule install
```

---


## 8. Compliance Checks with osquery

These queries work with Fleet, osquery standalone, or any osquery-compatible
platform.

```sql
-- Check disk encryption on macOS
SELECT de.encrypted, de.type, du.username
FROM disk_encryption de
JOIN disk_util du ON de.name = du.name
WHERE du.mountpoint = '/' AND de.encrypted = 1;

-- Check disk encryption on Windows
SELECT drive_letter, protection_status, conversion_status
FROM bitlocker_info
WHERE drive_letter = 'C:' AND protection_status = 1;

-- Verify firewall is enabled (macOS)
SELECT global_state, stealth_enabled, logging_enabled
FROM alf;

-- Verify firewall is enabled (Windows)
SELECT name, enabled FROM windows_firewall_profiles
WHERE enabled = 1;

-- Check OS version (macOS)
SELECT name, version, major, minor, patch
FROM os_version
WHERE major >= 14;

-- Check OS version (Windows)
SELECT name, version, build
FROM os_version
WHERE build >= '22631';

-- List users with admin privileges (macOS)
SELECT u.username, u.uid
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid
WHERE g.groupname = 'admin';

-- Detect unencrypted removable drives (Windows)
SELECT device_id, drive_letter, protection_status
FROM bitlocker_info
WHERE protection_status = 0;

-- Check screen lock timeout (macOS)
SELECT domain, key, value FROM preferences
WHERE domain = 'com.apple.screensaver'
  AND key = 'idleTime';

-- Verify automatic updates are enabled (macOS)
SELECT domain, key, value FROM preferences
WHERE domain = 'com.apple.SoftwareUpdate'
  AND key = 'AutomaticCheckEnabled';
```

---


## 9. Remote Wipe & Lock

### 9.1 macOS remote wipe (Fleet)

```bash
# Lock a device immediately with a 6-digit PIN
fleetctl mdm lock --host "serial=C02X12345678"

# Wipe a device (factory reset) — DESTRUCTIVE
fleetctl mdm erase --host "serial=C02X12345678"

# Or via the Fleet API
curl -X POST https://fleet.yourcompany.com/api/v1/fleet/hosts/42/wipe \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}"
```

### 9.2 Windows remote wipe (Intune)

```powershell
# Via Microsoft Graph API
$body = @{
    keepEnrollmentData = $false
    keepUserData       = $false
} | ConvertTo-Json

Invoke-MgGraphRequest -Method POST `
  -Uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/wipe" `
  -Body $body -ContentType "application/json"
```

### 9.3 Lost device runbook

```text
1. Employee reports device lost/stolen via Slack #it-help or PagerDuty.
2. IT admin verifies identity (video call or manager confirmation).
3. Immediately issue remote lock command (wipe only if data-sensitive).
4. Rotate any credentials cached on the device:
   - Revoke SSO sessions (Okta/Google Workspace admin console)
   - Rotate API keys stored on the device
   - Revoke VPN certificates
5. File a police report if theft is suspected.
6. Remove device from MDM after 30 days or once replacement is shipped.
7. Update asset inventory and notify finance for insurance claim.
```

---


## 10. Onboarding Automation — Zero-Touch Enrollment

### 10.1 macOS zero-touch flow

```bash
#!/usr/bin/env bash
# onboard-mac.sh — runs as a post-enrollment script via MDM
set -euo pipefail

LOG="/var/log/onboarding.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== Starting onboarding $(date) ==="

# 1. Install Rosetta 2 on Apple Silicon
if [[ "$(uname -m)" == "arm64" ]]; then
    softwareupdate --install-rosetta --agree-to-license
fi

# 2. Install Homebrew
if ! command -v brew &>/dev/null; then
    NONINTERACTIVE=1 /bin/bash -c \
      "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 3. Install standard tooling from Brewfile
curl -fsSL https://internal.yourcompany.com/brewfile -o /tmp/Brewfile
brew bundle --file=/tmp/Brewfile --no-lock

# 4. Configure Git defaults
git config --global init.defaultBranch main
git config --global pull.rebase true

# 5. Enable FileVault (will prompt at next login)
sudo fdesetup enable -defer /var/db/FileVaultDeferred.plist \
  -forceatlogin 0 -dontaskatlogout

# 6. Enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# 7. Set screen lock
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0
defaults write com.apple.screensaver idleTime -int 300

# 8. Enroll in Tailscale VPN
open -a "Tailscale"

echo "=== Onboarding complete $(date) ==="
```

### 10.2 Windows zero-touch flow (Autopilot + Intune)

```powershell
# deploy.ps1 — assigned as an Intune PowerShell script
$ErrorActionPreference = "Stop"
$logFile = "C:\ProgramData\onboarding.log"
Start-Transcript -Path $logFile -Append

Write-Host "=== Starting onboarding $(Get-Date) ==="

# 1. Install winget packages
$packages = @(
    "Git.Git",
    "Microsoft.VisualStudioCode",
    "Docker.DockerDesktop",
    "SlackTechnologies.Slack",
    "Tailscale.Tailscale",
    "AgileBits.1Password"
)

foreach ($pkg in $packages) {
    Write-Host "Installing $pkg..."
    winget install --id $pkg --accept-package-agreements --accept-source-agreements --silent
}

# 2. Enable BitLocker
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -TpmProtector
Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector

# 3. Configure firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
Set-NetFirewallProfile -Profile Domain,Public,Private `
  -DefaultInboundAction Block -DefaultOutboundAction Allow

# 4. Set power and lock settings
powercfg /change monitor-timeout-ac 5
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
  -Name "InactivityTimeoutSecs" -Value 300

# 5. Enable automatic updates
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" `
  -Name "AUOptions" -Value 4

Write-Host "=== Onboarding complete $(Get-Date) ==="
Stop-Transcript
```

### 10.3 Onboarding checklist (for IT automation)

```yaml
# onboarding-checklist.yml — track in your ticketing system or Fleet
new_hire_onboarding:
  pre_day_one:
    - Purchase and ship device via CDW/Apple Business Manager
    - Assign device to MDM server in ABM/Autopilot
    - Create accounts: Google Workspace / M365, Okta SSO, GitHub, Slack
    - Generate VPN invite (Tailscale, WireGuard)
    - Prepare welcome documentation link

  day_one_automated:
    - Device powers on and auto-enrolls in MDM (zero-touch)
    - MDM pushes security profiles (encryption, firewall, password policy)
    - Software bundle installs automatically
    - User signs into SSO — all apps authenticate via SAML/OIDC
    - Compliance policies begin evaluation

  day_one_manual:
    - IT schedules 15-min welcome call to verify setup
    - Employee confirms disk encryption enabled (fdesetup status / manage-bde)
    - Employee joins #it-help Slack channel
    - Employee completes security awareness training link

  week_one_verification:
    - Fleet/MDM dashboard shows device as compliant
    - All critical policies passing (encryption, firewall, OS version)
    - VPN connectivity verified
    - MFA enrolled on all critical services
```

---


## Quick Reference

| Task | macOS Command | Windows Command |
|------|---------------|-----------------|
| Check encryption | `fdesetup status` | `manage-bde -status C:` |
| Enable firewall | `socketfilterfw --setglobalstate on` | `Set-NetFirewallProfile -Enabled True` |
| Force OS update | `softwareupdate -ia` | `usoclient StartInstallD` |
| Lock screen now | `pmset displaysleepnow` | `rundll32.exe user32.dll,LockWorkStation` |
| List MDM profiles | `profiles show -type enrollment` | `dsregcmd /status` |
| Check compliance | `fleetctl get hosts --query "..."` | `fleetctl get hosts --query "..."` |

