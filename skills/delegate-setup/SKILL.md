---
name: delegate-setup
description: Configure approved delegation lanes across installed implementer CLIs,
  including optional model and effort choices, then write global or project config
  only after explicit user approval.
risk: safe
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires Node 18+. No implementer CLIs are required — the skill discovers
  what is available.
metadata:
  version: 0.5.0
---
# Delegate Setup

## When to Use

- You want to configure which implementer CLI handles which kind of work (fleet lanes).
- You need to discover installed implementers and write lane config after user approval.

You are the **orchestrator** in **setup mode**. Discover installed implementer CLIs, propose a
**fleet of lanes**, and write configuration only after the user approves.

This skill does **not** dispatch coding work. It only authors the lane map.

One concept: **lanes**. Never say “routes.”

Example lane: **feature** → implementer `opencode`, model `opencode/grok`, variant `high`
(OpenCode uses `variant` for reasoning intensity, not `effort`).

## When NOT to use this

- The user wants a task implemented — use the matching `*-delegate` skill instead.
- A one-off model change on a single dispatch — pass `--model` / `--effort` / `--variant` on that relay.

## Hard rules

1. Every lane **must** include `implementer`.
2. Put dials on the same object (`model`, `effort` or `variant`, …) only if that implementer supports them — see [references/schema.md](references/schema.md).
3. Show a human-readable lane table **and** the full JSON before every write; re-show after every tweak.
4. Write **only** after an explicit approval (“yes”, “approve”, “write it”).
5. Ask scope unless already clear: **global** (all projects) vs **this repo only**. Never create a project file just because cwd is a git repo. If there is no git repo, default to global and say so.
6. Do not invent model identifiers.
7. In interview or usage-scan mode, never write **any** dial the user did not give you and the schema does not require — omit it, so the CLI’s or relay’s own default applies.
8. Prefer 3–5 useful lanes over a kitchen-sink map.
9. Never edit `AGENTS.md`, `CLAUDE.md`, or other user agent-instruction files.
10. Never run a `*-delegate` relay from this skill.

(`<skill-dir>` is this skill’s install directory — the folder that contains this `SKILL.md`.)

## Flow

`discover → load → grounding menu → propose (with Basis) → scope → approve → write`

### 1. Discover

```bash
node "<skill-dir>/scripts/discover.mjs"
```

Summarize installed vs missing, auth (`true` / `false` / `null` = unknown), and whether models were
`reported`, `aliases` (curated aliases in the registry, not live discovery — full model names also
work), `unsupported`, or `failed`.

### 2. Load existing (effective map)

```bash
node "<skill-dir>/scripts/config.mjs" load --cwd "$PWD"
```

- Neither present → “No lanes configured yet.”
- Otherwise → table of **effective** lanes with a Source column (`global` / `project`). Do not paste
  both raw files unless asked.
- If `projectPresent` is true and `projectTrusted` is false, label the project lanes **untrusted**.
  They cannot dispatch until the user reviews and approves a project write.

### 3. Propose

Discovery reports capability, never task fit. So ask **one** grounding question before proposing
anything — one question, three options, not a wizard:

> How should I pick the lanes? **(1) Quick defaults** — I decide, no questions.
> **(2) Interview** — about four questions on how you want work allocated.
> **(3) Usage scan** — I re-read your CLIs’ local session folders (counts and dates only, never the
> conversations) and let the numbers place your lanes — if one CLI dominates, expect one question
> about its role. Happy to do 2 and 3 together.

- **Quick defaults** → propose immediately.
- **Interview** → the four questions (allocation policy, never model rankings) and how to ask them
  (one medium per round) live in [references/setup-dialogue.md](references/setup-dialogue.md) — read
  it before you ask.
- **Usage scan** → `node "<skill-dir>/scripts/discover.mjs" --usage`. Tell the user it is metadata
  only before running it. Each discovered CLI gains `usage: { sessions, lastUsed }`; `null` means no
  probe is wired — unknown, not unused.
- **Both** → run the scan first, then ask only what the numbers cannot answer.
- Inside a git repo, repo signals (languages, test weight, frontend share) are a fourth source of
  evidence. They do not change the menu; they feed the proposal and the `repo` basis.

**That menu is also the consent surface** — the option chosen sets how much of the map is yours to
decide:

- **Quick defaults** — the user hired your opinion. A full map is legitimate, dials included; label
  every lane `my opinion`, say plainly that the map is your opinion, and keep it cheap to revise.
- **Interview / usage scan** — evidence modes, so **every** dial is gated (rule 7): set one only from
  the user’s answer, or where the schema requires it (opencode lanes require `model`). Omitting is
  always safe — every dial has a default the user already lives with, and a CLI’s configured default
  is their standing choice, better evidence than your priors. Choosing which installed implementer
  gets a lane is still yours — Basis `my opinion` — but a dial that raises spend is not: offer your
  dial picks only as an addendum after the proposal, see
  [references/setup-dialogue.md](references/setup-dialogue.md).
- **An unanswered question shrinks the map; it never licenses a substitution.** Propose fewer, more
  conservative lanes, name the axis you are blind on (no quota answer → say the map is quota-blind),
  and invite the answer anytime. Re-ask once at most; never backfill silence with priors.

**Delegation economics.** The orchestrator reviews and lands every result — the review is the
quality gate, so optimize total cost, not implementer prestige:

- Prefer capable, authenticated, burnable, **low-usage** CLIs for bounded, objectively gated work
  (tests, mechanical refactors, straightforward fixes) when their reliability keeps review and
  rework economical — lanes push token burn away from the subscriptions the user is protecting.
  Low usage alone does not establish burnable: discovery cannot see plans, limits, or per-run
  cost, and a rarely-used CLI may be metered or deliberately avoided. Burnable comes from the
  user's quota answer — or, in quick defaults, from your labeled opinion.
- Avoid binding a lane to a CLI the user is protecting or orchestrates from, by default; bind it
  only when the user asks for it or no acceptable alternative exists. Lanes are
  **orchestrator-blind**: the same lane fires from every seat the user drives from, and from that
  CLI's own seat it dispatches the CLI to itself.
- Surplus placement breaks down when rework and review cost exceed the savings; when the
  implementer is flaky; when correctness rides on security, concurrency, migrations, or unstated
  domain knowledge; and when the output **is** the product (debate, architecture, research) —
  review limits damage, it does not manufacture a good first attempt. Bind those lanes to stronger
  implementers.
- An explicit "spare X" answer removes X from proposed lanes by default, and overrides blanket
  posture answers on any lane the user explicitly retains for X — ask whether the posture applies
  there; omit the dial if unanswered. Never silently stretch one answer across an axis it
  conflicts with.

Question phrasings for the burn/spare and trust interview live in
[references/setup-dialogue.md](references/setup-dialogue.md).

Then propose the lanes. Name them after the work the user described; fall back to `feature`, `tests`,
`ui`, `fast`, `complex`. Installed implementers only.

Show:

| Lane | Implementer | Model | Effort / variant | Basis | Source (if updating) |
| --- | --- | --- | --- | --- | --- |
| feature | opencode | opencode/grok | variant: high | your answer + schema requirement | — |
| tests | codex | — | — | usage data | — |
| ui | claude | — | — | my opinion (implementer) | — |

**Basis** is mandatory on every lane: `your answer` / `usage data` / `repo` / `my opinion` /
`schema requirement` (a dial the schema forces is neither evidence nor opinion — say so). A lane you
picked from model-quality priors is `my opinion` — never present it as something the tooling
determined, and “installed and authenticated” is capability, not evidence of fit. When a lane’s
implementer and its dials come from different places, split the label — see
[references/setup-dialogue.md](references/setup-dialogue.md).

Then the **complete** JSON (`version`: `delegate-fleet.v1`). One line of why per lane; flag auth or
model uncertainty.

Schema and dial table: [references/schema.md](references/schema.md).

### 4. Scope

- User said global / all projects / outside the project → `global`.
- No git repo → `global` (say so).
- Else ask once: global vs this repo only.

### 5. Approve and write

On explicit yes, write **only** the chosen scope (validate first). Build the payload from that
scope’s raw file (or an empty `lanes` object if new) — not from the effective merged `load` view,
or a project write will shadow global-only lanes and a global write will promote project-only ones.

Create a uniquely named file under the platform temporary directory (`$TMPDIR`, `%TEMP%`, or Node
`os.tmpdir()`; never hard-code `/tmp`, which breaks on native Windows), write the **exact approved
JSON** into it with the orchestrator's file-writing tool, and use that populated path as
`<lanes-json>` below. Never validate an empty temp file. Remove the temp file after the
validation/write attempt, whether it succeeds or fails.

```bash
node "<skill-dir>/scripts/config.mjs" validate "<lanes-json>"
node "<skill-dir>/scripts/config.mjs" write --scope global "<lanes-json>"
# or:  write --scope project --cwd /path/to/repo "<lanes-json>"
```

Re-read with `load`, then confirm the path written and the active lane names. Project writes bind
approval to the exact config content; later changes fail closed until re-approved. On update, a short
before/after is enough.

### 6. Ready to delegate

Stop after confirming. Tell the user the map is ready. For later work: read the lane’s
`implementer`, load that `*-delegate` skill, and dispatch with `--lane <name>` (explicit
`--model` / `--effort` / `--variant` still win when passed). Do not start a delegate task
unless they ask.

## Reconfigure

Same flow. Show the effective current map, propose changes, approve, write one scope’s file.
Reinstalling the skills package must not rewrite these files — they live outside the package.


## Limitations

- Never dispatches work itself — only discovers CLIs and writes config after explicit approval.
- Docs-only import — executable helpers (`scripts/`) not included; see upstream for full runtime. Requires Node 18+.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
