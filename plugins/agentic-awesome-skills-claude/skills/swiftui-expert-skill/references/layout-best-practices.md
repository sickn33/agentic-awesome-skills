# SwiftUI Layout Best Practices Reference

## Table of Contents

- [Relative Layout Over Constants](#relative-layout-over-constants)
- [Context-Agnostic Views](#context-agnostic-views)
- [Own Your Container](#own-your-container)
- [Layout Performance](#layout-performance)
- [View Logic and Testability](#view-logic-and-testability)
- [Full-Width Views](#full-width-views)
- [Action Handlers](#action-handlers)
- [Summary Checklist](#summary-checklist)

## Relative Layout Over Constants

**Use dynamic layout calculations instead of hard-coded values.**

```swift
// Good - relative to actual layout
GeometryReader { geometry in
    VStack {
        HeaderView()
            .frame(height: geometry.size.height * 0.2)
        ContentView()
    }
}

// Avoid - magic numbers that don't adapt
VStack {
    HeaderView()
        .frame(height: 150)  // Doesn't adapt to different screens
    ContentView()
}
```

**Why**: Hard-coded values don't account for different screen sizes, orientations, or dynamic content (like status bars during phone calls).

## Context-Agnostic Views

**Views should work in any context.** Never assume presentation style or screen size.

```swift
// Good - adapts to given space
struct ProfileCard: View {
    let user: User

    var body: some View {
        VStack {
            Image(user.avatar)
                .resizable()
                .aspectRatio(contentMode: .fit)
            Text(user.name)
            Spacer()
        }
        .padding()
    }
}

// Avoid - assumes full screen
struct ProfileCard: View {
    let user: User

    var body: some View {
        VStack {
            Image(user.avatar)
                .frame(width: UIScreen.main.bounds.width)  // Wrong!
            Text(user.name)
        }
    }
}
```

**Why**: Views should work as full screens, modals, sheets, popovers, or embedded content.

## Own Your Container

**Custom views should own static containers but not lazy/repeatable ones.**

```swift
// Good - owns static container
struct HeaderView: View {
    var body: some View {
        HStack {
            Image(systemName: "star")
            Text("Title")
            Spacer()
        }
    }
}

// Avoid - missing container
struct HeaderView: View {
    var body: some View {
        Image(systemName: "star")
        Text("Title")
        // Caller must wrap in HStack
    }
}

// Good - caller owns lazy container
struct FeedView: View {
    let items: [Item]

    var body: some View {
        LazyVStack {
            ForEach(items) { item in
                ItemRow(item: item)
            }
        }
    }
}
```

## Layout Performance

### Avoid Layout Thrash

**Minimize deep view hierarchies and excessive layout dependencies.**

```swift
// Bad - deep nesting, excessive layout passes
VStack {
    HStack {
        VStack {
            HStack {
                VStack {
                    Text("Deep")
                }
            }
        }
    }
}

// Good - flatter hierarchy
VStack {
    Text("Shallow")
    Text("Structure")
}
```

**Avoid excessive `GeometryReader` and preference chains:**

```swift
// Bad - multiple geometry readers cause layout thrash
GeometryReader { outerGeometry in
    VStack {
        GeometryReader { innerGeometry in
            // Layout recalculates multiple times
        }
    }
}

// Good - single geometry reader or use alternatives (iOS 17+)
containerRelativeFrame(.horizontal) { width, _ in
    width * 0.8
}
```

**Gate frequent geometry updates:**

```swift
// Bad - updates on every pixel change
.onPreferenceChange(ViewSizeKey.self) { size in
    currentSize = size
}

// Good - gate by threshold
.onPreferenceChange(ViewSizeKey.self) { size in
    let difference = abs(size.width - currentSize.width)
    if difference > 10 {  // Only update if significant change
        currentSize = size
    }
}
```

## View Logic and Testability

### Keep Business Logic in Services and Models

**Business logic belongs in services and models, not in views.** Views should stay simple and declarative — orchestrating UI state, not implementing business rules. This makes logic independently testable without requiring view instantiation.

> **iOS 17+**: Use `@Observable` with `@State`.

```swift
@Observable
final class AuthService {
    var email = ""
    var password = ""
    var isValid: Bool {
        !email.isEmpty && password.count >= 8
    }

    func login() async throws {
        // Business logic here — testable without the view
    }
}

struct LoginView: View {
    @State private var authService = AuthService()

    var body: some View {
        Form {
            TextField("Email", text: $authService.email)
            SecureField("Password", text: $authService.password)
            Button("Login") {
                Task {
                    try? await authService.login()
                }
            }
            .disabled(!authService.isValid)
        }
    }
}
```

For iOS 16 and earlier, use `ObservableObject` with `@StateObject` -- see `state-management.md` for the legacy pattern.

Avoid embedding business logic directly in view closures (e.g., validation checks inside a `Button` action). This makes logic untestable without view instantiation.

**Note**: This is about making business logic testable, not about enforcing a specific architecture. The key is that logic lives outside views where it can be tested independently.

## Full-Width Views

**When a single view needs to fill the available width, use `.frame(maxWidth: .infinity, alignment:)` instead of wrapping it in a stack with a `Spacer`.**

```swift
// Good - frame modifier
Text("Hello")
    .frame(maxWidth: .infinity, alignment: .leading)

// Avoid - unnecessary stack and spacer
HStack {
    Text("Hello")
    Spacer()
}
```

**Why**: `.frame(maxWidth:alignment:)` is a single modifier that clearly communicates intent. Wrapping in an `HStack` with a `Spacer` adds an extra container to the view hierarchy for no benefit.

## Action Handlers

**Separate layout from logic.** View body should reference action methods, not contain inline logic.

```swift
// Good - action references method
Button("Publish Project", action: publishService.handlePublish)

// Avoid - multi-line logic in closure
Button("Publish Project") {
    isLoading = true
    apiService.publish(project) { result in /* ... */ }
}
```

## Summary Checklist

- [ ] Use relative layout over hard-coded constants
- [ ] Views work in any context (don't assume screen size)
- [ ] Custom views own static containers
- [ ] Avoid deep view hierarchies (layout thrash)
- [ ] Gate frequent geometry updates by thresholds
- [ ] Business logic kept in services and models (not in views)
- [ ] Action handlers reference methods, not inline logic
- [ ] Use `.frame(maxWidth: .infinity, alignment:)` for full-width views (not `HStack` + `Spacer`)
- [ ] Avoid excessive `GeometryReader` usage
- [ ] Use `containerRelativeFrame()` when appropriate
