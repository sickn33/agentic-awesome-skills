# Glossary

One meaning per word, for every skill in this set. A skill uses these words and does not redefine them. When a repo has its own glossary, the repo's wins.

## Work

**Run folder**: `.design-system/` at the repo root holds the run's own notes, captures and scratch. The first step adds it to `.git/info/exclude`, so nothing in it is ever committed, and audit mode writes nowhere else.

**Surface**: One route, the shared layout every route renders, or a smaller part such as a modal. A brief, a capture, a commit and a verdict each name one. People say page or screen, and prose may too, but an id says surface.
_Avoid_: page or screen (as the id in a brief, a verdict or a file name)

**Run branch**: The branch a writing run commits to, cut from HEAD at the start. When the person names a branch, that branch is the run branch and no other is cut. Otherwise the branch the run started on is written to `.design-system/start-branch`, and `land.mjs` refuses it and the default branch. Audit mode cuts none. Merging is the person's call.
_Avoid_: feature branch, working branch

**Coordinator**: The agent that splits the work and starts workers. A **worker** does one brief and starts nobody.
_Avoid_: orchestrator, sub-agent, subagent, lead (for the coordinator)

**Wave**: The set of workers running at once. A wave never overlaps another wave's files.
_Avoid_: batch, round

## Decisions

**Decision**: A choice that a reversible change settles. The run makes it and records the evidence. Merges inside a tolerance, adds-only accessibility changes and announced fixes to broken behaviour are decisions.

**Gate**: A product or brand choice a person could answer either way. It carries a default, the run applies the default on the run branch, and the person reverses it by naming it at merge. A gate never holds the run.
_Avoid_: blocker, open question, TODO

**Clearance**: The person's go-ahead, within a budget, to migrate past the safe moves. An ask that names the migration counts. "Clean it up" and "fix it" never do.
_Avoid_: approval, sign-off

**Identical-value swap**: A raw literal replaced by a token that holds exactly its value. It needs no clearance, and a pixel diff at tolerance 0 proves it.
_Avoid_: token replacement, cleanup

## Evidence

**Baseline**: How a surface looked and behaved before the first migration commit, captured in the environment CI uses. When the base moves, the baseline moves with it.
_Avoid_: snapshot, golden

**Parity**: The new control gives the same answer as the old one for the same input. Checked with a table, one row per input, and every differing row is approved by a person or fixed.
_Avoid_: regression test, visual match

**Write surface**: A surface whose code sends a request that changes data (`mutate(`, `mutateAsync(`, `onSubmit`, `execute(`, a non-GET `fetch`). Its tier is set by the diff, never by the row label.
_Avoid_: tier A (as a label on a row)

**Verifier**: An agent that did not write the code. It runs the app at a named commit and writes its verdict to a file before its final message. A type check, a passing CI run and a worker saying "done" are inputs to a verdict, never the verdict.
_Avoid_: QA agent, reviewer (for the agent whose verdict lands a surface)

**Reviewer**: A read-only agent that reads a diff, its comments or a render and reports findings. It changes nothing and its findings never land a surface. Only a verifier's verdict does.

**Verdict**: `verified`, `issues` or `blocked`, followed by what was not exercised. A claim names the command that proved it in this session. Evidence older than the last edit is stale. Evidence that was not collected is `blocked`, never `verified`. A wait that ran out is `blocked (timed out)` with the command to rerun. On a host that cannot start other agents the writer's own check is `self-verified`, which never lands a write surface.
_Avoid_: `pass`, `partial`, green, looks good, verified-pending-browser

**Fingerprint**: A hash of the surface's files at the commit a verdict covers. A verdict for another fingerprint is stale.

## System

**Primitive**: A component the system owns that other components build on: text, button, input, select, checkbox, icon, badge.
_Avoid_: atom, base component

**Legacy**: Code the system replaces: a module, a path or a raw value the migration must reach zero on. The **ratchet** is the committed per-file count that may fall and never rise.
_Avoid_: old code, deprecated (unless the registry says so)

**Gap**: Something the system lacks that a surface needs. A gap is a row in the gap list and a request to the system's owner. It is never a workaround in a surface, and a prop the system has that the caller never passed is not a gap.
_Avoid_: missing feature, TODO

**Taste file**: the accepted defaults for bans, voice, widths and reference systems, saved to `.design-system/taste.md` from the default in `references/taste.md`. A skill reads the accepted one and never assumes a line the file leaves out.
_Avoid_: style guide, brand rules

## Counts

Say the unit with every number. A line holding three hex values is one **line** and three **occurrences**. A **mapping row** is one property in one place with one job. Never subtract one unit's count from another's.

## Flagged ambiguities

- "Verified" was used for a code read, a type check and a browser run. Only a browser run at the surface's fingerprint is `verified`.
- "Done" was used for landed, verified and merged. A surface is **landed** when its commit is on the run branch and **verified** when a verifier's verdict names that commit.
- "Skipped" hid two things. A step that does not apply is `skipped (reason)`. A step that could not run is `blocked (reason)`.
