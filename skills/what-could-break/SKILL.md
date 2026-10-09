---
name: what-could-break
description: "Find what a change breaks outside its own diff, then prove the one fact that makes it safe by running real code. Use before any multi-file edit or an edit to a shared path."
category: development
risk: safe
source: community
source_repo: stas4000/what-could-break
source_type: community
date_added: "2026-10-08"
author: stas4000
tags: [code-review, refactoring, testing, blast-radius, verification]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/stas4000/what-could-break/blob/main/LICENSE"
---

# What Could Break

## Overview

Listing callers is not the job. Grep does that in a second. This skill finds the breakage
grep will not show you, and produces one proof that the change is safe.

Run it before design, not only before merge. Whenever a task asserts something about
existing code ("X already handles Y", "just make X public"), that assertion is a
hypothesis, and the census of real consumers decides the design.

## When to Use

- Use before any multi-file edit, or an edit to a shared path: API payload, config, stored data, a client other apps read, a prompt or policy file
- Use when the user asks "what could this break" or "blast radius of X"
- Use for a small diff you do not trust
- Use when a brief asserts something about existing code, before you design against that assertion

## How It Works

### Step 1: Do not trust your own writeup

A risk analysis that sounds right is worthless: it reads as convincing whether or not it
is true. Find the one or two facts the whole change depends on, and get each one as far
down this ladder as is cheap. Say where it stopped.

1. **You said so.** Worth nothing on its own.
2. **You pointed at it.** A real `file:line`, or the library's own source at the pinned version.
3. **You walked it.** You traced the bad case step by step and it does not reach.
4. **You ran it.** A script or test calls the real code and fails loud if you are wrong.
5. **You saw it live.** Reproduced in the running app, service or device.

Rung 4 is usually one small script that imports the same module production runs and calls
the exact function you are worried about, with the input you are worried about.

### Step 2: Read the change

The diff, the symbols it adds, changes and deletes, and what it now does differently,
including what the diff does not spell out. `git log -S '<symbol>'` and
`git log -L :<function>:<file>` show why the old shape exists; a guard that looks
pointless often has a commit explaining the incident it stopped.

### Step 3: Find the one fact it is safe because of

Most risky-looking changes are safe because of one fact ("this only drops cache entries
that are already expired", "no client reads this field"). If it holds, most risks clear at
once. If you cannot find one, the change is not understood yet.

### Step 4: Look where grep stops

Search for the literal value, the field name, the error text and the old behavior, not
only the symbol you renamed. Then check each of these by hand:

- **The same rule living twice.** A second config file, a fallback path that hardcodes the old default, a copy synced into another repo, a constant duplicated in a migration or test fixture, a feature flag default.
- **Prompts and agent files that restate the rule.** System prompts, agent and skill files, `AGENTS.md`, `CLAUDE.md`, runbooks. An agent obeys the stale sentence, not your code.
- **Every other client.** Web, iOS, Android, desktop, CLI, extensions, partner integrations. Mobile clients in users' hands stay on the old version for weeks: what does an old client do with the new shape, and a new client with the old server?
- **Wire formats.** JSON field names and types, enum values, null versus missing, date formats, pagination shape, error codes, webhook payloads, queue schemas, GraphQL and protobuf contracts.
- **Stored state.** Columns and their defaults, rows written under the old shape, cache entries, files on disk, append-only logs, session and cookie contents, search indexes. Old data outlives the deploy.
- **Environment and secrets.** An env var renamed in code but not in the deploy config, CI, the image, or the second service that reads it.
- **Processes that restart separately.** Web server, workers, cron jobs, serverless functions, the mobile app, a sidecar. During a rollout one runs new code while another runs old code against the same data. Can both coexist for an hour?
- **Timing and concurrency.** Two writers on the same row or key, a retry that now fires twice, ordering that only held because one step was slow.
- **Library source at its pinned version.** Read the dependency's code at the lockfile version, not your memory of its docs.
- **Generated and vendored code.** Clients generated from a schema, vendored copies, committed build artifacts, bundles whose cache-busting key did not change.
- **Tests and fixtures that encode the old behavior.** A test that passes because its fixture still has the old shape proves nothing about the new one.
- **Observability.** Dashboards, alerts and log parsers matching a message or metric name you changed.

### Step 5: Prove the one fact

Write the script or test that runs the real code, run it, and paste what happened. If you
cannot run it, write "unproven" next to the fact. For a wide change, repeat steps 3 to 5
per subsystem instead of stretching one writeup across everything.

## Examples

### Example 1: A field removed from an API response

The one fact: no client reads `legacy_total`. Rung 2 is a search across every client repo.
Rung 4 is a script that replays yesterday's real requests against the new serializer and
asserts no response shrinks a field a stored client build still parses. The report names
the iOS build still in users' hands and the cleared web and admin clients.

### Example 2: "Just make this helper public"

The brief asserts the helper is already side-effect free. Treat that as a hypothesis:
read it, then run it twice in one process and compare state. If it caches, the assertion
is false and the design changes before any code is written.

## Best Practices

- ✅ State the rung each fact reached, and the command that proved it
- ✅ List cleared risks separately from confirmed ones, with the search you ran
- ✅ Cite a real `file:line` for every risk
- ❌ Don't invent a caller, an API or a config key
- ❌ Don't ship a convincing essay in place of one run script

## Limitations

- A risk needs a real chance and a real cost, or it does not belong on the list.
- A search that found nothing is still an answer: write the search down rather than claiming the risk does not exist.
- This skill does not replace environment-specific testing or expert review.
- Keep secrets and private data out of the report and out of any script left behind.

## Security & Safety Notes

- The proof scripts this skill writes run real production code paths. Run them in a local or authorized test environment, never against production data stores.
- Read-only by design: it inspects a diff and runs checks. It does not mutate state, and it should not be used to apply fixes.

## Credits

Adapted from [stas4000/what-could-break](https://github.com/stas4000/what-could-break) (MIT).
Includes material adapted from pstack by Lauren Tan (MIT); its notice ships here in
[references/LICENSE-pstack.txt](references/LICENSE-pstack.txt).
