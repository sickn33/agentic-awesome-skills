# AutoBrowse Reference

## evaluate.mjs flags

```bash
node ${CLAUDE_SKILL_DIR}/scripts/evaluate.mjs --task <name> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--task <name>` | required | Task name — matches `tasks/<name>/` directory |
| `--env local\|remote` | `local` | Browser environment |
| `--model <model>` | `claude-sonnet-4-6` | Claude model for the inner agent |
| `--run-number N` | auto-increment | Force a specific run number |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `BROWSERBASE_API_KEY` | Remote only | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | No | Optional Browserbase project override |

## Trace artifacts

Each run writes to `traces/<task>/run-NNN/`:

| File | Description |
|------|-------------|
| `summary.md` | Duration, cost, turn-by-turn decision log, final output |
| `trace.json` | Full tool call log — every command and response |
| `messages.json` | Raw Anthropic API message history |
| `screenshots/` | Visual captures saved during the run |

`traces/<task>/latest` is a symlink to the most recent run.

## Models

| Model | Cost | Best for |
|-------|------|----------|
| `claude-sonnet-4-6` | $$ | Default — good balance of speed and accuracy |
| `claude-opus-4-6` | $$$$ | Hardest tasks, complex multi-step workflows |
| `claude-haiku-4-5-20251001` | $ | Simple tasks, high-volume iteration |

## Skill lifecycle

```
task.md        → input (you write this, don't edit after)
strategy.md    → working file (auto-improved each iteration)
skill.md       → output (graduated from strategy.md when ready to ship)
```

A task is ready to graduate when it passes on 2+ of the last 3 consecutive runs.
