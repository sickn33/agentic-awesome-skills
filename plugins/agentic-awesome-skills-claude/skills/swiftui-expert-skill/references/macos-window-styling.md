# macOS Window & Toolbar Styling Reference

> Window configuration, toolbar styles, sizing, positioning, and navigation patterns specific to macOS SwiftUI apps.

## Table of Contents

- [Quick Lookup Table](#quick-lookup-table)
- [Toolbar Styles](#toolbar-styles)
- [Window Style](#window-style)
- [Window Sizing](#window-sizing)
- [MenuBarExtra Style (macOS-only)](#menubarextra-style-macos-only)
- [Navigation Layout (macOS behavior)](#navigation-layout-macos-behavior)
- [Commands & Keyboard](#commands--keyboard)
- [Best Practices](#best-practices)

---

## Quick Lookup Table

| API | Availability | macOS-Only? | Usage |
|-----|-------------|:-----------:|-------|
| `windowToolbarStyle(_:)` | macOS 11.0+ | Yes | Sets toolbar style: `.unified`, `.unifiedCompact`, `.expanded` |
| `windowStyle(_:)` | macOS 11.0+ | No | Supports `.hiddenTitleBar` for chromeless windows |
| `windowResizability(_:)` | macOS 13.0+ | No | Controls resize handle and green zoom button behavior |
| `defaultSize(width:height:)` | macOS 13.0+ | No | Initial frame size when user creates a new window |
| `defaultPosition(_:)` | macOS 13.0+ | No | Initial window position on screen |
| `windowIdealPlacement(_:)` | macOS 15.0+ | No | Closure with display geometry for precise window positioning |
| `menuBarExtraStyle(_:)` | macOS 13.0+ | Yes | Sets MenuBarExtra to `.menu` or `.window` style |
| `NavigationSplitView` | macOS 13.0+ | No | Columns always visible side-by-side on macOS; translucent sidebar |
| `Inspector` | macOS 14.0+ | No | Trailing-edge sidebar panel; resizable by dragging |

---

## Toolbar Styles

### windowToolbarStyle (macOS-only)

Controls how the toolbar and title bar are displayed. Applied to a scene.

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        // Title bar and toolbar in a single row
        .windowToolbarStyle(.unified)
    }
}
```

**Available styles:**

| Style | Description |
|-------|-------------|
| `.automatic` | System default |
| `.unified` | Title bar and toolbar in a single combined row |
| `.unifiedCompact` | Same as unified but with reduced vertical height |
| `.expanded` | Title bar displayed above the toolbar (more toolbar space) |

```swift
// Unified compact — minimal chrome
.windowToolbarStyle(.unifiedCompact)

// Expanded — title bar above toolbar
.windowToolbarStyle(.expanded)

// Unified with title hidden
.windowToolbarStyle(.unified(showsTitle: false))
```

### Toolbar content

```swift
struct ContentView: View {
    @State private var searchText = ""

    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            DetailView()
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button(action: addItem) {
                    Label("Add", systemImage: "plus")
                }
            }
        }
        .searchable(text: $searchText, placement: .sidebar)
    }
}
```

---

## Window Style

### windowStyle

Set the visual style of a window. Use `.hiddenTitleBar` for chromeless, immersive windows.

```swift
// Standard title bar (default)
WindowGroup {
    ContentView()
}
.windowStyle(.titleBar)

// Hidden title bar — chromeless window
WindowGroup {
    ContentView()
}
.windowStyle(.hiddenTitleBar)
```

> **Use case:** `.hiddenTitleBar` is useful for media players, custom-chrome apps, or immersive experiences where the standard title bar is unwanted.

---

## Window Sizing

### windowResizability, defaultSize, defaultPosition

These modifiers work together to configure window sizing and placement:

```swift
WindowGroup {
    ContentView()
        .frame(minWidth: 600, minHeight: 400)
}
.defaultSize(width: 900, height: 600)
.defaultPosition(.center)
.windowResizability(.contentMinSize)
```

**`windowResizability` options:**

| Value | Behavior |
|-------|----------|
| `.automatic` | System decides resize behavior |
| `.contentSize` | Fixed to content size; no user resize; zoom button disabled |
| `.contentMinSize` | Resizable with minimum based on content's `minWidth`/`minHeight` |

**`defaultPosition` options:** `.center`, `.topLeading`, `.top`, `.topTrailing`, `.leading`, `.trailing`, `.bottomLeading`, `.bottom`, `.bottomTrailing`

**Guidelines:**
- Set `minWidth`/`minHeight` via `.frame()` on content, enforce with `.contentMinSize`
- Use `.defaultSize()` for initial dimensions (larger than minimums)
- `defaultSize` also accepts `CGSize`

### windowIdealPlacement (macOS 15.0+)

For precise programmatic positioning, use a closure with display geometry:

```swift
.windowIdealPlacement { context in
    let screen = context.defaultDisplay.visibleArea
    return WindowPlacement(x: screen.midX, y: screen.midY,
                           width: screen.width / 2, height: screen.height)
}
```

---

## MenuBarExtra Style (macOS-only)

Choose between dropdown menu and popover panel for `MenuBarExtra`.

```swift
// Dropdown menu (default)
MenuBarExtra("Status", systemImage: "chart.bar") {
    Button("Action") { /* ... */ }
}
.menuBarExtraStyle(.menu)

// Popover panel with custom SwiftUI content
MenuBarExtra("Status", systemImage: "chart.bar") {
    DashboardView()
}
.menuBarExtraStyle(.window)
```

---

## Navigation Layout (macOS behavior)

### NavigationSplitView

On macOS, `NavigationSplitView` displays columns side-by-side (never overlaid). The sidebar gets a translucent material background. Columns support variable-width resizing by the user.

```swift
NavigationSplitView {
    List(items, selection: $selectedId) { item in
        Text(item.name)
    }
    .navigationSplitViewColumnWidth(min: 180, ideal: 220, max: 300)
} detail: {
    DetailView(id: selectedId)
}
.navigationSplitViewStyle(.balanced)
```

Use the three-column variant (`sidebar` / `content` / `detail`) for master-detail-detail layouts. Customize column widths with `.navigationSplitViewColumnWidth(min:ideal:max:)`.

### Inspector (macOS 14.0+)

A trailing-edge panel for supplementary information. On macOS, it appears as a sidebar-style panel that can be resized by dragging its edge.

```swift
struct ContentView: View {
    @State private var showInspector = false

    var body: some View {
        MainContent()
            .inspector(isPresented: $showInspector) {
                InspectorView()
                    .inspectorColumnWidth(min: 200, ideal: 250, max: 400)
            }
            .toolbar {
                ToolbarItem {
                    Button {
                        showInspector.toggle()
                    } label: {
                        Label("Inspector", systemImage: "info.circle")
                    }
                }
            }
    }
}
```

---

## Commands & Keyboard

### Commands, CommandGroup, CommandMenu

Define menu bar commands. On macOS, these populate the menu bar directly. On iOS, they create key commands.

```swift
.commands {
    CommandMenu("Tools") {
        Button("Run Analysis") { /* ... */ }
            .keyboardShortcut("r", modifiers: [.command, .shift])
    }
    CommandGroup(after: .newItem) {
        Button("New From Template...") { /* ... */ }
    }
}
```

**`CommandGroup` placement options:** `.replacing(_:)` replaces a system group, `.before(_:)` / `.after(_:)` inserts adjacent to it. Common placements: `.newItem`, `.saveItem`, `.help`, `.toolbar`, `.sidebar`.

### KeyboardShortcut

On macOS, shortcuts are displayed alongside menu items and in button tooltips on hover.

```swift
Button("Save") {
    save()
}
.keyboardShortcut("s", modifiers: .command)

Button("Delete") {
    delete()
}
.keyboardShortcut(.delete, modifiers: .command)
```

### openWindow

Programmatically open a window. If the target window is already open, brings it to the front.

```swift
struct ToolbarActions: View {
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        Button("Connection Doctor") {
            openWindow(id: "connection-doctor")
        }

        Button("Show Message") {
            openWindow(value: message.id)  // Type-matched to WindowGroup
        }
    }
}
```

---

## Best Practices

- **Use `.unified` or `.unifiedCompact`** for most apps — `.expanded` only when you need many toolbar items
- **Set min frame sizes on content** and use `.windowResizability(.contentMinSize)` to enforce them
- **Always provide `defaultSize`** so new windows start at a reasonable size
- **Use `NavigationSplitView`** for sidebar navigation — not `HSplitView`
- **Use `Inspector`** for supplementary panels — it integrates with the toolbar automatically
- **Define `Commands`** for all repeatable actions — users expect keyboard shortcuts on macOS
- **Use `#if os(macOS)`** to wrap macOS-only window configuration in multiplatform projects
