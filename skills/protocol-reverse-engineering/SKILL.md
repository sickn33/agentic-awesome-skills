---
id: 'protocol-reverse-engineering'
name: protocol-reverse-engineering
description: "Comprehensive techniques for capturing, analyzing, and documenting network protocols for security research, interoperability, and debugging."
risk: safe
source: community
date_added: "2026-02-27"
category: security-offensive
tags:
- ai
- ci
- security
- test
- testing
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Protocol Reverse Engineering

## When to Use This Skill

- When you need to audit code or infrastructure for vulnerabilities
- When performing threat modeling (STRIDE, PASTA, OWASP)
- When hardening systems, APIs, or configurations
- When responding to a security incident or breach

## Do Not Use This Skill When

- When the task is unrelated to security, compliance, or vulnerabilities
- When a simpler code review without security scope is sufficient

Comprehensive techniques for capturing, analyzing, and documenting network protocols for security research, interoperability, and debugging.

## Use this skill when

- Working on protocol reverse engineering tasks or workflows
- Needing guidance, best practices, or checklists for protocol reverse engineering

## Do not use this skill when

- The task is unrelated to protocol reverse engineering
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Audit a Node.js API for OWASP Top 10 vulnerabilities

Review the Express routes in `src/routes/` for injection, broken auth, and insecure deserialization issues.

### Example 2: Threat model a new microservice

Apply STRIDE to the payment service: identify spoofing risks on the JWT endpoint and tampering risks on the webhook handler.

