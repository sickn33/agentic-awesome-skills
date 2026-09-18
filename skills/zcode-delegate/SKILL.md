---
name: zcode-delegate
description: Delegate coding tasks to the Z.AI ZCode CLI only when the user explicitly
  requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `zcode` CLI (Z.AI ZCode) with a configured model provider,
  Node 18+, and git. ZCode ships its CLI inside the desktop app rather than on PATH
  or npm — see Prerequisites. The orchestrating agent must be able to run shell commands
  and read files. Shell examples assume bash/zsh (macOS/Linux, or Git Bash/WSL on
  Windows).
metadata:
  version: 0.5.0
---
# ZCode Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `zcode` implementer (`Z.AI ZCode`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. This skill lets you hand a bounded coding task to a separate
**implementer** — the Z.AI ZCode CLI — then review what it produced and land it yourself. You write
the brief and own the judgment; ZCode does the typing; you verify and commit.

Nothing here is specific to one orchestrating agent. The loop needs only the ability to run a shell
command and read a file. (It is designed for and run on Claude Code; treat other orchestrators as
designed-for, not yet proven.)

## When NOT to use this

- The task is small enough to just do inline — delegation overhead is not worth it.
- ZCode is not installed, or its CLI has no model provider configured.
- You want to write the code yourself, or you only need a review.

## Prerequisites (check once)

1. **ZCode is installed.** The CLI ships **inside the desktop app** — it is not on PATH and not on
   npm. The relay resolves it in this order: `--zcode-path <file>` or `ZCODE_CLI` first, then PATH,
   then the installed app bundle. On Linux the app is an AppImage with no fixed install path, so
   the flag or the environment variable is required there — the relay guesses nothing.
2. **A model provider is configured for the CLI**, with a key it can actually reach. Being signed
   into the desktop app is *not* enough — see below.
3. You are in (or will point `--cd` at) the target git repository.

The relay records the CLI version and how it was resolved into `result.json`, so a surprising
install is visible after the fact.

## Authenticating the headless CLI

**Signing into the ZCode desktop app does not authenticate the CLI this relay drives.** The CLI
keeps its own config at `~/.zcode/cli/config.json`, separate from the desktop app's, and nothing
bridges the two. `zcode login` is the intended path, but where it fails with `OAuth response is
not valid JSON` the way in is a Z.AI API key.

Two pieces are needed, and they are separate:

1. **The provider block** must exist in `~/.zcode/cli/config.json`. It defines the provider, its
   endpoint and its models — the environment cannot supply this:

   ```jsonc
   {
     "provider": {
       "zai": {
         "kind": "anthropic",
         "options": { "apiKeyRequired": true, "baseURL": "https://api.z.ai/api/anthropic" },
         "models": { "glm-5.1": { "name": "GLM-5.1" } }
       }
     },
     "model": { "main": "zai/glm-5.1" }
   }
   ```

2. **The key** can live either in `provider.zai.options.apiKey` in that file, or in the
   environment as any one of `ZAI_API_KEY`, `ZCODE_API_KEY`, or `ANTHROPIC_API_KEY`. Prefer the
   environment — it keeps the secret off disk.

If a run fails with `Model provider is missing an API key: <provider>`, the provider block resolved
but no key was found: set one of those variables and re-run.

## Autonomy — read this before dispatching

ZCode's own term is **mode**. It has four values; only two are usable headlessly.

| mode | Behaviour |
| --- | --- |
| `yolo` | **Writes.** ZCode's own default for `--prompt`, and this relay's write-capable default. |
| `plan` | **Refuses edits.** What `--read-only` selects. |
| `build` | **Rejected by this relay.** No permission client exists headlessly, so tools are blocked and the run exits 0 having done nothing. |
| `edit` | Rejected for the same reason. |

Two limits stated plainly, because ZCode cannot enforce them:

- **`plan` mode refused edits in testing, but the relay does not treat that as a guarantee.** It
  takes a Git fingerprint before the run and reports a tri-state `readOnlyViolation` afterwards.
  Confirm `touchedFiles` came back empty rather than assuming no edits.
- **ZCode has no `--allowed-tools`.** Only the `--disallowed-tools` denylist exists, and it *is*
  genuinely enforced. An explicit allowlisted tool surface is therefore impossible here — do not
  assume one.

## The loop

Run these five steps per task. Steps 1, 4, and 5 are your judgment; 2 and 3 are mechanical.

### 1. Write the brief

ZCode sees **only** what you send — no repo memory, no chat history. Everything the task needs goes
in the brief: the goal, the current state, what to change, what to leave untouched, the project's
**actual** gate commands (discover them from the repo's CLAUDE.md/AGENTS.md/Makefile — do not
assume), and a report contract. Tell ZCode it will **not** commit. One task per brief. The relay
delivers the brief as an attached file, so the command line no longer bounds its length — the
model's context window still does. Full guidance and a template:
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# read-only (review/diagnosis, no edits):   add --read-only
# continue a specific session:              add --session <sess_...>  (from result.json; send only the delta brief)
# continue the latest session for --cd:     add --resume-last
# withhold tools (denylist):                add --disallowed-tools "Write,Edit,Bash"
# point at the CLI explicitly:              add --zcode-path /path/to/zcode.cjs
# hard time limit (watchdog):               add --timeout 2h  (default: off)
# see all options:                          node .../relay.mjs --help
```

(`<skill-dir>` is this skill's installed directory — the folder containing this `SKILL.md`.)

The relay writes its artifacts to a temp dir, so the repo under review stays clean. It **never
commits** — see step 5. Mechanics, flags, and the `result.json` shape:
[references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The relay blocks until ZCode finishes, so back it with whatever your orchestrator offers:

- **Claude Code:** run the Bash call with `run_in_background: true`; you are notified on completion.
- **Plain shell / other agents:** foreground for short tasks, or background it and poll the result
  file. The run is done when `result.json` exists with a `status`. A pre-run usage error exits 2 and
  writes **no** result file, so check the exit code too; a CLI that cannot be found exits 127 but
  *does* write a `result.json` with status `zcode_unavailable`.

Do not trust progress trackers over reality: read the working tree, not a status line.

### 4. Review — do not trust the self-report

- **Re-run the project's gates yourself.** Never take "gates passed" on faith.
- **Read the diff** against the brief: did ZCode do what was asked, nothing more and nothing less?
  `touchedFiles` is your starting point.
- **On a `--read-only` run, check `readOnlyViolation` and confirm `touchedFiles` is empty.**
- Run the relevant guard skills on the diff if you have them installed.

Full checklist: [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

**The orchestrator commits.** Only after the gates pass and the diff holds:

- Commit the verified work yourself, with a clear message.
- If it needs changes, send a delta brief with `--session <sessionId>` from the prior `result.json`,
  and review again.

## Read-only second opinions

The relay doubles as a way to get an adversarial second opinion with no write risk: dispatch
`--read-only` with a brief listing the agreed points, then each contested point with both positions,
and ask ZCode to defend or concede each. Because plan mode's guarantee is measured rather than
enforced here, verify `touchedFiles` came back empty instead of assuming no edits.

## Authorization model

Delegation is something the human opts into. Once they have, committing verified, gate-passing work
is the agreed contract. Two limits: **surface, don't absorb** (report ZCode's design decisions and
defensible-but-unasked turns rather than silently keeping them) and **stop for scope changes** (if
correct completion needs going beyond the brief, ask). The full treatment is in
[references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — how to write a brief ZCode can
  execute blind: structure, the report contract, embedding the real gate commands.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — `relay.mjs` flags, the
  `result.json` contract, how the CLI is resolved, backgrounding, and recovery.
- [references/review-and-land.md](references/review-and-land.md) — the review checklist, the commit
  boundary, and the exact-session rework cycle.
- [references/multi-task-queues.md](references/multi-task-queues.md) — running a sequential queue:
  carrying constraints forward, progress tracking, and the end-of-run coherence check.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `zcode` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
