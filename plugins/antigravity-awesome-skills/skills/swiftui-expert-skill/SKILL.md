---
name: swiftui-expert-skill
description: Write, review, or improve SwiftUI code following best practices for state management, view composition, performance, and iOS 26+ Liquid Glass adoption. Use when building new SwiftUI features, refactoring existing views, reviewing code quality, or adopting modern SwiftUI patterns.
risk: unknown
source: community
---

# SwiftUI Expert Skill

## When to Use
- You are building, reviewing, or refactoring SwiftUI code and need current best practices.
- The task involves state management, view composition, performance, accessibility, or iOS 26+ Liquid Glass adoption.
- You need a fact-based SwiftUI guidance layer without locking into a specific application architecture.

## Overview
Use this skill to build, review, or improve SwiftUI features with correct state management, optimal view composition, and iOS 26+ Liquid Glass styling. Prioritize native APIs, Apple design guidance, and performance-conscious patterns. This skill focuses on facts and best practices without enforcing specific architectural patterns.

## Workflow Decision Tree

### 1) Review existing SwiftUI code
- **First, consult `references/latest-apis.md`** to ensure only current, non-deprecated APIs are used
- Check property wrapper usage against the selection guide (see `references/state-management.md`)
- Verify view composition follows extraction rules (see `references/view-structure.md`)
- Check performance patterns are applied (see `references/performance-patterns.md`)
- Verify list patterns use stable identity (see `references/list-patterns.md`)
- Check animation patterns for correctness (see `references/animation-basics.md`, `references/animation-transitions.md`)
- Review accessibility: proper grouping, traits, Dynamic Type support (see `references/accessibility-patterns.md`)
- Inspect Liquid Glass usage for correctness and consistency (see `references/liquid-glass.md`)
- Validate iOS 26+ availability handling with sensible fallbacks

### 2) Improve existing SwiftUI code
- **First, consult `references/latest-apis.md`** to replace any deprecated APIs with their modern equivalents
- Audit state management for correct wrapper selection (see `references/state-management.md`)
- Extract complex views into separate subviews (see `references/view-structure.md`)
- Refactor hot paths to minimize redundant state updates (see `references/performance-patterns.md`)
- Ensure ForEach uses stable identity (see `references/list-patterns.md`)
- Improve animation patterns (use value parameter, proper transitions, see `references/animation-basics.md`, `references/animation-transitions.md`)
- Improve accessibility: use `Button` over tap gestures, add `@ScaledMetric` for Dynamic Type (see `references/accessibility-patterns.md`)
- Suggest image downsampling when `UIImage(data:)` is used (as optional optimization, see `references/image-optimization.md`)
- Adopt Liquid Glass only when explicitly requested by the user

### 3) Implement new SwiftUI feature
- **First, consult `references/latest-apis.md`** to use only current, non-deprecated APIs for the target deployment version
- Design data flow first: identify owned vs injected state (see `references/state-management.md`)
- Structure views for optimal diffing (extract subviews early, see `references/view-structure.md`)
- Keep business logic in services and models for testability (see `references/layout-best-practices.md`)
- Use correct animation patterns (implicit vs explicit, transitions, see `references/animation-basics.md`, `references/animation-transitions.md`, `references/animation-advanced.md`)
- Use `Button` for tappable elements, add accessibility grouping and labels (see `references/accessibility-patterns.md`)
- Apply glass effects after layout/appearance modifiers (see `references/liquid-glass.md`)
- Gate iOS 26+ features with `#available` and provide fallbacks

## Core Guidelines

### State Management
- `@State` must be `private`; use for internal view state
- `@Binding` only when a child needs to **modify** parent state
- `@StateObject` when view **creates** the object; `@ObservedObject` when **injected**
- iOS 17+: Use `@State` with `@Observable` classes; use `@Bindable` for injected observables needing bindings
- Use `let` for read-only values; `var` + `.onChange()` for reactive reads
- Never pass values into `@State` or `@StateObject` — they only accept initial values
- Nested `ObservableObject` doesn't propagate changes — pass nested objects directly; `@Observable` handles nesting fine

### View Composition
- Extract complex views into separate subviews for better readability and performance
- Prefer modifiers over conditional views for state changes (maintains view identity)
- Keep view `body` simple and pure (no side effects or complex logic)
- Use `@ViewBuilder` functions only for small, simple sections
- Prefer `@ViewBuilder let content: Content` over closure-based content properties
- Keep business logic in services and models; views should orchestrate UI flow
- Action handlers should reference methods, not contain inline logic
- Views should work in any context (don't assume screen size or presentation style)

### Performance
- Pass only needed values to views (avoid large "config" or "context" objects)
- Eliminate unnecessary dependencies to reduce update fan-out
- Check for value changes before assigning state in hot paths
- Avoid redundant state updates in `onReceive`, `onChange`, scroll handlers
- Minimize work in frequently executed code paths
- Use `LazyVStack`/`LazyHStack` for large lists
- Use stable identity for `ForEach` (never `.indices` for dynamic content)
- Ensure constant number of views per `ForEach` element
- Avoid inline filtering in `ForEach` (prefilter and cache)
- Avoid `AnyView` in list rows
- Consider POD views for fast diffing (or wrap expensive views in POD parents)
- Suggest image downsampling when `UIImage(data:)` is encountered (as optional optimization)
- Avoid layout thrash (deep hierarchies, excessive `GeometryReader`)
- Gate frequent geometry updates by thresholds
- Use `Self._logChanges()` or `Self._printChanges()` to debug unexpected view updates

### Animations
- Use `.animation(_:value:)` with value parameter (deprecated version without value is too broad)
- Use `withAnimation` for event-driven animations (button taps, gestures)
- Prefer transforms (`offset`, `scale`, `rotation`) over layout changes (`frame`) for performance
- Transitions require animations outside the conditional structure
- Custom `Animatable` implementations must have explicit `animatableData`
- Use `.phaseAnimator` for multi-step sequences (iOS 17+)
- Use `.keyframeAnimator` for precise timing control (iOS 17+)
- Animation completion handlers need `.transaction(value:)` for reexecution
- Implicit animations override explicit animations (later in view tree wins)

### Accessibility
- Prefer `Button` over `onTapGesture` for tappable elements (free VoiceOver support)
- Use `@ScaledMetric` for custom numeric values that should scale with Dynamic Type
- Group related elements with `accessibilityElement(children: .combine)` for joined labels
- Provide `accessibilityLabel` when default labels are unclear or missing
- Use `accessibilityRepresentation` for custom controls that should behave like native ones

### Liquid Glass (iOS 26+)
**Only adopt when explicitly requested by the user.**
- Use native `glassEffect`, `GlassEffectContainer`, and glass button styles
- Wrap multiple glass elements in `GlassEffectContainer`
- Apply `.glassEffect()` after layout and visual modifiers
- Use `.interactive()` only for tappable/focusable elements
- Use `glassEffectID` with `@Namespace` for morphing transitions

## Quick Reference

### Property Wrapper Selection
| Wrapper | Use When |
|---------|----------|
| `@State` | Internal view state (must be `private`) |
| `@Binding` | Child modifies parent's state |
| `@StateObject` | View owns an `ObservableObject` |
| `@ObservedObject` | View receives an `ObservableObject` |
| `@Bindable` | iOS 17+: Injected `@Observable` needing bindings |
| `let` | Read-only value from parent |
| `var` | Read-only value watched via `.onChange()` |

### Liquid Glass Patterns
```swift
// Basic glass effect with fallback
if #available(iOS 26, *) {
    content
        .padding()
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 16))
} else {
    content
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
}

// Grouped glass elements
GlassEffectContainer(spacing: 24) {
    HStack(spacing: 24) {
        GlassButton1()
        GlassButton2()
    }
}

// Glass buttons
Button("Confirm") { }
    .buttonStyle(.glassProminent)
```

## Review Checklist

### Latest APIs (see `references/latest-apis.md`)
- [ ] No deprecated modifiers used (check against the quick lookup table)
- [ ] API choices match the project's minimum deployment target

### State Management
- [ ] `@State` properties are `private`
- [ ] `@Binding` only where child modifies parent state
- [ ] `@StateObject` for owned, `@ObservedObject` for injected
- [ ] iOS 17+: `@State` with `@Observable`, `@Bindable` for injected
- [ ] Passed values NOT declared as `@State` or `@StateObject`
- [ ] Nested `ObservableObject` avoided (or passed directly to child views)

### Sheets & Navigation (see `references/sheet-navigation-patterns.md`)
- [ ] Using `.sheet(item:)` for model-based sheets
- [ ] Sheets own their actions and dismiss internally

### ScrollView (see `references/scroll-patterns.md`)
- [ ] Using `ScrollViewReader` with stable IDs for programmatic scrolling

### View Structure (see `references/view-structure.md`)
- [ ] Using modifiers instead of conditionals for state changes
- [ ] Complex views extracted to separate subviews
- [ ] Container views use `@ViewBuilder let content: Content`

### Performance (see `references/performance-patterns.md`)
- [ ] View `body` kept simple and pure (no side effects)
- [ ] Passing only needed values (not large config objects)
- [ ] Eliminating unnecessary dependencies
- [ ] State updates check for value changes before assigning
- [ ] Hot paths minimize state updates
- [ ] No object creation in `body`
- [ ] Heavy computation moved out of `body`

### List Patterns (see `references/list-patterns.md`)
- [ ] ForEach uses stable identity (not `.indices`)
- [ ] Constant number of views per ForEach element
- [ ] No inline filtering in ForEach
- [ ] No `AnyView` in list rows

### Layout (see `references/layout-best-practices.md`)
- [ ] Avoiding layout thrash (deep hierarchies, excessive GeometryReader)
- [ ] Gating frequent geometry updates by thresholds
- [ ] Business logic kept in services and models (not in views)
- [ ] Action handlers reference methods (not inline logic)
- [ ] Using relative layout (not hard-coded constants)
- [ ] Views work in any context (context-agnostic)

### Animations (see `references/animation-basics.md`, `references/animation-transitions.md`, `references/animation-advanced.md`)
- [ ] Using `.animation(_:value:)` with value parameter
- [ ] Using `withAnimation` for event-driven animations
- [ ] Transitions paired with animations outside conditional structure
- [ ] Custom `Animatable` has explicit `animatableData` implementation
- [ ] Preferring transforms over layout changes for animation performance
- [ ] Phase animations for multi-step sequences (iOS 17+)
- [ ] Keyframe animations for precise timing (iOS 17+)
- [ ] Completion handlers use `.transaction(value:)` for reexecution

### Accessibility (see `references/accessibility-patterns.md`)
- [ ] `Button` used instead of `onTapGesture` for tappable elements
- [ ] `@ScaledMetric` used for custom values that should scale with Dynamic Type
- [ ] Related elements grouped with `accessibilityElement(children:)`
- [ ] Custom controls use `accessibilityRepresentation` when appropriate

### Liquid Glass (iOS 26+)
- [ ] `#available(iOS 26, *)` with fallback for Liquid Glass
- [ ] Multiple glass views wrapped in `GlassEffectContainer`
- [ ] `.glassEffect()` applied after layout/appearance modifiers
- [ ] `.interactive()` only on user-interactable elements
- [ ] Shapes and tints consistent across related elements

## References
- `references/latest-apis.md` - **Required reading for all workflows.** Version-segmented guide of deprecated-to-modern API transitions (iOS 15+ through iOS 26+)
- `references/state-management.md` - Property wrappers and data flow
- `references/view-structure.md` - View composition, extraction, and container patterns
- `references/performance-patterns.md` - Performance optimization techniques and anti-patterns
- `references/list-patterns.md` - ForEach identity, stability, and list best practices
- `references/layout-best-practices.md` - Layout patterns, context-agnostic views, and testability
- `references/accessibility-patterns.md` - Accessibility traits, grouping, Dynamic Type, and VoiceOver
- `references/animation-basics.md` - Core animation concepts, implicit/explicit animations, timing, performance
- `references/animation-transitions.md` - Transitions, custom transitions, Animatable protocol
- `references/animation-advanced.md` - Transactions, phase/keyframe animations (iOS 17+), completion handlers (iOS 17+)
- `references/sheet-navigation-patterns.md` - Sheet presentation and navigation patterns
- `references/scroll-patterns.md` - ScrollView patterns and programmatic scrolling
- `references/image-optimization.md` - AsyncImage, image downsampling, and optimization
- `references/liquid-glass.md` - iOS 26+ Liquid Glass API

## Philosophy

This skill focuses on **facts and best practices**, not architectural opinions:
- We don't enforce specific architectures (e.g., MVVM, VIPER)
- We do encourage separating business logic for testability
- We optimize for performance and maintainability
- We follow Apple's Human Interface Guidelines and API design patterns

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
