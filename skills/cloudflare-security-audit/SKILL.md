---
name: cloudflare-security-audit
description: Systematic end-to-end security audit for any codebase. Orchestrates reconnaissance, feature-mapped attack discovery, and structured JSON reporting.
license: MIT
metadata:
  security:
    risk: critical
  category: security
  author: cloudflare
  version: 1.0.0
---

# Cloudflare Security Audit Skill

Systematic end-to-end security audit for any codebase.

## How This Skill Works

The Security Audit skill orchestrates a complete security assessment through six phases:

1. **Reconnaissance** — Identify all technologies, frameworks, languages, and dependencies in the target codebase. Generate a machine-readable `RECON.json` manifest.
2. **Hunting** — Apply the ATTACK_PLAYBOOK.md to discover features, data flows, and trust boundaries. Build the FEATURE_INDEX.md.
3. **Attack Classification** — Map each discovered feature to specific attack classes (A1-A14 from the skill's ATTACK-CLASSES.md).
4. **Evidence Collection** — For each attack class, execute a tailored audit script. Collect evidence (file, line, snippet, severity).
5. **Validation** — Deduplicate findings, validate with tests or PoCs, remove false positives.
6. **Reporting** — Generate a structured JSON report (`SECURITY_AUDIT.json`) and optional markdown summary.

## When to Use This Skill

- Code review before merge (especially for security-sensitive changes)
- Periodic security audits of production codebases
- Onboarding new codebases to understand attack surface
- Compliance readiness (SOC 2, ISO 27001, PCI-DSS)
- Incident response — understand blast radius of a vulnerability

## What This Skill Produces

A structured `SECURITY_AUDIT.json` file containing:
- Executive summary (risk score, finding counts by severity)
- Per-finding details: attack class, file, line, snippet, severity, OWASP/CWE mapping
- Evidence references (PoCs, test results)
- Remediation recommendations

## Architecture

This skill uses a **companion-file** pattern rather than monolithic SKILL.md embedding:

- `SKILL.md` (this file) — Workflow orchestration and phase definitions
- `ATTACK_PLAYBOOK.md` — The complete attack playbook with all attack classes
- `RECONNAISSANCE.md` — Detailed reconnaissance phase instructions
- `HUNTING.md` — Feature-mapped attack discovery methodology
- `ATTACK-CLASSES.md` — Attack class definitions (A1-A14)
- `MEMORY-SAFETY-AND-BINARY.md` — Memory safety and binary audit patterns
- `AI-AND-LLM.md` — AI and LLM-specific attack patterns
- `WEB-PROTOCOL-AND-AUTH.md` — Web protocol and authentication attack patterns
- `CLIENT-SIDE.md` — Client-side vulnerability patterns
- `VALIDATION-AND-REPORTING.md` — Evidence validation and report generation
- `report-schema.json` — JSON schema for the audit report
- `validate-findings.cjs` — Validation script for the report

## Phase Details

### Phase 1: Reconnaissance
Read `RECONNAISSANCE.md` for detailed instructions. Key outputs:
- Technology stack identification
- Entry point discovery (HTTP handlers, CLI commands, etc.)
- Data flow mapping
- Trust boundary identification
- `RECON.json` manifest generation

### Phase 2: Hunting
Read `HUNTING.md` for the feature-mapped attack discovery methodology. Key outputs:
- `FEATURE_INDEX.md` — All features mapped to potential attack classes
- Data flow diagrams
- Trust boundary analysis

### Phase 3: Attack Classification
Read `ATTACK-CLASSES.md` for the 14 attack classes (A1-A14). Each class includes:
- Description and examples
- Audit script (bash command to execute)
- Severity determination criteria
- OWASP/CWE mapping

### Phase 4: Evidence Collection
For each attack class in the FEATURE_INDEX.md:
1. Execute the audit script
2. Collect evidence: file path, line number, code snippet, severity
3. Map to OWASP Top 10 and CWE categories

### Phase 5: Validation
Read `VALIDATION-AND-REPORTING.md` for validation procedures:
- Deduplication of findings
- False positive removal
- Severity normalization
- Evidence verification (tests, PoCs)

### Phase 6: Reporting
Read `VALIDATION-AND-REPORTING.md` for report generation:
- Generate `SECURITY_AUDIT.json` following `report-schema.json`
- Optional markdown summary
- Executive summary with risk score

## Critical Rules

1. **NEVER skip reconnaissance** — You MUST complete Phase 1 before any attack analysis
2. **NEVER guess attack classes** — You MUST use the ATTACK_PLAYBOOK.md definitions
3. **NEVER report without evidence** — Every finding requires file + line + snippet
4. **NEVER skip validation** — Every finding must be validated before reporting
5. **NEVER invent vulnerabilities** — Only report what the evidence proves
6. **NEVER expose secrets** — Redact all credentials, tokens, keys from findings
7. **NEVER run destructive tests** — All audit scripts must be read-only or non-destructive
8. **NEVER skip the schema validation** — The final report MUST validate against `report-schema.json`

## Severity Levels

- **CRITICAL**: Remote code execution, SQL injection, authentication bypass, SSRF leading to RCE
- **HIGH**: Privilege escalation, stored XSS,XXE, deserialization attacks, path traversal to sensitive files
- **MEDIUM**: Reflected XSS, CSRF on sensitive operations, information disclosure, weak cryptography
- **LOW**: Missing security headers, verbose errors, minor information leaks, cookie flags
- **INFO**: Best practice recommendations, defense-in-depth suggestions, configuration improvements

## OWASP Top 10 2021 Mapping

| OWASP | Attack Classes |
|-------|----------------|
| A01:Broken Access Control | A5, A6, A10 |
| A02:Cryptographic Failures | A4 |
| A03:Injection | A1, A2, A7 |
| A04:Insecure Design | A3 |
| A05:Security Misconfiguration | A8 |
| A06:Vulnerable Components | A9 |
| A07:Auth Failures | A5 |
| A08:Data Integrity Failures | A11 |
| A09:Logging Failures | A12 |
| A10:SSRF | A14 |

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same file or function being reviewed more than twice
- Identical findings being generated repeatedly
- The audit process restarting from Phase 1 without new input
- Circular references in the codebase analysis

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
