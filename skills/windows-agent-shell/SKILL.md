---
name: windows-agent-shell
description: 'A coding agent on Windows: Git Bash path rewriting, PowerShell quoting and encoding, CRLF. Use when output comes back garbled, or it works here and breaks there.'
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

# Windows agent shell — traps, and the works-here-breaks-there class

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

A coding agent on Windows: Git Bash path rewriting, PowerShell quoting and encoding, CRLF. Use when output comes back garbled, or it works here and breaks there.


**When something works here and breaks there, suspect the environment you did not measure.** A Windows coding agent runs through Git Bash, PowerShell or cmd. Each splits arguments, expands characters, converts paths and decodes text differently. A command right in one can pass with a different meaning in another.

**Hold the invocation constant before attributing a change to configuration.** The shell, CLI version, path spelling and line endings are part of the invocation. Every version-specific line carries its version and observation date. Retest the specific behavior before relying on it (§ Re-verify).

## First, know which shell runs the command

- **Claude Code's Bash tool on Windows uses Git Bash when installed.** Git Bash is MSYS2. Without Git for Windows it uses PowerShell instead (2.1.120), and with the PowerShell tool enabled PowerShell becomes primary (2.1.126; changelog, read `2026-10-24`).
- **Shell-form hooks use Git Bash, or PowerShell when Git Bash is missing.** Cursor runs hook commands through PowerShell; Codex takes a separate `commandWindows`. Apply the `guardrail-hooks` skill for the hook side.
- **PowerShell 7 is a separate install and is often absent.** Windows PowerShell 5.1 (`powershell.exe`) ships with Windows; PowerShell 7 uses `pwsh`. A script or instruction saying `pwsh` fails where it is absent.
- **Measure the same arguments in the same shell, rather than reasoning.** Run `python <skill dir>/scripts/probe_argv.py <the same arguments>`. It prints exactly what the program receives and which encodings its pipes use.

## Paths

1. **Forward slashes, always, in anything a bash shell will read.** Bash treats `\` as an escape. Write `C:/Python313/python.exe`; Windows accepts it. Backslashes also fed Claude Code's Windows command analyser and caused permission prompts (observed `2026-08-16`).
2. **Uppercase the drive letter for any tool that takes its root from the working directory.** Use `C:/work/app` rather than `c:/work/app` with `npm --prefix`. On Vitest, a lowercase drive can give `No test suite found`, zero tests and exit 1 (observed `2026-08-22`). Keep the command shape constant when comparing runs: changed shapes can look like a worker-count cliff or a broken suite.
3. **Prevent Git Bash from rewriting leading-slash arguments passed to native programs.** It rewrites any argument starting with `/` into a Windows path before the program sees it. `gh api /repos/owner/name` fails with `invalid API endpoint: "C:/Program Files/Git/repos/owner/name"`. `--flag=/etc/x` arrives as `--flag=C:/Program Files/Git/etc/x` (verified and observed `2026-10-24`, Git 2.49.0, gh 2.100.0). Drop the leading slash (`gh api repos/owner/name`) or set `MSYS_NO_PATHCONV=1` for that command.
4. **Convert Git Bash's `/c/x` paths before Windows programs open them.** Git Bash spells `C:/x` as `/c/x`, which Windows programs can't open. Convert paths read from commands (`/c/x` → `C:/x`). Claude Code hook-input file paths arrive with backslashes even under Git Bash (docs, read `2026-10-24`); normalize before comparing.
5. **A generated file written with the host's separators must not be tracked.** Untrack it, don't commit one OS's copy. A sync-generated package manifest can use native separators that the other platform's compiler rejects as invalid escapes. The trap is tracking the generated file at all.
6. **A junction makes a delete reach somewhere else.** `npm --prefix <worktree> install` can create a package junction to another checkout when run from a checkout supplying a package the worktree depends on. Recursive deletion of `node_modules`, or `git worktree remove --force`, goes through that junction. Run installs with the target as the process's working directory. List `node_modules` for junctions before deleting; remove the junction itself first. `rmdir` on the link doesn't follow it. Then run `git worktree remove` without `--force`.

## Arguments and quoting

1. **Backticks inside `git commit -m "..."` are command substitution.** Backticked words execute and are replaced by their output, usually nothing, without warning. See § Commit messages for the safe spelling.
2. **PowerShell splits a bare `-c.foo=bar` token in two.** Windows PowerShell 5.1 does this too (reproduced and observed `2026-10-24`, 5.1.26100): `["-c", ".a.b=c"]` bare, `["-c.a.b=c"]` quoted. Quote it, and pin the quoted spelling with a test. A matrix can half-break and look finished: check the assets, not the run. A flag that has never been passed before has never been tested.
3. **Judge native PowerShell calls by `$LASTEXITCODE`, with stderr non-fatal around them.** Under `$ErrorActionPreference = "Stop"`, Windows PowerShell 5.1 turns redirected native stderr into a terminating error. Reproduced `2026-10-24` (5.1.26100): an exit-0 program writing one warning, called with `2>&1`, ended the script with `NativeCommandError`.
4. **In PowerShell, an environment variable set to an empty string is deleted.** `$env:DATABASE_URL = ""` removes it, so a loader such as dotenv fills it back in from `.env`; a supposedly database-free run reaches the configured database. Bash's `DATABASE_URL= cmd` passes an empty value instead (reproduced and observed `2026-10-25`, 5.1.26100). Set a single space when the code trims values to absent, or pass an explicit flag. When an attempt may have touched a real system, say so in the handoff.
5. **Long PowerShell scripts: launch them from the Bash tool.** Claude Code's PowerShell tool capped a call at 10 minutes (observed `2026-09-25`), which can kill a release between the tag and the installers. Use `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <script>` from the Bash tool with a long timeout. This has carried 16-minute runs without interruption.

## Encoding and line endings

1. **Never edit a UTF-8 file through Windows PowerShell 5.1's `Get-Content`.** It decodes with the ANSI code page. `(Get-Content f -Raw) -replace 'a','b' | Set-Content f -Encoding utf8` gives each `§` a stray `Â`. It turns every `—` into `â` `€` `”`; `-Encoding utf8` makes the write look safe, but the damage is on the read. Reproduced and observed `2026-10-24` (5.1.26100): the write also adds a UTF-8 BOM and trailing CRLF.
   - **Edit with the agent's own tool and pass CLI text as a file.** Use `--body-file` or `-F body=@file`, which reads bytes.
   - **Detect encoding damage and line endings with `check_text.py`.** Run `python <skill dir>/scripts/check_text.py <files>` to flag mojibake, BOM, CRLF and invalid UTF-8.
   - **Restore the last good version and redo the edit.** Use `git checkout <good-ref> -- <file>`. Don't reverse double encoding: CP1252's 0x80–0x9F range doesn't round-trip, so reversal loses characters.
2. **Configure Python's piped text as UTF-8 explicitly on Windows.** Python otherwise reads and writes pipes in locale-dependent `cp1250` or `cp1252`. `PYTHONUTF8=1` uses `utf-8` (observed `2026-10-24`, Python 3.13.1). In piped scripts, reconfigure stdout and stderr to UTF-8 and decode stdin as UTF-8 bytes, or set `PYTHONUTF8=1`.
3. **A tool or a delegate can rewrite line endings behind a clean diff.** `core.autocrlf` can normalize CRLF on commit while leaving the working tree wrong despite `.gitattributes` specifying `eol=lf`. Source-anchored tests can fail in a file the batch never touched, misleading a delegate into blaming the checkout.
   - **Check tracked working copies with `git ls-files --eol | grep w/crlf`.** It lists endings differing from the index. Use `check_text.py` for untracked files; `grep -c $'\r'` is not reliable under Git Bash.
   - **Fix CRLF with `check_text.py --fix-crlf <files>`, which changes nothing else.**

## Claude Code auto mode on Windows Git Bash

**Make each path, directory and write target literal for the analyser.** If an ordinary command stops for manual approval, try the harmless probe `cd <dir> && sed -n '1,5p' <file>`. If the problem still reproduces, open `references/troubleshooting.md` for the dated workaround table. Drop workarounds whose cause is gone.

**Use directory flags for commands resolving configuration from their working directory.** Use `npm --prefix <dir> run <script>`, `git -C <dir>`, `node <absolute script path>`, and `--cwd <dir>` for delegate CLIs. `npm --prefix` was verified to set the script's own working directory and survive nested `npm run`. A standalone `cd` leaving the session's project root was bounced next call with `Shell cwd was reset to ...` (observed `2026-08-16`).

**Move loops into scripts without concealing safety-relevant flags from the classifier.** A script is fine for moving a loop out of the command. Never use it to hide a safety-relevant flag. It stays on disk and gets read.

**Read auto-mode settings and denial reasons from their effective sources.** These facts are not Windows-specific (observed `2026-08-16`):

- **`autoMode` is read only from user settings, never project `.claude/settings*.json`.** Since 2.1.207, a checked-in repository cannot grant itself rules.
- **Include literal `"$defaults"` when extending an `autoMode` array.** Without it, the array replaces the built-in list. For `soft_deny`, that silently drops force-push and production-deploy protection. `claude auto-mode config` shows the result.
- **Read `/permissions` → Recently denied for a classifier block's real reason.** Since 2.1.208, the agent sees only `Blocked by classifier`.

## Commit messages and other text passed to a CLI

**Write CLI text to a file and pass it by path.** Use `git commit -F <file>`, `gh ... --body-file <file>`, or `gh api ... -F body=@<file>`. The shell expands nothing in the file, and an analyser has nothing to infer.

**Write text containing backslashes with the file tool.** Run scripts by path and pass other text by path. Skip heredocs even with a quoted delimiter, because the Windows Bash tool can strip an escape. See `test-harness` § Generated files in `references/rules-from-bugs.md` for the related test rule.

**Use a quoted heredoc for other text where your version accepts it.** The usual fix is `git commit -F -`, never `-m "..."`, because backticks execute and vanish silently (§ Arguments 1). A quoted delimiter (`<<'EOF'`) prevents shell expansion. Native Windows auto mode in Claude Code 2.1.232/2.1.233 read heredocs as “expansion obfuscation” and prompted (observed `2026-08-16`). On 2.1.310 (observed `2026-10-24`), they ran without stopping.

Never `-m` with backticks · never text that came through PowerShell 5.1's `Get-Content` (§ Encoding 1).

## Background servers

**Stop a Windows background server by its process ID or listening port.** Stopping the task can end only its shell wrapper. Find the server process, stop it, and check that the port is free before reporting it stopped.

## Works here, breaks there

**When you shell out to someone else's CLI, its version on the target machine is the contract.** Local tests and review can pass against tools different from the target's.

1. **Probe the target before building on a third-party binary.** Probe the real machine, not the dev box; one command costs a minute.
   - **Prefer the oldest surface that answers the question.** For example: `gh api user --jq .login`, which every plausible version has.
   - **Branch on the exit code, never on stdout.** An error can itself be JSON; treating it as success can report a user called `{`.
   - **Encode the older contract in the test fake.** Reject `--json` the way the old `gh auth status` version does.
2. **A new value on an existing message is not additive.** A new message type is additive: an old receiver doesn't recognise it and drops it. A new value on an existing field reaches the old handler's default branch. Read what it does with an unrecognised value: reject it (safe), map to a default, or half-handle it. The last two need a capability flag, exactly as a new type does.
3. **The dev box's tools are part of what a review can see.** Tell the reviewer when the target differs, and explicitly reproduce the target's behaviour in the test. GNU coreutils 9.2 and later exit 1 when `mv -n` declines to overwrite; Git Bash's `mv` exits 0 (observed `2026-09-25`).

## Re-verify

**Retest each version-specific fact and replace any line whose behaviour changed.** Correct its date and remove workarounds whose cause is gone. Open `references/troubleshooting.md` for the retest matrix.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A probe shows the program received the arguments, paths and text you meant. The command means the same thing in the shell that actually runs it.

## Files

| File | Does |
|---|---|
| `scripts/check_text.py` | flags mojibake (UTF-8 decoded as CP1252 or CP1250), a UTF-8 BOM, CRLF and invalid UTF-8 in files, directories or a repository's changed and untracked files (`--changed`); `--fix-crlf` normalises line endings and nothing else; `--self-test` checks the checker |
| `scripts/probe_argv.py` | prints the arguments a program actually received, its working directory and its pipe encodings, for measuring what a shell did to a command |
| `references/troubleshooting.md` | dated Git Bash auto-mode workarounds and retest commands for individual shell behaviours |

## Example

Launch a harmless argument probe with a workspace path containing spaces. Compare the received argv with the expected single path argument before running a file-writing command.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/windows-agent-shell).
