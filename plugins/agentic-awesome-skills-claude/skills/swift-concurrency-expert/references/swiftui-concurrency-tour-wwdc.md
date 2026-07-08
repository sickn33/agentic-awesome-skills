# SwiftUI Concurrency Tour (Summary)

Context: SwiftUI-focused concurrency overview covering actor isolation, Sendable closures, and how SwiftUI runs work off the main thread.

## Main-actor default in SwiftUI

- `View` is `@MainActor` isolated by default; members and `body` inherit isolation.
- Swift 6.2 can infer `@MainActor` for all types in a module (new language mode).
- This default simplifies UI code and aligns with UIKit/AppKit `@MainActor` APIs.

## Where SwiftUI runs code off the main thread

- SwiftUI may evaluate some view logic on background threads for performance.
- Examples: `Shape` path generation, `Layout` methods, `visualEffect` closures, and `onGeometryChange` closures.
- These APIs often require `Sendable` closures to reflect their runtime semantics.

## Sendable closures and data-race safety

- Accessing `@MainActor` state from a `Sendable` closure is unsafe and flagged by the compiler.
- Prefer capturing value copies in the closure capture list (e.g., copy a `Bool`).
- Avoid sending `self` into a sendable closure just to read a single property.

## Structuring async work with SwiftUI

- SwiftUI action callbacks are synchronous so UI updates (like loading states) can be immediate.
- Use `Task` to bridge into async contexts; keep async bodies minimal.
- Use state as the boundary: async work updates model/state; UI reacts synchronously.

## Performance-driven concurrency

- Offload expensive work from the main actor to avoid hitches.
- Keep time-sensitive UI logic (animations, gesture responses) synchronous.
- Separate UI code from long-running async work to improve responsiveness and testability.
