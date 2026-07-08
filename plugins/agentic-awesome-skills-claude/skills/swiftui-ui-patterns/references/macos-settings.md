# macOS Settings

## Intent

Use this when building a macOS Settings window backed by SwiftUI's `Settings` scene.

## Core patterns

- Declare the Settings scene in the `App` and compile it only for macOS.
- Keep settings content in a dedicated root view (`SettingsView`) and drive values with `@AppStorage`.
- Use `TabView` to group settings sections when you have more than one category.
- Use `Form` inside each tab to keep controls aligned and accessible.
- Use `OpenSettingsAction` or `SettingsLink` for in-app entry points to the Settings window.

## Example: settings scene

```swift
@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
    #if os(macOS)
    Settings {
      SettingsView()
    }
    #endif
  }
}
```

## Example: tabbed settings view

```swift
@MainActor
struct SettingsView: View {
  @AppStorage("showPreviews") private var showPreviews = true
  @AppStorage("fontSize") private var fontSize = 12.0

  var body: some View {
    TabView {
      Form {
        Toggle("Show Previews", isOn: $showPreviews)
        Slider(value: $fontSize, in: 9...96) {
          Text("Font Size (\(fontSize, specifier: "%.0f") pts)")
        }
      }
      .tabItem { Label("General", systemImage: "gear") }

      Form {
        Toggle("Enable Advanced Mode", isOn: .constant(false))
      }
      .tabItem { Label("Advanced", systemImage: "star") }
    }
    .scenePadding()
    .frame(maxWidth: 420, minHeight: 240)
  }
}
```

## Skip navigation

- Avoid wrapping `SettingsView` in a `NavigationStack` unless you truly need deep push navigation.
- Prefer tabs or sections; Settings is already presented as a separate window and should feel flat.
- If you must show hierarchical settings, use a single `NavigationSplitView` with a sidebar list of categories.

## Pitfalls

- Don’t reuse iOS-only settings layouts (full-screen stacks, toolbar-heavy flows).
- Avoid large custom view hierarchies inside `Form`; keep rows focused and accessible.
