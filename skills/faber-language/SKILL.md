---
name: faber-language
description: "Write, check and run Faber programs, an experimental statically typed language for coding agents and human authors. Defers to the live faberlang.dev agent docs."
category: development
risk: safe
source: community
source_repo: faberlang/faber
source_type: official
date_added: "2026-10-23"
author: ianzepp
tags: [faber, programming-language, compiler, agents]
tools: [claude, cursor, gemini, codex]
license: "MIT OR Apache-2.0"
license_source: "https://github.com/faberlang/faber"
---

# Faber Language

## Overview

Faber (full name Faber Romanus) is a statically typed language for coding agents and human authors. It has a clear mechanical grammar, explicit static and generic types, and math-oriented operators. The same program can be read in eight human languages, and it compiles to Rust, TypeScript, Go, Swift and more. Faber is experimental through version 1.x: breaking changes ship in minor releases, so this skill points at the live docs instead of restating rules that may change.

## When to Use This Skill

- Use when the user asks you to write, review or fix `.fab` source.
- Use when a `faber check` or `faber run` diagnostic needs explaining.
- Use when the user wants Faber code emitted to another language (for example Rust or TypeScript).

## How It Works

### Step 1: Load the current rules

Fetch https://faberlang.dev/llms.txt, then the writing guide it names (https://faberlang.dev/agents/index.md), and follow only the links that page lists. Do not write Faber from memory of other languages.

### Step 2: Confirm the CLI is installed

Run `faber --version`. If it is missing, tell the user and point them to https://faberlang.dev/install.md, which installs a checksum-verified release binary (macOS arm64 and Linux x64 only). Do not install software without the user's consent.

### Step 3: Write in the English reader spelling

Key signals of the English spelling:

- Types come before names: `string name`, `int n`.
- Functions: `fn name(int a) → int`.
- `←` binds a value; `≡` tests equality; `=` is not assignment.
- Absence is a type: `int ∪ none`, and the missing value is `null`.
- A function's error channel is declared with `⇥` and raised with `throw`; `⊥` supplies a fallback value.
- Comments are a `#` line on its own.

### Step 4: Check, then run

Run `faber check file.fab` until it prints `ok`, then `faber run file.fab` to execute it on the reference interpreter. Use `faber explain <CODE>` for any diagnostic code. To see another language, run `faber emit -t rust file.fab` (or `ts`, `go`, `swift`, `python`).

## Examples

### Example 1: Error channel and fallback

```text
fn divide(int a, int b) → int ⇥ string {
    if b ≡ 0 then throw "division by zero"
    return a / b
}

main {
    let list<string> names ← ["Ana", "Ben"]
    for from names let name {
        print "Salve, §!"(name)
    }
    print divide(7, 0) ⊥ -1
}
```

`faber run` prints `Salve, Ana!`, `Salve, Ben!`, then `-1`.

### Example 2: Generics and absence

```text
fn first<T>(list<T> items, T fallback) → T {
    return items.get(0) coalesce fallback
}

main {
    let int ∪ none maybe ← null
    print first([3, 4], 0)
    print maybe coalesce 42
}
```

`faber run` prints `3`, then `42`.

## Best Practices

- ✅ Fetch the live writing guide before writing non-trivial code.
- ✅ Run `faber check` after every edit and fix diagnostics before running.
- ✅ Keep one reader locale per source file.
- ❌ Don't write `name: T`, `int?`, `//` comments, or a `#` comment after code on the same line.
- ❌ Don't assume a construct is supported on every emit target; unsupported constructs are rejected by name.

## Limitations

- Faber is experimental through 1.x; syntax and standard library names change between minor releases.
- Release binaries exist for macOS arm64 and Linux x64 only.
- Some emit targets ship only in the official binary; the open-source front end lives at https://github.com/faberlang/faber.
- This skill does not replace environment-specific validation, testing, or expert review.

## Security & Safety Notes

- Installing the CLI downloads a binary from GitHub releases; https://faberlang.dev/install.md verifies its SHA-256 before use. Ask the user before installing anything.
- `faber check`, `faber run` and `faber emit` read local files and run the program on the local interpreter; only run programs you have read.

## Common Pitfalls

- **Problem:** Writing `=` for assignment or comparison.
  **Solution:** Use `←` to bind and `≡` to compare.
- **Problem:** Code from an older Faber version fails `faber check`.
  **Solution:** Re-read the current writing guide; minor releases can rename or remove syntax.

## Related Skills

- Official Faber skills (install, language, packages, corpus): `npx skills add https://faberlang.dev`
