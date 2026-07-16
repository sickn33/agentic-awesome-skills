# MV Patterns Reference

Distilled guidance for deciding whether a SwiftUI feature should stay as plain MV or introduce a view model.

Inspired by the user's provided source, "SwiftUI in 2025: Forget MVVM" (Thomas Ricouard), but rewritten here as a practical refactoring reference.

## Default stance

- Default to MV: views are lightweight state expressions and orchestration points.
- Prefer `@State`, `@Environment`, `@Query`, `.task`, `.task(id:)`, and `onChange` before reaching for a view model.
- Keep business logic in services, models, or domain types, not in the view body.
- Split large screens into smaller view types before inventing a view model layer.
- Avoid manual fetching or state plumbing that duplicates SwiftUI or SwiftData mechanisms.
- Test services, models, and transformations first; views should stay simple and declarative.

## When to avoid a view model

Do not introduce a view model when it would mostly:
- mirror local view state,
- wrap values already available through `@Environment`,
- duplicate `@Query`, `@State`, or `Binding`-based data flow,
- exist only because the view body is too long,
- hold one-off async loading logic that can live in `.task` plus local view state.

In these cases, simplify the view and data flow instead of adding indirection.

## When a view model may be justified

A view model can be reasonable when at least one of these is true:
- the user explicitly asks for one,
- the codebase already standardizes on a view model pattern for that feature,
- the screen needs a long-lived reference model with behavior that does not fit naturally in services alone,
- the feature is adapting a non-SwiftUI API that needs a dedicated bridge object,
- multiple views share the same presentation-specific state and that state is not better modeled as app-level environment data.

Even then, keep the view model small, explicit, and non-optional when possible.

## Preferred pattern: local state plus environment

```swift
struct FeedView: View {
    @Environment(BlueSkyClient.self) private var client

    enum ViewState {
        case loading
        case error(String)
        case loaded([Post])
    }

    @State private var viewState: ViewState = .loading

    var body: some View {
        List {
            switch viewState {
            case .loading:
                ProgressView("Loading feed...")
            case .error(let message):
                ErrorStateView(message: message, retryAction: { await loadFeed() })
            case .loaded(let posts):
                ForEach(posts) { post in
                    PostRowView(post: post)
                }
            }
        }
        .task { await loadFeed() }
    }

    private func loadFeed() async {
        do {
            let posts = try await client.getFeed()
            viewState = .loaded(posts)
        } catch {
            viewState = .error(error.localizedDescription)
        }
    }
}
```

Why this is preferred:
- state stays close to the UI that renders it,
- dependencies come from the environment instead of a wrapper object,
- the view coordinates UI flow while the service owns the real work.

## Preferred pattern: use modifiers as lightweight orchestration

```swift
.task(id: searchText) {
    guard !searchText.isEmpty else {
        results = []
        return
    }
    await searchFeed(query: searchText)
}

.onChange(of: isInSearch, initial: false) {
    guard !isInSearch else { return }
    Task { await fetchSuggestedFeed() }
}
```

Use view lifecycle modifiers for simple, local orchestration. Do not convert these into a view model by default unless the behavior clearly outgrows the view.

## SwiftData note

SwiftData is a strong argument for keeping data flow inside the view when possible.

Prefer:

```swift
struct BookListView: View {
    @Query private var books: [Book]
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        List {
            ForEach(books) { book in
                BookRowView(book: book)
                    .swipeActions {
                        Button("Delete", role: .destructive) {
                            modelContext.delete(book)
                        }
                    }
            }
        }
    }
}
```

Avoid adding a view model that manually fetches and mirrors the same state unless the feature has an explicit reason to do so.

## Testing guidance

Prefer to test:
- services and business rules,
- models and state transformations,
- async workflows at the service layer,
- UI behavior with previews or higher-level UI tests.

Do not introduce a view model primarily to make a simple SwiftUI view "testable." That usually adds ceremony without improving the architecture.

## Refactor checklist

When refactoring toward MV:
- Remove view models that only wrap environment dependencies or local view state.
- Replace optional or delayed-initialized view models when plain view state is enough.
- Pull business logic out of the view body and into services/models.
- Keep the view as a thin coordinator of UI state, navigation, and user actions.
- Split large bodies into smaller view types before adding new layers of indirection.

## Bottom line

Treat view models as the exception, not the default.

In modern SwiftUI, the default stack is:
- `@State` for local state,
- `@Environment` for shared dependencies,
- `@Query` for SwiftData-backed collections,
- lifecycle modifiers for lightweight orchestration,
- services and models for business logic.

Reach for a view model only when the feature clearly needs one.
