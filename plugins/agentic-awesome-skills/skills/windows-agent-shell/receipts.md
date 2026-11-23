# windows-agent-shell: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Write text containing backslashes with the file tool.

- `2026-11-18`, While working on a desktop tool that writes to an external system's API, Claude Code's Bash tool on Windows 11 used Git Bash to run `python -B - <<'EOF'`. A doubled backslash arrived single, so Python read `\b`, `\f` and `\a` as control characters. In one run, a backspace reached a production regex. No other environment was tried.

## Stop a Windows background server by its process ID or listening port.

- `2026-11-18`, On Windows, stopping a background task for a live Q&A product ended its shell wrapper. The server kept its port, and the restart failed because the port was in use.

## When something works here and breaks there, suspect the environment you did not measure.

- `Undated`: Most of the receipts below cost an hour or more because the failure looked like a code problem.

## PowerShell 7 is a separate install and is often absent.

- `2026-08-17`: a dev box had only 5.1, and still on `2026-10-24`.

## Forward slashes, always, in anything a bash shell will read.

- `2026-06-22`, the installer of burnstop, an open-source Claude Code plugin: a hook command written `C:\Python313\python.exe` ran as `C:Python313python.exe: command not found`, and every hook errored.

## Uppercase the drive letter for any tool that takes its root from the working directory.

- `2026-08-22`, a VS Code extension on Vitest: `npm --prefix "c:/work/app" test` reported 177 test files failed with "No test suite found", zero tests, exit 1; the identical command with `C:/work/app` passed 4,121 tests in 41 seconds. It fails loudly and asserts nothing, so it reads as a broken suite. An hour of bisecting worker counts "found" a cliff between 2 and 4 workers that did not exist: every passing run had used a different command shape than every failing one. An earlier session had written the suite down as broken on Windows; it never was.

## A generated file written with the host's separators must not be tracked.

- `2026-08-23`: A mobile project's package manifest is regenerated on every sync with the machine's native separators; the committed Windows copy held `..\..\node_modules\...`, and the other platform's compiler rejected `\.` and `\n` as invalid escapes, so the committed state had never built there.

## A junction makes a delete reach somewhere else.

- `2026-09-27`: `npm --prefix <worktree> install`, run while the shell's working directory was another repository whose package the worktree depended on, created `<worktree>/node_modules/<that package>` as a junction to that checkout.
- `Before 2026-08-20`: A recursive delete of that `node_modules`, or `git worktree remove --force`, goes through the junction; one already had, taking 577 of 979 packages.

## Backticks inside `git commit -m "..."` are command substitution.

- `2026-08-30`, recorded: a commit landed with the code names simply missing from its sentences.

## PowerShell splits a bare `-c.foo=bar` token in two.

- `2026-08-24`: A release build passed `-c.extraMetadata.name=value` to a desktop app's packager; on the Windows leg, PowerShell 7 delivered `-c` and `.extraMetadata.name=value`, the packager read `-c` as its config-file flag and died on a missing file, while macOS passed the token intact. Two lessons beyond the fix: a matrix can half-break and look finished (the release, the tag and both stores were green; the `.exe` simply wasn't attached; check the assets, not the run), and a flag that has never been passed before has never been tested.

## Judge native PowerShell calls by `$LASTEXITCODE`, with stderr non-fatal around them.

- `2026-08-17`: An install script aborted on its own success path because the packager printed a warning, and a script that installs into every editor stopped after the first.

## In PowerShell, an environment variable set to an empty string is deleted.

- `2026-10-23`: a delegated builder's "database-free" test run hit the configured database settings, and it could not say afterwards whether that attempt reached the database.

## Long PowerShell scripts: launch them from the Bash tool.

- `2026-09-25`: Claude Code's PowerShell tool capped a call at 10 minutes, too short for an hour-long release script that would be killed wherever it was, possibly between the tag and the installers.

## Never edit a UTF-8 file through Windows PowerShell 5.1's `Get-Content`.

- `2026-07-31`: It corrupted 111 characters in a project's instructions file that was committed, pushed and packaged into a published extension, caught only because a four-number change showed 132 changed lines. Reproduced `2026-10-24` (5.1.26100), which also showed the write adding a UTF-8 BOM and a trailing CRLF. The same session posted mojibake into a public issue via `gh issue close N --comment (Get-Content f.md -Raw)`.

## Configure Python's piped text as UTF-8 explicitly on Windows.

- `2026-10-24`: A hook's `§` reached Claude Code's transcript as `�` the same day.

## A tool or a delegate can rewrite line endings behind a clean diff.

- `2026-09-23`: Nine files came back from a delegated build entirely CRLF in a repository whose `.gitattributes` says `eol=lf`; `core.autocrlf` normalised them on commit, so the diff was clean (403 insertions, 243 deletions) and the working tree was not. Tests that anchor on source text failed with `expected -1 to be greater than 58555`, in a file the batch never touched, and the delegate blamed the checkout instead of its own writes.
- `2026-10-24`: `git ls-files --eol | grep w/crlf` found 19 such files in a freshly written skills repository.

## When you shell out to someone else's CLI, its version on the target machine is the contract.

- `2026-09-04`: A feature was built on `gh auth status --json hosts`, measured on the dev box's gh 2.98. The cloud machines it ran on had gh 2.79, from the hosting vendor's base image, where `auth status` has no `--json`. It passed every local test, the type check and the whole gate, and failed on the one surface the feature existed for; it was caught only because someone probed a real machine before accepting the work. The failing call printed a JSON error object, so a reader trusting stdout would have reported a user called `{`.

## A new value on an existing message is not additive.

- `2026-09-04`, caught by an independent review of a commit that called it "additive": a cancel message gained a new provider value, the installed receiver mapped the unknown value to its default provider, and Cancel either did nothing for fifteen minutes or cancelled a different sign-in.

## The dev box's tools are part of what a review can see.

- `2026-09-25`: An installer snippet passed locally and in review and failed on Linux CI: GNU coreutils 9.2 and later exit 1 when `mv -n` declines to overwrite, while Git Bash's `mv` exits 0. The reviewer had run it on the same Windows machine and inherited the old behaviour.
