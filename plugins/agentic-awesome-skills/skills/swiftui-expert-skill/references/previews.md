# SwiftUI Previews Reference

## Table of Contents

- [Preview Macro](#preview-macro)
- [Preview with Mock Data](#preview-with-mock-data)
- [@Previewable Property Wrappers](#previewable-property-wrappers)
- [Common Diagnostics](#common-diagnostics)
- [Summary Checklist](#summary-checklist)

---

## Preview Macro

The `#Preview` macro (Swift 5.9+, Xcode 15+) is the modern way to declare previews. The legacy `PreviewProvider` protocol still works; prefer `#Preview` for new code because it's less verbose and supports inline traits.

### Basic Usage

```swift
// Modern: #Preview macro
#Preview {
    ContentView()
}

// Named preview
#Preview("Dark Mode") {
    ContentView()
        .preferredColorScheme(.dark)
}

// Legacy: PreviewProvider — still valid, but verbose for new code
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
```

### Multiple Previews

Declare one `#Preview` per meaningful state so each renders independently in the canvas:

```swift
#Preview("Default") {
    SettingsRow(title: "Notifications", isOn: true)
}

#Preview("Off State") {
    SettingsRow(title: "Notifications", isOn: false)
}

#Preview("Long Title") {
    SettingsRow(title: "Enable Push Notifications for All Events", isOn: true)
}
```

### Preview Traits

Traits configure the preview environment without modifying the view itself:

```swift
// Fixed size
#Preview(traits: .fixedLayout(width: 300, height: 100)) {
    CompactBanner(message: "Welcome")
}

// Size that fits content
#Preview(traits: .sizeThatFitsLayout) {
    BadgeView(count: 5)
}

// Landscape orientation
#Preview(traits: .landscapeLeft) {
    DashboardView()
}
```

### Previewing Inside NavigationStack

Wrap previewed destinations in their navigation container so toolbar items, titles, and back buttons render correctly:

```swift
#Preview {
    NavigationStack {
        DetailView(item: .sample)
    }
}
```

---

## Preview with Mock Data

Previews must compile and render without external dependencies. Live services, network calls, and disk I/O make previews slow, flaky, or broken; use self-contained sample data instead.

### Static Sample Data

Expose sample values as static properties on the model itself so any preview can reuse them without reconstructing values inline:

```swift
struct Item: Identifiable {
    let id: UUID
    var name: String
    var price: Double
}

extension Item {
    static let sample = Item(id: UUID(), name: "Widget", price: 9.99)

    static let samples: [Item] = [
        Item(id: UUID(), name: "Widget", price: 9.99),
        Item(id: UUID(), name: "Gadget", price: 19.99),
        Item(id: UUID(), name: "Doohickey", price: 4.99),
    ]
}

#Preview {
    ItemListView(items: Item.samples)
}
```

### Mock Observable Models

For views driven by an `@Observable` model (see `state-management.md` for fundamentals), expose pre-configured instances on the model itself:

```swift
@Observable
@MainActor
final class CartModel {
    var items: [Item] = []
    var isLoading = false

    static var preview: CartModel {
        let model = CartModel()
        model.items = Item.samples
        return model
    }

    static var emptyPreview: CartModel {
        CartModel()
    }

    static var loadingPreview: CartModel {
        let model = CartModel()
        model.isLoading = true
        return model
    }
}

#Preview("With Items") {
    CartView()
        .environment(CartModel.preview)
}

#Preview("Empty") {
    CartView()
        .environment(CartModel.emptyPreview)
}

#Preview("Loading") {
    CartView()
        .environment(CartModel.loadingPreview)
}
```

### Preview with Environment Dependencies

Inject any environment values the view depends on so the preview reflects a realistic runtime context:

```swift
#Preview {
    OrderDetailView(order: .sample)
        .environment(CartModel.preview)
        .environment(\.locale, Locale(identifier: "ja_JP"))
        .environment(\.dynamicTypeSize, .xxxLarge)
}
```

### Mocking Async Data Sources

When a view depends on a network or data service, give the dependency a protocol abstraction so previews can inject a synchronous mock that returns sample data immediately. This is one approach — adapt it to whatever pattern the surrounding codebase already uses.

```swift
protocol DataFetching {
    func fetchItems() async throws -> [Item]
}

struct LiveDataFetcher: DataFetching {
    let url: URL

    func fetchItems() async throws -> [Item] {
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Item].self, from: data)
    }
}

struct MockDataFetcher: DataFetching {
    var result: Result<[Item], Error> = .success(Item.samples)

    func fetchItems() async throws -> [Item] {
        try result.get()
    }
}

#Preview {
    ItemListView(fetcher: MockDataFetcher())
}

#Preview("Error State") {
    ItemListView(fetcher: MockDataFetcher(result: .failure(URLError(.notConnectedToInternet))))
}
```

---

## @Previewable Property Wrappers

`@Previewable` (iOS 18+, Xcode 16+) lets you use `@State`, `@FocusState`, and other property wrappers directly inside a `#Preview` block, removing the need for a wrapper view to host interactive state.

### Interactive State

```swift
// @Previewable: interactive toggle inline in the preview
#Preview {
    @Previewable @State var isOn = false
    Toggle("Notifications", isOn: $isOn)
}

// Without @Previewable: requires a wrapper view
struct TogglePreviewWrapper: View {
    @State private var isOn = false
    var body: some View {
        Toggle("Notifications", isOn: $isOn)
    }
}

#Preview {
    TogglePreviewWrapper()
}
```

### Multiple Interactive Controls

```swift
#Preview {
    @Previewable @State var name = "Alice"
    @Previewable @State var age = 25.0

    VStack {
        TextField("Name", text: $name)
        Slider(value: $age, in: 0...100, step: 1) {
            Text("Age: \(Int(age))")
        }
        Text("Hello, \(name)! Age: \(Int(age))")
    }
    .padding()
}
```

### @Previewable with @FocusState

When seeding initial focus inside a preview, prefer `.defaultFocus` over writing to `@FocusState` from `.onAppear`. `.onAppear` can race the initial render and the focus assignment may be lost. See `focus-patterns.md` for the underlying rationale.

```swift
#Preview {
    @Previewable @FocusState var isFocused: Bool

    TextField("Search", text: .constant(""))
        .focused($isFocused)
        .defaultFocus($isFocused, true)
}
```

### Fallback for Pre-iOS 18 Targets

If the project's minimum deployment target is below iOS 18, `@Previewable` is unavailable. Fall back to a wrapper view:

```swift
private struct SliderPreview: View {
    @State private var value = 0.5
    var body: some View {
        CustomSlider(value: $value)
    }
}

#Preview {
    SliderPreview()
}
```

---

## Common Diagnostics

| Symptom | Cause | Fix |
|---|---|---|
| `#Preview` body type mismatch | The closure returns a non-`View` type | Make sure the final expression is a `View` |
| `@Previewable` only available in iOS 18+ | Using `@Previewable` with a lower deployment target | Use a wrapper view, or gate with `#available` |
| Preview crashes with "missing environment" | An `@Environment(SomeType.self)` value is not injected | Add `.environment(SomeType.preview)` to the preview |
| Preview hangs or renders blank | View depends on async data that never resolves | Inject a mock that returns immediately with sample data |
| `@MainActor`-isolated model accessed from non-isolated context | A preview helper touches main-actor-only API off the main actor | Mark the helper or the preview body `@MainActor` |

---

## Summary Checklist

- [ ] Prefer `#Preview` for new previews; `PreviewProvider` is still valid for older code
- [ ] Provide a named preview for each meaningful state (default, empty, error, loading)
- [ ] Use `@Previewable` for interactive previews when targeting iOS 18+; wrapper views otherwise
- [ ] Expose static `.sample` / `.preview` data on models so previews don't reconstruct values inline
- [ ] Inject mock services through a protocol when a view depends on async data
- [ ] Never depend on live network or disk I/O in a preview
- [ ] Prefer `.defaultFocus` over `.onAppear` writes when seeding `@FocusState` in previews
