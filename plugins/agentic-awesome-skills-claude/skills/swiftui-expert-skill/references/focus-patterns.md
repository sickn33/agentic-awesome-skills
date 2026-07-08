# SwiftUI Focus Patterns Reference

## Table of Contents

- [@FocusState](#focusstate)
- [Making Views Focusable](#making-views-focusable)
- [Focused Values for Commands and Menus](#focused-values-for-commands-and-menus)
- [Default Focus](#default-focus)
- [Focus Scope and Sections](#focus-scope-and-sections)
- [Focus Effects](#focus-effects)
- [Search Focus](#search-focus)
- [Common Pitfalls](#common-pitfalls)

## @FocusState

Always mark `@FocusState` as `private`. Use `Bool` for a single field, an optional `Hashable` enum for multiple fields.

### Single field

```swift
@FocusState private var isFocused: Bool

TextField("Email", text: $email)
    .focused($isFocused)
```

### Multiple fields

```swift
enum Field: Hashable { case name, email, password }
@FocusState private var focusedField: Field?

TextField("Name", text: $name)
    .focused($focusedField, equals: .name)
TextField("Email", text: $email)
    .focused($focusedField, equals: .email)
```

Set `focusedField = .email` to move focus programmatically; set `nil` to dismiss the keyboard.

### `focused(_:)` vs `focused(_:equals:)` with nested views

`.focused($bool)` reports `true` when the modified view *or any focusable descendant* has focus. `.focused($enum, equals:)` reports its value only when that specific view receives focus.

```swift
enum Focus: Hashable { case container, field }
@FocusState private var focus: Focus?

VStack {
    TextField("Name", text: $name)
        .focused($focus, equals: .field)
}
.focusable()
.focused($focus, equals: .container)
```

With `focused(_:equals:)` and a single `@FocusState`, SwiftUI distinguishes the container *receiving* focus from the container merely *containing* focus.

### `isFocused` environment value

Read-only environment value that returns `true` when the nearest focusable ancestor has focus. Useful for styling non-focusable child views.

```swift
struct HighlightWrapper: View {
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        content
            .background(isFocused ? Color.accentColor.opacity(0.1) : .clear)
    }
}
```

## Making Views Focusable

### `.focusable(_:)`

Makes a non-text-input view participate in the focus system. Focused views can respond to keyboard events via `onKeyPress` and menu commands like Edit > Delete via `onDeleteCommand`.

```swift
struct SelectableCard: View {
    @FocusState private var isFocused: Bool

    var body: some View {
        CardContent()
            .focusable()
            .focused($isFocused)
            .border(isFocused ? Color.accentColor : .clear)
            .onDeleteCommand { deleteCard() }
    }
}
```

### `.focusable(_:interactions:)` (iOS 17+)

Controls which focus-driven interactions the view supports via `FocusInteractions`:

- `.activate` -- Button-like: only focusable when system-wide keyboard navigation is on (macOS/iOS)
- `.edit` -- Captures keyboard/Digital Crown input
- `.automatic` -- Platform default (both activate and edit)

```swift
MyTapGestureView(...)
    .focusable(interactions: .activate)
```

Use `.activate` for custom button-like views that should match system keyboard-navigation behavior.

## Focused Values for Commands and Menus

Focused values let parent views (App, Scene, Commands) read state from whichever view currently has focus. Use for enabling/disabling menu commands based on the focused document or selection.

### Declare with `@Entry`

```swift
extension FocusedValues {
    @Entry var selectedDocument: Binding<Document>?
}
```

Focused values are typically optional (default is `nil` when no view publishes them), but you can also use non-optional entries when you have a sensible default value.

### Publish from views

```swift
// View-scoped: available when this view (or descendant) has focus
.focusedValue(\.selectedDocument, $document)

// Scene-scoped: available when this scene has focus
.focusedSceneValue(\.selectedDocument, $document)
```

### Consume in commands

`@FocusedValue` reads the value; `@FocusedBinding` unwraps a `Binding` automatically.

```swift
@main
struct MyApp: App {
    @FocusedBinding(\.selectedDocument) var document

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandGroup(after: .pasteboard) {
                Button("Duplicate") { document?.duplicate() }
                    .disabled(document == nil)
            }
        }
    }
}
```

### `@FocusedObject` (iOS 16+)

For `ObservableObject` types. The view invalidates when the focused object changes.

```swift
// Publish
.focusedObject(myObservableModel)

// Consume
@FocusedObject var model: MyModel?
```

Scene-scoped variant: `.focusedSceneObject(_:)`.

## Default Focus

### `.defaultFocus(_:_:priority:)` (iOS 17+, macOS 13+, tvOS 16+)

Prefer `.defaultFocus` over setting `@FocusState` in `onAppear` for initial focus placement.

```swift
@FocusState private var focusedField: Field?

VStack {
    TextField("Name", text: $name)
        .focused($focusedField, equals: .name)
    TextField("Email", text: $email)
        .focused($focusedField, equals: .email)
}
.defaultFocus($focusedField, .email)
```

**Priority**: `.automatic` (default) applies on window appearance and programmatic focus changes. `.userInitiated` also applies during user-driven focus navigation.

### `prefersDefaultFocus(_:in:)` (macOS/tvOS/watchOS)

Used with `.focusScope(_:)` to mark a preferred default target within a scoped region.

### `resetFocus` environment action (macOS/tvOS/watchOS)

Re-evaluates default focus within a namespace.

```swift
@Namespace var scopeID
@Environment(\.resetFocus) private var resetFocus

Button("Reset") { resetFocus(in: scopeID) }
```

## Focus Scope and Sections

### `.focusScope(_:)` (macOS/tvOS/watchOS)

Limits default focus preferences to a namespace. Use with `prefersDefaultFocus` and `resetFocus`.

### `.focusSection()` (macOS 13+, tvOS 15+)

Guides directional and sequential focus movement through a group of focusable descendants. Useful when focusable views are spatially separated and directional navigation would otherwise skip them.

```swift
HStack {
    VStack { Button("1") {}; Button("2") {}; Spacer() }
    Spacer()
    VStack { Spacer(); Button("A") {}; Button("B") {} }
        .focusSection()
}
```

Without `.focusSection()`, swiping right from buttons 1/2 finds nothing. With it, the VStack receives directional focus and delivers it to its first focusable child.

## Focus Effects

### `.focusEffectDisabled(_:)`

Suppresses the system focus ring (macOS) or hover effect. Use when providing custom focus visuals.

```swift
MyCustomCard()
    .focusable()
    .focusEffectDisabled()
    .overlay { customFocusRing }
```

`isFocusEffectEnabled` environment value reads the current state.

## Search Focus

### `.searchFocused(_:)` / `.searchFocused(_:equals:)`

Bind focus state to the search field associated with the nearest `.searchable` modifier. Works like `.focused` but targets the search bar.

```swift
@FocusState private var isSearchFocused: Bool

NavigationStack {
    ContentView()
        .searchable(text: $query)
        .searchFocused($isSearchFocused)
}

// Programmatically focus the search bar
Button("Search") { isSearchFocused = true }
```

## Common Pitfalls

### Redundant `@FocusState` writes revoke focus

`.focusable()` + `.focused()` handles focus-on-click natively. Adding a tap gesture that *also* writes to `@FocusState` triggers a redundant state write, causing a second body evaluation that revokes focus. The result: focus briefly appears then disappears, and key commands like `onDeleteCommand` stop working.

```swift
// WRONG -- tap gesture redundantly sets focus, causing double evaluation
CardView()
    .focusable()
    .focused($isFocused)
    .onTapGesture { isFocused = true }  // Remove this line

// CORRECT -- let .focusable() + .focused() handle it
CardView()
    .focusable()
    .focused($isFocused)
```

### Ambiguous focus bindings

Binding the same enum case to multiple views is ambiguous. SwiftUI picks the first candidate and emits a runtime warning.

```swift
// WRONG -- .name bound to two views
TextField("Name", text: $name)
    .focused($focusedField, equals: .name)
TextField("Full Name", text: $fullName)
    .focused($focusedField, equals: .name)  // ambiguous
```

Always use distinct enum cases for each focusable view.

### `.onAppear` focus timing

Setting `@FocusState` in `.onAppear` may fail if the view tree hasn't settled. Prefer `.defaultFocus` (iOS 17+) for reliable initial focus. If you must use `.onAppear`, wrap in `DispatchQueue.main.async` as a last resort.

### Missing `.focusable()` for non-text views

`TextField` and `SecureField` are implicitly focusable. Custom views (stacks, shapes, images) are not. Forgetting `.focusable()` means `.focused()` bindings have no effect and key event handlers never fire.
