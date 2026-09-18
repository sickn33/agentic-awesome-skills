---
name: security-scanning-security-sast
description: 'Static Application Security Testing (SAST) for code vulnerability

  analysis across multiple languages and frameworks

  '
risk: critical
source: community
date_added: '2026-02-27'
---
# SAST Security Plugin

Static Application Security Testing (SAST) for comprehensive code vulnerability detection across multiple languages, frameworks, and security patterns.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Use this skill when

Use for code review security analysis, injection vulnerabilities, hardcoded secrets, framework-specific patterns, custom security policy enforcement, pre-deployment validation, legacy code assessment, and compliance (OWASP, PCI-DSS, SOC2).

**Specialized tools**: Use `security-secrets.md` for advanced credential scanning, `security-owasp.md` for Top 10 mapping, `security-api.md` for REST/GraphQL endpoints.

## Do not use this skill when

- You only need runtime testing or penetration testing
- You cannot access the source code or build outputs
- The environment forbids third-party scanning tools

## Safety

- Avoid uploading proprietary code to external services without approval.
- Require review before enabling auto-fix or blocking releases.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
