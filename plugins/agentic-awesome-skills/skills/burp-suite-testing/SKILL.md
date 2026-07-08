---
name: burp-suite-testing
description: "Execute comprehensive web application security testing using Burp Suite's integrated toolset, including HTTP traffic interception and modification, request analysis and replay, automated vulnerability scanning, and manual testing workflows."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Burp Suite Web Application Testing

## Purpose

Execute comprehensive web application security testing using Burp Suite's integrated toolset, including HTTP traffic interception and modification, request analysis and replay, automated vulnerability scanning, and manual testing workflows. This skill enables systematic discovery and exploitation of web application vulnerabilities through proxy-based testing methodology.

## Inputs / Prerequisites

### Required Tools
- Burp Suite Community or Professional Edition installed
- Burp's embedded browser or configured external browser
- Target web application URL
- Valid credentials for authenticated testing (if applicable)

### Environment Setup
- Burp Suite launched with temporary or named project
- Proxy listener active on 127.0.0.1:8080 (default)
- Browser configured to use Burp proxy (or use Burp's browser)
- CA certificate installed for HTTPS interception

### Editions Comparison
| Feature | Community | Professional |
|---------|-----------|--------------|
| Proxy | ✓ | ✓ |
| Repeater | ✓ | ✓ |
| Intruder | Limited | Full |
| Scanner | ✗ | ✓ |
| Extensions | ✓ | ✓ |

## Outputs / Deliverables

### Primary Outputs
- Intercepted and modified HTTP requests/responses
- Vulnerability scan reports with remediation advice
- HTTP history and site map documentation
- Proof-of-concept exploits for identified vulnerabilities

## Core Workflow

### Phase 1: Intercepting HTTP Traffic

#### Launch Burp's Browser
Navigate to integrated browser for seamless proxy integration:

1. Open Burp Suite and create/open project
2. Go to **Proxy > Intercept** tab
3. Click **Open Browser** to launch preconfigured browser
4. Position windows to view both Burp and browser simultaneously

#### Configure Interception
Control which requests are captured:

```
Proxy > Intercept > Intercept is on/off toggle

When ON: Requests pause for review/modification
When OFF: Requests pass through, logged to history
```

#### Intercept and Forward Requests
Process intercepted traffic:

1. Set intercept toggle to **Intercept on**
2. Navigate to target URL in browser
3. Observe request held in Proxy > Intercept tab
4. Review request contents (headers, parameters, body)
5. Click **Forward** to send request to server
6. Continue forwarding subsequent requests until page loads

#### View HTTP History
Access complete traffic log:

1. Go to **Proxy > HTTP history** tab
2. Click any entry to view full request/response
3. Sort by clicking column headers (# for chronological order)
4. Use filters to focus on relevant traffic

### Phase 2: Modifying Requests

#### Intercept and Modify
Change request parameters before forwarding:

1. Enable interception: **Intercept on**
2. Trigger target request in browser
3. Locate parameter to modify in intercepted request
4. Edit value directly in request editor
5. Click **Forward** to send modified request

#### Common Modification Targets
| Target | Example | Purpose |
|--------|---------|---------|
| Price parameters | `price=1` | Test business logic |
| User IDs | `userId=admin` | Test access control |
| Quantity values | `qty=-1` | Test input validation |
| Hidden fields | `isAdmin=true` | Test privilege escalation |

#### Example: Price Manipulation

```http
POST /cart HTTP/1.1
Host: target.com
Content-Type: application/x-www-form-urlencoded

productId=1&quantity=1&price=100

# Modify to:
productId=1&quantity=1&price=1
```

Result: Item added to cart at modified price.

### Phase 3: Setting Target Scope

#### Define Scope
Focus testing on specific target:

1. Go to **Target > Site map**
2. Right-click target host in left panel
3. Select **Add to scope**
4. When prompted, click **Yes** to exclude out-of-scope traffic

#### Filter by Scope
Remove noise from HTTP history:

1. Click display filter above HTTP history
2. Select **Show only in-scope items**
3. History now shows only target site traffic

#### Scope Benefits
- Reduces clutter from third-party requests
- Prevents accidental testing of out-of-scope sites
- Improves scanning efficiency
- Creates cleaner reports

### Phase 4: Using Burp Repeater

#### Send Request to Repeater
Prepare request for manual testing:

1. Identify interesting request in HTTP history
2. Right-click request and select **Send to Repeater**
3. Go to **Repeater** tab to access request

#### Modify and Resend
Test different inputs efficiently:

```
1. View request in Repeater tab
2. Modify parameter values
3. Click Send to submit request
4. Review response in right panel
5. Use navigation arrows to review request history
```

#### Repeater Testing Workflow

```
Original Request:
GET /product?productId=1 HTTP/1.1

Test 1: productId=2    → Valid product response
Test 2: productId=999  → Not Found response  
Test 3: productId='    → Error/exception response
Test 4: productId=1 OR 1=1 → SQL injection test
```

#### Analyze Responses
Look for indicators of vulnerabilities:

- Error messages revealing stack traces
- Framework/version information disclosure
- Different response lengths indicating logic flaws
- Timing differences suggesting blind injection
- Unexpected data in responses

### Phase 5: Running Automated Scans

#### Launch New Scan
Initiate vulnerability scanning (Professional only):

1. Go to **Dashboard** tab
2. Click **New scan**
3. Enter target URL in **URLs to scan** field
4. Configure scan settings

#### Scan Configuration Options

| Mode | Description | Duration |
|------|-------------|----------|
| Lightweight | High-level overview | ~15 minutes |
| Fast | Quick vulnerability check | ~30 minutes |
| Balanced | Standard comprehensive scan | ~1-2 hours |
| Deep | Thorough testing | Several hours |

#### Monitor Scan Progress
Track scanning activity:

1. View task status in **Dashboard**
2. Watch **Target > Site map** update in real-time
3. Check **Issues** tab for discovered vulnerabilities

#### Review Identified Issues
Analyze scan findings:

1. Select scan task in Dashboard
2. Go to **Issues** tab
3. Click issue to view:
   - **Advisory**: Description and remediation
   - **Request**: Triggering HTTP request
   - **Response**: Server response showing vulnerability

### Phase 6: Intruder Attacks

#### Configure Intruder
Set up automated attack:

1. Send request to Intruder (right-click > Send to Intruder)
2. Go to **Intruder** tab
3. Define payload positions using § markers
4. Select attack type

#### Attack Types

| Type | Description | Use Case |
|------|-------------|----------|
| Sniper | Single position, iterate payloads | Fuzzing one parameter |
| Battering ram | Same payload all positions | Credential testing |
| Pitchfork | Parallel payload iteration | Username:password pairs |
| Cluster bomb | All payload combinations | Full brute force |

#### Configure Payloads

```
Positions Tab:
POST /login HTTP/1.1
...
username=§admin§&password=§password§

Payloads Tab:
Set 1: admin, user, test, guest
Set 2: password, 123456, admin, letmein
```

#### Analyze Results
Review attack output:

- Sort by response length to find anomalies
- Filter by status code for successful attempts
- Use grep to search for specific strings
- Export results for documentation

## Quick Reference

### Keyboard Shortcuts
| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Forward request | Ctrl+F | Cmd+F |
| Drop request | Ctrl+D | Cmd+D |
| Send to Repeater | Ctrl+R | Cmd+R |
| Send to Intruder | Ctrl+I | Cmd+I |
| Toggle intercept | Ctrl+T | Cmd+T |

### Common Testing Payloads

```
# SQL Injection
' OR '1'='1
' OR '1'='1'--
1 UNION SELECT NULL--

# XSS
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
javascript:alert(1)

# Path Traversal
../../../etc/passwd
..\..\..\..\windows\win.ini

# Command Injection
; ls -la
| cat /etc/passwd
`whoami`
```

### Request Modification Tips
- Right-click for context menu options
- Use decoder for encoding/decoding
- Compare requests using Comparer tool
- Save interesting requests to project

## Constraints and Guardrails

### Operational Boundaries
- Test only authorized applications
- Configure scope to prevent accidental out-of-scope testing
- Rate-limit scans to avoid denial of service
- Document all findings and actions

### Technical Limitations
- Community Edition lacks automated scanner
- Some sites may block proxy traffic
- HSTS/certificate pinning may require additional configuration
- Heavy scanning may trigger WAF blocks

### Best Practices
- Always set target scope before extensive testing
- Use Burp's browser for reliable interception
- Save project regularly to preserve work
- Review scan results manually for false positives

## Examples

### Example 1: Business Logic Testing

**Scenario**: E-commerce price manipulation

1. Add item to cart normally, intercept request
2. Identify `price=9999` parameter in POST body
3. Modify to `price=1`
4. Forward request
5. Complete checkout at manipulated price

**Finding**: Server trusts client-provided price values.

### Example 2: Authentication Bypass

**Scenario**: Testing login form

1. Submit valid credentials, capture request in Repeater
2. Send to Repeater for testing
3. Try: `username=admin' OR '1'='1'--`
4. Observe successful login response

**Finding**: SQL injection in authentication.

### Example 3: Information Disclosure

**Scenario**: Error-based information gathering

1. Navigate to product page, observe `productId` parameter
2. Send request to Repeater
3. Change `productId=1` to `productId=test`
4. Observe verbose error revealing framework version

**Finding**: Apache Struts 2.5.12 disclosed in stack trace.

## Troubleshooting

### Browser Not Connecting Through Proxy
- Verify proxy listener is active (Proxy > Options)
- Check browser proxy settings point to 127.0.0.1:8080
- Ensure no firewall blocking local connections
- Use Burp's embedded browser for reliable setup

### HTTPS Interception Failing
- Install Burp CA certificate in browser/system
- Navigate to http://burp to download certificate
- Add certificate to trusted roots
- Restart browser after installation

### Slow Performance
- Limit scope to reduce processing
- Disable unnecessary extensions
- Increase Java heap size in startup options
- Close unused Burp tabs and features

### Requests Not Being Intercepted
- Verify "Intercept on" is enabled
- Check intercept rules aren't filtering target
- Ensure browser is using Burp proxy
- Verify target isn't using unsupported protocol

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
