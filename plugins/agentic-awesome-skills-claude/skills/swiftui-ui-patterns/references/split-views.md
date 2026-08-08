# Split views and columns

## Intent

Provide a lightweight, customizable multi-column layout for iPad/macOS without relying on `NavigationSplitView`.

## Custom split column pattern (manual HStack)

Use this when you want full control over column sizing, behavior, and environment tweaks.

```swift
@MainActor
struct AppView: View {
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @AppStorage("showSecondaryColumn") private var showSecondaryColumn = true

  var body: some View {
    HStack(spacing: 0) {
      primaryColumn
      if shouldShowSecondaryColumn {
        Divider().edgesIgnoringSafeArea(.all)
        secondaryColumn
      }
    }
  }

  private var shouldShowSecondaryColumn: Bool {
    horizontalSizeClass == .regular
      && showSecondaryColumn
  }

  private var primaryColumn: some View {
    TabView { /* tabs */ }
  }

  private var secondaryColumn: some View {
    NotificationsTab()
      .environment(\.isSecondaryColumn, true)
      .frame(maxWidth: .secondaryColumnWidth)
  }
}
```

## Notes on the custom approach

- Use a shared preference or setting to toggle the secondary column.
- Inject an environment flag (e.g., `isSecondaryColumn`) so child views can adapt behavior.
- Prefer a fixed or capped width for the secondary column to avoid layout thrash.

## Alternative: NavigationSplitView

`NavigationSplitView` can handle sidebar + detail + supplementary columns for you, but is harder to customize in cases like:\n- a dedicated notification column independent of selection,\n- custom sizing, or\n- different toolbar behaviors per column.

```swift
@MainActor
struct AppView: View {
  var body: some View {
    NavigationSplitView {
      SidebarView()
    } content: {
      MainContentView()
    } detail: {
      NotificationsView()
    }
  }
}
```

## When to choose which

- Use the manual HStack split when you need full control or a non-standard secondary column.
- Use `NavigationSplitView` when you want a standard system layout with minimal customization.
