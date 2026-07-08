# TabView

## Intent

Use this pattern for a scalable, multi-platform tab architecture with:
- a single source of truth for tab identity and content,
- platform-specific tab sets and sidebar sections,
- dynamic tabs sourced from data,
- an interception hook for special tabs (e.g., compose).

## Core architecture

- `AppTab` enum defines identity, labels, icons, and content builder.
- `SidebarSections` enum groups tabs for sidebar sections.
- `AppView` owns the `TabView` and selection binding, and routes tab changes through `updateTab`.

## Example: custom binding with side effects

Use this when tab selection needs side effects, like intercepting a special tab to perform an action instead of changing selection.

```swift
@MainActor
struct AppView: View {
  @Binding var selectedTab: AppTab

  var body: some View {
    TabView(selection: .init(
      get: { selectedTab },
      set: { updateTab(with: $0) }
    )) {
      ForEach(availableSections) { section in
        TabSection(section.title) {
          ForEach(section.tabs) { tab in
            Tab(value: tab) {
              tab.makeContentView(
                homeTimeline: $timeline,
                selectedTab: $selectedTab,
                pinnedFilters: $pinnedFilters
              )
            } label: {
              tab.label
            }
            .tabPlacement(tab.tabPlacement)
          }
        }
        .tabPlacement(.sidebarOnly)
      }
    }
  }

  private func updateTab(with newTab: AppTab) {
    if newTab == .post {
      // Intercept special tabs (compose) instead of changing selection.
      presentComposer()
      return
    }
    selectedTab = newTab
  }
}
```

## Example: direct binding without side effects

Use this when selection is purely state-driven.

```swift
@MainActor
struct AppView: View {
  @Binding var selectedTab: AppTab

  var body: some View {
    TabView(selection: $selectedTab) {
      ForEach(availableSections) { section in
        TabSection(section.title) {
          ForEach(section.tabs) { tab in
            Tab(value: tab) {
              tab.makeContentView(
                homeTimeline: $timeline,
                selectedTab: $selectedTab,
                pinnedFilters: $pinnedFilters
              )
            } label: {
              tab.label
            }
            .tabPlacement(tab.tabPlacement)
          }
        }
        .tabPlacement(.sidebarOnly)
      }
    }
  }
}
```

## Design choices to keep

- Centralize tab identity and content in `AppTab` with `makeContentView(...)`.
- Use `Tab(value:)` with `selection` binding for state-driven tab selection.
- Route selection changes through `updateTab` to handle special tabs and scroll-to-top behavior.
- Use `TabSection` + `.tabPlacement(.sidebarOnly)` for sidebar structure.
- Use `.tabPlacement(.pinned)` in `AppTab.tabPlacement` for a single pinned tab; this is commonly used for iOS 26 `.searchable` tab content, but can be used for any tab.

## Dynamic tabs pattern

- `SidebarSections` handles dynamic data tabs.
- `AppTab.anyTimelineFilter(filter:)` wraps dynamic tabs in a single enum case.
- The enum provides label/icon/title for dynamic tabs via the filter type.

## Pitfalls

- Avoid adding ViewModels for tabs; keep state local or in `@Observable` services.
- Do not nest `@Observable` objects inside other `@Observable` objects.
- Ensure `AppTab.id` values are stable; dynamic cases should hash on stable IDs.
- Special tabs (compose) should not change selection.
