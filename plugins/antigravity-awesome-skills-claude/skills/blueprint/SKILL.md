---
name: blueprint
description: "Turn a one-line objective into a step-by-step construction plan any coding agent can execute cold. Each step has a self-contained context brief — a fresh agent in a new session can pick up any step without reading prior steps."
category: planning
risk: safe
source: community
date_added: "2026-03-10"
---

# Blueprint — Construction Plan Generator

Turn a one-line objective into a step-by-step plan any coding agent can execute cold.

## Overview

Blueprint is for multi-session, multi-agent engineering projects where each step must be independently executable by a fresh agent that has never seen the conversation history. Install it once, invoke it with `/blueprint <project> <objective>`.

## When to Use This Skill

- Use when the task requires multiple PRs or sessions
- Use when multiple agents or team members need to share execution
- Use when you want adversarial review of the plan before execution
- Use when parallel step detection and dependency graphs matter

## How It Works

1. **Research** — Scans the codebase, reads project memory, runs pre-flight checks
2. **Design** — Breaks the objective into one-PR-sized steps, identifies parallelism, assigns model tiers
3. **Draft** — Generates the plan from a structured template with branch workflow rules, CI policy, and rollback strategies inline
4. **Review** — Delegates adversarial review to a strongest-model sub-agent (falls back to default model if unavailable)
5. **Register** — Saves the plan and updates project memory

## Examples

### Example 1: Database migration
```
/blueprint myapp "migrate database to PostgreSQL"
```

### Example 2: Plugin extraction
```
/blueprint antbot "extract providers into plugins"
```

## Best Practices

- ✅ Use for tasks requiring 3+ PRs or multiple sessions
- ✅ Let Blueprint auto-detect git/gh availability — it degrades gracefully
- ❌ Don't invoke for tasks completable in a single PR
- ❌ Don't invoke when the user says "just do it"

## Key Differentiators

- **Cold-start execution**: Every step has a self-contained context brief
- **Adversarial review gate**: Strongest-model review before execution
- **Zero runtime risk**: Pure markdown — no hooks, no scripts, no executable code
- **Plan mutation protocol**: Steps can be split, inserted, skipped with audit trail

## Installation

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/antbotlab/blueprint.git ~/.claude/skills/blueprint
```

## Additional Resources

- [GitHub Repository](https://github.com/antbotlab/blueprint)
- [Examples: small plan](https://github.com/antbotlab/blueprint/blob/main/examples/small-plan.md)
- [Examples: large plan](https://github.com/antbotlab/blueprint/blob/main/examples/large-plan.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
