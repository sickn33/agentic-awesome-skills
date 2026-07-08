---
name: swift-concurrency-expert
description: Review and fix Swift concurrency issues such as actor isolation and Sendable violations.
risk: safe
source: "Dimillian/Skills (MIT)"
date_added: "2026-03-25"
---

# Swift Concurrency Expert

## Overview

Review and fix Swift Concurrency issues in Swift 6.2+ codebases by applying actor isolation, Sendable safety, and modern concurrency patterns with minimal behavior changes.

## When to Use
- When the user asks to review Swift concurrency usage or fix compiler diagnostics.
- When you need guidance on actor isolation, `Sendable`, `@MainActor`, or async migration.

## Workflow

### 1. Triage the issue

- Capture the exact compiler diagnostics and the offending symbol(s).
- Check project concurrency settings: Swift language version (6.2+), strict concurrency level, and whether approachable concurrency (default actor isolation / main-actor-by-default) is enabled.
- Identify the current actor context (`@MainActor`, `actor`, `nonisolated`) and whether a default actor isolation mode is enabled.
- Confirm whether the code is UI-bound or intended to run off the main actor.

### 2. Apply the smallest safe fix

Prefer edits that preserve existing behavior while satisfying data-race safety.

Common fixes:
- **UI-bound types**: annotate the type or relevant members with `@MainActor`.
- **Protocol conformance on main actor types**: make the conformance isolated (e.g., `extension Foo: @MainActor SomeProtocol`).
- **Global/static state**: protect with `@MainActor` or move into an actor.
- **Background work**: move expensive work into a `@concurrent` async function on a `nonisolated` type or use an `actor` to guard mutable state.
- **Sendable errors**: prefer immutable/value types; add `Sendable` conformance only when correct; avoid `@unchecked Sendable` unless you can prove thread safety.

### 3. Verify the fix

- Rebuild and confirm all concurrency diagnostics are resolved with no new warnings introduced.
- Run the test suite to check for regressions — concurrency changes can introduce subtle runtime issues even when the build is clean.
- If the fix surfaces new warnings, treat each one as a fresh triage (return to step 1) and resolve iteratively until the build is clean and tests pass.

### Examples

**UI-bound type — adding `@MainActor`**

```swift
// Before: data-race warning because ViewModel is accessed from the main thread
// but has no actor isolation
class ViewModel: ObservableObject {
    @Published var title: String = ""
    func load() { title = "Loaded" }
}

// After: annotate the whole type so all stored state and methods are
// automatically isolated to the main actor
@MainActor
class ViewModel: ObservableObject {
    @Published var title: String = ""
    func load() { title = "Loaded" }
}
```

**Protocol conformance isolation**

```swift
// Before: compiler error — SomeProtocol method is nonisolated but the
// conforming type is @MainActor
@MainActor
class Foo: SomeProtocol {
    func protocolMethod() { /* accesses main-actor state */ }
}

// After: scope the conformance to @MainActor so the requirement is
// satisfied inside the correct isolation context
@MainActor
extension Foo: SomeProtocol {
    func protocolMethod() { /* safely accesses main-actor state */ }
}
```

**Background work with `@concurrent`**

```swift
// Before: expensive computation blocks the main actor
@MainActor
func processData(_ input: [Int]) -> [Int] {
    input.map { heavyTransform($0) }   // runs on main thread
}

// After: hop off the main actor for the heavy work, then return the result
// The caller awaits the result and stays on its own actor
nonisolated func processData(_ input: [Int]) async -> [Int] {
    await Task.detached(priority: .userInitiated) {
        input.map { heavyTransform($0) }
    }.value
}

// Or, using a @concurrent async function (Swift 6.2+):
@concurrent
func processData(_ input: [Int]) async -> [Int] {
    input.map { heavyTransform($0) }
}
```

## Reference material

- See `references/swift-6-2-concurrency.md` for Swift 6.2 changes, patterns, and examples.
- See `references/approachable-concurrency.md` when the project is opted into approachable concurrency mode.
- See `references/swiftui-concurrency-tour-wwdc.md` for SwiftUI-specific concurrency guidance.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
