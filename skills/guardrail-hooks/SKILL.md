---
name: guardrail-hooks
description: 'An agent keeps breaking a rule (''it did it again'', ''make this impossible'', ''add a hook'', ''my hook didn''t fire''): make it a hook, permission rule or script.'
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

# Guardrail hooks — rules held by code

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

An agent keeps breaking a rule ('it did it again', 'make this impossible', 'add a hook', 'my hook didn't fire'): make it a hook, permission rule or script.


**Make rules that depend on memory at decisive moments into code paths.** Prose loses that contest to everything else the agent has read. Apply the `agent-instructions` skill for the principle, evidence and test question in its prose-vs-code reference. This skill covers choosing the code path, writing a hook without noise, and two hooks to adapt.

## Pick the smallest code path that holds the rule

**Choose the smallest code path that holds the rule.** A permission rule beats a hook. A refusal inside your own tool beats both, because it holds for every agent and every human running it.

| The rule is about | Hold it with | Example |
|---|---|---|
| a command the agent may run, recognisable by its prefix | a permission rule in settings: `permissions.ask: ["Bash(gh repo delete *)"]`, or `permissions.deny` | checked against every subcommand, inside `$()` and loop bodies too, and still prompts in auto mode (read `2026-10-24`). No script to maintain |
| what a command does when its text alone can't tell: code in a heredoc, a script it runs, the value of an argument | a PreToolUse hook | `scripts/guard_one_way_doors.py`, `scripts/block_wrong_identity.py` |
| how your own tool may be used | a required argument, or a refusal inside the tool | a search-analytics tool: pulls paginate and write a manifest of the exact window, and the report refuses to run without one |
| what a commit may contain | a git pre-commit hook in the repository, switched on per clone (`git config core.hooksPath .githooks`, set by a session-start hook) | refusing a commit that empties or halves a bookkeeping file |
| what must be true before the agent says it is done | a Stop hook returning `decision: "block"` with the reason | tests ran; the release log has every step |
| what the agent must know when it starts | a SessionStart hook returning `additionalContext` | git state checked by code: a shallow clone deepened before any ancestry check; a warning when the session started on a machine-named branch |
| a derived file that must track its source | a PostToolUse hook that runs the sync | a one-way mirror of the skills folder for agents that read another path, re-synced on every write; it always exits 0 so a sync hiccup never blocks a tool |

**For instruction-file rules held by code, state enforcement and its limits.** For example: “Bash is held by a hook; MCP tools and browser clicks are not covered, so the rule still binds there”.

## Writing a guard that holds without becoming noise

Each rule came from a receipt.

1. **Gate only what the owner would actually want to click for.** Asking too often trains a reflexive yes, which is worse than no guard. The one-way-door guard here gates public deletes and publishes.
2. **Match what runs, not what is mentioned.** Cut heredoc bodies out before matching command rules: text written to a file is not a command. Inside code, match the API call (`.delete_post(`), never a CLI string a docstring might quote. `scripts/block_wrong_identity.py` matches per command segment and only on `commit` for `--author`. It allows `git log --author=<address>` and tests whose JSON merely contains the address.
3. **Look inside what the command runs.** A command-text guard is blind to `python cleanup.py`. Open local scripts the command runs, and heredoc bodies fed to an interpreter, and scan them with the code rules. A delete can be callable from any inline script.
4. **Choose the verdict on purpose.** `ask` forces a human prompt even in auto mode, and denies in non-interactive runs where nobody can answer. `deny` refuses and tells the agent why. Exit 2 refuses and is the one form Claude Code, Codex and Cursor all honor. Address the agent in the reason too: “Agent: never approve this on the owner's behalf”. A prompt it can talk the owner through is a formality.
5. **The go for a one-way door is typed in the conversation, never on a side page.** Approval on a decisions page, doc or ticket arrives as a tool result, which the harness check does not read. Claude Code's auto-mode classifier sees user messages and agent tool calls, with tool results stripped so file or page content cannot steer it (permission-modes docs, read `2026-10-25`). A message clears a block only when it names the action and its specifics, such as the branch of a force push (permission-modes docs, read `2026-10-25`). The verb alone is insufficient. A prompt forced by an ask rule or hook needs the click whatever was said. If the owner answered on a side page, ask for the go in conversation, naming the action and target.
6. **Never block the way out.** A spend fuse exempts its own management commands, so disarming works when the session is over budget. A guard blocking the command that clears it has to be removed by hand.
7. **Decide which way it fails.** By default, a hook that cannot start, crashes, exits 1 or times out lets the action through. For policy hooks, set `"onFailure": "block"` (Claude Code 2.1.295 or later) and use exit 2, never 1, to block. Watch the first run for a `hook error` notice. A mistyped settings path means the hook never runs and nothing else says so.
8. **Keep stdout to one JSON object.** Anything else, such as a shell profile's greeting, makes the decision unreadable. An unreadable decision is a non-blocking error.
9. **Test it like a program, before wiring it.** A command hook reads JSON on stdin and answers with an exit code and stdout. Pipe in samples that must trigger and look-alikes that must not. `scripts/test_hooks.py` does this, testing the guards in its own folder: run the copy beside the hooks you installed, and replace its cases when you replace the rules.
10. **Know what a hook can't see.** `PreToolUse` fires on tool calls only, not files the user `@`-mentions. A `Bash` matcher doesn't cover an MCP tool or browser doing the same thing. Codex's docs say some tool paths opt out of hooks entirely. A hook is a guardrail, not a sandbox.
11. **To stop a run, use `Stop`.** `continue: false` from a `Stop` hook stops the agent and takes precedence over event-specific “continue” decisions. This lets a spend fuse beat `/goal`, itself a Stop hook (precedence confirmed in docs, read `2026-10-24`). A blocking `Stop` hook must check `stop_hook_active`; Claude Code ends the turn after 8 consecutive continuations anyway.
12. **Start a new blocking hook in observe mode when what it stops can be undone.** A gate on a commit or a finish can misfire on ordinary work. Observing, it logs what it would have decided and lets the call through. Log to a file the rule's name and the time, never the command or the matched text: either can carry a secret. An observing `Stop` hook exits 0 and prints nothing: a decision or `additionalContext` keeps the agent working. Read the log over a few sessions, fix what misfired, then enforce. A one-way door asks from day one: observing would let the action through, and a needless ask costs a click.

## The scripts

**The scripts use standard-library Python and read and write UTF-8 explicitly.** On Windows, Python otherwise decodes the pipe with the ANSI code page. Configure them in a top-level `CONFIG` block, a JSON file or environment variables. They read `tool_input.command` for Claude Code and Codex, or top-level `command` for Cursor's `beforeShellExecution`.

**Block an address that must never author a commit, and still allow searching for it.**

| File | Does | Configure |
|---|---|---|
| `scripts/guard_one_way_doors.py` | asks (or denies, or exits 2) before an irreversible or public action: command rules on what the shell runs with heredocs cut out; code rules inside heredoc bodies and local scripts the command runs by path (`python cleanup.py`); it does not see, among others, `python -c` or `node -e` code, a script run after a `cd`, `./script`, `python -m`, `uv run x.py`, piped code or a path with spaces, so a delete reached that way runs unasked; it always answers `true guard-canary` | `command_rules`, `code_rules`, `skip_scripts`, `mode` in `CONFIG`; or `--config <file>` / `ONE_WAY_DOORS_CONFIG` (keys replace CONFIG's); `ONE_WAY_DOORS_MODE=ask\|deny\|block` |
| `scripts/block_wrong_identity.py` | exits 2 when a forbidden address is set as a git identity (`user.email`, `-c user.email=`, `GIT_AUTHOR_EMAIL=` and friends) or passed as a commit's `--author`; searching for it is allowed | `blocked_emails` in `CONFIG`, or `BLOCKED_GIT_EMAILS=a@x,b@y`; `GIT_IDENTITY_HINT` for what to use instead |
| `scripts/test_hooks.py` | pipes sample payloads into both and checks exit codes and decisions: the triggers, the look-alikes, each mode, a config file, a Git Bash `/c/` path and a non-ASCII rule | replace the cases with yours |

Install for Claude Code:

1. **Copy the scripts into the project or your machine's hooks directory.** Use `.claude/hooks/` for one project, committed, or `~/.claude/hooks/` for every project on your machine; cloud sessions don't read it.
2. **Replace the example rules and look-alikes, then run the tests until passing.** Edit the copies to use your own one-way doors and expected look-alikes. To hold `-c`/`-e` and echoed code too, also list a code rule's pattern under `command_rules`; it then asks when a command only names the call, such as a grep for it. Run `python .claude/hooks/test_hooks.py`, or `python ~/.claude/hooks/test_hooks.py` for a machine-wide install.
3. **Wire the hooks in the settings file next to them.** Exec form (`args`) passes the path as one argument with no shell to mangle it:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "python",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/block_wrong_identity.py"], "onFailure": "block" },
          { "type": "command", "command": "python",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard_one_way_doors.py"], "onFailure": "block" }
        ]
      }
    ]
  }
}
```

   In `~/.claude/settings.json`, give the absolute path with forward slashes; there is no project directory. Use `python3` where `python` is Python 2 or missing.
4. **Check both hooks in `/hooks`, then run the canaries.** Ask the agent to run `true guard-canary`, then `true user.email=<an address you blocked>`. `true` does nothing, so nothing runs whether or not the hooks are wired. The one-way-door guard answers its canary whatever its rules: a prompt labelled `[settings]` (ask mode) or a refusal naming the canary (deny or block mode) means it fired; decline the prompt. The identity hook refuses the second by its text, which also proves it holds an address. Anything else means that hook is not wired, or, for the identity hook, has no address. **Never test a guard with a real one-way door:** when the hook is not wired, it runs.

**Use block mode and trust each Codex hook after every edit.** Wire the same scripts in `.codex/hooks.json` and set `mode` to `block`. Codex parses `ask` but doesn't support it yet: it marks the run failed and lets the call through (read `2026-10-24`). Trust each hook in `/hooks`, then again after every edit.

**Register Cursor hooks on `beforeShellExecution` in block mode.** Or adapt the output to its `{"permission": ...}` shape. Read `references/hook-contract.md` for details.

## On Windows

**Shell-form hooks run through Git Bash, which eats backslashes.** Use forward slashes or exec form.

- **Normalize backslashes in `tool_input` paths before matching segments.** They arrive with backslashes even under Git Bash. Use `path.replace("\\", "/")` before matching a segment such as `/src/`, or the check silently never matches.
- **Without Git Bash, shell-form hooks run in PowerShell.** Several cases failed open until recently. The changelog lists fixes in 2.1.299, 2.1.309 and 2.1.310 (read `2026-10-24`); run a current version and set `onFailure`.
- **Python hook output is in the ANSI code page unless you say otherwise.** The scripts here reconfigure stdout and stderr to UTF-8 and decode stdin as UTF-8. This behaviour was observed on Python 3.13 on Windows 11, `2026-10-24`.
- **Apply the `windows-agent-shell` skill for the remaining Windows traps.**

## Re-verify

**Recheck vendor facts before relying on them, or every few months.** Every vendor fact here is dated; hooks change monthly.

1. **Read Claude Code's current hook contract and correct its recorded dates.** Run `claude --version`, then read `https://code.claude.com/docs/en/hooks.md` (append `.md` for the raw page). Check exit codes, `permissionDecision` values, `onFailure` and Windows notes. Correct `references/hook-contract.md` and its dates.
2. **Check whether Codex now supports `ask` before keeping its block advice.** Read `https://developers.openai.com/codex/hooks`; if supported, the guard's `block` advice for Codex can go.
3. **Check Cursor's events enforcing `ask` and their input shape.** Read `https://cursor.com/docs/agent/hooks`.
4. **Run the tests, then the canary in a real session.** Run the installed copy (`python .claude/hooks/test_hooks.py`, or `python ~/.claude/hooks/test_hooks.py` machine-wide), then both canaries, as Install step 4 does. A test proves the script; only the live canaries prove the wiring.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The hook asks or blocks on a sample that must trigger and stays silent on look-alikes. The debug log shows it fired on the canaries in a real session.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/hook-contract.md` | Claude Code's hook contract (locations, matchers, exec vs shell form, stdin, exit codes, JSON decisions, failure modes, debugging) and how Codex and Cursor differ, each dated | writing or debugging any hook |
| `scripts/guard_one_way_doors.py` | the one-way-door guard template | gating irreversible or public actions |
| `scripts/block_wrong_identity.py` | the commit-identity guard template | an agent sees an address it must never commit as |
| `scripts/test_hooks.py` | the hooks' test runner; run the copy beside the installed hooks | after every edit to a hook or its rules |

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/guardrail-hooks).
