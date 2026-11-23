# A starter AGENTS.md for an app repository

Copy the fenced block at the end of this file into the repository's root as `AGENTS.md`. Keep no `CLAUDE.md`, or one whose first line is `@AGENTS.md` (`SKILL.md` § Make sure it loads).

How to adapt it:

- **Section 1's mechanics are general; its owner's choices and pack inventory are the product's.** It was written for SaaS apps on Next.js + Supabase + Clerk + Netlify; lines marked *(stack)* name that stack's mechanism — replace them with your own stack's, keep the principle. Lines that point at a skill (`the release-gate skill`) assume this collection is installed; if it is not, point them at your own docs.
- **Section 2 is the product.** The `app-lifecycle` skill fills it at the brief stage (its `references/product-section.md` explains each heading).
- **Paths** (`docs/…`) are defaults. Use your own, and keep the router's *Open* column true to them: `scripts/check_reachable.py` in this skill lists any doc the file no longer reaches.
- **Delete what the product does not have** — the anonymous-public lines, billing, embedded agents — rather than leaving them as noise every session reads.

---

```markdown
# AGENTS.md

Master instructions for every coding agent in this repository. Claude Code reads this file when there is no `CLAUDE.md`; a `CLAUDE.md` or `CLAUDE.local.md` that does not import `@AGENTS.md` stops it loading, so there is none (or one whose first line is `@AGENTS.md`).

Keep must-follow rules in the first 32 KiB, or raise Codex config’s `project_doc_max_bytes`; builders explicitly open needed sections beyond that budget (`agent-instructions`).

Two sections. **Section 1 is how we build any app** — reuse its mechanics; replace its owner's choices and pack inventory. **Section 2 is this app** — replace it. When they conflict, Section 1 wins on mechanics and Section 2 wins on product. What neither says follows the skills' defaults; where those are silent too, it is the agent's call: decide, and say so in the summary. The longer material lives in `docs/`; **§ 1.8 says what opens when — find the moment you are in before every new task.** The path from idea to production is the `app-lifecycle` skill; each stage's done-when lives in `docs/product/plan.md`.

---

# 1. How we build (general — reuse across apps)

## 1.1 Ownership and authorization

- **Everything belongs to a workspace**, and § 2.3 declares what a workspace is (an organization, or one user). Nothing but the `workspaces` table references the identity provider's ids (and, where the product records authorship, one member table: `saas-authorization`): the product keys on its own row.
- **Two credentials, never mixed:** a verified member session, and — only when the product has an anonymous public — an anonymous token (random, hashed at rest). Member routes never trust the anonymous token; public routes never read session claims. **Another kind of caller**, where the product has one, gets an entry of its own beside these, never folded into either: API tokens for outside agents (`saas-authorization`, `references/threat-model.md` § Leaked tokens and credentials), or a platform's statement about its user (`mcp-server`, `references/server.md`). Without an anonymous public, delete the token's half; without another caller, delete that entry. (`2026-10-30`, an evals product whose only other caller was an API token, from day one, had to rewrite this line.)
- **Deterministic code enforces what is risky or hard to undo.** A screen, a client, a prompt or a model may propose; whether an action that crosses a trust boundary or cannot be taken back happens is decided by server code — a function, a constraint, a hook.
- **Three functions carry the model; no route reads raw claims:** resolve the thing from the URL, require the visitor (anonymous public only), require workspace access with a permission.
- **Permissions are strings; roles map to them; check permissions, not roles.** A screen gates a control on the same permission its action checks.
- **Roles decide who may act; billing features decide how much.** They never touch.
- **Invariants are database constraints, not application code.** Ids in URLs are unguessable; not-found and not-owned return the same 404.
- The model, its reasons and receipts: the `saas-authorization` skill.

## 1.2 Threat model

Untrusted text, abuse and floods, cross-tenant access, leaked tokens, a leaked database, anonymous identity, webhooks, scheduled work, secrets — and embedded agents when the product has them. Each class and its rule: the `saas-authorization` skill. Secrets are never in the repository, a URL, a log line or a client bundle.

## 1.3 Stack, and the choices already made on it

<The stack, one line. (stack) Example: Next.js (App Router, TypeScript) · Tailwind + the kit in `design/` · Supabase Postgres · Clerk · Netlify · Vitest + Playwright.>

A new product proposes these choices rather than re-deriving them, and reopens one only by saying in § 2.3 that its trigger fired. The choices, with their rules, reasons and receipts: the `app-lifecycle` skill (default choices).

- <choice> — **Reopen:** <trigger>.

## 1.4 Database — how we use it

<(stack) The choices the vendor's own skill cannot make: who the only database client is, what row-level security means here, how schema changes ship, what the agent's database connection is for. Each in one line; the depth: the `supabase-production` skill.>

- **The host's deploy does not apply migrations, and nothing warns you; the database provider's git integration may.** If it is set to apply on push to production, or nobody has read that setting, a migration you don't mean to run never sits in the migrations directory. Before any promotion, read the production migration ledger and dry-run what is pending; after the owner's go, apply it by CLI with the target spelled out, then push.

## 1.5 Identity — how we use it

<(stack) Verify, never decode; store ids only; authorization lives with the data, not in a path list; the provider's own components are the sign-in surface. The depth: the `clerk-production` skill.>

## 1.6 Testing and delivery

- **Read the exit code from the log, never the notification.**
- **An inherited report is a claim, not evidence.** Re-run the gate yourself before repeating a count; take a release's subject from git, not prose.
- **`docs/test-coverage.md` is written by whoever ran the gate, by nobody else.**
- **Get a fresh independent review before every deploying push and promotion, however small the change.** This is the default. The session that wrote the code never clears it. Apply `independent-review` for the bar and round scope. Name the phase split, cadence and rough builder hours in the plan message. Apply `release-gate` § Stage and phase close for the phase gate, checks and review order.
- The harness and the gate: the `test-harness` skill. How a change ships: the `release-gate` skill.

### Owner's choices and installed packs

Skill defaults apply. Departures: <none, or each choice once, dated and in the owner's words: model, builder, reviewer with its fallback, review bar, what requires go, design taste and voice>. A reviewer always has a fallback, never "none"; prefer another family, with a fresh session of the builder's family when no other can run (`independent-review`). Product choices live here; global choices live in user-level instructions. **Precedence: current session owner instruction > this entry file > user-level instructions > skill defaults.** Memory in one agent does not reach another vendor's builder or reviewer: record standing choices here immediately. Design detail: `design/README.md`; apply the `ui-design` skill.

Installed packs: <each agent → the packs installed in it>. They update themselves; nothing pins a version.

## 1.7 Working rules for the agent

- Read this file before the first plan.
- **Apply skill defaults without asking.** Ask only when a builder or other non-reviewer model or CLI a default names is missing or out of usage and the product records no fallback that can run; reviewers always fall back as the `independent-review` skill requires. Get the owner's clear go each time before anything irreversible or outward-facing (production, publishing, spend, deleting anything public). Questions about what the product should do are still the owner's.
- **Tests and docs are part of the change.** A bug fix lands with a regression test that fails before the fix; every change updates the doc lines it made false.
- **A doc that disagrees with code you did not change:** say so in the summary; the owner decides which side moves. When this file is silent, the skills' defaults apply; when they are silent too, decide and say so. When a library default conflicts with this file, this file wins.
- Every new environment variable: a placeholder in `.env.example`, a row in `docs/variables.md`, a line in the env schema that fails when it is missing — run at build, not only at boot. A value you generate rather than fetch is generated now, written into `.env`, and named in the summary.
- **No play-by-play.** Plan, build, summarize once.
- **Commit messages go through a heredoc (`git commit -F -`), never `-m "…"`**: a backtick inside `-m` is command substitution, and the text vanishes silently.
- **A fix that carries an exclusion says in its comment why the excluded case does not need it.** A comment stating an invariant about a value protects only its own file: check every route that can receive the value.
- **When a flag's meaning widens, rename it to what it does**, not to one of its reasons.
- **Judge stage completion from its done-when and your own evidence.** Run touched and new tests and apply every router row the diff matches. Give a reason for edits to a test, the gate script or this file. Record evidence or what keeps the stage open. Apply `release-gate` § Stage and phase close for the coordinator's checks of changed journeys, docs and running screens, and for the phase's full gate, review and preview.
- **Keep owner previews from blocking work on the next phase.** Track whether the owner tried each visible phase and name untried phases in the release go message. Feedback becomes stages of the phase in flight. Only exclusive owner decisions wait: design direction and artboards, options, legal text and release go. Explicit owner-only done-whens still hold.
- **Keep operational changes and final judgement with the session agent.** Use the builder and fallback in Owner's choices above. Builders run development suites within the brief's boundaries; apply `delegation` for test access, migration ordering and one runner on shared data. Keep product decisions, review-finding acceptance, deploys, applied migrations, pushes, provider settings, secrets, production credentials and stage judgement with you. If the brief would be nearly as long as the diff, write the diff (apply the `delegation` skill).
- **Proposing steps:** when planning a phase, propose the capabilities whose trigger has fired (the `app-lifecycle` skill).
- **Skills teach method; this repository owns its docs, checks and automation**, reachable from this file. A procedure run by hand a second time becomes a script, its command in the matching § 1.8 row: release, review round and brief, owner's preview, extra checks. The release script runs only after the owner's clear go, for the release that go authorizes; `docs/RELEASE.md` names the steps the owner keeps.

## 1.8 What opens when

At the start of every new task, find the moment you are in — several can hold at once — and open what its row names **before** you act, even a file you read earlier in the session: after a compaction or a long session that read is gone or stale. The rule column is the part that is easy to miss; the file holds the depth. What has no moment (worked examples, the release history) is indexed in `docs/README.md`.

| When you are… | The rule that applies | Open |
|---|---|---|
| starting a session, or planning a phase or a stage | Read this file first. Propose the capabilities whose trigger has fired; the plan that introduces the database names the workspace table, the three functions and the first migration | `docs/product/plan.md` · `docs/product/brief.md` · the `app-lifecycle` skill · `docs/architecture.md` |
| starting a new product, or asking what comes next | One path from idea to production; each stage has what it produces and its done-when | the `app-lifecycle` skill |
| choosing between options, or reopening a decision or a § 1.3 choice | An earlier decision may already have weighed them | `docs/product/decisions.md` · the `app-lifecycle` skill (default choices) · `docs/product/strategy.md` only once the owner confirmed one |
| delegating a stage, or wanting a peer to argue a decision | Only when the builder is available; write it yourself when the brief would be nearly as long as the diff. A stage's follow-up rounds resume its session; a new stage starts fresh | the `delegation` skill · the `codex-agents` skill · `docs/work/` |
| building a feature or changing behaviour | Its tests and its doc lines land in the same change | `docs/TESTS.md` · the doc that describes the behaviour |
| fixing a bug | A regression test that fails before the fix; the doc that described the old behaviour, corrected | `docs/TESTS.md` (rules that came from bugs) |
| touching sign-in, workspaces, roles, a route or a permission | The three functions; a screen gates on the same permission its action checks; a cross-tenant test on every route that touches data | `docs/permissions.md` · the `saas-authorization` skill |
| changing a journey with side effects — writes, email, jobs, money | | `docs/flows.md` |
| writing a query or a migration | The schema is the source, not memory; migrations by CLI with the target spelled out; a rename or drop the deployed code still reads ships in two steps | `supabase/migrations/` (newest first) · the generated types · the `supabase-production` skill |
| touching an integration's configuration (identity, database, host, DNS, email, analytics) | Read the gotchas first; each failed silently once | `docs/integrations.md` · the `clerk-production` / `supabase-production` skill |
| touching environments, branches, backups or an incident, or rolling back | The target is stated, never inferred from a config file; a previous deploy goes back only once it is known to run against the current schema | the `environments` skill · `docs/environments.md` |
| adding or reading an environment variable | Placeholder, row and schema line; the schema runs at build; a generated value is generated now | `docs/variables.md` · `.env.example` |
| a product's screens, or a mock of one | apply `ui-design`; without a provided design system, start the kit before the first app screen (an artifact before it keeps its values in tokens), then extend its primitives so buttons, fields and dialogs stay one set; a screen claims only what its feed can see | the `ui-design` skill · `design/README.md` |
| writing framework code | <(stack) This framework version is newer than your training data> | <(stack) the framework's bundled docs, e.g. `node_modules/next/dist/docs/`> |
| creating or removing a git worktree | Never remove one whose `node_modules` links to another checkout: delete the link first | the `independent-review` skill (its worktree recipe) |
| writing or running a test or extra check, or claiming something is verified | Use the product's check commands; the harness's runs column says gate, outside the gate or by hand; read exit codes from the log; the coverage map is written by whoever ran the gate | `docs/TESTS.md` (gate and extra-check commands) · `docs/test-coverage.md` · the `test-harness` skill |
| reading a doc that disagrees with the code | Say so in the summary; the owner decides which side moves | the `document-app` skill in `check` mode at phase end; the `derive-tests` skill's check mode proposed at release (both write nothing) |
| deferring anything, or asked what remains | Every deferral has a reason and a revisit trigger | `docs/BACKLOG.md` |
| **pushing a branch that deploys** — "just push it" is this row | A clean review round covering everything the push adds; the push closes it. Migrations applied first to the database that deploy reads (production's only at a promotion, after the go). A push deploys one runtime: every other one (workers, an edge) keeps its last bundle until redeployed, so check each one's build against the tree after the push. Name back any precondition still open rather than pushing past it | the `independent-review` skill · the `release-gate` skill |
| saying a stage or a phase is done | Check stage tests and journeys; phase gate, visual checks, docs check and review series; the plan records completion evidence or what remains open. Track phase owner-tried status; pending previews do not hold the next phase | `docs/product/plan.md` · the `test-harness` skill · the `document-app` skill (check mode) · the `release-gate` skill (preview) · `docs/RELEASE.md` (preview command) |
| **releasing** — promoting to production | Use the product's release doc and existing script: the whole-range review, the audits proposed, the production ledger, then stop for the owner's **go**; steps the owner keeps are named | the `release-gate` skill · `docs/RELEASE.md` (release command and owner steps) |
| running a review loop or triaging a finding | Apply `independent-review`; use the product's round and brief commands; a finding is a claim, its severity included | the `independent-review` skill · `docs/RELEASE.md` (review commands) |
| writing or checking a core doc — architecture, permissions, flows, variables, the coverage map | The definition is the minimum; this file wins where they differ | the `shipping-artifacts` skill · `docs/README.md` |
| adding email, a scheduled job, automation or search | Document only what exists; unimplemented scope is a backlog row | the conditional doc once the capability exists |
| adding a fail-closed guard or hosted CI | Never in the same change as the product it guards | the `release-gate` skill |
| embedding an agent | <only when § 2.3 says so> | the `embedded-agents-messages-api` skill |
| adding an MCP server | Every call authenticated unless a decision chose otherwise and named the cost | the `mcp-server` skill |
| writing one of this repository's own skills, or adding a lesson to one | General guidance: a product appears only as an example, named by kind; what is true of one product goes in its own repository; date what a platform did | the skill's own `SKILL.md` |
| learning a lesson for the shared collection | Keep the product's incident in its docs; send only the general lesson to the collection | type `/agent-harness:retro` (Codex: `$agent-harness:retro`) |
| editing this file, or after a mistake this file should have prevented | Fix it in the moment with the receipt; route, don't summarize; a rule that depends on memory at the decisive moment becomes code | the `agent-instructions` skill |

## 1.9 This file is yours to manage

This file is the context you carry into every session. You own it: edit it without asking, except removing a rule's text, which you propose and the owner decides; moving a part to `docs/` with a pointer here is an edit. Two moments call for a pass over it:

- **At every release:** read it top to bottom and ask of each part — is it obsolete now that the code exists? does it belong in `docs/` with a pointer here? is it needed in *every* session, or only when touching one area (then § 1.8 is its home)? what did this phase teach that the next session must know?
- **When a mistake happens:** if the cause was something this file should have said — or said badly — fix it here, in the moment, with the receipt (date, what went wrong), so the rule carries its reason.

**The status lives in `docs/product/plan.md`; § 2.7 carries at most three lines of it.** At each release, move the previous release's narrative to `docs/history/release-history.md` and keep only the rules it taught, in Section 1.

The principle is **progressive disclosure**: this file is the entry point every session reads; § 1.8 opens the next layer only when the task needs it; `docs/` holds the depth. **A rule written down is not yet a rule an agent follows: it must be met at the moment it applies.** So every rule placed in `docs/` gets a § 1.8 row, keyed by what the agent is doing in words a user would use, unless it lives in the file the agent is already editing when it applies. Judge by what a fresh session needs to start well, within each file's word budget (`budgets.json` at the root, checked by a copy of `check_budgets.py` in the test gate; create both with this file, as the `agent-instructions` skill's budgets section says; one in, one out).

## 1.10 Embedded agents (only when the product has them)

<Delete when § 2.3 says no.> The agent proposes; deterministic code decides. Everything a model reads or writes is untrusted text. Cost has two ceilings — per run and per actor. Model ids are pinned in code. The depth: the `embedded-agents-messages-api` skill (or `embedded-agents-agent-sdk`).

---

# 2. This app — <product name>

This section holds only what every session needs about the product. The brief behind it is `docs/product/brief.md`; the phases and their status are `docs/product/plan.md`; the decisions and their options are `docs/product/decisions.md`.

## 2.1 What it is

<The product and its complete core journey in one short paragraph: who uses it, what they do, what they get.>

## 2.2 Users

<One line per user group: who they are and how they are identified. Name the payer, and the anonymous public if there is one.>

## 2.3 Product shape and reopened defaults

- **Workspace model:** <organization | individual>
- **Billing:** <the identity provider's billing | none>
- **Anonymous public:** <yes | no>
- **Embedded agents:** <yes | no>
- **Member home:** <the route sign-in lands on>

Reopened defaults: <each § 1.3 choice this product changes — the choice, the trigger that fired, what replaces it, the dated entry in `docs/product/decisions.md`. Or: none.>

## 2.4 Who can do what

<Actor × identity × can × cannot; the permission strings; when the product bills, the feature slugs the code gates on and what each unlocks.>

## 2.5 Not in scope

<The adjacent capabilities this product deliberately excludes.>

## 2.6 Constraints that shape the data

<Invariants, limits, ownership and lifecycle rules — each a sentence a migration can be checked against. Stated here and nowhere else.>

## 2.7 Status

<At most three lines: the current stage, what is in production, what is waiting on whom.> Full status: `docs/product/plan.md`; past releases: `docs/history/release-history.md`.
```
