---
name: poka-yoke
description: "Mistake-proof code, config and process: make the wrong action impossible or self-announcing rather than documented."
category: development
risk: safe
source: rainmanjam/poka-yoke
source_repo: rainmanjam/poka-yoke
source_type: community
date_added: "2026-08-25"
author: rainmanjam
tags: [mistake-proofing, code-review, api-design, guardrails, reliability]
tools: [claude, cursor, codex]
license: "MIT"
license_source: "https://github.com/rainmanjam/poka-yoke/blob/main/LICENSE"
---

# Poka-Yoke: Mistake-Proofing for Software

Shigeo Shingo's insight, from the Toyota Production System: **people will always make
mistakes; that is not the problem worth solving. The problem is letting a mistake become a
defect.** So you stop trying to make humans more careful and start redesigning the work so
the mistake either cannot physically happen or announces itself immediately.

A poka-yoke ("poh-kah yoh-kay", ポカヨケ) is a *device*: a jig, a shape, a counter: not
an instruction. In software: a type, a constraint, a hook, a schema, a state machine. The
single most important consequence:

> **A comment, a docstring, a wiki page, a code review checklist, or a line in CLAUDE.md
> saying "don't do X" is not a poka-yoke.** It is training. Training degrades. A device
> does not. If your proposed fix relies on someone remembering something, keep going.

## When to Use This Skill

- Use when the user says "poka-yoke this", "mistake-proof it", or "make this harder to get wrong".
- Use when designing an interface, schema or state machine and the ask is "make invalid states unrepresentable" or "so callers cannot screw it up".
- Use when auditing existing code for footguns: "what could bite us here", "what is easy to misuse".
- Use after an incident, when the fix must close the class rather than the case: "make sure this never happens again", "this is the third time".
- Especially for money, auth, permissions, deletion, migrations and pipelines, where failure is silent.

## The two axes

Every real poka-yoke answers two questions. Use both when you classify a hazard or propose a
device. They are the difference between this method and generic code review.

### Axis 1, Regulatory function: what happens when the mistake occurs?

This is a strict preference ladder. Always reach for the highest rung you can afford.

| Rung | Name | What it does | Software examples |
|---|---|---|---|
| **1** | **Control** | The mistake is **impossible**. The work cannot proceed. | Type won't compile · `NOT NULL` / `CHECK` / unique constraint · required function argument · private constructor + smart constructor · PreToolUse hook returns deny · protected branch |
| **2** | **Warning** | The mistake is possible but **announced at the moment it happens**. | Lint error in the editor · failing CI gate · runtime assertion that throws · confirmation prompt naming the exact thing being destroyed |
| **3** | **Detection** | The mistake ships, and something **finds it afterward**. | Tests · monitoring · alerting · reconciliation job |
| **0** | *(not a poka-yoke)* | Relies on a human remembering. | Docs · comments · training · "be careful" · review checklists |

Shingo's rule: prefer **control** over **warning**, always, and only settle for warning when
control is genuinely too expensive, then say *why* out loud. In software the honest reason
is usually "the language can't express it" or "it would break every existing caller," and
both are worth stating explicitly so the tradeoff is visible.

### Axis 2, Setting function: how does the device notice?

Shingo's three detection methods map cleanly onto software. These are your **inspection
lenses**, run all three over any interface and you will find hazards that a general
code review misses.

| Method | Factory floor | The question to ask code | Software devices |
|---|---|---|---|
| **Contact** | The part physically won't seat unless it's the right shape and orientation | **Can the wrong thing fit?** | Distinct types instead of shared primitives · branded/newtype IDs · parse-don't-validate at boundaries · units in the type · discriminated unions instead of bags of optionals |
| **Fixed-value** | A counter says all 6 screws were fitted | **Can the wrong count or an incomplete set pass?** | Exhaustive `match`/`switch` over an enum · required fields · "all migrations applied" check · row-count guard on a bulk write · checksums · config validated as a whole at boot |
| **Motion-step** | A sensor confirms step 3 happened before step 4 | **Can the steps happen in the wrong order, or be skipped?** | Typestate · builder that cannot `.build()` until required steps run · state machines with illegal transitions unrepresentable · idempotency keys · RAII / `defer` / context managers · transactions |

### The third principle: inspect at the source

Shingo separated **source inspection** from **informative inspection**, which finds the defect
only after it exists and comes in two forms. Ranked best first, that is three places you can
put the device.

1. **Source inspection**: check the *conditions* before the error can occur. Designed in
   where you can, enforced at runtime where you cannot.
   The type, the constraint, the signature.
2. **Self-check** (informative): the work checks itself as it happens. Runtime. Assertions,
   fail-fast, validation at the boundary.
3. **Successive check** (informative): the next station checks the previous one. Review, CI,
   QA.

Push every device as far up this list as it will go. A CI gate that catches a bad migration
is good; a schema that makes the bad migration unwritable is better and costs less forever.

## How to use this skill

You have been asked to apply the method. There are two ways to do that, and picking the
wrong one wastes the request.

**If a specialist mode clearly fits the subject, load it**: the table below maps them. Those
files carry the domain detail this one does not: what a tenant-scoping device looks like, what
expand/contract means, which lint rules catch silent failure.

**If none clearly fits, apply the method here.** This file is self-contained enough to do
that, and refusing to act because the subject is not on a list would be its own failure. A
Terraform module, a support runbook, a spreadsheet everyone edits, a release checklist, a
prompt template, an onboarding process, a physical workflow: the method works on any of them,
because Shingo developed it on an assembly line, for people fitting springs into switches, and
not for software at all.

Applying it directly means four steps, in order:

1. **Name what is being done, and by whom.** A device protects a specific action taken by a
   specific person or system. "The pipeline" is not an action; "an engineer re-runs the deploy
   job after it fails halfway" is.
2. **Run the three lenses** over that action, can the wrong thing fit, can an incomplete or
   wrong-sized set pass, can the steps happen in the wrong order. Most subjects yield
   something on at least one.
3. **For each hazard found, state it as a mistake someone could make**, what happens when they
   do, whether it is silent, and what exists today to stop it.
4. **Propose the highest-rung device you can afford**, and say which rung it reaches. If you
   land on Warning, say what Control would have required and why you did not take it.

Then apply the two rules in *How to talk about this* below: name the mistake rather than the
mistaken, and never let the answer come out as "be more careful" or "document it". Those are
rung zero, and the whole method exists because they do not work.

**If the request is bare**, `/poka-yoke` with nothing attached, look at what is actually in
front of you: the current diff, the file under discussion, the thing the conversation has been
about. Say what you picked in one line before starting, so it is cheap to redirect you. If
there is genuinely no subject, ask what they want mistake-proofed rather than guessing.

## Choosing a mode

These are specialist modes, each carrying the full working method for its domain. Load one
when it clearly fits. When two apply, do them in the order listed. When none does, apply the
method directly as described above: the table is a shortcut, not a gate.

| If they are… | Use | Typical asks |
|---|---|---|
| Looking at code that already exists and asking what could go wrong | **`audit`** | "poka-yoke this repo" · "what's easy to misuse here" · "find the footguns" · "review this PR for ways to screw it up" |
| About to write an API, module, schema, or data model | **`design`** | "design this so it can't be misused" · "make invalid states unrepresentable" · "what should this signature be" |
| Wanting mechanical enforcement in the pipeline | **`guardrails`** | "add pre-commit hooks" · "gate this in CI" · "enforce it so it can't be merged" · "lint rule for this" |
| Dealing with something that already broke | **`retro`** | "this happened again" · "postmortem" · "make sure this never recurs" · "why did this get through" |
| Building or reviewing a user interface | **`ux`** | "users keep deleting the wrong thing" · "make this form harder to get wrong" · "add a confirmation" · "this flow is error-prone" |
| Deploying, migrating, or changing infrastructure | **`ops`** | "deploy this safely" · "what's the blast radius" · "this migration is scary" · "add a kill switch" · "prevent accidental deletion" |
| Working on pipelines, warehouses, or metrics | **`data`** | "the numbers are wrong" · "add data quality checks" · "safe backfill" · "upstream changed the schema" |
| Working on multi-tenant, permissions, or endpoints | **`authz`** | "can users see each other's data" · "IDOR" · "tenant isolation" · "we forgot to filter by org_id" |
| Shipping an AI feature to users | **`llm`** | "the model returns bad JSON" · "it hallucinates" · "prompt injection" · "add evals" |
| Worried about what an AI agent will do to the repo | **`agent-guardrails`** | "stop Claude from touching prod" · "hooks so the agent can't break X" · "make this repo safe for agents" |

Two of these are easy to confuse. **`llm`** is for AI features *you ship to users*;
**`agent-guardrails`** is for constraining an agent that *works on your repo*.

Modes compose, and real requests often need two. An incident involving a bad migration is
`retro` for the analysis and `ops` for the device. A cross-tenant leak is
`retro` plus `authz`. Read both; the retro decides *what* to install and
the domain skill decides *which device*.

If the request is a general question ("what is poka-yoke", "how does this apply to software")
answer from this file directly: the two axes above are the substance.

## The hazard catalog and language specifics

The recurring ergonomic hazards: the signatures and shapes that reliably produce mistakes, live in `../../references/hazard-catalog.md`, each with the lens that finds
it and the device that fixes it. Read it when you are auditing or designing; it is the
working vocabulary for both.

Language-specific devices (what the type system will and won't let you express, which
constructs are idiomatic, what the linters can enforce) live in:

- `../../references/lang-typescript.md`
- `../../references/lang-python.md`
- `../../references/lang-rust-go.md`

Read only the file for the language in front of you. If the language isn't covered, the two
axes still apply, work out which construct in that language gives you contact, fixed-value,
and motion-step checking, and say which rung you landed on.

## How to talk about this

Two habits keep the analysis honest and keep people from getting defensive:

**Name the mistake, not the mistaken.** "This signature lets a caller swap the two IDs" is
actionable and true. "The developer should have been more careful" is neither. Shingo was
emphatic that blaming the operator is how organizations avoid fixing the process. Write
findings about the code's affordances, never about who wrote it.

**Say which rung you achieved, and what stopped you going higher.** A recommendation that
reads "added a runtime assertion (warning), control would need a newtype, which touches 40
call sites" gives the reader a real decision. One that reads "added validation" does not.

## Applying changes

Propose before you edit. Show the hazard, the proposed device, and the rung it reaches, then
wait for a go-ahead before changing files: the whole point of this method is that it changes
the shape of an interface, and that is precisely the kind of change people want to see first.
Once approved, apply it and leave a marker comment saying what mistake it prevents (see the
recording section in `audit`).

The exception is when someone has explicitly asked you to write new code, in `design`
mode, mistake-proofing *is* the code they asked for, so build it, then narrate which hazards
you designed out and why.
