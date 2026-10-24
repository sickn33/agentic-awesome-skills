---
name: makepad-splash
description: |
  CRITICAL: Use for Makepad Splash scripting language. Triggers on:
  splash language, makepad script, makepad scripting, script!, cx.eval,
  makepad dynamic, makepad AI, splash 语言, makepad 脚本
risk: critical
source: community
date_added: "2026-03-06"
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `./references/splash-tutorial.md`

Ask for the original supporting material or an existing installation before using a step that depends on these paths; this catalog does not identify a verified download source for them. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# Makepad Splash Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad Splash scripting language. Help users by:
- **Writing Splash scripts**: Dynamic UI and workflow automation
- **Understanding Splash**: Purpose, syntax, and capabilities

## When to Use
- You need dynamic scripting inside Makepad using Splash.
- The task involves `script!`, `cx.eval`, runtime-generated UI, or workflow automation in Makepad.
- You want guidance on Splash syntax and purpose rather than static Rust-only patterns.

## Documentation

Refer to the local files for detailed documentation:
- `./references/splash-tutorial.md` - Splash language tutorial

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Report missing references; the sync command is not bundled and --force is not an authorized automatic fallback.
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## What is Splash?

Splash is Makepad's dynamic scripting language designed for:
- AI-assisted workflows
- Dynamic UI generation
- Rapid prototyping
- HTTP requests and async operations

## Script Macro

```rust
// Embed Splash code in Rust
script!{
    fn main() {
        let x = 10;
        console.log("Hello from Splash!");
    }
}
```

The API names/syntax below are historical dev-branch illustrations, not compiled examples. Verify them in the pinned Makepad source; the missing tutorial cannot establish a runnable language/API contract. Never evaluate model-generated, downloaded or user-content strings directly. Bound loops/timers and permit only authorized HTTP destinations/payloads.

## Execution

```rust
// Evaluate Splash code at runtime
cx.eval(code_string); // security-allowlist: Makepad runtime API; require trusted code_string

// With context
cx.eval_with_context(code, context);
```

## Basic Syntax

### Variables

```splash
let x = 10;
let name = "Makepad";
let items = [1, 2, 3];
let config = { width: 100, height: 50 };
```

### Functions

```splash
fn add(a, b) {
    return a + b;
}

fn greet(name) {
    console.log("Hello, " + name);
}
```

### Control Flow

```splash
// If-else
if x > 10 {
    console.log("big");
} else {
    console.log("small");
}

// Loops
for i in 0..10 {
    console.log(i);
}

while condition {
    // ...
}
```

## Built-in Objects

### console

```splash
console.log("Message");
console.warn("Warning");
console.error("Error");
```

### http

```splash
// GET request
let response = http.get("https://api.example.com/data");

// POST request
let response = http.post("https://api.example.com/data", {
    body: { key: "value" }
});
```

### timer

```splash
// Set timeout
timer.set(1000, fn() {
    console.log("1 second passed");
});

// Set interval
let id = timer.interval(500, fn() {
    console.log("tick");
});

// Clear timer
timer.clear(id);
```

## Widget Interaction

```splash
// Access widgets
let button = ui.widget("my_button");
button.set_text("Click Me");
button.set_visible(true);

// Listen to events
button.on_click(fn() {
    console.log("Button clicked!");
});
```

## Async Operations

```splash
// Async function
async fn fetch_data() {
    let response = await http.get("https://api.example.com");
    return response.json();
}

// Call async
fetch_data().then(fn(data) {
    console.log(data);
});
```

## AI Workflow Integration

Splash is designed for AI-assisted development:

```splash
// Dynamic UI generation
fn create_form(fields) {
    let form = ui.create("View");
    for field in fields {
        let input = ui.create("TextInput");
        input.set_label(field.label);
        form.add_child(input);
    }
    return form;
}

// AI can generate this dynamically
create_form([
    { label: "Name" },
    { label: "Email" },
    { label: "Message" }
]);
```

## Use Cases

1. **Rapid Prototyping**: Quickly test UI layouts without recompilation
2. **AI Agents**: Let AI generate and modify UI dynamically
3. **Configuration**: Runtime configuration of app behavior
4. **Scripted Workflows**: Automate repetitive tasks
5. **Plugin System**: Extend app functionality with scripts

## When Answering Questions

1. Splash is for dynamic/runtime scripting, not core app logic
2. Use Rust for performance-critical code, Splash for flexibility
3. Splash syntax is similar to JavaScript/Rust hybrid
4. Do not assume scripts are sandboxed. Verify the exact pinned runtime, exposed APIs and filesystem/network capabilities before evaluating trusted reviewed code.
5. HTTP and timer APIs enable async operations

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
