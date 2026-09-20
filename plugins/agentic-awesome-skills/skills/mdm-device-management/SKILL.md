---
name: mdm-device-management
description: Manage and secure company devices with MDM solutions
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

## When to Use

- Provisioning, hardening, or operating the infrastructure described in this skill within an authorized environment.


# Mobile Device Management (MDM) for Startups & Small Teams

A practical guide to enrolling, securing, and managing company devices across
macOS, Windows, iOS, and Android — from zero-touch onboarding to remote wipe.

---

## 1. When to Use MDM

MDM becomes essential when any of the following apply:

- **Team size crosses ~10 people** — manual laptop setup no longer scales.
- **Compliance requirements** — SOC 2, HIPAA, ISO 27001, or customer security
  questionnaires demand proof that endpoints are encrypted and patched.
- **Remote / hybrid workforce** — you cannot walk over to someone's desk to
  fix a configuration or verify disk encryption.
- **Contractor or BYOD devices** — you need a way to separate corporate data
  from personal data and revoke access on offboarding.
- **Insurance or investor due diligence** — cyber-insurance carriers and VCs
  increasingly ask for evidence of endpoint management.

If you are still under 10 people and everyone is in-office, a simple checklist
plus a configuration management tool (Ansible) may suffice — but plan for MDM
early so enrollment is painless when you scale.

---

## 2. MDM Platform Comparison

| Platform | Best For | Pricing Model | Open Source | Key Strength |
|----------|----------|---------------|-------------|--------------|
| **Jamf Pro** | macOS / iOS fleets | Per-device/yr | No | Deepest Apple integration, DEP/ADE native |
| **Microsoft Intune** | Windows + M365 shops | Bundled w/ M365 E3/E5 | No | Seamless Azure AD + Autopilot |
| **Kandji** | macOS-first startups | Per-device/yr | No | Pre-built compliance templates, fast setup |
| **Mosyle** | Education & SMB Apple | Per-device/yr | No | Apple School/Business Manager integration |
| **Fleet** | Cross-platform, eng-led | Free (OSS) / paid cloud | Yes | osquery-powered, GitOps-friendly, API-first |
| **SimpleMDM** | Small Apple-only teams | Per-device/mo | No | Simple UI, quick onboarding |

### Decision heuristic

```text
if (team < 50 AND engineering-led AND multi-OS):
    consider Fleet (open-source, osquery-native)
elif (team is macOS-dominant AND compliance-heavy):
    consider Kandji or Jamf
elif (team is Windows-dominant AND already on M365):
    consider Intune (likely already licensed)
else:
    evaluate Fleet or Kandji based on OS mix
```

---

## 3. Fleet (Open Source MDM) — Self-Hosted Deployment

Fleet is the leading open-source MDM. It uses osquery under the hood and
supports macOS, Windows, Linux, iOS, and Android.

### 3.1 Docker Compose deployment

```yaml
# docker-compose.yml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "${FLEET_MYSQL_ROOT_PASSWORD}"
      MYSQL_DATABASE: fleet
      MYSQL_USER: fleet
      MYSQL_PASSWORD: "${FLEET_MYSQL_PASSWORD}"
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  fleet:
    image: fleetdm/fleet:v4.47.0
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      FLEET_MYSQL_ADDRESS: mysql:3306
      FLEET_MYSQL_DATABASE: fleet
      FLEET_MYSQL_USERNAME: fleet
      FLEET_MYSQL_PASSWORD: "${FLEET_MYSQL_PASSWORD}"
      FLEET_REDIS_ADDRESS: redis:6379
      FLEET_SERVER_TLS: "true"
      FLEET_SERVER_TLS_COMPATIBILITY: modern
      FLEET_SERVER_CERT: /tls/fleet.crt
      FLEET_SERVER_KEY: /tls/fleet.key
      FLEET_LOGGING_JSON: "true"
    volumes:
      - ./tls:/tls:ro
    ports:
      - "8080:8080"

volumes:
  mysql-data:
```

### 3.2 Initial setup

```bash
# Generate TLS certs (use real certs in production)
mkdir -p tls
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 \
  -nodes -keyout tls/fleet.key -out tls/fleet.crt \
  -subj "/CN=fleet.yourcompany.com"

# Start services
docker compose up -d

# Create admin account
docker compose exec fleet fleet prepare db
docker compose exec fleet fleet setup \
  --email admin@yourcompany.com \
  --name "IT Admin" \
  --password "${FLEET_ADMIN_PASSWORD}" \
  --org-name "YourCompany"
```

### 3.3 Enroll a macOS host with fleetctl

```bash
# Install fleetctl
brew install fleetdm/tap/fleetctl

# Authenticate
fleetctl config set --address https://fleet.yourcompany.com:8080
fleetctl login --email admin@yourcompany.com

# Generate an installer package for macOS
fleetctl package --type pkg \
  --fleet-url https://fleet.yourcompany.com:8080 \
  --enroll-secret "$(fleetctl get enroll-secret)" \
  --fleet-certificate tls/fleet.crt

# The .pkg file can be distributed via Apple Business Manager or manually
```

### 3.4 Enroll a Windows host

```powershell
# Download the Fleet osquery MSI installer
fleetctl package --type msi `
  --fleet-url https://fleet.yourcompany.com:8080 `
  --enroll-secret "$(fleetctl get enroll-secret)" `
  --fleet-certificate tls/fleet.crt

# Install silently
msiexec /i fleet-osquery.msi /quiet /norestart
```

### 3.5 osquery policy examples in Fleet

```yaml
# fleet-policies.yml — apply with: fleetctl apply -f fleet-policies.yml
apiVersion: v1
kind: policy
spec:
  name: FileVault enabled (macOS)
  query: >
    SELECT 1 FROM disk_encryption
    WHERE user_uuid IS NOT '' AND encrypted = 1;
  description: Ensures FileVault disk encryption is enabled.
  resolution: "Enable FileVault: System Settings > Privacy & Security > FileVault."
  platform: darwin

---
apiVersion: v1
kind: policy
spec:
  name: BitLocker enabled (Windows)
  query: >
    SELECT 1 FROM bitlocker_info
    WHERE protection_status = 1;
  description: Ensures BitLocker drive encryption is active.
  resolution: "Enable BitLocker via Settings > Privacy & Security > Device Encryption."
  platform: windows

---
apiVersion: v1
kind: policy
spec:
  name: Firewall enabled (macOS)
  query: >
    SELECT 1 FROM alf WHERE global_state >= 1;
  description: macOS Application Layer Firewall must be on.
  resolution: "Enable firewall: System Settings > Network > Firewall."
  platform: darwin

---
apiVersion: v1
kind: policy
spec:
  name: OS up to date (macOS)
  query: >
    SELECT 1 FROM os_version
    WHERE platform = 'darwin' AND major >= 14;
  description: Requires macOS 14 (Sonoma) or later.
  resolution: "Update macOS via System Settings > General > Software Update."
  platform: darwin
```

---

## 4. macOS Enrollment

### 4.1 Apple Business Manager (ABM) / Automated Device Enrollment

```bash
# In ABM (business.apple.com):
# 1. Settings > MDM Servers > Add MDM Server
# 2. Upload the public key from your MDM (Fleet, Jamf, Kandji)
# 3. Download the ABM token and upload it to your MDM
# 4. Assign devices to the MDM server by serial number

# Verify DEP assignment with fleetctl (Fleet)
fleetctl get mdm-apple
```

### 4.2 Manual MDM profile enrollment (non-DEP devices)

```bash
# Generate enrollment profile URL (Fleet example)
fleetctl get enrollment-profile > enrollment.mobileconfig

# Distribute to user — they open the .mobileconfig file
# Then approve in System Settings > Profiles
```

### 4.3 Enforce FileVault via MDM configuration profile

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.apple.MCX.FileVault2</string>
            <key>PayloadIdentifier</key>
            <string>com.yourcompany.filevault</string>
            <key>PayloadUUID</key>
            <string>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Enable</key>
            <string>On</string>
            <key>Defer</key>
            <true/>
            <key>DeferForceAtUserLoginMaxBypassAttempts</key>
            <integer>0</integer>
            <key>ShowRecoveryKey</key>
            <false/>
            <key>UseRecoveryKey</key>
            <true/>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>FileVault Enforcement</string>
    <key>PayloadIdentifier</key>
    <string>com.yourcompany.filevault.profile</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>F1E2D3C4-B5A6-7890-FEDC-BA0987654321</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

### 4.4 macOS firewall enforcement

```bash
# Enable firewall via MDM command or script
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setallowsigned enable
```

---

## 5. Windows Enrollment

### 5.1 Azure AD Join + Intune auto-enrollment

```powershell
# Check current join status
dsregcmd /status

# Join Azure AD (user will be prompted for credentials)
Start-Process "ms-settings:workplace"

# Verify Intune enrollment
Get-WmiObject -Namespace "root\cimv2\mdm\dmmap" `
  -Class "MDM_DevDetail_Ext01" | Select DeviceID
```

### 5.2 Windows Autopilot hardware hash collection

```powershell
# Collect hardware hash for Autopilot registration
Install-Script -Name Get-WindowsAutoPilotInfo -Force
Get-WindowsAutoPilotInfo -OutputFile C:\temp\autopilot.csv

# Upload autopilot.csv to Intune > Devices > Windows Enrollment > Devices
```

### 5.3 BitLocker enforcement via Group Policy or Intune

```powershell
# Enable BitLocker on the OS drive with TPM
Enable-BitLocker -MountPoint "C:" `
  -EncryptionMethod XtsAes256 `
  -TpmProtector

# Add a recovery password and back it up to Azure AD
Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector
BackupToAAD-BitLockerKeyProtector -MountPoint "C:" `
  -KeyProtectorId (Get-BitLockerVolume -MountPoint "C:").KeyProtector[1].KeyProtectorId

# Verify encryption status
Get-BitLockerVolume | Select-Object MountPoint, VolumeStatus, EncryptionPercentage
```

### 5.4 Windows Firewall baseline

```powershell
# Ensure all profiles are enabled
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True

# Block all inbound by default, allow outbound
Set-NetFirewallProfile -Profile Domain,Public,Private `
  -DefaultInboundAction Block `
  -DefaultOutboundAction Allow

# Allow specific inbound rules (example: RDP only from VPN subnet)
New-NetFirewallRule -DisplayName "Allow RDP from VPN" `
  -Direction Inbound -Protocol TCP -LocalPort 3389 `
  -RemoteAddress 10.0.0.0/8 -Action Allow
```

---


## Contents

- [6. Security Policies — Cross-Platform](references/details.md)
- [7. Software Deployment](references/details.md)
- [8. Compliance Checks with osquery](references/details.md)
- [9. Remote Wipe & Lock](references/details.md)
- [10. Onboarding Automation — Zero-Touch Enrollment](references/details.md)
- [Quick Reference](references/details.md)

## When to Use

- You are provisioning, configuring, or troubleshooting the infrastructure component covered by this skill (servers, storage, databases, networking, cloud, local AI).

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

