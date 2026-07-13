# Attack Classes (A1-A14)

## A1: Injection Attacks
- **Description:** SQL, NoSQL, OS command, LDAP, XPath injection
- **Audit Script:** `grep -rn "query\|execute\|exec\|system\|eval" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** CRITICAL if user input reaches query without parameterization
- **OWASP:** A03:2021-Injection
- **CWE:** CWE-89, CWE-78, CWE-94

## A2: Cross-Site Scripting (XSS)
- **Description:** Reflected, stored, DOM-based XSS
- **Audit Script:** `grep -rn "innerHTML\|outerHTML\|document.write\|eval\|dangerouslySetInnerHTML" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .`
- **Severity:** HIGH if user input rendered without encoding
- **OWASP:** A03:2021-Injection
- **CWE:** CWE-79

## A3: Insecure Design
- **Description:** Missing threat modeling, insecure architecture patterns
- **Audit Script:** Manual review of architecture from RECON.json
- **Severity:** MEDIUM to HIGH depending on missing controls
- **OWASP:** A04:2021-Insecure Design
- **CWE:** CWE-209, CWE-256

## A4: Cryptographic Failures
- **Description:** Weak algorithms, hardcoded keys, insecure transmission
- **Audit Script:** `grep -rn "md5\|sha1\|DES\|RC4\|ECB\|password\|secret\|key\|token" --include="*.py" --include="*.js" --include="*.php" --include="*.java" --include="*.go" .`
- **Severity:** HIGH if weak crypto protects sensitive data
- **OWASP:** A02:2021-Cryptographic Failures
- **CWE:** CWE-327, CWE-328, CWE-798

## A5: Broken Access Control
- **Description:** Missing/incorrect authorization, IDOR, privilege escalation
- **Audit Script:** `grep -rn "if.*admin\|role\|permission\|auth\|can\|allow\|deny" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** HIGH if privilege escalation possible
- **OWASP:** A01:2021-Broken Access Control
- **CWE:** CWE-862, CWE-863, CWE-639

## A6: Server-Side Request Forgery (SSRF)
- **Description:** Unvalidated URLs leading to internal network access
- **Audit Script:** `grep -rn "fetch\|axios\|request\|http\.get\|http\.post\|curl\|urllib" --include="*.py" --include="*.js" --include="*.php" --include="*.java" --include="*.go" .`
- **Severity:** CRITICAL if internal network accessible
- **OWASP:** A10:2021-Server-Side Request Forgery
- **CWE:** CWE-918

## A7: Cross-Site Request Forgery (CSRF)
- **Description:** Missing CSRF protection on state-changing operations
- **Audit Script:** `grep -rn "POST\|PUT\|DELETE\|PATCH" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** MEDIUM if state changes possible without user intent
- **OWASP:** A01:2021-Broken Access Control
- **CWE:** CWE-352

## A8: Security Misconfiguration
- **Description:** Default configs, unnecessary features, verbose errors
- **Audit Script:** `grep -rn "debug\|verbose\|stack.trace\|error\|exception" --include="*.py" --include="*.js" --include="*.php" --include="*.java" --include="*.go" .`
- **Severity:** MEDIUM if sensitive info exposed
- **OWASP:** A05:2021-Security Misconfiguration
- **CWE:** CWE-200, CWE-16

## A9: Vulnerable and Outdated Components
- **Description:** Known vulnerabilities in dependencies
- **Audit Script:** Check dependency files against CVE databases
- **Severity:** Varies by CVE score
- **OWASP:** A06:2021-Vulnerable and Outdated Components
- **CWE:** CWE-1104

## A10: Authentication Failures
- **Description:** Weak passwords, missing MFA, session fixation
- **Audit Script:** `grep -rn "password\|login\|session\|token\|cookie" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** HIGH if authentication bypass possible
- **OWASP:** A07:2021-Identification and Authentication Failures
- **CWE:** CWE-287, CWE-307

## A11: Data Integrity Failures
- **Description:** Insecure deserialization, unsigned updates
- **Audit Script:** `grep -rn "deserialize\|unserialize\|pickle\|marshal\|yaml.load" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** CRITICAL if RCE via deserialization
- **OWASP:** A08:2021-Software and Data Integrity Failures
- **CWE:** CWE-502, CWE-829

## A12: Security Logging Failures
- **Description:** Insufficient logging, missing audit trails
- **Audit Script:** `grep -rn "log\|audit\|trace" --include="*.py" --include="*.js" --include="*.php" --include="*.java" --include="*.go" .`
- **Severity:** LOW (but increases impact of other vulnerabilities)
- **OWASP:** A09:2021-Security Logging and Monitoring Failures
- **CWE:** CWE-778

## A13: Local File Inclusion (LFI) / Remote File Inclusion (RFI)
- **Description:** Path traversal, file upload/download vulnerabilities
- **Audit Script:** `grep -rn "open\|readFile\|include\|require\|file_get_contents\|send_file" --include="*.py" --include="*.js" --include="*.php" --include="*.java" --include="*.go" .`
- **Severity:** HIGH if arbitrary file access possible
- **OWASP:** A01:2021-Broken Access Control
- **CWE:** CWE-22, CWE-98

## A14: Server-Side Template Injection (SSTI)
- **Description:** Template injection leading to RCE
- **Audit Script:** `grep -rn "render\|template\|jinja\|mustache\|handlebars\|pug" --include="*.py" --include="*.js" --include="*.php" --include="*.java" .`
- **Severity:** CRITICAL if RCE possible
- **OWASP:** A03:2021-Injection
- **CWE:** CWE-1336

## Severity Determination Rules

1. **CRITICAL**: Remote code execution, authentication bypass, SQL injection with data access
2. **HIGH**: Privilege escalation, stored XSS, XXE, significant data exposure
3. **MEDIUM**: Reflected XSS, CSRF, information disclosure, weak cryptography
4. **LOW**: Missing headers, verbose errors, minor information leaks
5. **INFO**: Best practice recommendations, defense-in-depth suggestions
