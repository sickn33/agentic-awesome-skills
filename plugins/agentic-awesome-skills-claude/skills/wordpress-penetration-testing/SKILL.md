---
name: wordpress-penetration-testing
description: "Assess WordPress installations for common vulnerabilities and installed core/plugin REST permission boundaries."
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

# WordPress Penetration Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

### Required Tools
- WPScan (pre-installed in Kali Linux)
- Metasploit Framework
- Burp Suite or OWASP ZAP
- Nmap for initial discovery
- cURL or wget

### Required Knowledge
- WordPress architecture and structure
- Web application testing fundamentals
- HTTP protocol understanding
- Common web vulnerabilities (OWASP Top 10)

## Constraints and Limitations

### Legal Considerations
- Obtain written authorization before testing
- Stay within defined scope
- Document all testing activities
- Follow responsible disclosure

### Technical Limitations
- WAF may block scanning
- Rate limiting may prevent brute-force
- Some plugins may have false negatives
- XML-RPC may be disabled

### Assessment Traffic Controls
- Agree source IPs, request rates, maintenance window, stop conditions and any proxy with the owner.
- Throttle requests: `--throttle 1000` is an example to verify against installed WPScan help.
- A blocked scan is a finding or scope limit; do not rotate proxies or switch authentication channels to evade agreed controls.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
