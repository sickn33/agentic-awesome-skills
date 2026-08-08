# Theming and dynamic type

## Intent

Provide a clean, scalable theming approach that keeps view code semantic and consistent.

## Core patterns

- Use a single `Theme` object as the source of truth (colors, fonts, spacing).
- Inject theme at the app root and read it via `@Environment(Theme.self)` in views.
- Prefer semantic colors (`primaryBackground`, `secondaryBackground`, `label`, `tint`) instead of raw colors.
- Keep user-facing theme controls in a dedicated settings screen.
- Apply Dynamic Type scaling through custom fonts or `.font(.scaled...)`.

## Example: Theme object

```swift
@MainActor
@Observable
final class Theme {
  var tintColor: Color = .blue
  var primaryBackground: Color = .white
  var secondaryBackground: Color = .gray.opacity(0.1)
  var labelColor: Color = .primary
  var fontSizeScale: Double = 1.0
}
```

## Example: inject at app root

```swift
@main
struct MyApp: App {
  @State private var theme = Theme()

  var body: some Scene {
    WindowGroup {
      AppView()
        .environment(theme)
    }
  }
}
```

## Example: view usage

```swift
struct ProfileView: View {
  @Environment(Theme.self) private var theme

  var body: some View {
    VStack {
      Text("Profile")
        .foregroundStyle(theme.labelColor)
    }
    .background(theme.primaryBackground)
  }
}
```

## Design choices to keep

- Keep theme values semantic and minimal; avoid duplicating system colors.
- Store user-selected theme values in persistent storage if needed.
- Ensure contrast between text and backgrounds.

## Pitfalls

- Avoid sprinkling raw `Color` values in views; it breaks consistency.
- Do not tie theme to a single view’s local state.
- Avoid using `@Environment(\\.colorScheme)` as the only theme control; it should complement your theme.
