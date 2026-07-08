---
description: When to use Tier 1 (Simple) skill architecture.
metadata:
  tags: [tier-1, simple, single-file]
---

# Tier 1: Simple Skills

Single-file skills for focused, specific purposes.

## When to Use

- **Single concept**: One technique, one pattern, one reference
- **Under 200 lines**: Can fit comfortably in one file
- **No complex decision logic**: User knows exactly what they need
- **Frequently loaded**: Needs minimal token footprint

## Structure

```
my-skill/
└── SKILL.md          # Everything in one file
```

## Example

```yaml
---
name: flatten-with-flags
description: Use when simplifying deeply nested conditionals.
metadata:
  category: pattern
  triggers: nested if, complex conditionals, early return
---

# Flatten with Flags

## When to Use
- Code has 3+ levels of nesting
- Conditions are hard to follow

## The Pattern
Replace nested conditions with early returns and flag variables.

## Before
```javascript
function process(data) {
  if (data) {
    if (data.valid) {
      if (data.ready) {
        return doWork(data);
      }
    }
  }
  return null;
}
```

## After
```javascript
function process(data) {
  if (!data) return null;
  if (!data.valid) return null;
  if (!data.ready) return null;
  return doWork(data);
}
```
```

## Checklist

- [ ] Fits in <200 lines
- [ ] Single focused purpose
- [ ] No need for `references/` directory
- [ ] Description uses "Use when..." pattern
