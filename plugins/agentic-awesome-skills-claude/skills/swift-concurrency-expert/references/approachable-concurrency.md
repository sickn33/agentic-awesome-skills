## Approachable Concurrency (Swift 6.2) - project mode quick guide

Use this reference when the project has opted into the Swift 6.2 approachable
concurrency settings (default actor isolation / main-actor-by-default).

## Detect the mode

Check Xcode build settings under "Swift Compiler - Concurrency":
- Swift compiler version (6.2+) and language mode (Swift 5/6 are distinct from compiler versions).
- Default actor isolation / Main Actor by default.
- Strict concurrency checking level (Complete/Targeted/Minimal).

For SwiftPM, inspect Package.swift swiftSettings for the same flags.

## Behavior changes to expect

- Async functions stay on the caller's actor by default; they don't hop to a
  global concurrent executor unless the implementation chooses to.
- Main-actor-by-default reduces data race errors for UI-bound code and global
  state, because mutable state is implicitly protected.
- Protocol conformances can be isolated (e.g., `extension Foo: @MainActor Bar`).

## How to apply fixes in this mode

- Prefer minimal annotations; let main-actor-by-default do the work when the
  code is UI-bound.
- Use isolated conformances instead of forcing `nonisolated` workarounds.
- Keep global or shared mutable state on the main actor unless there is a clear
  performance need to offload it.

## When to opt out or offload work

- Use `@concurrent` on async functions that must run on the concurrent pool.
- Make types or members `nonisolated` only when they are truly thread-safe and
  used off the main actor.
- Continue to respect Sendable boundaries when values cross actors or tasks.

## Common pitfalls

- `Task.detached` ignores inherited actor context; avoid it unless you truly
  need to break isolation.
- Main-actor-by-default can hide performance issues if CPU-heavy work stays on
  the main actor; move that work into `@concurrent` async functions.

## Keywords (from source cheat sheet)

| Keyword | What it does |
| --- | --- |
| `async` | Function can pause |
| `await` | Pause here until done |
| `Task { }` | Start async work, inherits context |
| `Task.detached { }` | Start async work, no inherited context |
| `@MainActor` | Runs on main thread |
| `actor` | Type with isolated mutable state |
| `nonisolated` | Opts out of actor isolation |
| `Sendable` | Safe to pass between isolation domains |
| `@concurrent` | Run on the generic executor, not a guaranteed dedicated thread (Swift 6.2+) |
| `async let` | Start parallel work |
| `TaskGroup` | Dynamic parallel work |

## Primary language references

- https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md
- https://github.com/swiftlang/swift-evolution/blob/main/proposals/0470-isolated-conformances.md

Caller isolation and main-actor default are separate opt-in settings; inspect
NonisolatedNonsendingByDefault/default-isolation settings rather than inferring
behavior from the compiler version alone. `await` may suspend, not necessarily.

## Original community reference

https://fuckingapproachableswiftconcurrency.com/en/
