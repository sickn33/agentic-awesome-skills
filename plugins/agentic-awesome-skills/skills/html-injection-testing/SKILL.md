---
name: html-injection-testing
description: "Validate HTML injection defenses in explicitly authorized, isolated environments using benign markers, bounded requests, and synthetic data."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# HTML Injection Testing

## Purpose

Validate whether untrusted input is rendered as HTML, document the resulting security impact, and recommend context-appropriate output encoding. Demonstrate impact only with inert, reversible markers in an isolated environment; never collect credentials, impersonate a login flow, evade controls, or contact third-party hosts.

## Mandatory Test Gate

Proceed only when all of the following are recorded in the test plan:

- written authorization naming the exact lab or staging hosts, paths, accounts, and time window;
- synthetic records and test-only accounts, with no production or third-party data;
- a request ceiling and rate limit agreed with the owner (default: 20 requests total, at most 1 request/second);
- allowed impact limited to a visible `HTML_INJECTION_TEST` marker in the tester's own session;
- stop conditions: unexpected user impact, persistence outside the test record, authentication or authorization change, service degradation, or any response from an out-of-scope host;
- rollback and cleanup owners for every stored marker.

If any item is missing, stop and produce a test-plan gap instead of sending payloads.

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

## Outputs and Deliverables

1. **Vulnerability Report** - Identified injection points
2. **Benign Proof** - Demonstrated marker rendering in a test-only record
3. **Impact Assessment** - Potential content-spoofing risk without reproducing abuse
4. **Remediation Guidance** - Input validation recommendations

## Core Workflow

### Phase 1: Understanding HTML Injection

HTML injection occurs when user input is reflected in web pages without proper sanitization:

```html
<!-- Vulnerable code example -->
<div>
    Welcome, <?php echo $_GET['name']; ?>
</div>

<!-- Attack input -->
?name=<h1>Injected Content</h1>

<!-- Rendered output -->
<div>
    Welcome, <h1>Injected Content</h1>
</div>
```

Key differences from XSS:
- HTML injection: Only HTML tags are rendered
- XSS: JavaScript code is executed
- HTML injection is often stepping stone to XSS

Security impacts to assess without reproducing them:
- unauthorized page-content modification;
- misleading links or forms;
- visual impersonation of trusted content;
- escalation to script execution when executable contexts are reachable.

### Phase 2: Identifying Injection Points

Map application for potential injection surfaces:

```
1. Search bars and search results
2. Comment sections
3. User profile fields
4. Contact forms and feedback
5. Registration forms
6. URL parameters reflected on page
7. Error messages
8. Page titles and headers
9. Hidden form fields
10. Cookie values reflected on page
```

Common vulnerable parameters:
```
?name=
?user=
?search=
?query=
?message=
?title=
?content=
?redirect=
?url=
?page=
```

### Phase 3: Basic HTML Injection Testing

Test with simple HTML tags:

```html
<!-- Basic text formatting -->
<h1>Test Injection</h1>
<b>Bold Text</b>
<i>Italic Text</i>
<u>Underlined Text</u>
<font color="red">Red Text</font>

<!-- Structural elements -->
<div style="background:red;color:white;padding:10px">Injected DIV</div>
<p>Injected paragraph</p>
<br><br><br>Line breaks

<!-- Inert same-origin marker; no external request or event handler -->
<a href="#html-injection-test">HTML_INJECTION_TEST</a>
<span data-security-test="html-injection">HTML_INJECTION_TEST</span>
```

Testing workflow:
```bash
# Test basic injection
curl --max-time 5 "https://lab.example.test/search?q=<h1>HTML_INJECTION_TEST</h1>"

# Check if HTML renders in response
curl --max-time 5 -s "https://lab.example.test/search?q=<b>HTML_INJECTION_TEST</b>" | grep -F "HTML_INJECTION_TEST"

# Test in URL-encoded form
curl --max-time 5 "https://lab.example.test/search?q=%3Ch1%3EHTML_INJECTION_TEST%3C%2Fh1%3E"
```

### Phase 4: Types of HTML Injection

#### Stored HTML Injection

Payload persists in database:

```html
<!-- Test-only profile or comment record -->
<div data-security-test="stored-html">
  HTML_INJECTION_TEST
</div>
```

#### Reflected GET Injection

Payload in URL parameters:

```html
<!-- URL injection -->
https://lab.example.test/welcome?name=<h1>HTML_INJECTION_TEST</h1>

<!-- Search result injection -->
https://lab.example.test/search?q=<strong>HTML_INJECTION_TEST</strong>
```

#### Reflected POST Injection

Payload in POST data:

```bash
# POST injection test
curl --max-time 5 -X POST -d "comment=<div>HTML_INJECTION_TEST</div>" \
     https://lab.example.test/submit

# Form field injection
curl --max-time 5 -X POST -d "name=<b>HTML_INJECTION_TEST</b>&email=synthetic@example.test" \
     https://lab.example.test/register
```

#### URL-Based Injection

Inject into displayed URLs:

```html
<!-- If URL is displayed on page -->
http://target.com/page/<h1>Injected</h1>

<!-- Path-based injection -->
http://target.com/users/<img src=x>/profile
```

### Phase 5: Benign Impact Validation

Use one reversible marker in the tester's own record. The marker must not resemble a login prompt, request secrets, cover the page, redirect, execute script, load a remote resource, or alter another user's view.

```html
<aside data-security-test="html-injection" style="border:2px solid #b00">
  HTML_INJECTION_TEST — synthetic lab marker
</aside>
```

Record whether the application renders, encodes, strips, or rejects the marker. A rendered marker is sufficient evidence; do not escalate to phishing, defacement, form-action replacement, or data capture.

### Phase 6: Context and Impact Review

For each confirmed sink, document the output context (text, attribute, URL, style, or raw HTML) and assess potential impact from code review. Do not demonstrate overlays, redirects, external loads, event handlers, or credential fields. If script-capable context is suspected, hand it to the separately authorized XSS review rather than extending this test.

### Phase 7: Encoding Equivalence Checks

Test only the owner-approved marker in the minimum set of encodings needed to establish whether decoding occurs before rendering. Cap this phase at five requests per input and stop after the first confirmed rendering. Do not use obfuscation, malformed tags, null bytes, filter-evasion payloads, or executable attributes.

```text
literal marker: <strong>HTML_INJECTION_TEST</strong>
URL-encoded marker: %3Cstrong%3EHTML_INJECTION_TEST%3C%2Fstrong%3E
expected safe output: &lt;strong&gt;HTML_INJECTION_TEST&lt;/strong&gt;
```

### Phase 8: Cleanup and Reporting

Delete every stored test record through the application's normal UI or documented test API, verify the marker is absent in a fresh session, and attach request counts and cleanup evidence to the report. If cleanup fails, stop testing and notify the system owner; do not attempt direct database or filesystem deletion.

### Phase 9: Automated Testing

#### Using Burp Suite

```
1. Capture request with potential injection point
2. Send to Intruder
3. Mark parameter value as payload position
4. Load HTML injection wordlist
5. Start attack
6. Filter responses for rendered HTML
7. Manually verify successful injections
```

#### Using OWASP ZAP

```
1. Spider the target application
2. Active Scan with HTML injection rules
3. Review Alerts for injection findings
4. Validate findings manually
```

#### Custom Fuzzing Script

```python
#!/usr/bin/env python3
import requests
import urllib.parse

target = "http://target.com/search"
param = "q"

payloads = [
    "<h1>Test</h1>",
    "<b>Bold</b>",
    "<span data-security-test='html-injection'>HTML_INJECTION_TEST</span>",
    "<div style='color:red'>Styled</div>",
]

for payload in payloads:
    encoded = urllib.parse.quote(payload)
    url = f"{target}?{param}={encoded}"
    
    try:
        response = requests.get(url, timeout=5, allow_redirects=False)
        if payload.lower() in response.text.lower():
            print(f"[+] Possible injection: {payload}")
        elif "<h1>" in response.text or "<b>" in response.text:
            print(f"[?] Partial reflection: {payload}")
    except Exception as e:
        print(f"[-] Error: {e}")
```

### Phase 10: Prevention and Remediation

Secure coding practices:

```php
// PHP: Escape output
echo htmlspecialchars($user_input, ENT_QUOTES, 'UTF-8');

// PHP: Strip tags
echo strip_tags($user_input);

// PHP: Allow specific tags only
echo strip_tags($user_input, '<p><b><i>');
```

```python
# Python: HTML escape
from html import escape
safe_output = escape(user_input)

# Python Flask: Auto-escaping
{{ user_input }}  # Jinja2 escapes by default
{{ user_input | safe }}  # Marks as safe (dangerous!)
```

```javascript
// JavaScript: Text content (safe)
element.textContent = userInput;

// JavaScript: innerHTML (dangerous!)
element.innerHTML = userInput;  // Vulnerable!

// JavaScript: Sanitize
const clean = DOMPurify.sanitize(userInput);
element.innerHTML = clean;
```

Server-side protections:
- Input validation (whitelist allowed characters)
- Output encoding (context-aware escaping)
- Content Security Policy (CSP) headers
- Web Application Firewall (WAF) rules

## Quick Reference

### Common Test Payloads

| Payload | Purpose |
|---------|---------|
| `<h1>Test</h1>` | Basic rendering test |
| `<b>Bold</b>` | Simple formatting |
| `<a href="#html-injection-test">Marker</a>` | Same-page link rendering |
| `<img src=x>` | Image tag test |
| `<div style="color:red">` | Style injection |
| `<span data-security-test="html-injection">` | Attribute preservation |

### Injection Contexts

| Context | Test Approach |
|---------|---------------|
| URL parameter | `?param=<h1>test</h1>` |
| Form field | POST with HTML payload |
| Cookie value | Inject via document.cookie |
| HTTP header | Inject in Referer/User-Agent |
| File upload | HTML file with malicious content |

### Encoding Types

| Type | Example |
|------|---------|
| URL encoding | `%3Ch1%3E` = `<h1>` |
| HTML entities | `&#60;h1&#62;` = `<h1>` |
| Double encoding | `%253C` = `<` |
| Unicode | `\u003c` = `<` |

## Constraints and Limitations

### Attack Limitations
- Modern browsers may sanitize some injections
- CSP can prevent inline styles and scripts
- WAFs may block common payloads
- Some applications escape output properly

### Testing Considerations
- Distinguish between HTML injection and XSS
- Verify visual impact in browser
- Test only in the authorized lab browser profiles
- Check for stored vs reflected

### Severity Assessment
- Lower severity than XSS (no script execution)
- Higher potential impact when trusted content can be impersonated
- Consider defacement/reputation damage
- Assess credential-theft potential from code and context; do not reproduce it

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| HTML not rendering | Check if output HTML-encoded; try encoding variations; verify HTML context |
| Payload stripped | Record the behavior; do not evade the filter unless separately authorized |
| Script does not execute | Keep the finding scoped to HTML injection and stop escalation |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
