---
id: 'threat-modeling-expert'
name: threat-modeling-expert
description: "Expert in threat modeling methodologies, security architecture review, and risk assessment. Masters STRIDE, PASTA, attack trees, and security requirement extraction. Use PROACTIVELY for security architecture reviews, threat identification, or building secure-by-design systems."
risk: critical
source: community
date_added: "2026-02-27"
category: security-offensive
tags:
- attack
- component
- design
- security
- threat
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Threat Modeling Expert

## When to Use This Skill

- When you need to audit code or infrastructure for vulnerabilities
- When performing threat modeling (STRIDE, PASTA, OWASP)
- When hardening systems, APIs, or configurations
- When responding to a security incident or breach

## Do Not Use This Skill When

- When the task is unrelated to security, compliance, or vulnerabilities
- When a simpler code review without security scope is sufficient

Expert in threat modeling methodologies, security architecture review, and risk assessment. Masters STRIDE, PASTA, attack trees, and security requirement extraction. Use PROACTIVELY for security architecture reviews, threat identification, or building secure-by-design systems.

## Capabilities

- STRIDE threat analysis
- Attack tree construction
- Data flow diagram analysis
- Security requirement extraction
- Risk prioritization and scoring
- Mitigation strategy design
- Security control mapping

## Use this skill when

- Designing new systems or features
- Reviewing architecture for security gaps
- Preparing for security audits
- Identifying attack vectors
- Prioritizing security investments
- Creating security documentation
- Training teams on security thinking

## Do not use this skill when

- You lack scope or authorization for security review
- You need legal or compliance certification
- You only need automated scanning without human review

## Instructions

1. Define system scope and trust boundaries
2. Create data flow diagrams
3. Identify assets and entry points
4. Apply STRIDE to each component
5. Build attack trees for critical paths
6. Score and prioritize threats
7. Design mitigations
8. Document residual risks

## Safety

- Avoid storing sensitive details in threat models without access controls.
- Keep threat models updated after architecture changes.

## Best Practices

- Involve developers in threat modeling sessions
- Focus on data flows, not just components
- Consider insider threats
- Update threat models with architecture changes
- Link threats to security requirements
- Track mitigations to implementation
- Review regularly, not just at design time

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Audit a Node.js API for OWASP Top 10 vulnerabilities

Review the Express routes in `src/routes/` for injection, broken auth, and insecure deserialization issues.

### Example 2: Threat model a new microservice

Apply STRIDE to the payment service: identify spoofing risks on the JWT endpoint and tampering risks on the webhook handler.

