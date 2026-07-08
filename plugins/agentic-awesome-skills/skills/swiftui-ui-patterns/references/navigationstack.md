# NavigationStack

## Intent

Use this pattern for programmatic navigation and deep links, especially when each tab needs an independent navigation history. The key idea is one `NavigationStack` per tab, each with its own path binding and router object.

## Core architecture

- Define a route enum that is `Hashable` and represents all destinations.
- Create a lightweight router (or use a library such as `https://github.com/Dimillian/AppRouter`) that owns the `path` and any sheet state.
- Each tab owns its own router instance and binds `NavigationStack(path:)` to it.
- Inject the router into the environment so child views can navigate programmatically.
- Centralize destination mapping with a single `navigationDestination(for:)` block (or a `withAppRouter()` modifier).

## Example: custom router with per-tab stack

```swift
@MainActor
@Observable
final class RouterPath {
  var path: [Route] = []
  var presentedSheet: SheetDestination?

  func navigate(to route: Route) {
    path.append(route)
  }

  func reset() {
    path = []
  }
}

enum Route: Hashable {
  case account(id: String)
  case status(id: String)
}

@MainActor
struct TimelineTab: View {
  @State private var routerPath = RouterPath()

  var body: some View {
    NavigationStack(path: $routerPath.path) {
      TimelineView()
        .navigationDestination(for: Route.self) { route in
          switch route {
          case .account(let id): AccountView(id: id)
          case .status(let id): StatusView(id: id)
          }
        }
    }
    .environment(routerPath)
  }
}
```

## Example: centralized destination mapping

Use a shared view modifier to avoid duplicating route switches across screens.

```swift
extension View {
  func withAppRouter() -> some View {
    navigationDestination(for: Route.self) { route in
      switch route {
      case .account(let id):
        AccountView(id: id)
      case .status(let id):
        StatusView(id: id)
      }
    }
  }
}
```

Then apply it once per stack:

```swift
NavigationStack(path: $routerPath.path) {
  TimelineView()
    .withAppRouter()
}
```

## Example: binding per tab (tabs with independent history)

```swift
@MainActor
struct TabsView: View {
  @State private var timelineRouter = RouterPath()
  @State private var notificationsRouter = RouterPath()

  var body: some View {
    TabView {
      TimelineTab(router: timelineRouter)
      NotificationsTab(router: notificationsRouter)
    }
  }
}
```

## Example: generic tabs with per-tab NavigationStack

Use this when tabs are built from data and each needs its own path without hard-coded names.

```swift
@MainActor
struct TabsView: View {
  @State private var selectedTab: AppTab = .timeline
  @State private var tabRouter = TabRouter()

  var body: some View {
    TabView(selection: $selectedTab) {
      ForEach(AppTab.allCases) { tab in
        NavigationStack(path: tabRouter.binding(for: tab)) {
          tab.makeContentView()
        }
        .environment(tabRouter.router(for: tab))
        .tabItem { tab.label }
        .tag(tab)
      }
    }
  }
}
```

@MainActor
@Observable
final class TabRouter {
  private var routers: [AppTab: RouterPath] = [:]

  func router(for tab: AppTab) -> RouterPath {
    if let router = routers[tab] { return router }
    let router = RouterPath()
    routers[tab] = router
    return router
  }

  func binding(for tab: AppTab) -> Binding<[Route]> {
    let router = router(for: tab)
    return Binding(get: { router.path }, set: { router.path = $0 })
  }
}

## Design choices to keep

- One `NavigationStack` per tab to preserve independent history.
- A single source of truth for navigation state (`RouterPath` or library router).
- Use `navigationDestination(for:)` to map routes to views.
- Reset the path when app context changes (account switch, logout, etc.).
- Inject the router into the environment so child views can navigate and present sheets without prop-drilling.
- Keep sheet presentation state on the router if you want a single place to manage modals.

## Pitfalls

- Do not share one path across all tabs unless you want global history.
- Ensure route identifiers are stable and `Hashable`.
- Avoid storing view instances in the path; store lightweight route data instead.
- If using a router object, keep it outside other `@Observable` objects to avoid nested observation.
