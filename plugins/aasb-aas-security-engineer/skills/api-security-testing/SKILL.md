---
name: api-security-testing
description: API security testing workflow for REST and GraphQL APIs covering authentication, authorization, rate limiting, input validation, and security best practices.
metadata:
  aas-category: granular-workflow-bundle
  aas-risk: offensive
  aas-source: personal
  aas-date-added: '2026-02-27'
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

# API Security Testing Workflow

## Overview

Specialized workflow for testing REST and GraphQL API security including authentication, authorization, rate limiting, input validation, and API-specific vulnerabilities.

## When to Use This Workflow

Use this workflow when:
- Testing REST API security
- Assessing GraphQL endpoints
- Validating API authentication
- Testing API rate limiting
- Bug bounty API testing

## Scope and evidence

Select approved phases and test accounts; do not dispatch every listed skill automatically. Use owned fixtures for destructive methods, injections, brute-force, resource exhaustion and deep/complex GraphQL requests. Define request, concurrency, byte and duration limits, stop conditions and cleanup before testing. Keep third-party systems and real customer data out of tests. Public schemas, missing headers and an HTTP success response alone do not prove an authorization flaw or exploitable limit bypass. Record untested endpoints and observed impact instead of checking “all endpoints tested” by assumption.

## Workflow Phases

### Phase 1: API Discovery

#### Skills to Invoke
- `api-fuzzing-bug-bounty` - API fuzzing
- `scanning-tools` - API scanning

#### Actions
1. Enumerate endpoints
2. Document API methods
3. Identify parameters
4. Map data flows
5. Review documentation

#### Copy-Paste Prompts
```
Use @api-fuzzing-bug-bounty to discover API endpoints
```

### Phase 2: Authentication Testing

#### Skills to Invoke
- `broken-authentication` - Auth testing
- `api-security-best-practices` - API auth

#### Actions
1. Test API key validation
2. Test JWT tokens
3. Test OAuth2 flows
4. Test token expiration
5. Test refresh tokens

#### Copy-Paste Prompts
```
Use @broken-authentication to test API authentication
```

### Phase 3: Authorization Testing

#### Skills to Invoke
- `idor-testing` - IDOR testing

#### Actions
1. Test object-level authorization
2. Test function-level authorization
3. Test role-based access
4. Test privilege escalation
5. Test multi-tenant isolation

#### Copy-Paste Prompts
```
Use @idor-testing to test API authorization
```

### Phase 4: Input Validation

#### Skills to Invoke
- `api-fuzzing-bug-bounty` - API fuzzing
- `sql-injection-testing` - Injection testing

#### Actions
1. Test parameter validation
2. Test SQL injection
3. Test NoSQL injection
4. Test command injection
5. Test XXE injection

#### Copy-Paste Prompts
```
Use @api-fuzzing-bug-bounty to fuzz API parameters
```

### Phase 5: Rate Limiting

#### Skills to Invoke
- `api-security-best-practices` - Rate limiting

#### Actions
1. Test rate limit headers
2. Test brute force protection
3. Test resource exhaustion
4. Test bypass techniques
5. Document limitations

#### Copy-Paste Prompts
```
Use @api-security-best-practices to test rate limiting
```

### Phase 6: GraphQL Testing

#### Skills to Invoke
- `api-fuzzing-bug-bounty` - GraphQL fuzzing

#### Actions
1. Test introspection
2. Test query depth
3. Test query complexity
4. Test batch queries
5. Test field suggestions

#### Copy-Paste Prompts
```
Use @api-fuzzing-bug-bounty to test GraphQL security
```

### Phase 7: Error Handling

#### Skills to Invoke
- `api-security-best-practices` - Error handling

#### Actions
1. Test error messages
2. Check information disclosure
3. Test stack traces
4. Verify logging
5. Document findings

#### Copy-Paste Prompts
```
Use @api-security-best-practices to audit API error handling
```

## API Security Checklist

- [ ] Authentication working
- [ ] Authorization enforced
- [ ] Input validated
- [ ] Rate limiting active
- [ ] Errors sanitized
- [ ] Logging enabled
- [ ] CORS configured
- [ ] HTTPS enforced

## Quality Gates

- [ ] All endpoints tested
- [ ] Vulnerabilities documented
- [ ] Remediation provided
- [ ] Report generated

## Related Workflow Bundles

- `security-audit` - Security auditing
- `web-security-testing` - Web security
- `api-design-principles` - API contract design

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
