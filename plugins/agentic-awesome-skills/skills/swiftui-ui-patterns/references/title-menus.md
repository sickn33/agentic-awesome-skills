# Title menus

## Intent

Use a title menu in the navigation bar to provide context‑specific filtering or quick actions without adding extra chrome.

## Core patterns

- Use `ToolbarTitleMenu` to attach a menu to the navigation title.
- Keep the menu content compact and grouped with dividers.

## Example: title menu for filters

```swift
@ToolbarContentBuilder
private var toolbarView: some ToolbarContent {
  ToolbarTitleMenu {
    Button("Latest") { timeline = .latest }
    Button("Resume") { timeline = .resume }
    Divider()
    Button("Local") { timeline = .local }
    Button("Federated") { timeline = .federated }
  }
}
```

## Example: attach to a view

```swift
NavigationStack {
  TimelineView()
    .toolbar {
      toolbarView
    }
}
```

## Example: title + menu together

```swift
struct TimelineScreen: View {
  @State private var timeline: TimelineFilter = .home

  var body: some View {
    NavigationStack {
      TimelineView()
        .toolbar {
          ToolbarItem(placement: .principal) {
            VStack(spacing: 2) {
              Text(timeline.title)
                .font(.headline)
              Text(timeline.subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          ToolbarTitleMenu {
            Button("Home") { timeline = .home }
            Button("Local") { timeline = .local }
            Button("Federated") { timeline = .federated }
          }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
  }
}
```

## Example: title + subtitle with menu

```swift
ToolbarItem(placement: .principal) {
  VStack(spacing: 2) {
    Text(title)
      .font(.headline)
    Text(subtitle)
      .font(.caption)
      .foregroundStyle(.secondary)
  }
}
```

## Design choices to keep

- Only show the title menu when filtering or context switching is available.
- Keep the title readable; avoid long labels that truncate.
- Use secondary text below the title if extra context is needed.

## Pitfalls

- Don’t overload the menu with too many options.
- Avoid using title menus for destructive actions.
