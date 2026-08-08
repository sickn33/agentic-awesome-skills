# SwiftUI State Management Reference

## Table of Contents

- [Property Wrapper Selection Guide](#property-wrapper-selection-guide)
- [@State](#state)
- [Property Wrappers Inside @Observable Classes](#property-wrappers-inside-observable-classes)
- [Make @Observable Property Types Equatable](#make-observable-property-types-equatable)
- [@Observable Dependency Granularity](#observable-dependency-granularity)
- [@Binding](#binding)
- [@FocusState](#focusstate)
- [@StateObject vs @ObservedObject (Legacy - Pre-iOS 17)](#stateobject-vs-observedobject-legacy---pre-ios-17)
- [Don't Pass Values as @State](#dont-pass-values-as-state)
- [@Bindable (iOS 17+)](#bindable-ios-17)
- [let vs var for Passed Values](#let-vs-var-for-passed-values)
- [Environment and Preferences](#environment-and-preferences)
- [Decision Flowchart](#decision-flowchart)
- [State Privacy Rules](#state-privacy-rules)
- [Avoid Nested ObservableObject](#avoid-nested-observableobject)
- [Key Principles](#key-principles)

## Property Wrapper Selection Guide

| Wrapper | Use When | Notes |
|---------|----------|-------|
| `@State` | Internal view state that triggers updates | Must be `private` |
| `@Binding` | Child view needs to modify parent's state | Don't use for read-only |
| `@Bindable` | iOS 17+: View receives `@Observable` object and needs bindings | For injected observables |
| `let` | Read-only value passed from parent | Simplest option |
| `var` | Read-only value that child observes via `.onChange()` | For reactive reads |

**Legacy (Pre-iOS 17):**
| Wrapper | Use When | Notes |
|---------|----------|-------|
| `@StateObject` | View owns an `ObservableObject` instance | Use `@State` with `@Observable` instead |
| `@ObservedObject` | View receives an `ObservableObject` from outside | Never create inline |

## @State

Always mark `@State` properties as `private`. Use for internal view state that triggers UI updates.

```swift
// Correct
@State private var isAnimating = false
@State private var selectedTab = 0
```

**Why Private?** Marking state as `private` makes it clear what's created by the view versus what's passed in. It also prevents accidentally passing initial values that will be ignored (see "Don't Pass Values as @State" below).

### iOS 17+ with @Observable (Preferred)

**Always prefer `@Observable` over `ObservableObject`.** With iOS 17's `@Observable` macro, use `@State` instead of `@StateObject`:

```swift
@Observable
@MainActor  // Always mark @Observable classes with @MainActor
final class DataModel {
    var name = "Some Name"
    var count = 0
}

struct MyView: View {
    @State private var model = DataModel()  // Use @State, not @StateObject

    var body: some View {
        VStack {
            TextField("Name", text: $model.name)
            Stepper("Count: \(model.count)", value: $model.count)
        }
    }
}
```

**Critical**: When a view *owns* an `@Observable` object, always use `@State` -- not `let`. Without `@State`, SwiftUI may recreate the instance when a parent view redraws, losing accumulated state. `@State` tells SwiftUI to preserve the instance across view redraws. Using `@State` also provides bindings directly (no need for `@Bindable`).

**Note**: You may want to mark `@Observable` classes with `@MainActor` to ensure thread safety with SwiftUI, unless your project or package uses Default Actor Isolation set to `MainActor`—in which case, the explicit attribute is redundant and can be omitted.

## Property Wrappers Inside @Observable Classes

**Critical**: The `@Observable` macro transforms stored properties to add observation tracking. Property wrappers (like `@AppStorage`, `@SceneStorage`, `@Query`) also transform properties with their own storage. These two transformations conflict, causing a compiler error.

**Always annotate property-wrapper properties with `@ObservationIgnored` inside `@Observable` classes.**

```swift
@Observable
@MainActor
final class SettingsModel {
    // WRONG - compiler error: property wrappers conflict with @Observable
    // @AppStorage("username") var username = ""

    // CORRECT - @ObservationIgnored prevents the conflict
    @ObservationIgnored @AppStorage("username") var username = ""
    @ObservationIgnored @AppStorage("isDarkMode") var isDarkMode = false

    // Regular stored properties work fine with @Observable
    var isLoading = false
}
```

This applies to **any** property wrapper used inside an `@Observable` class, including but not limited to:
- `@AppStorage`
- `@SceneStorage`
- `@Query` (SwiftData)

**Note**: Since `@ObservationIgnored` disables observation tracking for that property, SwiftUI won't detect changes through the Observation framework. However, property wrappers like `@AppStorage` already notify SwiftUI of changes through their own mechanisms (e.g., UserDefaults KVO), so views still update correctly.

**Never remove `@ObservationIgnored`** from property-wrapper properties in `@Observable` classes — doing so causes a compiler error.

## Make @Observable Property Types Equatable

The `@Observable` macro generates a setter that **skips invalidation when the new value equals the current one** — but only when it can compare them, which means only when the property's type is `Equatable`. Without that conformance, every assignment notifies observing views, even when the value is identical. This is an easy win for properties written frequently with the same value (polling, streaming updates, timers).

```swift
// AVOID: not Equatable — every assignment invalidates, even no-op writes
enum DeliveryStatus { case placed, preparing, shipped, delivered }

// PREFER: Equatable lets the generated setter short-circuit redundant writes
enum DeliveryStatus: Equatable { case placed, preparing, shipped, delivered }
```

This applies to collection properties too: an `Array`/`Set`/`Dictionary` is only `Equatable` when its element type is, so a non-`Equatable` element defeats the short-circuit for the whole collection. (The check is emitted into the generated setter as user code, so it applies on every OS that supports `@Observable` when built with current Xcode.)

This is distinct from `Equatable` *views* (see `references/performance-patterns.md`): that conformance lets SwiftUI skip a view's body; this one lets the model skip notifying observers in the first place.

## @Observable Dependency Granularity

Observation tracks reads at the **property** level, not the field level — so reading any part of a compound property establishes a dependency on the whole thing. Three common traps and their fixes:

- **A computed property establishes dependencies transitively.** `var currentUser: User? { users.first { $0.id == currentID } }` reads `users` in its body, so any view reading `currentUser` depends on the entire `users` array. Renaming the access doesn't change what observation tracks.
- **A struct-typed stored property drags the whole struct.** A view reading `session.user.name` depends on `session.user`; editing any other field of `user` invalidates it.
- **An array/collection read drags the whole collection.** Reading one element establishes a dependency on the entire stored collection.

```swift
// PREFER: cache derived values as stored properties, kept in sync in didSet
@MainActor @Observable
final class AppState {
    var users: [User] = [] { didSet { recomputeCurrentUser() } }
    var currentID: User.ID? { didSet { recomputeCurrentUser() } }

    private(set) var currentUser: User?
    private func recomputeCurrentUser() { currentUser = users.first { $0.id == currentID } }
}
```

For struct-typed properties, expose the fields the views actually read as individual properties on the model (each is then tracked separately). When many rows each observe several fields of their element, model each element as its own `@Observable` and have the parent **persist** the instances — see the per-item view model pattern in `references/performance-patterns.md`. Reading several already-narrow properties from one model is fine and does not need splitting.

## @Binding

Use only when child view needs to **modify** parent's state. If child only reads the value, use `let` instead.

```swift
// Parent
struct ParentView: View {
    @State private var isSelected = false

    var body: some View {
        ChildView(isSelected: $isSelected)
    }
}

// Child - will modify the value
struct ChildView: View {
    @Binding var isSelected: Bool

    var body: some View {
        Button("Toggle") {
            isSelected.toggle()
        }
    }
}
```

### When NOT to use @Binding

- **Don't use `@Binding` for read-only values.** If the child only displays the value and never modifies it, use `let` instead. `@Binding` adds unnecessary overhead and implies a write contract that doesn't exist.

### Prefer KeyPath Bindings Over Closure Bindings

When you need a binding into a model, prefer a KeyPath/subscript-based binding over a hand-written `Binding(get:set:)` closure. A closure binding allocates a new closure each time `body` runs and can't be compared, which can trigger unnecessary invalidations.

```swift
// BAD - closure binding: heap allocation each body pass, defeats comparison
let binding = Binding(
    get: { model[scoreFor: player] },
    set: { model[scoreFor: player] = $0 }
)
PlayerScoreRow(player: player, score: binding)

// GOOD - project through a subscript with @Bindable
@Bindable var model = model
PlayerScoreRow(player: player, score: $model[scoreFor: player])
```

If no suitable subscript exists, add one (a labeled subscript reads as a clean projection into the model). Reserve closure bindings for cases where no key path or subscript can express the transform.

## @FocusState

See `references/focus-patterns.md` for comprehensive focus management guidance including `@FocusState`, `@FocusedValue`, `.focusable()`, default focus, and common pitfalls.

Always mark `@FocusState` as `private`.

## @StateObject vs @ObservedObject (Legacy - Pre-iOS 17)

**Note**: Always prefer `@Observable` with `@State` for iOS 17+.

The key distinction is **ownership**: `@StateObject` when the view **creates and owns** the object; `@ObservedObject` when the view **receives** it from outside.

```swift
// View creates it → @StateObject
@StateObject private var viewModel = MyViewModel()

// View receives it → @ObservedObject
@ObservedObject var viewModel: MyViewModel
```

**Never** create an `ObservableObject` inline with `@ObservedObject` -- it recreates the instance on every view update.

### @StateObject instantiation in View's initializer

Prefer storing the `@StateObject` in the parent view and passing it down. If you must create one in a custom initializer, pass the expression directly to `StateObject(wrappedValue:)` so the `@autoclosure` prevents redundant allocations:

```swift
// Inside a View's init(movie:):
// WRONG — assigning to a local first defeats @autoclosure
let vm = MovieDetailsViewModel(movie: movie)
_viewModel = StateObject(wrappedValue: vm)

// CORRECT — inline expression defers creation
_viewModel = StateObject(wrappedValue: MovieDetailsViewModel(movie: movie))
```

**Modern Alternative**: Use `@Observable` with `@State` instead.

## Don't Pass Values as @State

**Critical**: Never declare passed values as `@State` or `@StateObject`. They only accept an initial value and ignore subsequent updates from the parent.

```swift
// WRONG - child ignores parent updates
struct ChildView: View {
    @State var item: Item  // Shows initial value forever!
    var body: some View { Text(item.name) }
}

// CORRECT - child receives updates
struct ChildView: View {
    let item: Item  // Or @Binding if child needs to modify
    var body: some View { Text(item.name) }
}
```

**Prevention**: Always mark `@State` and `@StateObject` as `private`. This prevents them from appearing in the generated initializer.

## @Bindable (iOS 17+)

Use when receiving an `@Observable` object from outside and needing bindings:

```swift
@Observable
final class UserModel {
    var name = ""
    var email = ""
}

struct ParentView: View {
    @State private var user = UserModel()

    var body: some View {
        EditUserView(user: user)
    }
}

struct EditUserView: View {
    @Bindable var user: UserModel  // Received from parent, needs bindings

    var body: some View {
        Form {
            TextField("Name", text: $user.name)
            TextField("Email", text: $user.email)
        }
    }
}
```

## let vs var for Passed Values

### Use `let` for read-only display

```swift
struct ProfileHeader: View {
    let username: String
    let avatarURL: URL

    var body: some View {
        HStack {
            AsyncImage(url: avatarURL)
            Text(username)
        }
    }
}
```

### Use `var` when reacting to changes with `.onChange()`

```swift
struct ReactiveView: View {
    var externalValue: Int  // Watch with .onChange()
    @State private var displayText = ""

    var body: some View {
        Text(displayText)
            .onChange(of: externalValue) { oldValue, newValue in
                displayText = "Changed from \(oldValue) to \(newValue)"
            }
    }
}
```

## Environment and Preferences

### @Environment

Access environment values provided by SwiftUI or parent views:

```swift
struct MyView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button("Done") { dismiss() }
            .foregroundStyle(colorScheme == .dark ? .white : .black)
    }
}
```

### Custom Environment Values with @Entry

Use the `@Entry` macro (Xcode 16+, backward compatible to iOS 13) to define custom environment values without boilerplate:

```swift
extension EnvironmentValues {
    @Entry var accentTheme: Theme = .default
}

// Inject
ContentView()
    .environment(\.accentTheme, customTheme)

// Access
struct ThemedView: View {
    @Environment(\.accentTheme) private var theme
}
```

The `@Entry` macro replaces the manual `EnvironmentKey` conformance pattern. It also works with `Transaction`, `ContainerValues`, and `FocusedValues`.

#### Never store closures in custom environment keys

SwiftUI can't reliably compare function values, so a view that reads an environment key holding a closure invalidates on every environment write, even when nothing it cares about changed. Wrapping the closure in a struct doesn't help — the struct still contains an uncomparable closure. The fix is to eliminate the closure: store the data it would have captured as properties and expose the behavior via `callAsFunction` or a method.

```swift
// AVOID: closure in a custom environment key
extension EnvironmentValues {
    @Entry var submit: (String) -> Void = { _ in }
}

// PREFER: a defunctionalized struct (or an @Observable model)
struct SubmitAction { func callAsFunction(_ draft: String) { /* ... */ } }
extension EnvironmentValues {
    @Entry var submit = SubmitAction()
}
```

This rule is for **custom** keys. Framework action types designed to wrap a closure — `\.openURL`, `\.dismiss`, `\.refresh`, and similar — are the intended API and are fine.

#### Keep @Entry default values stable

`@Entry` wraps its default expression in a computed getter, so the default is re-evaluated on every read that falls back to it. If the expression returns a different result each time — a fresh reference like `Model()`, or a runtime value like `Date()` / `UUID()` — readers that use the default invalidate on every unrelated environment write.

```swift
// AVOID: re-allocates Model() on every fallback read
extension EnvironmentValues {
    @Entry var model = Model()
}

// PREFER: back the default with a stable value
extension EnvironmentValues {
    @Entry var model = _defaultModel
    private static let _defaultModel = Model()
}
```

Stable defaults (literals, enum cases, `nil`, or a `static let`-backed instance) need no fix. If readers test the default for an "empty" sentinel, prefer an optional `@Entry var model: Model?` and branch on `if let` instead.

#### Remove unused @Environment reads

Declaring `@Environment(\.someKey)` subscribes the view to that key even if `body` never uses the value, so every write to that key re-evaluates the view for nothing. If the wrapped value isn't referenced anywhere the body reaches, delete the declaration. (The type form `@Environment(Model.self)` is different — observation tracks at the property level, so an unused type-form declaration carries no live invalidation cost.)

### @Environment with @Observable (iOS 17+ - Preferred)

**Always prefer this pattern** for sharing state through the environment:

```swift
@Observable
@MainActor
final class AppState {
    var isLoggedIn = false
}

// Inject
ContentView()
    .environment(AppState())

// Access
struct ChildView: View {
    @Environment(AppState.self) private var appState
}
```

### @EnvironmentObject (Legacy - Pre-iOS 17)

Legacy pattern: inject with `.environmentObject(AppState())`, access with `@EnvironmentObject var appState: AppState`. Prefer `@Observable` with `@Environment` instead.

## Decision Flowchart

```
Is this value owned by this view?
├─ YES: Is it a simple value type?
│       ├─ YES → @State private var
│       └─ NO (class):
│           ├─ Use @Observable → @State private var (mark class @MainActor)
│           └─ Legacy ObservableObject → @StateObject private var
│
└─ NO (passed from parent):
    ├─ Does child need to MODIFY it?
    │   ├─ YES → @Binding var
    │   └─ NO: Does child need BINDINGS to its properties?
    │       ├─ YES (@Observable) → @Bindable var
    │       └─ NO: Does child react to changes?
    │           ├─ YES → var + .onChange()
    │           └─ NO → let
    │
    └─ Is it a legacy ObservableObject from parent?
        └─ YES → @ObservedObject var (consider migrating to @Observable)
```

## State Privacy Rules

**All view-owned state should be `private`:**

```swift
// Correct - clear what's created vs passed
struct MyView: View {
    // Created by view - private
    @State private var isExpanded = false
    @State private var viewModel = ViewModel()
    @AppStorage("theme") private var theme = "light"
    @Environment(\.colorScheme) private var colorScheme

    // Passed from parent - not private
    let title: String
    @Binding var isSelected: Bool
    @Bindable var user: User

    var body: some View {
        // ...
    }
}
```

**Why**: This makes dependencies explicit and improves code completion for the generated initializer.

## Avoid Nested ObservableObject

**Note**: This limitation only applies to `ObservableObject`. `@Observable` fully supports nested observed objects.

SwiftUI can't track changes through nested `ObservableObject` properties. Workaround: pass the nested object directly to child views as `@ObservedObject`. With `@Observable`, nesting works automatically.

## Key Principles

1. **Always prefer `@Observable` over `ObservableObject`** for new code
2. **Mark `@Observable` classes with `@MainActor` for thread safety (unless using default actor isolation)`**
3. Use `@State` with `@Observable` classes (not `@StateObject`)
4. Use `@Bindable` for injected `@Observable` objects that need bindings
5. **Always mark `@State` and `@StateObject` as `private`**
6. **Never declare passed values as `@State` or `@StateObject`**
7. With `@Observable`, nested objects work fine; with `ObservableObject`, pass nested objects directly to child views
8. **Always add `@ObservationIgnored` to property wrappers** (e.g., `@AppStorage`, `@SceneStorage`, `@Query`) inside `@Observable` classes — they conflict with the macro's property transformation
9. **Prefer `Equatable` types for frequently-written `@Observable` properties** so the generated setter skips redundant invalidations
10. **Never store closures in custom environment keys; keep `@Entry` defaults stable** (no `Model()`/`Date()` expressions)
11. **Prefer KeyPath/subscript bindings over closure bindings**
