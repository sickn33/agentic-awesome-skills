---
name: top-web-vulnerabilities
description: "Use a structured, non-exhaustive reference of common web application vulnerability patterns to support authorized assessment, impact analysis, and remediation planning."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use active testing techniques only with written permission, within the approved scope and rules of engagement, or in a controlled educational environment.

# Web Vulnerability Patterns Reference

## Purpose

Provide a structured, non-exhaustive reference of common web application vulnerability patterns organized by category. Use it to support authorized identification, impact assessment, and remediation; it is not a ranked list, a complete test plan, or a substitute for current OWASP guidance, threat modeling, or technology-specific review.

## Prerequisites

- Basic understanding of web application architecture (client-server model, HTTP protocol)
- Familiarity with common web technologies (HTML, JavaScript, SQL, XML, APIs)
- Understanding of authentication and authorization concepts
- Access to web application security testing tools (Burp Suite, OWASP ZAP)
- Knowledge of secure coding principles recommended

## Outputs and Deliverables

- Selected vulnerability patterns with definitions, root causes, impacts, and mitigations
- Category-based vulnerability groupings for systematic assessment
- Quick reference for security testing and remediation
- Foundation for vulnerability assessment checklists and security policies

---

## Mandatory Assessment Gate

Passive reading and remediation planning are allowed without touching a target. Before any active request, payload, credential test, privilege test, out-of-band callback, fault injection, or availability test:

1. Obtain written authorization and record the exact in-scope hosts, APIs, accounts, data, permitted techniques, excluded systems, approved source IPs, nonproduction or production status, test window, rate/concurrency ceiling, monitoring contact, and emergency stop contact.
2. Prefer an isolated lab, staging environment, or dedicated test tenant. Production testing requires explicit approval for the specific action and expected impact.
3. Present the individual action, target, payload class, expected evidence, possible impact, request limit, rollback or cleanup plan, and stop conditions; obtain explicit operator approval for that action. Approval for scanning does not authorize exploitation, credential attacks, privilege escalation, out-of-band callbacks, or denial-of-service behavior.
4. Stop on scope uncertainty, unexpected sensitive data, service degradation, account lockout, defensive alerts, third-party interaction, or an owner request. Preserve evidence and notify the named contact.

Never evade a WAF, rate limit, monitoring control, or network restriction through source rotation, encoding, fragmentation, alternate infrastructure, or similar techniques unless the exact method is explicitly permitted by the rules of engagement. Use the least-impactful verification that establishes the finding.

## Core Workflow

### Phase 1: Injection Vulnerabilities Assessment

Evaluate injection attack vectors targeting data processing components:

**SQL Injection (1)**
- Definition: Malicious SQL code inserted into input fields to manipulate database queries
- Root Cause: Lack of input validation, improper use of parameterized queries
- Impact: Unauthorized data access, data manipulation, database compromise
- Mitigation: Use parameterized queries/prepared statements, input validation, least privilege database accounts

**Cross-Site Scripting - XSS (2)**
- Definition: Injection of malicious scripts into web pages viewed by other users
- Root Cause: Insufficient output encoding, lack of input sanitization
- Impact: Session hijacking, credential theft, website defacement
- Mitigation: Output encoding, Content Security Policy (CSP), input sanitization

**Command Injection (5, 11)**
- Definition: Execution of arbitrary system commands through vulnerable applications
- Root Cause: Unsanitized user input passed to system shells
- Impact: Full system compromise, data exfiltration, lateral movement
- Mitigation: Avoid shell execution, whitelist valid commands, strict input validation

**XML Injection (6), LDAP Injection (7), XPath Injection (8)**
- Definition: Manipulation of XML/LDAP/XPath queries through malicious input
- Root Cause: Improper input handling in query construction
- Impact: Data exposure, authentication bypass, information disclosure
- Mitigation: Input validation, parameterized queries, escape special characters

**Server-Side Template Injection - SSTI (13)**
- Definition: Injection of malicious code into template engines
- Root Cause: User input embedded directly in template expressions
- Impact: Remote code execution, server compromise
- Mitigation: Sandbox template engines, avoid user input in templates, strict input validation

### Phase 2: Authentication and Session Security

Assess authentication mechanism weaknesses:

**Session Fixation (14)**
- Definition: Attacker sets victim's session ID before authentication
- Root Cause: Session ID not regenerated after login
- Impact: Session hijacking, unauthorized account access
- Mitigation: Regenerate session ID on authentication, use secure session management

**Brute Force Attack (15)**
- Definition: Systematic password guessing using automated tools
- Root Cause: Lack of account lockout, rate limiting, or CAPTCHA
- Impact: Unauthorized access, credential compromise
- Mitigation: Account lockout policies, rate limiting, MFA, CAPTCHA

**Session Hijacking (16)**
- Definition: Attacker steals or predicts valid session tokens
- Root Cause: Weak session token generation, insecure transmission
- Impact: Account takeover, unauthorized access
- Mitigation: Secure random token generation, HTTPS, HttpOnly/Secure cookie flags

**Credential Stuffing and Reuse (22)**
- Definition: Using leaked credentials to access accounts across services
- Root Cause: Users reusing passwords, no breach detection
- Impact: Mass account compromise, data breaches
- Mitigation: MFA, breach password checks, unique credential requirements

**Insecure "Remember Me" Functionality (85)**
- Definition: Weak persistent authentication token implementation
- Root Cause: Predictable tokens, inadequate expiration controls
- Impact: Unauthorized persistent access, session compromise
- Mitigation: Strong token generation, proper expiration, secure storage

**CAPTCHA Bypass (86)**
- Definition: Circumventing bot detection mechanisms
- Root Cause: Weak CAPTCHA algorithms, improper validation
- Impact: Automated attacks, credential stuffing, spam
- Mitigation: reCAPTCHA v3, layered bot detection, rate limiting

### Phase 3: Sensitive Data Exposure

Identify data protection failures:

**IDOR - Insecure Direct Object References (23, 42)**
- Definition: Direct access to internal objects via user-supplied references
- Root Cause: Missing authorization checks on object access
- Impact: Unauthorized data access, privacy breaches
- Mitigation: Access control validation, indirect reference maps, authorization checks

**Data Leakage (24)**
- Definition: Inadvertent disclosure of sensitive information
- Root Cause: Inadequate data protection, weak access controls
- Impact: Privacy breaches, regulatory penalties, reputation damage
- Mitigation: DLP solutions, encryption, access controls, security training

**Unencrypted Data Storage (25)**
- Definition: Storing sensitive data without encryption
- Root Cause: Failure to implement encryption at rest
- Impact: Data breaches if storage compromised
- Mitigation: Full-disk encryption, database encryption, secure key management

**Information Disclosure (33)**
- Definition: Exposure of system details through error messages or responses
- Root Cause: Verbose error handling, debug information in production
- Impact: Reconnaissance for further attacks, credential exposure
- Mitigation: Generic error messages, disable debug mode, secure logging

### Phase 4: Security Misconfiguration

Assess configuration weaknesses:

**Missing Security Headers (26)**
- Definition: Absence of protective HTTP headers (CSP, X-Frame-Options, HSTS)
- Root Cause: Inadequate server configuration
- Impact: XSS attacks, clickjacking, protocol downgrade
- Mitigation: Implement CSP, X-Content-Type-Options, X-Frame-Options, HSTS

**Default Passwords (28)**
- Definition: Unchanged default credentials on systems/applications
- Root Cause: Failure to change vendor defaults
- Impact: Unauthorized access, system compromise
- Mitigation: Mandatory password changes, strong password policies

**Directory Listing (29)**
- Definition: Web server exposes directory contents
- Root Cause: Improper server configuration
- Impact: Information disclosure, sensitive file exposure
- Mitigation: Disable directory indexing, use default index files

**Unprotected API Endpoints (30)**
- Definition: APIs lacking authentication or authorization
- Root Cause: Missing security controls on API routes
- Impact: Unauthorized data access, API abuse
- Mitigation: OAuth/API keys, access controls, rate limiting

**Open Ports and Services (31)**
- Definition: Unnecessary network services exposed
- Root Cause: Failure to minimize attack surface
- Impact: Exploitation of vulnerable services
- Mitigation: Port scanning audits, firewall rules, service minimization

**Misconfigured CORS (35)**
- Definition: Overly permissive Cross-Origin Resource Sharing policies
- Root Cause: Wildcard origins, improper CORS configuration
- Impact: Cross-site request attacks, data theft
- Mitigation: Whitelist trusted origins, validate CORS headers

**Unpatched Software (34)**
- Definition: Systems running outdated vulnerable software
- Root Cause: Neglected patch management
- Impact: Exploitation of known vulnerabilities
- Mitigation: Patch management program, vulnerability scanning, automated updates

### Phase 5: XML-Related Vulnerabilities

Evaluate XML processing security:

**XXE - XML External Entity Injection (37)**
- Definition: Exploitation of XML parsers to access files or internal systems
- Root Cause: External entity processing enabled
- Impact: File disclosure, SSRF, denial of service
- Mitigation: Disable external entities, use safe XML parsers

**XEE - XML Entity Expansion (38)**
- Definition: Excessive entity expansion causing resource exhaustion
- Root Cause: Unlimited entity expansion allowed
- Impact: Denial of service, parser crashes
- Mitigation: Limit entity expansion, configure parser restrictions

**XML Bomb (Billion Laughs) (39)**
- Definition: Crafted XML with nested entities consuming resources
- Root Cause: Recursive entity definitions
- Impact: Memory exhaustion, denial of service
- Mitigation: Entity expansion limits, input size restrictions

**XML Denial of Service (65)**
- Definition: Specially crafted XML causing excessive processing
- Root Cause: Complex document structures without limits
- Impact: CPU/memory exhaustion, service unavailability
- Mitigation: Schema validation, size limits, processing timeouts

### Phase 6: Broken Access Control

Assess authorization enforcement:

**Inadequate Authorization (40)**
- Definition: Failure to properly enforce access controls
- Root Cause: Weak authorization policies, missing checks
- Impact: Unauthorized access to sensitive resources
- Mitigation: RBAC, centralized IAM, regular access reviews

**Privilege Escalation (41)**
- Definition: Gaining elevated access beyond intended permissions
- Root Cause: Misconfigured permissions, system vulnerabilities
- Impact: Full system compromise, data manipulation
- Mitigation: Least privilege, regular patching, privilege monitoring

**Forceful Browsing (43)**
- Definition: Direct URL manipulation to access restricted resources
- Root Cause: Weak access controls, predictable URLs
- Impact: Unauthorized file/directory access
- Mitigation: Enforce server-side authorization on every object and action; do not rely on hidden or unpredictable resource paths

**Missing Function-Level Access Control (44)**
- Definition: Unprotected administrative or privileged functions
- Root Cause: Authorization only at UI level
- Impact: Unauthorized function execution
- Mitigation: Server-side authorization for all functions, RBAC

### Phase 7: Insecure Deserialization

Evaluate object serialization security:

**Remote Code Execution via Deserialization (45)**
- Definition: Arbitrary code execution through malicious serialized objects
- Root Cause: Untrusted data deserialized without validation
- Impact: Complete system compromise, code execution
- Mitigation: Avoid deserializing untrusted data, integrity checks, type validation

**Data Tampering (46)**
- Definition: Unauthorized modification of serialized data
- Root Cause: Missing integrity verification
- Impact: Data corruption, privilege manipulation
- Mitigation: Digital signatures, HMAC validation, encryption

**Object Injection (47)**
- Definition: Malicious object instantiation during deserialization
- Root Cause: Unsafe deserialization practices
- Impact: Code execution, unauthorized access
- Mitigation: Type restrictions, class whitelisting, secure libraries

### Phase 8: API Security Assessment

Evaluate API-specific vulnerabilities:

**Insecure API Endpoints (48)**
- Definition: APIs without proper security controls
- Root Cause: Poor API design, missing authentication
- Impact: Data breaches, unauthorized access
- Mitigation: OAuth/JWT, HTTPS, input validation, rate limiting

**API Key Exposure (49)**
- Definition: Leaked or exposed API credentials
- Root Cause: Hardcoded keys, insecure storage
- Impact: Unauthorized API access, abuse
- Mitigation: Secure key storage, rotation, environment variables

**Lack of Rate Limiting (50)**
- Definition: No controls on API request frequency
- Root Cause: Missing throttling mechanisms
- Impact: DoS, API abuse, resource exhaustion
- Mitigation: Rate limits per user/IP, throttling, DDoS protection

**Inadequate Input Validation (51)**
- Definition: APIs accepting unvalidated user input
- Root Cause: Missing server-side validation
- Impact: Injection attacks, data corruption
- Mitigation: Strict validation, parameterized queries, WAF

**API Abuse (75)**
- Definition: Exploiting API functionality for malicious purposes
- Root Cause: Excessive trust in client input
- Impact: Data theft, account takeover, service abuse
- Mitigation: Strong authentication, behavior analysis, anomaly detection

### Phase 9: Communication Security

Assess transport layer protections:

**Man-in-the-Middle Attack (52)**
- Definition: Interception of communication between parties
- Root Cause: Unencrypted channels, compromised networks
- Impact: Data theft, session hijacking, impersonation
- Mitigation: TLS/SSL, certificate pinning, mutual authentication

**Insufficient Transport Layer Security (53)**
- Definition: Weak or outdated encryption for data in transit
- Root Cause: Outdated protocols (SSLv2/3), weak ciphers
- Impact: Traffic interception, credential theft
- Mitigation: TLS 1.2+, strong cipher suites, HSTS

**Insecure SSL/TLS Configuration (54)**
- Definition: Improperly configured encryption settings
- Root Cause: Weak ciphers, missing forward secrecy
- Impact: Traffic decryption, MITM attacks
- Mitigation: Modern cipher suites, PFS, certificate validation

**Insecure Communication Protocols (55)**
- Definition: Use of unencrypted protocols (HTTP, Telnet, FTP)
- Root Cause: Legacy systems, security unawareness
- Impact: Traffic sniffing, credential exposure
- Mitigation: HTTPS, SSH, SFTP, VPN tunnels

### Phase 10: Client-Side Vulnerabilities

Evaluate browser-side security:

**DOM-based XSS (56)**
- Definition: XSS through client-side JavaScript manipulation
- Root Cause: Unsafe DOM manipulation with user input
- Impact: Session theft, credential harvesting
- Mitigation: Safe DOM APIs, CSP, input sanitization

**Insecure Cross-Origin Communication (57)**
- Definition: Improper handling of cross-origin requests
- Root Cause: Relaxed CORS/SOP policies
- Impact: Data leakage, CSRF attacks
- Mitigation: Strict CORS, CSRF tokens, origin validation

**Browser Cache Poisoning (58)**
- Definition: Manipulation of cached content
- Root Cause: Weak cache validation
- Impact: Malicious content delivery
- Mitigation: Cache-Control headers, HTTPS, integrity checks

**Clickjacking (59, 71)**
- Definition: UI redress attack tricking users into clicking hidden elements
- Root Cause: Missing frame protection
- Impact: Unintended actions, credential theft
- Mitigation: X-Frame-Options, CSP frame-ancestors, frame-busting

**HTML5 Security Issues (60)**
- Definition: Vulnerabilities in HTML5 APIs (WebSockets, Storage, Geolocation)
- Root Cause: Improper API usage, insufficient validation
- Impact: Data leakage, XSS, privacy violations
- Mitigation: Secure API usage, input validation, sandboxing

### Phase 11: Denial of Service Assessment

Evaluate availability threats:

**DDoS - Distributed Denial of Service (61)**
- Definition: Overwhelming systems with traffic from multiple sources
- Root Cause: Botnets, amplification attacks
- Impact: Service unavailability, revenue loss
- Mitigation: DDoS protection services, rate limiting, CDN

**Application Layer DoS (62)**
- Definition: Targeting application logic to exhaust resources
- Root Cause: Inefficient code, resource-intensive operations
- Impact: Application unavailability, degraded performance
- Mitigation: Rate limiting, caching, WAF, code optimization

**Resource Exhaustion (63)**
- Definition: Depleting CPU, memory, disk, or network resources
- Root Cause: Inefficient resource management
- Impact: System crashes, service degradation
- Mitigation: Resource quotas, monitoring, load balancing

**Slowloris Attack (64)**
- Definition: Keeping connections open with partial HTTP requests
- Root Cause: No connection timeouts
- Impact: Web server resource exhaustion
- Mitigation: Connection timeouts, request limits, reverse proxy

### Phase 12: Server-Side Request Forgery

Assess SSRF vulnerabilities:

**SSRF - Server-Side Request Forgery (66)**
- Definition: Manipulating server to make requests to internal resources
- Root Cause: Unvalidated user-controlled URLs
- Impact: Internal network access, data theft, cloud metadata access
- Mitigation: URL whitelisting, network segmentation, egress filtering

**Blind SSRF (87)**
- Definition: SSRF without direct response visibility
- Root Cause: Similar to SSRF, harder to detect
- Impact: Data exfiltration, internal reconnaissance
- Mitigation: Allowlists, WAF, network restrictions

**Time-Based Blind SSRF (88)**
- Definition: Inferring SSRF success through response timing
- Root Cause: Processing delays indicating request outcomes
- Impact: Prolonged exploitation, detection evasion
- Mitigation: Request timeouts, anomaly detection, timing monitoring

### Phase 13: Additional Web Vulnerabilities

| # | Vulnerability | Root Cause | Impact | Mitigation |
|---|--------------|-----------|--------|------------|
| 67 | HTTP Parameter Pollution | Inconsistent parsing | Injection, ACL bypass | Strict parsing, validation |
| 68 | Insecure Redirects | Unvalidated targets | Phishing, malware | Whitelist destinations |
| 69 | File Inclusion (LFI/RFI) | Unvalidated paths | Code exec, disclosure | Whitelist files, disable RFI |
| 70 | Security Header Bypass | Misconfigured headers | XSS, clickjacking | Proper headers, audits |
| 72 | Inadequate Session Timeout | Excessive timeouts | Session hijacking | Idle termination, timeouts |
| 73 | Insufficient Logging | Missing infrastructure | Detection gaps | SIEM, alerting |
| 74 | Business Logic Flaws | Insecure design | Fraud, unauthorized ops | Threat modeling, testing |

### Phase 14: Mobile and IoT Security

| # | Vulnerability | Root Cause | Impact | Mitigation |
|---|--------------|-----------|--------|------------|
| 76 | Insecure Mobile Storage | Plain text, weak crypto | Data theft | Keychain/Keystore, encrypt |
| 77 | Insecure Mobile Transmission | HTTP, cert failures | Traffic interception | TLS, cert pinning |
| 78 | Insecure Mobile APIs | Missing auth/validation | Data exposure | OAuth/JWT, validation |
| 79 | App Reverse Engineering | Hardcoded creds | Credential theft | Obfuscation, RASP |
| 80 | IoT Management Issues | Weak auth, no TLS | Device takeover | Strong auth, TLS |
| 81 | Weak IoT Authentication | Default passwords | Unauthorized access | Unique creds, MFA |
| 82 | IoT Vulnerabilities | Design flaws, old firmware | Botnet recruitment | Updates, segmentation |
| 83 | Smart Home Access | Insecure defaults | Privacy invasion | MFA, segmentation |
| 84 | IoT Privacy Issues | Excessive collection | Surveillance | Data minimization |

### Phase 15: Advanced and Zero-Day Threats

| # | Vulnerability | Root Cause | Impact | Mitigation |
|---|--------------|-----------|--------|------------|
| 89 | MIME Sniffing | Missing headers | XSS, spoofing | X-Content-Type-Options |
| 91 | CSP Bypass | Weak config | XSS despite CSP | Strict CSP, nonces |
| 92 | Inconsistent Validation | Decentralized logic | Control bypass | Centralized validation |
| 93 | Race Conditions | Missing sync | Privilege escalation | Proper locking |
| 94-95 | Business Logic Flaws | Missing validation | Financial fraud | Server-side validation |
| 96 | Account Enumeration | Different responses | Targeted attacks | Uniform responses |
| 98-99 | Unpatched Vulnerabilities | Patch delays | Zero-day exploitation | Patch management |
| 100 | Zero-Day Exploits | Unknown vulns | Unmitigated attacks | Defense in depth |

---

## Quick Reference

### Vulnerability Categories Summary

| Category | Vulnerability Numbers | Key Controls |
|----------|----------------------|--------------|
| Injection | 1-13 | Parameterized queries, input validation, output encoding |
| Authentication | 14-23, 85-86 | MFA, session management, account lockout |
| Data Exposure | 24-27 | Encryption at rest/transit, access controls, DLP |
| Misconfiguration | 28-36 | Secure defaults, hardening, patching |
| XML | 37-39, 65 | Disable external entities, limit expansion |
| Access Control | 40-44 | RBAC, least privilege, authorization checks |
| Deserialization | 45-47 | Avoid untrusted data, integrity validation |
| API Security | 48-51, 75 | OAuth, rate limiting, input validation |
| Communication | 52-55 | TLS 1.2+, certificate validation, HTTPS |
| Client-Side | 56-60 | CSP, X-Frame-Options, safe DOM |
| DoS | 61-65 | Rate limiting, DDoS protection, resource limits |
| SSRF | 66, 87-88 | URL whitelisting, egress filtering |
| Mobile/IoT | 76-84 | Encryption, authentication, secure storage |
| Business Logic | 74, 92-97 | Threat modeling, logic testing |
| Zero-Day | 98-100 | Defense in depth, threat intelligence |

### Critical Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

### OWASP Top 10:2025 Mapping

This is an approximate cross-reference, not a claim that the numbered patterns fully cover each OWASP category.

| OWASP 2025 | Related Vulnerabilities |
|------------|------------------------|
| A01: Broken Access Control | 40-44, 23, 74 |
| A02: Security Misconfiguration | 26-36 |
| A03: Software Supply Chain Failures | 34, 98-100 |
| A04: Cryptographic Failures | 24-25, 53-55 |
| A05: Injection | 1-13, 37-39 |
| A06: Insecure Design | 74, 92-97 |
| A07: Auth Failures | 14-23, 85-86 |
| A08: Software or Data Integrity Failures | 45-47 |
| A09: Security Logging and Alerting Failures | 73 |
| A10: Mishandling of Exceptional Conditions | Relevant error-handling and fail-open cases require separate review |

---

## Constraints and Limitations

- Vulnerability definitions represent common patterns; specific implementations vary
- Mitigations must be adapted to technology stack and architecture
- New vulnerabilities emerge continuously; reference should be updated
- Some vulnerabilities overlap across categories (e.g., IDOR appears in multiple contexts)
- Effectiveness of mitigations depends on proper implementation
- Automated scanners cannot detect all vulnerability types (especially business logic)
- The historical numbering has gaps and overlaps; it is retained only for cross-reference and does not establish completeness or priority

---

## Troubleshooting

### Common Assessment Challenges

| Challenge | Solution |
|-----------|----------|
| False positives in scanning | Manual verification, contextual analysis |
| Business logic flaws missed | Manual testing, threat modeling, abuse case analysis |
| Encrypted traffic analysis | Proxy configuration, certificate installation |
| WAF blocking tests | Stop, verify ROE and monitoring coordination, then resume only with explicit approval; do not evade the control by default |
| Session handling issues | Cookie management, authentication state tracking |
| API discovery | Swagger/OpenAPI enumeration, traffic analysis |

### Vulnerability Verification Techniques

Use these techniques only after the per-action gate above. Keep requests within the approved rate/window, use controlled accounts and callback infrastructure, avoid unrelated data, and stop at the minimum evidence needed. Availability-impacting tests require a nonproduction target unless production impact is explicitly authorized.

| Vulnerability Type | Verification Approach |
|-------------------|----------------------|
| Injection | Benign proof payloads; encoded variants only when the ROE explicitly permits them |
| XSS | Alert boxes, cookie access, DOM inspection |
| CSRF | Cross-origin form submission testing |
| SSRF | Out-of-band DNS/HTTP callbacks |
| XXE | External entity with controlled server |
| Access Control | Horizontal/vertical privilege testing |
| Authentication | Dedicated test credentials, bounded session analysis |

---

## References

- OWASP Top 10 Web Application Security Risks
- CWE/SANS Top 25 Most Dangerous Software Errors
- OWASP Testing Guide
- OWASP Application Security Verification Standard (ASVS)
- NIST Cybersecurity Framework
- Source: Kumar MS - Top 100 Web Vulnerabilities

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
