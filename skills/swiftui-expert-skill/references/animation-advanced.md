# SwiftUI Advanced Animations

Transactions, phase animations (iOS 17+), keyframe animations (iOS 17+), completion handlers (iOS 17+), and `@Animatable` macro (iOS 26+).

## Table of Contents
- [Transactions](#transactions)
- [Phase Animations (iOS 17+)](#phase-animations-ios-17)
- [Keyframe Animations (iOS 17+)](#keyframe-animations-ios-17)
- [Animation Completion Handlers (iOS 17+)](#animation-completion-handlers-ios-17)
- [@Animatable Macro (iOS 26+)](#animatable-macro-ios-26)

---

## Transactions

The underlying mechanism for all animations in SwiftUI.

### Basic Usage

```swift
// withAnimation is shorthand for withTransaction
withAnimation(.default) { flag.toggle() }

// Equivalent explicit transaction
var transaction = Transaction(animation: .default)
withTransaction(transaction) { flag.toggle() }
```

### The .transaction Modifier

```swift
Rectangle()
    .frame(width: flag ? 100 : 50, height: 50)
    .transaction { t in
        t.animation = .default
    }
```

**Note:** This behaves like the deprecated `.animation(_:)` without value parameter - it animates on every state change.

### Animation Precedence

**Implicit animations override explicit animations** (later in view tree wins).

```swift
Button("Tap") {
    withAnimation(.linear) { flag.toggle() }
}
.animation(.bouncy, value: flag)  // .bouncy wins!
```

### Disabling Animations

```swift
// Prevent implicit animations from overriding
.transaction { t in
    t.disablesAnimations = true
}

// Remove animation entirely
.transaction { $0.animation = nil }
```

### Custom Transaction Keys (iOS 17+)

Pass metadata through transactions.

```swift
struct ChangeSourceKey: TransactionKey {
    static let defaultValue: String = "unknown"
}

extension Transaction {
    var changeSource: String {
        get { self[ChangeSourceKey.self] }
        set { self[ChangeSourceKey.self] = newValue }
    }
}

// Set source
var transaction = Transaction(animation: .default)
transaction.changeSource = "server"
withTransaction(transaction) { flag.toggle() }

// Read in view tree
.transaction { t in
    if t.changeSource == "server" {
        t.animation = .smooth
    } else {
        t.animation = .bouncy
    }
}
```

---

## Phase Animations (iOS 17+)

Cycle through discrete phases automatically. Each phase change is a separate animation.

### Basic Usage

```swift
// GOOD - triggered phase animation
Button("Shake") { trigger += 1 }
    .phaseAnimator(
        [0.0, -10.0, 10.0, -5.0, 5.0, 0.0],
        trigger: trigger
    ) { content, offset in
        content.offset(x: offset)
    }

// Infinite loop (no trigger)
Circle()
    .phaseAnimator([1.0, 1.2, 1.0]) { content, scale in
        content.scaleEffect(scale)
    }
```

### Enum Phases (Recommended for Clarity)

```swift
// GOOD - enum phases are self-documenting
enum BouncePhase: CaseIterable {
    case initial, up, down, settle

    var scale: CGFloat {
        switch self {
        case .initial: 1.0
        case .up: 1.2
        case .down: 0.9
        case .settle: 1.0
        }
    }
}

Circle()
    .phaseAnimator(BouncePhase.allCases, trigger: trigger) { content, phase in
        content.scaleEffect(phase.scale)
    }
```

### Custom Timing Per Phase

```swift
.phaseAnimator([0, -20, 20], trigger: trigger) { content, offset in
    content.offset(x: offset)
} animation: { phase in
    switch phase {
    case -20: .bouncy
    case 20: .linear
    default: .smooth
    }
}
```

### Good vs Bad

```swift
// GOOD - use phaseAnimator for multi-step sequences
.phaseAnimator([0, -10, 10, 0], trigger: trigger) { content, offset in
    content.offset(x: offset)
}

// BAD - manual DispatchQueue sequencing
Button("Animate") {
    withAnimation(.easeOut(duration: 0.1)) { offset = -10 }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
        withAnimation { offset = 10 }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
        withAnimation { offset = 0 }
    }
}
```

---

## Keyframe Animations (iOS 17+)

Precise timing control with exact values at specific times.

### Basic Usage

```swift
Button("Bounce") { trigger += 1 }
    .keyframeAnimator(
        initialValue: AnimationValues(),
        trigger: trigger
    ) { content, value in
        content
            .scaleEffect(value.scale)
            .offset(y: value.verticalOffset)
    } keyframes: { _ in
        KeyframeTrack(\.scale) {
            SpringKeyframe(1.2, duration: 0.15)
            SpringKeyframe(0.9, duration: 0.1)
            SpringKeyframe(1.0, duration: 0.15)
        }
        KeyframeTrack(\.verticalOffset) {
            LinearKeyframe(-20, duration: 0.15)
            LinearKeyframe(0, duration: 0.25)
        }
    }

struct AnimationValues {
    var scale: CGFloat = 1.0
    var verticalOffset: CGFloat = 0
}
```

### Keyframe Types

| Type | Behavior |
|------|----------|
| `CubicKeyframe` | Smooth interpolation |
| `LinearKeyframe` | Straight-line interpolation |
| `SpringKeyframe` | Spring physics |
| `MoveKeyframe` | Instant jump (no interpolation) |

### Multiple Synchronized Tracks

Tracks run **in parallel**, each animating one property.

```swift
// GOOD - bell shake with synchronized rotation and scale
struct BellAnimation {
    var rotation: Double = 0
    var scale: CGFloat = 1.0
}

Image(systemName: "bell.fill")
    .keyframeAnimator(
        initialValue: BellAnimation(),
        trigger: trigger
    ) { content, value in
        content
            .rotationEffect(.degrees(value.rotation))
            .scaleEffect(value.scale)
    } keyframes: { _ in
        KeyframeTrack(\.rotation) {
            CubicKeyframe(15, duration: 0.1)
            CubicKeyframe(-15, duration: 0.1)
            CubicKeyframe(10, duration: 0.1)
            CubicKeyframe(-10, duration: 0.1)
            CubicKeyframe(0, duration: 0.1)
        }
        KeyframeTrack(\.scale) {
            CubicKeyframe(1.1, duration: 0.25)
            CubicKeyframe(1.0, duration: 0.25)
        }
    }

// BAD - manual timer-based animation
Image(systemName: "bell.fill")
    .onTapGesture {
        withAnimation(.easeOut(duration: 0.1)) { rotation = 15 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation { rotation = -15 }
        }
        // ... more manual timing - error prone
    }
```

### KeyframeTimeline (iOS 17+)

Query animation values directly for testing or non-SwiftUI use.

```swift
let timeline = KeyframeTimeline(initialValue: AnimationValues()) {
    KeyframeTrack(\.scale) {
        CubicKeyframe(1.2, duration: 0.25)
        CubicKeyframe(1.0, duration: 0.25)
    }
}

let midpoint = timeline.value(time: 0.25)
print(midpoint.scale)  // Value at 0.25 seconds
```

---

## Animation Completion Handlers (iOS 17+)

Execute code when animations finish.

### With withAnimation

```swift
// GOOD - completion with withAnimation
Button("Animate") {
    withAnimation(.spring) {
        isExpanded.toggle()
    } completion: {
        showNextStep = true
    }
}
```

### With Transaction (For Reexecution)

```swift
// GOOD - completion fires on every trigger change
Circle()
    .scaleEffect(bounceCount % 2 == 0 ? 1.0 : 1.2)
    .transaction(value: bounceCount) { transaction in
        transaction.animation = .spring
        transaction.addAnimationCompletion {
            message = "Bounce \(bounceCount) complete"
        }
    }

// BAD - completion only fires ONCE (no value parameter)
Circle()
    .scaleEffect(bounceCount % 2 == 0 ? 1.0 : 1.2)
    .animation(.spring, value: bounceCount)
    .transaction { transaction in  // No value!
        transaction.addAnimationCompletion {
            completionCount += 1  // Only fires once, ever
        }
    }
```

---

## @Animatable Macro (iOS 26+)

The `@Animatable` macro auto-synthesizes `animatableData` from all animatable stored properties, eliminating verbose manual conformance. Use `@AnimatableIgnored` to exclude properties that should not animate.

### Before (Manual)

```swift
struct Wedge: Shape {
    var startAngle: Angle
    var endAngle: Angle
    var drawClockwise: Bool

    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(startAngle.radians, endAngle.radians) }
        set {
            startAngle = .radians(newValue.first)
            endAngle = .radians(newValue.second)
        }
    }

    func path(in rect: CGRect) -> Path { /* ... */ }
}
```

### After (@Animatable)

```swift
@Animatable
struct Wedge: Shape {
    var startAngle: Angle
    var endAngle: Angle
    @AnimatableIgnored var drawClockwise: Bool

    func path(in rect: CGRect) -> Path { /* ... */ }
}
```

### When to Use
- **Prefer `@Animatable`** for any custom `Shape`, `AnimatableModifier`, or type conforming to `Animatable` with multiple properties
- **Use `@AnimatableIgnored`** for properties that control behavior but should not interpolate (e.g., directions, flags, identifiers)
- The macro works with any type conforming to `Animatable`, not just `Shape`

> Source: "What's new in SwiftUI" (WWDC25, session 256)

### When to Implement `animatableData` Manually

Reach for an explicit `animatableData` (instead of the macro) when the interpolated value needs custom logic that doesn't map 1:1 to a stored property — normalization, clamping, or driving a derived value. For a deployment target of iOS 26+, use `AnimatableValues`; for earlier targets, use `AnimatablePair`.

```swift
// iOS 26+: keep phase in 0..<2π and clamp amplitude during interpolation
struct WaveShape: Shape {
    var amplitude: CGFloat
    var phase: CGFloat
    var maxAmplitude: CGFloat

    var animatableData: AnimatableValues<CGFloat, CGFloat> {
        get { AnimatableValues(amplitude, phase) }
        set {
            amplitude = min(max(newValue.value.0, 0), maxAmplitude)
            phase = newValue.value.1.truncatingRemainder(dividingBy: 2 * .pi)
        }
    }

    func path(in rect: CGRect) -> Path { /* ... */ }
}
```

On earlier deployment targets, the same logic uses `AnimatablePair` with `newValue.first` / `newValue.second`.

---

## Quick Reference

### Transactions (All iOS versions)
- `withTransaction` is the explicit form of `withAnimation`
- Implicit animations override explicit (later in view tree wins)
- Use `disablesAnimations` to prevent override
- Use `.transaction { $0.animation = nil }` to remove animation

### Custom Transaction Keys (iOS 17+)
- Pass metadata through animation system via `TransactionKey`

### Phase Animations (iOS 17+)
- Use for multi-step sequences returning to start
- Prefer enum phases for clarity
- Each phase change is a separate animation
- Use `trigger` parameter for one-shot animations

### Keyframe Animations (iOS 17+)
- Use for precise timing control
- Tracks run in parallel
- Use `KeyframeTimeline` for testing/advanced use
- Prefer over manual DispatchQueue timing

### Completion Handlers (iOS 17+)
- Use `withAnimation(.animation) { } completion: { }` for one-shot completion handlers
- Use `.transaction(value:)` for handlers that should refire on every value change
- Without `value:` parameter, completion only fires once

### @Animatable Macro (iOS 26+)
- Use `@Animatable` to auto-synthesize `animatableData` from stored properties
- Use `@AnimatableIgnored` to exclude non-animatable properties
- Replaces verbose manual `animatableData` getters/setters
