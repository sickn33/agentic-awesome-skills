---
name: faf-go
description: Guided interview to Gold Code (100% AI-Readiness). Use when helping users improve their .faf file through questions. Leverages Claude Code's AskUserQuestion for seamless integration. Just type /faf-go and answer questions till done.
risk: unknown
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/faf-go
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# FAF Go — Guided Path to 100% ✪

**"Just type /faf-go, answer questions till you're done. 100% target."**

`.faf` is an **IANA-registered context format** (`application/vnd.faf+yaml`) — a typed, portable file *you own*, readable by any AI. **faf-cli scores on 21 slots**; your `app_type` selects which are *active*, and **100% ✪ = every active slot filled**. This skill is the guided interview that gets you there: the AI fills what it can detect, then asks you — via Claude Code's AskUserQuestion — only for the gaps it can't source.

## When to Use This Skill

Activate when:
- User wants to improve their .faf score
- User mentions "Gold Code" or "100%"
- User has incomplete project context
- After `faf init` to fill in missing fields
- User says "help me with my .faf"

## Integration with Claude Code

FAF Go is built FOR Claude Code:
- **AskUserQuestion** - Native Claude Code UI for questions
- **multiSelect: true** - Allow multiple answers (e.g., "pytest + WJTTC")
- **TodoWrite** - Track progress through the interview
- **Structured output** - JSON that Claude Code understands
- **Bi-sync** - Answers flow to .faf AND CLAUDE.md

### multiSelect Support

Some questions allow multiple selections:
- `stack.testing` → "pytest + WJTTC"
- `stack.cicd` → "GitHub Actions + Cloud Build"
- `stack.frontend` → "React + Tailwind"
- `human_context.who` → "Developers + AI agents"

When `multiSelect: true`, user can pick 2+ options. Results are joined with " + ".

## Workflow

### Step 1: Check Current State

Run faf score to understand current position:

```bash
faf score --verbose
```

Or get it as structured data for programmatic use:

```bash
faf score --json
```

`--json` returns the score + per-slot breakdown — the empty slots are what you interview on (the priority order is in Step 2).

### Step 2: Ask Questions Using AskUserQuestion

For each missing field, use Claude Code's AskUserQuestion tool:

**Priority Order (most impactful first):**
1. `project.goal` - What does this project do?
2. `human_context.why` - Why does this exist?
3. `human_context.who` - Who uses this?
4. `human_context.what` - What problem does it solve?
5. `project.main_language` - Primary language
6. `stack.database` - Database choice
7. `stack.hosting` - Where is it deployed?
8. `stack.frontend` - Frontend framework
9. `stack.backend` - Backend framework
10. `human_context.where` - Environment
11. `human_context.when` - Timeline/phase
12. `human_context.how` - How the project is built (sourced from the stack)

### Step 3: Apply Answers

After collecting answers, update the .faf file:

```bash
# Read current .faf
cat project.faf

# Update fields (use Edit tool)
# Then verify:
faf score
```

### Step 4: Celebrate or Continue

If score >= 100: Celebrate Gold Code achievement
If score < 100: Continue with remaining questions

## Question Templates for AskUserQuestion

### Single-Select Questions (pick one)

#### project.goal
```json
{
  "question": "What does this project do? (one clear sentence)",
  "header": "Goal",
  "multiSelect": false,
  "options": [
    {"label": "Let me type it", "description": "I'll describe it myself"},
    {"label": "Help me write it", "description": "Guide me through it"}
  ]
}
```

#### human_context.why
```json
{
  "question": "Why does this project exist?",
  "header": "Why",
  "multiSelect": false,
  "options": [
    {"label": "Business need", "description": "Solving a business problem"},
    {"label": "Personal project", "description": "Learning or hobby"},
    {"label": "Open source", "description": "Community contribution"},
    {"label": "Let me explain", "description": "Custom reason"}
  ]
}
```

#### stack.database
```json
{
  "question": "What database do you use?",
  "header": "Database",
  "multiSelect": false,
  "options": [
    {"label": "PostgreSQL", "description": "Relational database"},
    {"label": "MongoDB", "description": "Document database"},
    {"label": "SQLite", "description": "File-based database"},
    {"label": "None", "description": "No database"}
  ]
}
```

#### stack.hosting
```json
{
  "question": "Where is this deployed?",
  "header": "Hosting",
  "multiSelect": false,
  "options": [
    {"label": "Vercel", "description": "Frontend/serverless"},
    {"label": "AWS", "description": "Amazon Web Services"},
    {"label": "Local only", "description": "Not deployed"},
    {"label": "Other", "description": "Different platform"}
  ]
}
```

### Multi-Select Questions (pick multiple, joined with " + ")

#### stack.testing
```json
{
  "question": "What testing tools/methodologies do you use?",
  "header": "Testing",
  "multiSelect": true,
  "options": [
    {"label": "pytest", "description": "Python testing framework"},
    {"label": "Jest", "description": "JavaScript testing"},
    {"label": "Vitest", "description": "Vite-native testing"},
    {"label": "WJTTC", "description": "Championship methodology (Layer 2)"}
  ]
}
```
**Result format:** `pytest + WJTTC` (industry first, WJTTC follows)

**Ordering:** When both selected, industry tests come first:
- `pytest + WJTTC` (not `WJTTC + pytest`)
- WJTTC can also run standalone

#### stack.cicd
```json
{
  "question": "What CI/CD tools do you use?",
  "header": "CI/CD",
  "multiSelect": true,
  "options": [
    {"label": "GitHub Actions", "description": "GitHub-native CI/CD"},
    {"label": "Cloud Build", "description": "Google Cloud CI/CD"},
    {"label": "CircleCI", "description": "CircleCI pipelines"},
    {"label": "None", "description": "No CI/CD yet"}
  ]
}
```
**Result format:** `GitHub Actions + Cloud Build`

#### stack.frontend
```json
{
  "question": "What frontend technologies do you use?",
  "header": "Frontend",
  "multiSelect": true,
  "options": [
    {"label": "React", "description": "React framework"},
    {"label": "Next.js", "description": "React meta-framework"},
    {"label": "Svelte", "description": "Svelte framework"},
    {"label": "None/API-only", "description": "No frontend"}
  ]
}
```

#### human_context.who
```json
{
  "question": "Who uses this project?",
  "header": "Users",
  "multiSelect": true,
  "options": [
    {"label": "Developers", "description": "Software developers"},
    {"label": "End users", "description": "Non-technical users"},
    {"label": "AI agents", "description": "Claude, Gemini, etc."},
    {"label": "Internal team", "description": "Your team only"}
  ]
}
```
**Result format:** `Developers + AI agents`

### Processing Multi-Select Answers

When user selects multiple options, join them with " + ":

```python
# Example: User selects ["pytest", "WJTTC"]
selected = ["pytest", "WJTTC"]
value = " + ".join(selected)  # "pytest + WJTTC"
```

This creates readable, scannable values in the .faf file:
```yaml
stack:
  testing: pytest + WJTTC
  cicd: GitHub Actions + Cloud Build
```

## Example Session

```
User: /faf-go

Claude: Let me check your current .faf status.

[Runs: faf score --verbose]

Your score is 45%. Let's get you to Gold Code!

[Uses AskUserQuestion for project.goal]

User: [Selects option or types custom]

Claude: Great! Now let's capture why this project exists.

[Uses AskUserQuestion for human_context.why]

... continues until 100% ...

Claude: ✪ GOLD CODE ACHIEVED!
Your AI now has complete context for championship performance.
```

## TodoWrite Integration

Track progress with todos:

```javascript
[
  {"content": "Answer project.goal question", "status": "completed"},
  {"content": "Answer human_context.why question", "status": "in_progress"},
  {"content": "Answer stack.database question", "status": "pending"},
  {"content": "Verify Gold Code achieved", "status": "pending"}
]
```

## CLI Fallback

Outside Claude Code, the same destination is reached with the CLI's own interactive interview:

```bash
faf go            # interactive terminal interview (--resume continues a session)
```

This skill is the **Claude-native** version of that interview — AskUserQuestion instead of terminal prompts. For structured, programmatic data, use `faf score --json`.

## Success Metrics

- User reaches 100% score
- All required fields filled with meaningful content
- No placeholder values (TBD, Unknown, None where inappropriate)
- User understands what each field is for

## On Completion

When 100% ✪ is achieved:

```
✪ 100% — Gold Code

project.faf: complete
CLAUDE.md:   synced from .faf
```

Optionally run `faf sync` to emit CLAUDE.md / AGENTS.md from the .faf. Your AI now starts every session with complete project context.

## Related Skills

- **faf-context** — the builder's quickstart: hand the AI what it needs to hit 100%, fast
- **faf-wizard** — done-for-you, one-click .faf for any project
- **faf-expert** — master the format: scoring internals, MCP config, bi-sync, the full 21-slot model

---

> .faf is the format. project.faf is the file.
> 100% ✪ AI-Readiness is the result.

---

*MIT · part of the FAF skill family (faf-context · faf-wizard · faf-expert). Native to Claude Code.*

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
