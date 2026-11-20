# Running many agents

One migration ran hundreds of workers over several days. The limit was never the number of agents. It was load, wedged servers and waiting. These are the few rules that paid for themselves. The one script is `scripts/land.mjs`. The rest is judgement and a few shell lines.

## Load valve

Do not spawn and do not start a browser run while the 5-minute load average is above 24 (adjust to the machine's cores) or free-plus-inactive memory is under 1 GB.

```
uptime                          # the second load number is the 5-minute average
vm_stat | head -4               # macOS; on Linux, head -3 /proc/meminfo
```

When blocked, wait and recheck every 30 seconds up to 30 minutes, then spawn nothing and say so. Name the three busiest processes to the person and kill none of them. Read memory as pressure and swap, because a reading of a few hundred MB free was file cache the OS would drop. The migration ran at several times the cap for long stretches, and every worker slowed down.

## Browser slots

Run at most 3 browsers at a time. A slot is a folder made with `mkdir` that holds the owner's pid. Reclaim a slot only if `kill -0 <pid>` fails. Never `rm -rf` slot folders, because two workers then share one. A hung holder is reported with its pid and age, never killed. Bound every wait to 20 minutes and return `blocked (timed out)` with the rerun command. Unbounded waits of an hour and more happened, and one verifier deleted its only loaded run to escape one.

## Backend health

Probe with a signed-in call. An unauthenticated 401 that came back at once proved the web server was up while authenticated reads hung. If the probe fails for 60 seconds, the worker returns `blocked: server down` with a rerun script. It does not restart a shared server. One owner (the coordinator) restarts it, and the brief says who.

## Two sessions on one repo

Give each session its own id and its own MAY EDIT lists, and write the lists to a shared file. A file dirty at the start and unchanged is the other session's. Never settle a conflict by overwriting. Send the path of the other version to the coordinator. A scratch folder inside a package once broke the project build for both sessions, so scratch stays under `.design-system/tmp/<id>/`.

## Permission refusals

A refused call stops that worker's piece. Report the exact command and the refusal text, leave the files as they are, and finish whatever does not depend on the call. Do not retry with another flag, tool or script. The coordinator never runs the refused command for the worker. It asks the person with three options: allow it, skip the check that needed it, or hold the piece. Hold is the default. A refused health probe was reworded and retried for hours while write pieces stayed unverified.

## Coordinators and resume

- Judge every return from files, never from a message. An implementer's work is what `git diff` shows, and some stopped early or wrote nothing. A verifier writes its verdict file (one verdict per item, with evidence paths) before its final message, because verifiers died before reporting and coordinators waited forever. No file means rerun once, then judge the evidence yourself and say so.
- Keep each lane resumable from its brief, backlog, ledger and verdicts on disk. Spend limits, agent caps and machine load stopped lanes many times, and a fresh coordinator rebuilt each from the folder in minutes. One id per surface or cluster, never reused.
- Resume by fingerprint. If the verified commit equals the surface's fingerprint, land it. If equal and unverified, verify. If the files changed, rerun the checks.
- A coordinator hands back after 25 landings or 6 hours. One that ran past that degraded and looped as its context filled.
- Never end a turn with a worker running. A background worker left alive keeps writing into a repo nobody checks. Spawn waves as foreground calls, several in one message, and drain before handing back.
- Cap live agents well below the host's limit. A window of about half the cap held.
- The person's standing preferences ("never delete files, list them instead") go in every brief word for word, so each new worker has them.

## Shared files

A file every lane writes, such as a ratchet, a baseline, a registry or a docs index, is where landings leak. Recompute a ratchet or baseline for your own files only and pass it with `--also`, which refuses a changed row that names another worker's file. In a JSON file a row is a key or an array element, so a one-line ratchet works. A generated docs index spans every page, so one lane owns docs. Feature lanes queue their docs text and the docs lane lands it in one commit, so no commit in between carries a stale index.

## Landing

`land.mjs --help` has the flags. It refuses the default branch and the branch the run started on, takes a lock, builds the commit in a private index from HEAD, asserts the commit's file list lies inside the named paths, then resets only those paths in the shared index. A stale shared index once reverted a landed route, and a shared list file committed whole once carried another worker's uncommitted changes. Name exact files, and read `git show --stat HEAD` after every landing. The repo's git hooks run on each landing. Read them first, because a hook that formats or stages files makes `land.mjs` exit 3. `--no-verify` skips them only when the person allowed it, and the report says so.

## When the base moves

Merge upstream in a separate worktree. Never run merge, stash or checkout in the shared tree. Re-merge right before integrating, update the shared tree with a two-tree read (`git read-tree -m -u <old> <new>`), which refuses when it would touch a file someone has uncommitted, then move the branch ref. Move the before build to the new base too, rebuild its packages and recapture with a fresh cache, or every before and after diff mixes in the merge.
