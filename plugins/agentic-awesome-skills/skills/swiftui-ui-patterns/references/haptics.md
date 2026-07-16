# Haptics

## Intent

Use haptics sparingly to reinforce user actions (tab selection, refresh, success/error) and respect user preferences.

## Core patterns

- Centralize haptic triggers in a `HapticManager` or similar utility.
- Gate haptics behind user preferences and hardware support.
- Use distinct types for different UX moments (selection vs. notification vs. refresh).

## Example: simple haptic manager

```swift
@MainActor
final class HapticManager {
  static let shared = HapticManager()

  enum HapticType {
    case buttonPress
    case tabSelection
    case dataRefresh(intensity: CGFloat)
    case notification(UINotificationFeedbackGenerator.FeedbackType)
  }

  private let selectionGenerator = UISelectionFeedbackGenerator()
  private let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)
  private let notificationGenerator = UINotificationFeedbackGenerator()

  private init() { selectionGenerator.prepare() }

  func fire(_ type: HapticType, isEnabled: Bool) {
    guard isEnabled else { return }
    switch type {
    case .buttonPress:
      impactGenerator.impactOccurred()
    case .tabSelection:
      selectionGenerator.selectionChanged()
    case let .dataRefresh(intensity):
      impactGenerator.impactOccurred(intensity: intensity)
    case let .notification(style):
      notificationGenerator.notificationOccurred(style)
    }
  }
}
```

## Example: usage

```swift
Button("Save") {
  HapticManager.shared.fire(.notification(.success), isEnabled: preferences.hapticsEnabled)
}

TabView(selection: $selectedTab) { /* tabs */ }
  .onChange(of: selectedTab) { _, _ in
    HapticManager.shared.fire(.tabSelection, isEnabled: preferences.hapticTabSelectionEnabled)
  }
```

## Design choices to keep

- Haptics should be subtle and not fire on every tiny interaction.
- Respect user preferences (toggle to disable).
- Keep haptic triggers close to the user action, not deep in data layers.

## Pitfalls

- Avoid firing multiple haptics in quick succession.
- Do not assume haptics are available; check support.
