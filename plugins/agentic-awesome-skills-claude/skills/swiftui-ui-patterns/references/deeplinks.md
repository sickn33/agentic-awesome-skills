# Deep links and navigation

## Intent

Route external URLs into in-app destinations while falling back to system handling when needed.

## Core patterns

- Centralize URL handling in the router (`handle(url:)`, `handleDeepLink(url:)`).
- Inject an `OpenURLAction` handler that delegates to the router.
- Use `.onOpenURL` for app scheme links and convert them to web URLs if needed.
- Let the router decide whether to navigate or open externally.

## Example: router entry points

```swift
@MainActor
final class RouterPath {
  var path: [Route] = []
  var urlHandler: ((URL) -> OpenURLAction.Result)?

  func handle(url: URL) -> OpenURLAction.Result {
    if isInternal(url) {
      navigate(to: .status(id: url.lastPathComponent))
      return .handled
    }
    return urlHandler?(url) ?? .systemAction
  }

  func handleDeepLink(url: URL) -> OpenURLAction.Result {
    // Resolve federated URLs, then navigate.
    navigate(to: .status(id: url.lastPathComponent))
    return .handled
  }
}
```

## Example: attach to a root view

```swift
extension View {
  func withLinkRouter(_ router: RouterPath) -> some View {
    self
      .environment(
        \.openURL,
        OpenURLAction { url in
          router.handle(url: url)
        }
      )
      .onOpenURL { url in
        router.handleDeepLink(url: url)
      }
  }
}
```

## Design choices to keep

- Keep URL parsing and decision logic inside the router.
- Avoid handling deep links in multiple places; one entry point is enough.
- Always provide a fallback to `OpenURLAction` or `UIApplication.shared.open`.

## Pitfalls

- Don’t assume the URL is internal; validate first.
- Avoid blocking UI while resolving remote links; use `Task`.
