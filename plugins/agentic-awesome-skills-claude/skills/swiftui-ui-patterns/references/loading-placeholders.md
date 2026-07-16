# Loading & Placeholders

Use this when a view needs a consistent loading state (skeletons, redaction, empty state) without blocking interaction.

## Patterns to prefer

- **Redacted placeholders** for list/detail content to preserve layout while loading.
- **ContentUnavailableView** for empty or error states after loading completes.
- **ProgressView** only for short, global operations (use sparingly in content-heavy screens).

## Recommended approach

1. Keep the real layout, render placeholder data, then apply `.redacted(reason: .placeholder)`.
2. For lists, show a fixed number of placeholder rows (avoid infinite spinners).
3. Switch to `ContentUnavailableView` when load finishes but data is empty.

## Pitfalls

- Don’t animate layout shifts during redaction; keep frames stable.
- Avoid nesting multiple spinners; use one loading indicator per section.
- Keep placeholder count small (3–6) to reduce jank on low-end devices.

## Minimal usage

```swift
VStack {
  if isLoading {
    ForEach(0..<3, id: \.self) { _ in
      RowView(model: .placeholder())
    }
    .redacted(reason: .placeholder)
  } else if items.isEmpty {
    ContentUnavailableView("No items", systemImage: "tray")
  } else {
    ForEach(items) { item in RowView(model: item) }
  }
}
```
