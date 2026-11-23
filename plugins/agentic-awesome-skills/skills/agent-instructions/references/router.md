# The router — what opens when

The router is the part of the entry file that makes progressive disclosure work. The entry file is what every session reads; the router opens the next layer only when the task needs it; the docs and skills hold the depth. Without it, a repository has two bad options: put everything in the entry file, which grows until no session reads it with attention, or put the depth in docs, where it is never opened at the moment it applies.

A starter router for an app repository, ready to copy, is § 1.8 of `agents-md-skeleton.md`. This file is how to write and keep one.

## Anatomy of a row

| When you are… | The rule that applies | Open |
|---|---|---|
| **pushing a branch that deploys** — "just push it" is this row | A clean review round covering everything the push adds; the push closes it. Migrations applied by CLI to the database that deploy reads, and its ledger read, first (production's only at a promotion, after the go). Name back any precondition still open rather than pushing past it | the `independent-review` skill · the `release-gate` skill |

- **"When you are…"** is a moment, in the words a user would use or the action the agent is about to take. It is what the agent matches against, so it must look like the situation, not like a topic. The aside — *"just push it" is this row* — names the casual phrasing that would otherwise slip past.
- **"The rule that applies"** is the part that is easy to miss, in one or two lines: the thing that, missed, costs a release or a day. It is not a summary of the file in the next column; it is the sentence that must be met *now*. A row may leave it empty when the file is the whole point.
- **"Open"** names the file to read before acting — the section too, when it is one section — or the skill by name. Several are fine. A conditional is fine: "the first time for this vendor, the setup stage".

Introduce the table with two sentences: **at the start of every new task, find the moment you are in — several can hold at once — and open what its row names *before* you act, even a file read earlier in the session**; the rule column is the part that is easy to miss, the file holds the depth.

## Keying rows

- **One row per moment, not per document.** "Writing a query or a migration" and "touching environments, branches or an incident" may open the same doc; they are different moments with different easy-to-miss rules.
- **Use the user's words and the agent's verbs.** "Fixing a bug", "saying a stage is done", "adding an environment variable", "reading a doc that disagrees with the code". Not "Testing", "Environments", "Docs".
- **Name the moment, not the area, when the trap is in the moment.** "Creating or removing a git worktree" deserves its own row because one command (`git worktree remove --force` through a linked `node_modules`) empties another checkout; it would be invisible under "Git".
- **Bold the rows where a mistake is public or irreversible** — the push that deploys, the promotion to production — so they stand out when scanning.

Worked rows from an app repository:

| When you are… | The rule that applies | Open |
|---|---|---|
| fixing a bug | A regression test that fails before the fix; the doc that described the old behaviour, corrected | the test rules (rules that came from bugs) |
| writing a query or a migration | The schema is the source, not memory; migrations by CLI with the target spelled out; a rename or drop the deployed code still reads ships in two steps — add the new, drop the old once the build reading it is live | the migrations directory, newest first · the generated database types · the `supabase-production` skill |
| writing framework code | This framework version is newer than your training data | the framework's own bundled docs (for Next.js, `node_modules/next/dist/docs/`) |
| deferring anything, or asked what remains | Every deferral has a reason and a revisit trigger | the backlog |
| adding a fail-closed guard or hosted CI | Never in the same change as the product it guards | the `release-gate` skill |

## What gets a row

- **Every rule placed in a doc gets a row**, keyed by what the agent is doing when it applies — unless the rule lives in the file the agent is already editing at that moment (a migration-writing rule at the top of the migrations README, say).
- **Installed packs get rows for their moments; product scripts get their commands in those rows.** Skills teach method; the product owns the release, review-round/brief, preview and extra-check commands. A procedure run by hand a second time becomes a script, routed from the entry file; `agents-md-skeleton.md` has the starter rows.
- **File at the fire point, not at the topic home.** A rule lands in the chain of the task where it must *change a decision*; the topically natural file keeps the durable record and a pointer. A rule reachable only from the wrong task is unreachable. (`2026-08-07`, a content repository: a rule governing a decision taken while drafting was filed in the strategy file, which only strategy sessions loaded; the owner had to ask "when is strategy read?" before it moved.)
- **A new file rarely needs a row of its own**; it needs a reference from the right file in an existing row's chain. A row is for a genuinely new moment.
- **What has no moment** — a worked example, the release history, a case study — is indexed in the docs' own index, not the router. That index is a catalog (what each file holds, which wins when two disagree), never a second router.

## Two ways to point

- **Rows point at several operative files** (an app repository): the row names exactly what to open, and the files are small and specific.
- **Rows point at one entry file per task class, which owns its own load sequence** (a content repository with deep, layered doctrine): the root says only "drafting a post → this file", and that file says what it loads, in order. The root never restates the sequence.

Either way, **root routes to doctrine; it never summarizes it.**

## Reading the router

The entry file tells the agent, in its own words:

- **Classify the request before substantive work, and read every matching row's files top to bottom, as hard constraints.**
- **Several rows match → read all of them.** No row matches but the task touches the repository's knowledge → start at the docs index.
- **Do not substitute memory, a summary, or a read from a previous session.** Reload at the start of every new task, after a compaction and at session start. A quick self-test: *can I quote, right now, the rule that applies to what I am about to do?* If not, the file has not been read in this context.

## When a row failed

When a mistake happens, ask which row should have fired:

- **No row matched the moment** → add the row, keyed by what the agent was doing, in the words it would have used.
- **A row matched but the agent acted before opening the file** → the rule column did not carry the part that was easy to miss; put that sentence there.
- **The row fired, the file was read, and the rule was still missed at the decisive moment** → prose has lost; make it a code path (`prose-vs-code.md`).

Write the fix with its receipt — the date and what happened — so the row carries its reason.
