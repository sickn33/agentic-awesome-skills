---
name: flight-deck
description: '''What''s the status'', ''where were we'', a progress report or status deck; long work that must survive compaction: multi-hour runs, background jobs, waiting on a decision.'
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

# Flight Deck — surviving your own context window

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'What's the status', 'where were we', a progress report or status deck; long work that must survive compaction: multi-hour runs, background jobs, waiting on a decision.


**Write state down where it cannot be summarized.** In a long session, tool output scrolls away and context becomes a plausible narrative with operational details sanded off. The work keeps running while your model of it goes stale. Then you re-run a paid job, report a number from memory, or forget that something is blocked.

**The flight deck is `STATUS.md`, `LOG.md` and the owner's page.** When the Artifact tool exists, build the page in the first pass as an artifact with a database (`capabilities: {db: {}}`). Use `assets/owner-page.html`, following `references/owner-page.md`; use `OWNER.md` only when the tool does not exist. A test run, or one with nothing for the owner to decide yet, still builds the page. It carries status too, and a test exercises it. A scheduled pass with no chat never builds or publishes a page; it checks the one its prompt names.

## The two files (per area, not per repo)

**Rewrite `STATUS.md` in place to describe only what is true now.** Never append to it, because a growing status file leaves the reader unsure which line is still true. Use these sections where they earn their place:

- **Put RESUME first, with the work's location and how to resume.** Name the repository or folder and branch, then the last few sessions that touched it. Give each a date and one-line summary, dropping the oldest. Resume by opening the agent in that folder and having it read `STATUS.md` first. Reopening an old session is the fallback, because its memory is stale.
- **List RUNNING NOW with process ids, log paths and each wait.** Say what each thing is waiting on.
- **Keep QUEUED in order so the next task needs no judgement.**
- **Name why each BLOCKED item is blocked and what unblocks it.**
- **List HELD work deliberately not shipped and who owes the decision.** The work is finished.
- **Put questions you cannot answer yourself under AWAITING <person>.**
- **Keep DONE to one line each, enough to prevent redoing it.**
- **Record EVIDENCE as measurements with their actual numbers.** See § Write down evidence, not just tasks.
- **List STANDING RULES a fresh reader would otherwise violate.**

**Use the same sections for work that isn't code.** `references/other-work.md` says how they map.

**Append decisions and their reasoning to `LOG.md`, never rewrite its history.** Include corrections and dead ends. Status answers "where are we"; the log answers "how did we get here, and what did we already rule out". Both are needed, in separate files.

**Optionally commit a how-it-works doc when the machinery is non-obvious.** Status and log are volatile; this durable doc belongs in version control and your routing file.

## The owner's page

**Give the owner a short status and only asks that need them.** `STATUS.md` and `LOG.md` are for you. The page serves someone who isn't watching the session, so they never need the transcript to find the status or what you need. They open it, answer, save, and you read the answers at your next check-in. It makes `STATUS.md`'s AWAITING section answerable. Without the Artifact tool, use `OWNER.md` with the same shape.

**Keep a proposal's or plan's open decisions on the proposal's page.** The owner's page links there and doesn't ask them; apply the `propose` skill, § 7.

**Before building it, open `references/owner-page.md` (the data, publishing, the loop) and `assets/owner-page.html` (the page you copy).**

**A progress report starts here.** Asked for "where we are", a status report, "what's done and what's next" or a progress deck, update `STATUS.md` and the owner's page first. Project the report from them; a deck is a view of the flight deck, never a separate account of the work.

### What is on it

**Project a short status from `STATUS.md`, rather than every detail.** A status block nobody reads to the end is no status.

- **Put the phase and milestones first, marking the current milestone.** For example, "3 of 5". Follow with at most three lines each of what was just built, what's in progress and what's next. Include how many things wait on the owner.
- **Several areas share one page with Overview and an area tab each.** Give each area a board of 5 to 10 key work items, separate from the owner's asks. See `references/owner-page.md` for the data and migration.
- **Ask only for a decision, a go or an owner-only task.** A go is for a one-way door. Never put status, receipts, finished work, or anything you could do yourself among the asks.
- **Each item carries everything needed to answer it.** Say what you need, where (the link, file or setting), why only they can, your preselected recommendation, and what happens after they answer. Never use a pointer to the chat, since it may be gone after a compaction.
- **Check every step against the product before it goes on the page.** Each fact a decision rests on says how it is known: observed, read in its source, or assumed.
- **Never collect a secret.** Name the file or setting the key goes into.
- **A go typed on the page doesn't clear your harness's permission check for a one-way door.** The page asks; the go is typed in the chat.

### Reading and consuming answers

**Delete the item and answer once you have read the answer.** A gate stays until the go is typed in chat; a note on it deletes only the answer. Leave no reply on the page, no "settled" list, and nothing showing their feedback was processed. Work in this order:

1. **Record the decision before deleting the item and its answer.** Use the product's decision log, `STATUS.md` QUEUED for work it creates, and `LOG.md` for the why, with the answer's id and `at`. An answer whose id and `at` `LOG.md` already holds is not recorded or queued again.
2. **Delete the item and its answer in one write.** For a gate, delete only the answer; the gate stays until the go is typed in chat.
3. **Act only after recording the answer and deleting what should go.** On a gate, act only once the go is in chat.
4. **Confirm in chat, in one line.**

**Consume answers before acting, so answered items don't remain during work.** Acting first leaves them on the page for as long as the work takes.

**On a page with several areas, consume only your own area's answers.** Other areas' answers wait on the page for their own sessions.

**A run with no chat does steps 1 and 2 only.** This scheduled pass does none of the work and never passes a gate. Put its confirmation in `STATUS.md` for the next session to repeat in chat.

**Check at fixed points, because nothing notifies you when they save.** Check at each stage boundary, while a build or review runs, before ending a turn, after a compaction, and whenever they say they answered.

**An idle session with items waiting schedules its own check.** Use a cron or loop where the harness has one, rather than waiting for the next message. For hours when no session runs, a scheduled headless pass checks instead (`references/owner-page.md` § A scheduled check without a session).

**An answer given in chat closes its item too.** A gate closes only when the answer is the go.

**Make Save trustworthy.** The page says Save is what you read and that nothing notifies you. On first use, quote one saved answer back. Put the link in every chat message that mentions the page.

## The rule that makes it work

**Update `STATUS.md` on every state change.** Do it when a job starts, finishes, fails or gets published, a decision lands, or something becomes blocked. Not "at the end", not "when asked": the moment it changes. A status file that is 80% true is worse than none, because it is trusted.

**Read each new timestamp from the clock when you write it.** Use that reading in the status, the log and the owner's page.

**Keep status short enough to stay true.** If maintaining it is a burden, it is too detailed.

## Write down evidence, not just tasks

**Record measurements with their numbers and verdict, not the conclusion alone.** The highest-value lines are probe results, benchmark numbers, verdicts, costs, and "we tested X and it does not work". Losing task state costs a re-read; losing evidence costs money and credibility. You might re-run a paid experiment or restate a number from a summary and get it wrong.

**Record each phase's hours, review rounds, findings and added lines.** For a build, add them to `LOG.md` when the phase closes, counting fixed and listed findings apart, and the AI usage where the harness records it. The next plan estimates from them (the `app-lifecycle` skill), and drift shows in them long before it shows in a calendar.

## Where to put them

**Keep one pair per area of work, not per repository.** A repository with three unrelated efforts wants three pairs; three repositories serving one effort want one. The area is the unit someone would ask a status question about.

**Keep files needed after a restart outside scratchpads and system temp.** Status, logs, scripts, tools and cited evidence belong in the repository or another persistent working folder. Keep sensitive operator files uncommitted and protected there. Cross-link from the log to the status, and from long-lived docs to both, so a fresh reader can resume.

## Reading them after a compaction

**Read `STATUS.md` first, then skim the last few decisions in `LOG.md`.** Verify that a process listed as running is actually running.

**Do not trust the file over reality.** Reconcile, then fix the file. A stale status caught early is a small problem. Trusting it blindly is how you report a job finished when it crashed an hour ago.

**Start each phase of a long build in a fresh session.** Every turn re-reads the session's whole context, so a session that runs for days pays for those days on every turn. Rewrite `STATUS.md` when the phase closes; the fresh session reads it first, as after a compaction.

## When NOT to use this

**Skip this for short sessions, single-shot tasks and one-context-window work.** The overhead is real and pointless there. Use it when a session will outlive its own memory. You can usually tell at the start from background jobs, queues, or a run measured in hours.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

After a compaction, one read of the status board says what is running, what is blocked and on whom. Every line still matches what is on disk and what is running.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/flight-deck).
