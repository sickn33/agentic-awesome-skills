---
name: find-bugs
description: Find bugs, security vulnerabilities, and code quality issues in local branch changes. Use when asked to review changes, find bugs, security review, or audit code on the current branch.
risk: critical
source: community
date_added: "2026-01-30"
---

# Find Bugs

Review changes on this branch for bugs, security vulnerabilities, and code quality issues.

## When to Use
- You need a review focused on bugs, security issues, or risky code changes.
- The task involves auditing the current branch diff rather than implementing new behavior.
- You want a structured review process with checklist-driven verification against changed files.

## Phase 1: Complete Input Gathering

1. Establish the requested base and head as verified commit SHAs. Check the remote/default branch if needed; do not assume a stale local branch is current. Read the full branch diff with `git diff "$BASE_SHA...$HEAD_SHA" --`, using validated refs in separately quoted arguments. Include staged and unstaged changes when they are in scope; preserve the checkout.
2. If output is truncated, read each changed file individually until you have seen every changed line
3. List all files modified in this branch before proceeding

## Phase 2: Attack Surface Mapping

For each changed file, identify and list:

* All user inputs (request params, headers, body, URL components)
* All database queries
* All authentication/authorization checks
* All session/state operations
* All external calls
* All cryptographic operations

## Phase 3: Security Checklist (check EVERY item for EVERY file)

* [ ] **Injection**: SQL, command, template, header injection
* [ ] **XSS**: All outputs in templates properly escaped?
* [ ] **Authentication**: Auth checks on all protected operations?
* [ ] **Authorization/IDOR**: Access control verified, not just auth?
* [ ] **CSRF**: State-changing operations protected?
* [ ] **Race conditions**: TOCTOU in any read-then-write patterns?
* [ ] **Session**: Fixation, expiration, secure flags?
* [ ] **Cryptography**: Secure random, proper algorithms, no secrets in logs?
* [ ] **Information disclosure**: Error messages, logs, timing attacks?
* [ ] **DoS**: Unbounded operations, missing rate limits, resource exhaustion?
* [ ] **Business logic**: Edge cases, state machine violations, numeric overflow?

## Phase 4: Verification

For each potential issue:

* Check if it's already handled elsewhere in the changed code
* Search for existing tests covering the scenario
* Read surrounding context to verify the issue is real

## Phase 5: Pre-Conclusion Audit

Before finalizing, you MUST:

1. List every file you reviewed and confirm you read it completely
2. List each applicable checklist item as a finding, verified within the reviewed scope, not applicable, or unverified; absence of a finding is not proof of security
3. List any areas you could NOT fully verify and why
4. Only then provide your final findings

## Output Format

**Prioritize**: security vulnerabilities > bugs > code quality

**Skip**: stylistic/formatting issues

For each issue:

* **File:Line** - Brief description
* **Severity**: Critical/High/Medium/Low
* **Problem**: What's wrong
* **Evidence**: Concrete trigger, reachable path and observed or reasoned impact; missing tests alone do not prove a bug
* **Fix**: Concrete suggestion
* **References**: OWASP, RFCs, or other standards if applicable

If you find nothing significant, say so - don't invent issues.

For a review-only request, report findings without changing code. An explicit combined review-and-fix request authorizes scoped repairs and verification; preserve the distinction between findings and completed fixes.

## Example

**User request:**

> Review the current branch diff for real bugs, security issues, and regressions, citing exact files and lines.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
