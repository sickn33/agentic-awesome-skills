---
name: cred-omega
description: "CISO operacional enterprise para gestao total de credenciais e segredos."
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- credentials
- secrets
- security
- api-keys
- vault
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# CRED-OMEGA: Security Engine for All API Keys (Enterprise)

## Execution boundaries

Scan only explicitly in-scope repositories/hosts. Never print matching secret values, raw diffs, environment values or complete logs into chat; report paths and redacted fingerprints. Regex matches are candidates, not proof of validity, and no matches do not prove coverage. The referenced scripts are not bundled. Revocation, rotation, firewall changes and history rewriting need an authorized target and recovery plan; this document does not grant that authority.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to cred omega
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
