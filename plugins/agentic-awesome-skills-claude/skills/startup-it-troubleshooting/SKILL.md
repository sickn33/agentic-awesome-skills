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

You are the "accidental IT person." Nobody has IT in their title, but laptops freeze, Wi-Fi drops during investor demos, someone gets locked out of Google Workspace at midnight, and a new hire starts Monday with zero accounts. This skill gives you copy-paste commands to handle it all.

**Priority triage:** (1) Company-wide outages, (2) Executive/customer-facing blockers, (3) Team-wide degradations, (4) Individual workstation issues. Always ask: "How many people are affected?" and "Is revenue impacted?"

---

## SSO / Identity Lockouts

### Google Workspace via GAM

```bash
curl -s -S -L https://gam-shortn.appspot.com/gam-install -o /tmp/gam-install.sh && bash /tmp/gam-install.sh && rm /tmp/gam-install.sh  # install GAM
gam oauth create                                                     # authorize

gam update user jane@company.com password "TempPass123!" changepassword on  # reset password
gam update user jane@company.com suspended off       # unsuspend locked-out user
gam user jane@company.com signout                    # force sign-out all sessions
gam user jane@company.com update backupcodes         # new MFA backup codes
gam user jane@company.com turnoff2sv                 # disable 2SV (re-enable within 24h)
```

### Okta API

```bash
OKTA="company.okta.com"; T="your-api-token"; UID="00u1abcdef"
curl -X POST -H "Authorization: SSWS $T" "https://$OKTA/api/v1/users/$UID/lifecycle/unlock"
curl -X POST -H "Authorization: SSWS $T" "https://$OKTA/api/v1/users/$UID/lifecycle/reset_password?sendEmail=true"
curl -X POST -H "Authorization: SSWS $T" "https://$OKTA/api/v1/users/$UID/lifecycle/reset_factors"
curl -X DELETE -H "Authorization: SSWS $T" "https://$OKTA/api/v1/users/$UID/sessions"
```

**MFA recovery flow:** Verify identity via video call, generate backup codes or reset factors, have user re-enroll immediately, confirm old device is deregistered, log the incident.

---

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
docker system prune -a --volumes         # reclaim Docker space
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
pkill -f "Google Chrome Helper"

# Linux
free -h && ps aux --sort=-%mem | head -11
sudo dmesg | grep -i "oom\|out of memory"
```

```powershell
Get-Process | Sort WorkingSet64 -Desc | Select -First 10 Name,@{N='MB';E={[math]::Round($_.WorkingSet64/1MB,2)}}
Stop-Process -Name "Teams" -Force
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
sudo systemsetup -setremotelogin on       # enable SSH for remote admin

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
softwareupdate -l && sudo softwareupdate -ia --restart
```

---

## Windows Administration

```powershell
gpresult /r; gpupdate /force             # check and refresh Group Policy

# Windows Update
Install-Module PSWindowsUpdate -Force -Scope CurrentUser
Install-WindowsUpdate -AcceptAll -AutoReboot
# If stuck: reset update components
Stop-Service wuauserv,cryptSvc,bits,msiserver -Force
Remove-Item "C:\Windows\SoftwareDistribution" -Recurse -Force
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
# 1. Google Workspace account
gam create user newhire@company.com firstname "Jane" lastname "Smith" \
  password "Welcome2Company!" changepassword on org "/Engineering"
gam update group engineering@company.com add member newhire@company.com

# 2. 1Password
op user provision --email newhire@company.com --name "Jane Smith"

# 3. Slack
curl -X POST "https://slack.com/api/admin.users.invite" \
  -H "Authorization: Bearer xoxp-your-admin-token" \
  -d "email=newhire@company.com&channel_ids=C01GENERAL,C02ENGINEERING&team_id=T01YOURTEAM"

# 4. GitHub
gh api orgs/your-company/invitations -f email="newhire@company.com" -f role="direct_member"
gh api orgs/your-company/teams/engineering/memberships/newhire-username -f role="member" -X PUT

# 5. VPN / Tailscale
tailscale up --authkey tskey-auth-abc123
```

### First-Day Setup Script (macOS)

Give new hires this script. It installs Homebrew, your standard tools from a hosted Brewfile, configures Git, authenticates GitHub CLI, clones core repos, and enables FileVault.

```bash
#!/bin/bash
set -e
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
curl -sL https://internal.company.com/setup/Brewfile -o /tmp/Brewfile && brew bundle install --file=/tmp/Brewfile
read -p "Full name: " N; read -p "Email: " E
git config --global user.name "$N" && git config --global user.email "$E" && git config --global pull.rebase true
gh auth login && mkdir -p ~/src && cd ~/src && gh repo clone your-company/main-app
sudo fdesetup enable
```

## Offboarding Checklist

Run these **immediately** when someone departs. Speed matters for security.

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
sudo ufw enable && sudo ufw default deny incoming && sudo ufw default allow outgoing
```

```powershell
Get-MpComputerStatus | Select AntivirusEnabled, RealTimeProtectionEnabled
Start-MpScan -ScanType QuickScan
Get-NetFirewallProfile | Select Name, Enabled
```

### Phishing Response

```bash
gam update user compromised@company.com password "$(openssl rand -base64 16)" changepassword on
gam user compromised@company.com signout             # kill sessions
gam user compromised@company.com turnoff2sv          # reset MFA
gam user compromised@company.com show tokens         # check rogue OAuth apps
gam user compromised@company.com show forwarding     # check attacker persistence
```

### Lost / Stolen Device Protocol

1. **Immediately** -- Remote wipe via MDM or Find My Mac.
2. **Within 15 min** -- Reset password and kill sessions (SSO commands above).
3. **Within 1 hour** -- Rotate API keys and secrets: `gh auth refresh`, delete AWS access keys.
4. **Within 24 hours** -- Review access logs for suspicious activity.

## Related Skills

- incident-management (`incident-management`) -- Structured incident handling
- runbook-creation (`runbook-creation`) -- Documentation standards

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

