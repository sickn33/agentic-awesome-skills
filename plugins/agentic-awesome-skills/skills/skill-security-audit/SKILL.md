---
name: skill-security-audit
description: "Audit an Agent Skill, MCP server, connector, or desktop extension before installation by tracing code, dependencies, permissions, credentials, data flow, and irreversible actions."
category: security
risk: safe
source: community
source_repo: sandbaseai/awesome-workbuddy
source_type: community
date_added: "2026-09-05"
author: sandbaseai
tags: [security, audit, agent-skills, mcp, supply-chain]
tools: [claude, codex, cursor, gemini, workbuddy]
license: "CC0-1.0"
license_source: "https://github.com/sandbaseai/awesome-workbuddy/blob/main/LICENSE"
---

# Skill Security Audit

## Overview

Review a third-party Agent Skill, MCP server, connector, or desktop extension before installation. The default workflow is read-only: do not install dependencies, execute project code, sign in, provide credentials, or connect the project to a real account during static review.

## When to Use This Skill

- Use before installing an unfamiliar Skill, MCP server, connector, plugin, or desktop extension.
- Use when a project handles files, credentials, browser sessions, external accounts, network requests, or destructive actions.
- Use when a release, binary, dependency, or remote installer cannot be independently verified.

## How It Works

1. Record the exact repository, revision or release, license, archive status, latest meaningful update, and files reviewed. State any scope limitation.
2. Read the complete `SKILL.md` or equivalent instructions and every file it directly invokes. Follow references to scripts, hooks, manifests, package-install steps, binaries, remote URLs, environment variables, and bundled assets.
3. Inventory capabilities: filesystem access, command execution, network access, browser control, account actions, publishing, messaging, deletion, payment, credential access, persistence, and self-update behavior.
4. Trace sensitive data from its source to local stores, subprocesses, logs, models, APIs, MCP servers, analytics services, and other network destinations. Missing documentation is an unresolved question, not proof that data stays local.
5. Inspect dependency manifests, lockfiles, install scripts, and release provenance. Note unpinned remote execution, broad dependencies, opaque binaries, and mismatches between source and distributed artifacts.
6. Separate confirmed findings from contextual risks and unanswered questions. Cite file paths, line numbers, configuration fields, commands, or primary documentation for every material claim.
7. Propose a minimal-permission test using disposable data or accounts; do not run it without explicit user approval.

## Output

Begin with the audited identity and one verdict:

- **Lower observed risk**: no material concern was found in the reviewed scope; this is not a guarantee.
- **Review required**: important behavior, provenance, permissions, or data flow remains unclear.
- **High observed risk**: confirmed behavior could expose sensitive data, weaken account or device security, cause irreversible action, or bypass informed control.

Then provide:

1. Scope and limitations.
2. A capability and permission table.
3. A data-flow table.
4. Findings ordered by severity, with evidence, impact, and mitigation.
5. Unanswered questions.
6. A minimal-permission test plan.

## Examples

### Example 1: A local, read-only Skill

Input: a repository containing only `SKILL.md` and Markdown references, with no scripts, dependencies, credentials, or network instructions.

Report: record the reviewed revision and files, mark command/network/credential capabilities as not observed in scope, note any missing license or provenance evidence, and recommend a disposable-data trial only if the remaining questions are resolved.

### Example 2: An MCP server with a token

Input: a server whose setup reads `API_TOKEN` and whose tools can create or delete records.

Report: trace the token and request destinations, classify the write/delete capability separately from read access, require a least-privilege test account and action-time confirmation, and do not run the server with production credentials during review.

## Best Practices

- ✅ Prefer implementation and current primary documentation over badges, screenshots, descriptions, or popularity.
- ✅ Pin revisions and inspect manifests, lockfiles, checksums, and release provenance.
- ✅ Use disposable data, least privilege, localhost binding, dry runs, backups, confirmation gates, and rollback where applicable.
- ✅ Mark unknown behavior explicitly and preserve the exact reviewed revision.
- ❌ Do not call a project safe, malicious, official, or compliant without evidence for that claim.
- ❌ Do not execute install commands, remote scripts, binaries, account actions, or credential flows during static review.

## Security & Safety Notes

Static review cannot prove runtime behavior or the contents of an opaque remote service. Treat a green validator, marketplace entry, star count, or successful installation as evidence about only that narrow property, never as a safety certificate. Stop if the requested review would require real credentials, production data, or an unapproved external action.

## Limitations

- The audit is evidence-led but bounded by the public revision and files that can be inspected.
- A missing policy or undocumented data destination remains unresolved; it must not be silently inferred away.
- Risk severity depends on capability, exposure, control, and reversibility, not on keywords alone.
