---
name: aas-skill-selector
description: Guide an agent through structured, semantic skill selection from the AAS catalog. Use when the agent must choose the right skills from a large catalog for a specific project, or when previous skill selection produced irrelevant or redundant results.
category: meta
risk: safe
source: community
source_type: community
date_added: "2026-07-28"
author: sickn33-contributor
tags: [skill-selection, aas, catalog, planning, meta, agent-first]
tools: [claude, codex, gemini, cursor, antigravity]
---

# AAS Skill Selector

## Overview

AAS Core deliberately does **not** rank or recommend skills — the agent picks.
This is a feature, not a bug. But it means **agent judgment is the quality gate**.

Without a structured selection process, agents tend to:
- Pick the first matching skill rather than the best one
- Stop at a minimal shortlist (3–5 skills) when 15–20 may be warranted
- Miss entire capability areas (e.g., security, observability, accessibility)
- Select redundant skills that overlap heavily
- Anchor on skill names instead of reading actual content

This skill gives the agent a **repeatable, coverage-driven selection protocol**
that produces a non-redundant, project-appropriate skill stack.

---

## When to Use This Skill

- Use when starting a new project and selecting an AAS skill stack
- Use when your current skill stack feels incomplete or produces gaps
- Use when agent selected skills but missed obvious capability areas
- Use when you need to justify *why* each skill was chosen
- Use before running `compose_stack` to validate your selection

---

## Selection Protocol (5 Phases)

### Phase 1: Project Surface Mapping

Before searching the catalog, map the full project surface. Do not skip areas even if they seem out of scope.

```
Architecture layer:
  □ Language(s) and runtime(s)
  □ Framework(s)
  □ Database(s)
  □ External APIs / integrations
  □ Auth model

Domain layer:
  □ Core business logic patterns
  □ Data models and relationships
  □ Workflows and state machines

Quality layer:
  □ Testing strategy (unit / integration / e2e)
  □ Observability (logging, metrics, tracing)
  □ Error handling and resilience

Security layer:
  □ Auth and access control
  □ Input validation
  □ Secrets and credentials
  □ Dependency vulnerability surface

Delivery layer:
  □ CI/CD pipeline
  □ Deployment target (cloud/container/serverless)
  □ Infrastructure as code

UX layer (if applicable):
  □ Frontend framework
  □ Accessibility
  □ Performance budget
  □ Responsive/mobile

Maintenance layer:
  □ Documentation
  □ Dependency management
  □ Upgrade and migration path
```

### Phase 2: Per-Area Catalog Search

For each surface area identified in Phase 1:
1. Search the AAS catalog with `search_skills <area-keyword>`
2. Read the top 3–5 candidate skills with `get_skill <id>`
3. Compare candidates on: depth, freshness, specificity, tool compatibility
4. Pick the **best fit** — not just the first result

```
Rule: If you found 0 candidates for an area → record as a catalog gap.
Rule: If you found 1 candidate → note it but flag low confidence.
Rule: If you found 3+ candidates → compare and pick the deepest one.
```

### Phase 3: Redundancy Elimination

Before finalizing, scan your selected list for overlaps:

```
For each pair of selected skills, ask:
  - Do they solve the same problem?
  - Do their instructions conflict?
  - Would installing both confuse the agent?

If yes → keep the one with higher body depth score (see skill-quality-auditor).
```

Common redundancy traps:
- `react-patterns` + `react-best-practices` + `react-component-performance` (pick 1–2)
- `security-auditor` + `security-scanning-security-sast` (often overlapping)
- Framework skill + language skill (e.g., `nextjs-best-practices` already covers React basics)

### Phase 4: Coverage Ledger

Produce a capability ledger — one row per surface area:

| Surface Area     | Selected Skill(s)         | Gap? | Notes |
|------------------|---------------------------|------|-------|
| Auth             | clerk-auth                | No   | |
| Database         | neon-postgres             | No   | |
| Testing (E2E)    | playwright-skill          | No   | |
| Observability    | —                         | YES  | No good AAS skill found |
| Accessibility    | ui-a11y                   | No   | |

**Do not finalize stack until every surface area has an entry.**

### Phase 5: Selection Evidence

For each selected skill, produce a one-line justification:
```
skill-id: "Selected because it covers [specific gap] at [depth level].
           Alternatives [alt1, alt2] were considered but [reason rejected]."
```

This becomes the `aas-selection-evidence.json` payload when using AAS Core.

---

## Examples

### Example 1: React Flow pipeline builder project
```
Surface map:
  Language: JavaScript/React
  Framework: React Flow
  Backend: FastAPI (Python)
  Auth: JWT
  Infra: Docker + Vercel

Search results → selected stack:
  react-patterns           → React component patterns
  react-flow-node-ts       → React Flow node creation
  react-state-management   → State across nodes
  fastapi-pro              → Backend API
  python-testing-patterns  → Backend tests
  clerk-auth               → Auth (JWT compatible)
  docker-expert            → Containerization
  vercel-deployment        → Deploy

Redundancy check: react-patterns + react-flow-node-ts → no overlap (different focus)
Coverage gap: Observability (no suitable skill found)
```

### Example 2: Recovering from a bad selection
```
Bad selection: agent chose 4 overlapping React skills, missed security entirely

Fix with this skill:
  Phase 1 → discovered: auth, input validation were unmapped
  Phase 3 → removed 2 redundant React skills
  Phase 2 → added: security-auditor, clerk-auth
  Result: 6 skills, full coverage, zero redundancy
```

---

## Best Practices

- ✅ Complete the surface map BEFORE searching — don't search first and map after
- ✅ Read skill bodies, not just names — `get_skill` is mandatory for final candidates
- ✅ Record catalog gaps — they're valuable feedback for AAS contributors
- ✅ Keep the ledger — it's your justification and diff baseline for future updates
- ❌ Don't stop at 5 skills for a non-trivial project — coverage matters more than brevity
- ❌ Don't select a skill just because its name matches a keyword
- ❌ Don't skip the redundancy pass — conflicting skills create agent confusion

## Common Pitfalls

- **Problem:** Agent selects 20 skills but half are redundant  
  **Solution:** Phase 3 redundancy elimination — keep the deepest skill per capability area

- **Problem:** Security and observability always get missed  
  **Solution:** Phase 1 surface map is mandatory — these areas must have explicit entries

- **Problem:** Agent can't distinguish between 3 similar React skills  
  **Solution:** Use `skill-quality-auditor` to score each, pick highest body-depth winner

## Additional Resources

- [AAS Core Guide](https://github.com/sickn33/agentic-awesome-skills/blob/v15.5.1/docs/users/aas-core.md)
- [skill-quality-auditor](../skill-quality-auditor/SKILL.md) — score candidates before selection
- [AAS MCP compose_stack](https://github.com/sickn33/agentic-awesome-skills) — validate final selection
