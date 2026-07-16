# Scroll-reveal detail surfaces

## Intent

Use this pattern when a detail screen has a primary surface first and secondary content behind it, and you want the user to reveal that secondary layer by scrolling or swiping instead of tapping a separate button.

Typical fits:

- media detail screens that reveal actions or metadata
- maps, cards, or canvases that transition into structured detail
- full-screen viewers with a second "actions" or "insights" page

## Core pattern

Build the interaction as a paged vertical `ScrollView` with two sections:

1. a primary section sized to the viewport
2. a secondary section below it

Derive a normalized `progress` value from the vertical content offset and drive all visual changes from that one value.

Avoid treating the reveal as a separate gesture system unless scroll alone cannot express it.

## Minimal structure

```swift
private enum DetailSection: Hashable {
  case primary
  case secondary
}

struct DetailSurface: View {
  @State private var revealProgress: CGFloat = 0
  @State private var secondaryHeight: CGFloat = 1

  var body: some View {
    GeometryReader { geometry in
      ScrollViewReader { proxy in
        ScrollView(.vertical, showsIndicators: false) {
          VStack(spacing: 0) {
            PrimaryContent(progress: revealProgress)
              .frame(height: geometry.size.height)
              .id(DetailSection.primary)

            SecondaryContent(progress: revealProgress)
              .id(DetailSection.secondary)
              .onGeometryChange(for: CGFloat.self) { geo in
                geo.size.height
              } action: { newHeight in
                secondaryHeight = max(newHeight, 1)
              }
          }
          .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .onScrollGeometryChange(for: CGFloat.self, of: { scroll in
          scroll.contentOffset.y + scroll.contentInsets.top
        }) { _, offset in
          revealProgress = (offset / secondaryHeight).clamped(to: 0...1)
        }
        .safeAreaInset(edge: .bottom) {
          ChevronAffordance(progress: revealProgress) {
            withAnimation(.smooth) {
              let target: DetailSection = revealProgress < 0.5 ? .secondary : .primary
              proxy.scrollTo(target, anchor: .top)
            }
          }
        }
      }
    }
  }
}
```

## Design choices to keep

- Make the primary section exactly viewport-sized when the interaction should feel like paging between states.
- Compute `progress` from real scroll offset, not from duplicated booleans like `isExpanded`, `isShowingSecondary`, and `isSnapped`.
- Use `progress` to drive `offset`, `opacity`, `blur`, `scaleEffect`, and toolbar state so the whole surface stays synchronized.
- Use `ScrollViewReader` for programmatic snapping from taps on the primary content or chevron affordances.
- Use `onScrollTargetVisibilityChange` when you need a settled section state for haptics, tooltip dismissal, analytics, or accessibility announcements.

## Morphing a shared control

If a control appears to move from the primary surface into the secondary content, do not render two fully visible copies.

Instead:

- expose a source anchor in the primary area
- expose a destination anchor in the secondary area
- render one overlay that interpolates position and size using `progress`

```swift
Color.clear
  .anchorPreference(key: ControlAnchorKey.self, value: .bounds) { anchor in
    ["source": anchor]
  }

Color.clear
  .anchorPreference(key: ControlAnchorKey.self, value: .bounds) { anchor in
    ["destination": anchor]
  }

.overlayPreferenceValue(ControlAnchorKey.self) { anchors in
  MorphingControlOverlay(anchors: anchors, progress: revealProgress)
}
```

This keeps the motion coherent and avoids duplicate-hit-target bugs.

## Haptics and affordances

- Use light threshold haptics when the reveal begins and stronger haptics near the committed state.
- Keep a visible affordance like a chevron or pill while `progress` is near zero.
- Flip, fade, or blur the affordance as the secondary section becomes active.

## Interaction guards

- Disable vertical scrolling when a conflicting mode is active, such as pinch-to-zoom, crop, or full-screen media manipulation.
- Disable hit testing on overlays that should disappear once the secondary content is revealed.
- Avoid same-axis nested scroll views unless the inner view is effectively static or disabled during the reveal.

## Pitfalls

- Do not hard-code the progress divisor. Measure the secondary section height or another real reveal distance.
- Do not mix multiple animation sources for the same property. If `progress` drives it, keep other animations off that property.
- Do not store derived state like `isSecondaryVisible` unless another API requires it. Prefer deriving it from `progress` or visible scroll targets.
- Beware of layout feedback loops when measuring heights. Clamp zero values and update only when the measured height actually changes.

## Concrete example

- Pool iOS tile detail reveal: `/Users/dimillian/Documents/Dev/Pool/pool-ios/Pool/Sources/Features/Tile/Detail/TileDetailView.swift`
- Secondary content anchor example: `/Users/dimillian/Documents/Dev/Pool/pool-ios/Pool/Sources/Features/Tile/Detail/TileDetailIntentListView.swift`
