---
name: mcp-dependency-drift-audit
description: "Statically audit MCP configs for mutable npm/npx package references before approval or CI, without executing discovered MCP servers."
category: security
risk: safe
source: "https://github.com/tomelias10/mcp-drift-check"
source_repo: tomelias10/mcp-drift-check
source_type: community
date_added: "2026-09-25"
author: tomelias10
tags: [mcp, ai-security, supply-chain, devsecops, sarif]
tools: [claude, cursor, gemini, codex, windsurf]
license: MIT
license_source: "https://github.com/tomelias10/mcp-drift-check/blob/v0/LICENSE"
---

# MCP Dependency Drift Audit

## Overview

Audit Model Context Protocol configuration files for npm/npx package references that can resolve to different code after the configuration was reviewed. The workflow is deliberately static: it reads config text, classifies version selectors, and recommends reproducibility fixes without starting discovered MCP servers.

Dependency mutability is a review-boundary signal, not proof that a package is malicious, vulnerable, or compromised.

## When to Use This Skill

- Before approving `.mcp.json`, Cursor, VS Code, GitHub Copilot, Claude, or Windsurf MCP configuration.
- When adding an MCP configuration gate to pull requests or CI.
- During an AI-agent security review where npm/npx-backed MCP servers are configured.
- When checking whether a previously reviewed MCP config can silently resolve to newer package code.

## How It Works

### Step 1: Locate and read MCP configs without executing them

Inspect known project paths such as `.mcp.json`, `.github/mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, and `.windsurf/mcp.json`, plus any MCP config explicitly supplied by the user.

Read them as text/JSON only. Never run a discovered `command` or `args` value as part of this audit. Stay inside the requested workspace by default; only include user-level/global MCP configuration if the user explicitly asks for machine-wide scope.

### Step 2: Use MCP Drift Check when already available

If `mcp-drift-check` is already installed, use the workspace-scoped mode from the intended repo root:

```bash
mcp-drift-check scan-workspace --markdown
```

For CI evidence:

```bash
mcp-drift-check scan-workspace --sarif mcp-drift.sarif --markdown
```

If the scanner is not installed, explain that the following command fetches the open-source scanner from GitHub and get user approval before running it:

```bash
uvx --from git+https://github.com/tomelias10/mcp-drift-check mcp-drift-check scan-workspace --markdown
```

If the user declines network access or installation, continue with the manual rules below.

### Step 3: Apply the manual static rules

For npm/npx-style package selectors:

| Selector | Classification | Reason |
| --- | --- | --- |
| `package@1.2.3` | SAFE | Exact package version is reproducible. |
| bare `package` or `@scope/package` | HIGH | A later resolution can select different package code. |
| `package@latest` | HIGH | The selector is explicitly mutable. |
| `package@^1.2.0`, `~1.2.0`, `>=1.2.0`, wildcard | MEDIUM | Resolution can change within the allowed range. |
| local path, script, binary, unknown executable | REVIEW | npm version-drift rules do not establish update behavior. |

Treat `-y` / `--yes` as context only. It suppresses interactive confirmation but is not a vulnerability by itself.

### Step 4: Recommend remediation without inventing versions

For mutable npm/npx references, recommend pinning to an exact version that the team has actually reviewed and then updating that pin deliberately.

Do not guess the version to pin. If registry lookup is needed, explain that it requires network access and ask before querying it.

Pinning improves reproducibility. It does not establish package provenance, vulnerability status, authorization safety, prompt-injection resistance, or runtime isolation.

### Step 5: Produce a bounded report

Return:

| Config | MCP server | Package/reference | Classification | Why | Recommended next step |
| --- | --- | --- | --- | --- | --- |

Then state:

- No MCP servers were executed during the audit.
- Mutable dependency references are review/reproducibility signals, not breach claims.
- A clean dependency-drift result is not a complete MCP security assessment.

## Examples

### Example 1: Audit before approval

**User:** `Audit this repo's MCP config before we approve it. Do not run any MCP servers.`

**Expected shape:**

```text
.mcp.json | browser | @example/browser-mcp@latest | HIGH
Reason: @latest can resolve to different package code later.
Next step: pin the exact version your team reviews and update it deliberately.

No MCP servers were executed.
```

### Example 2: Add a CI gate

For GitHub Actions:

```yaml
- uses: actions/checkout@v4
- uses: tomelias10/mcp-drift-check@v0
```

MCP Drift Check can also emit SARIF 2.1.0 for GitHub Code Scanning. The action defaults to workspace-only discovery; machine-wide user-level scanning remains an explicit `scan-all` choice.

## Best Practices

- ✅ Read config text only during discovery and classification.
- ✅ Keep the default scope to the requested workspace/repository.
- ✅ Separate reproducibility findings from vulnerability or compromise claims.
- ✅ Pin only a version the team has actually reviewed.
- ✅ Keep sensitive config values out of reports and public issues.
- ❌ Do not execute server commands found in a config to "verify" a static finding.
- ❌ Do not treat a clean result as a general MCP security guarantee.

## Limitations

- This workflow only covers dependency mutability/review drift for package-backed MCP configuration.
- It does not assess prompt injection, tool poisoning, OAuth/authorization, server implementation flaws, malware, provenance, or runtime sandboxing.
- Local executables and non-npm launch paths require separate review.
- A static config can be reproducible and still unsafe for other reasons.

## Security & Safety Notes

- The default workflow is read-only, local, and workspace-scoped.
- Never execute discovered MCP server commands during this audit.
- Never include credentials, tokens, private headers, or secret values in the output.
- The optional `uvx` path makes a network fetch from the declared GitHub source; obtain user approval before running it.
- If deeper active testing is requested, stop and establish explicit authorization and scope before any intrusive action.

## Common Pitfalls

- **Problem:** Calling an unpinned dependency a vulnerability.
  **Solution:** Describe it as a reproducibility/review-drift signal unless separate evidence establishes security impact.
- **Problem:** Pinning to today's registry version without knowing what was reviewed.
  **Solution:** Ask for the reviewed version or, with approval, reconstruct relevant package history; do not guess.
- **Problem:** Treating `-y` as the core finding.
  **Solution:** Report it only as context; the version selector determines the dependency-drift classification.
- **Problem:** Scanning user-level MCP configs when the user only asked about one repo.
  **Solution:** Use `scan-workspace` by default; use `scan-all` only when machine-wide scope is explicit.

## Related Skills

- `@mcp-server-security` - Broader MCP server hardening, authentication, authorization, transport, and runtime controls.
- `@supply-chain-security` - Broader software supply-chain assessment beyond MCP configuration.
- `@sast-scanning` - Static application-security analysis for source code rather than MCP launch configuration.

## Additional Resources

- [MCP Drift Check stable v0](https://github.com/tomelias10/mcp-drift-check/tree/v0) - MIT zero-execution scanner, GitHub Action, workspace-scoped mode, and SARIF output.
- [Public MCP dependency drift examples](https://site-creator-vinext-starter.surfaceproof.workers.dev/research/mcp-dependency-drift) - Commit-specific public configuration examples and methodology limitations.
