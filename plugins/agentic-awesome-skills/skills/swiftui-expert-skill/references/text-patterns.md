# SwiftUI Text Patterns Reference

> For broader localization guidance — String Catalogs, `#bundle` for packages, `LocalizedStringResource`, locale-aware formatting, RTL layout, and translator comments — see `references/localization.md`. This file covers only the verbatim-vs-localized decision for a single `Text`.

## Table of Contents

- [Text Initialization: Verbatim vs Localized](#text-initialization-verbatim-vs-localized)

## Text Initialization: Verbatim vs Localized

**Default: always use `Text("…")`.** Only use `Text(verbatim:)` when explicitly required for a string literal that must not be localized.

```swift
// Localized literal - "Save" is used as the localization key and looked up in Localizable.strings (only if one exists in the project)
Text("Save")

// String variable - bypasses localization automatically; no verbatim needed
let filename: String = model.exportFilename
Text(filename)

// Non-localized literal - use verbatim only when the literal must not be localized
Text(verbatim: "pencil")
```

### Decision Flow

```
Is the input a String variable or dynamic value?
└─ YES → Text(variable)          // bypasses localization automatically

Is the string literal intended for localization?
├─ YES → Text("…")               // default; key looked up in Localizable.strings
└─ NO  → Text(verbatim: "…")     // only when explicitly non-localized
```
