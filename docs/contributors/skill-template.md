---
name: your-skill-name
description: "Brief one-sentence description of what this skill does (under 200 characters)"
category: your-category
risk: safe
source: community
source_repo: owner/repo
source_type: community
date_added: "YYYY-MM-DD"
author: your-name-or-handle
tags: [tag-one, tag-two]
tools: [claude, cursor, gemini]
# Optional: declare the upstream license if source_repo is set
# license: "MIT"
# license_source: "https://github.com/owner/repo/blob/main/LICENSE"
---

# Skill Title

## Overview

A brief explanation of what this skill does and why it exists.
2-4 sentences is perfect.

If this skill adapts material from an external GitHub repository, declare both:

- `source_repo: owner/repo`
- `source_type: official` or `source_type: community`

Use `source: self` and `source_type: self` when the skill is original to this repository and does not require README external-source credit.

## When to Use This Skill

- Use when you need to [scenario 1]
- Use when working with [scenario 2]
- Use when the user asks about [scenario 3]

## How It Works

### Step 1: [Action]

Detailed instructions...

### Step 2: [Action]

More instructions...

## Examples

### Example 1: [Use Case]

\`\`\`javascript
// Example code
\`\`\`

### Example 2: [Another Use Case]

\`\`\`javascript
// More code
\`\`\`

## Best Practices

- ✅ Do this
- ✅ Also do this
- ❌ Don't do this
- ❌ Avoid this

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- If this skill includes shell commands, command-like examples, network fetches, token/capability strings, or direct mutation guidance, add explicit preconditions and caveats.
- For deliberate risky examples (for example `curl ... | bash`, `wget ... | sh`, credential examples), include a reviewer-visible reason and add an allowlist comment:

```markdown
<!-- security-allowlist: approved for documented workflow X -->
```

- If the skill can alter files/systems or run dangerous actions, document confirmation gates and environment expectations (`local-only`, `authorized test environment`, etc.).

## Common Pitfalls

- **Problem:** Description
  **Solution:** How to fix it

## Related Skills

- `@other-skill` - When to use this instead
- `@complementary-skill` - How this works together
