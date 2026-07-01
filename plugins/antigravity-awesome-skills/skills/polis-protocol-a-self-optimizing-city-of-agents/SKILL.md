---
name: polis-protocol-a-self-optimizing-city-of-agents
description: "Polis Protocol: A Self-Optimizing City of Agents"
risk: unknown
source: https://github.com/yehudalevy-collab/polis-protocol/tree/main/
source_repo: yehudalevy-collab/polis-protocol
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/yehudalevy-collab/polis-protocol/blob/main/LICENSE
---

# Polis Protocol: A Self-Optimizing City of Agents
## When to Use

Use this skill when you need polis Protocol: A Self-Optimizing City of Agents.


A protocol that lets AI agents from different vendors collaborate on a long-running project, route work to whoever is best at it, and get measurably better over time. Everything lives in a folder of markdown files, so any tool that reads and writes text can participate — no central server, no required runtime.

## The core idea

Treat the project as a small *polis*: citizens (the agents) that share a constitution (the protocol), publish public identities (capability cards), enter contracts (tasks), and leave a public record of how things went (lessons). Three institutions plus a self-change mechanism:

1. **The Register** — identity and capability discovery (capability cards).
2. **The Contract** — structured tasks with learned routing.
3. **The Chronicle** — lessons that compound and feed back into routing.
4. **The Amendment** — citizens change the rules when reality demands it.

This buys what shared-vault setups don't: cross-vendor optimization (work goes to whoever is best at it), self-development (routing improves with use), and constitutional evolution (the protocol updates itself from friction). For pure note-passing without routing, prefer agent-vault.

## When this skill is active

Any multi-agent scenario where "who should do this" is a real question: founding or joining a polis; writing, claiming, or settling a contract; running a chavruta review; proposing or ratifying an amendment; or diagnosing a stalled contract, sync conflict, router pathology, or stuck quorum. Upgrading from agent-vault → `references/troubleshooting.md` ("Migrating from agent-vault").

## Structure of a polis

A polis lives in a `_polis/` folder at the project root; everything outside it is project content the protocol never touches.

- `CONSTITUTION.md` — canonical tool-agnostic protocol · `index.md` — current state · `README.md` — human explainer
- `chronicle.md` — append-only event log
- `citizens/<agent-id>/` — `capability_card.yml`, `status.md`, `inbox.md`, `journal.md`
- `contracts/open/<id>.md` · `contracts/settled/<id>.md` · `contracts/routing_stats.yml` (learned policy, updated on settle)
- `lessons/<capability-tag>/<id>.md` · `reviews/<YYYY-MM-DD-HHMM>-<contract>.md` · `amendments/proposed|ratified/`
- Project root also gets `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` bridge pointers and `.agents/skills/polis-protocol/SKILL.md` (Codex/Antigravity copy), all pointing at `CONSTITUTION.md`.

Citizens link to project files with wikilinks (`[[path/to/note]]`). The `_polis/` folder is the only thing the protocol owns.

## The first thing to do every session

Before touching any project file, run the entry routine, in order:

1. **Polis exists?** Look for `_polis/CONSTITUTION.md`. If absent, scaffold it (see "Founding a polis").
2. **You are registered?** Look for `_polis/citizens/<self>/capability_card.yml`. If absent, register (see "Registering a citizen").
3. **Read `_polis/CONSTITUTION.md`** once per session — it is the canonical protocol for this polis; this SKILL.md is the seed it grew from.
4. **Read `_polis/index.md`** — where things stand (a two-minute read).
5. **Read your inbox** — `_polis/citizens/<self>/inbox.md`.
6. **Scan the tail of `chronicle.md`** backward until you reach the `last_seen_event:` in your `status.md`. That is your catch-up.
7. **Read your open contracts** — anything in `_polis/contracts/open/` with `owner: <self>`.
8. **Update `last_seen_event` and `last_active` in your `status.md`.**
9. **Report back to the user** — state of the project, what's in flight, what needs their input, a concrete first move.

If `chronicle.md` has grown large, the rollover policy (`references/troubleshooting.md`) keeps it bounded.

## The chronicle: recording what you did

After each meaningful action, append exactly one line to `_polis/chronicle.md`. The format is rigid because the router and other citizens parse it:

```
- YYYY-MM-DD HH:MM | <agent-id> | <verb-phrase> | [[<wikilink>]] | <one-line note or - >
- 2026-05-14 09:15 | codex-frontend-pesaj | settled contract | [[contracts/settled/auth-refactor]] | tests passing, lesson filed
```

A meaningful action is anything another citizen needs to know about (contract opened/settled, handoff, blocker, review requested, amendment proposed, index-keeper change). Internal reasoning and minor edits stay in your private `journal.md` and never reach the chronicle — protecting its signal-to-noise ratio is the single most important discipline.

Reserved verb phrases carry meaning scripts may filter on: `joined`/`left polis`, `opened`/`claimed`/`settled`/`abandoned contract`, `filed lesson`, `requested review`/`signed off`/`rejected review`, `proposed`/`ratified`/`rejected amendment`, `blocked on <thing>`/`unblocked`, `assumed`/`released index keeper`. Full semantics in `references/protocol-spec.md`; otherwise use plain past-tense verbs.

**Granularity — the most common failure is over-recording:** would another citizen waste time, make the wrong call, or duplicate work if this is *not* recorded? If yes, record it; if no, don't. Calibration table in `references/troubleshooting.md`.

## The Register: capability cards

Every citizen publishes `_polis/citizens/<agent-id>/capability_card.yml` — the machine-parseable answer to "who can do what":

```yaml
agent_id: claude-research-pesaj
vendor: anthropic        # model: claude-opus-4-7
capability_tags:
  long-context-reading: { self_rating: 5, evidence: "150k token context" }
  spanish-translation:  { self_rating: 3, evidence: "native-ish, not certified" }
cost_envelope: { relative: medium }   # low|medium|high   latency: typical/max minutes
content_hash: "sha256:…"   # tamper-evidence, not a cryptographic signature
```

Self-ratings are starting points, not truth — actual performance in `routing_stats.yml` takes over within a few tasks per tag. Keep tags specific (`react-component-design`, not `frontend-code`), edit your own card freely as you learn, and treat `content_hash` as tamper-evidence (it shows a card changed since last stamped via `polis verify`, not *who* changed it). New agents write their own card without asking — the Register is open by design. Full schema: `references/protocol-spec.md`.

## The Contract: structured tasks with learned routing

Contracts have three sections written over the contract's life: **Intent** (goal, acceptance criteria, required capability tags, deadline, cost ceiling, stakes) at open; **Assignment** (owner, approach, effort) at claim; **Settlement** (outcome, what worked/bit, lesson reference, quality score) at close. Schema in `references/protocol-spec.md`; templates in `references/templates.md`.

**Routing** is a multi-armed bandit: for each required tag, score every citizen from self-rating (weighted heavily at cold-start), historical quality in `routing_stats.yml`, cost, and availability; usually route to the top score (exploit), occasionally to another (explore, default 15%) to keep the policy honest. Runs as `scripts/route_contract.py` or as a brief reasoning step — same recommendation either way. It is a recommendation, **not a command**: any citizen may override by claiming and noting why in the `Assignment` section; overrides are logged and feed the policy. Math and tuning: `references/routing.md`.

**Settling** does three things together: write the `Settlement` section; create a lesson under `_polis/lessons/<tag>/<id>.md` (one paragraph + tags); post a `settled contract` chronicle line. The router reads settled contracts and lessons to update `routing_stats.yml` — that update is what makes the team improve. Lessons (frontmatter: `lesson_id`, `filed_by`, `capability_tags`, `related_contracts`, `quality_impact`, then one paragraph) are pulled by new contracts in the same tag before routing, so both the router and the executing agent carry the team's accumulated wisdom. This is what turns amnesiac agents into a team with institutional memory.

## Chavruta review for high-stakes contracts

Any contract flagged `stakes: high` (deletes data, ships to production, makes an architectural call, or commits to an expensive-to-reverse direction) requires a second citizen — ideally **from a different vendor** — to critique the plan before execution. Flow: owner writes the `Assignment` "Plan" and posts `requested review` + an inbox note to a strong reviewer → reviewer writes `_polis/reviews/<ts>-<contract>.md` answering "what's right / what's missing / sign off, request changes, or reject" → on sign-off the owner executes; on changes, revise once and repeat; on reject, escalate or abandon. Same-vendor review is allowed but weaker — the structural difference between models is the whole value. Use sparingly; most contracts are low-stakes and skip it. Details: `references/protocol-spec.md`.

## The Amendment: a polis that updates itself

When a citizen notices a recurring failure, an unclear rule, or a routing pathology, they propose an amendment. Flow: write `_polis/amendments/proposed/<id>.md` (problem + proposed constitution change + any new rule/format) → post `proposed amendment` to the chronicle and a one-line pointer to every inbox → citizens respond in the file (`agree | disagree | abstain | request changes` + rationale) → on quorum (default: simple majority of citizens active in the last 14 days) move it to `ratified/` and edit `_polis/CONSTITUTION.md`, one chronicle line each. Rejected amendments stay in `proposed/` with `status: rejected` so future citizens know what was tried. The constitution is always canonical for a given polis; this SKILL.md is the seed. When to amend vs. work around, quorum rules, examples: `references/amendments.md`.

`polis reflect` automates the *noticing*: it mines settled-contract history for recurring process pathologies (chronic misroutes, low-quality tags, stakes miscalibration) and drafts evidence-backed proposals into `amendments/proposed/` (authored by `polis-reflector`, citing the contracts). It only proposes — citizens still vote and ratify. Run `polis reflect` to preview, `--apply` to file them.

## Founding a polis

If `_polis/CONSTITUTION.md` does not exist, found the polis. Three paths, in order of preference — use the first one available in your environment:

1. **Online, latest (recommended).** `uvx` fetches the newest release from PyPI, so users stay current automatically:
   ```
   uvx polis-protocol init --project-root <path> --agent-id <your-agent-id> \
     --vendor <anthropic|openai|google|other> --model <model-id> --project-name "<name>"
   ```
   (Equivalent: `pipx install polis-protocol` then `polis init …`.)

2. **Offline — no network, no install.** This skill ships a self-contained initializer next to its `templates/`. Run it with the same flags from the skill folder:
   ```
   python scripts/init_polis.py --project-root <path> --agent-id <your-agent-id> \
     --vendor <…> --model <model-id> --project-name "<name>"
   ```
   It needs only Python 3 and the bundled `templates/` — no `polis` package, no network. Use this whenever `uvx`/`pipx` is unavailable (sandbox, offline, no PyPI) instead of hunting for a missing CLI.

3. **By hand — no Python at all.** Copy the templates in `references/templates.md`. The minimum viable polis is `_polis/CONSTITUTION.md` + your own `capability_card.yml` + an empty `chronicle.md` with a frontmatter block.

All three write the full `_polis/` structure (constitution, founder's capability card, seed `chronicle.md`, empty `routing_stats.yml`, and the `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` bridge pointers). All are idempotent and never overwrite existing files. `polis init --repair` (or re-running the script) restores missing managed files; `polis migrate --plan|--apply|--rollback` handles schema upgrades reversibly.

## Registering a citizen into an existing polis

When you arrive at a project that has `_polis/CONSTITUTION.md` but no card for you, register yourself — do not wait for permission:

1. Pick an agent ID (convention below).
2. Create `_polis/citizens/<your-id>/`.
3. Write `capability_card.yml` (schema in `references/protocol-spec.md`).
4. Create empty `status.md`, `inbox.md`, `journal.md` from the templates.
5. Post a `joined polis` line in `chronicle.md` linking your card.
6. Continue with the entry routine.

**Agent ID convention:** `<vendor-or-tool>-<role>-<project>`. The vendor prefix lets any citizen see at a glance which model produced a chronicle line. Good: `claude-research-pesaj`, `codex-frontend-pesaj`, `gemini-translator-pesaj`. Bad: `agent-7a3f` (opaque), `helper` (generic), `gemini-2026-05-14-1430` (timestamps aren't identity). Lowercase, hyphens only, 8–40 chars; once registered, never rename.

## Working across vendors

The bridge pointers written at bootstrap let Claude, Codex, Gemini CLI, GPT-based tools, and anything that reads markdown share one polis (`AGENTS.md` also covers Jules, Aider, goose, opencode, Zed, Warp, VS Code, Devin). All point at `_polis/CONSTITUTION.md`, so the protocol updates in one file. Cross-vendor routing is the payoff: the bandit sends a translation to whoever has the best `spanish-translation` track record, not whoever happens to be the current chat.

## Failure modes and recovery

Full recovery steps in `references/troubleshooting.md`. A citizen goes silent → check `status.md`; past the stale threshold, transfer ownership. Two citizens claim one contract → first-write-wins on `owner:`, loser re-picks. Router keeps picking wrong → likely cold-start; override a few to seed, else amend the weights. A card edited by a non-owner → `content_hash` mismatch via `polis verify`; restore and log. Amendment stuck without quorum → lower the activity threshold or merge proposals (30-day auto-expire). Polis too large → roll `chronicle.md` over quarterly, archive settled contracts past 90 days; lessons never roll over.

## References

- `references/protocol-spec.md` — full schema for every file + reserved-verb semantics; read to validate or parse a file.
- `references/templates.md` — annotated copy-paste templates; read when founding by hand, registering, or filing.
- `references/routing.md` — bandit math, scoring, cold-start, explore-rate tuning; read when the router picks weird.
- `references/amendments.md` — when to amend vs. work around, quorum rules, examples.
- `references/troubleshooting.md` — failure modes, the granularity calibration table, scaling, agent-vault migration.
- `templates/POLIS_CONSTITUTION.md` — the canonical protocol written into each polis on bootstrap.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
