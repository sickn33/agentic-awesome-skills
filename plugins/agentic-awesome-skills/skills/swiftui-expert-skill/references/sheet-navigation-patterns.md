# SwiftUI Sheet, Navigation & Inspector Patterns Reference

## Table of Contents

- [Sheet Patterns](#sheet-patterns)
- [Navigation Patterns](#navigation-patterns)
- [Multi-Column Navigation with NavigationSplitView](#multi-column-navigation-with-navigationsplitview)
- [Inspector](#inspector)
- [Presentation Modifiers](#presentation-modifiers)
- [Summary Checklist](#summary-checklist)

## Sheet Patterns

### Item-Driven Sheets (Preferred)

**Use `.sheet(item:)` instead of `.sheet(isPresented:)` when presenting model-based content.**

```swift
// Good - item-driven
@State private var selectedItem: Item?

var body: some View {
    List(items) { item in
        Button(item.name) {
            selectedItem = item
        }
    }
    .sheet(item: $selectedItem) { item in
        ItemDetailSheet(item: item)
    }
}

// Avoid - boolean flag requires separate state
@State private var showSheet = false
@State private var selectedItem: Item?

var body: some View {
    List(items) { item in
        Button(item.name) {
            selectedItem = item
            showSheet = true
        }
    }
    .sheet(isPresented: $showSheet) {
        if let selectedItem {
            ItemDetailSheet(item: selectedItem)
        }
    }
}
```

**Why**: `.sheet(item:)` automatically handles presentation state and avoids optional unwrapping in the sheet body.

### Sheets Own Their Actions

**Sheets should handle their own dismiss and actions internally** using `@Environment(\.dismiss)`. Avoid passing `onSave`/`onCancel` closures from the parent -- it creates callback prop-drilling and reduces reusability.

```swift
struct EditItemSheet: View {
    @Environment(\.dismiss) private var dismiss
    let item: Item
    @State private var name: String

    init(item: Item) {
        self.item = item
        _name = State(initialValue: item.name)
    }

    var body: some View {
        NavigationStack {
            Form { TextField("Name", text: $name) }
                .navigationTitle("Edit Item")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") { /* save and dismiss */ } }
                }
        }
    }
}
```

### Enum-Based Sheet Management

When presenting multiple different sheets, use an `Identifiable` enum with `.sheet(item:)` instead of multiple boolean state properties:

```swift
struct ArticlesView: View {
    enum Sheet: Identifiable {
        case add, edit(Article), categories
        var id: String {
            switch self {
            case .add: "add"
            case .edit(let a): "edit-\(a.id)"
            case .categories: "categories"
            }
        }
    }

    @State private var presentedSheet: Sheet?

    var body: some View {
        List { /* ... */ }
            .toolbar {
                Button("Add") { presentedSheet = .add }
            }
            .sheet(item: $presentedSheet) { sheet in
                switch sheet {
                case .add: AddArticleView()
                case .edit(let article): EditArticleView(article: article)
                case .categories: CategoriesView()
                }
            }
    }
}
```

**Why**: A single `@State` property and one `.sheet(item:)` modifier replaces N boolean properties and N sheet modifiers, improving readability and preventing only-one-sheet-at-a-time conflicts.

## Navigation Patterns

### Type-Safe Navigation with NavigationStack

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Profile", value: Route.profile)
                NavigationLink("Settings", value: Route.settings)
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .profile:
                    ProfileView()
                case .settings:
                    SettingsView()
                }
            }
        }
    }
}

enum Route: Hashable {
    case profile
    case settings
}
```

### Programmatic Navigation

```swift
struct ContentView: View {
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                Button("Go to Detail") {
                    navigationPath.append(DetailRoute.item(id: 1))
                }
            }
            .navigationDestination(for: DetailRoute.self) { route in
                switch route {
                case .item(let id):
                    ItemDetailView(id: id)
                }
            }
        }
    }
}

enum DetailRoute: Hashable {
    case item(id: Int)
}
```

## Multi-Column Navigation with NavigationSplitView

### Two-Column Layout

Use `NavigationSplitView` for sidebar-driven navigation. Available on iOS 16+, macOS 13+, tvOS 16+, watchOS 9+.

```swift
struct ContentView: View {
    @State private var selectedItem: Item.ID?

    var body: some View {
        NavigationSplitView {
            List(items, selection: $selectedItem) { item in
                Text(item.name)
            }
            .navigationTitle("Items")
        } detail: {
            if let selectedItem, let item = items.first(where: { $0.id == selectedItem }) {
                ItemDetailView(item: item)
            } else {
                ContentUnavailableView("Select an Item", systemImage: "doc")
            }
        }
    }
}
```

### Three-Column Layout

```swift
struct ContentView: View {
    @State private var departmentId: Department.ID?
    @State private var employeeIds = Set<Employee.ID>()

    var body: some View {
        NavigationSplitView {
            List(model.departments, selection: $departmentId) { dept in
                Text(dept.name)
            }
        } content: {
            if let department = model.department(id: departmentId) {
                List(department.employees, selection: $employeeIds) { emp in
                    Text(emp.name)
                }
            } else {
                Text("Select a department")
            }
        } detail: {
            EmployeeDetails(for: employeeIds)
        }
    }
}
```

### Configuration

- **Column visibility**: `NavigationSplitView(columnVisibility: $visibility)` with `NavigationSplitViewVisibility` (`.detailOnly`, `.doubleColumn`, `.all`)
- **Column widths**: `.navigationSplitViewColumnWidth(min:ideal:max:)` on each column
- **Compact column**: `NavigationSplitView(preferredCompactColumn: $column)` to control which column shows on narrow devices
- **Style**: `.navigationSplitViewStyle(.balanced)` or `.prominentDetail` (default)

### Platform Behavior

| Platform | Behavior |
|----------|----------|
| **macOS** | Columns always visible side-by-side; sidebar has translucent material; variable-width column resizing by dragging |
| **iPadOS (regular)** | Sidebar can overlay or push detail; supports column visibility toggle via toolbar button |
| **iOS / iPadOS (compact)** | Collapses into a single `NavigationStack`; sidebar items show disclosure chevrons; back button navigates between columns |
| **iPhone (all sizes)** | Always collapsed into a stack; sidebar appears as the root list; selections push detail onto the stack |
| **watchOS / tvOS** | Collapses into a single stack |

## Inspector

> **Availability:** iOS 17.0+, macOS 14.0+

A trailing-edge panel for supplementary information.

On wider size classes (macOS, iPad landscape), it appears as a **trailing column**. On compact size classes (iPhone), it **adapts to a sheet** automatically.

### Basic Inspector

```swift
struct ShapeEditor: View {
    @State private var showInspector = false

    var body: some View {
        MyEditorView()
            .inspector(isPresented: $showInspector) {
                InspectorContent()
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

### Inspector with Column Width

```swift
MyEditorView()
    .inspector(isPresented: $showInspector) {
        InspectorContent()
            .inspectorColumnWidth(min: 200, ideal: 250, max: 400)
    }
```

### Inspector with Fixed Width

```swift
MyEditorView()
    .inspector(isPresented: $showInspector) {
        InspectorContent()
            .inspectorColumnWidth(300)
    }
```

### Platform Behavior

| Platform | Behavior |
|----------|----------|
| **macOS** | Trailing-edge sidebar panel; resizable by dragging edge; integrates with window toolbar |
| **iPadOS (regular)** | Trailing column alongside content; toggleable via toolbar button |
| **iOS / iPadOS (compact)** | Adapts to a sheet presentation; swipe-to-dismiss supported |
| **iPhone (all sizes)** | Always presented as a sheet (no trailing column); dismiss via swipe or button |

> **Tip:** Use `InspectorCommands` in your app's `.commands` to include the default inspector toggle keyboard shortcut.

## Presentation Modifiers

### Full Screen Cover

```swift
struct ContentView: View {
    @State private var showFullScreen = false

    var body: some View {
        Button("Show Full Screen") {
            showFullScreen = true
        }
        .fullScreenCover(isPresented: $showFullScreen) {
            FullScreenView()
        }
    }
}
```

### Popover

```swift
struct ContentView: View {
    @State private var showPopover = false

    var body: some View {
        Button("Show Popover") {
            showPopover = true
        }
        .popover(isPresented: $showPopover) {
            PopoverContentView()
                .presentationCompactAdaptation(.popover)  // Don't adapt to sheet on iPhone
        }
    }
}
```

For `alert` and `confirmationDialog` API patterns, see `latest-apis.md`.

## Summary Checklist

- [ ] Use `.sheet(item:)` for model-based sheets
- [ ] Sheets own their actions and dismiss internally
- [ ] Use `NavigationStack` with `navigationDestination(for:)` for type-safe navigation
- [ ] Use `NavigationPath` for programmatic navigation
- [ ] Use `NavigationSplitView` for sidebar-driven multi-column layouts
- [ ] Use `Inspector` for trailing-edge supplementary panels
- [ ] Set column widths with `navigationSplitViewColumnWidth(min:ideal:max:)` or `inspectorColumnWidth(min:ideal:max:)`
- [ ] Use appropriate presentation modifiers (sheet, fullScreenCover, popover)
- [ ] Alerts and confirmation dialogs use modern API with actions
- [ ] Avoid passing dismiss/save callbacks to sheets
- [ ] Use enum-based `Identifiable` type with `.sheet(item:)` when presenting multiple sheets
- [ ] Navigation state can be saved/restored when needed
