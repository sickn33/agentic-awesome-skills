---
name: shipping-artifacts
description: 'Documenting an AI-built app for handoff, review or audit: the docs that make it reviewable (architecture, flows, permissions, variables, coverage).'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Shipping Artifacts: The Docs That Make AI-Built Code Reviewable

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Documenting an AI-built app for handoff, review or audit: the docs that make it reviewable (architecture, flows, permissions, variables, coverage).


## Purpose

**Keep a durable record of intent so the code can be reviewed.** Record what the system should do, who may do what, where secrets live, and which rules are actually verified. Without that record, neither a human nor an auditing agent can tell whether AI-built code is safe to ship. This skill defines the small document set that restores reviewability.

**Write the intended-state record for humans and the next coding agent.** Every later audit compares code against these docs. A security or performance review is only as good as the intent it can compare against.

## Locations and names: the repo's setup wins

**Treat this plugin's locations, file names, and doc formats as defaults.** The host repo's own setup comes first. Before writing any system doc, coverage map, or audit report, look for:

1. Agent instructions — `AGENTS.md`, `CLAUDE.md`, and everything they import or point to. They often name the docs folder, its files, who maintains each one, and how dates are recorded.
2. A docs location — an existing `docs/`, `documentation/`, or similar folder.
3. Existing equivalents — documents covering the same subjects, under any name: `ARCHITECTURE.md`, `docs/security.md`, `docs/env.md`. Match on coverage, not file name.
4. An existing test-coverage map — a file mapping behaviour to its tests, such as `docs/test-coverage.md`. Match on coverage: a `TESTS.md` or `testing.md` describing how the repo tests is the testing method, not the coverage map.
5. A reports location — wherever the repo already keeps audit or review output.

- **Follow what you find.** Use the repo's docs location, update its existing equivalent rather than creating a parallel file, and keep its naming and date conventions. Required contents stay the same; only location and name change. Follow any agent instructions about how or by whom a doc is maintained.
- **Use the plugin's defaults only where the repo has none.** Docs go in `documentation/` at the repo root, with the names below; the map goes at `documentation/tests.md`, reports at `reports/<name>_{timestamp}.md`. Add no "updated date" line: the file's history is the source of truth.
- **Say which you did.** Name every location and file written, and whether each follows the repo's setup or a plugin default.
- **Never create a file whose name differs from an existing one only in letter case** — `tests.md` beside `TESTS.md`, or `Architecture.md` beside `architecture.md`. On Windows and macOS, they are the same file, so writing overwrites it. Elsewhere, they become two files that collide on the next checkout. Check case-insensitively before creating a file. Use the existing one if it covers the same thing. If it covers something else, such as a testing-method `TESTS.md`, don't write into it. Use the repo's real equivalent; where none exists, pick a name that collides with nothing.

Throughout this plugin, a name such as `architecture.md` or `tests.md` means that document, wherever and under whatever name the repo keeps it.

## How the set is organized

**Always produce core docs; add conditional docs only for existing capabilities.** This is a small core plus conditional docs, not a fixed list. Every reviewable app has the core surfaces.

**Record an absent capability instead of inventing an empty document.** Write one line in `architecture.md`: "No scheduled work — no `cron.md`." An honest map includes what the system doesn't do.

**Derive the coverage map from intent and existing tests.** The `derive-tests` skill produces `tests.md`; it is a verification map, not a subsystem description. The `document-app` skill reverse-engineers the other docs from code.

**Describe the current state honestly, without being paranoid.** The job is an accurate map, not a clean bill of health. Keep each doc short, table-and-bullet heavy, and free of generic theory.
Docs say what is built now; stage changes belong in the log or release history, rather than dated paragraphs superseding one another.

## Core documents

**Capture each core document's required contents and purpose for its reviewer.** Each entry gives its default file name, purpose, required contents, and reviewer use.

### `architecture.md`

**Describe what the system is and how it hangs together.** Capture:

- product overview and key assumptions;
- tech stack;
- how auth, sessions, and claims flow end to end;
- trust boundaries, such as service-role vs. client;
- a short Known risks / assumptions list, each entry backed by where it appears in code, not a generic checklist;
- a "Related Documents" index of every other doc produced.

This is the reviewer's root document; everything else is cross-referenced from here.

### `flows.md`

**Document journeys where permissions and side effects are actually exercised.** Capture:

- each load-bearing flow as actor + precondition + success outcome;
- the step-by-step sequence across UI → server → data → jobs → providers → agents;
- the authz check at each protected step: which claim, role, or scope, on which resource, and the expected deny case;
- trust-boundary crossings: browser→server, server→provider, job→app, agent→tool, webhook→app;
- each step's state changes and side effects: writes, emails queued, jobs triggered, outbound calls.

This gives the runtime view a static `permissions.md` matrix cannot show. Reviewers see where and in what order authorization is enforced, and where it can be skipped.

**Include only flows that touch security or operational concerns.** A flow belongs here only if it touches permissions, data integrity, external side effects, money, privacy, or operational safety. This is a security/operations map, not a feature spec.

### `permissions.md`

**Document who may do what and where each permission is enforced.** Capture:

- roles and claims;
- where scope is derived: token vs. DB;
- a resource × operation × role matrix;
- which tables have row-level security and which rely on code-enforced checks.

This is the static baseline an access-control audit compares code against; `flows.md` shows it in motion.

### `variables.md`

**Map configuration and secrets to their risks and rotation needs.** Capture:

- a table of Name · used-by · scope (server/client) · source · rotation · risk;
- explicit confirmation that no secret is bundled client-side;
- a pre-go-live checklist.

Reviewers use it for the secrets/PII-leak surface and the incident-response rotation plan.

### `tests.md`

**Distinguish rules checked today, proposed tests, and rules checked by nothing.** Keep three clearly separated sections so the map cannot read falsely green:

- Existing coverage — tests in the repo today, each tied to the rule it pins; reality, not a wish-list.
- Proposed tests — recommended cases not yet written, marked by test type: automated unit/integration/end-to-end · guarded live · manual review.
- Gaps — documented rules with no verification at all, ranked by what crossing them exposes.

**Give every coverage row its rule, expected result, evidence, and status.** Each row carries:

use-case → rule → expected behavior (including the deny/negative case) → evidence source (doc + code) → status (existing / proposed / none).

Also note which checks the repo's gate requires. Follow its stated policy, such as a local command plus human go; where none exists, note the CI checks gating merges to `main`.

This is the operational form of "documented == implemented" for reviewers. It shows whether each rule the other docs claim is pinned by a test today, only proposed, or unverified.

**Use the `derive-tests` skill to produce the coverage map.** The `document-app` skill does not produce it. It comes from the other docs and existing test suite, rather than being read off a subsystem.

## Conditional documents (include only when the capability exists)

**Include conditional documents only when their stated capability exists.** Their contents make those surfaces reviewable.

### `emails.md`

**Document every notification only if the app sends transactional or automated email.** Capture:

- the queue → processor → provider path;
- templates and the variables they accept;
- retry/backoff behavior;
- where to look when a send fails.

Reviewers use it to spot unvalidated template inputs and PII exposure boundaries.

### `cron.md`

**Document scheduled work only if scheduled or background jobs exist.** Describe all scheduled work and how to operate it safely. Capture:

- an inventory table: job → schedule → function → secrets → limits → retry;
- how each job stays idempotent;
- how internal calls authenticate;
- where to see last runs.

Reviewers use it to find forgeable triggers and unbounded background jobs.

### `seo.md`

**Document SPA previews only if public, indexable, or bot-facing routes exist.** Describe how the single-page app handles SEO and social previews. Capture:

- the preview approach: static meta / prerender / edge HTML;
- a route → needs-SEO → public-data-only table;
- how dynamic metadata is sanitized;
- bot-vs-human routing.

Reviewers use it to catch public-data-only violations and metadata injection on bot routes.

### `automation.md`

**Document automation only if the app embeds one of these capabilities.** Include it only if the app embeds AI agents, LLM workflows, tool-calling, webhooks, or external automation. Cover embedded agents and other automation paths. For every automation or agent, capture:

- trigger, owner, and whether it runs automatically or only after approval;
- inputs it may read and the exact tools/APIs it may call; the tool surface is itself a hard guardrail;
- where steering lives (the prompt) vs. the non-prompt hard guardrails;
- the output contract back to the app: schema, validation, failure handling;
- app-owned side effects vs. agent-owned suggestions;
- controls: approval gates, audit/timeline logging, rate limits, retries, kill switch.

This exposes hidden automation paths and separates what an agent proposes from what the app enforces. It is the highest-risk surface in modern AI-built apps.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A reviewer who has never seen the code can answer from the docs alone who may do what, where each secret lives and what is tested. Each doc agrees with the code.

## Notes

- **Index every produced document so the set stays discoverable.** Add its reference under "Related Documents" in `architecture.md`, or in the repo's existing docs index.
- **Skip inapplicable conditional documents and say so in one line.** Never invent content for them.
- **Keep examples and finished templates out of these system docs.** They describe this system, not the general method.
- **Keep agent operating context separate from the system documentation.** `AGENTS.md` or `CLAUDE.md`, whichever the repo's structure makes canonical, contains instructions derived from these docs. The ship check's handoff step produces it, following that structure, not here. The user types `ship-check` in Claude Code, `ship-check` in Codex.
- **Use `derive-tests` for `tests.md` and `document-app` for the other docs.**
- **Keep the repo's date convention.** Where none exists, omit an "updated date" line; the file's history is the source of truth.

## Example

For a CSV export release, assemble the shipped behavior, test evidence and known limits, then draft release notes and support copy sourced to the approved diff.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/ai-shipping/skills/shipping-artifacts).
