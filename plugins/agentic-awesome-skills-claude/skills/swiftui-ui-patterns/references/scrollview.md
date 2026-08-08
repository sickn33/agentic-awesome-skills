# ScrollView and Lazy stacks

## Intent

Use `ScrollView` with `LazyVStack`, `LazyHStack`, or `LazyVGrid` when you need custom layout, mixed content, or horizontal/ grid-based scrolling.

## Core patterns

- Prefer `ScrollView` + `LazyVStack` for chat-like or custom feed layouts.
- Use `ScrollView(.horizontal)` + `LazyHStack` for chips, tags, avatars, and media strips.
- Use `LazyVGrid` for icon/media grids; prefer adaptive columns when possible.
- Use `ScrollViewReader` for scroll-to-top/bottom and anchor-based jumps.
- Use `safeAreaInset(edge:)` for input bars that should stick above the keyboard.

## Example: vertical custom feed

```swift
@MainActor
struct ConversationView: View {
  private enum Constants { static let bottomAnchor = "bottom" }
  @State private var scrollProxy: ScrollViewProxy?

  var body: some View {
    ScrollViewReader { proxy in
      ScrollView {
        LazyVStack {
          ForEach(messages) { message in
            MessageRow(message: message)
              .id(message.id)
          }
          Color.clear.frame(height: 1).id(Constants.bottomAnchor)
        }
        .padding(.horizontal, .layoutPadding)
      }
      .safeAreaInset(edge: .bottom) {
        MessageInputBar()
      }
      .onAppear {
        scrollProxy = proxy
        withAnimation {
          proxy.scrollTo(Constants.bottomAnchor, anchor: .bottom)
        }
      }
    }
  }
}
```

## Example: horizontal chips

```swift
ScrollView(.horizontal, showsIndicators: false) {
  LazyHStack(spacing: 8) {
    ForEach(chips) { chip in
      ChipView(chip: chip)
    }
  }
}
```

## Example: adaptive grid

```swift
let columns = [GridItem(.adaptive(minimum: 120))]

ScrollView {
  LazyVGrid(columns: columns, spacing: 8) {
    ForEach(items) { item in
      GridItemView(item: item)
    }
  }
  .padding(8)
}
```

## Design choices to keep

- Use `Lazy*` stacks when item counts are large or unknown.
- Use non-lazy stacks for small, fixed-size content to avoid lazy overhead.
- Keep IDs stable when using `ScrollViewReader`.
- Prefer explicit animations (`withAnimation`) when scrolling to an ID.

## Pitfalls

- Avoid nesting scroll views of the same axis; it causes gesture conflicts.
- Don’t combine `List` and `ScrollView` in the same hierarchy without a clear reason.
- Overuse of `LazyVStack` for tiny content can add unnecessary complexity.
