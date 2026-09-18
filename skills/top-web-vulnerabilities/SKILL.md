---
name: top-web-vulnerabilities
description: "Provide a comprehensive, structured reference for the 100 most critical web application vulnerabilities organized by category. This skill enables systematic vulnerability identification, impact assessment, and remediation guidance across the full spectrum of web security threats."
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

# Top 100 Web Vulnerabilities Reference

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

- Basic understanding of web application architecture (client-server model, HTTP protocol)
- Familiarity with common web technologies (HTML, JavaScript, SQL, XML, APIs)
- Understanding of authentication and authorization concepts
- Access to web application security testing tools (Burp Suite, OWASP ZAP)
- Knowledge of secure coding principles recommended

## Constraints and Limitations

- Vulnerability definitions represent common patterns; specific implementations vary
- Mitigations must be adapted to technology stack and architecture
- New vulnerabilities emerge continuously; reference should be updated
- Some vulnerabilities overlap across categories (e.g., IDOR appears in multiple contexts)
- Effectiveness of mitigations depends on proper implementation
- Automated scanners cannot detect all vulnerability types (especially business logic)

---

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
