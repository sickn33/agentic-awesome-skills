# AutoBrowse

Self-improving browser automation via the auto-research loop. Build reliable, production-ready navigation skills for any website — overnight, autonomously.

## How it works

An **inner agent** browses your target site and attempts the task. An **outer agent** (you, via `/autobrowse`) reads what went wrong and improves the instructions. Repeat until it passes consistently.

The output is a `skill.md` — a site-specific playbook any agent can follow. Once mature, it replaces expensive LLM exploration with deterministic, cached navigation. Typical cost reduction: **80%+**.

## Requirements

- Node.js 18+
- [Claude Code](https://claude.ai/code)
- `browse` CLI: `npm install -g browse`
- `ANTHROPIC_API_KEY` in your environment
- For bot-protected sites: `BROWSERBASE_API_KEY`

## Setup

```bash
git clone <this-repo>
cd autobrowse
npm install
touch .env             # add ANTHROPIC_API_KEY (and BROWSERBASE_API_KEY if needed)
```

## Your project structure

Create this in your working directory before running `/autobrowse`:

```
your-project/
├── tasks/
│   └── my-portal/
│       ├── task.md        ← describe what the agent should do
│       └── strategy.md    ← auto-created and improved each iteration
└── traces/                ← auto-created at runtime, add to .gitignore
```

See `references/example-task.md` for the `task.md` format.

## Usage

Open Claude Code in your project directory and run:

```
/autobrowse --task my-portal
```

The skill runs the inner agent, reads the trace, improves `strategy.md`, and repeats. When the task passes consistently, a `skill.md` is written alongside `strategy.md` — that's your shippable output.

For multiple tasks in parallel:

```
/autobrowse --all --iterations 5 --env remote
```

## Graduated skills

When a task's `skill.md` is ready, copy it into any agent's system prompt. It gives the agent precise, site-specific instructions — no more blind exploration on every run.

See `references/example-skill.md` for the format of a finished skill.

## Environment modes

| | Local | Remote (Browserbase) |
|-|-------|----------------------|
| Setup | Chrome required | API key required |
| Stealth / CAPTCHA | No | Yes |
| Parallelism | 1 task at a time | Up to 20+ |

Use `--env remote` for sites with bot detection or when running multiple tasks simultaneously.

## Architecture

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) — the same loop that optimizes ML experiments, applied to browser automation.

```
outer agent (Claude Code + /autobrowse skill)
  └── reads trace → improves strategy.md → repeats

inner agent (scripts/evaluate.mjs → Anthropic API)
  └── browse open → snapshot → click → snapshot → ...
  └── writes traces/ with summary, full trace, screenshots
```
