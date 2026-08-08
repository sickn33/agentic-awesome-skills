# Top bar overlays (iOS 26+ and fallback)

## Intent

Provide a custom top selector or pill row that sits above scroll content, using `safeAreaBar(.top)` on iOS 26 and a compatible fallback on earlier OS versions.

## iOS 26+ approach

Use `safeAreaBar(edge: .top)` to attach the view to the safe area bar.

```swift
if #available(iOS 26.0, *) {
  content
    .safeAreaBar(edge: .top) {
      TopSelectorView()
        .padding(.horizontal, .layoutPadding)
    }
}
```

## Fallback for earlier iOS

Use `.safeAreaInset(edge: .top)` and hide the toolbar background to avoid double layers.

```swift
content
  .toolbarBackground(.hidden, for: .navigationBar)
  .safeAreaInset(edge: .top, spacing: 0) {
    VStack(spacing: 0) {
      TopSelectorView()
        .padding(.vertical, 8)
        .padding(.horizontal, .layoutPadding)
        .background(Color.primary.opacity(0.06))
        .background(Material.ultraThin)
      Divider()
    }
  }
```

## Design choices to keep

- Use `safeAreaBar` when available; it integrates better with the navigation bar.
- Use a subtle background + divider in the fallback to keep separation from content.
- Keep the selector height compact to avoid pushing content too far down.

## Pitfalls

- Don’t stack multiple top insets; it can create extra padding.
- Avoid heavy, opaque backgrounds that fight the navigation bar.
