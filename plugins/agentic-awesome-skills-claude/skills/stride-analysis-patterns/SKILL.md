---
name: stride-analysis-patterns
description: "Apply STRIDE methodology to systematically identify threats. Use when analyzing system security, conducting threat modeling sessions, or creating security documentation."
risk: safe
source: community
date_added: "2026-02-27"
---

# STRIDE Analysis Patterns

Systematic threat identification using the STRIDE methodology.

## Use this skill when

- Starting new threat modeling sessions
- Analyzing existing system architecture
- Reviewing security design decisions
- Creating threat documentation
- Training teams on threat identification
- Compliance and audit preparation

## Do not use this skill when

- The task is unrelated to stride analysis patterns
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

## Modeling and scoring limits

The Python helpers produce prompts from user-supplied model data; they do not inspect software or establish actual vulnerabilities, control effectiveness or compliance. Impact×likelihood and all severities/deadlines in examples are illustrative ordinal policy choices, not CVSS or calibrated probabilities. Record evidence, assumptions, assets, trust boundaries, owners and residual-risk acceptance for each candidate. Equal numeric trust levels can still cross tenant/identity/administrative boundaries; model explicit boundary membership rather than relying solely on inequality. Encryption does not prevent authorized-but-abusive access, and authentication lockouts can create denial-of-service risks. Missing elements or unmodeled interaction types must be surfaced, not silently treated as no threats. Templates are partial independent blocks; validate imports, duplicate IDs and structured model inputs before use. Keep secret-bearing diagrams/logs private and do not run attack simulations without separate authorization.
