# SwiftUI Transitions

Transitions for view insertion/removal, custom transitions, and the Animatable protocol.

## Table of Contents
- [Property Animations vs Transitions](#property-animations-vs-transitions)
- [Basic Transitions](#basic-transitions)
- [Asymmetric Transitions](#asymmetric-transitions)
- [Custom Transitions](#custom-transitions)
- [Identity and Transitions](#identity-and-transitions)
- [The Animatable Protocol](#the-animatable-protocol)

---

## Property Animations vs Transitions

**Property animations**: Interpolate values on views that exist before AND after state change.

**Transitions**: Animate views being inserted or removed from the render tree.

```swift
// Property animation - same view, different properties
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .animation(.spring, value: isExpanded)

// Transition - view inserted/removed
if showDetail {
    DetailView()
        .transition(.scale)
}
```

---

## Basic Transitions

### Critical: Transitions Require Animation Context

```swift
// GOOD - animation outside conditional
VStack {
    Button("Toggle") { showDetail.toggle() }
    if showDetail {
        DetailView()
            .transition(.slide)
    }
}
.animation(.spring, value: showDetail)

// GOOD - explicit animation
Button("Toggle") {
    withAnimation(.spring) {
        showDetail.toggle()
    }
}
if showDetail {
    DetailView()
        .transition(.scale.combined(with: .opacity))
}

// BAD - animation inside conditional (removed with view!)
if showDetail {
    DetailView()
        .transition(.slide)
        .animation(.spring, value: showDetail)  // Won't work on removal!
}

// BAD - no animation context
Button("Toggle") {
    showDetail.toggle()  // No animation
}
if showDetail {
    DetailView()
        .transition(.slide)  // Ignored - just appears/disappears
}
```

### Built-in Transitions

| Transition | Effect |
|------------|--------|
| `.opacity` | Fade in/out (default) |
| `.scale` | Scale up/down |
| `.slide` | Slide from leading edge |
| `.move(edge:)` | Move from specific edge |
| `.offset(x:y:)` | Move by offset amount |

### Combining Transitions

```swift
// Parallel - both simultaneously
.transition(.slide.combined(with: .opacity))

// Chained
.transition(.scale.combined(with: .opacity).combined(with: .offset(y: 20)))
```

---

## Asymmetric Transitions

Different animations for insertion vs removal.

```swift
// GOOD - different animations for insert/remove
if showCard {
    CardView()
        .transition(
            .asymmetric(
                insertion: .scale.combined(with: .opacity),
                removal: .move(edge: .bottom).combined(with: .opacity)
            )
        )
}

// BAD - same transition when different behaviors needed
if showCard {
    CardView()
        .transition(.slide)  // Same both ways - may feel awkward
}
```

---

## Custom Transitions

### Pre-iOS 17

```swift
struct BlurModifier: ViewModifier {
    var radius: CGFloat
    func body(content: Content) -> some View {
        content.blur(radius: radius)
    }
}

extension AnyTransition {
    static func blur(radius: CGFloat) -> AnyTransition {
        .modifier(
            active: BlurModifier(radius: radius),
            identity: BlurModifier(radius: 0)
        )
    }
}

// Usage
.transition(.blur(radius: 10))
```

### iOS 17+ (Transition Protocol)

```swift
struct BlurTransition: Transition {
    var radius: CGFloat

    func body(content: Content, phase: TransitionPhase) -> some View {
        content
            .blur(radius: phase.isIdentity ? 0 : radius)
            .opacity(phase.isIdentity ? 1 : 0)
    }
}

// Usage
.transition(BlurTransition(radius: 10))
```

### Good vs Bad Custom Transitions

```swift
// GOOD - reusable transition
if showContent {
    ContentView()
        .transition(BlurTransition(radius: 10))
}

// BAD - inline logic (won't animate on removal!)
if showContent {
    ContentView()
        .blur(radius: showContent ? 0 : 10)  // Not a transition
        .opacity(showContent ? 1 : 0)
}
```

---

## Identity and Transitions

View identity changes trigger transitions, not property animations.

```swift
// Triggers transition - different branches have different identities
if isExpanded {
    Rectangle().frame(width: 200, height: 50)
} else {
    Rectangle().frame(width: 100, height: 50)
}

// Triggers transition - .id() changes identity
Rectangle()
    .id(flag)  // Different identity when flag changes
    .transition(.scale)

// Property animation - same view, same identity
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .animation(.spring, value: isExpanded)
```

---

## The Animatable Protocol

Enables custom property interpolation during animations.

### Protocol Definition

```swift
protocol Animatable {
    associatedtype AnimatableData: VectorArithmetic
    var animatableData: AnimatableData { get set }
}
```

### Basic Implementation

```swift
// GOOD - explicit animatableData
struct ShakeModifier: ViewModifier, Animatable {
    var shakeCount: Double

    var animatableData: Double {
        get { shakeCount }
        set { shakeCount = newValue }
    }

    func body(content: Content) -> some View {
        content.offset(x: sin(shakeCount * .pi * 2) * 10)
    }
}

extension View {
    func shake(count: Int) -> some View {
        modifier(ShakeModifier(shakeCount: Double(count)))
    }
}

// Usage
Button("Shake") { shakeCount += 3 }
    .shake(count: shakeCount)
    .animation(.default, value: shakeCount)

// BAD - missing animatableData (silent failure!)
struct BadShakeModifier: ViewModifier {
    var shakeCount: Double
    // Missing animatableData! Uses EmptyAnimatableData

    func body(content: Content) -> some View {
        content.offset(x: sin(shakeCount * .pi * 2) * 10)
    }
}
// Animation jumps to final value instead of interpolating
```

### Multiple Properties with AnimatablePair

```swift
// GOOD - AnimatablePair for two properties
struct ComplexModifier: ViewModifier, Animatable {
    var scale: CGFloat
    var rotation: Double

    var animatableData: AnimatablePair<CGFloat, Double> {
        get { AnimatablePair(scale, rotation) }
        set {
            scale = newValue.first
            rotation = newValue.second
        }
    }

    func body(content: Content) -> some View {
        content
            .scaleEffect(scale)
            .rotationEffect(.degrees(rotation))
    }
}

// GOOD - nested AnimatablePair for 3+ properties
struct ThreePropertyModifier: ViewModifier, Animatable {
    var x: CGFloat
    var y: CGFloat
    var rotation: Double

    var animatableData: AnimatablePair<AnimatablePair<CGFloat, CGFloat>, Double> {
        get { AnimatablePair(AnimatablePair(x, y), rotation) }
        set {
            x = newValue.first.first
            y = newValue.first.second
            rotation = newValue.second
        }
    }

    func body(content: Content) -> some View {
        content
            .offset(x: x, y: y)
            .rotationEffect(.degrees(rotation))
    }
}
```

---

## Quick Reference

### Do
- Place transitions outside conditional structures
- Use `withAnimation` or `.animation` outside the `if`
- Implement `animatableData` explicitly for custom Animatable
- Use `AnimatablePair` for multiple animated properties
- Use asymmetric transitions when insert/remove need different effects

### Don't
- Put animation modifiers inside conditionals for transitions
- Forget `animatableData` implementation (silent failure)
- Use inline blur/opacity instead of proper transitions
- Expect property animation when view identity changes
