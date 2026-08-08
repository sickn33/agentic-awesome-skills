# Lightweight Clients (Closure-Based)

Use this pattern to keep networking or service dependencies simple and testable without introducing a full view model or heavy DI framework. It works well for SwiftUI apps where you want a small, composable API surface that can be swapped in previews/tests.

## Intent
- Provide a tiny "client" type made of async closures.
- Keep business logic in a store or feature layer, not the view.
- Enable easy stubbing in previews/tests.

## Minimal shape
```swift
struct SomeClient {
    var fetchItems: (_ limit: Int) async throws -> [Item]
    var search: (_ query: String, _ limit: Int) async throws -> [Item]
}

extension SomeClient {
    static func live(baseURL: URL = URL(string: "https://example.com")!) -> SomeClient {
        let session = URLSession.shared
        return SomeClient(
            fetchItems: { limit in
                // build URL, call session, decode
            },
            search: { query, limit in
                // build URL, call session, decode
            }
        )
    }
}
```

## Usage pattern
```swift
@MainActor
@Observable final class ItemsStore {
    enum LoadState { case idle, loading, loaded, failed(String) }

    var items: [Item] = []
    var state: LoadState = .idle
    private let client: SomeClient

    init(client: SomeClient) {
        self.client = client
    }

    func load(limit: Int = 20) async {
        state = .loading
        do {
            items = try await client.fetchItems(limit)
            state = .loaded
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
```

```swift
struct ContentView: View {
    @Environment(ItemsStore.self) private var store

    var body: some View {
        List(store.items) { item in
            Text(item.title)
        }
        .task { await store.load() }
    }
}
```

```swift
@main
struct MyApp: App {
    @State private var store = ItemsStore(client: .live())

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
        }
    }
}
```

## Guidance
- Keep decoding and URL-building in the client; keep state changes in the store.
- Make the store accept the client in `init` and keep it private.
- Avoid global singletons; use `.environment` for store injection.
- If you need multiple variants (mock/stub), add `static func mock(...)`.

## Pitfalls
- Don’t put UI state in the client; keep state in the store.
- Don’t capture `self` or view state in the client closures.
