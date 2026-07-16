---
name: unslop-file
description: "Humanize natural-language memory files (CLAUDE.md, todos, preferences, docs) by removing AI-isms and adding burstiness while preserving every code block, URL, path, command, and heading exactly. Two modes: --deterministic (fast, regex-based, no API) and LLM (default, calls Claude for..."
risk: unknown
source: https://github.com/MohamedAbdallah-14/unslop/tree/main/plugins/unslop/skills/unslop-file
source_repo: MohamedAbdallah-14/unslop
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/MohamedAbdallah-14/unslop/blob/main/LICENSE
---

# Unslop Humanize
## When to Use

Use this skill when you need humanize natural-language memory files (CLAUDE.md, todos, preferences, docs) by removing AI-isms and adding burstiness while preserving every code block, URL, path, command, and heading exactly. Two modes: --deterministic (fast, regex-based, no API) and LLM (default, calls Claude for...


## Purpose

Rewrite natural-language memory files (CLAUDE.md, AGENTS.md, todos, preferences, docs) so they sound human-written: no sycophancy, no stock vocab, no five-paragraph essay shape, no tricolon padding. Everything technical stays exact: code blocks, inline code, URLs, file paths, commands, headings, tables.

Two modes:

- **`--deterministic`** — fast regex pass that strips canonical AI-isms and tightens tricolons. No API call, no `ANTHROPIC_API_KEY` needed. Best for batch processing and CI.
- **LLM mode (default)** — calls Claude (via Anthropic SDK or `claude --print` CLI fallback) to do a full rewrite that engineers burstiness, restructures performative paragraphs, and matches voice. Slower but better quality.

Humanized version overwrites the original. A `FILE.original.md` backup is written first. Re-run after editing the `.original.md` to regenerate.

### Intensity levels (`--mode`)

| Mode       | What runs                                                                                   | Use when…                                                    |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `subtle`   | Stock vocab only.                                                                           | Structure is fine; you just want AI vocabulary gone.         |
| `balanced` | (Default.) Sycophancy, hedging, transitions, stock vocab, authority tropes, signposting, performative balance, em-dash cap. | Everyday docs / READMEs / CLAUDE.md.                         |
| `full`     | Balanced + filler phrases + negative-parallelism tricolons + stronger LLM prompt.           | Marketing copy, release notes, slop-heavy LLM output.        |

### Two-pass audit

Use the deterministic pass to get a report, then fix anything that slipped:

```bash
humanize --deterministic --report audit.json doc.md     # writes audit + humanized
humanize doc.md                                         # optional LLM polish on top
```

`audit.json` lists every rule that fired, every `before → after` pair, and `counts_by_rule`. Great for reviewing what the regex changed before trusting the diff to merge.

## Trigger

`/unslop-file <filepath>`, `/unslop:humanize <filepath>`, or "humanize memory file", "de-slop this doc", "strip AI tone from this file".

## Process

The scripts live in a `scripts/` directory adjacent to this SKILL.md.

Common layouts:
- Full repo: `unslop/SKILL.md` + `unslop/scripts/`
- Synced mirror: `skills/unslop-file/SKILL.md` + `skills/unslop-file/scripts/`
- Codex bundle: `plugins/unslop/skills/unslop-file/SKILL.md` + sibling `scripts/`

Always prefer the `scripts/` sibling of the currently loaded SKILL file.

Steps:

1. Locate the directory containing this SKILL.md and its `scripts/` sibling.
2. Run from that directory: `python3 -m scripts <absolute_filepath>` (LLM mode), or add `--deterministic` for the regex pass.
3. CLI flow: detect file type → write `.original.md` backup → humanize → validate (preserve check + AI-ism residual check) → on validation error: targeted fix call (LLM mode) → retry up to 2 times.
4. On final failure: report errors, restore original, exit 2.
5. On success: report path of humanized file and `.original.md` backup, exit 0.
6. Return result to user.

## Humanization Rules

### Remove (canonical AI-isms)

- **Sycophancy openers**: "Great question!", "Certainly!", "Absolutely!", "Sure!", "I'd be happy to help", "What a fascinating..."
- **Stock vocab**: `delve`, `tapestry`, `testament` (praise form), `navigate`/`embark`/`journey` (figurative), `realm`, `landscape` (figurative), `pivotal`, `paramount`, `seamless`, `holistic`, `leverage` (filler verb), `robust` (filler), `comprehensive` (when "complete" works), `cutting-edge`, `state-of-the-art` (filler), `interplay`, `intricate`, `vibrant`, `underscore(s)/d/ing` (figurative), `crucial`, `vital` (role/importance/part), `ever-evolving`, `ever-changing`, `in today's (digital) world/age`, `dynamic landscape`.
- **Hedging openers**: "It's important to note that", "It's worth mentioning", "Generally speaking", "In essence", "At its core", "It should be noted that", "It's also worth pointing out".
- **Authority tropes** (sentence start): "At its core,", "In reality,", "Fundamentally,", "What really matters is", "The heart of the matter is", "At the heart of X is/lies".
- **Signposting announcements**: "Let's dive in(to ...)", "Let's break this down", "Here's what you need to know", "Without further ado", "In this article, I'll ...", "Buckle up".
- **Transition tics** (sentence start): "Furthermore,", "Moreover,", "Additionally,", "In conclusion,", "To summarize,".
- **Performative balance**: "however" / "on the other hand" appended to every claim.
- **Em-dash pileups** (more than two em-dashes per paragraph).
- **Filler phrases** (`--mode full` only): "in order to" → "to", "due to the fact that" → "because", "prior to" → "before", "with regard to" → "about", "a wide variety of" → "many", "at this point in time" → "now", "the fact that" → "that", etc.
- **Negative-parallelism tricolons** (`--mode full` only): "No guesswork, no bloat, no surprises." — the rhetorical triple-no punch.

### Tighten

- Tricolons: "X, Y, and Z" stacks where two would suffice — keep two, drop the weakest
- Bullet soup: three bullets that say the same thing → merge into one sentence
- Five-paragraph essay shapes: vary paragraph length; don't write four paragraphs of identical length

### Preserve EXACTLY (never modify)

- Fenced code blocks (```...```) — every byte
- Indented code blocks (4-space)
- Inline code (`...`)
- URLs and markdown links
- File paths (`./src/`, `/etc/`, `C:\Users\...`)
- Commands (`npm install`, `git rebase`, `docker run`)
- Technical terms, proper nouns, API names
- Dates, version numbers, numerics
- Environment variables (`$HOME`, `${NODE_ENV}`)

### Preserve structure

- All markdown headings (text exact)
- Bullet hierarchy and nesting
- Numbered lists
- Tables (compress cells; keep structure)
- YAML frontmatter

### CRITICAL RULE

Everything inside ` ``` ... ``` ` is read-only. No comment changes, no whitespace changes, no line reordering. Inline backticks: same. Code is the substrate; humanization only operates on prose between code regions.

## Pattern (before → after)

| #   | Before                                                                                                                                                                                                                | After (deterministic, `--mode balanced`)                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | It's important to note that running tests prior to pushing changes is a comprehensive best practice. Additionally, it's worth mentioning that this can prevent broken builds.                                         | Running tests before pushing changes is a broad best practice. This can prevent broken builds. |
| 2   | The application leverages a microservices architecture that comprises multiple discrete components.                                                                                                                   | The application uses a microservices architecture that comprises multiple discrete components. |
| 3   | At its core, caching trades memory for latency.                                                                                                                                                                       | Caching trades memory for latency.                                                     |
| 4   | Let's dive in. Here is the first step.                                                                                                                                                                                | Here is the first step.                                                                |
| 5   | The intricate interplay between caching and latency is crucial.                                                                                                                                                       | The detailed link between caching and latency is important.                            |
| 6   | In today's digital world, we ship fast.                                                                                                                                                                               | Today, we ship fast.                                                                   |

### At `--mode full`, additionally:

| #   | Before                                                   | After                                 |
| --- | -------------------------------------------------------- | ------------------------------------- |
| 7   | We ran the tests in order to verify the fix.             | We ran the tests to verify the fix.   |
| 8   | The build failed due to the fact that the disk was full. | The build failed because the disk was full. |
| 9   | No guesswork, no bloat, no surprises.                    | _(stripped)_                          |

### Reference

- `blader/unslop` — Claude-Code skill listing 30+ AI tells; we incorporated the strongest signals.
- Wikipedia: *Signs of AI writing* — public taxonomy cross-referenced for vocab.
- Full comparison + gap analysis: `docs/research/IMPLEMENTATION_TRACE.md`.

## Boundaries

- Only operate on `.md`, `.txt`, `.markdown`, `.rst`, or extensionless natural language.
- Never modify `.py`, `.js`, `.ts`, `.json`, `.yaml`, `.yml`, `.toml`, `.env`, `.lock`, `.css`, `.html`, `.xml`, `.sql`, `.sh`.
- Mixed prose-and-code files: humanize only the prose; leave fenced code untouched.
- If unsure whether a file is prose or code: leave unchanged.
- Backup `FILE.original.md` is written before overwrite. Never humanize a file already named `*.original.md`.
- Sensitive paths (anything matching `.env*`, `*.pem`, `*.key`, `~/.ssh/`, `~/.aws/`, etc.) are refused before any read or API call.
- Files larger than 500 KB are refused.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
