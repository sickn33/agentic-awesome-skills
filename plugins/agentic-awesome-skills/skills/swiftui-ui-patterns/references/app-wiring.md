# App wiring and dependency graph

## Intent

Show how to wire the app shell (TabView + NavigationStack + sheets) and install a global dependency graph (environment objects, services, streaming clients, SwiftData ModelContainer) in one place.

## Recommended structure

1) Root view sets up tabs, per-tab routers, and sheets.
2) A dedicated view modifier installs global dependencies and lifecycle tasks (auth state, streaming watchers, push tokens, data containers).
3) Feature views pull only what they need from the environment; feature-specific state stays local.

## Dependency selection

- Use `@Environment` for app-level services, shared clients, theme/configuration, and values that many descendants genuinely need.
- Prefer initializer injection for feature-local dependencies and models. Do not move a dependency into the environment just to avoid passing one or two arguments.
- Keep mutable feature state out of the environment unless it is intentionally shared across broad parts of the app.
- Use `@EnvironmentObject` only as a legacy fallback or when the project already standardizes on it for a truly shared object.

## Root shell example (generic)

```swift
@MainActor
struct AppView: View {
  @State private var selectedTab: AppTab = .home
  @State private var tabRouter = TabRouter()

  var body: some View {
    TabView(selection: $selectedTab) {
      ForEach(AppTab.allCases) { tab in
        let router = tabRouter.router(for: tab)
        NavigationStack(path: tabRouter.binding(for: tab)) {
          tab.makeContentView()
        }
        .withSheetDestinations(sheet: Binding(
          get: { router.presentedSheet },
          set: { router.presentedSheet = $0 }
        ))
        .environment(router)
        .tabItem { tab.label }
        .tag(tab)
      }
    }
    .withAppDependencyGraph()
  }
}
```

Minimal `AppTab` example:

```swift
@MainActor
enum AppTab: Identifiable, Hashable, CaseIterable {
  case home, notifications, settings
  var id: String { String(describing: self) }

  @ViewBuilder
  func makeContentView() -> some View {
    switch self {
    case .home: HomeView()
    case .notifications: NotificationsView()
    case .settings: SettingsView()
    }
  }

  @ViewBuilder
  var label: some View {
    switch self {
    case .home: Label("Home", systemImage: "house")
    case .notifications: Label("Notifications", systemImage: "bell")
    case .settings: Label("Settings", systemImage: "gear")
    }
  }
}
```

Router skeleton:

```swift
@MainActor
@Observable
final class RouterPath {
  var path: [Route] = []
  var presentedSheet: SheetDestination?
}

enum Route: Hashable {
  case detail(id: String)
}
```

## Dependency graph modifier (generic)

Use a single modifier to install environment objects and handle lifecycle hooks when the active account/client changes. This keeps wiring consistent and avoids forgetting a dependency in call sites.

```swift
extension View {
  func withAppDependencyGraph(
    accountManager: AccountManager = .shared,
    currentAccount: CurrentAccount = .shared,
    currentInstance: CurrentInstance = .shared,
    userPreferences: UserPreferences = .shared,
    theme: Theme = .shared,
    watcher: StreamWatcher = .shared,
    pushNotifications: PushNotificationsService = .shared,
    intentService: AppIntentService = .shared,
    quickLook: QuickLook = .shared,
    toastCenter: ToastCenter = .shared,
    namespace: Namespace.ID? = nil,
    isSupporter: Bool = false
  ) -> some View {
    environment(accountManager)
      .environment(accountManager.currentClient)
      .environment(quickLook)
      .environment(currentAccount)
      .environment(currentInstance)
      .environment(userPreferences)
      .environment(theme)
      .environment(watcher)
      .environment(pushNotifications)
      .environment(intentService)
      .environment(toastCenter)
      .environment(\.isSupporter, isSupporter)
      .task(id: accountManager.currentClient.id) {
        let client = accountManager.currentClient
        if let namespace { quickLook.namespace = namespace }
        currentAccount.setClient(client: client)
        currentInstance.setClient(client: client)
        userPreferences.setClient(client: client)
        await currentInstance.fetchCurrentInstance()
        watcher.setClient(client: client, instanceStreamingURL: currentInstance.instance?.streamingURL)
        if client.isAuth {
          watcher.watch(streams: [.user, .direct])
        } else {
          watcher.stopWatching()
        }
      }
      .task(id: accountManager.pushAccounts.map(\.token)) {
        pushNotifications.tokens = accountManager.pushAccounts.map(\.token)
      }
  }
}
```

Notes:
- The `.task(id:)` hooks respond to account/client changes, re-seeding services and watcher state.
- Keep the modifier focused on global wiring; feature-specific state stays within features.
- Adjust types (AccountManager, StreamWatcher, etc.) to match your project.

## SwiftData / ModelContainer

Install your `ModelContainer` at the root so all feature views share the same store. Keep the list minimal to the models that need persistence.

```swift
extension View {
  func withModelContainer() -> some View {
    modelContainer(for: [Draft.self, LocalTimeline.self, TagGroup.self])
  }
}
```

Why: a single container avoids duplicated stores per sheet or tab and keeps data consistent.

## Sheet routing (enum-driven)

Centralize sheets with a small enum and a helper modifier.

```swift
enum SheetDestination: Identifiable {
  case composer
  case settings
  var id: String { String(describing: self) }
}

extension View {
  func withSheetDestinations(sheet: Binding<SheetDestination?>) -> some View {
    sheet(item: sheet) { destination in
      switch destination {
      case .composer:
        ComposerView().withEnvironments()
      case .settings:
        SettingsView().withEnvironments()
      }
    }
  }
}
```

Why: enum-driven sheets keep presentation centralized and testable; adding a new sheet means adding one enum case and one switch branch.

## When to use

- Apps with multiple packages/modules that share environment objects and services.
- Apps that need to react to account/client changes and rewire streaming/push safely.
- Any app that wants consistent TabView + NavigationStack + sheet wiring without repeating environment setup.

## Caveats

- Keep the dependency modifier slim; do not put feature state or heavy logic there.
- Ensure `.task(id:)` work is lightweight or cancelled appropriately; long-running work belongs in services.
- If unauthenticated clients exist, gate streaming/watch calls to avoid reconnect spam.
