---
name: pattern-name
description: >-
  Use when [recognizable symptom].
metadata:
  category: pattern
  triggers: complexity, hard-to-follow, nested
---

# Pattern Name

## The Pattern

[1-2 sentence core idea]

## Recognition Signs

- [Sign that pattern applies]
- [Another sign]
- [Code smell]

## Before

```typescript
// Complex/problematic
function before() {
  // nested, confusing
}
```

## After

```typescript
// Clean/improved
function after() {
  // flat, clear
}
```

## When NOT to Use

- [Over-engineering case]
- [Simple case that doesn't need it]

## Impact

**Before:** [Problem metric]
**After:** [Improved metric]
