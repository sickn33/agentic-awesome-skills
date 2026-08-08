# Menu Bar

## Intent

Use this when adding or customizing the macOS/iPadOS menu bar with SwiftUI commands.

## Core patterns

- Add commands at the `Scene` level with `.commands { ... }`.
- Use `SidebarCommands()` when your UI includes a navigation sidebar.
- Use `CommandMenu` for app-specific menus and group related actions.
- Use `CommandGroup` to insert items before/after system groups or replace them.
- Use `FocusedValue` for context-sensitive menu items that depend on the active scene.

## Example: basic command menu

```swift
@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
    .commands {
      CommandMenu("Actions") {
        Button("Run", action: run)
          .keyboardShortcut("R")
        Button("Stop", action: stop)
          .keyboardShortcut(".")
      }
    }
  }

  private func run() {}
  private func stop() {}
}
```

## Example: insert and replace groups

```swift
WindowGroup {
  ContentView()
}
.commands {
  CommandGroup(before: .systemServices) {
    Button("Check for Updates") { /* open updater */ }
  }

  CommandGroup(after: .newItem) {
    Button("New from Clipboard") { /* create item */ }
  }

  CommandGroup(replacing: .help) {
    Button("User Manual") { /* open docs */ }
  }
}
```

## Example: focused menu state

```swift
@Observable
final class DataModel {
  var items: [String] = []
}

struct ContentView: View {
  @State private var model = DataModel()

  var body: some View {
    List(model.items, id: \.self) { item in
      Text(item)
    }
    .focusedSceneValue(model)
  }
}

struct ItemCommands: Commands {
  @FocusedValue(DataModel.self) private var model: DataModel?

  var body: some Commands {
    CommandGroup(after: .newItem) {
      Button("New Item") {
        model?.items.append("Untitled")
      }
      .disabled(model == nil)
    }
  }
}
```

## Menu bar and Settings

- Defining a `Settings` scene adds the Settings menu item on macOS automatically.
- If you need a custom entry point inside the app, use `OpenSettingsAction` or `SettingsLink`.

## Pitfalls

- Avoid registering the same keyboard shortcut in multiple command groups.
- Don’t use menu items as the only discoverable entry point for critical features.
