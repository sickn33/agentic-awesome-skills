---
description: Standards and naming rules for creating agent skills.
metadata:
  tags: [standards, naming, yaml, structure]
---

# Skill Development Guide

Comprehensive reference for creating effective agent skills.

## Directory Structure

```
~/.config/opencode/skills/
  {skill-name}/           # kebab-case, matches `name` field
    SKILL.md              # Required: main skill definition
    references/           # Optional: supporting documentation
      README.md           # Sub-topic entry point
      *.md                # Additional files
```

**Project-local alternative:**
```
.agent/skills/{skill-name}/SKILL.md
```

## Naming Rules

| Element | Rule | Example |
|---------|------|---------|
| Directory | kebab-case, 1-64 chars | `react-best-practices` |
| `SKILL.md` | ALL CAPS, exact filename | `SKILL.md` (not `skill.md`) |
| `name` field | Must match directory name | `name: react-best-practices` |

## SKILL.md Structure

```markdown
---
name: {skill-name}
description: >-
  Use when [trigger condition].
metadata:
  category: technique
  triggers: keyword1, keyword2, error-text
---

# Skill Title

Brief description of what this skill does.

## When to Use

- Symptom or situation A
- Symptom or situation B

## How It Works

Step-by-step instructions or reference content.

## Examples

Concrete usage examples.

## Common Mistakes

What to avoid and why.
```

## Description Best Practices

The `description` field is critical for skill discovery:

```yaml
# ❌ BAD: Workflow summary (agent skips reading full skill)
description: Analyzes code, finds bugs, suggests fixes

# ✅ GOOD: Trigger conditions only
description: Use when debugging errors or reviewing code quality.
metadata:
  triggers: bug, error, code review
```

**Rules:**
- Start with "Use when..."
- Put triggers under `metadata.triggers`
- Keep under 500 characters
- Use third person (not "I" or "You")

## Context Efficiency

Skills load into context on-demand. Optimize for token usage:

| Guideline | Reason |
|-----------|--------|
| Keep SKILL.md < 500 lines | Reduces context consumption |
| Put details in supporting files | Agent reads only what's needed |
| Use tables for reference data | More compact than prose |
| Link to `--help` for CLI tools | Avoids duplicating docs |

## Supporting Files

For complex skills, use additional files:

```
my-skill/
  SKILL.md              # Overview + navigation
  patterns.md           # Detailed patterns
  examples.md           # Code examples
  troubleshooting.md    # Common issues
```

**Supporting file frontmatter is required** (for any `.md` besides `SKILL.md`):

```markdown
---
description: >-
  Short summary used for search and retrieval.
metadata:
  tags: [pattern, troubleshooting, api]
  source: internal
---
```

This frontmatter helps the LLM locate the right file when referenced from `SKILL.md`.

Reference from SKILL.md:
```markdown
## Detailed Reference

- Patterns - Common usage patterns
- Examples - Code samples
```

## Skill Types

| Type | Purpose | Example |
|------|---------|---------|
| **Reference** | Documentation, APIs | `bigquery-analysis` |
| **Technique** | How-to guides | `condition-based-waiting` |
| **Pattern** | Mental models | `flatten-with-flags` |
| **Discipline** | Rules to enforce | `test-driven-development` |

## Verification Checklist

Before deploying:

- [ ] `name` matches directory name?
- [ ] `SKILL.md` is ALL CAPS?
- [ ] Description starts with "Use when..."?
- [ ] Triggers listed under metadata?
- [ ] Under 500 lines?
- [ ] Tested with real scenarios?
