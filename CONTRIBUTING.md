# 🤝 Contributing Guide - Make It Easy for Everyone!

**Thank you for wanting to make this repo better!** This guide shows you exactly how to contribute, even if you're new to open source.

---

## Quick Start for Contributors

```bash
# 1. Fork and clone
git clone https://github.com/YOUR-USERNAME/agentic-awesome-skills.git
cd agentic-awesome-skills

# 2. Install dependencies
npm install

# 3. Create your skill
mkdir -p skills/my-awesome-skill

# 4. Use the canonical template
cp docs/contributors/skill-template.md skills/my-awesome-skill/SKILL.md

# 5. Edit and validate
npm run validate

# For SKILL.md with shell/network/credential/mutation guidance:
npm run security:docs

# 6. Open a PR
git add skills/my-awesome-skill/
git commit -m "feat: add my-awesome-skill for [purpose]"
git push origin my-branch
```

Open the PR with the default template and enable **Allow edits from maintainers** so conflicts can be resolved without extra back-and-forth.
If your PR adds or edits `SKILL.md`, GitHub will also run the automated `skill-review` workflow on the pull request.
Community PRs should stay **source-only**: do not include generated registry artifacts such as `CATALOG.md`, `skills_index.json`, or `data/*.json`.

Automated validation is necessary, but it does **not** replace manual logic review. If your PR adds or changes a skill, or introduces command, network, credential, mutation, install, or security guidance, review the logic and failure modes manually even when every automated check passes.

If you only want to improve docs, editing directly in GitHub is still perfectly fine.

---

## Ways to Contribute

You don't need to be an expert! Here are ways anyone can help:

### 1. Improve Documentation (Easiest!)
- Fix typos or grammar
- Make explanations clearer
- Add examples to existing skills
- Translate documentation to other languages

### 2. Report Issues
- Found a reproducible bug? Open an Issue.
- Need help, want feedback, or have an early-stage idea? Start a Discussion.
- Skill not working? If you can reproduce it, open an Issue. If you're unsure, start in Q&A.

### 3. Create New Skills
- Share your expertise as a skill
- Fill gaps in the current collection
- Improve existing skills

### 4. Test and Validate
- Try skills and report what works/doesn't work
- Test on different AI tools
- Suggest improvements

---

## How to Improve Documentation

### Super Easy Method (No Git Knowledge Needed!)

1. **Find the file** you want to improve on GitHub
2. **Click the pencil icon** (✏️) to edit
3. **Make your changes** in the browser
4. **Click "Propose changes"** at the bottom
5. **Done!** We'll review and merge it

### Using Git (If You Know How)

```bash
# 1. Fork the repo on GitHub (click the Fork button)

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/agentic-awesome-skills.git
cd agentic-awesome-skills

# 3. Create a branch
git checkout -b improve-docs

# 4. Make your changes
# Edit files in your favorite editor

# 5. Commit and push
git add .
git commit -m "docs: make XYZ clearer"
git push origin improve-docs

# 6. Open a Pull Request on GitHub
```

---

## How to Create a New Skill

### What Makes a Good Skill?

A skill should:
- ✅ Solve a specific problem
- ✅ Be reusable across projects
- ✅ Have clear instructions
- ✅ Include examples when possible

### Step-by-Step: Create Your First Skill

#### Step 1: Choose Your Skill Topic

Ask yourself:
- What am I good at?
- What do I wish my AI assistant knew better?
- What task do I do repeatedly?

**Examples:**
- "I'm good at Docker, let me create a Docker skill"
- "I wish AI understood Tailwind better"
- "I keep setting up the same testing patterns"

#### Step 2: Create the Folder Structure

```bash
# Navigate to the skills directory
cd skills/

# Create your skill folder (use lowercase with hyphens)
mkdir my-awesome-skill

# Create the SKILL.md file
cd my-awesome-skill
touch SKILL.md
```

#### Step 3: Write Your SKILL.md

Every skill should start from the canonical template in [`docs/contributors/skill-template.md`](docs/contributors/skill-template.md).

Contributor baseline frontmatter:

```markdown
---
name: my-awesome-skill
description: "Brief one-line description of what this skill does"
category: development
risk: safe
source: community
source_repo: owner/repo
source_type: community
date_added: "2026-03-06"
author: your-name-or-handle
tags: [tag-one, tag-two]
tools: [claude, cursor, gemini]
---

# Skill Title

## Overview

Explain what this skill does and when to use it.

If the skill adapts material from an external GitHub repository, declare both `source_repo: owner/repo` and `source_type: official` or `source_type: community`. For original repository content, use `source: self` and `source_type: self`.

## When to Use This Skill

- Use when [scenario 1]
- Use when [scenario 2]
- Use when [scenario 3]

## How It Works

### Step 1: [First Step]
Explain what to do first...

### Step 2: [Second Step]
Explain the next step...

### Step 3: [Final Step]
Explain how to finish...

## Examples

### Example 1: [Common Use Case]
\`\`\`
Show example code or commands here
\`\`\`

### Example 2: [Another Use Case]
\`\`\`
More examples...
\`\`\`

## Best Practices

- ✅ Do this
- ✅ Also do this
- ❌ Don't do this
- ❌ Avoid this

## Common Pitfalls

- **Problem:** Description of common issue
  **Solution:** How to fix it

## Additional Resources

- [Link to documentation](https://example.com)
- [Tutorial](https://example.com)
```

#### Step 4: Test Your Skill

1. **Copy it to your AI tool's skills directory:**
   ```bash
   cp -r skills/my-awesome-skill ~/.agents/skills/
   ```

   Or copy it into the specific tool path you are testing against, such as `~/.claude/skills/`, `~/.cursor/skills/`, or a custom workspace path like `.agent/skills/`.

2. **Try using it:**
   ```
   @my-awesome-skill help me with [task]
   ```

3. **Does it work?** Great! If not, refine it.

#### Step 5: Validate Your Skill

Recommended validation path:

For a **skill-only PR**:

```bash
npm install
npm run validate
```

GitHub will also run the automated `skill-review` check for PRs that touch `SKILL.md`.

Passing `npm run validate` or `skill-review` is not enough on its own for skill changes. Before you open the PR, manually review the skill for:

- trigger clarity and whether the skill would fire in the right situations,
- correctness of the instructions and examples,
- obvious failure modes, unsafe assumptions, and user-facing edge cases,
- whether the declared `risk:` level still matches the actual behavior.

Submitting `risk: unknown` is still acceptable for genuinely legacy or not-yet-classified content. Maintainers may later use `npm run audit:skills` and `npm run sync:risk-labels` to reconcile high-confidence legacy labels without asking contributors to regenerate catalog artifacts in their PRs.

For **docs / workflows / infra changes**:

```bash
npm install
npm run validate
npm run validate:references
npm test
```

For **any normal community PR**, keep the branch source-only and leave generated registry artifacts out of the diff. `main` canonicalizes those after merge.

Optional maintainer-style preflight:

```bash
npm run pr:preflight
```

Python-only fallback:

```bash
python3 tools/scripts/validate_skills.py
```

This checks:
- ✅ SKILL.md exists
- ✅ Frontmatter is correct
- ✅ Name matches folder name
- ✅ Description exists
- ✅ Reference data and docs bundles stay coherent

Do **not** commit generated registry artifacts in a normal PR. These files are canonicalized on `main` after merge:

- `CATALOG.md`
- `skills_index.json`
- `data/skills_index.json`
- `data/catalog.json`
- `data/bundles.json`
- `data/aliases.json`

### Security-Sensitive Review (New Skills)

If your skill contains:

- shell commands or command-like examples (`curl`, `wget`, `bash`, `powershell`, `irm`, etc.),
- network instructions or credential/token examples,
- direct file-system, process, or mutation guidance,

add one extra preflight pass:

```bash
npm run security:docs
npm test
```

Expected outcome:

- ✅ no blocked high-risk examples unless justified,
- ✅ explicit allowlist comments for any deliberate high-risk documentation command patterns
  (`<!-- security-allowlist: ... -->`),
- ✅ an explicit note in the PR description if examples are intentionally risky and the intended usage requires local admin/hosted environments.

For offensive or destructive-capability skills, also verify:

- `risk:` is set to `offensive` or `critical` as appropriate,
- any user confirmation and authorization preconditions are explicit in the instructions,
- the standard "Authorized Use Only" disclaimer is present in the skill when relevant.

Optional hardening pass:

```bash
npm run validate:strict
```

`validate:strict` is useful before larger cleanup PRs, but the repository still contains legacy skills that do not all satisfy the strict quality bar.

#### Step 6: Submit Your Skill

```bash
# 1. Add your skill
git add skills/my-awesome-skill/

# 2. Commit with a clear message
git commit -m "feat: add my-awesome-skill for [purpose]"

# 3. Push to your fork
git push origin my-branch

# 4. Open a Pull Request on GitHub
```

---

## Skill Template (Copy & Paste)

The canonical template now lives at [`docs/contributors/skill-template.md`](docs/contributors/skill-template.md). You can still use the inline version below as a starting point:

```markdown
---
name: your-skill-name
description: "One sentence describing what this skill does and when to use it"
category: development
risk: safe
source: community
source_repo: owner/repo
source_type: community
date_added: "2026-03-06"
author: your-name-or-handle
tags: [tag-one, tag-two]
tools: [claude, cursor, gemini]
---

# Your Skill Name

## Overview

[2-3 sentences explaining what this skill does]

## When to Use This Skill

- Use when you need to [scenario 1]
- Use when you want to [scenario 2]
- Use when working with [scenario 3]

## Core Concepts

### Concept 1
[Explain key concept]

### Concept 2
[Explain another key concept]

## Step-by-Step Guide

### 1. [First Step Name]
[Detailed instructions]

### 2. [Second Step Name]
[Detailed instructions]

### 3. [Third Step Name]
[Detailed instructions]

## Examples

### Example 1: [Use Case Name]
\`\`\`language
// Example code here
\`\`\`

**Explanation:** [What this example demonstrates]

### Example 2: [Another Use Case]
\`\`\`language
// More example code
\`\`\`

**Explanation:** [What this example demonstrates]

## Best Practices

- ✅ **Do:** [Good practice]
- ✅ **Do:** [Another good practice]
- ❌ **Don't:** [What to avoid]
- ❌ **Don't:** [Another thing to avoid]

## Troubleshooting

### Problem: [Common Issue]
**Symptoms:** [How you know this is the problem]
**Solution:** [How to fix it]

### Problem: [Another Issue]
**Symptoms:** [How you know this is the problem]
**Solution:** [How to fix it]

## Related Skills

- `@related-skill-1` - [When to use this instead]
- `@related-skill-2` - [How this complements your skill]

## Additional Resources

- [Official Documentation](https://example.com)
- [Tutorial](https://example.com)
- [Community Guide](https://example.com)
```

---

## How to Report Issues

### Found a Bug?

1. **Check existing issues** - Maybe it's already reported
2. **Open a new issue** with this info:
   - What skill has the problem?
   - What AI tool are you using?
   - What did you expect to happen?
   - What actually happened?
   - Steps to reproduce

### Found Something Confusing?

1. **Open an issue** titled: "Documentation unclear: [topic]"
2. **Explain:**
   - What part is confusing?
   - What did you expect to find?
   - How could it be clearer?

---

## Contribution Checklist

Before submitting your contribution:

- [ ] My skill has a clear, descriptive name
- [ ] The `SKILL.md` starts from the canonical template and includes proper frontmatter (`name`, `description`, `category`, `risk`, `source`, `date_added`)
- [ ] External GitHub-derived skills declare `source_repo` and `source_type`; original repository content uses `source: self` and `source_type: self`
- [ ] I've included examples
- [ ] I've tested the skill with an AI assistant
- [ ] I've run `npm run validate`
- [ ] If I changed `SKILL.md` or risky guidance, I manually reviewed the logic, safety, and likely failure modes instead of relying on automated checks alone
- [ ] I've run `npm run validate:references` and `npm test` when my change affects docs, workflows, or infrastructure
- [ ] I ran the docs security scan (`npm run security:docs`) for any skill containing commands, network access, credentials, or destructive guidance
- [ ] I did **not** include generated registry artifacts (`CATALOG.md`, `skills_index.json`, `data/*.json`) in this PR
- [ ] My commit message is clear (e.g., "feat: add docker-compose skill")
- [ ] I enabled **Allow edits from maintainers** on the PR
- [ ] I've checked for typos and grammar

---

## Commit Message Guidelines

Use these prefixes:

- `feat:` - New skill or major feature
- `docs:` - Documentation improvements
- `fix:` - Bug fixes
- `refactor:` - Code improvements without changing functionality
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add kubernetes-deployment skill
docs: improve getting started guide
fix: correct typo in stripe-integration skill
docs: add examples to react-best-practices
```

---

## Learning Resources

### New to Git/GitHub?
- [GitHub's Hello World Guide](https://guides.github.com/activities/hello-world/)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)

### New to Markdown?
- [Markdown Guide](https://www.markdownguide.org/basic-syntax/)
- [GitHub Markdown](https://guides.github.com/features/mastering-markdown/)

### New to Open Source?
- [First Contributions](https://github.com/firstcontributions/first-contributions)
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)

---

## Need Help?

- **Questions?** Open a [Discussion](https://github.com/sickn33/agentic-awesome-skills/discussions)
- **Stuck?** Open an [Issue](https://github.com/sickn33/agentic-awesome-skills/issues)
- **Want feedback?** Open a [Draft Pull Request](https://github.com/sickn33/agentic-awesome-skills/pulls)

---

## Recognition

All contributors are recognized in our [Contributors](https://github.com/sickn33/agentic-awesome-skills/graphs/contributors) page.

We **always merge accepted PRs via GitHub** ("Squash and merge") so your PR shows as **Merged** and you get full credit. We do not close PRs after integrating your work locally. If your PR has merge conflicts, we will resolve them on the branch (or ask you to merge main and push) so we can merge it on GitHub.

---

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn

---

**Thank you for making this project better for everyone!**

Every contribution, no matter how small, makes a difference. Whether you fix a typo, improve a sentence, or create a whole new skill - you're helping thousands of developers!
