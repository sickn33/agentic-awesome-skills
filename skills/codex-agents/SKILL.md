---
name: codex-agents
description: '''Ask Codex'', ''check with Codex'', handing Codex a build or review, or stuck between two framings: the Codex CLI as peer, builder or fresh reviewer.'
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

# Codex agents — the Codex CLI as peer, builder and reviewer

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'Ask Codex', 'check with Codex', handing Codex a build or review, or stuck between two framings: the Codex CLI as peer, builder or fresh reviewer.


**Treat Codex as a peer with the same standing as Claude.** Not a formatter, not a gate, not an authority.

**Confirm the build model and the review model with the user.** They are two choices. For each, suggest the newest GPT Sol their Codex lists, at `high` or `xhigh` (`--effort`; the wrapper's default is `xhigh`). The list is `models[].slug` in `~/.codex/models_cache.json` (verified `2026-11-18`, Codex CLI 0.169.0); without it, ask. A standing preference goes into the user's own `CLAUDE.md` or `AGENTS.md`, never a skill or the wrapper's state, so later sessions read it there and don't ask again. The author's example, chosen `2026-11-18`: GPT-6.2 Sol at `xhigh` for both.

**It can build, and what it builds is reviewed by someone else.** Hand it a build stage with the goal, binding decisions and files it will touch. Read its diff before believing it; a delegated diff is unreviewed code. The session that wrote code never clears it. An independent review does, through `independent-review` or whatever the project uses. Codex can review code it didn't write (§ Reviewer).

**Keep product decisions, operational changes and stage-completion judgement with the session agent.** This includes accepting or rejecting review findings, deploys, applied migrations, pushes, provider settings, secrets and production credentials. Development tests are builder work: run them, fix failures and report their results. Serialize suites on shared development data. Hand new migrations to the session agent to apply before dependent tests; name each operational step as one command for it. Without a runnable Codex CLI, or while it is out of usage (§ Resume or start fresh), the session agent builds the stage itself.

**Delegate only what is worth the hand-off; the test is size, not time.** If the brief would be nearly as long as the diff, write the diff. A stage small enough to describe precisely is small enough to write, and handing it over only buys a wait. Stop a build round that has made no writes on a small change; twelve minutes on a fifteen-line change is enough. Check `git status`. Kill its leftover process and write the change in-session. The session agent keeps the same responsibilities, and its diff still gets independent review.

**Bring Codex in while the framing is still open.** Invoke it for "check with Codex", "iterate with Codex", "ideate with Codex" and similar requests. Reach for it yourself when a load-bearing decision needs a peer or when different model blind spots matter. Keep routine drafting, formatting and mechanical tasks in-session.

**Give Codex the goal, the facts and the decision you need to make.** Share the actual draft, alternatives and reasoning, and prescribe only binding constraints. Treat Codex's judgement as a peer's. Argue through critiques and options over several turns, then bring the human one result or a clear deadlock, question of intent or missing fact. Apply `delegation` § Peer discussion for examples and convergence.

**Ask for the deliverable's actual format, including an image when needed.** Codex can write code and generate images directly through multimodal output. If the goal is a PNG, say that. Don't translate it to "an HTML file we'll screenshot."

## Dispatch

**Keep resumable briefs in a persistent file and use `--read`.** Use the repository or a working folder outside session scratchpads and system temp. Apply `flight-deck` when the work must survive a restart.

```bash
python <skill dir>/scripts/codex.py --new --read <brief_file>
```

**Explicitly open required instruction sections beyond the entry-file context budget.** Codex can truncate long `AGENTS.md` files. Name needed sections in the brief and require opening them from disk; apply `agent-instructions` for the budget. On Windows, Codex CLI 0.169.0 reported a 32,768-byte budget; a 104,297-byte file lost its role table (observed `2026-11-16`).

Use the host-approved sandbox. Prefer read-only for review and workspace-write for authorized edits and tests. If a test cannot run within the boundary, hand it back with the exact reason.


**Leave builds uncommitted when the session agent owns the commit.** Ask for a commit-message handoff. On Codex CLI 0.159, Windows 11, `workspace-write` could neither commit nor run git in another checkout (observed 2026-10-25). All three restrictions below were reproduced in scratch repositories. Other platforms were not tested in that probe. That sandbox kept `.git` read-only: `git add` failed creating `.git/index.lock` with `Permission denied`. A linked worktree's index lives in the main checkout's `.git/worktrees/<name>/` and failed the same way. Adding that `.git` with `--add-dir` did not lift the restriction. Windows also ran sandbox commands as a separate local user, so git refused other repositories as "dubious ownership". Read the diff and commit it yourself. If a brief sends Codex to another repository for prior art, tell it to read files from disk.

**Name `ui-design` in a build that adds or changes screens.** Name the `ui-design` skill with that invocation and carry its jobs-map rows in the brief. Codex loads a skill only from a pack installed in Codex. Before the first such brief, run `codex plugin list` and check `app-stack@product-engineering` is installed and enabled. If absent, run `codex plugin marketplace add phuryn/product-engineering`, then `codex plugin add app-stack@product-engineering`. Loading `ui-design` in a headless `codex exec` was observed on codex-cli 0.166.0, 2026-11-03.

**Name `test-harness` in builds that run tests or the gate.** Extend the installed-pack check above: `ai-shipping@product-engineering` must be installed and enabled. If absent, add it from that marketplace before dispatch. A Windows builder had only `app-stack` and `agent-harness` installed; naming a skill in prose did not make it load (observed `2026-11-16`).

**Budget real-database integration tests in the build brief.** Include the session agent's integration-fix pass when the sandbox cannot run them. Apply `test-harness`'s round-trip budget (§ Tests and docs are part of the change). State the target's measured latency and which checks the session agent runs.

## Follow-up turns

**Keep follow-ups conversational and continue the same thread.** Push back on a specific choice or ask what the partner missed. Keep the original goal as the context for each reaction.

```bash
python <skill dir>/scripts/codex.py "<your reaction>"
```

A plain call resumes the recorded session for this directory when its id and sandbox are known.

## Resume or start fresh

**Continue by default and choose fresh sessions deliberately.** A build round either continues a session or starts one.

- **Within a stage, resume.** Follow-up rounds fixing review findings or finishing the same work continue the session that built it. The wrapper resumes per directory, so this is the default in the stage's worktree.
- **A new stage or a new area starts fresh, with `--new`.** Project knowledge belongs in docs and the stage's brief, not an old thread. Long threads carry replaced assumptions and fill their context window; a fresh start takes a few minutes of reading. If a fresh session would miss something, write it in the docs.
- **Parallel builds get a worktree, a session and a marker each.** One session can't drive two builds. The wrapper's marker is one file per user and holds one directory, so the second build overwrites the first's marker. The first build's next round then starts new, read-only unless `--sandbox` is passed. Use `CODEX_AGENTS_STATE=<a file per build>` on every call for each build.
- **An earlier session can still be resumed, by its id: `--session <id>`.** Sessions stay in `~/.codex/sessions/<yyyy>/<mm>/<dd>/`, one `rollout-<time>-<id>.jsonl` each. Its first line names `cwd`, and the wrapper prints each run's id. Use that session's `--cwd`, plus `--model` if it used something other than the config default and `--sandbox` if it writes. The wrapper re-sends them only when the marker names that session (§ Session continuity). Explicit resume fails rather than starting new. Once Codex opens it, even if the turn fails, the marker names it. A plain call can continue it once the sandbox is recorded.
- **A usage limit makes the builder unavailable, as a missing CLI does.** Codex answers "You've hit your usage limit … try again at <time>" and exits at once. Wait when reset is near; otherwise the session agent builds the stage itself, treating 90 minutes away as too long. Independent review still applies. The marker keeps the stage's session through failure, so the next call after reset continues it.

## Reviewer

**Apply `independent-review` for round scope, brief, triage and stopping.** Run its wrapper with the confirmed `--model` and `--reviewer codex` when selecting Codex explicitly. For a manual fallback, open `references/manual-review.md` before starting. Use a fresh session, verify successful subject reads and check isolation before accepting the round.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Codex argued at least one point you then changed or defended, and the run's header shows the session, model and sandbox you meant. Any diff it reported is on disk and was reviewed by someone else.

## Mechanics

**Use the script's absolute path and scope its session with `--cwd`.** This skill owns `<skill dir>/scripts/codex.py`, whether installed for the user or vendored into a repository. Its absolute path works from any working directory.

| Command | Effect |
|---|---|
| `codex.py "<msg>"` | Resume the recorded session here, start new if none is here, or refuse automatic resume if the marker lacks the id or sandbox |
| `codex.py --new "<msg>"` | Force new session |
| `codex.py --session ID "<msg>"` | Resume the session with that id (§ Resume or start fresh) |
| `codex.py --read FILE` | Read message body from FILE (`-` for stdin) |
| `codex.py --status` | Show whether a session is active and how long since last call |
| `codex.py --reset` | Clear the session marker (next call starts fresh) |

### Flags

| Flag | Default | Notes |
|---|---|---|
| `--new` | off | Force new session even if one is stored |
| `--session ID` | — | Resume that session in `--cwd`, with no fallback to a new one. The model and sandbox come from `--model` and `--sandbox`, or from the marker when it names this session; otherwise both are the config's. |
| `--read FILE` | — | Read message body from FILE (`-` for stdin). Use for long context-rich openings. |
| `--model MODEL` | codex's configured default | Pass the confirmed model when it differs from the config default. The wrapper re-sends that model only for this session's resumes. |
| `--effort LEVEL` | `xhigh`, on every turn | `low` / `medium` / `high` / `xhigh`, sent as `-c model_reasoning_effort=…`. |
| `--sandbox MODE` | `read-only` for a new session | `read-only` / `workspace-write`. Remembered for the session and re-sent on every resume as `-c sandbox_mode=…`; passing it on a resume changes it. |
| `--cwd DIR` | current directory | Directory the codex run happens in. Required to drive a repo other than the one the caller is sitting in, and it also scopes session continuity (below). Fails loudly if `DIR` is not a directory. |
| `--raw` | off | Pass through raw codex output (default strips the codex header block) |

### Session continuity

**Resume the recorded id rather than whichever session ran most recently.** The marker at `~/.claude/.codex_agents_active`, overridden by `$CODEX_AGENTS_STATE`, records the active directory, model, sandbox and id. The wrapper uses `codex exec resume <id>` and continues until `--reset` or `--new`. `--last` instead takes the newest session Codex recorded in that directory, whoever started it, including a `--new` consult. `--all` lifts that directory scope (codex 0.159, checked 2026-10-22). If the marker for this directory lacks an id or sandbox, pass `--session <id>` with `--sandbox` when needed, or `--new`.

**The marker names the last session Codex opened, including failed runs.** Codex prints a session header only after opening it. A usage limit fails after the session takes the turn, so the marker keeps that session, including a newly opened one. It holds the brief and work so far; the next call continues it, while `--new` starts over. Resume falls back to a new session only when Codex couldn't open the old one: no rollout remains, so it fails without a header. Otherwise, a failed resume exits with its error rather than starting without the stage.

**Sessions are scoped to the working directory.** The per-user marker records its directory and resumes only when that matches; otherwise it starts fresh. Without that check, a second repository would resume a conversation the wrapper never had there. One marker holds one directory, so parallel builds need their own (§ Resume or start fresh). `--status` reports a session belonging to another directory. A legacy bare-timestamp marker predating `--cwd` counts as no session here, making the first run after this change new.

**A resume does not keep the session's model.** `codex exec resume` takes its model from `~/.codex/config.toml`, not the resumed session, and reports it only in the header. A session started with `--model` and resumed without it silently uses the config default. The wrapper records the starting model, re-sends `-m` on every resume and prints the reported model to stderr after each run. It warns when that differs from the request. Read that line before trusting a round. Direct `codex exec resume` calls must pass `-m <model> -c model_reasoning_effort=<level>` every time.

**A resume does not keep the session's sandbox either.** `codex exec resume` rejects `-s`, and without an override it runs on the config's `sandbox_mode`, read-only by default (observed `2026-11-17`, Codex CLI 0.169.0). The wrapper records the sandbox, re-sends it on every resume as `-c sandbox_mode="<mode>"`, prints the reported sandbox after each run, and warns when it differs. Direct resume calls pass `-c sandbox_mode="<mode>"` too. A marker without a sandbox cannot auto-resume. Name the session and sandbox explicitly to record both.

### Codex binary lookup

**Use the configured binary, installed CLI, then the extension bundle.** Automatic lookup tries these in order:

1. `$CODEX_BIN` when set to an existing path.
2. `codex` on PATH. For the npm package, use the native binary its shim runs so a long prompt never passes through `cmd.exe`.
3. The OpenAI ChatGPT VS Code extension bundle: `~/.vscode/extensions/openai.chatgpt-*/bin/<arch>/codex[.exe]`.

The installed CLI comes first because you install and update it; the extension ships its pinned build. This works on Windows and macOS, and on Linux if PATH or the extension provides the binary.

### Cost

**Check the signed-in account's plan and usage limits.** The wrapper uses the account signed into the Codex CLI through `codex login`. A ChatGPT subscription has no per-call API charge, making routine peer ideation cheap; check your own plan's limits.

### Why it works this way (gotchas captured)

- **Read the piped run's metadata from stderr and answer from stdout.** The header contains workdir, model, sandbox and session id (codex 0.159, observed 2026-10-22; the sandbox line on 0.169.0, `2026-11-17`). The wrapper reads model, sandbox and id, records the id for resume and prints the model and sandbox after each run. It strips a stdout header only when the block between two `----` lines is a header. An answer with two horizontal rules is never cut.
- **Pass `-s SANDBOX` only to new sessions, not `exec resume`.** It is an exec-level flag; a resume takes the sandbox as `-c sandbox_mode=…` instead. The wrapper separates new-session and resume paths accordingly. Outside a git repository, resume also needs `--skip-git-repo-check` (observed in a live scratch-folder wrapper test, 2026-10-21). Without it, Codex refuses with "Not inside a trusted directory" and the wrapper falls back to a new session. The conversation is lost, and only stderr says so. The wrapper adds this flag there and only there.
- **Close stdin so Codex does not wait for interactive input.** Use subprocess `input=""`.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-teams/skills/codex-agents).
