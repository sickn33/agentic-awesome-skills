# Grids

## Intent

Use `LazyVGrid` for icon pickers, media galleries, and dense visual selections where items align in columns.

## Core patterns

- Use `.adaptive` columns for layouts that should scale across device sizes.
- Use multiple `.flexible` columns when you want a fixed column count.
- Keep spacing consistent and small to avoid uneven gutters.
- Use `GeometryReader` inside grid cells when you need square thumbnails.

## Example: adaptive icon grid

```swift
let columns = [GridItem(.adaptive(minimum: 120, maximum: 1024))]

LazyVGrid(columns: columns, spacing: 6) {
  ForEach(icons) { icon in
    Button {
      select(icon)
    } label: {
      ZStack(alignment: .bottomTrailing) {
        Image(icon.previewName)
          .resizable()
          .aspectRatio(contentMode: .fit)
          .cornerRadius(6)
        if icon.isSelected {
          Image(systemName: "checkmark.seal.fill")
            .padding(4)
            .tint(.green)
        }
      }
    }
    .buttonStyle(.plain)
  }
}
```

## Example: fixed 3-column media grid

```swift
LazyVGrid(
  columns: [
    .init(.flexible(minimum: 100), spacing: 4),
    .init(.flexible(minimum: 100), spacing: 4),
    .init(.flexible(minimum: 100), spacing: 4),
  ],
  spacing: 4
) {
  ForEach(items) { item in
    GeometryReader { proxy in
      ThumbnailView(item: item)
        .frame(width: proxy.size.width, height: proxy.size.width)
    }
    .aspectRatio(1, contentMode: .fit)
  }
}
```

## Design choices to keep

- Use `LazyVGrid` for large collections; avoid non-lazy grids for big sets.
- Keep tap targets full-bleed using `.contentShape(Rectangle())` when needed.
- Prefer adaptive grids for settings pickers and flexible layouts.

## Pitfalls

- Avoid heavy overlays in every grid cell; it can be expensive.
- Don’t nest grids inside other grids without a clear reason.
