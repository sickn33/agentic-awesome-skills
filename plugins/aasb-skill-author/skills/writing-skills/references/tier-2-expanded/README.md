---
description: When to use Tier 2 (Expanded) skill architecture.
metadata:
  tags: [tier-2, expanded, multi-file]
---

# Tier 2: Expanded Skills

Multi-file skills for complex topics with multiple sub-concepts.

## When to Use

- **Multiple related concepts**: Needs separation of concerns
- **200-1000 lines total**: Too big for one file
- **Needs reference files**: Patterns, examples, troubleshooting
- **Cross-linking**: Users need to navigate between sub-topics

## Structure

```
my-skill/
├── SKILL.md              # Overview + navigation
└── references/
    ├── core/
    │   ├── README.md     # Main concept
    │   └── api.md        # API reference
    ├── patterns/
    │   └── README.md     # Usage patterns
    └── troubleshooting/
        └── README.md     # Common issues
```

## Example

The `writing-skills` skill itself is Tier 2:

```
writing-skills/
├── SKILL.md              # Decision tree + navigation
├── gotchas.md            # Tribal knowledge
└── references/
    ├── anti-rationalization/
    ├── cso/
    ├── standards/
    ├── templates/
    └── testing/
```

## Progressive Disclosure

1. **Metadata** (~100 tokens): Name + description loaded at startup
2. **SKILL.md** (<500 lines): Decision tree + index
3. **References** (as needed): Loaded only when user navigates

## Key Differences from Tier 1

| Aspect | Tier 1 | Tier 2 |
|--------|--------|--------|
| Files | 1 | 5-20 |
| Total lines | <200 | 200-1000 |
| Decision logic | None | Simple tree |
| Token cost | Minimal | Medium (progressive) |

## Checklist

- [ ] SKILL.md has clear navigation links
- [ ] Each `references/` subdir has README.md
- [ ] No circular references between files
- [ ] Decision tree points to specific files
