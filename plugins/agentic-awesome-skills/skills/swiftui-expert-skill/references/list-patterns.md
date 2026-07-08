# SwiftUI List Patterns Reference

## Table of Contents

- [ForEach Identity and Stability](#foreach-identity-and-stability)
- [Enumerated Sequences](#enumerated-sequences)
- [List with Custom Styling](#list-with-custom-styling)
- [List with Pull-to-Refresh](#list-with-pull-to-refresh)
- [Empty States with ContentUnavailableView (iOS 17+)](#empty-states-with-contentunavailableview-ios-17)
- [Custom List Backgrounds](#custom-list-backgrounds)
- [Table](#table)
- [Summary Checklist](#summary-checklist)

## ForEach Identity and Stability

**Always provide stable identity for `ForEach`.** Never use `.indices` for dynamic content.

```swift
// Good - stable identity via Identifiable
extension User: Identifiable {
    var id: String { userId }
}

ForEach(users) { user in
    UserRow(user: user)
}

// Good - stable identity via keypath
ForEach(users, id: \.userId) { user in
    UserRow(user: user)
}

// Wrong - indices create static content
ForEach(users.indices, id: \.self) { index in
    UserRow(user: users[index])  // Can crash on removal!
}

// Wrong - unstable identity
ForEach(users, id: \.self) { user in
    UserRow(user: user)  // Only works if User is Hashable and stable
}
```

**Critical**: Ensure **constant number of views per element** in `ForEach`:

```swift
// Good - consistent view count
ForEach(items) { item in
    ItemRow(item: item)
}

// Bad - variable view count breaks identity
ForEach(items) { item in
    if item.isSpecial {
        SpecialRow(item: item)
        DetailRow(item: item)
    } else {
        RegularRow(item: item)
    }
}
```

**Avoid inline filtering:**

```swift
// Bad - unstable identity, changes on every update
ForEach(items.filter { $0.isEnabled }) { item in
    ItemRow(item: item)
}

// Good - prefilter and cache
@State private var enabledItems: [Item] = []

var body: some View {
    ForEach(enabledItems) { item in
        ItemRow(item: item)
    }
    .onChange(of: items) { _, newItems in
        enabledItems = newItems.filter { $0.isEnabled }
    }
}
```

**Avoid `AnyView` in list rows:**

```swift
// Bad - hides identity, increases cost
ForEach(items) { item in
    AnyView(item.isSpecial ? SpecialRow(item: item) : RegularRow(item: item))
}

// Good - Create a unified row view with a single top-level container
ForEach(items) { item in
    ItemRow(item: item)
}

struct ItemRow: View {
    let item: Item

    var body: some View {
        // The VStack keeps the row "unary" (one top-level view) so the
        // List can template row ids without evaluating every row's body.
        VStack {
            if item.isSpecial {
                SpecialRow(item: item)
            } else {
                RegularRow(item: item)
            }
        }
    }
}
```

**Why**: Stable identity is critical for performance and animations. Unstable identity causes excessive diffing, broken animations, and potential crashes.

### Prefer unary rows in `List`

`List` needs the identity of every row up front. When each row's body produces a **single top-level view** (a "unary" row), SwiftUI can template the row id from the `ForEach` element's id alone, without running each row's `body`. When the body branches between different top-level shapes — a bare top-level `switch`, a top-level `if` without `else`, or an `AnyView` — structural identity varies per row, so SwiftUI falls back to evaluating every row's body just to compute ids. That cost scales with the number of rows.

The fix is to wrap branching content in any single-root container (`VStack`, `HStack`, `ZStack`, or a custom wrapper) so the row is always exactly one top-level view, as shown above. A top-level `if` without an `else` is also "multi" (0 or 1 views); if some elements shouldn't be rows at all, filter the collection before it reaches the `ForEach` rather than producing a zero-view row.

To find non-constant row builders in an existing app, launch with `-LogForEachSlowPath YES`; SwiftUI logs each `ForEach` inside a lazy container whose row body produces a non-constant number of views.

### Keep ids stable, unique, and cheap

Three more identity rules that prevent subtle bugs:

- **The id must outlive the view and not change on edit.** Don't derive `id` from a mutable property (e.g. `var id: String { title }`). Editing the title changes the id, so SwiftUI treats it as a removal plus insertion — focus and per-row state are lost mid-edit. Use a stable `let id: UUID` or a server-assigned key.
- **Don't synthesize a fresh id inside `body`.** `ForEach(items.map { Item(title: $0) })` creates new `UUID`s on every body pass, so the whole collection reads as replaced every update. Create ids once in storage that outlives `body` (the model layer), not inline.
- **Keep the id cheap to hash.** Avoid `id: \.self` on a large `Hashable` struct; hashing walks every field on every diff. Use a small primitive (`UUID`, `Int`, short `String`, `URL`) and still pass the full element to the row.

### Identifiable ID Must Be Truly Unique

Non-unique IDs cause SwiftUI to treat different items as identical, leading to duplicate rendering or missing views:

```swift
// Bug -- two articles with the same URL show identical content
struct Article: Identifiable {
    let title: String
    let url: URL
    var id: String { url.absoluteString }  // Not unique if URLs repeat!
}

// Fix -- use a genuinely unique identifier
struct Article: Identifiable {
    let id: UUID
    let title: String
    let url: URL
}
```

**Classes get a default `ObjectIdentifier`-based `id`** when conforming to `Identifiable` without providing one. This is only unique for the object's lifetime and can be recycled after deallocation.

## Enumerated Sequences

**Using `.enumerated()` is fine; the index just must not be the identity.** Using `\.offset` as the id is the same anti-pattern as `\.self` on `items.indices` — the id becomes the position, not the element, so inserts and reorders reset row state and break animations. Keep the element's own identity as the id and treat the index as ordinary row data.

```swift
// Wrong - offset is the position, not the element
ForEach(items.enumerated(), id: \.offset) { index, item in
    ItemRow(number: index + 1, item: item)
}

// Correct - id comes from the element; index is just data
ForEach(items.enumerated(), id: \.element.id) { index, item in
    ItemRow(number: index + 1, item: item)
}
```

**No `Array(...)` wrapper is needed on Swift 6.1+.** As of Swift 6.1, the sequence returned by `.enumerated()` conditionally conforms to `RandomAccessCollection` when the base collection does, so `ForEach` accepts it directly. On earlier toolchains, wrap it in `Array(...)`. Favor the direct form in new code — it avoids an eager copy on every body evaluation.

## List with Custom Styling

```swift
// Remove default background and separators
List(items) { item in
    ItemRow(item: item)
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
        .listRowSeparator(.hidden)
}
.listStyle(.plain)
.scrollContentBackground(.hidden)
.background(Color.customBackground)
.environment(\.defaultMinListRowHeight, 1)  // Allows custom row heights
```

## List with Pull-to-Refresh

```swift
List(items) { item in
    ItemRow(item: item)
}
.refreshable {
    await loadItems()
}
```

## Empty States with ContentUnavailableView (iOS 17+)

Use `ContentUnavailableView` for empty list/search states. The built-in `.search` variant is auto-localized:

```swift
List {
    ForEach(searchResults) { item in
        ItemRow(item: item)
    }
}
.overlay {
    if searchResults.isEmpty, !searchText.isEmpty {
        ContentUnavailableView.search(text: searchText)
    }
}
```

For non-search empty states, use a custom instance:

```swift
ContentUnavailableView(
    "No Articles",
    systemImage: "doc.richtext.fill",
    description: Text("Articles you save will appear here.")
)
```

## Custom List Backgrounds

Use `.scrollContentBackground(.hidden)` to replace the default list background:

```swift
List(items) { item in
    ItemRow(item: item)
}
.scrollContentBackground(.hidden)
.background(Color.customBackground)
```

Without `.scrollContentBackground(.hidden)`, a custom `.background()` has no visible effect on `List`.

## Table

> **Availability:** iOS 16.0+, iPadOS 16.0+, visionOS 1.0+

A multi-column data container that presents rows of `Identifiable` data with sortable, selectable columns. On compact size classes (iPhone, iPad Slide Over), columns after the first are automatically hidden.

### Basic Table

```swift
struct Person: Identifiable {
    let givenName: String
    let familyName: String
    let emailAddress: String
    let id = UUID()
    var fullName: String { givenName + " " + familyName }
}

struct PeopleTable: View {
    @State private var people: [Person] = [ /* ... */ ]

    var body: some View {
        Table(people) {
            TableColumn("Given Name", value: \.givenName)
            TableColumn("Family Name", value: \.familyName)
            TableColumn("E-Mail Address", value: \.emailAddress)
        }
    }
}
```

### Table with Selection

Bind to a single `ID` for single-selection, or a `Set<ID>` for multi-selection:

```swift
struct SelectableTable: View {
    @State private var people: [Person] = [ /* ... */ ]
    @State private var selectedPeople = Set<Person.ID>()

    var body: some View {
        Table(people, selection: $selectedPeople) {
            TableColumn("Given Name", value: \.givenName)
            TableColumn("Family Name", value: \.familyName)
            TableColumn("E-Mail Address", value: \.emailAddress)
        }
        Text("\(selectedPeople.count) people selected")
    }
}
```

### Sortable Table

Provide a binding to `[KeyPathComparator]` and re-sort the data in `.onChange(of:)`:

```swift
struct SortableTable: View {
    @State private var people: [Person] = [ /* ... */ ]
    @State private var sortOrder = [KeyPathComparator(\Person.givenName)]

    var body: some View {
        Table(people, sortOrder: $sortOrder) {
            TableColumn("Given Name", value: \.givenName)
            TableColumn("Family Name", value: \.familyName)
            TableColumn("E-Mail Address", value: \.emailAddress)
        }
        .onChange(of: sortOrder) { _, newOrder in
            people.sort(using: newOrder)
        }
    }
}
```

**Important:** The table does **not** sort data itself — you must re-sort the collection when `sortOrder` changes.

### Adaptive Table for Compact Size Classes

On iPhone or iPad in Slide Over, only the first column is shown. Customize it to display combined information:

```swift
struct AdaptiveTable: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    private var isCompact: Bool { horizontalSizeClass == .compact }

    @State private var people: [Person] = [ /* ... */ ]
    @State private var sortOrder = [KeyPathComparator(\Person.givenName)]

    var body: some View {
        Table(people, sortOrder: $sortOrder) {
            TableColumn("Given Name", value: \.givenName) { person in
                VStack(alignment: .leading) {
                    Text(isCompact ? person.fullName : person.givenName)
                    if isCompact {
                        Text(person.emailAddress)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            TableColumn("Family Name", value: \.familyName)
            TableColumn("E-Mail Address", value: \.emailAddress)
        }
        .onChange(of: sortOrder) { _, newOrder in
            people.sort(using: newOrder)
        }
    }
}
```

### Table with Static Rows

Use `init(of:columns:rows:)` when rows are known at compile time:

```swift
struct Purchase: Identifiable {
    let price: Decimal
    let id = UUID()
}

struct TipTable: View {
    let currencyStyle = Decimal.FormatStyle.Currency(code: "USD")

    var body: some View {
        Table(of: Purchase.self) {
            TableColumn("Base price") { purchase in
                Text(purchase.price, format: currencyStyle)
            }
            TableColumn("With 15% tip") { purchase in
                Text(purchase.price * 1.15, format: currencyStyle)
            }
            TableColumn("With 20% tip") { purchase in
                Text(purchase.price * 1.2, format: currencyStyle)
            }
        } rows: {
            TableRow(Purchase(price: 20))
            TableRow(Purchase(price: 50))
            TableRow(Purchase(price: 75))
        }
    }
}
```

### Table with Dynamic Number of Columns

> **Availability:** iOS 17.4+, iPadOS 17.4+, Mac Catalyst 17.4+, macOS 14.4+, visionOS 1.1+

If the number of columns is not known at runtime use `TableColumnForEach` to create columns based on a `RandomAccessCollection` of some data type. Either the collection’s elements must conform to `Identifiable` or you need to provide an id parameter to the `TableColumnForEach` initializer.

This can be mixed with static compile time known `TableColumn` usage.

```swift
struct AudioChannel: Identifiable {
    let name: String
    let id: UUID
}

struct AudioSample: Identifiable {
    let id: UUID
    let timestamp: TimeInterval
    func level(channel: AudioChannel.ID) -> Double {
        1
    }
}

@Observable
class AudioSampleTrack {
    let channels: [AudioChannel]
    var samples: [AudioSample]
}

struct ContentView: View {
    var track: AudioSampleTrack

    var body: some View {
        Table(track.samples) {
            TableColumn("Timestamp (ms)") { sample in
                Text(sample.timestamp, format: .number.scale(1000))
                    .monospacedDigit()
            }
            TableColumnForEach(track.channels) { channel in
                TableColumn(channel.name) { sample in
                    Text(sample.level(channel: channel.id),
                         format: .number.precision(.fractionLength(2))
                    )
                    .monospacedDigit()
                }
                .width(ideal: 70)
                .alignment(.numeric)
            }
        }
    }
}
```

### Table Styles

```swift
// Inset (no borders)
Table(people) { /* columns */ }
    .tableStyle(.inset)

// Hide column headers
Table(people) { /* columns */ }
    .tableColumnHeaders(.hidden)
```

### Platform Behavior

| Platform | Behavior |
|----------|----------|
| **iPadOS (regular)** | Full multi-column layout; headers and all columns visible |
| **iPadOS (compact)** | Only the first column shown; headers hidden |
| **iPhone (all sizes)** | Only the first column shown; headers hidden; list-like appearance |

> **Best Practice:** Prefer handling the compact size class by showing combined info in the first column. This provides a seamless transition when the size class changes (e.g., entering/exiting Slide Over on iPad).

## Summary Checklist

- [ ] ForEach uses stable identity (never `.indices` or `\.offset` for dynamic content)
- [ ] Identifiable IDs are truly unique across all items
- [ ] id is stable across edits (not derived from a mutable property), created outside `body`, and cheap to hash
- [ ] Constant number of views per ForEach element; rows are unary (single top-level view)
- [ ] No inline filtering in ForEach (prefilter and cache instead)
- [ ] No `AnyView` in list rows
- [ ] `.enumerated()` uses the element's id (not `\.offset`); no `Array(...)` wrapper needed on Swift 6.1+
- [ ] Use `.refreshable` for pull-to-refresh
- [ ] Use `ContentUnavailableView` for empty states (iOS 17+)
- [ ] Use `.scrollContentBackground(.hidden)` for custom list backgrounds
- [ ] `Table` adapts for compact size classes (first column shows combined info)
- [ ] `Table` sorting re-sorts data in `.onChange(of: sortOrder)` (table doesn't sort itself)
- [ ] `Table` data conforms to `Identifiable`
