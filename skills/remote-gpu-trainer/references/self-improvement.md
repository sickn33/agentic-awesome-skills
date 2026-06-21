# Getting better over time — capture new gotchas + personalize (without corrupting the skill)

This skill is a static reference, so it does **not** evolve on its own. But every real run teaches
something — a new platform quirk, a training bug not in the catalog, or the user's own setup. This file
is the protocol for **sedimenting that knowledge in the right place, at the right bar, without silently
rewriting the skill**. Apply it whenever a run surfaces something the catalog did not already cover.

To jump: `grep -in '<keyword>' references/self-improvement.md`.

## Table of contents
1. The bar — what qualifies as a keepable gotcha
2. Route the learning — user memory vs the catalog vs an upstream PR
3. Propose, don't auto-edit
4. First-run personalization — capture the user's setup into memory
5. Freshness — platform facts rot; stamp and re-verify

## 1. The bar — do NOT enshrine a one-off

A surprising failure is a **hypothesis, not a gotcha** (principle #3; **REQUIRED:**
`verifying-dl-experiments`). Sediment a NEW gotcha ONLY when all three hold:

- **Root-caused** — the mechanism is understood, not just "it worked after I retried."
- **Reproduced or clearly mechanistic** — not a single flaky incident (a transient network blip is not a gotcha).
- **Generalizable** — another user on this platform / training setup would hit it too.

If it fails the bar it is a *project note* (→ §4 memory), not a catalog entry. Enshrining unverified
one-offs is exactly the catalog rot this bar exists to prevent.

## 2. Route the learning

| What was learned | Where it goes | Form |
|---|---|---|
| **User/personal/host-specific** — this account's quirk, the user's preference, the usual GPU plan, "on MY box X is true" | **the host's `memory/` system** (host-specific, personal, may be ephemeral) | a `reference` / `project` / `feedback` fact, one per file, deduped |
| **A project-level fact or recurring error the user keeps hitting on THEIR project** — a config quirk, "always run X first", a path that must be Y, an env that must be activated | a **project instructions file in the user's repo** — `CLAUDE.md` / `AGENTS.md` / `.cursorrules` (persists cross-session AND cross-tool AND for collaborators, unlike host memory) | a short imperative rule; **propose, don't auto-write** (§3) |
| **Generalizable platform gotcha** | `profiles/<platform>.md` §7 (platform-pinned) or `references/gotchas_universal.md` (cross-platform) | `symptom → root cause → fix` + a source URL |
| **Generalizable training-debug gotcha** | `references/training/<topic>.md` | same form |
| **A correction** (a fact here is now wrong/stale) | edit that file; re-stamp its `verified <month>` | note old → new + URL |

Because this skill is open-source, a generalizable addition/correction is also a candidate for an
**upstream PR** — offer to open one so every user benefits, not just this install.

## 3. Propose, don't auto-edit

**NEVER silently rewrite a skill file from a single run** — a wrong "fix" or a broken structure is worse
than a missing entry. Instead:

- Draft the entry (`symptom → root cause → fix`, with its source) and **show it to the user for approval.**
- For an out-of-scope or larger change, spin it off (the host's task / PR mechanism) rather than bloating
  the current run.
- Apply only after the user okays it; then re-run the skill's own checks — cross-refs resolve, **no secret
  value written**, structure + TOC intact.

## 4. First-run personalization → memory

The first time this skill runs for a user, capture their **actual setup** into memory so later runs are
pre-parameterized instead of re-asked:

- which platform(s) they rent, and the per-platform §8 SCRIPT OVERRIDES that worked (paths, proxy hook, cred location);
- the project repo path / training entrypoint / config layout;
- the tracker entity (wandb / trackio) and **where the key lives** (its env-var name or file path — never the value);
- the usual GPU plan + disk budget.

Store as a `project` / `reference` memory. Record only the credential's *name or path*,
never the secret itself. Next session the profile overrides + `run_one` params come pre-filled.

## 5. Freshness — this skill has a shelf life

Platform prices, billing verbs, and limits **change**. Every platform fact is annotated `verified
<month>` at authoring time. Before betting **money or data** on a teardown/billing fact — the
irreversible ones (`terminate` / `destroy` / release) — **re-verify it against the platform's current
docs in the same session.** If a fact is stale, fix it (the §2 correction row) and re-stamp the date. A
quarterly re-verification of each profile's §5 TEARDOWN/BILLING section keeps the highest-stakes facts
honest — schedulable via the host's recurring runner (on Claude Code `/schedule`; other hosts → `references/monitoring_patterns.md` §7). Run `scripts/check_staleness.py` to list every `verified`
stamp older than N months (a mechanical reminder of WHAT to re-check — it does not verify the fact itself).
