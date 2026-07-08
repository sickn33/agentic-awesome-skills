---
name: debugging-code
description: Interactively debug source code — set breakpoints, step through execution line by line, inspect live variable state, evaluate expressions against the running program, and navigate the call stack to trace root causes. Use when a program crashes, raises unexpected exceptions, produces...
risk: unknown
source: https://github.com/AlmogBaku/debug-skill/tree/master/skills/debugging-code
source_repo: AlmogBaku/debug-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/AlmogBaku/debug-skill/blob/master/LICENSE
---

# Interactive Debugger
## When to Use

Use this skill when you need interactively debug source code — set breakpoints, step through execution line by line, inspect live variable state, evaluate expressions against the running program, and navigate the call stack to trace root causes. Use when a program crashes, raises unexpected exceptions, produces...


Use when a program crashes, produces wrong output, or you need to understand exactly
how execution reached a particular state — and running it again with more print statements
won't give you the answer fast enough.

You can pause a running program at any point, read live variable values and the call stack
at that exact moment, step forward line by line or jump to the next breakpoint, and
evaluate arbitrary expressions against the live process — all without restarting.

## Setup

This skill uses `dap`, a CLI tool that background daemon to interact with the debugger via the DAP Protocol, maintain
the debugger state, so you can simply interact with it with multiple calls.

If `dap` isn't installed (check: `command -v dap`), install it NOW.
Ask/notify the user before proceeding to install it.

From Homebrew (macOS)

```bash
brew install AlmogBaku/tap/dap
```

Installer script:

```bash
bash scripts/install-dap.sh
```

Install from sources:

```bash
go install github.com/AlmogBaku/debug-skill/cmd/dap@latest
```

This tool is open-sourced and available on [GitHub](https://github.com/AlmogBaku/debug-skill), maintained and follows
best practices.

Supports natively Python, Go, Node.js/TypeScript, Rust, C/C++, and any other language that supports DAP.

If a debugger backend is missing or fails to start, see `references/installing-debuggers.md`

For all commands and flags: `dap --help` or `dap <cmd> --help`.

## Starting a Session

`dap debug <file>` launches the program under the debugger. Backend is auto-detected from the file extension.

Choose your starting strategy based on what you know:

- **Have a hypothesis** — set a breakpoint where you expect the bug: `dap debug script.py --break script.py:42`
- **Conditional breakpoint** — only stop when a condition is met: `dap debug script.py --break "script.py:42:x > 5"` (
  always quote specs with conditions)
- **Multi-file app** — breakpoints across modules: `--break src/api/routes.py:55 --break src/models/user.py:30`
- **No hypothesis, small program** — walk from entry: `dap debug script.py --stop-on-entry` (avoid for large projects —
  startup code is noisy; bisect with breakpoints instead)
- **Exception, location unknown** — `dap debug script.py --break-on-exception raised` (Python) / `all` (Go/JS)
- **Remote process** — `dap debug --attach host:port --backend <name>`
- **Process already running (stuck server, live issue)** — attach without restarting:
  `dap debug --pid <PID> --backend <name>`
  > **macOS + Go gotcha:** `dlv --pid` requires SIP disabled (`csrutil disable`).
  > Prefer starting the program under the debugger instead or attaching to a remote debugger!

**Session isolation:** `--session <name>` keeps concurrent agents from interfering.
Tip: You might want to use your session id(${CLAUDE_SESSION_ID}) if available.

Run `dap debug --help` for all flags, backends, and examples.

## The Debugging Mindset

Reach for a debugger when reading source alone can't validate the root cause.
A debugger lets you *observe* what *does* happen: actual values, actual path, actual state.
When that diverges from what *should* happen, you've found your bug.

**Two strikes, rethink.** If two hypotheses fail at the same location, your mental model is wrong.
Re-read the code, form a *completely different* theory with different breakpoints.

**Escalate gradually.** Start with `dap eval` to test a quick hypothesis. Use conditional breakpoints
to filter noise. Fall back to full breakpoints + stepping only when you need interactive control.

**Mimic the user journey.** If you're debugging a user flow, set breakpoints along the path you expect the code to take.
If you expected `compute()` to be called, but it never is, then the bug is in the caller — not `compute()`, but whatever
was supposed to call it.

**Set breakpoints instead of prints.** When you feel the urge to print something, set a breakpoint instead.

## Know Your State

Every `dap` execution command returns full context automatically: current location, source, locals, call stack, and
output. At each stop, ask:

- Do the local variables have the values I expected?
- Is the call stack showing the code path I expected?
- Does the output so far reveal anything unexpected?

**Trace causation up the stack.** If a value is wrong at frame 0, check `dap eval "<expr>" --frame 1` to see what the
caller passed. Keep going up (`--frame 2`, `--frame 3`) until you find the frame where the value first became wrong —
that's the origin of the bug, not the symptom.

Example output at a stop:

```
Stopped at compute() · script.py:41
  39:   def compute(items):
  40:       result = None
> 41:       return result
Locals: items=[]  result=None
Stack:  main [script.py:10] → compute [script.py:41]
Output: (none)
```

If the program exits before hitting your breakpoint:

```
Program terminated · Exit code: 1
```

→ Move breakpoints earlier, or restart with `--stop-on-entry`.

## Forming a Hypothesis

Before setting a breakpoint: *"I believe the bug is in X because Y."* A good hypothesis is falsifiable — your next
observation will confirm or disprove it. No hypothesis yet? Bisect with two breakpoints to narrow the search space, or
see starting strategies above.

## Setting Breakpoints Strategically

- Set where the problem *begins*, not where it *manifests*
- Exception at line 80? Root cause is upstream — start earlier
- Uncertain? Bisect: `--break f:20 --break f:60` — wrong state before or after halves the search space

**Where to break:**

- **Boundaries** — where data crosses a format, representation, or module boundary; state is cleanest here
- **State transitions** — the line that assigns or mutates the corrupted value
- **Wrong branch** — the condition whose inputs led to the bad path
- **Antipatterns** — don't break inside library code; break at the call site instead. Don't use unconditional breaks in
  tight loops — use conditions.

### Managing Breakpoints Mid-Session

As you learn more, add breakpoints deeper in the suspect code and remove ones that have
served their purpose — progressive narrowing without restarting:

```bash
dap continue --break app.py:50              # add breakpoint deeper, then continue
dap continue --remove-break app.py:20       # drop a breakpoint you're done with
dap break add app.py:42 app.py:60           # add multiple breakpoints at once
dap break list                              # see what's set
dap break clear                             # start fresh
```

If a breakpoint is on an invalid line or the adapter adjusts it, `dap` warns you in the output.

### Conditional Breakpoints

Stop only when a condition is true — essential for loops, hot paths, and specific input values.
Syntax: `"file:line:condition"` (always quote).

```bash
dap debug app.py --break "app.py:42:i == 100"            # skip 99 iterations, stop on the one that matters
dap debug app.py --break "app.py:30:user_id == 123"      # reproduce a user-specific bug
dap continue --break "app.py:50:len(items) == 0"         # catch the empty-list case mid-session
```

### Invariant Breakpoints

Conditional breakpoints as runtime assertions — stop the *moment* something goes wrong:

```bash
dap debug app.py --break "bank.py:68:balance < 0"          # catch the overdraft
dap debug app.py --break "pipe.py:30:type(val) != int"     # type violation
```

## Navigating Execution

At each stop, choose how to advance based on what you suspect:

If you're stepping more than 3 times in a row, you need a breakpoint, not more steps.

```bash
dap step                         # step over — trust this call, advance to next line
dap step in                      # step into — suspect what's inside this function
dap step out                     # step out — you're in the wrong place, return to caller
dap continue                     # jump to next breakpoint
dap continue --to file:line      # run to line (temp breakpoint, auto-removed)
dap context                      # re-inspect current state without stepping
dap output                       # drain buffered stdout/stderr without full context
dap inspect <var> --depth N      # expand nested/complex objects
dap pause                        # interrupt a running/hanging program
dap restart                      # restart with same args and breakpoints
dap threads                      # list all threads
dap thread <id>                  # switch thread context
```

Each stop shows the current `file:line` so you always know where you are.

Use `dap eval "<expr>"` to probe live state without stepping:

```bash
dap eval "len(items)"
dap eval "user.profile.settings"
dap eval "expected == actual"       # test hypothesis on live state
dap eval "self.config" --frame 1    # frame 1 = caller (may be a different file)
```

Avoid eval expressions that call methods with side effects — they mutate program state and can corrupt your debugging
session. Stick to read-only access unless you're intentionally testing a fix.

## Skipping Ahead

When you need a quick look at a specific line without committing to a permanent breakpoint, use
`dap continue --to file:line`. It's a disposable breakpoint — stops once, then vanishes. Good for
"I just want to see what `x` looks like at line 50" without managing breakpoint lifecycle.

## Advanced Scenarios

For advanced scenarios — hangs, concurrency bugs, deeply nested state, loop bisection —
see `${CLAUDE_SKILL_DIR}/references/advanced-techniques.md`.

## Walkthrough

**Bug: `compute()` returns `None`**

```
Hypothesis: result not assigned before return
→ dap debug script.py --break script.py:41
  Locals: result=None, items=[]   ← wrong, and input is also empty

New hypothesis: caller passing empty list
→ dap eval "items" --frame 1      → []   ← confirmed
→ dap step out                    → caller at line 10, no guard for empty input
→ dap continue --break script.py:8 --remove-break script.py:41
  ← narrowing: add breakpoint at data source, drop the one we're done with
  Stopped at main():8, items loaded from config as []

Root cause: missing guard. Fix → dap stop.
```

**No hypothesis (exception, unknown location):**

```
Exception: TypeError, location unknown
→ dap debug script.py --break-on-exception raised
  Stopped at compute():41, items=None
Root cause: None passed where list expected.
```

## Verify Your Fix

While paused at the bug, use `eval` to test your proposed fix expression against the live state. If it
works in eval, it'll work in code. Then edit and `dap restart` to confirm end-to-end.

After applying a fix, re-run the same scenario to verify. `dap restart` re-runs with the same args and
breakpoints — a fast feedback loop. Don't trust that a fix works until you've observed the correct
behavior at the same breakpoint where you found the bug.

## Cleanup

The `dap` session is usually automatically terminated when the program exits or after an idle timout.
When the app is not closed properly (e.g. you killed it while debugging), you can terminate it manually: `dap stop`.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
