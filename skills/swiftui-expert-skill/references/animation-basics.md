# SwiftUI Animation Basics

Core animation concepts, implicit vs explicit animations, timing curves, and performance patterns.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Implicit Animations](#implicit-animations)
- [Explicit Animations](#explicit-animations)
- [Animation Placement](#animation-placement)
- [Selective Animation](#selective-animation)
- [Timing Curves](#timing-curves)
- [Animation Performance](#animation-performance)
- [Disabling Animations](#disabling-animations)
- [Debugging](#debugging)

---

## Core Concepts

State changes trigger view updates. SwiftUI provides mechanisms to animate these changes.

**Animation Process:**
1. State change triggers view tree re-evaluation
2. SwiftUI compares new tree to current render tree
3. Animatable properties are identified and interpolated (~60 fps)

**Key Characteristics:**
- Animations are additive and cancelable
- Always start from current render tree state
- Blend smoothly when interrupted

---

## Implicit Animations

Use `.animation(_:value:)` to animate when a specific value changes.

```swift
// GOOD - uses value parameter
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .animation(.spring, value: isExpanded)
    .onTapGesture { isExpanded.toggle() }

// BAD - deprecated, animates all changes unexpectedly
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .animation(.spring)  // Deprecated!
```

---

## Explicit Animations

Use `withAnimation` for event-driven state changes.

```swift
// GOOD - explicit animation
Button("Toggle") {
    withAnimation(.spring) {
        isExpanded.toggle()
    }
}

// BAD - no animation context
Button("Toggle") {
    isExpanded.toggle()  // Abrupt change
}
```

**When to use which:**
- **Implicit**: Animations tied to specific value changes, precise view tree scope
- **Explicit**: Event-driven animations (button taps, gestures)

---

## Animation Placement

Place animation modifiers after the properties they should animate.

```swift
// GOOD - animation after properties
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .foregroundStyle(isExpanded ? .blue : .red)
    .animation(.default, value: isExpanded)  // Animates both

// BAD - animation before properties
Rectangle()
    .animation(.default, value: isExpanded)  // Too early!
    .frame(width: isExpanded ? 200 : 100, height: 50)
```

---

## Selective Animation

Animate only specific properties using multiple animation modifiers or scoped animations.

```swift
// GOOD - selective animation
Rectangle()
    .frame(width: isExpanded ? 200 : 100, height: 50)
    .animation(.spring, value: isExpanded)  // Animate size
    .foregroundStyle(isExpanded ? .blue : .red)
    .animation(nil, value: isExpanded)  // Don't animate color

// iOS 17+ scoped animation
Rectangle()
    .foregroundStyle(isExpanded ? .blue : .red)  // Not animated
    .animation(.spring) {
        $0.frame(width: isExpanded ? 200 : 100, height: 50)  // Animated
    }
```

---

## Timing Curves

### Built-in Curves

| Curve | Use Case |
|-------|----------|
| `.spring` | Interactive elements, most UI |
| `.easeInOut` | Appearance changes |
| `.bouncy` | Playful feedback (iOS 17+) |
| `.linear` | Progress indicators only |

### Modifiers

```swift
.animation(.default.speed(2.0), value: flag)  // 2x faster
.animation(.default.delay(0.5), value: flag)  // Delayed start
.animation(.default.repeatCount(3, autoreverses: true), value: flag)
```

### Good vs Bad Timing

```swift
// GOOD - appropriate timing for interaction type
Button("Tap") {
    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
        isActive.toggle()
    }
}
.scaleEffect(isActive ? 0.95 : 1.0)

// BAD - too slow for button feedback
Button("Tap") {
    withAnimation(.easeInOut(duration: 1.0)) {  // Way too slow!
        isActive.toggle()
    }
}

// BAD - linear feels robotic
Rectangle()
    .animation(.linear(duration: 0.5), value: isActive)  // Mechanical
```

---

## Animation Performance

### Prefer Transforms Over Layout

```swift
// GOOD - GPU accelerated transforms
Rectangle()
    .frame(width: 100, height: 100)
    .scaleEffect(isActive ? 1.5 : 1.0)  // Fast
    .offset(x: isActive ? 50 : 0)        // Fast
    .rotationEffect(.degrees(isActive ? 45 : 0))  // Fast
    .animation(.spring, value: isActive)

// BAD - layout changes are expensive
Rectangle()
    .frame(width: isActive ? 150 : 100, height: isActive ? 150 : 100)  // Expensive
    .padding(isActive ? 50 : 0)  // Expensive
```

### Narrow Animation Scope

```swift
// GOOD - animation scoped to specific subview
VStack {
    HeaderView()  // Not affected
    ExpandableContent(isExpanded: isExpanded)
        .animation(.spring, value: isExpanded)  // Only this
    FooterView()  // Not affected
}

// BAD - animation at root
VStack {
    HeaderView()
    ExpandableContent(isExpanded: isExpanded)
    FooterView()
}
.animation(.spring, value: isExpanded)  // Animates everything
```

### Avoid Animation in Hot Paths

```swift
// GOOD - gate by threshold
.onPreferenceChange(ScrollOffsetKey.self) { offset in
    let shouldShow = offset.y < -50
    if shouldShow != showTitle {  // Only when crossing threshold
        withAnimation(.easeOut(duration: 0.2)) {
            showTitle = shouldShow
        }
    }
}

// BAD - animating every scroll change
.onPreferenceChange(ScrollOffsetKey.self) { offset in
    withAnimation {  // Fires constantly!
        self.offset = offset.y
    }
}
```

---

## Disabling Animations

```swift
// GOOD - disable with transaction
Text("Count: \(count)")
    .transaction { $0.animation = nil }

// GOOD - disable from parent context
DataView()
    .transaction { $0.disablesAnimations = true }

// BAD - hacky zero duration
Text("Count: \(count)")
    .animation(.linear(duration: 0), value: count)  // Hacky
```

---

## Debugging

```swift
// Slow down for inspection
#if DEBUG
.animation(.linear(duration: 3.0).speed(0.2), value: isExpanded)
#else
.animation(.spring, value: isExpanded)
#endif

// Debug modifier to log values
struct AnimationDebugModifier: ViewModifier, Animatable {
    var value: Double
    var animatableData: Double {
        get { value }
        set {
            value = newValue
            print("Animation: \(newValue)")
        }
    }
    func body(content: Content) -> some View {
        content.opacity(value)
    }
}
```

---

## Quick Reference

### Do
- Use `.animation(_:value:)` with value parameter
- Use `withAnimation` for event-driven animations
- Prefer transforms over layout changes
- Scope animations narrowly
- Choose appropriate timing curves

### Don't
- Use deprecated `.animation(_:)` without value
- Animate layout properties in hot paths
- Apply broad animations at root level
- Use linear timing for UI (feels robotic)
- Animate on every frame in scroll handlers
