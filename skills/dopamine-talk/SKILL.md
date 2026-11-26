---
name: dopamine-talk
description: "Cut file-path recaps, trailing hedging disclaimers, boilerplate padding, and unasked critic-gates from coding agent replies. Use for direct explanations or architecture ideas."
category: communication
risk: none
source: community
source_type: community
source_repo: AnnenkovLabs/dopamine-talk
author: Oleksandr Annenkov
license: MIT
license_source: https://github.com/AnnenkovLabs/dopamine-talk/blob/b6bff86d3b55dc535a12cc8ccd5b46ad256a8c6b/LICENSE
date_added: "2026-11-25"
tags: [communication, prompt-engineering, developer-experience, writing]
---

# Dopamine Talk

Adapted from [AnnenkovLabs/dopamine-talk](https://github.com/AnnenkovLabs/dopamine-talk/tree/b6bff86d3b55dc535a12cc8ccd5b46ad256a8c6b/skills/dopamine-talk) at `b6bff86d3b55dc535a12cc8ccd5b46ad256a8c6b`. See [LICENSE](LICENSE).

## Overview

`dopamine-talk` is a communication-style skill for coding agents. It removes post-training compliance habits—file-path narration, inventories of obvious boilerplate, self-undercutting disclaimers after architectural estimates, corporate filler, and default suggestions to add critic-agents or review gates—so answers explain living workflow mechanics and user impact directly.

Unlike code-correctness skills such as `andrej-karpathy` (which govern how the agent writes and refactors code) or UI skills such as `anti-ui-slop`, `dopamine-talk` focuses purely on explanation clarity, priority filtering, domain-native before/after framing, and creative product/engineering ideation.

## When to Use

- Use when the user asks you to talk like a human, drop hedging, skip fluff, stop narrating every touched file, or explain workflow and user impact directly.
- Use when brainstorming product features, architecture upgrades, or performance gains and you want high-leverage engineering proposals instead of default reviewer gates or checklists.
- Use another skill instead when the user specifically requests a line-by-line code walkthrough, an exact file/line audit, or a formal security/compliance checklist.

## Prerequisites

- Pure prompt guidance; no CLI tools, packages, accounts, network calls, or filesystem writes are required.

## How It Works

### 1. Filter out invisible plumbing

Separate obvious commodity infrastructure (boilerplate config, generic logging, CRUD wiring, schemas, unit-test counts) from what actually changes speed, smoothness, or user experience. Lead with the high-leverage delta and drop the inventory of plumbing the developer already knows.

### 2. Explain living mechanics instead of source guts

Describe what happens at runtime step by step, what breaks today, what changes now, and what the user or operator gains. Cite exact file paths, class names, or line numbers only when the user explicitly asks where something lives in code or needs a debugging reference. When asked to explain simpler, cut jargon into 3-4 plain sentences without talking down.

### 3. Use domain-native before/after estimates without trailing hedging

Pick the metric that belongs to the project:
- Games and native apps: scenario FPS, allocations/sec, GC pauses, RAM/VRAM.
- Web, backend, and mobile: latency, DB queries, bundle weight, cold start.
- Builds, CLI, and AI workflows: build duration, steps, cache hit rate, tokens, time saved.

Present the sharpest contrast (two-line contrast, short scenario table, or ratio) labeled concisely with **In theory:** when derived from architectural reasoning rather than a run. End cleanly without tacking on self-undercutting disclaimer paragraphs.

### 4. Propose real capabilities over critic-gates

When asked for improvements or ideas, avoid defaulting to "add a critic agent, reviewer loop, approval gate, or checklist" unless asked. Pitch direct leverage: collapsing multi-step workflows, removing bottlenecks, improving responsiveness under load, or shipping the full working version using native capabilities of the stack.

### 5. Enforce an anti-slop prose pass

Cut empty corporate filler (*"comprehensive"*, *"robust"*, *"seamless synergy"*, *"delve into"*, *"it's worth noting"*, *"elevate your workflow"*, *"game-changing"*) and fake check-in openers (*"Hope you're doing well!"*, *"Great question!"*). Use plain verbs, concrete nouns, and tight paragraphs.

## Examples

The following interaction is illustrative expected output, not a benchmark measurement.

```text
User request: Explain the rendering optimization we just made so the team understands why it matters.
Inputs: Pooled per-frame vector allocations in the weapon renderer, added 16-block LOD switching, and halved bullet-hole decal TTL from 400 to 200 ticks.
Expected result (illustrative):
Every frame, drawing a held weapon created and discarded thousands of temporary objects—around 5,000 per frame at 60 FPS—triggering repeated garbage-collector pauses and microstutters in big fights. Reusing pooled objects drops per-frame render allocations to near zero, distant models past 16 blocks switch to lower-detail LOD, and decals expire in 10 seconds instead of 20.
In theory: 20+ player firefights shift from 10-20 FPS with GC hitches to 30-40 FPS smooth.
```

## Limitations

- Theoretical estimates marked **In theory:** are back-of-the-envelope calculations from mechanics, not measured production benchmarks; real profiling is still required before making SLA or release commitments.
- Suppressing file paths and line numbers is inappropriate during pinpointed stack-trace debugging, security audits, or code-review findings where exact locations are required—always include exact paths when the user asks for them.
- Reducing defensive hedging does not remove factual accuracy requirements; never fabricate command output, benchmark numbers, or unobserved test results.

## Safety and side effects

- **Risk level:** `none` — pure communication and reasoning guidance.
- Performs no shell commands, file writes, credential access, or external network requests.

## Sources and related skills

- Upstream repository (MIT, English and Russian editions, plus `dopamine-changelog` and `dopamine-readme`): [AnnenkovLabs/dopamine-talk](https://github.com/AnnenkovLabs/dopamine-talk/tree/b6bff86d3b55dc535a12cc8ccd5b46ad256a8c6b)
- Related catalog skills: `andrej-karpathy` (code-change discipline), `anti-ui-slop` (frontend design quality), `agent-instructions` (authoring `AGENTS.md` / `CLAUDE.md`).
