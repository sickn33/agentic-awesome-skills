# Advanced Debugging Techniques

## When the Program Hangs

When a program runs but never returns, that *is* information — something is stuck. Don't guess; interrupt
and observe.

```
Bug: program hangs (infinite loop or deadlock)

→ dap pause                         ← interrupt wherever it is (returns OK immediately)
  [the already-blocking debug/continue/step call returns auto-context: location + locals]
  Stopped at process() · worker.py:55, locals: i=99999
→ dap threads                       ← are other threads blocked too?
→ dap eval "lock.locked()"          ← test deadlock hypothesis
Root cause: lock never released. Fix → dap stop.
```

Check: is it one thread stuck (infinite loop, blocking I/O), or are multiple threads waiting on each
other (deadlock)? The location where `pause` stops is your first clue.

## Digging Into Complex State

When a variable is opaque or deeply nested, expand it: `dap inspect data --depth 2`.

## Concurrency Bugs

If state is wrong but the code path looks correct, consider: is another thread modifying state
concurrently?

**First move at any concurrent crash or hang:** run `dap threads`, then inspect every thread's stack with
`dap thread <id>` — the thread causing the problem is often not the one currently stopped.

- **Deadlock pattern**: two or more threads each waiting for a resource the other holds. Check thread
  states to confirm.
- **Race condition**: unexpected values that change between stops. Look for shared mutable state
  accessed without synchronization.

## Bisecting Loops (Wolf Fence)

A loop goes wrong at an unknown iteration. Binary search it:

```
dap debug app.py --break "app.py:45:i == 500"   # midpoint of 1000
→ dap eval "is_valid(result)"                    # True → bug is after 500
→ dap break add "app.py:45:i == 750"             # update the condition
→ dap restart                                    # restart preserving new breakpoint
```

~10 iterations to find the bug in 1000. Not 1000 step commands.
