# Sheets

## Intent

Use a centralized sheet routing pattern so any view can present modals without prop-drilling. This keeps sheet state in one place and scales as the app grows.

## Core architecture

- Define a `SheetDestination` enum that describes every modal and is `Identifiable`.
- Store the current sheet in a router object (`presentedSheet: SheetDestination?`).
- Create a view modifier like `withSheetDestinations(...)` that maps the enum to concrete sheet views.
- Inject the router into the environment so child views can set `presentedSheet` directly.

## Example: item-driven local sheet

Use this when sheet state is local to one screen and does not need centralized routing.

```swift
@State private var selectedItem: Item?

.sheet(item: $selectedItem) { item in
  EditItemSheet(item: item)
}
```

## Example: SheetDestination enum

```swift
enum SheetDestination: Identifiable, Hashable {
  case composer
  case editProfile
  case settings
  case report(itemID: String)

  var id: String {
    switch self {
    case .composer, .editProfile:
      // Use the same id to ensure only one editor-like sheet is active at a time.
      return "editor"
    case .settings:
      return "settings"
    case .report:
      return "report"
    }
  }
}
```

## Example: withSheetDestinations modifier

```swift
extension View {
  func withSheetDestinations(
    sheet: Binding<SheetDestination?>
  ) -> some View {
    sheet(item: sheet) { destination in
      Group {
        switch destination {
        case .composer:
          ComposerView()
        case .editProfile:
          EditProfileView()
        case .settings:
          SettingsView()
        case .report(let itemID):
          ReportView(itemID: itemID)
        }
      }
    }
  }
}
```

## Example: presenting from a child view

```swift
struct StatusRow: View {
  @Environment(RouterPath.self) private var router

  var body: some View {
    Button("Report") {
      router.presentedSheet = .report(itemID: "123")
    }
  }
}
```

## Required wiring

For the child view to work, a parent view must:
- own the router instance,
- attach `withSheetDestinations(sheet: $router.presentedSheet)` (or an equivalent `sheet(item:)` handler), and
- inject it with `.environment(router)` after the sheet modifier so the modal content inherits it.

This makes the child assignment to `router.presentedSheet` drive presentation at the root.

## Example: sheets that need their own navigation

Wrap sheet content in a `NavigationStack` so it can push within the modal.

```swift
struct NavigationSheet<Content: View>: View {
  var content: () -> Content

  var body: some View {
    NavigationStack {
      content()
        .toolbar { CloseToolbarItem() }
    }
  }
}
```

## Example: sheet owns its actions

Keep dismissal and confirmation logic inside the sheet when the actions belong to the modal itself.

```swift
struct EditItemSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(Store.self) private var store

  let item: Item
  @State private var isSaving = false

  var body: some View {
    VStack {
      Button(isSaving ? "Saving..." : "Save") {
        Task { await save() }
      }
    }
  }

  private func save() async {
    isSaving = true
    await store.save(item)
    dismiss()
  }
}
```

## Design choices to keep

- Centralize sheet routing so features can present modals without wiring bindings through many layers.
- Use `sheet(item:)` to guarantee a single sheet is active and to drive presentation from the enum.
- Group related sheets under the same `id` when they are mutually exclusive (e.g., editor flows).
- Keep sheet views lightweight and composed from smaller views; avoid large monoliths.
- Let sheets own their actions and call `dismiss()` internally instead of forwarding `onCancel` or `onConfirm` closures through many layers.

## Pitfalls

- Avoid mixing `sheet(isPresented:)` and `sheet(item:)` for the same concern; prefer a single enum.
- Avoid `if let` inside a sheet body when the presentation state already carries the selected model; prefer `sheet(item:)`.
- Do not store heavy state inside `SheetDestination`; pass lightweight identifiers or models.
- If multiple sheets can appear from the same screen, give them distinct `id` values.
