---
name: makepad-dsl
description: |
  CRITICAL: Use for Makepad DSL syntax and inheritance. Triggers on:
  makepad dsl, live_design, makepad inheritance, makepad prototype,
  "<Widget>", "Foo = { }", makepad object, makepad property,
  makepad DSL 语法, makepad 继承, makepad 原型, 如何定义 makepad 组件
risk: safe
source: community
---

# Makepad DSL Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at the Rust `makepad-widgets` crate DSL. Help users by:
- **Writing code**: Generate DSL code following the patterns below
- **Answering questions**: Explain DSL syntax, inheritance, property overriding

## When to Use
- You need help with Makepad `live_design!` syntax, object definitions, or inheritance patterns.
- The task involves widget declarations, property overrides, prototypes, or DSL composition rules.
- You want Makepad DSL-specific examples rather than generic Rust syntax advice.

## Documentation

Refer to the local files for detailed documentation:
- `./references/dsl-syntax.md` - Complete DSL syntax reference
- `./references/inheritance.md` - Inheritance patterns and examples

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Key Patterns

### 1. Anonymous Object

```rust
{
    width: 100.0
    height: 50.0
    color: #FF0000
}
```

### 2. Named Object (Prototype)

```rust
MyButton = {
    width: Fit
    height: 40.0
    padding: 10.0
    draw_bg: { color: #333333 }
}
```

### 3. Inheritance with Override

```rust
PrimaryButton = <MyButton> {
    draw_bg: { color: #0066CC }  // Override parent color
    draw_text: { color: #FFFFFF }  // Add new property
}
```

### 4. Widget Instantiation

```rust
<View> {
    // Inherits from View prototype
    width: Fill
    height: Fill

    <Button> { text: "Click Me" }  // Child widget
    <Label> { text: "Hello" }      // Another child
}
```

### 5. Linking Rust Struct to DSL

```rust
// In live_design!
MyWidget = {{MyWidget}} {
    // DSL properties
    width: 100.0
}

// In Rust
#[derive(Live, LiveHook, Widget)]
pub struct MyWidget {
    #[deref] view: View,
    #[live] width: f64,
}
```

## DSL Syntax Reference

| Syntax | Description | Example |
|--------|-------------|---------|
| `{ ... }` | Anonymous object | `{ width: 100.0 }` |
| `Name = { ... }` | Named prototype | `MyStyle = { color: #FFF }` |
| `<Name> { ... }` | Inherit from prototype | `<MyStyle> { size: 10.0 }` |
| `{{RustType}}` | Link to Rust struct | `App = {{App}} { ... }` |
| `name = <Widget>` | Named child widget | `btn = <Button> { }` |
| `dep("...")` | Resource dependency | `dep("crate://self/img.png")` |

## Property Types

| Type | Example | Description |
|------|---------|-------------|
| Number | `width: 100.0` | Float value |
| Color | `color: #FF0000FF` | RGBA hex color |
| String | `text: "Hello"` | Text string |
| Enum | `flow: Down` | Enum variant |
| Size | `width: Fit` | Fit, Fill, or numeric |
| Object | `padding: { top: 10.0 }` | Nested object |
| Array | `labels: ["A", "B"]` | List of values |

## Inheritance Rules

1. **Eager Copy**: All parent properties are copied immediately
2. **Override**: Child can override any parent property
3. **Extend**: Child can add new properties
4. **Nested Override**: Override nested objects partially

```rust
Parent = {
    a: 1
    nested: { x: 10, y: 20 }
}

Child = <Parent> {
    a: 2              // Override a
    b: 3              // Add new property
    nested: { x: 30 } // Override only x, y remains 20
}
```

## When Writing Code

1. Use `<Widget>` syntax to inherit from built-in widgets
2. Define reusable styles as named prototypes
3. Use `{{RustType}}` to link DSL to Rust structs
4. Override only properties that need to change
5. Use meaningful names for child widget references

## When Answering Questions

1. Explain inheritance as "eager copy" - properties are copied at definition time
2. Emphasize that DSL is embedded in Rust via `live_design!` macro
3. Highlight that changes to DSL are live-reloaded without recompilation
4. Distinguish between named objects (prototypes) and widget instances

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
