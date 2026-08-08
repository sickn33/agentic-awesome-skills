# Skill Templates & Examples

Complete, copy-paste templates for each skill type.

---

## Template: Technique Skill

For how-to guides that teach a specific method.

```markdown
---
name: technique-name
description: >-
  Use when [specific symptom].
metadata:
  category: technique
  triggers: error-text, symptom, tool-name
---

# Technique Name

## Overview

[1-2 sentence core principle]

## When to Use

- [Symptom A]
- [Symptom B]
- [Error message text]

**NOT for:**
- [When to avoid]

## The Problem

```javascript
// Bad example
function badCode() {
  // problematic pattern
}
```

## The Solution

```javascript
// Good example
function goodCode() {
  // improved pattern
}
```

## Step-by-Step

1. [First step]
2. [Second step]
3. [Final step]

## Quick Reference

| Scenario | Approach |
|----------|----------|
| Case A | Solution A |
| Case B | Solution B |

## Common Mistakes

**Mistake 1:** [Description]
- Wrong: `bad code`
- Right: `good code`
```

---

## Template: Reference Skill

For documentation, APIs, and lookup tables.

```markdown
---
name: reference-name
description: >-
  Use when working with [domain].
metadata:
  category: reference
  triggers: tool, api, specific-terms
---

# Reference Name

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cmd1` | Does X |
| `cmd2` | Does Y |

## Common Patterns

**Pattern A:**
```bash
example command
```

**Pattern B:**
```bash
another example
```

## Detailed Docs

For more options, run `--help` or see:
- patterns.md
- [examples.md](examples.md)
```

---

## Template: Discipline Skill

For rules that agents must follow. Requires anti-rationalization techniques.

```markdown
---
name: discipline-name
description: >-
  Use when [BEFORE violation].
metadata:
  category: discipline
  triggers: new feature, code change, implementation
---

# Rule Name

## Iron Law

**[SINGLE SENTENCE ABSOLUTE RULE]**

Violating the letter IS violating the spirit.

## The Rule

1. ALWAYS [step 1]
2. NEVER [step 2]
3. [Step 3]

## Violations

[Action before rule]? **Delete it. Start over.**

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it
- Delete means delete

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple" | Simple code breaks. Rule takes 30 seconds. |
| "I'll do it after" | After = never. Do it now. |
| "Spirit not ritual" | The ritual IS the spirit. |

## Red Flags - STOP

- [Flag 1]
- [Flag 2]
- "This is different because..."

**All mean:** Delete. Start over.

## Valid Exceptions

- [Exception 1]
- [Exception 2]

**Everything else:** Follow the rule.
```

---

## Template: Pattern Skill

For mental models and design patterns.

```markdown
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
```

---

## Real Example: Condition-Based Waiting

```yaml
---
name: condition-based-waiting
description: >-
  Use when tests have race conditions or timing dependencies.
metadata:
  category: technique
  triggers: flaky tests, timeout, race condition, sleep, setTimeout
---
```

```markdown
# Condition-Based Waiting

## Overview

Replace `sleep(ms)` with `waitFor(() => condition)`.

## When to Use

- Tests pass sometimes, fail other times
- Tests use `sleep()` or `setTimeout()`
- "Works on my machine"

## The Fix

```typescript
// ❌ Bad
await sleep(2000);
expect(element).toBeVisible();

// ✅ Good
await waitFor(() => element.isVisible(), { timeout: 5000 });
expect(element).toBeVisible();
```

## Impact

- Flaky tests: 15/100 → 0/100
- Speed: 40% faster (no over-waiting)
```
