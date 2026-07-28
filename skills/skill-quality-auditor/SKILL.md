---
name: skill-quality-auditor
description: Audit any SKILL.md file for quality, completeness, and reliability. Use when reviewing community skills before installing, evaluating whether a skill is thin or outdated, or preparing a skill for contribution to agentic-awesome-skills.
category: meta
risk: safe
source: community
source_type: community
date_added: "2026-07-28"
author: sickn33-contributor
tags: [skill-review, quality, audit, aas, meta]
tools: [claude, codex, gemini, cursor, antigravity]
---

# Skill Quality Auditor

## Overview

The AAS catalog has 2,000+ community skills — quality varies widely. Some are excellent,
battle-tested playbooks. Others are thin stubs, outdated, or outright wrong.

This skill gives the agent a structured rubric to **audit any SKILL.md before trusting it**,
so you don't install and rely on a bad skill without knowing it.

Use it when:
- Evaluating a community skill before installing
- Reviewing a skill PR before merging
- Spot-checking skills in your local catalog
- Validating your own skill before contributing

---

## When to Use This Skill

- Use when you find a skill and want to know if it's trustworthy
- Use when a skill produces wrong or inconsistent agent behavior
- Use before accepting a skill PR contribution
- Use when a skill hasn't been updated in 6+ months
- Use when the skill description and body don't match what it actually does

---

## Audit Rubric (7 Dimensions)

Run each dimension. Score: ✅ Pass / ⚠️ Warn / ❌ Fail.

### 1. Frontmatter Completeness
Check required fields exist and are not placeholder values:
```
✅ name        — slug-style, matches folder name
✅ description — one meaningful sentence (not "TODO" or blank)
✅ category    — valid category (development/security/testing/infra/etc.)
✅ risk        — one of: safe | low | medium | high | critical
✅ date_added  — valid ISO date
✅ tags        — at least 2 relevant tags
✅ tools       — at least one supported tool listed
```
Flag: missing fields, generic descriptions like "helps with coding", stale dates (>18 months).

### 2. Trigger Precision
Read the `description` field. Ask:
- Does it say **when** to invoke the skill?
- Would an agent reading 20 skills pick this one for the right task?
- Does it avoid being so broad it fires on everything?

```
✅ Good: "Audit REST API endpoints for OWASP Top 10 vulnerabilities"
❌ Bad:  "Helps with APIs"
❌ Bad:  "A skill for developers"
```

### 3. Body Depth Gate
The SKILL.md body must have more than a title and a paragraph. Check for:
```
✅ Concrete steps or workflow (not just aspirational text)
✅ At least one example (code block, command, or sample output)
✅ At least one best practice or pitfall
✅ Clear success condition — agent knows when it's done
❌ Warn if body < 40 lines
❌ Fail if no examples at all
❌ Fail if body is only marketing text with no actionable instructions
```

### 4. Safety & Risk Alignment
If the skill involves:
- Shell commands → must document failure modes and reversibility
- Network calls → must specify what data leaves the machine
- Credential access → must have explicit credential handling guidance
- File mutations → must specify backup or dry-run option

```
✅ risk: safe   → zero shell, zero network, zero mutations
✅ risk: medium → documents what it does, rollback exists
❌ Fail if risk: safe but body contains rm -rf, curl piped to sh, etc.
```

### 5. Freshness
```
✅ date_added within 12 months         → likely current
⚠️ date_added 12–24 months ago        → check tool API compatibility
❌ date_added > 24 months              → assume outdated unless verified
❌ references deprecated APIs or tools → fail immediately
```
Check body for: version-pinned commands, deprecated flags, sunset services.

### 6. Tool Compatibility
`tools:` field must list agents the skill was actually tested with.
```
✅ tools: [claude, gemini] tested and working
⚠️ tools: [claude] — may not work on Codex or Cursor
❌ tools: [] or missing — unknown compatibility, use with caution
```

### 7. Uniqueness
Search the catalog for 3 similar skills. If near-duplicates exist:
```
✅ This skill has distinct scope or depth
⚠️ Overlaps with another skill — note the better one
❌ This skill is a shallow copy of a better existing skill — recommend removing
```

---

## How to Run the Audit

### Step 1: Load the skill
```bash
cat skills/<skill-name>/SKILL.md
```

### Step 2: Score each dimension
Fill in the table:

| Dimension             | Score | Notes |
|-----------------------|-------|-------|
| Frontmatter           | ✅/⚠️/❌ | |
| Trigger Precision     | ✅/⚠️/❌ | |
| Body Depth            | ✅/⚠️/❌ | |
| Safety Alignment      | ✅/⚠️/❌ | |
| Freshness             | ✅/⚠️/❌ | |
| Tool Compatibility    | ✅/⚠️/❌ | |
| Uniqueness            | ✅/⚠️/❌ | |

### Step 3: Issue verdict

| Outcome | Criteria |
|---------|----------|
| **TRUST** | 6–7 ✅, zero ❌ |
| **USE WITH CAUTION** | 4–5 ✅, at most 2 ⚠️ |
| **DO NOT INSTALL** | Any ❌ in Safety, or 3+ ❌ total |
| **NEEDS UPDATE** | Freshness ❌ or ⚠️ with otherwise passing skill |

---

## Examples

### Example 1: Auditing a community skill
```
Input: skills/react-patterns/SKILL.md
Result:
  Frontmatter      ✅ — all fields present
  Trigger          ✅ — clear description
  Body Depth       ✅ — 120 lines, 4 examples
  Safety           ✅ — risk: safe, no mutations
  Freshness        ⚠️ — date_added: 2024-01 (18 months ago), check hooks API
  Compatibility    ✅ — tools: [claude, cursor]
  Uniqueness       ⚠️ — overlaps with react-best-practices, but more depth here

Verdict: USE WITH CAUTION — verify React 19 hook patterns still apply
```

### Example 2: Flagging a bad skill
```
Input: skills/deploy-helper/SKILL.md
Result:
  Body Depth   ❌ — 8 lines, no examples
  Safety       ❌ — risk: safe but body has: curl https://example.com | sh
  Freshness    ❌ — date_added: 2023-01

Verdict: DO NOT INSTALL
```

---

## Best Practices

- ✅ Always audit before using a community skill in production agent workflows
- ✅ Re-audit after 6 months — APIs and tools change
- ✅ If a skill partially passes, fork and update it rather than discarding
- ❌ Don't trust star count or PR merges as a quality signal
- ❌ Don't skip the safety dimension even for "safe" skills

## Common Pitfalls

- **Problem:** Skill looks complete but description is too vague to trigger reliably  
  **Solution:** Rewrite description to name the exact scenario, tool, and outcome

- **Problem:** Skill was written for Claude 2 and uses outdated prompting patterns  
  **Solution:** Check tool version in frontmatter; test on your current agent version

- **Problem:** Two skills in catalog do the same thing  
  **Solution:** Keep the one with higher body depth score; file a deprecation PR for the other

## Additional Resources

- [AAS Contributing Guide](https://github.com/sickn33/agentic-awesome-skills/blob/main/CONTRIBUTING.md)
- [AAS Skill Template](https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/contributors/skill-template.md)
- [skill-audit skill](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/skill-audit)
