---
name: faf-context
description: Get your project to 100% ✪ AI-readiness, fast — the AI auto-detects your stack and only asks for what it can't know (your goal and the human "why"). Least typing, maximum context. For time-conscious builders; feeds into faf-expert for depth.
risk: unknown
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/faf-context
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# FAF Context — Give the AI What It Needs
## When to Use

Use this skill when you need get your project to 100% ✪ AI-readiness, fast — the AI auto-detects your stack and only asks for what it can't know (your goal and the human "why"). Least typing, maximum context. For time-conscious builders; feeds into faf-expert for depth.


**AI writes its best code when it has your project's context. This skill helps you hand it over — fast, and to 100%.**

`.faf` is an **IANA-registered context format** (`application/vnd.faf+yaml`) — a typed, portable file *you own*, readable by any AI (no bespoke manifest, no vendor lock-in). The whole point is one number: **AI-readiness, 0–100%.** At **100% ✪** the AI starts every session already knowing your project — no re-explaining, no guessing. This skill is the *builder's* path to that number: minimum typing, maximum context.

> For the done-for-you one-click path, use **faf-wizard**. To master the format, use **faf-expert**. This skill is the quickstart in between.

## How it works: app-type → AI fills the max → you answer the gaps

**faf-cli has 21 slots.** It works in three steps — and only the last one needs you:

1. **Your app type sets which slots are *required*.** A CLI needs different slots than a full-stack web app — faf-cli right-sizes the set and `slotignored`s the rest (never counted against you).
2. **The AI fills as many as it can.** `faf auto` detects your stack + language, and a sharp **goal sentence** seeds who/what/where. The better your goal, the more the AI fills for you.
3. **Whatever's left empty, the AI asks you.** Those are the bits only you know — usually a couple of the 6 Ws (often *why* and *when*). Answer them → **100% ✪.**

So your job isn't "fill 21 boxes." It's: **write one good goal, then answer the few questions the AI couldn't fill itself.**

> *(Teams / Enterprise tiers add more slots — monorepos, caching, versioning — but those aren't faf-cli. **faf-cli is the 21.**)*

## You rarely type all 6 Ws — here's why

The 6 Ws are "the underivable half" — but you almost never write all six from scratch:

- **who / what / where** → **seeded from your goal sentence** (the AI extracts the facts your goal literally states)
- **how** → **sourced from your stack** (detection knows how it's built)
- **why / when** → **the only two that are purely yours**

**So the fast path is: write one sharp goal, confirm the seeds, fill `why` + `when`. → 100%.**

> **"Sometimes 3 Ws is enough. Sometimes the goal alone is enough."** A great goal sentence + auto-detection can carry who/what/where/how on their own — leaving you two small answers. The better your goal, the less you type.

## The fastest path to 100% ✪

```bash
faf auto      # 1. AI detects your whole stack + seeds context from your README
faf score     # 2. See the number + exactly which slots are still empty
faf go        # 3. Guided fill: confirm the seeded Ws, answer the 1–2 left
faf score     # 4. 100% ✪
faf sync      # 5. Push context into CLAUDE.md / AGENTS.md (optional)
```

Most projects are 1 good goal sentence + 2 answers away from Trophy.

## Write the ONE goal sentence (this does the heavy lifting)

The goal is the **generative input** — it seeds who/what/where automatically. Make it a real, specific sentence (it's also your *use-case*):

- ✅ *"A CLI that scores any repo's AI-readiness and syncs context to Claude, Cursor, and Gemini — for solo developers."*
  → seeds **what** (a CLI that scores AI-readiness), **where** (Claude, Cursor, Gemini), **who** (solo developers). You'd only add **why** + **when**.
- ❌ *"A tool to improve development."* → generic; seeds nothing. (Generic phrases are *ignored* on purpose — empty beats wrong.)

## The 6 Ws — terse labels, not prose

Each W is a **3–4 word label** (hard cap < 6) — a scannable spec card, not a paragraph:

| W | Asks | Example |
|---|------|---------|
| Who | who is it for? | `solo developers` |
| What | what are they building? | `AI-readiness scorer` |
| Why | why does it exist? | `eliminate context re-explaining` |
| Where | where does it run/ship? | `npm, Homebrew` |
| When | timeline / stage? | `production, since 2025` |
| How | how is it built/used? | `Bun CLI + WASM` |

## Slots that don't apply → `slotignored`

A CLI has no frontend; an API has no UI library. Mark those **`slotignored`** and they drop out of the denominator — you're scored only on slots that *matter for your app type*. **100% means "everything that applies is filled,"** not "every box checked." (`faf auto` and `faf go` handle most of this for you.)

## The honesty rule (why this works)

The AI **only seeds facts your goal/README literally state** — never invents, never uses templates. What it can't source, it leaves empty for you. **Empty beats wrong.** That's why the resulting context is trustworthy: every slot is either detected, stated by you, or honestly blank.

## When you're done here

- Want it done **for** you, one click? → **faf-wizard**
- Want to **master** the format (scoring internals, MCP config, bi-sync)? → **faf-expert**
- Driving a repo all the way with an agent? → **`faf go`** / **faf-loop**

---

**The goal:** the AI is only as good as the context you give it. Answer the few things only you know — the gaps it couldn't fill itself — and it's optimized to help you at **100% ✪**.

*MIT · part of the FAF skill family (faf-context · faf-wizard · faf-expert)*

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
