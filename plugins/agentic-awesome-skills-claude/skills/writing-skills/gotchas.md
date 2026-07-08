---
description: Common pitfalls and tribal knowledge for skill creation.
metadata:
  tags: [gotchas, troubleshooting, mistakes]
---

# Skill Writing Gotchas

Tribal knowledge to avoid common mistakes.

## YAML Frontmatter

### Invalid Syntax

```yaml
# ❌ BAD: Mixed list and map
metadata:
  references: 
  triggers: a, b, c
  - item1
  - item2

# ✅ GOOD: Consistent structure
metadata:
  triggers: a, b, c
  references:
    - item1
    - item2
```

### Multiline Description

```yaml
# ❌ BAD: Line breaks create parsing errors
description: Use when creating skills.
  Also for updating.

# ✅ GOOD: Use YAML multiline syntax
description: >-
  Use when creating or updating skills.
  Triggers: new skill, update skill
```

## Naming

### Directory Must Match `name` Field

```
# ❌ BAD
directory: my-skill/
name: mySkill  # Mismatch!

# ✅ GOOD
directory: my-skill/
name: my-skill  # Exact match
```

### SKILL.md Must Be ALL CAPS

```
# ❌ BAD
skill.md
Skill.md

# ✅ GOOD
SKILL.md
```

## Discovery

### Description = Triggers, NOT Workflow

```yaml
# ❌ BAD: Agent reads this and skips the full skill
description: Analyzes code, finds bugs, suggests fixes

# ✅ GOOD: Agent reads full skill to understand workflow
description: Use when debugging errors or reviewing code quality
```

### Pre-Violation Triggers for Discipline Skills

```yaml
# ❌ BAD: Triggers AFTER violation
description: Use when you forgot to write tests

# ✅ GOOD: Triggers BEFORE violation
description: Use when implementing any feature, before writing code
```

## Token Efficiency

### Skill Loaded Every Conversation = Token Drain

- Frequently-loaded skills: <200 words
- All others: <500 words
- Move details to `references/` files

### Don't Duplicate CLI Help

```markdown
# ❌ BAD: 50 lines documenting all flags

# ✅ GOOD: One line
Run `mytool --help` for all options.
```

## Anti-Rationalization (Discipline Skills Only)

### Agents Are Smart at Finding Loopholes

```markdown
# ❌ BAD: Trust agents will "get the spirit"
Write test before code.

# ✅ GOOD: Close every loophole explicitly
Write test before code.

**No exceptions:**
- Don't keep code as "reference"
- Don't "adapt" existing code
- Delete means delete
```

### Build Rationalization Table

Every excuse from baseline testing goes in the table:

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests-after prove nothing immediately. |

## Cross-References

### Keep References One Level Deep

```markdown
# ❌ BAD: Nested chain (A → B → C)
See [patterns.md] → which links to [advanced.md] → which links to [deep.md]

# ✅ GOOD: Flat (A → B, A → C)
See [patterns.md] and [advanced.md]
```

### Never Force-Load with @

```markdown
# ❌ BAD: Burns context immediately
@skills/my-skill/SKILL.md

# ✅ GOOD: Agent loads when needed
See [my-skill] for details.
```

## OpenCode Integration

### Correct Skill Directory

```bash
# ❌ BAD: Old singular path
~/.config/opencode/skill/my-skill/

# ✅ GOOD: Plural path
~/.config/opencode/skills/my-skill/
```

### Skill Cross-Reference Syntax

```markdown
# ❌ BAD: File path (fragile)
See /home/user/.config/opencode/skills/my-skill/SKILL.md

# ✅ GOOD: Skill protocol
See my-skill
```

## Tier Selection

### Don't Overthink Tier Choice

```markdown
# ❌ BAD: Starting with Tier 3 "just in case"
# Result: Wasted effort, empty reference files

# ✅ GOOD: Start with Tier 1, upgrade when needed
# Can always add references/ later
```

### Signals You Need to Upgrade

| Signal | Action |
|--------|--------|
| SKILL.md > 200 lines | → Tier 2 |
| 3+ related sub-topics | → Tier 2 |
| 10+ products/services | → Tier 3 |
| "I need X" vs "I want Y" | → Tier 3 decision trees |
