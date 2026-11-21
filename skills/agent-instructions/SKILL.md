---
name: agent-instructions
description: 'Writing or restructuring AGENTS.md or CLAUDE.md, adding a rule (''remember this''), or after an agent ignored a rule it had: make each rule get met when it applies.'
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

# Agent instructions — rules met at the moment they apply

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Writing or restructuring AGENTS.md or CLAUDE.md, adding a rule ('remember this'), or after an agent ignored a rule it had: make each rule get met when it applies.


**Meet each rule at the moment it applies.** A rule written down is not yet a rule an agent follows. This skill writes and maintains an app repository's instruction file as the product grows.

**Use the entry file to route every session's context.** The entry file is `AGENTS.md`, `CLAUDE.md`, or both. It is where every session enters and what routes the rest. The method is stack-independent; examples come from repositories named by kind.

1. **The entry file routes; the depth lives where the moment sends you.** A rule the agent is not looking at when it acts does not exist for that act.
2. **Make rules that depend on memory at decisive moments into code paths.** Use a test, script or required argument, because prose loses that contest.
3. **Maintain the file at every release and fix every mistake with its receipt.** Maintain it rather than accumulating rules.

## The shape: a chain, not a manual

**Root routes to entry points; entry points route to operative files; operative files link to evidence.** Each layer points down; none restates the layer below.

```
entry file (loaded every session)   — routes; holds only what every session needs
 └─ router rows: "when you are…"    — the rule that is easy to miss, and what to open
     └─ operative files (docs/, skills) — the procedure, the depth, the gotchas
         └─ evidence                — receipts, tables, postmortems, case studies
```

- **Route, don't summarize.** A summary of a doc in the entry file is a second copy that drifts. Carry the one sentence that must be met at the moment (the rule that is easy to miss) and its pointer.
- **No workflow content duplicates upward.** When a procedure appears in two layers, the upper copy is wrong within a month.
- **Make every file reachable from the entry file the day it is created.** `scripts/check_reachable.py` holds this (§ Files).

## The entry file: two sections

**Separate reusable building mechanics from the choices for this app.** The preamble explains the two sections in a few lines and names where the longer material lives. It tells the agent to find its moment in the router before starting.

- **Put the mechanics of building any app in Section 1.** Include ownership and authorization, threat model, stack and its choices, testing and delivery, working rules, router and file maintenance. Reuse these mechanics in the next product; replace its owner's choices and installed-pack inventory.
- **Put this app's identity and constraints in Section 2.** Include what it is, its users, its shape, who can do what, scope, data constraints and three lines of status. Replace this section per product; the `app-lifecycle` skill has its skeleton.
- **Section 1 wins on mechanics; Section 2 wins on product.** What neither says follows skill defaults. Where those are silent too, decide and say so in the summary.
- **When a library's default conflicts with the file, the file wins.** Say this in the file wherever a vendored skill or quickstart would teach otherwise.

**Record the owner's departures from skill defaults once, dated and in their words.** Put product choices in a short entry-file section beside testing and working rules. Put choices for every product in user-level instructions. Record model, builder, reviewer and fallback, review bar, what requires go, design taste and voice.

**Precedence: current session owner instruction > product entry file > user-level instructions > skill defaults.** Design detail can stay in the kit README, with an entry-file pointer; apply the `ui-design` skill.

**Give every reviewer a fallback, never “none”.** Apply the `independent-review` skill for reviewer choices. Rewrite “a model never reviews its own family's work” as “prefer another family”. Use a fresh session of the builder's family when no other can run.

**Graduate standing choices to the file immediately.** Memory in one agent does not reach another vendor's builder or reviewer (`references/maintenance.md`). Copy `references/agents-md-skeleton.md` for a starter file.

**After installing packs, record choices, a docs index and their router rows once.** Route a product's screens, or a mock of one, to applying `ui-design`. For existing code, read every installed skill that touches it against the code. Add the missing tests the skills name.

## Make sure it loads

**Keep one master instruction file and verify every agent reads it.** A file that did not load fails silently.

- **Keep no `CLAUDE.md`, or make its first line `@AGENTS.md`.** Claude Code reads `AGENTS.md` when no `CLAUDE.md` exists; a `CLAUDE.md` or `CLAUDE.local.md` without `@AGENTS.md` silently stops `AGENTS.md` loading (observed on Claude Code 2.1.292, `2026-10-10`). Codex, Cursor and Grok read `AGENTS.md`.
- **Frameworks write into these files.** Next.js 16's `next dev` appends to `AGENTS.md` and writes a `CLAUDE.md` (observed `2026-08-27`). Set `agentRules: false` in `next.config.ts` to stop it. A generated `CLAUDE.md` holding only `@AGENTS.md` is harmless; anything else is a second, unowned instruction file.
- **Keep must-follow rules within Codex’s entry-file context budget.** Put them in the first 32 KiB of `AGENTS.md`, or raise `project_doc_max_bytes` in Codex config. A word budget alone does not hold a byte limit. Name needed sections beyond that budget for explicit opening in builder briefs (`codex-agents`). Codex CLI 0.169.0 on Windows logged 32,768 bytes and omitted a role table from a 104,297-byte file (observed `2026-11-16`).
- **After changing either file, ask a fresh session to quote its unique rule.** Choose a rule only the entry file holds.

## The router — what opens when

**Key router rows by the task the agent is doing.** Put a three-column table in Section 1: “When you are…” · “The rule that applies” · “Open”. The agent matches its moment, not a table of contents.

- **Use the words a user would use, never a topic label.** For example: “pushing a branch that deploys (*just push it* is this row)”, “fixing a bug”, “touching sign-in, roles or a permission”.
- **Put the rule that is easy to miss in the rule column.** Keep it to one or two lines; the file holds the depth.
- **The open column names the file — and the section — to read before acting.** Several rows can hold at once; open every one that matches.
- **Every new task opens its rows again.** Find the moment and reread every file its rows open, even one read earlier in the session. After compaction or a long session, that earlier read is gone or stale.
- **Name a code row's moment as a diff shows it.** “touching sign-in, roles or a permission” can be read off a diff; “being careful with data” cannot. A task row (starting a session, saying a stage is done, releasing) stays keyed by the task. The coordinator's stage-end read of the diff runs every row it matches (`independent-review` § When).
- **Give every rule placed in a doc a row, with one exception.** It needs none if it lives in the file the agent is already editing when it applies.
- **File a rule at the fire point, not at its topic home.** Put it in the task's chain where it must change a decision. The topically natural file keeps the durable record and a pointer. Reachable in the wrong task is unreachable.
- **Index material with no moment in the docs' own index.** Worked examples and release history belong there, not in the router.

Read `references/router.md` for the pattern in depth and a starter router for an app repository.

## Where each thing goes

| What | Where it lives |
|---|---|
| needed in every session, with no trigger that would send the agent looking | the entry file, Section 1 or 2 |
| needed only when touching one area | that area's file: the doc its router row already opens, or a new one where there is none, routed the day it is made; re-read at the start of every task that touches it |
| reusable method | the installed skill; product docs, checks and automation stay in the product's repository, reachable from the entry file |
| product procedures, gotchas, depth | the product doc the row opens; a procedure run by hand a second time becomes a product script, with its command in the matching router row |
| receipts, data tables, postmortems behind a rule | an evidence file, opened only when revisiting the rule |
| the current status | the product's plan (its stages, each with what it produces and the test of done, and where each stands); at most three lines in the entry file |
| what a release shipped, what its rounds and gates found | the release history (one dated section per release, never rewritten), moved there at the next release |
| a decision that had options | the decision log (dated: the options, what was picked, by whom and why) |
| an owner's departure from skill defaults | once, dated and in their words: the entry file for product choices, user-level instructions for global choices; design detail in the kit README with an entry-file pointer |
| installed packs | the entry file: each agent and the packs installed in it; the packs update themselves, so nothing pins a version; never assume another agent loads the coordinator's install |
| deferred work | the backlog, each item with the reason it waits and the trigger that reopens it |
| a behaviour correction from one conversation | memory, until it graduates; standing owner choices go straight to instructions (`references/maintenance.md`) |
| what is true of one product only | that product's repository, never a shared skill |
| a rule whose compliance depends on memory at the decisive moment | a test, a script or a required argument |

**Script repeated product work and route each command from the entry file.** Especially script releases, review rounds and briefs, the owner's preview and extra checks. A release script runs only after the owner's clear go, for that one authorized release. The release doc names the steps the owner keeps; apply the `release-gate` skill.

## Always-on rules: an admission test and a cap

**Admit only rules that must fire across every task after classification.** Most rules wait for their router row. A short always-on list in the entry file holds the exceptions, such as “before spawning any subagent, set its model explicitly”. Each entry passes every admission test:

- it fires after task classification, so no router row would catch it;
- missing it does material harm;
- there is evidence it was missed repeatedly;
- it fits in two lines;
- nothing mechanical can enforce it — if something can, it becomes code instead.

**The list has a cap (ten bullets worked); a new entry replaces one.** Its entries route, they don't summarize. Without a cap the always-on list becomes the manual again.

## Budgets: every file short enough to read in full

**Each instruction and area file has a word budget, held by a check that runs.** An over-budget file is one no session reads in full, and a rule not read is not met.

- **Keep budgets in one root `budgets.json` and run their checker in the gate.** Map each path or glob to a word count. Copy `scripts/check_budgets.py` into the repository; it fails on an over-budget file or a key matching no file. Start at the current count, rounded up, when a session can read the file in full. Otherwise propose the cut and resulting budget; the owner decides.
- **One in, one out.** Every edit replaces or tightens before adding. Only the owner removes a rule's text. Tighten wording without dropping a condition, exception or receipt. Or move the rule to its fire point, leaving a pointer, or add its test or hook and propose removal. A move is not a removal. At the budget, the owner picks the rule a new one replaces, or raises the budget.
- **Give every added rule a receipt.** Record the date and what happened, or the owner's words and date. Add `(review YYYY-MM)` except where a small repository opts out. The checker lists dated rules past their review month. At release, put each of those to the owner to keep or remove. Only the owner removes rule text. Never retire a rule guarding secrets, production or an irreversible or outward-facing step for want of a new incident. Promotion, migration, publishing and secret rules work by preventing incidents.
- **Budget every new area file the day it is made.** Except data such as receipts, research and tables that no session is told to read in full.

## Prose vs. code

**Ask whether compliance depends on memory at the decisive moment before encoding a rule.** If yes, prose will lose. Use a required argument, script, validation or test that runs. Writing it down feels like fixing it, which makes the reflex invisible from inside. Keep prose for taste and judgement, short and routed to. Read `references/prose-vs-code.md` for the full evidence and app-repository forms of a code path.

## The working rules every app's file carries

Each has a receipt (`references/working-rules.md`):

- **Read the instruction file before the first plan.**
- **Apply skill defaults without asking.** Ask only if a default's builder or other non-reviewer model or CLI is missing or out of usage, with no runnable product fallback. Reviewers always fall back as the `independent-review` skill requires. Get the owner's clear go each time before anything irreversible or outward-facing, such as production, publishing, spend or deleting anything public. Questions about what the product should do are still the owner's.
- **No play-by-play.** Plan, build, summarize once.
- **Commit messages go through a heredoc (`git commit -F -`), never `-m "…"`.** A backtick inside `-m` is command substitution, and the text vanishes silently.
- **A fix that carries an exclusion says, in its comment, why the excluded case does not need it.**
- **A comment stating an invariant about a value protects only its file.** List every route that can receive the value and check each.
- **When a flag's meaning widens, rename it to what it does.** Don't name it for one of its reasons.
- **When the file is silent, apply skill defaults, then decide and report.** Decide only where the skills are silent too; say so in the summary.
- **Report a doc's disagreement with code you did not change.** The owner picks which side moves.
- **Include tests and doc lines in the change, never a later step.**

## The two passes

**Manage the file without asking, except for removing a rule's text.** Propose that removal; the owner decides (§ Budgets). Two moments call for a pass:

- **Read the file top to bottom at every release.** Ask of each part: is it obsolete now code exists? Does it belong in a doc with a pointer here? Is it needed every session, or only in one area whose router row should hold it? What did this phase teach the next session? Move status and release narrative out (below), then run the reachability check.
- **Fix mistakes in the file immediately when its missing or poor wording caused them.** Include the receipt: date and what went wrong, so the rule carries its reason. Then ask whether the fix should be code.

**Keep status in the plan and at most three entry-file lines.** Name the current stage, what is in production and what waits on whom, never the story. At each release, move the previous release's narrative to release history. Only the rules it taught stay in Section 1.

**Within its budget, no size target.** Judge by what a fresh session needs to start well, not by length. Some things earn permanent entry-file space; others that feel obvious today will be missing context in a month. A smart reader with the right context is the goal.

## Writing a rule

**Cite the violation before adding a rule.** A rule earns its place with evidence of a real failure. Patterns from an outside style guide or linter are ideas, not rules.

- **Keep each receipt's date and what happened, naming the product by kind.** The receipt is why a later reader trusts the rule. The reason is the sentence they can check and find false.
- **Prefer replacing or generalizing a rule to adding one.** If the same check keeps firing, fix the principle upstream instead of adding another check.
- **Choose deliberately between a codifiable rule and a judgement principle.** Codify only when “is X present? yes/no” gives a useful answer; codifying judgement flattens it into checklist behaviour.
- **Date what a platform did or required and correct its line when it changes.** Use “verified on” or “observed”; never leave the old line beside the new.

## When the repository writes its own skills

**Keep a repository's own skills general, with products as examples named by kind.** They sit beside vendored skills and may be published; “a live Q&A product” is an example. Product-only facts belong in that product's repository, never in the skill. This includes listings and their states, versions, verified clients, receipts, commits, release codes, ids and account names.

**Date what a platform did or required, since it changes.**

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A fresh session given only the instruction file meets each rule at the moment it applies, because the router sent it there. Every rule the file carries has its receipt.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/agents-md-skeleton.md` | a starter `AGENTS.md`: preamble, Section 1 with a router, Section 2 | creating the file for a new repository |
| `references/router.md` | the router pattern, how to key and word rows, a starter router for an app repository | writing or changing the router; a rule that was missed at its moment |
| `references/maintenance.md` | the release pass and the mistake pass, progressive-disclosure rules, filing without accretion, evidence vs. rules, memory graduation, orphans | a release; after a mistake; the file has grown; adding a doc |
| `references/prose-vs-code.md` | the test, the evidence, the receipts, and the forms a code path takes in an app repository | about to write a rule to prevent a recurrence |
| `references/working-rules.md` | the working rules with their reasons and receipts | writing Section 1; a rule here was broken |
| `scripts/check_reachable.py` | lists docs no chain from the entry files reaches (standard library only; reads, writes nothing) | after adding a doc; at every release |
| `scripts/check_budgets.py` | counts each budgeted file's words against `budgets.json`, fails over budget or when a key matches no file, and lists the rules past their review date (standard library only; reads, writes nothing) | in the test gate, from a copy in the repository; at every release |

```bash
python <skill dir>/scripts/check_reachable.py <repo>                       # docs/ and knowledge/ by default
python <skill dir>/scripts/check_reachable.py <repo> --scope .claude/skills --exclude "docs/screenshots/**"
python <skill dir>/scripts/check_reachable.py <repo> --why docs/TESTS.md   # print the chain that reaches it
python <skill dir>/scripts/check_budgets.py --root <repo>                  # words per file, past review dates
```

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/agent-instructions).
