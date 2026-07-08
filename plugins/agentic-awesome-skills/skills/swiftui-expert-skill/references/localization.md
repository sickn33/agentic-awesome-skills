# SwiftUI Localization Reference

Guidance for user-facing text: `Text`, `Button`, `Label`, navigation/toolbar titles, alerts, and types that carry localizable strings. For the narrower "verbatim vs localized" decision on a single `Text`, see `references/text-patterns.md`.

## Table of Contents

- [SwiftUI Localizes String Literals Automatically](#swiftui-localizes-string-literals-automatically)
- [String Catalogs](#string-catalogs)
- [Bundle for Swift Packages and Frameworks](#bundle-for-swift-packages-and-frameworks)
- [Localizing Variables and Custom Types](#localizing-variables-and-custom-types)
- [LocalizedStringResource for Non-View Types](#localizedstringresource-for-non-view-types)
- [Interpolation vs Concatenation](#interpolation-vs-concatenation)
- [Casing](#casing)
- [Formatting Dates, Numbers, and Currencies](#formatting-dates-numbers-and-currencies)
- [Layout for Localization](#layout-for-localization)
- [Reading the Current Locale](#reading-the-current-locale)
- [String(localized:) Outside SwiftUI Views](#stringlocalized-outside-swiftui-views)
- [Comments for Translators](#comments-for-translators)

## SwiftUI Localizes String Literals Automatically

Initializers that accept `LocalizedStringKey` (`Text`, `Button`, `Label`, `.navigationTitle`, alert titles, and so on) treat string literals as localization keys automatically. Do not wrap literals in `NSLocalizedString`, `String(localized:)`, or `LocalizedStringResource` — that resolves the string eagerly and ignores `\.locale` overrides.

```swift
// AVOID: double work, and resolves eagerly
Text(String(localized: "start_workout"))

// PREFER: pass the literal directly
Text("start_workout")
```

Both opaque keys (`"start_workout"`) and natural-language strings (`"Start Workout"`) work as keys — pick whichever convention the project already uses. Use `Text(verbatim:)` only to opt a literal out of localization (e.g. a debug label interpolating a runtime value). When the argument is already a `String` variable, `Text(value)` calls the `StringProtocol` overload and skips localization on its own.

## String Catalogs

Most projects localize through String Catalogs (`.xcstrings`). Each build syncs new keys from code into the catalog, but the catalog file must already exist — Xcode doesn't create one automatically. If a project already uses `.strings` / `.stringsdict`, add new strings there rather than migrating. Route groups of strings to a specific catalog with `tableName:`.

```swift
Text("Explore", tableName: "Navigation",
     comment: "Tab bar item title for the Explore screen.")
```

## Bundle for Swift Packages and Frameworks

Apps, app extensions, and XPC services are their own main bundle, so `bundle` can be omitted. Frameworks and Swift packages need an explicit `bundle:` — without one, SwiftUI looks up strings in `Bundle.main`, the lookup fails silently, and the string appears unlocalized at runtime.

```swift
// AVOID (inside a framework/package): searches the app's catalog
Text("Save to Favorites")

// PREFER: #bundle resolves to the current target's bundle
Text("Save to Favorites", bundle: #bundle,
     comment: "Button to bookmark a recipe.")
```

`#bundle` is the preferred form; `Bundle.module` and `Bundle(for:)` still work but are older patterns.

## Localizing Variables and Custom Types

A `String` variable passed to `Text` runs the `StringProtocol` overload and is **not** localized. Wrapping it in `LocalizedStringKey(_:)` doesn't help — Xcode can't extract a literal from a runtime value, so nothing lands in the catalog. To localize a value chosen from a known set, model it with a type that exposes `LocalizedStringResource`:

```swift
enum Category {
    case appetizers, mains, desserts
    var name: LocalizedStringResource {
        switch self {
        case .appetizers: "Appetizers"
        case .mains: "Mains"
        case .desserts: "Desserts"
        }
    }
}

Text(category.name)
```

When a view or model exposes user-facing text, type the property as `LocalizedStringKey` or `LocalizedStringResource` rather than `String`. Every SwiftUI view that takes localized text accepts both, so deferring resolution costs nothing at the display site and preserves locale/bundle context.

## LocalizedStringResource for Non-View Types

When a non-view type carries user-facing text — a model object, a tip, a queued notification — use `LocalizedStringResource` instead of `String`. It defers resolution to display time, so it honors the locale active when the value actually renders, not when it was created.

```swift
// AVOID: resolved at creation time, can't re-render in another locale
struct Tip { let headline: String }
let tip = Tip(headline: String(localized: "Tip of the Day"))

// PREFER: resolution deferred to display time
struct Tip { let headline: LocalizedStringResource }
let tip = Tip(headline: "Tip of the Day")
```

Apply this when designing new types or changing user-facing text — don't sweep through existing `String` properties as part of unrelated edits.

## Interpolation vs Concatenation

String interpolation preserves `LocalizedStringKey` and produces a format string in the catalog (e.g. `"Welcome, %@"`). Concatenation with `+` produces a plain `String` and is not localized. Never glue separately localized fragments into a sentence — word order varies across languages.

```swift
// AVOID: + produces String; sentence assembly breaks word order
Text("Error: " + statusMessage)
Text(String(localized: "Created by")) + Text(" ") + Text(authorName)

// PREFER: one interpolated string translators can rearrange
Text("Error: \(statusMessage)")
Text("Created by \(authorName)")
```

## Casing

Bake the desired case into the string rather than transforming at runtime via `.textCase(_:)`, `.localizedUppercase`, or `.localizedCapitalized`. A runtime transform forces the same casing on every translation, leaving translators no room to adjust per language.

```swift
// AVOID
Text("Section Header").textCase(.uppercase)

// PREFER
Text("SECTION HEADER")
```

This applies to localized strings; display user-entered text as-is. If a transform is unavoidable, prefer `.localizedUppercase` / `.localizedCapitalized`, which honor the user's locale.

## Formatting Dates, Numbers, and Currencies

Use `Text`'s `format:` parameter or `.formatted()` instead of `DateFormatter` / `NumberFormatter` with hardcoded format strings. Format styles adapt to the user's locale; hardcoded format strings don't.

```swift
// AVOID
let f = DateFormatter(); f.dateFormat = "MM/dd/yyyy"
Text(f.string(from: workout.date))
Text("$\(product.price, specifier: "%.2f")")

// PREFER
Text(workout.date, format: .dateTime.month().day().year())
Text(product.price, format: .currency(code: store.currencyCode))
```

Field components (`.month()`, `.day()`) choose which fields appear; the locale decides the order. For lists, `Array.formatted()` inserts locale-correct separators and conjunctions instead of `joined(separator:)`. When `DateFormatter` is genuinely unavoidable, use `setLocalizedDateFormatFromTemplate(_:)` rather than assigning `dateFormat`.

## Layout for Localization

- Use `.leading` / `.trailing` instead of `.left` / `.right` — they flip for right-to-left locales.
- Don't hardcode frame widths/heights for text; translations vary in length and scripts vary in height. Use `ViewThatFits` when a layout might not fit longer translations.
- Use text styles (`.body`, `.headline`) rather than fixed point sizes, so line height adapts per script.

```swift
// PREFER
Text(recipe.title)
    .frame(maxWidth: .infinity, alignment: .leading)

ViewThatFits {
    HStack { actionButtons }
    VStack { actionButtons }
}
```

## Reading the Current Locale

Use `@Environment(\.locale)` for locale-dependent logic in views, not `Locale.current` — the environment respects preview overrides and per-view injection.

## String(localized:) Outside SwiftUI Views

When you need a localized `String` outside a view, use `String(localized:)`, not `NSLocalizedString`. Don't interpolate inside `NSLocalizedString` — Xcode extracts keys from literals at build time and can't extract interpolated values. `String(localized:)` supports interpolation (it extracts the format string and treats values as runtime arguments) and is preferred over `String(format:)`, which always renders digits as 0–9 regardless of locale.

```swift
// PREFER
let title = String(localized: "activity_summary", comment: "Dashboard header")
```

## Comments for Translators

Add a `comment:` describing the UI element and its purpose, especially for ambiguous strings. For interpolated strings, describe each placeholder by position — translators don't see Swift variable names. Comments can live at the call site or in the String Catalog's per-string Comment field; keep one source of truth per string.

```swift
// AVOID: "Edit" could be a noun or a verb
Text("Edit")

// PREFER
Text("Edit", comment: "Toolbar button that enters editing mode for the list.")
Text("Completed \(count) of \(total)",
     comment: "Progress label — first variable is finished items, second is the total.")
```

## Summary Checklist

- [ ] String literals passed directly to `Text`/`Button`/`Label` (not wrapped in `NSLocalizedString`/`String(localized:)`)
- [ ] `bundle: #bundle` on user-facing strings inside frameworks and Swift packages
- [ ] User-facing text on models/non-view types typed as `LocalizedStringResource`, not `String`
- [ ] Interpolation (not `+`) for dynamic strings; no sentence assembly from fragments
- [ ] Case baked into the string, not applied via `.textCase`
- [ ] Dates/numbers/currencies use `format:` / `.formatted()` with locale-aware styles
- [ ] `.leading`/`.trailing` (not `.left`/`.right`); no hardcoded text frame sizes
- [ ] `@Environment(\.locale)` for locale logic in views
- [ ] `comment:` provided for ambiguous strings and interpolated placeholders
