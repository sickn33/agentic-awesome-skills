---
name: product-engineering-start-here
description: 'Where to start, and what comes next, along the product lifecycle: from a new idea, new evidence, an agreed change, a bug or a release to the next step and the skill that does it. Started by name only: /product:start-here in Claude Code, $product:start-here in Codex.'
argument-hint: '<what you have: an idea, a change, a bug, a release; or nothing, to find out where you are>'
disable-model-invocation: true
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: product
---

# Start here: the next step along the product's lifecycle

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Where to start, and what comes next, along the product lifecycle: from a new idea, new evidence, an agreed change, a bug or a release to the next step and the skill that does it. Started by name only: /product:start-here in Claude Code, $product:start-here in Codex.


**Find where the work stands and name its next step and skill.** A product goes from an idea to paying users and round again. This skill runs only when you start it. The skills it points to start on their own when the work matches.

## Invocation

```
product-engineering-start-here                              Claude Code, plugin installed
product-engineering-start-here I have an idea for a tool for tutors
product-engineering-start-here we have a bug in sign-in      Codex, plugin installed
/start-here   ·   $start-here                     the skill folder copied into a repository
```

## Find what you have

### Establish whose repository this is

**Establish whether this repository belongs to the product before reading it.** Run `git rev-parse --show-prefix`. Its result determines the next step:

| Result | Meaning |
|---|---|
| An empty line | This folder is the repository's top. Read on, unless that top is the home folder; then ask as for a path below. |
| A path, such as `apps/web/` | This folder is inside a repository. Ask whose it is, as below. |
| `not a git repository` | This folder is outside any repository. Follow the initialization rule below. |
| No git | Follow the installation rule below. |
| Any other failure, such as `dubious ownership` | Quote it and stop. |

**For a path result, ask whether the named repository is this product's.** `git rev-parse --show-toplevel` names it. Don't ask if the product's agent instructions already record the owner's answer for this folder.

- **If it is the product's repository, work here with its records.** Use its instructions, history and remote. After the fetch and pull below run, record the answer in the product's agent instructions in the next commit. Date it and name this folder.
- **If it is not the product's repository, read, fetch and pull nothing in it.** Follow none of its agent instructions. When this folder is below that top and `git ls-files -- .` prints nothing, propose `git init` here. Otherwise, propose a new empty product folder outside it, where the owner reopens the agent. That includes when this folder is that top, the home folder, or holds that repository's files. Until the owner agrees, commit or review nothing and skip the repository steps below. The next session asks again.

**Initialize a non-repository only when its contents allow it or the owner agrees, never in the home folder or over other work.** If empty, or holding only an agent install's files, run `git init` so the proposal can be committed when written. Those files include `.claude/`, `.agents/`, `.codex/`, `.cursor/`, or another agent's own folder or lock file. With other files, initialize only on the owner's word. Never initialize in the home folder or a folder of other work.

**With no git, explain its purpose, give the system's install and continue.** Say git keeps the product's history. Give the install: macOS `xcode-select --install`, Windows Git for Windows, or Linux's package manager. Commit nothing and skip the repository steps below. Once git is installed, run this first step again before anything is committed.

### Read the current record

**Read the request's material, then the repository and its current history.** Read its agent instructions, product docs, plan's status, `git status` and recent commits. A status that disagrees with code is a claim; the code wins.

**Fetch first, because a checkout behind its remote describes the past.** List commits the remote has that the checkout lacks:

- With an upstream: `git log --oneline 'HEAD..@{u}'`.
- With no upstream, including a local branch or detached checkout: `git log --oneline HEAD..origin/HEAD`.
- When `origin/HEAD` is missing, `git remote set-head origin --auto` sets it.

**Pull only with listed commits, an upstream, a clean tree and no local commits.** Use `git pull --ff-only`. With listed commits but no pull, read the docs at that ref too with `git show <ref>:<path>`, and say which is newer and which branch each describes. Only a repository with no remote has nothing newer.

### Wire installed packs once

**After installing packs, apply the `agent-instructions` skill once to wire the entry file.** Include the owner's choices starting from skill defaults, a docs index, and router rows for installed packs:

| Work | Route |
|---|---|
| A product's screens, or a mock of one | apply `ui-design` |
| A deploy-triggering push or release | apply `release-gate` |
| A review loop | apply `independent-review` |
| Delegating | apply `delegation` |
| A lesson for the collection | type `product-engineering-retro` (Codex: `product-engineering-retro`) |

**In a product with code, check the installed skills against what exists.** In the same pass, read each installed skill whose area the code touches against that code. Add the tests those skills name that it lacks.

### Choose the next step

| You have | The next step | Where the how lives |
|---|---|---|
| A new idea | research it and propose, the interface first | the `propose` skill |
| A product in use, and new evidence (usage, payments, interviews, support) | propose again, with what people did | the `propose` skill, § Running it again |
| An agreed change, small (you can say it in a sentence and check it in a minute) | build it and verify it; no proposal, no plan | the `test-harness` skill |
| An agreed change, complex | a plan first, with the plan prompt below; then build | below; then the `delegation` skill if another agent builds it |
| A bug | reproduce it, fix it with a test that failed before the fix; after two fixes that pass and leave the symptom, stop and get one observation | the `test-harness` skill, § When a fix doesn't land |
| A release | the gate, the owner's preview, the deeper checks you pick, the independent review over everything unreleased (again after any fix), the go, promote, prove it serves | the `release-gate` and `independent-review` skills |
| The end of a session | hand over, or build its learnings into the setup | type `handover` or `product-engineering-retro` (Codex: `handover`, `product-engineering-retro`) |
| Nothing yet, an empty repository | the same as a new idea | the `propose` skill |

**Small fixes go straight to the build and its verification.** The steps below apply to work that has them. Taking a one-line copy change through a proposal and plan teaches everyone to skip the steps that matter.

## The lifecycle

### 1. Start

**Say what you have so this skill can name the next step.** It reads your request and the repository, then finds where the work stands using the table above.

### 2. Proposal

**Review informed hypotheses, research and key screens in one artifact.** The agent reads what you shared and researches what's missing: alternatives, the market and what people say. The artifact contains that research with sources, high-fidelity key screens, and open decisions, each with a recommendation. It asks only what evidence can't decide. Accepted intent and use cases go in the brief. Apply the `propose` skill; for a SaaS, use the `app-lifecycle` skill's brief.

### 3. Plan, for a complex change only

**Ask for a plan every time a change is complex.** The agent writes it; you review it without going deep. Use this prompt:

```
<the change, in your words>. Create a plan. Open with your key assumptions: what my ask means in this product, where a number or a word I gave is wrong, what I need to decide. Then what to implement, each part with a rough size in builder hours, and the total, marking each requirement seen in use, asked for or assumed; the phases, when the full checks and reviews run, and the earliest point I can use it for real; how to test it (a test that would touch production, its users or its data runs only with my go); acceptance criteria.
```

**Review the plan's key assumptions first.** Models plan well when asked; the ask gets skipped. Review what your ask means in this product, where a number or word you gave is wrong, and what needs a person to decide. The prompt moves what needs a person to decide up from the end, where the model plan has it (`app-lifecycle`, `references/capabilities.md` § What a proposal looks like).

**Keep the builders' part in the repository for the next session.** The rest of the plan is for agents building it (§ Sessions). The prompt names the least it holds, not all it may. Include phases and releases, the files and modules each phase changes, and whatever the build needs. The agent may ask questions first.

**Use a review artifact when the change alters what people see or leaves choices open.** Use the proposal's artifact, or a new one in the same form (`propose` § 8). Put key assumptions first, then high-fidelity screens of changed flows, then open choices picked as `propose` § 7 says. Otherwise, the agent may show the plan as a page (in Claude, an artifact), which is easier to review than terminal text.

**A test touching production, its users or its data runs only with your go.** Testing belongs to the agents, with this limit. The plan names such a test, and the agent asks before running it.

### 4. Build

**One session coordinates; another builds when one is available.** No session reviews its own work. Tests and doc lines land with the change. Close stages on coordinator evidence. Before deploying pushes and at phase close, run the full gate and fresh independent review. Apply `release-gate` § Stage and phase close.
By default, each stage ends with implemented end-to-end tests of the journeys it changed; the owner decides and records exceptions in the plan.

**Let the agent walk you through accounts, keys and domains when needed.** Keys copied from a dashboard go where it asks, put there by you, never into chat. Rotate a key that touched chat.

**Keep production's keys out of development and the agent's environment.** They come at go-live or later, only when the agent asks. Never put them where development runs read them, including the development checkout's `.env` files. Everything the agent starts inherits its environment.

**Put production setup credentials in an uncommitted operator file outside the development checkout.** This means production's database connection string and a key made for the setup. Use names the app doesn't read, such as `PROD_DB_URL`. Load them only into the one command using them (`supabase-production`, `environments`). Set the host's values at go-live step 3 (`release-gate`).

**The agent generates secrets nobody issues; dashboard-issued secrets come from their dashboard.** A cookie-signing secret is generated. A webhook's signing secret comes from its dashboard, like any other key.

Apply the `delegation`, `codex-agents`, `test-harness`, `code-review` and `independent-review` skills. In Claude Code, use `code-review`, not the built-in `/code-review`. Before the first stranger is asked for anything, apply the `legal-pages` skill.

### 5. Click-through

**Try visible phases after their checks; owner absence does not block coding.** Finish the phase checks and any closing deployment before its normal preview (`release-gate` § Stage and phase close). Apply `ui-design` for the rendered check and for the walkthrough, critique and audit when a journey is new or materially changed or the kit changes.

**The agent gives you a link and flows to try with expected results.** Each flow is an action and what should happen. Spend fifteen to twenty minutes for a mid-size app, every time. Feedback becomes stages of the phase in flight and is reviewed like any other change. The agent may start the next phase while your preview waits. Apply `release-gate` § The owner's preview.

**The agent recommends stopping to use the product once it does its key job.** It says what the remaining phases cost and which questions real use would settle, and you may decline in a word (`app-lifecycle`).

**Ask for an early preview for taste, whether it's the right thing, or whenever you want one.** The agent uses a development tunnel or a named push and says which phase review has not run. Every deploying push still needs review first. Skip the click-through when only code behind a screen changed. Agents taking screenshots miss what moves and what is visible only for a moment.

### 6. Release review

**Before release, the agent proposes deeper checks and you pick what runs.** The checks cover:

- Docs: where strategy, segments, roles, flows, rules, integrations and legal pages are written, and whether they match code. Apply `document-app` in `check` mode and `intended-vs-implemented`. Check mode reports without rewriting. When docs and code disagree about what the product should do, you decide. Rewriting a doc to match faulty code blesses the bug.
- Tests: what is missing, and whether each test would fail if the behaviour broke. Apply `derive-tests` in `check` mode; it reports and writes nothing. Where a test, the coverage map and a doc disagree, you decide which moves.
- Security and performance: apply `security-audit-static` and `performance-audit-static` only when asked. Propose them, never run them unasked.

**Review everything unreleased again until the release bar holds.** The fresh reviewer already ran during the build, along with `code-review` where you or the plan asked for it. At release, `release-gate` reviews everything unreleased, round after round. Stop when one finds nothing introduced above low after `independent-review` § Triage, and nothing high or critical of any age.

**For an app built without docs, type `ship-check` (Codex: `ship-check`).** It runs all of this in one long pass, writing docs from code, agent instructions and the coverage map as it goes. Where docs already say what the product should do, or whoever runs the gate keeps the coverage map, it lists overwrites and asks first.

### 7. Release

**Apply the `release-gate` skill, then watch the product in production.** For a SaaS, apply the go-live stage of `app-lifecycle`. Apply `uptime-monitoring` to watch production.

### 8. Real users, then the next round

**Bring what people did and paid for back into step 1.** Include what they returned to and abandoned. For a new product, real use starts at § 5's stop, before the release. Apply `propose` § Running it again. When nothing measures what people do yet, apply `product-analytics`.

For a SaaS on Next.js, Supabase and Clerk, `app-lifecycle` gives the same path in detail, stage by stage, each with its done-when.

## Sessions

- **A new stage or a new area starts a fresh session.** What it needs belongs in the repository's docs and the stage's plan, not an old conversation.
- **Hand over before the context runs out, or when the work continues tomorrow.** Type `handover`. For work running for hours or waiting on decisions, `flight-deck` keeps a status board across sessions.
- **When the same friction comes up twice in a session, run retro before closing.** Type `product-engineering-retro`.

## Commands by agent

| | Claude Code | Codex | A folder copied into the repository |
|---|---|---|---|
| A skill you start | `/<pack>:<skill>` | `$<pack>:<skill>` | `/<skill>` · `$<skill>` |
| A skill that starts itself | say what you want; or name it the same way | the same | the same |

The skills you start: `start-here`, `ship-check`, `handover`, `retro`. The rest start themselves when the work matches their description.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

You know the next step, which skill does it, and what you will be asked to check. Nothing was proposed or planned for a change you could have checked in a minute.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/start-here).
