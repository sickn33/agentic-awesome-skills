# SwiftUI ScrollView Patterns Reference

## Table of Contents

- [ScrollViewReader for Programmatic Scrolling](#scrollviewreader-for-programmatic-scrolling)
- [Scroll Position Tracking](#scroll-position-tracking)
- [Scroll Transitions and Effects](#scroll-transitions-and-effects)
- [Scroll Target Behavior](#scroll-target-behavior)
- [Summary Checklist](#summary-checklist)

## ScrollViewReader for Programmatic Scrolling

**Use `ScrollViewReader` for scroll-to-top, scroll-to-bottom, and anchor-based jumps.**

```swift
struct ChatView: View {
    @State private var messages: [Message] = []
    private let bottomID = "bottom"

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack {
                    ForEach(messages) { message in
                        MessageRow(message: message)
                            .id(message.id)
                    }
                    Color.clear
                        .frame(height: 1)
                        .id(bottomID)
                }
            }
            .onChange(of: messages.count) { _, _ in
                withAnimation {
                    proxy.scrollTo(bottomID, anchor: .bottom)
                }
            }
            .onAppear {
                proxy.scrollTo(bottomID, anchor: .bottom)
            }
        }
    }
}
```

### Scroll-to-Top Pattern

```swift
struct FeedView: View {
    @State private var items: [Item] = []
    @State private var scrollToTop = false
    private let topID = "top"

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack {
                    Color.clear
                        .frame(height: 1)
                        .id(topID)

                    ForEach(items) { item in
                        ItemRow(item: item)
                    }
                }
            }
            .onChange(of: scrollToTop) { _, shouldScroll in
                if shouldScroll {
                    withAnimation {
                        proxy.scrollTo(topID, anchor: .top)
                    }
                    scrollToTop = false
                }
            }
        }
    }
}
```

**Why**: `ScrollViewReader` provides programmatic scroll control with stable anchors. Always use stable IDs and explicit animations.

## Scroll Position Tracking

### Basic Scroll Position

**Avoid** - Storing scroll position directly triggers view updates on every scroll frame:

```swift
// ❌ Bad Practice - causes unnecessary re-renders
struct ContentView: View {
    @State private var scrollPosition: CGFloat = 0

    var body: some View {
        ScrollView {
            content
                .background(
                    GeometryReader { geometry in
                        Color.clear
                            .preference(
                                key: ScrollOffsetPreferenceKey.self,
                                value: geometry.frame(in: .named("scroll")).minY
                            )
                    }
                )
        }
        .coordinateSpace(name: "scroll")
        .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
            scrollPosition = value
        }
    }
}
```

**Preferred** - Check scroll position and update a flag based on thresholds for smoother, more efficient scrolling:

```swift
// ✅ Good Practice - only updates state when crossing threshold
struct ContentView: View {
    @State private var startAnimation: Bool = false

    var body: some View {
        ScrollView {
            content
                .background(
                    GeometryReader { geometry in
                        Color.clear
                            .preference(
                                key: ScrollOffsetPreferenceKey.self,
                                value: geometry.frame(in: .named("scroll")).minY
                            )
                    }
                )
        }
        .coordinateSpace(name: "scroll")
        .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
            if value < -100 {
                startAnimation = true
            } else {
                startAnimation = false
            }
        }
    }
}

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
```

### Scroll-Based Header Visibility

```swift
struct ContentView: View {
    @State private var showHeader = true

    var body: some View {
        VStack(spacing: 0) {
            if showHeader {
                HeaderView()
                    .transition(.move(edge: .top))
            }

            ScrollView {
                content
                    .background(
                        GeometryReader { geometry in
                            Color.clear
                                .preference(
                                    key: ScrollOffsetPreferenceKey.self,
                                    value: geometry.frame(in: .named("scroll")).minY
                                )
                        }
                    )
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                if offset < -50 { // Scrolling down
                   withAnimation { showHeader = false }
                } else if offset > 50 { // Scrolling up
                  withAnimation { showHeader = true }
                }
            }
        }
    }
}
```

## Scroll Transitions and Effects

> **iOS 17+**: All APIs in this section require iOS 17 or later.

### Scroll-Based Opacity

```swift
struct ParallaxView: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                ForEach(items) { item in
                    ItemCard(item: item)
                        .visualEffect { content, geometry in
                            let frame = geometry.frame(in: .scrollView)
                            let distance = min(0, frame.minY)
                            return content
                                .opacity(1 + distance / 200)
                        }
                }
            }
        }
    }
}
```

### Parallax Effect

```swift
struct ParallaxHeader: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Image("hero")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 300)
                    .visualEffect { content, geometry in
                        let offset = geometry.frame(in: .scrollView).minY
                        return content
                            .offset(y: offset > 0 ? -offset * 0.5 : 0)
                    }
                    .clipped()

                ContentView()
            }
        }
    }
}
```

## Scroll Target Behavior

> **iOS 17+**: All APIs in this section require iOS 17 or later.

### Paging ScrollView

```swift
struct PagingView: View {
    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 0) {
                ForEach(pages) { page in
                    PageView(page: page)
                        .containerRelativeFrame(.horizontal)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
    }
}
```

### Snap to Items

```swift
struct SnapScrollView: View {
    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 16) {
                ForEach(items) { item in
                    ItemCard(item: item)
                        .frame(width: 280)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .contentMargins(.horizontal, 20)
    }
}
```

## Summary Checklist

- [ ] Use `ScrollViewReader` with stable IDs for programmatic scrolling
- [ ] Always use explicit animations with `scrollTo()`
- [ ] Use `.visualEffect` for scroll-based visual changes
- [ ] Use `.scrollTargetBehavior(.paging)` for paging behavior
- [ ] Use `.scrollTargetBehavior(.viewAligned)` for snap-to-item behavior
- [ ] Gate frequent scroll position updates by thresholds
- [ ] Use preference keys for custom scroll position tracking
