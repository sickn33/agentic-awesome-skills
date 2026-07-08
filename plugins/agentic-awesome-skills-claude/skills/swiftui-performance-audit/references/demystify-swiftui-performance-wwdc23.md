# Demystify SwiftUI Performance (WWDC23) (Summary)

Context: WWDC23 session on building a mental model for SwiftUI performance and triaging hangs/hitches.

## Performance loop

- Measure -> Identify -> Optimize -> Re-measure.
- Focus on concrete symptoms (slow navigation, broken animations, spinning cursor).

## Dependencies and updates

- Views form a dependency graph; dynamic properties are a frequent source of updates.
- Use `Self._printChanges()` in debug only to inspect extra dependencies.
- Eliminate unnecessary dependencies by extracting views or narrowing state.
- Consider `@Observable` for more granular property tracking.

## Common causes of slow updates

- Expensive view bodies (string interpolation, filtering, formatting).
- Dynamic property instantiation and state initialization in `body`.
- Slow identity resolution in lists/tables.
- Hidden work: bundle lookups, heap allocations, repeated string construction.

## Avoid slow initialization in view bodies

- Don’t create heavy models synchronously in view bodies.
- Use `.task` to fetch async data and keep `init` lightweight.

## Lists and tables identity rules

- Stable identity is critical for performance and animation.
- Ensure a constant number of views per element in `ForEach`.
- Avoid inline filtering in `ForEach`; pre-filter and cache collections.
- Avoid `AnyView` in list rows; it hides identity and increases cost.
- Flatten nested `ForEach` when possible to reduce overhead.

## Table specifics

- `TableRow` resolves to a single row; row count must be constant.
- Prefer the streamlined `Table` initializer to enforce constant rows.
- Use explicit IDs for back deployment when needed.

## Debugging aids

- Use Instruments for hangs and hitches.
- Use `_printChanges` to validate dependency assumptions during debug.
