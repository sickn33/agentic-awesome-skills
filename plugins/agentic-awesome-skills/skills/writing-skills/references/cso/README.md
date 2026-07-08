# CSO Guide - Claude Search Optimization

Advanced techniques for making skills discoverable by agents.

## The Discovery Problem

You have 100+ skills. Agent receives a task. How does it find the RIGHT skill?

**Answer**: The `description` field.

## Critical Rule: Description = Triggers, NOT Workflow

### The Trap

When description summarizes workflow, agents take a shortcut.

**Real example that failed**:

```yaml
# Agent did ONE review instead of TWO
description: Code review between tasks

# Skill body had flowchart showing TWO reviews:
# 1. Spec compliance
# 2. Code quality
```

**Why it failed**: Agent read description, thought "code review between tasks means one review", never read the flowchart.

**Fix**:

```yaml
# Agent now reads full skill and follows flowchart
description: Use when executing implementation plans with independent tasks
```

### The Pattern

```yaml
# ❌ BAD: Workflow summary
description: Analyzes git diff, generates commit message in conventional format

# ✅ GOOD: Trigger conditions only
description: Use when generating commit messages or reviewing staged changes
```

## Token Efficiency Critical for Skills

**Problem**: Frequently-loaded skills consume tokens in EVERY conversation.

**Target word counts**:

- Frequently-loaded skills: <200 words total
- Other skills: <500 words

### Techniques

**1. Move details to tool help**:

```bash
# ❌ BAD: Document all flags in SKILL.md
search-conversations supports --text, --both, --after DATE, --before DATE, --limit N

# ✅ GOOD: Reference --help
search-conversations supports multiple modes. Run --help for details.
```

**2. Use cross-references**:

```markdown
# ❌ BAD: Repeat workflow

When searching, dispatch agent with template...
[20 lines of repeated instructions]

# ✅ GOOD: Reference other skill

Use subagents for searches. See [delegating-to-subagents] for workflow.
```

**3. Compress examples**:

```markdown
# ❌ BAD: Verbose (42 words)

Partner: "How did we handle auth errors in React Router?"
You: I'll search past conversations for patterns.
[Dispatch subagent with query: "React Router authentication error handling 401"]

# ✅ GOOD: Minimal (20 words)

Partner: "Auth errors in React Router?"
You: Searching...
[Dispatch subagent → synthesis]
```

## Keyword Strategy

### Error Messages

Include EXACT error text users will see:

- "Hook timed out after 5000ms"
- "ENOTEMPTY: directory not empty"
- "jest --watch is not responding"

### Symptoms

Use words users naturally say:

- "flaky", "hangs", "zombie process"
- "slow", "timeout", "race condition"
- "cleanup failed", "pollution"

### Tools & Commands

Actual names, not descriptions:

- "pytest", not "Python testing"
- "git rebase", not "rebasing"
- ".docx files", not "Word documents"

### Synonyms

Cover multiple ways to describe same thing:

- timeout/hang/freeze
- cleanup/teardown/after Each
- mock/stub/fake

## Naming Conventions

### Gerunds (-ing) for Processes

✅ `creating-skills`, `debugging-with-logs`, `testing-async-code`

### Verb-first for Actions

✅ `flatten-with-flags`, `reduce-complexity`, `trace-root-cause`

### ❌ Avoid

- `skill-creation` (passive, less searchable)
- `async-test-helpers` (too generic)
- `debugging-techniques` (vague)

## Description Template

```yaml
description: "Use when [SPECIFIC TRIGGER]."
metadata:
  triggers: [error1], [symptom2], [tool3]
```

**Examples**:

```yaml
# Technique skill
description: "Use when tests have race conditions, timing dependencies, or pass/fail inconsistently."
metadata:
  triggers: flaky tests, timeout, race condition

# Pattern skill
description: "Use when complex data structures make code hard to follow."
metadata:
  triggers: nested loops, multiple flags, confusing state

# Reference skill
description: "Use when working with React Router and authentication."
metadata:
  triggers: 401 redirect, login flow, protected routes

# Discipline skill
description: "Use when implementing any feature or bugfix, before writing implementation code."
metadata:
  triggers: new feature, bug fix, code change
```

## Third Person Rule

Description is injected into system prompt. Inconsistent POV breaks discovery.

```yaml
# ❌ BAD: First person
description: "I can help you with async tests"

# ❌ BAD: Second person
description: "You can use this for race conditions"

# ✅ GOOD: Third person
description: "Handles async tests with race conditions"
```

## Cross-Referencing Other Skills

**When documenting a skill that references other skills**:

Use skill name only, with explicit requirement markers:

```markdown
# ✅ GOOD: Clear requirement

**REQUIRED BACKGROUND**: You MUST understand test-driven-development before using this skill.

**REQUIRED SUB-SKILL**: Use defensive-programming for error handling.

# ❌ BAD: Unclear if required

See test-driven-development skill for context.

# ❌ NEVER: Force-loads (burns context)

@skills/testing/test-driven-development/SKILL.md
```

**Why no @ links**: `@` syntax force-loads files immediately, consuming tokens before needed.

## Verification Checklist

Before deploying:

- [ ] Description starts with "Use when..."?
- [ ] Description is <500 characters?
- [ ] Description lists ONLY triggers, not workflow?
- [ ] Includes 3+ keywords (errors/symptoms/tools)?
- [ ] Third person throughout?
- [ ] Name uses gerund or verb-first format?
- [ ] Name has only letters, numbers, hyphens?
- [ ] No @ syntax for cross-references?
- [ ] Word count <200 (frequent) or <500 (other)?

## Real-World Examples

### Before/After: TDD Skill

❌ **Before** (workflow in description):

```yaml
description: Write test first, watch it fail, write minimal code, refactor
```

Result: Agents followed description, skipped reading full skill.

✅ **After** (triggers only):

```yaml
description: Use when implementing any feature or bugfix, before writing implementation code
```

Result: Agents read full skill, followed complete TDD cycle.

### Before/After: BigQuery Skill

❌ **Before** (too vague):

```yaml
description: Helps with database queries
```

Result: Never loaded (too generic, agents couldn't identify relevance).

✅ **After** (specific triggers):

```yaml
description: Use when analyzing BigQuery data. Triggers: revenue metrics, pipeline data, API usage, campaign attribution.
```

Result: Loads for relevant queries, includes domain keywords.
