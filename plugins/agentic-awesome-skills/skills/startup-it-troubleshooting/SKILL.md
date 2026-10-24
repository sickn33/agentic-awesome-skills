---
name: startup-it-troubleshooting
description: Practical IT troubleshooting playbooks for small teams without dedicated
  IT staff.
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
  version: '2.0'
---

# Startup IT Troubleshooting

Runbooks for startups and small teams where engineers double as the IT department.

## When to Use

You are the "accidental IT person." Nobody has IT in their title, but laptops freeze, Wi-Fi drops during investor demos, someone gets locked out of Google Workspace at midnight, and a new hire starts Monday with zero accounts. Commands are platform/version-specific examples. Start read-only, preserve current configuration and apply only authorized, reviewed changes to the exact account/device.

**Priority triage:** (1) Company-wide outages, (2) Executive/customer-facing blockers, (3) Team-wide degradations, (4) Individual workstation issues. Always ask: "How many people are affected?" and "Is revenue impacted?"

---

## SSO / Identity Lockouts

### Google Workspace via GAM

```bash
# Obtain GAM from its official project, pin/verify the release and inspect installation instructions before installing.
gam oauth create                                                     # authorize

# Reset through the approved secure admin workflow; never literal or generated passwords in process argv.
gam update user jane@company.com suspended off       # unsuspend locked-out user
gam user jane@company.com signout                    # force sign-out all sessions
gam user jane@company.com update backupcodes         # new MFA backup codes
# Do not disable2SV as routine recovery; use verified recovery/backup methods.
```

### Okta API

```bash
: "${OKTA_DOMAIN:?Set the authorized Okta domain}"
: "${OKTA_API_TOKEN:?Inject admin token securely}"
: "${OKTA_USER_ID:?Verify the exact target user}"
curl -X POST -H "Authorization: SSWS $OKTA_API_TOKEN" "https://$OKTA_DOMAIN/api/v1/users/$OKTA_USER_ID/lifecycle/unlock"
curl -X POST -H "Authorization: SSWS $OKTA_API_TOKEN" "https://$OKTA_DOMAIN/api/v1/users/$OKTA_USER_ID/lifecycle/reset_password?sendEmail=true"
curl -X POST -H "Authorization: SSWS $OKTA_API_TOKEN" "https://$OKTA_DOMAIN/api/v1/users/$OKTA_USER_ID/lifecycle/reset_factors"
curl -X DELETE -H "Authorization: SSWS $OKTA_API_TOKEN" "https://$OKTA_DOMAIN/api/v1/users/$OKTA_USER_ID/sessions"
```

**MFA recovery flow:** Verify identity with the established independent recovery procedure (a video call alone is insufficient), generate backup codes or reset factors, have user re-enroll immediately, confirm old device is deregistered, log the incident.

---

Network resets, DNS overrides and VPN resets can break managed policy or remote access. Record current resolver/interface settings first, choose the actual interface and restore them after diagnostics. Public DNS may not resolve internal zones and may disclose internal queries. Package/update/reboot, encryption, account transfer and printer-queue changes below are separate mutating actions, not an automatic checklist.

## Network Troubleshooting

### Wi-Fi Debugging

```bash
# macOS
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I
networksetup -setairportpower en0 off && sleep 2 && networksetup -setairportpower en0 on
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Linux
nmcli device wifi list && nmcli connection show --active
nmcli device disconnect wlan0 && nmcli device connect wlan0
sudo systemd-resolve --flush-caches
```

```powershell
netsh wlan show interfaces
netsh wlan disconnect; netsh wlan connect name="OfficeWiFi"
ipconfig /flushdns
netsh winsock reset  # full stack reset, reboot after
```

### DNS Issues

```bash
nslookup company.com 8.8.8.8            # test against known-good DNS
dig @1.1.1.1 company.com                # Linux/macOS detail
sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4  # macOS temp override
```

```powershell
$a = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ("8.8.8.8","8.8.4.4")
```

### VPN Not Connecting

```bash
nc -zv vpn.company.com 443                         # test port reachability
sudo wg show                                        # WireGuard status
sudo wg-quick down wg0 && sudo wg-quick up wg0     # restart WireGuard
tailscale status && sudo tailscale up --reset       # Tailscale re-auth
```

### Slow Internet

```bash
speedtest-cli --simple        # bandwidth test (pip install speedtest-cli)
ping -c 50 8.8.8.8            # packet loss check
networkQuality -s              # macOS 12+ bufferbloat test
```

---

## Laptop Performance

### Disk Space

```bash
df -h                                    # volume overview
du -sh ~/* | sort -rh | head -15         # biggest dirs in home
docker system df                         # Docker disk usage (common culprit)
docker system df -v                      # inventory; review exact unused artifacts/volumes before deletion
brew cleanup --prune=all                 # macOS Homebrew cleanup
```

```powershell
Get-PSDrive -PSProvider FileSystem | Select Name,@{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}}
Get-ChildItem C:\ -Recurse -File -EA SilentlyContinue | Sort Length -Desc | Select -First 15 FullName,@{N='MB';E={[math]::Round($_.Length/1MB,2)}}
```

### Memory Pressure and Runaway Processes

```bash
# macOS
memory_pressure
top -o rsize -l 1 -n 10 -stats pid,command,rsize
# Inspect exact processes and save work before quitting; avoid broad pkill patterns.

# Linux
free -h && ps aux --sort=-%mem | head -11
sudo dmesg | grep -i "oom\|out of memory"
```

```powershell
Get-Process | Sort WorkingSet64 -Desc | Select -First 10 Name,@{N='MB';E={[math]::Round($_.WorkingSet64/1MB,2)}}
# Quit the verified application after saving work; force termination is a separate approved recovery.
```

### Battery Health

```bash
system_profiler SPPowerDataType | grep -E "Cycle Count|Condition"  # macOS
upower -i /org/freedesktop/UPower/devices/battery_BAT0             # Linux
```

```powershell
powercfg /batteryreport /output "$env:USERPROFILE\Desktop\battery.html"
```

---

## macOS Administration

```bash
profiles status -type enrollment          # MDM enrollment check
sudo systemsetup -getremotelogin          # inspect; enabling SSH changes remote access

# Homebrew fleet setup — standard Brewfile
cat > Brewfile <<'EOF'
brew "git"; brew "node"; brew "python@3.12"; brew "awscli"; brew "jq"; brew "gh"
cask "google-chrome"; cask "slack"; cask "1password"; cask "visual-studio-code"; cask "docker"; cask "zoom"
EOF
brew bundle install --file=Brewfile
brew bundle dump --file=~/Brewfile --force  # export current setup

# FileVault
sudo fdesetup status && sudo fdesetup enable  # store recovery key in 1Password

# Updates
softwareupdate -l  # schedule installation/restart only after approved downtime
```

---

## Windows Administration

```powershell
gpresult /r; gpupdate /force             # check and refresh Group Policy

# Windows Update
Install-Module PSWindowsUpdate -Force -Scope CurrentUser
Get-WindowsUpdate  # review and schedule approved install/reboot
# If stuck: reset update components
Stop-Service wuauserv,cryptSvc,bits,msiserver -Force
# Follow the supported repair procedure; preserve diagnostics instead of blind recursive deletion.
Start-Service wuauserv,cryptSvc,bits,msiserver

# BitLocker
manage-bde -status C:
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector

# Remote Desktop
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
```

---

## Linux Desktop

```bash
# Ubuntu — fix broken packages
sudo apt --fix-broken install && sudo dpkg --configure -a && sudo apt update && sudo apt upgrade -y

# Fedora — fix broken packages
sudo dnf check && sudo dnf distro-sync && sudo dnf update -y

# Service failures
systemctl --failed
journalctl -p err -b

# Drivers
sudo ubuntu-drivers autoinstall                    # Ubuntu proprietary drivers
lspci | grep -i vga && sudo lshw -C display        # GPU info
sudo dmesg | grep -i firmware                       # missing firmware

# Display issues
xrandr --auto                                       # reset to auto-detect
xrandr --output HDMI-1 --mode 1920x1080 --rate 60  # force resolution
echo $XDG_SESSION_TYPE                              # Wayland vs X11 check
```

---

## Email / Calendar Issues

### Google Workspace

```bash
gam user jane@company.com show forwarding    # check rogue forwarding rules
gam user jane@company.com delete forwarding  # remove forwarding
gam user jane@company.com show delegates     # check email delegation
gam user jane@company.com show filters       # check mail filters
```

### Microsoft 365

```powershell
Install-Module ExchangeOnlineManagement -Force -Scope CurrentUser
Connect-ExchangeOnline -UserPrincipalName admin@company.com
Get-MessageTrace -SenderAddress jane@company.com -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)
Get-MailboxStatistics -Identity jane@company.com | Select DisplayName,TotalItemSize
```

### Email Deliverability

```bash
dig TXT company.com | grep "v=spf1"             # SPF
dig TXT google._domainkey.company.com            # DKIM
dig TXT _dmarc.company.com                       # DMARC
```

---

## Onboarding Checklist

```bash
# Provision only the approved joiner, role, start date and groups through the IdP.
# Use secure credential bootstrap; no shared welcome password or token in CLI flags.
# Send invitations only to the verified corporate identity and approved teams.
# Discover supported GAM/1Password/Slack/Tailscale commands for the installed versions;
# use SSO/secure secret injection instead of literal admin tokens/auth keys.
```

### First-Day Setup Script (macOS)

Give new hires a reviewed, versioned setup procedure. Download installers only from official sources, verify their release identity and inspect them before authorized execution. Inspect the exact hosted Brewfile and package sources before installation. Preserve existing Git settings; configure identity only as requested. Enable FileVault only after recovery-key escrow is verified; never claim escrow succeeded from a comment.

## Offboarding Checklist

Apply the approved offboarding plan at the authorized time, after confirming identity, holds/retention and transfer scope. Suspension, session revocation, data transfer and mailbox delegation are separate actions; do not grant a manager blanket mailbox access automatically.

```bash
gam update user departed@company.com suspended on             # 1. block all access
gam user departed@company.com signout                         # 2. kill sessions
gam user departed@company.com transfer drive manager@company.com  # 3. transfer Drive
gam user departed@company.com add delegate manager@company.com    # 4. delegate email 30d
curl -X POST "https://slack.com/api/admin.users.remove" \
  -H "Authorization: Bearer xoxp-your-admin-token" \
  -d "user_id=U01DEPARTED&team_id=T01YOURTEAM"               # 5. remove Slack
gh api orgs/your-company/members/departed-username -X DELETE   # 6. remove GitHub
op user suspend departed@company.com                           # 7. revoke 1Password
aws iam delete-login-profile --user-name departed              # 8. revoke AWS console
aws iam list-access-keys --user-name departed                  #    then delete each key
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Offboarded departed@company.com" >> ~/offboarding-log.txt
```

---

## Video Conferencing

```bash
# macOS
lsof | grep "AppleCamera\|VDC"          # check what owns the camera
pkill -f zoom.us && open -a zoom.us      # restart Zoom
tccutil reset Camera                     # reset camera permissions

# Linux
pactl list short sources                 # list mics
pactl set-source-mute @DEFAULT_SOURCE@ 0 # unmute mic
```

```powershell
Get-CimInstance Win32_SoundDevice | Select Name, Status
```

**Quick fixes:** No audio = check OS mute + correct device. No video = close other conferencing apps. Echo = use headphones. Choppy = need 3+ Mbps upload.

---

## Printer / Peripheral Issues

```bash
# macOS
lpstat -p -d && cancel -a                                    # list printers, clear queue
sudo launchctl stop org.cups.cupsd && sudo launchctl start org.cups.cupsd
system_profiler SPUSBDataType            # USB devices

# Linux
sudo systemctl restart cups              # restart print system
lsusb && dmesg | tail -20               # USB diagnostics
```

```powershell
Restart-Service Spooler -Force                              # restart print spooler
Get-PrintJob -PrinterName "OfficePrinter" | Remove-PrintJob # clear stuck jobs
```

---

## Security Basics

### Endpoint Protection

```bash
# macOS
spctl --status                           # Gatekeeper
csrutil status                           # SIP
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Linux
# Before firewall changes, verify the actual remote-management path and recovery console.
sudo ufw status verbose  # do not blindly enable default-deny over a remote session.
```

```powershell
Get-MpComputerStatus | Select AntivirusEnabled, RealTimeProtectionEnabled
Start-MpScan -ScanType QuickScan
Get-NetFirewallProfile | Select Name, Enabled
```

### Phishing Response

```bash
# Reset credentials through the approved secure workflow; do not put passwords in argv.
gam user compromised@company.com signout             # kill sessions
# Recover/reset compromised factors under the verified incident procedure; retain MFA enforcement.
gam user compromised@company.com show tokens         # check rogue OAuth apps
gam user compromised@company.com show forwarding     # check attacker persistence
```

### Lost / Stolen Device Protocol

1. **Immediately** -- Confirm device identity and approved containment: lock/revoke sessions; assess evidence preservation and backup before authorizing irreversible remote wipe.
2. **Within 15 min** -- Reset password and kill sessions (SSO commands above).
3. **Within 1 hour** -- Revoke and rotate affected credentials at their issuer. `gh auth refresh` is not token revocation/rotation; inventory dependent services before key replacement.
4. **Within 24 hours** -- Review access logs for suspicious activity.

## Related Skills

- incident-management (`incident-management`) -- Structured incident handling
- runbook-creation (`runbook-creation`) -- Documentation standards

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

