# Anatomy of a Skill - Understanding the Structure

**Want to understand how skills work under the hood?** This guide breaks down every part of a skill file.

---

## 📁 Basic Folder Structure

```
skills/
└── my-skill-name/
    ├── SKILL.md              ← Required: The main skill definition
    ├── examples/             ← Optional: Example files
    │   ├── example1.js
    │   └── example2.py
    ├── scripts/              ← Optional: Helper scripts
    │   └── helper.sh
    ├── templates/            ← Optional: Code templates
    │   └── template.tsx
    ├── references/           ← Optional: Reference documentation
    │   └── api-docs.md
    └── README.md             ← Optional: Additional documentation
```

**Key Rule:** Only `SKILL.md` is required. Everything else is optional!

---

## SKILL.md Structure

Every `SKILL.md` file has two main parts:

### 1. Frontmatter (Metadata)
### 2. Content (Instructions)

Let's break down each part:

---

## Part 1: Frontmatter

The frontmatter is at the very top, wrapped in `---`:

```markdown
---
name: my-skill-name
description: "Brief description of what this skill does"
risk: safe
source: community
source_repo: owner/repo
source_type: community
---
```

### Required Fields

#### `name`
- **What it is:** The skill's identifier
- **Format:** lowercase-with-hyphens
- **Must match:** The folder name exactly
- **Example:** `stripe-integration`

#### `description`
- **What it is:** One-sentence summary
- **Format:** String in quotes
- **Length:** Keep it under 200 characters
- **Example:** `"Stripe payment integration patterns including checkout, subscriptions, and webhooks"`

#### `risk`
- **What it is:** The safety classification of the skill
- **Values:** `none` | `safe` | `critical` | `offensive` | `unknown`
- **Example:** `risk: safe`
- **Guide:**
  - `none` — pure text/reasoning, no commands or mutations
  - `safe` — reads files, runs non-destructive commands
  - `critical` — modifies state, deletes files, pushes to production
  - `offensive` — pentesting/red-team tools; **must** include "Authorized Use Only" warning
  - `unknown` — legacy or unclassified; prefer a concrete level for new skills

#### `source`
- **What it is:** Attribution for the skill's origin
- **Format:** URL or a short label
- **Examples:** `source: community`, `source: "https://example.com/original"`
- **Use `"self"`** if you are the original author

#### `source_repo`
- **What it is:** Canonical GitHub repository identifier for external upstream material
- **Format:** `OWNER/REPO`
- **Example:** `source_repo: Dimillian/Skills`
- **When required:** Use it when the skill adapts or imports material from an external GitHub repository

#### `source_type`
- **What it is:** Which README credits bucket the upstream repo belongs to
- **Values:** `official` | `community` | `self`
- **Examples:** `source_type: official`, `source_type: community`
- **Rule:** `self` means no external README repo credit is required

### Optional Fields

Some skills include additional metadata:

```markdown
---
name: my-skill-name
description: "Brief description"
risk: safe
source: community
source_repo: owner/repo
source_type: community
author: "your-name-or-handle"
tags: ["react", "typescript", "testing"]
tools: [claude, cursor, gemini]
---
```

#### `license` *(optional)*
- **What it is:** SPDX license identifier for the upstream source material
- **Format:** A valid SPDX expression (e.g. `MIT`, `Apache-2.0`, `CC-BY-4.0`)
- **Example:** `license: MIT`
- **When to use:** Declare when `source_repo` points to material under a known license. Omitting it signals "license not verified" to downstream tooling.

#### `license_source` *(optional)*
- **What it is:** Direct URL to the upstream license file
- **Format:** Full URL string
- **Example:** `license_source: "https://github.com/owner/repo/blob/main/LICENSE"`
- **When to use:** Include alongside `license:` so automated tooling can verify the claim. If the upstream repo has no LICENSE file, omit this field.

### Source-credit contract

- External GitHub-derived skills should declare both `source_repo` and `source_type`.
- `source_type: official` means the repo must appear in `README.md` under `### Official Sources`.
- `source_type: community` means the repo must appear in `README.md` under `### Community Contributors`.
- `source: self` plus `source_type: self` is the correct shape for original repository content.
- PR CI checks README credit coverage for changed skills, so missing or misbucketed repo credits will block the PR once `source_repo` is declared.

---

## Part 2: Content

After the frontmatter comes the actual skill content. Here's the recommended structure:

### Recommended Sections

#### 1. Title (H1)
```markdown
# Skill Title
```
- Use a clear, descriptive title
- Usually matches or expands on the skill name

#### 2. Overview
```markdown
## Overview

A brief explanation of what this skill does and why it exists.
2-4 sentences is perfect.
```

#### 3. When to Use
```markdown
## When to Use This Skill

- Use when you need to [scenario 1]
- Use when working with [scenario 2]
- Use when the user asks about [scenario 3]
```

**Why this matters:** Helps the AI know when to activate this skill

#### 4. Core Instructions
```markdown
## How It Works

### Step 1: [Action]
Detailed instructions...

### Step 2: [Action]
More instructions...
```

**This is the heart of your skill** - clear, actionable steps

#### 5. Examples
````markdown
## Examples

### Example 1: [Use Case]
```javascript
// Example code
```

### Example 2: [Another Use Case]
```javascript
// More code
```
````

**Why examples matter:** They show the AI exactly what good output looks like

#### 6. Best Practices
```markdown
## Best Practices

- ✅ Do this
- ✅ Also do this
- ❌ Don't do this
- ❌ Avoid this
```

#### 7. Common Pitfalls
```markdown
## Common Pitfalls

- **Problem:** Description
  **Solution:** How to fix it
```

#### 8. Security & Safety Notes (for command/network/offensive skills)

If your skill includes:

- shell commands or command-like examples,
- remote fetch/install or token usage guidance,
- file mutation, destructive actions, or privileged operations,

add a dedicated section before final wrap-up:

```markdown
## Security & Safety Notes

- This is safe/unsafe scope
- Required confirmation or authorization
- Example allowlist notes (if needed):
  `<!-- security-allowlist: ... -->`
```

#### 9. Related Skills
```markdown
## Related Skills

- `@other-skill` - When to use this instead
- `@complementary-skill` - How this works together
```

---

## Writing Effective Instructions

### Use Clear, Direct Language

**❌ Bad:**
```markdown
You might want to consider possibly checking if the user has authentication.
```

**✅ Good:**
```markdown
Check if the user is authenticated before proceeding.
```

### Use Action Verbs

**❌ Bad:**
```markdown
The file should be created...
```

**✅ Good:**
```markdown
Create the file...
```

### Be Specific

**❌ Bad:**
```markdown
Set up the database properly.
```

**✅ Good:**
```markdown
1. Create a PostgreSQL database
2. Run migrations: `npm run migrate`
3. Seed initial data: `npm run seed`
```

---

## Optional Components

### Scripts Directory

If your skill needs helper scripts:

```
scripts/
├── setup.sh          ← Setup automation
├── validate.py       ← Validation tools
└── generate.js       ← Code generators
```

**Reference them in SKILL.md:**
````markdown
Run the setup script:
```bash
bash scripts/setup.sh
```
````

### Examples Directory

Real-world examples that demonstrate the skill:

```
examples/
├── basic-usage.js
├── advanced-pattern.ts
└── full-implementation/
    ├── index.js
    └── config.json
```

### Templates Directory

Reusable code templates:

```
templates/
├── component.tsx
├── test.spec.ts
└── config.json
```

**Reference in SKILL.md:**
````markdown
Use this template as a starting point:
```typescript
{{#include templates/component.tsx}}
```
````

### References Directory

External documentation or API references:

```
references/
├── api-docs.md
├── best-practices.md
└── troubleshooting.md
```

---

## Skill Size Guidelines

### Minimum Viable Skill
- **Frontmatter:** name + description
- **Content:** 100-200 words
- **Sections:** Overview + Instructions

### Standard Skill
- **Frontmatter:** name + description
- **Content:** 300-800 words
- **Sections:** Overview + When to Use + Instructions + Examples

### Comprehensive Skill
- **Frontmatter:** name + description + optional fields
- **Content:** 800-2000 words
- **Sections:** All recommended sections
- **Extras:** Scripts, examples, templates

**Rule of thumb:** Start small, expand based on feedback

---

## Formatting Best Practices

### Use Markdown Effectively

#### Code Blocks
Always specify the language:
````markdown
```javascript
const example = "code";
```
````

#### Lists
Use consistent formatting:
```markdown
- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
```

#### Emphasis
- **Bold** for important terms: `**important**`
- *Italic* for emphasis: `*emphasis*`
- `Code` for commands/code: `` `code` ``

#### Links
```markdown
[Link text](https://example.com)
```

---

## ✅ Quality Checklist

Before finalizing your skill:

### Content Quality
- [ ] Instructions are clear and actionable
- [ ] Examples are realistic and helpful
- [ ] No typos or grammar errors
- [ ] Technical accuracy verified

### Structure
- [ ] Frontmatter is valid YAML
- [ ] Name matches folder name
- [ ] Sections are logically organized
- [ ] Headings follow hierarchy (H1 → H2 → H3)

### Completeness
- [ ] Overview explains the "why"
- [ ] Instructions explain the "how"
- [ ] Examples show the "what"
- [ ] Edge cases are addressed

### Usability
- [ ] A beginner could follow this
- [ ] An expert would find it useful
- [ ] The AI can parse it correctly
- [ ] It solves a real problem

---

## 🔍 Real-World Example Analysis

Let's analyze a real skill: `brainstorming`

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work..."
---
```

**Analysis:**
- ✅ Clear name
- ✅ Strong description with urgency ("MUST use")
- ✅ Explains when to use it

```markdown
# Brainstorming Ideas Into Designs

## Overview
Help turn ideas into fully formed designs...
```

**Analysis:**
- ✅ Clear title
- ✅ Concise overview
- ✅ Explains the value proposition

```markdown
## The Process

**Understanding the idea:**
- Check out the current project state first
- Ask questions one at a time
```

**Analysis:**
- ✅ Broken into clear phases
- ✅ Specific, actionable steps
- ✅ Easy to follow

---

## Advanced Patterns

### Conditional Logic

```markdown
## Instructions

If the user is working with React:
- Use functional components
- Prefer hooks over class components

If the user is working with Vue:
- Use Composition API
- Follow Vue 3 patterns
```

### Progressive Disclosure

```markdown
## Basic Usage
[Simple instructions for common cases]

## Advanced Usage
[Complex patterns for power users]
```

### Cross-References

```markdown
## Related Workflows

1. First, use `@brainstorming` to design
2. Then, use `@writing-plans` to plan
3. Finally, use `@test-driven-development` to implement
```

---

## Skill Effectiveness Metrics

How to know if your skill is good:

### Clarity Test
- Can someone unfamiliar with the topic follow it?
- Are there any ambiguous instructions?

### Completeness Test
- Does it cover the happy path?
- Does it handle edge cases?
- Are error scenarios addressed?

### Usefulness Test
- Does it solve a real problem?
- Would you use this yourself?
- Does it save time or improve quality?

---

## Learning from Existing Skills

### Study These Examples

**For Beginners:**
- `skills/brainstorming/SKILL.md` - Clear structure
- `skills/git-pushing/SKILL.md` - Simple and focused
- `skills/copywriting/SKILL.md` - Good examples

**For Advanced:**
- `skills/systematic-debugging/SKILL.md` - Comprehensive
- `skills/react-best-practices/SKILL.md` - Multiple files
- `skills/loki-mode/SKILL.md` - Complex workflows

---

## 💡 Pro Tips

1. **Start with the "When to Use" section** - This clarifies the skill's purpose
2. **Write examples first** - They help you understand what you're teaching
3. **Test with an AI** - See if it actually works before submitting
4. **Get feedback** - Ask others to review your skill
5. **Iterate** - Skills improve over time based on usage

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Too Vague
```markdown
## Instructions
Make the code better.
```

**✅ Fix:**
```markdown
## Instructions
1. Extract repeated logic into functions
2. Add error handling for edge cases
3. Write unit tests for core functionality
```

### ❌ Mistake 2: Too Complex
```markdown
## Instructions
[5000 words of dense technical jargon]
```

**✅ Fix:**
Break into multiple skills or use progressive disclosure

### ❌ Mistake 3: No Examples
```markdown
## Instructions
[Instructions without any code examples]
```

**✅ Fix:**
Add at least 2-3 realistic examples

### ❌ Mistake 4: Outdated Information
```markdown
Use React class components...
```

**✅ Fix:**
Keep skills updated with current best practices

---

## 🎯 Next Steps

1. **Read 3-5 existing skills** to see different styles
2. **Try the skill template** from [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)
3. **Create a simple skill** for something you know well
4. **Test it** with your AI assistant
5. **Share it** via Pull Request

---

**Remember:** Every expert was once a beginner. Start simple, learn from feedback, and improve over time! 🚀
