# Performance guardrails

## Intent

Use these rules when a SwiftUI screen is large, scroll-heavy, frequently updated, or at risk of unnecessary recomputation.

## Core rules

- Give `ForEach` and list content stable identity. Do not use unstable indices as identity when the collection can reorder or mutate.
- Keep expensive filtering, sorting, and formatting out of `body`; precompute or move it into a model/helper when it is not trivial.
- Narrow observation scope so only the views that read changing state need to update.
- Prefer lazy containers for larger scrolling content and extract subviews when only part of a screen changes frequently.
- Avoid swapping entire top-level view trees for small state changes; keep a stable root view and vary localized sections or modifiers.

## Example: stable identity

```swift
ForEach(items) { item in
  Row(item: item)
}
```

Prefer that over index-based identity when the collection can change order:

```swift
ForEach(Array(items.enumerated()), id: \.offset) { _, item in
  Row(item: item)
}
```

## Example: move expensive work out of body

```swift
struct FeedView: View {
  let items: [FeedItem]

  private var sortedItems: [FeedItem] {
    items.sorted(using: KeyPathComparator(\.createdAt, order: .reverse))
  }

  var body: some View {
    List(sortedItems) { item in
      FeedRow(item: item)
    }
  }
}
```

If the work is more expensive than a small derived property, move it into a model, store, or helper that updates less often.

## When to investigate further

- Janky scrolling in long feeds or grids
- Typing lag from search or form validation
- Overly broad view updates when one small piece of state changes
- Large screens with many conditionals or repeated formatting work

## Pitfalls

- Recomputing heavy transforms every render
- Observing a large object from many descendants when only one field matters
- Building custom scroll containers when `List`, `LazyVStack`, or `LazyHGrid` would already solve the problem
