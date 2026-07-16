# skill-suggester

Scans opencode prompt history for recurring patterns and proposes new skills or command templates.

## What it does

- Reads prompt history from `~/.local/state/opencode/prompt-history*.jsonl`
- Identifies repeated multi-step workflows that don't have a dedicated skill yet
- Estimates time savings if each pattern were turned into a skill
- Provides direct evidence with excerpts from your past prompts

## When to use

Run occasionally (weekly or monthly) to find automation opportunities you didn't know existed. Good for catching workflows that have become routine without you noticing.
