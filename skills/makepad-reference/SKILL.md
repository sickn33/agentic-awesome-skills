---
name: makepad-reference
description: "This category provides reference materials for debugging, code quality, and advanced layout patterns."
risk: unknown
source: community
---

# Makepad Reference

This category provides reference materials for debugging, code quality, and advanced layout patterns.

## When to Use
- You need quick-reference material for common Makepad errors, debugging, or API lookups.
- The task is diagnostic or reference-oriented rather than writing a focused feature in one subsystem.
- You want a central starting point before diving into more specialized Makepad skills.

## Quick Navigation

| Topic | File | Use When |
|-------|------|----------|
| API Documentation | Official docs index, quick API reference | Finding detailed API info |
| Troubleshooting | Common errors and fixes | Build fails, runtime errors |
| Code Quality | Makepad-aware refactoring | Simplifying code safely |
| Adaptive Layout | Desktop/mobile responsive | Cross-platform layouts |

## Common Issues Quick Reference

| Error | Quick Fix |
|-------|-----------|
| `no matching field: font` | Use `text_style: <THEME_FONT_*>{}` |
| Color parse error (ends in `e`) | Change last digit (e.g., `#14141e` → `#14141f`) |
| `set_text` missing argument | Add `cx` as first argument |
| UI not updating | Call `redraw(cx)` after changes |
| Widget not found | Check ID spelling, use `ids!()` for paths |

## Debug Tips

```bash
# Run with line info for better error messages
MAKEPAD=lines cargo +nightly run
```

```rust
// Add logging
log!("Value: {:?}", my_value);
log!("State: {} / {}", self.counter, self.is_loading);
```

## Resources

- [Makepad Official Docs](https://publish.obsidian.md/makepad-docs/) - Obsidian-based documentation
- [Makepad Repository](https://github.com/makepad/makepad)
- [Robrix](https://github.com/project-robius/robrix) - Production reference
- [Moly](https://github.com/moxin-org/moly) - Production reference

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
