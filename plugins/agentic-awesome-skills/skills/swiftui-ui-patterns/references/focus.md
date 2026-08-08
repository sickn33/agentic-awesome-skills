# Focus handling and field chaining

## Intent

Use `@FocusState` to control keyboard focus, chain fields, and coordinate focus across complex forms.

## Core patterns

- Use an enum to represent focusable fields.
- Set initial focus in `onAppear`.
- Use `.onSubmit` to move focus to the next field.
- For dynamic lists of fields, use an enum with associated values (e.g., `.option(Int)`).

## Example: single field focus

```swift
struct AddServerView: View {
  @State private var server = ""
  @FocusState private var isServerFieldFocused: Bool

  var body: some View {
    Form {
      TextField("Server", text: $server)
        .focused($isServerFieldFocused)
    }
    .onAppear { isServerFieldFocused = true }
  }
}
```

## Example: chained focus with enum

```swift
struct EditTagView: View {
  enum FocusField { case title, symbol, newTag }
  @FocusState private var focusedField: FocusField?

  var body: some View {
    Form {
      TextField("Title", text: $title)
        .focused($focusedField, equals: .title)
        .onSubmit { focusedField = .symbol }

      TextField("Symbol", text: $symbol)
        .focused($focusedField, equals: .symbol)
        .onSubmit { focusedField = .newTag }
    }
    .onAppear { focusedField = .title }
  }
}
```

## Example: dynamic focus for variable fields

```swift
struct PollView: View {
  enum FocusField: Hashable { case option(Int) }
  @FocusState private var focused: FocusField?
  @State private var options: [String] = ["", ""]
  @State private var currentIndex = 0

  var body: some View {
    ForEach(options.indices, id: \.self) { index in
      TextField("Option \(index + 1)", text: $options[index])
        .focused($focused, equals: .option(index))
        .onSubmit { addOption(at: index) }
    }
    .onAppear { focused = .option(0) }
  }

  private func addOption(at index: Int) {
    options.append("")
    currentIndex = index + 1
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
      focused = .option(currentIndex)
    }
  }
}
```

## Design choices to keep

- Keep focus state local to the view that owns the fields.
- Use focus changes to drive UX (validation messages, helper UI).
- Pair with `.scrollDismissesKeyboard(...)` when using ScrollView/Form.

## Pitfalls

- Don’t store focus state in shared objects; it is view-local.
- Avoid aggressive focus changes during animation; delay if needed.
