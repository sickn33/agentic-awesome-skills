# guardrail-hooks: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Make rules that depend on memory at decisive moments into code paths.

- `2026-10-12`: an owner answered "up to you" about a wording choice, and the agent stretched it into "my call: delete the live post and repost tomorrow". Nothing was deleted, but only the agent's judgment stood in the way of a one-line delete. The instructions had said since `2026-06-02` that deleting anything public needs the owner. The fix was a hook that makes the owner click.

## Choose the smallest code path that holds the rule.

- `2026-08-12`: a search-analytics tool, after four silent data errors in one session: a capped, click-sorted single pull kept 23% of impressions; a cached file read as a 40-day window was a 17-month aggregate. Pulls now paginate and write a manifest of the exact window, and the report refuses to run without one.
- `2026-09-07`: a ledger committed as 0 bytes while resolving a conflict, 209 rows gone, and the nightly job crashed on it.
- `2026-08-05`: a shallow clone deepened before any ancestry check, after three sessions burned time on bogus "unrelated histories".
- `2026-07-30`: a warning when the session started on a machine-named branch, three days of work stranded on one.

## Gate only what the owner would actually want to click for.

- `2026-10-12`: The first version of the one-way-door guard also gated process kills, `rm -rf`, HTTP DELETE and destructive git, and scanned all command text. It fired twice on a benchmark session whose heredoc merely *contained* a scoped `pkill -f`, and the owner said "I don't want those questions." It was narrowed the same day to public deletes and publishes.

## Match what runs, not what is mentioned.

- `2026-10-24`, found while porting: an identity guard that matched a forbidden address anywhere in a command also blocked `git log --author=<address>`, the search its own docstring said it allowed, and blocked a test whose JSON merely contained the address. The script here (`scripts/block_wrong_identity.py`) matches per command segment and only on `commit` for `--author`.

## The go for a one-way door is typed in the conversation, never on a side page.

- `2026-10-24`, a monitoring product: a go for a production push given on the owner's decisions page did not clear the permission check; it had to be typed in the chat.

## Never block the way out.

- `2026-06-22`, burnstop, an open-source budget-fuse plugin for Claude Code: a spend fuse exempts its own management commands, so disarming works when the session is over budget.

## To stop a run, use `Stop`.

- `2026-06-22`: `continue: false` from a `Stop` hook stops the agent and takes precedence over event-specific "continue" decisions, which is how the spend fuse beats `/goal`, itself a Stop hook. The precedence confirmed in the docs on `2026-10-24`.

## Block an address that must never author a commit, and still allow searching for it.

- `2026-09-07`, `2026-10-02`, `2026-10-05`: an agent harness showed the owner's sign-in address as "the user's email"; on the code host it belonged to another account, and commits authored with it were credited there in three repositories.

## Shell-form hooks run through Git Bash, which eats backslashes.

- `2026-06-22`, burnstop's installer: A hook command written `C:\Python313\python.exe ...` ran as `C:Python313python.exe: command not found`, and every hook errored.

## Python hook output is in the ANSI code page unless you say otherwise.

- `2026-10-24`, Python 3.13 on Windows 11: A hook's `§` reached the transcript as `�`.

## Start a new blocking hook in observe mode when what it stops can be undone.

- `2026-11-17`, the Claude Code team's account of how it verifies changes (Addy Osmani, "How the Claude Code team thinks about verification", claude.dev, 2026-11-16, read `2026-11-17`): a commit gate has off, observe and enforce modes, and observe logs what would have been blocked, to find false positives before anyone is affected. The one-way-door exception is this collection's: there a miss is the incident itself.
