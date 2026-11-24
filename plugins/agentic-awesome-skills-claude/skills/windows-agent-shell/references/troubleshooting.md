# Version-specific Windows shell troubleshooting

Use the workarounds below only if the harmless probe still reproduces the issue on the installed CLI. Retest the specific shell behavior you depend on. The Commit messages section is in `SKILL.md`.

## Claude Code auto mode on Windows Git Bash: version-specific, with an expiry

**The rule under the cheat sheet: the analyser must never have to infer anything.** Every path, directory and write target appears literally in the command. Retest before carrying these workarounds to a newer version.

Auto mode became native Windows' default in 2.1.233; 2.1.232 added a Windows-only static analyser for Git Bash commands. From observed `2026-08-14`, ordinary read-only commands stopped for a manual click. The analyser ran after permission decisions and downgraded allow to ask; neither `permissions.allow` nor an `autoMode` entry could clear it.

Two upstream issues were closed on `2026-08-20` as fixed in 2.1.233. Its changelog says `cd <dir> && <command> > file` no longer stops. The 2.1.232 changes for Cygwin-style symlinks and `< file` were reverted. Measured on 2.1.233, `2026-08-16`, chains without a redirect still prompted. This cheat sheet was measured on 2.1.232/2.1.233, `2026-08-16`:

| Don't | Do instead |
|---|---|
| `cd <dir> && <cmd>` | absolute paths, or the tool's own directory flag (below) |
| `S="<path>"; ... > "$S/out.log"` | the literal path inline |
| a loop writing `"$S/f$i.log"` | the loop in a script, invoked by its literal path |
| `(`, `)` or `=` inside quoted prose (`echo "=== check (x) ==="`) | plain words |
| a heredoc (`git commit -F - <<'EOF'`) | the text in a file, passed by path (§ Commit messages) |
| backslashed paths | forward slashes |
| one command naming more than 8 paths, or over ~10,000 characters | several calls; long briefs in a file |
| `grep`, `cat`, `ls` through Bash | the agent's own search, glob and read tools, which skip the analyser |

**Keep independent steps separate and use one command per call.** Use `;` instead of `&&` when steps are independent. Every extra `&&`, pipe, glob and quoted regex raised the odds.

**Use directory flags for commands resolving configuration from their working directory.** Use `npm --prefix <dir> run <script>`, `git -C <dir>`, `node <absolute script path>`, and `--cwd <dir>` for delegate CLIs. `npm --prefix` was verified to set the script's own working directory and survive nested `npm run`. A standalone `cd` leaving the session's project root was bounced next call with `Shell cwd was reset to ...` (observed `2026-08-16`).

**Move loops into scripts without concealing safety-relevant flags from the classifier.** A script is fine for moving a loop out of the command. Never use it to hide a safety-relevant flag. It stays on disk and gets read.

**Retest the cheat sheet and delete workarounds whose cause is gone.** In an auto-mode Windows 11 session on 2.1.310 (observed `2026-10-24`), compound commands and heredocs ran without stopping. These included `cd <dir> && ls && git log ...`, `mkdir ... && cd ... && curl -o <file> ...`, and heredocs fed to `python -`. The intervening changelog has heredoc and compound-command fixes in several releases.

Run `cd <dir> && sed -n '1,5p' <file>` in auto mode on your version. If clean, drop the workaround half: keeping it past its cause uglifies commands for nothing. Keep directory flags, briefs in a file, and dedicated read and search tools regardless; they are correct for other reasons. `--cwd` keeps a delegate from working in, or resuming a thread from, the wrong repository.

## Re-verify

**Retest each version-specific fact and replace any line whose behaviour changed.** Correct its date too. Delete a workaround whose cause is gone rather than keeping it beside the new fact.

| Fact | Observed | Re-test |
|---|---|---|
| auto-mode analyser stops `cd && cmd`, heredocs, variables | observed on 2.1.232/2.1.233, `2026-08-16`; not stopping on 2.1.310, observed `2026-10-24` | in auto mode on your version: `cd <dir> && sed -n '1,5p' <file>`, then a heredoc |
| Git Bash converts `/path` arguments | observed on Git 2.49.0, gh 2.100.0, `2026-10-24` | `python <skill dir>/scripts/probe_argv.py /x` |
| PowerShell splits bare `-c.a.b=c` | observed on PowerShell 7, `2026-08-24`; 5.1.26100, observed `2026-10-24` | `probe_argv.py -c.a.b=c` from each PowerShell |
| PS 5.1 `Get-Content` reads ANSI; `Set-Content -Encoding utf8` adds a BOM | observed on 5.1, `2026-07-31`; 5.1.26100, observed `2026-10-24` | round-trip a UTF-8 file, then `check_text.py` on it |
| PS 5.1 redirected native stderr is terminating under `Stop` | observed `2026-08-17`; 5.1.26100, observed `2026-10-24` | a native call that warns on stderr, with `2>&1` |
| PowerShell deletes an env var set to `""` | observed on 5.1.26100, `2026-10-25` | `$env:X = "x"; $env:X = ""; Test-Path Env:X` |
| Python pipes use the ANSI code page | observed on Python 3.13.1, `2026-10-24` | `python -c "import sys; print(sys.stdout.encoding)" \| cat` |
| PowerShell tool caps a call at 10 minutes | observed `2026-09-25` | the tools reference, or a long `Start-Sleep` |
| Bash tool falls back to PowerShell without Git Bash; PowerShell primary when enabled | 2.1.120, 2.1.126 (changelog, read `2026-10-24`) | the changelog |
| `mv -n` exit code: GNU 9.2+ exits 1, Git Bash exits 0 | observed `2026-09-25` | `mv -n a b` where `b` exists, `echo $?`, on each machine |
