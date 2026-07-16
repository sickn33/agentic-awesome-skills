# Skills Directory

**Welcome to the skills folder!** This is where all 179+ specialized AI skills live.

## 🤔 What Are Skills?

Skills are specialized instruction sets that teach AI assistants how to handle specific tasks. Think of them as expert knowledge modules that your AI can load on-demand.

**Simple analogy:** Just like you might consult different experts (a designer, a security expert, a marketer), skills let your AI become an expert in different areas when you need them.

---

## 📂 Folder Structure

Each skill lives in its own folder with this structure:

```
skills/
├── skill-name/              # Individual skill folder
│   ├── SKILL.md             # Main skill definition (required)
│   ├── scripts/             # Helper scripts (optional)
│   ├── examples/            # Usage examples (optional)
│   └── resources/           # Templates & resources (optional)
```

**Key point:** Only `SKILL.md` is required. Everything else is optional!

---

## How to Use Skills

### Step 1: Make sure skills are installed
Skills should be in your `.agent/skills/` directory (or `.claude/skills/`, `.gemini/skills/`, etc.)

### Step 2: Invoke a skill in your AI chat
Use the `@` symbol followed by the skill name:

```
@brainstorming help me design a todo app
```

or

```
@stripe-integration add payment processing to my app
```

### Step 3: The AI becomes an expert
The AI loads that skill's knowledge and helps you with specialized expertise!

---

## Skill Categories

### Creative & Design
Skills for visual design, UI/UX, and artistic creation:
- `@algorithmic-art` - Create algorithmic art with p5.js
- `@canvas-design` - Design posters and artwork (PNG/PDF output)
- `@frontend-design` - Build production-grade frontend interfaces
- `@ui-ux-pro-max` - Professional UI/UX design with color, fonts, layouts
- `@web-artifacts-builder` - Build modern web apps (React, Tailwind, Shadcn/ui)
- `@theme-factory` - Generate themes for documents and presentations
- `@brand-guidelines` - Apply Anthropic brand design standards
- `@slack-gif-creator` - Create high-quality GIFs for Slack

### Development & Engineering
Skills for coding, testing, debugging, and code review:
- `@test-driven-development` - Write tests before implementation (TDD)
- `@systematic-debugging` - Debug systematically, not randomly
- `@webapp-testing` - Test web apps with Playwright
- `@receiving-code-review` - Handle code review feedback properly
- `@requesting-code-review` - Request code reviews before merging
- `@finishing-a-development-branch` - Complete dev branches (merge, PR, cleanup)
- `@subagent-driven-development` - Coordinate multiple AI agents for parallel tasks

### Documentation & Office
Skills for working with documents and office files:
- `@doc-coauthoring` - Collaborate on structured documents
- `@docx` - Create, edit, and analyze Word documents
- `@xlsx` - Work with Excel spreadsheets (formulas, charts)
- `@pptx` - Create and modify PowerPoint presentations
- `@pdf` - Handle PDFs (extract text, merge, split, fill forms)
- `@internal-comms` - Draft internal communications (reports, announcements)
- `@notebooklm` - Query Google NotebookLM notebooks

### Planning & Workflow
Skills for task planning and workflow optimization:
- `@brainstorming` - Brainstorm and design before coding
- `@writing-plans` - Write detailed implementation plans
- `@planning-with-files` - File-based planning system (Manus-style)
- `@executing-plans` - Execute plans with checkpoints and reviews
- `@using-git-worktrees` - Create isolated Git worktrees for parallel work
- `@verification-before-completion` - Verify work before claiming completion
- `@using-superpowers` - Discover and use advanced skills

### System Extension
Skills for extending AI capabilities:
- `@mcp-builder` - Build MCP (Model Context Protocol) servers
- `@skill-creator` - Create new skills or update existing ones
- `@writing-skills` - Tools for writing and validating skill files
- `@dispatching-parallel-agents` - Distribute tasks to multiple agents

---

## Finding Skills

### Method 1: Browse this folder
```bash
ls skills/
```

### Method 2: Search by keyword
```bash
ls skills/ | grep "keyword"
```

### Method 3: Check the main README
See the [main README](../README.md) for the complete list of all 179+ skills organized by category.

---

## 💡 Popular Skills to Try

**For beginners:**
- `@brainstorming` - Design before coding
- `@systematic-debugging` - Fix bugs methodically
- `@git-pushing` - Commit with good messages

**For developers:**
- `@test-driven-development` - Write tests first
- `@react-best-practices` - Modern React patterns
- `@senior-fullstack` - Full-stack development

**For security:**
- `@ethical-hacking-methodology` - Security basics
- `@burp-suite-testing` - Web app security testing

---

## Creating Your Own Skill

Want to create a new skill? Check out:
1. [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
2. [docs/contributors/skill-anatomy.md](../docs/contributors/skill-anatomy.md) - Skill structure guide
3. `@skill-creator` - Use this skill to create new skills!

**Basic structure:**
```markdown
---
name: my-skill-name
description: "What this skill does"
---

# Skill Title

## Overview
[What this skill does]

## When to Use
- Use when [scenario]

## Instructions
[Step-by-step guide]

## Examples
[Code examples]
```

---

## Documentation

- **[Getting Started](../docs/users/getting-started.md)** - Quick start guide
- **[Examples](../docs/contributors/examples.md)** - Real-world usage examples
- **[FAQ](../docs/users/faq.md)** - Common questions
- **[Visual Guide](../docs/users/visual-guide.md)** - Diagrams and flowcharts

---

## 🌟 Contributing

Found a skill that needs improvement? Want to add a new skill?

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Study existing skills in this folder
3. Create your skill following the structure
4. Submit a Pull Request

---

## References

- [Anthropic Skills](https://github.com/anthropic/skills) - Official Anthropic skills
- [UI/UX Pro Max Skills](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) - Design skills
- [Superpowers](https://github.com/obra/superpowers) - Original superpowers collection
- [Planning with Files](https://github.com/OthmanAdi/planning-with-files) - Planning patterns
- [NotebookLM](https://github.com/PleasePrompto/notebooklm-skill) - NotebookLM integration

---

**Need help?** Check the [FAQ](../docs/users/faq.md) or open an issue on GitHub!
