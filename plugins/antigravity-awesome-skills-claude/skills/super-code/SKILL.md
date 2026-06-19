---
name: super-code
description: "Standing house style to enforce dense, correct, and idiomatic code on all coding tasks. Minimizes code bloat and agent operation overhead."
risk: safe
source: community
date_added: "2026-06-16"
---

# Super Code Skill

## Overview

Produce code that is short, correct, idiomatic, and maintainable — in that priority order.
This skill addresses two distinct inefficiency types that must be fixed independently:

1. **Code-token inefficiency** — the artifact itself is bloated (unnecessary lines, boilerplate, over-abstraction)
2. **Generation-token inefficiency** — how the agent operates during a session (full-file rewrites, unrequested files, prose padding before/after changes)

Both matter. Fixing only one is not enough.

## When to Use This Skill

- Apply this skill automatically on EVERY coding task in the IDE.
- Use whenever the user asks to write, edit, refactor, generate, or review code in any language.
- This is a standing house style, not an on-demand pass — always apply it.

---

## Priority Order (never violate this ranking)

```
Correctness → Clarity → Necessary robustness → Conciseness → Micro-performance
```

Conciseness **never** wins over correctness or readability. If a compression would drop error handling for a case that can actually occur, or produce code a human couldn't read in six months, undo that specific compression. Short bad code is worse than long correct code.

---

## Workflow — apply to every coding task

### Step 1: Commit to minimal correct shape BEFORE writing

Before touching a file, decide:
- What is the smallest surface area that correctly solves this problem?
- What does the caller actually need from this function/class/module?
- Is there a stdlib/framework primitive that already does this?

Write that down mentally (not in a prose block to the user). This is the target shape.

### Step 2: Write using language-idiomatic patterns

Read the relevant reference file for the language in use:
- Bash/Shell → `bash/SKILL.md`
- C → `c/SKILL.md`
- C++ → `cpp/SKILL.md`
- C# → `csharp/SKILL.md`
- Dart/Flutter → `dart/SKILL.md`
- Elixir/Erlang → `elixir/SKILL.md`
- Go → `go/SKILL.md`
- Java → `java/SKILL.md`
- Kotlin/Compose → `kotlin/SKILL.md`
- PHP → `php/SKILL.md`
- Python → `python/SKILL.md`
- Ruby → `ruby/SKILL.md`
- Rust → `rust/SKILL.md`
- Scala → `scala/SKILL.md`
- Swift → `swift/SKILL.md`
- TypeScript/JavaScript → `typescript/SKILL.md`

Apply idiomatic patterns from that file. They replace verbose imperative code with correct, concise equivalents that are still readable.

### Step 3: Compression pass on your own draft

Before presenting any code, scan it for:

| Anti-pattern | Fix |
|---|---|
| Comment restates what code does | Delete comment, or rewrite to say *why* |
| Single-use helper function/class | Inline it |
| Stdlib/framework already does this | Replace with the primitive |
| Defensive handling for impossible case | Remove |
| Verbose loop replaceable by idiomatic expression | Replace |
| Logging/print nobody asked for | Remove |
| Extra config/files/parameters not requested | Remove |
| Unused import or variable | Remove |

### Step 4: Guardrail check — run this before presenting

Ask yourself (silently):
- [ ] Did I remove handling for a case that **can** actually happen?
- [ ] Did I make this harder to read for a human six months from now?
- [ ] Did I drop correctness or security to save lines?

If yes to any: undo that specific compression and keep the rest.

### Step 5: Present output — generation-token rules

**Always:**
- Edit files via targeted patches/diffs, not full rewrites, unless the file is new or the change touches >70% of lines
- Present only what was asked for

**Never:**
- Generate unrequested files (tests, READMEs, configs, types) unless the user asked
- Add prose blocks before/after code explaining what you're about to do or just did — just do it
- Re-explain the user's own requirement back to them before writing
- Restate what changed in a paragraph after showing the diff — the diff is self-evident

---

## Universal Anti-Pattern Checklist

These apply in every language. The language-specific files extend this list.

### Comments
- ❌ `// Loop through the list and add each item` → ❌ delete
- ✅ `// Order matters: process refunds before charges` → ✅ keep (explains *why*)
- Rule: if the comment could be generated mechanically from reading the code, it adds no value

### Defensive coding
- Only handle error cases that can actually occur given the call site
- If the caller guarantees non-null, don't null-check inside the function
- If a catch block can only log and rethrow, consider removing the try/catch

### Abstractions
- Don't extract a function for logic used exactly once in one place
- Don't create a wrapper class around a primitive used only once
- Threshold: abstraction earns its place when it's used 2+ times OR when it has a meaningful name that genuinely clarifies domain logic

### Scaffolding
- No placeholder TODOs unless the user asked for a scaffold
- No `// TODO: add error handling` — either add it or don't
- No empty catch blocks "just in case"
- No parameters the current callers don't use

---

## Generation-Token Rules (agentic IDE specific)

These govern how you operate inside the session, not just what you produce:

### File edits
- Prefer surgical patches: show only the changed lines + minimal context
- Full file rewrite is acceptable only for: new files, files shorter than ~30 lines, or changes touching >70% of the file
- Never repeat unchanged portions of a file to "show the full context"

### Unrequested artifacts
- Do not create test files, README updates, type definition files, config files, or CI scripts unless explicitly requested
- If you believe a test file would be valuable, offer it in one sentence after the main output — don't generate it unasked

### Prose overhead
- No "Here's what I'm going to do:" preambles
- No "I've made the following changes:" postambles (the diff shows this)
- No "Let me know if you'd like me to..." closers
- One-line clarification is acceptable if a requirement is genuinely ambiguous; otherwise, make a reasonable choice and note the assumption in a comment inside the code if it matters

---

## Language Reference Files

| Language / Stack | File |
|---|---|
| Bash / Shell | `bash/SKILL.md` |
| C | `c/SKILL.md` |
| C++ | `cpp/SKILL.md` |
| C# / .NET | `csharp/SKILL.md` |
| Dart / Flutter | `dart/SKILL.md` |
| Elixir / Erlang | `elixir/SKILL.md` |
| Go | `go/SKILL.md` |
| Java | `java/SKILL.md` |
| Kotlin + Compose (Android) | `kotlin/SKILL.md` |
| PHP | `php/SKILL.md` |
| Python | `python/SKILL.md` |
| Ruby | `ruby/SKILL.md` |
| Rust | `rust/SKILL.md` |
| Scala | `scala/SKILL.md` |
| Swift (iOS/macOS) | `swift/SKILL.md` |
| TypeScript / JavaScript | `typescript/SKILL.md` |

Read the relevant file at Step 2. If the language isn't listed, apply the universal checklist above and use the language's own idioms for loops, error handling, and data transformation.

## Examples

### Example 1: Refactoring a verbose loop
```java
// Anti-pattern
List<String> names = new ArrayList<>();
for (User u : users) {
    if (u.isActive()) {
        names.add(u.getName());
    }
}
// Super-code idiomatic (Java)
List<String> names = users.stream().filter(User::isActive).map(User::getName).toList();
```

## Troubleshooting

### Problem: Code is too dense to read
**Symptoms:** Reviewer complains or logic is unreadable.
**Solution:** Revert the overly compressed section. Clarity and correctness always win over conciseness.

## Related Skills

- `@karpathy-guidelines` - For behavioral guidelines on surgical changes and simplicity.

## Limitations

- **Language Support:** Language-specific idioms require reference files.
- **Readability Tradeoffs:** Extreme compression can sometimes harm readability if not careful.
