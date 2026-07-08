# SKILL.md Metadata Standard

Official frontmatter fields recognized by OpenCode.

## Required Fields

```yaml
---
name: skill-name
description: >-
  Use when [trigger condition].
metadata:
  triggers: keyword1, keyword2, error-message
---
```

| Field | Rules |
|-------|-------|
| `name` | 1-64 chars, lowercase, hyphens only, must match directory name |
| `description` | 1-1024 chars, should describe when to use |

## Optional Fields

```yaml
---
name: skill-name
description: Purpose and triggers.
metadata:
  license: MIT
  compatibility: opencode
  author: "your-name"
  version: "1.0.0"
  category: "reference"
  tags: "tag1, tag2"
---
```

| Field | Purpose |
|-------|---------|
| `license` | License identifier (e.g., MIT, Apache-2.0) |
| `compatibility` | Tool compatibility marker |
| `metadata` | String-to-string map for custom key-values |

## Name Validation

```regex
^[a-z0-9]+(-[a-z0-9]+)*$
```

**Valid**: `my-skill`, `git-release`, `tdd`  
**Invalid**: `My-Skill`, `my_skill`, `-my-skill`, `my--skill`

## Common Metadata Keys

Use these conventions for consistency across skills:

| Key | Example | Purpose |
|-----|---------|---------|
| `author` | `"your-name"` | Skill creator |
| `version` | `"1.0.0"` | Semantic version |
| `category` | `"reference"` | Type: reference, technique, discipline, pattern |
| `tags` | `"react, hooks"` | Searchable keywords |

> [!IMPORTANT]
> Any field not listed here is **ignored** by OpenCode's skill loader.
