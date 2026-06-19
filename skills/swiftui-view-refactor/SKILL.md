---
name: swiftui-view-refactor
description: Refactor SwiftUI views into smaller components with stable, explicit data flow.
risk: safe
source: "Dimillian/Skills (MIT)"
date_added: "2026-03-25"
---

# SwiftUI View Refactor

## Overview
Refactor SwiftUI views toward small, explicit, stable view types. Default to vanilla SwiftUI: local state in the view, shared dependencies in the environment, business logic in services/models, and view models only when the request or existing code clearly requires one.

## When to Use
- When cleaning up a large SwiftUI view or splitting long `body` implementations.
- When you need smaller subviews, explicit dependency injection, or better Observation usage.

## Core Guidelines

### 1) View ordering (top → bottom)
- Enforce this ordering unless the existing file has a stronger local convention you must preserve.
- Environment
- `private`/`public` `let`
- `@State` / other stored properties
- computed `var` (non-view)
- `init`
- `body`
- computed view builders / other view helpers
- helper / async functions

### 2) Default to MV, not MVVM
- Views should be lightweight state expressions and orchestration points, not containers for business logic.
- Favor `@State`, `@Environment`, `@Query`, `.task`, `.task(id:)`, and `onChange` before reaching for a view model.
- Inject services and shared models via `@Environment`; keep domain logic in services/models, not in the view body.
- Do not introduce a view model just to mirror local view state or wrap environment dependencies.
- If a screen is getting large, split the UI into subviews before inventing a new view model layer.

### 3) Strongly prefer dedicated subview types over computed `some View` helpers
- Flag `body` properties that are longer than roughly one screen or contain multiple logical sections.
- Prefer extracting dedicated `View` types for non-trivial sections, especially when they have state, async work, branching, or deserve their own preview.
- Keep computed `some View` helpers rare and small. Do not build an entire screen out of `private var header: some View`-style fragments.
- Pass small, explicit inputs (data, bindings, callbacks) into extracted subviews instead of handing down the entire parent state.
- If an extracted subview becomes reusable or independently meaningful, move it to its own file.

Prefer:

```swift
var body: some View {
    List {
        HeaderSection(title: title, subtitle: subtitle)
        FilterSection(
            filterOptions: filterOptions,
            selectedFilter: $selectedFilter
        )
        ResultsSection(items: filteredItems)
        FooterSection()
    }
}

private struct HeaderSection: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.title2)
            Text(subtitle).font(.subheadline)
        }
    }
}

private struct FilterSection: View {
    let filterOptions: [FilterOption]
    @Binding var selectedFilter: FilterOption

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(filterOptions, id: \.self) { option in
                    FilterChip(option: option, isSelected: option == selectedFilter)
                        .onTapGesture { selectedFilter = option }
                }
            }
        }
    }
}
```

Avoid:

```swift
var body: some View {
    List {
        header
        filters
        results
        footer
    }
}

private var header: some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.title2)
        Text(subtitle).font(.subheadline)
    }
}
```

### 3b) Extract actions and side effects out of `body`
- Do not keep non-trivial button actions inline in the view body.
- Do not bury business logic inside `.task`, `.onAppear`, `.onChange`, or `.refreshable`.
- Prefer calling small private methods from the view, and move real business logic into services/models.
- The body should read like UI, not like a view controller.

```swift
Button("Save", action: save)
    .disabled(isSaving)

.task(id: searchText) {
    await reload(for: searchText)
}

private func save() {
    Task { await saveAsync() }
}

private func reload(for searchText: String) async {
    guard !searchText.isEmpty else {
        results = []
        return
    }
    await searchService.search(searchText)
}
```

### 4) Keep a stable view tree (avoid top-level conditional view swapping)
- Avoid `body` or computed views that return completely different root branches via `if/else`.
- Prefer a single stable base view with conditions inside sections/modifiers (`overlay`, `opacity`, `disabled`, `toolbar`, etc.).
- Root-level branch swapping causes identity churn, broader invalidation, and extra recomputation.

Prefer:

```swift
var body: some View {
    List {
        documentsListContent
    }
    .toolbar {
        if canEdit {
            editToolbar
        }
    }
}
```

Avoid:

```swift
var documentsListView: some View {
    if canEdit {
        editableDocumentsList
    } else {
        readOnlyDocumentsList
    }
}
```

### 5) View model handling (only if already present or explicitly requested)
- Treat view models as a legacy or explicit-need pattern, not the default.
- Do not introduce a view model unless the request or existing code clearly calls for one.
- If a view model exists, make it non-optional when possible.
- Pass dependencies to the view via `init`, then create the view model in the view's `init`.
- Avoid `bootstrapIfNeeded` patterns and other delayed setup workarounds.

Example (Observation-based):

```swift
@State private var viewModel: SomeViewModel

init(dependency: Dependency) {
    _viewModel = State(initialValue: SomeViewModel(dependency: dependency))
}
```

### 6) Observation usage
- For `@Observable` reference types on iOS 17+, store them as `@State` in the owning view.
- Pass observables down explicitly; avoid optional state unless the UI genuinely needs it.
- If the deployment target includes iOS 16 or earlier, use `@StateObject` at the owner and `@ObservedObject` when injecting legacy observable models.

## Workflow

1. Reorder the view to match the ordering rules.
2. Remove inline actions and side effects from `body`; move business logic into services/models and keep only thin orchestration in the view.
3. Shorten long bodies by extracting dedicated subview types; avoid rebuilding the screen out of many computed `some View` helpers.
4. Ensure stable view structure: avoid top-level `if`-based branch swapping; move conditions to localized sections/modifiers.
5. If a view model exists or is explicitly required, replace optional view models with a non-optional `@State` view model initialized in `init`.
6. Confirm Observation usage: `@State` for root `@Observable` models on iOS 17+, legacy wrappers only when the deployment target requires them.
7. Keep behavior intact: do not change layout or business logic unless requested.

## Notes

- Prefer small, explicit view types over large conditional blocks and large computed `some View` properties.
- Keep computed view builders below `body` and non-view computed vars above `init`.
- A good SwiftUI refactor should make the view read top-to-bottom as data flow plus layout, not as mixed layout and imperative logic.
- For MV-first guidance and rationale, see `references/mv-patterns.md`.

## Large-view handling

When a SwiftUI view file exceeds ~300 lines, split it aggressively. Extract meaningful sections into dedicated `View` types instead of hiding complexity in many computed properties. Use `private` extensions with `// MARK: -` comments for actions and helpers, but do not treat extensions as a substitute for breaking a giant screen into smaller view types. If an extracted subview is reused or independently meaningful, move it into its own file.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
