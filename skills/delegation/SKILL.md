---
name: delegation
description: 'Before spawning a subagent or dispatching a build, review or research, and before trusting its report: the brief, the delegate, parallel runs, the handoff.'
risk: critical
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

# Delegation — a delegate is a partner

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Before spawning a subagent or dispatching a build, review or research, and before trusting its report: the brief, the delegate, parallel runs, the handoff.


**A delegate knows only what you hand it, so brief the goal.** Say what you are trying to achieve and for whom. Name the constraints that bind, the traps a smart newcomer would walk into, and how the result will be proved.

**A brief with the goal in it comes back with judgement.** "Change X to Y" gets Y, even when Y is wrong. A delegate that knows the goal can answer "this step is redundant, here is why", and that answer often changes what ships. That is the return on a brief's length: not compliance, judgement.

**Manage a delegate the way a good owner manages you.** Give it the goal and context, then trust its judgement on the means instead of prescribing steps. Push back where you disagree; its view doesn't bind you.

**Apply the delegate's own skill for its mechanics.** Apply `codex-agents`, `grok-agents` or `claude-agents` for a headless CLI peer, builder or reviewer. Apply `independent-review` for unsteered review in fresh Codex by default, then headless Claude Code, then Grok. This skill covers their shared discipline. For a requested Gemini partner, apply `gemini-agents`: the user agrees first, per run or by an informed standing preference; Gemini is never a default. Never drive `agy` from memory.

## What never delegates

- **Decide what the product should do yourself.** Keep the thesis, scope, taste and interpretation of the owner's wishes with you.
- **Accept or reject review findings yourself.** Treat the finding and its severity as claims (`independent-review` § Triage).
- **Keep operational changes and production credentials with the session agent.** Keep deploys, promotions, pushes, applied migrations, persistent servers, workers, provider settings, secrets and drills with you, including development. Ask the delegate to make each step one command and name those commands; you run them. Development suite runs, including their test server and fixtures, are builder work within the brief's boundary.
- **Perform final verification yourself.** Run the tests, typecheck, gate and smoke, inspecting their results to check the delegate's passing claim.
- **Judge whether a stage is done yourself.** A delegate's handoff supplies evidence for that judgement.

## When it is worth handing off: size, not time

**If the brief would be nearly as long as the diff, write the diff.** A delegate must rediscover the file, conventions and surrounding code before changing anything.

| Situation | Who |
|---|---|
| You know the file and the line, and the change is mechanical | **you, directly** — no brief, no round trip |
| It needs exploration, or you are unsure of the mechanism | a delegate |
| It needs real test coverage | a delegate, or one focused test you write yourself |
| A naive fix would walk into a trap | a delegate, **with the trap in the brief** — this is where a long brief earns out |

- **A build round that has made no writes on a small change is stopped.** Kill its leftover process and write the change in-session, keeping your responsibilities and the requirement for independent review.
- **Use the parallelism or don't pay for it.** Work while the background delegate runs. Waiting pays delegation's latency without gaining its throughput.
- **Keep work whose reasoning you need yourself.** Also keep synthesis that needs everything held in one head.

## The brief

Three things, and the first is the one most often skipped:

1. **Explain what you are trying to achieve and why.** Name the decision this handoff feeds. In the owner's terms, "we are choosing between A and B" lets a delegate suggest a third option or challenge the question. A delegate told "research A and B" cannot.
2. **State the constraints that bind, including the do-nots.** Explain traps that would make a plausible local fix wrong in the larger system. For example: "Keep this out of the argument builder; the same string feeds another spawn path."
3. **Define proof for this handoff, including checks you must run.** The builder runs its tests and fixes failures before handoff; name its development test access and serialize suites on shared data. The session agent applies new migrations to development before the builder runs dependent tests. Keep the handoff's done-when narrower than the stage's; final verification and stage judgement stay with you. If a tool or platform blocks a check, name the concrete limit and who runs it: "Write it; I run it." Report those checks as "written, not run", rather than inventing counts or marking the stage done.

**Ask it to exercise every existing page and function the stage touches, not only its own.** Ask for this explicitly in the brief, including code the delegate did not write.

- **Compress the evidence, not the context.** Three log lines beat twenty lines explaining how you reached your conclusion. Keep the goal, binding constraints and traps at full length. A terse brief can produce a locally correct change that fails in the larger system.
- **The brief is the delegate's entire reality.** Ask it to confirm or refute every consequential claim against primary sources. Treat absence claims such as "none of them shipped X" as extraordinary. Engagement numbers, link lists and filenames do not establish product reality. When a fact changes mid-build, append a dated "Added while you build" section to the brief file. Keep that file complete rather than relying on a side message.
- **A feature that guesses from real-world input starts from evidence.** Run unchanged code on a real corpus first, citing its numbers for each binding decision. After the build, pin a live golden set that runs on demand, outside the gate. Treat a research-based decision as a hypothesis the live run may reverse, and record any reversal with its measurement.
- **Prescribe the means only when they are hard requirements.** Leave paths, filenames, libraries, structure and presentation choices to the delegate's judgement. For example, "the existing system uses X" gives context. A choice you disagree with is something to discuss.
- **Long briefs go in a file.** Pass them by path or stdin, rather than as a long inline argument. Long inline arguments trip permission classifiers and shell quoting.
- **Name ranges, not commits, in a brief you will reuse.** A pinned SHA can send the next round back to an already reviewed commit. Use `git log --oneline <last-reviewed>..HEAD` to fail loudly when the range is stale.
- **Use the brief template and request its handoff.** Start from `references/brief-template.md`, asking for what it built, choices where the brief was silent, spec corrections, blockers and validation actually run. It also names commands for you and what must be redeployed after the push.

For a contract shared by sessions in separate repositories, apply the `release-gate` skill's backend-first rule before handing off a build.

## Peer discussion

**Bring a peer in while it can still change the framing.** Use it to test an angle, hook, load-bearing claim or an unvoiced critique. A different model family can catch different misses. Keep routine drafting and mechanical work in the session.

**State the goal once and give the peer enough context to challenge it.** Explain the reasoning behind non-obvious decisions. Give the peer room to choose the format, fonts, dimensions, libraries and steps unless any are binding.

| Give it | Example |
|---|---|
| Target and audience | "A choice about whether retries belong in the client or the queue" |
| Established facts | Logs, measurements, source quotes, the owner's words, prior attempts and audience context |
| Actual draft | The artifact and alternatives already considered |
| Reasoning and uncertainty | What you rejected and why, what still binds the decision and how you'll prove it |

**Iterate in the same conversation with specific reactions.** Agree where it is right, push back on surprising choices and name missed constraints. Use ordinary replies without repackaging the goal or numbering the reaction. Three to eight turns is normal. For example, "agree on the queue, but a poison message would block the shard. How would that work?"

**Keep iterating while a critique, disputed choice or option remains untested.** If the draft misses the owner's stated goal, or you want to present two reasonable versions, argue through the trade-off first. You have converged when you would defend the result against your own critique, neither peer finds a new angle and the remaining differences concern taste.

**Converge before surfacing.** Bring the owner one result. If a real deadlock remains after iteration, state the disagreement plainly. Ask when intent would change the work or when only the owner knows a fact or constraint that would reshape it. The owner decides intent and taste.

## Choosing the delegate

| Delegate | Strong at | Watch for |
|---|---|---|
| **A Claude subagent** (the Agent tool) | Work that needs this repository's context: it loads the project instructions automatically | Fresh context: none of your conversation or tool results. It loads project instructions and your settings and inherits your framing, so it never reviews your work. A review starts from the repository and brief alone (`independent-review`). A subagent may have no Agent tool of its own (observed `2026-06-10`). |
| **The Codex CLI** (`codex-agents`) | Build a stage to a brief, debate decisions across turns, or review by default (`independent-review`) | A new session is read-only unless told otherwise. A build that changed nothing can sound successful; check the disk. |
| **The Grok CLI** (`grok-agents`) | A peer, builder or reviewer from a different model family | A round that could not read exits 0 after a sentence; length is the tell. |
| **Headless Claude Code** (`claude-agents`) | A session with none of your conversation: a builder or peer for a non-Claude agent, or a reviewer | Plain `-p` loads project and user instructions and auto-memory; only a restricted review starts from the repository alone. Resume keeps the model but drops effort, permission mode and tools unless re-sent (observed `2026-10-24`). |
| **The Antigravity CLI** (`gemini-agents`) | A requested second opinion from another model family, never a default; apply `gemini-agents` and get agreement first | Unsupported by Google on consumer plans (FAQ read `2026-11-13`); headless commands and writes ran unasked, and a refused permission ended the turn with exit 0 (observed `2026-11-14`, CLI 1.5.8, macOS). |

**The session that wrote the code never clears it.** Use a fresh reviewer who did not build the code. Prefer another model family, or use a fresh session of the builder's family when no other family can run. Never resume or fork the building thread, or use its subagent as reviewer. Apply `independent-review` for the loop and its stopping rule.

## Model and effort (Claude subagents)

- **Set the model explicitly on every spawn.** Omitting it inherits the parent's model, and "inherit" is never a routing decision: it is the absence of one.
- **Route by the job, not by how important it feels.** Use the smallest tier for bulk mechanics without judgement, such as renames, CSV parsing and log scans. Use the mid tier for scoped research, code exploration and building to a written spec. Reserve top tiers for multi-step reasoning and judgement bottlenecks: architecture, adversarial review and taste. Model names change every few months; the routing principle stays the same.
- **Use the top tier adversarially.** For example, ask "refute this audit" to test your own conclusions against the reviewer's reasoning.
- **Consult up.** A cheaper parent running a plan spawns one top-tier child for the judgement-heavy step. Pack its brief with the full context, the why and the specific decision, then treat its answer as the ruling on that step.
- **Pull down, decide up.** For data work, the child pulls and reduces to a table; the parent decides what it means.
- **Check the effort each spawn actually used.** Each subagent transcript records it: `grep -o '"effort":"[a-z]*"' <transcript> | sort | uniq -c`. Agent-tool spawns inherited parent effort at every tier (measured `2026-08-22`). Claude Code 2.1.310 adds an Agent-tool `effort` field (read `2026-10-24`). Workflow agent options and agent-definition frontmatter can also set it.
- **A child that finds the task needs more reasoning than its tier gives returns to the parent.** The parent reruns that step a tier up, rather than letting the child burn tokens.

## Several agents at once

- **Parallelise on evidence, not impatience.** Measure file overlap before deciding which changes can run together. Use `git show --stat --name-only --format= <ref>` per planned change.
- **Never two writers in one tree.** Give concurrent writers separate worktrees. Two writers in one tree can silently overwrite each other's work. Without separate worktrees, run them one at a time.
- **Worktrees carry their own dependencies.** Never remove a worktree whose `node_modules` links to another checkout; removal deletes through the link. Apply `independent-review` for the recipe.
- **Parallel stages merge through an integration branch.** Give each stage its own branch and worktree. The coordinator reads each diff and runs touched and new tests after merging. The phase series reviews the integrated result before its deploying push; no clean round per stage is required. Two passing branches can fail together when one changes a fixture's required fields. Resolve shared-ledger conflicts by keeping both sides' entries: backlog, decision log, test doc, architecture doc and plan. Concurrent briefs reserve shared sequence numbers, including each migration number and timestamp floor. They state which migrations are applied and which are only written.
- **Every merge checks the new migrations' timestamps against the ledger.** Run `migration list` on the database that will receive them, since a reserved floor cannot prevent collisions with migrations applied meanwhile.
- **Parallel sessions share more than a tree.** Give concurrent sessions separate accounts or run them sequentially. They share test accounts, the development database and workers against it, so scope background workers to named accounts.
- **The binding constraint is usually review, not build.** Keep review rounds sequential within a branch. Each round needs a stable account of changes since the last. Findings arrive only when a round runs, and fix commits produce the worst defects. Parallel building cannot shorten that chain.

## While it runs

- **Don't edit a tree a delegate is building in.** Wait or use another worktree.
- **Never `git checkout -- <file>` (or `git restore`) on a tree carrying uncommitted work.** Either destroys everything uncommitted in the file, a delegate's whole build included. Undo a probe by re-editing the exact change back, or use `git stash push -- <file>` around it. Commit a build before deliberately breaking it to verify a test.
- **Long runs go detached, with a completion marker.** Watch the marker for completion. Shell-tool timeouts kill their process trees. Keep state in files that survive your context window; apply `flight-deck`.
- **When a build runs late, measure where the time went before changing the model.** Split elapsed time into model time, gate runs, review rounds and waiting on a person. Read logs and timestamps rather than trusting an impression.

## When it comes back

- **A delegated diff is unreviewed code.** Read it before believing it. Its independent review comes before anything ships or deploys; in staged work it is the phase's series (`independent-review` § When).
- **Check the disk before believing a round happened.** Inspect `git status` and file times, since a run without write access can return a convincing report with no changes.
- **Re-run its tests yourself, and rewrite any evidence it wrote from your own run.** A piece inside a stage reruns the tests it touches. Apply `release-gate` § Stage and phase close for full gates. A builder's passing report remains a claim, even when it can reach development. Read every line it adds to a coverage map or status file; replace stage-completion evidence from your own run rather than inventing counts.
- **Compare the test inventory before and after each delegated turn.** Check specs, cases and captured states. Send back cuts the brief did not ask for.
- **Before passing a delegate's "commands for the owner" up, do every one you can.** Use an API, CLI or key you hold and reread the result. Escalate only what needs a person: a dashboard-only click, money or taste.
- **A builder's objection that is a product decision goes to the owner.** Give it its own handoff section, keeping it separate from corrections you can accept yourself.
- **When you take a handoff over, put a dated status line at its top.** Say whether it is merged, which rounds reviewed it, where it is deployed, and what still waits. Keep your changes in their own section, leaving the delegate's text as written. Check claimed deploys against your environment log.
- **Audits record `HEAD` and `git status --short` at the start and again before delivering.** Put this instruction in the audit brief. Reverify findings about deleted, moved or renamed files against current `HEAD`.
- **Repeated correct fixes that don't work mean the model of the problem is wrong.** Stop fixing and distinguish two mechanisms with a screenshot or a question the owner can answer in a minute. Do this on the second failed fix, rather than the fifth. Green tests that exercise a sequence the user never receives turn "I don't understand this" into "this is fixed".
- **"Ready to test" means testable with nothing to do first.** Build, install or deploy it on the surface the owner uses, and say what needs reloading. Complete the handoff, or state its remaining edges plainly.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

You can verify the delegate's report without asking it anything, and you repeat no result of its that you have not run yourself.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/brief-template.md` | a brief's skeleton, with what each part is for, and the handoff the delegate writes back | writing any brief longer than a paragraph; reading a handoff |

## Limitations

CLI features, sandbox behavior and permissions depend on the version and host. Keep provider and authorization checks in the parent workflow and verify changes independently.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-teams/skills/delegation).
