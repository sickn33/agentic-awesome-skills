---
name: smtp-penetration-testing
description: "Validate SMTP security controls in authorized lab environments using synthetic accounts, bounded requests, and controlled mail sinks."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# SMTP Penetration Testing

## Purpose

Validate SMTP service exposure, recipient-enumeration resistance, relay policy, authentication controls, TLS, and domain authentication in an explicitly authorized lab. Use only synthetic accounts and owner-controlled mail sinks; do not harvest users, brute-force credentials, spoof people, deliver phishing content, or relay mail to third parties.

## Mandatory Test Gate

Record all of the following before connecting:

- written authorization for exact SMTP hosts, ports, source IPs, synthetic accounts, sink domains, and time window;
- an owner-controlled sink that cannot forward externally;
- a request cap and rate (default: 50 SMTP commands total, at most 1 command/second, one connection);
- maximum authentication failures below the documented lockout threshold (default: 3 against one synthetic account);
- allowed impact limited to test messages containing `SMTP_SECURITY_TEST` and no attachments, links, personal data, or real sender identities;
- stop conditions: delivery outside the sink, unexpected real recipient response, lockout, queue growth, service degradation, or any out-of-scope hostname.

If any prerequisite is absent, stop after passive configuration review.

## Prerequisites

### Required Tools
```bash
# Nmap with SMTP scripts
sudo apt-get install nmap

# Netcat
sudo apt-get install netcat

# Use only owner-approved tools already installed in the isolated lab
```

### Required Knowledge
- SMTP protocol fundamentals
- Email architecture (MTA, MDA, MUA)
- DNS and MX records
- Network protocols

### Required Access
- Target SMTP server IP/hostname
- Written authorization for testing
- Two synthetic recipient addresses (one valid, one invalid) and one synthetic auth account

## Outputs and Deliverables

1. **SMTP Security Assessment Report** - Comprehensive vulnerability findings
2. **Enumeration-Resistance Results** - Differential behavior for synthetic canaries
3. **Relay Test Results** - Controlled sink acceptance status
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

# Initial greeting from the authorized test identity
EHLO tester.example.test

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
# VRFY - compare only owner-created synthetic canaries
VRFY valid-canary
VRFY invalid-canary

# EXPN - Expand mailing list
EXPN synthetic-empty-list

# RCPT TO - Recipient verification
MAIL FROM:<tester@sender.example.test>
RCPT TO:<valid-canary@sink.example.test>
# Compare with the invalid synthetic canary; do not probe real names.
```

### Phase 5: User Enumeration

Compare exactly one valid and one invalid owner-created canary through the same command path. Record status code, normalized response length, and coarse latency. Do not use wordlists, employee names, aliases, address harvesting tools, or automated enumeration modules. A distinguishable response is sufficient evidence; stop after the first repeatable difference.

### Phase 6: Open Relay Testing

Test for unauthorized email relay:

```bash
# Using Nmap
nmap -p 25 --script smtp-open-relay TARGET_IP

# Manual testing against the non-forwarding sink
telnet TARGET_IP 25
HELO tester.example.test
MAIL FROM:<tester@sender.example.test>
RCPT TO:<relay-canary@sink.example.test>
DATA
Subject: SMTP_SECURITY_TEST
SMTP_SECURITY_TEST synthetic relay marker.
.
QUIT

# Acceptance is evidence only if the owner confirms the sink represents an unauthenticated relay path.
```

### Phase 7: Authentication-Control Validation

Use one owner-created synthetic account. Submit at most the pre-approved number of known-invalid passwords, no faster than the gate rate, then verify with the owner that throttling, alerting, and lockout behaved as designed. Never use password lists, spraying, credential stuffing, or real accounts. Stop immediately on lockout or unexpected authentication success.

### Phase 8: SMTP Command Injection

Test for command injection vulnerabilities:

```bash
# Header-handling test in the controlled sink
MAIL FROM:<tester@sender.example.test>
RCPT TO:<header-canary@sink.example.test>
DATA
Subject: SMTP_SECURITY_TEST
X-Security-Test: SMTP_SECURITY_TEST

Synthetic marker only
.
```

Do not impersonate executives, employees, or trusted brands. Validate SPF/DKIM/DMARC alignment with owner-created test domains and inspect authentication results at the sink.

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
| Manual canary pair | Compare one valid and one invalid synthetic recipient |
| Netcat | Connect once and issue the approved canary commands |

### Common Vulnerabilities

| Vulnerability | Risk | Test Method |
|--------------|------|-------------|
| Open Relay | High | Relay test with external recipient |
| User Enumeration | Medium | VRFY/EXPN/RCPT commands |
| Banner Disclosure | Low | Banner grabbing |
| Weak Auth Controls | High | Bounded failures on one synthetic account |
| No TLS | Medium | STARTTLS test |
| Missing SPF/DKIM | Medium | DNS record lookup |

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

# Step 3: compare the two synthetic canaries manually

# Step 4: Open relay test
nmap -p 25 --script smtp-open-relay mail.target.com

# Step 5: submit only the pre-approved invalid attempts for the synthetic account

# Step 6: TLS check
openssl s_client -connect mail.target.com:25 -starttls smtp

# Step 7: Check email authentication
dig TXT target.com | grep spf
dig TXT _dmarc.target.com
```

### Example 2: Recipient-Enumeration Resistance

**Scenario:** Compare `valid-canary@sink.example.test` and `invalid-canary@sink.example.test` once each. If response codes or text differ consistently, report the disclosure and stop. Do not expand the sample.

### Example 3: Open Relay Exploitation

**Scenario:** Test and document open relay vulnerability

```bash
# Test via Telnet
telnet mail.target.com 25
HELO tester.example.test
MAIL FROM:<tester@sender.example.test>
RCPT TO:<relay-canary@sink.example.test>
# Have the owner verify that the sink accepted the synthetic marker.

# Document with Nmap
nmap -p 25 --script smtp-open-relay --script-args smtp-open-relay.from=tester@sender.example.test,smtp-open-relay.to=relay-canary@sink.example.test mail.target.com

# Output:
# PORT   STATE SERVICE
# 25/tcp open  smtp
# |_smtp-open-relay: Server is an open relay (14/16 tests)
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection Refused | Port blocked or closed | Check port with nmap; ISP may block port 25; try 587/465; use VPN |
| VRFY/EXPN Disabled | Server hardened | Record the control; do not seek an alternate enumeration path |
| Auth Test Blocked | Rate limiting/lockout | Stop and record the control; do not spray or bypass it |
| SSL/TLS Errors | Wrong port or protocol | Use 465 for SSL, 25/587 for STARTTLS; verify EHLO response |

## Security Recommendations

### For Administrators

1. **Disable Open Relay** - Require authentication for external delivery
2. **Disable VRFY/EXPN** - Prevent user enumeration
3. **Enforce TLS** - Require STARTTLS for all connections
4. **Implement SPF/DKIM/DMARC** - Prevent email spoofing
5. **Rate Limiting** - Bound repeated authentication failures
6. **Account Lockout** - Lock accounts after failed attempts
7. **Banner Hardening** - Minimize server information disclosure
8. **Log Monitoring** - Alert on suspicious activity
9. **Patch Management** - Keep SMTP software updated
10. **Access Controls** - Restrict SMTP to authorized IPs

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
