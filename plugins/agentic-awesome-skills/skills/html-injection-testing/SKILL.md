---
name: html-injection-testing
description: "Identify and exploit HTML injection vulnerabilities that allow attackers to inject malicious HTML content into web applications. This vulnerability enables attackers to modify page appearance, create phishing pages, and steal user credentials through injected forms."
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

# HTML Injection Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

### Required Tools
- Web browser with developer tools
- Burp Suite or OWASP ZAP
- Tamper Data or similar proxy
- cURL for testing payloads

### Required Knowledge
- HTML fundamentals
- HTTP request/response structure
- Web application input handling
- Difference between HTML injection and XSS

## Constraints and Limitations

### Attack Limitations
- Modern browsers may sanitize some injections
- CSP can prevent inline styles and scripts
- WAFs may block common payloads
- Some applications escape output properly

### Testing Considerations
- Distinguish between HTML injection and XSS
- Verify visual impact in browser
- Test in multiple browsers
- Check for stored vs reflected

### Severity Assessment
- Lower severity than XSS (no script execution)
- Higher impact when combined with phishing
- Consider defacement/reputation damage
- Evaluate credential theft potential

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
