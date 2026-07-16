---
name: hierarchical-agent-memory
description: "Scoped CLAUDE.md memory system that reduces context token spend. Creates directory-level context files, tracks savings via dashboard, and routes agents to the right sub-context."
risk: safe
source: "https://github.com/kromahlusenii-ops/ham"
date_added: "2026-02-27"
---

# Hierarchical Agent Memory (HAM)

Scoped memory system that gives AI coding agents a cheat sheet for each directory instead of re-reading your entire project every prompt. Root CLAUDE.md holds global context (~200 tokens), subdirectory CLAUDE.md files hold scoped context (~250 tokens each), and a `.memory/` layer stores decisions, patterns, and an inbox for unconfirmed inferences.

## When to Use This Skill

- Use when you want to reduce input token costs across Claude Code sessions
- Use when your project has 3+ directories and the agent keeps re-reading the same files
- Use when you want directory-scoped context instead of one monolithic CLAUDE.md
- Use when you want a dashboard to visualize token savings, session history, and context health
- Use when setting up a new project and want structured agent memory from day one

## How It Works

### Step 1: Setup ("go ham")

Auto-detects your project platform and maturity, then generates the memory structure:

```
project/
├── CLAUDE.md              # Root context (~200 tokens)
├── .memory/
│   ├── decisions.md       # Architecture Decision Records
│   ├── patterns.md        # Reusable patterns
│   ├── inbox.md           # Inferred items awaiting confirmation
│   └── audit-log.md       # Audit history
└── src/
    ├── api/CLAUDE.md      # Scoped context for api/
    ├── components/CLAUDE.md
    └── lib/CLAUDE.md
```

### Step 2: Context Routing

The root CLAUDE.md includes a routing section that tells the agent exactly which sub-context to load:

```markdown
## Context Routing

→ api: src/api/CLAUDE.md
→ components: src/components/CLAUDE.md
→ lib: src/lib/CLAUDE.md
```

The agent reads root, then immediately loads the relevant subdirectory context — no guessing.

### Step 3: Dashboard ("ham dashboard")

Launches a web dashboard at localhost:7777 that visualizes:
- Token savings (HAM-on vs HAM-off sessions)
- Daily token and cost trends
- Per-directory session breakdown
- Context file health (missing/stale/inherited CLAUDE.md coverage)
- Routing compliance (how often the agent follows the routing map)
- Carbon/energy estimates

## Commands

| Trigger | What it does |
|---|---|
| `go ham` | Set up HAM — auto-detect platform, generate CLAUDE.md files |
| `ham savings` | Show token and cost savings report |
| `ham dashboard` | Launch the interactive web dashboard |
| `ham audit` | Health check on memory files |
| `ham insights` | Generate actionable insights from session data |
| `ham route` | Add/update Context Routing section in root CLAUDE.md |
| `ham carbon` | Show energy and carbon efficiency data |

## Examples

### Example 1: First-time setup

```
User: go ham

Agent: HAM setup complete. Created 8 files.
  - CLAUDE.md (root)
  - .memory/decisions.md
  - .memory/patterns.md
  - .memory/inbox.md
  - src/api/CLAUDE.md
  - src/components/CLAUDE.md
  - src/lib/CLAUDE.md
  - src/utils/CLAUDE.md

Baseline captured in .memory/baseline.json
Run "HAM savings" to see your token and cost savings.
```

### Example 2: Checking savings

```
User: ham savings

Agent:
  Before HAM: ~7,500 tokens/prompt
  After HAM:    ~450 tokens/prompt
  Savings:    7,050 tokens (94%)

  Monthly projection (1,500 prompts):
    Sonnet: ~$31.73 saved
    Opus:   ~$158.63 saved
```

## Best Practices

- Keep root CLAUDE.md under 60 lines / 250 tokens
- Keep subdirectory CLAUDE.md files under 75 lines each
- Run `ham audit` every 2 weeks to catch stale or missing context files
- Use `ham route` after adding new directories to keep routing current
- Review `.memory/inbox.md` periodically — confirm or reject inferred items

## Limitations

- Token estimates use ~4 chars = 1 token approximation, not a real tokenizer
- Baseline savings comparisons are estimates based on typical agent behavior
- Dashboard requires Node.js 18+ and reads session data from `~/.claude/projects/`
- Context routing detection relies on CLAUDE.md read order in session JSONL files
- Does not auto-update subdirectory CLAUDE.md content — you maintain those manually or via `ham audit`
- Carbon estimates use regional grid averages, not real-time energy data

## Related Skills

- `agent-memory-systems` — general agent memory architecture patterns
- `agent-memory-mcp` — MCP-based memory integration
