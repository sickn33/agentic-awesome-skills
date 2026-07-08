# Async state and task lifecycle

## Intent

Use this pattern when a view loads data, reacts to changing input, or coordinates async work that should follow the SwiftUI view lifecycle.

## Core rules

- Use `.task` for load-on-appear work that belongs to the view lifecycle.
- Use `.task(id:)` when async work should restart for a changing input such as a query, selection, or identifier.
- Treat cancellation as a normal path for view-driven tasks. Check `Task.isCancelled` in longer flows and avoid surfacing cancellation as a user-facing error.
- Debounce or coalesce user-driven async work such as search before it fans out into repeated requests.
- Keep UI-facing models and mutations main-actor-safe; do background work in services, then publish the result back to UI state.

## Example: load on appear

```swift
struct DetailView: View {
  let id: String
  @State private var state: LoadState<Item> = .idle
  @Environment(ItemClient.self) private var client

  var body: some View {
    content
      .task {
        await load()
      }
  }

  @ViewBuilder
  private var content: some View {
    switch state {
    case .idle, .loading:
      ProgressView()
    case .loaded(let item):
      ItemContent(item: item)
    case .failed(let error):
      ErrorView(error: error)
    }
  }

  private func load() async {
    state = .loading
    do {
      state = .loaded(try await client.fetch(id: id))
    } catch is CancellationError {
      return
    } catch {
      state = .failed(error)
    }
  }
}
```

## Example: restart on input change

```swift
struct SearchView: View {
  @State private var query = ""
  @State private var results: [ResultItem] = []
  @Environment(SearchClient.self) private var client

  var body: some View {
    List(results) { item in
      Text(item.title)
    }
    .searchable(text: $query)
    .task(id: query) {
      try? await Task.sleep(for: .milliseconds(250))
      guard !Task.isCancelled, !query.isEmpty else {
        results = []
        return
      }
      do {
        results = try await client.search(query)
      } catch is CancellationError {
        return
      } catch {
        results = []
      }
    }
  }
}
```

## When to move work out of the view

- If the async flow spans multiple screens or must survive view dismissal, move it into a service or model.
- If the view is mostly coordinating app-level lifecycle or account changes, wire it at the app shell in `app-wiring.md`.
- If retry, caching, or offline policy becomes complex, keep the policy in the client/service and leave the view with simple state transitions.

## Pitfalls

- Do not start network work directly from `body`.
- Do not ignore cancellation for searches, typeahead, or rapidly changing selections.
- Avoid storing derived async state in multiple places when one source of truth is enough.
