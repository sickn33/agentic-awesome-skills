---
name: cyber-audit
description: "Run read-only exposure checks for security advisories and write a structured local audit report."
category: security
risk: safe
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [security, audit, read-only]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
disable-model-invocation: true
---

# cyber-audit

## When to Use

- Use when the user asks whether their machine or projects are affected by a CVE, breach, or package advisory.
- Use when a read-only local security exposure report is appropriate.

## Hard rules

- **Read-only.** No installs, removes, upgrades, restarts, network calls, or file modifications outside `~/Documents/security-audits/`.
- **No `sudo`.** Never.
- **One report per invocation.** Always end by writing the `.md` file (even if the verdict is "Not affected" — the audit trail matters).
- If a check requires a state-changing command, **skip it and note "not checked (would require state change)"** in the table. Do not run it.

## Workflow

1. **Identify scope.** Extract from the advisory: package/binary name, affected versions, platform (macOS / Linux / Windows), attack vector (supply chain / RCE / local / network).
2. **Run checks in parallel** (Bash tool, multiple calls in one message). Pick relevant checks for the advisory type — don't run all of them.
3. **Build the table** as you go. Each row = one check + concrete result (version number, path, "None", "N/A").
4. **Write the report** to `~/Documents/security-audits/YYYY-MM-DD-<short-kebab-slug>.md`. Use today's date from the environment header.
5. **Tell the user** the verdict in one line + path to the report.

The advisory must be provided or already available locally under this no-network contract; mark currency unverified if a live authoritative lookup is unavailable. Search only user-authorized project/install roots, not the whole home directory by default. Use filename-safe NUL transport for find/xargs or rg file lists; do not substitute untrusted package names as shell syntax. Never dump environment/config lines or process arguments that can contain credentials; report sanitized paths/versions/booleans. Do not invoke an untrusted/suspected compromised binary just to ask its version.

## Check menu (pick what's relevant)

```bash
# --- Node / npm ecosystem (supply-chain advisories) ---
which npm pnpm yarn; npm root -g; pnpm root -g 2>/dev/null
ls /opt/homebrew/lib/node_modules                                  # global npm
find ~ -maxdepth 8 -type d -name "<pkg>" 2>/dev/null \
  | grep -v -E "(Library/Caches|\.Trash)"                          # installed copies
find ~/Documents ~/Desktop ~/Downloads -maxdepth 8 -type f \
  \( -name "package.json" -o -name "package-lock.json" \
     -o -name "pnpm-lock.yaml" -o -name "yarn.lock" \) 2>/dev/null \
  | xargs grep -l "<pkg>" 2>/dev/null                              # direct + transitive

# --- Python ecosystem ---
which python3 pip pipx uv
pip list 2>/dev/null | grep -i "<pkg>"
find ~/Documents -maxdepth 6 -name "requirements*.txt" -o -name "pyproject.toml" \
  -o -name "poetry.lock" -o -name "uv.lock" 2>/dev/null | xargs grep -l "<pkg>" 2>/dev/null

# --- Homebrew / system binaries ---
brew list --versions <formula> 2>/dev/null
which <binary>; <binary> --version 2>/dev/null

# --- Running processes / listeners (for RCE / network CVEs) ---
pgrep -lf "<binary>"
lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep "<port>"

# --- LaunchAgents / LaunchDaemons (persistence / autostart) ---
ls ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null \
  | grep -i "<vendor>"

# --- Env vars that change exposure (e.g. OLLAMA_HOST, listening addr) ---
launchctl getenv <VAR>; grep -r "<VAR>" ~/.zshrc ~/.zprofile ~/.config 2>/dev/null

# --- VS Code / browser extensions (for IDE-targeted advisories) ---
ls ~/.vscode/extensions 2>/dev/null | grep -i "<ext>"
```

If the advisory mentions an ecosystem not above (Rust cargo, Go modules, Ruby gems, Docker images, etc.), apply the same pattern: global install path + manifest grep + running processes.

## Report template

File: `~/Documents/security-audits/YYYY-MM-DD-<short-kebab-slug>.md`

```markdown
# <Subject> — Audit

**Date:** YYYY-MM-DD
**Host:** the user's Mac

## <CVEs | Advisory> in scope

- **<ID or source> "<Name>"** — <one-line description>. <Affected versions or scope>.

## Audit results

| Check | Result |
|---|---|
| <Check 1> | <Result> |
| <Check 2> | <Result> |

## Verdict

**<Not observed in checked scope. | Affected. | Mitigated exposure. | Inconclusive.>**

- <Rationale bullet 1>
- <Rationale bullet 2>

## Action taken

Diagnostic only; this report was written, no other files modified, no <packages installed/removed | services started/stopped | firewall rules changed>.

## Follow-ups

- <Actionable item, or "None" if truly nothing>
```

Use terse, factual language while preserving uncertainty. Do not assume example reports exist or read unrelated private reports merely to imitate style.

## Verdict wording

- **Not observed in checked scope.** — absent/patched within the explicitly searched paths; state coverage gaps. A stopped process alone does not prove absence of vulnerability.
- **Affected.** — vulnerable version present *and* reachable by the attack vector.
- **Mitigated exposure.** — affected version present with an observed mitigation; stopped services or loopback listeners may still be reachable by another attack path. State conditions and gaps.
- **Inconclusive.** — advisory/version/coverage evidence missing. Do not infer safety from empty output or suppressed errors.

## When to break the read-only rule

Never on your own. If the verdict is "Affected", list the remediation command in **Follow-ups** and stop. The user runs it.

## Reference

Two existing reports in `~/Documents/security-audits/` show the expected style:
- `baseline-audit.md` (long-form baseline audit — different format, do not mimic)
- `YYYY-MM-DD-example-advisory.md` and any newer `YYYY-MM-DD-*.md` files (this is the format to match)

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
