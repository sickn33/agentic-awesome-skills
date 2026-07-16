# skill-creator

**Automate CLI skill creation with best practices built-in.**

## What It Does

The skill-creator automates the entire workflow of creating new CLI skills for GitHub Copilot CLI and Claude Code. It guides you through brainstorming, applies standardized templates, validates content quality, and handles installation—all while following Anthropic's official best practices.

## Key Features

- **🎯 Interactive Brainstorming** - Collaborative session to define skill purpose and scope
- **✨ Template Automation** - Automatic file generation with zero manual configuration
- **🔍 Quality Validation** - Built-in checks for YAML, content quality, and writing style
- **📦 Flexible Installation** - Choose repository-only, global, or hybrid installation
- **📊 Visual Progress Bar** - Real-time progress indicator showing completion status (e.g., `[████████████░░░░░░] 60% - Step 3/5`)
- **🔗 Prompt Engineer Integration** - Optional enhancement using prompt-engineer skill

## When to Use

Use this skill when you want to:
- Create a new CLI skill following official standards
- Extend CLI functionality with custom capabilities
- Package domain knowledge into a reusable skill format
- Automate repetitive CLI tasks with a custom skill
- Install skills locally or globally across your system

## Installation

### Prerequisites

This skill is part of the `cli-ai-skills` repository. To use it:

```bash
# Clone the repository
git clone https://github.com/yourusername/cli-ai-skills.git
cd cli-ai-skills
```

### Install Globally (Recommended)

Install via symlinks to make the skill available everywhere:

```bash
# For GitHub Copilot CLI
ln -sf "$(pwd)/.github/skills/skill-creator" ~/.copilot/skills/skill-creator

# For Claude Code
ln -sf "$(pwd)/.claude/skills/skill-creator" ~/.claude/skills/skill-creator
```

**Benefits of global installation:**
- Works in any directory
- Auto-updates when you `git pull` the repository
- No configuration files needed

### Repository-Only Installation

If you prefer to use the skill only within this repository, no installation is needed. The skill will be available when working in the `cli-ai-skills` directory.

## Usage

### Basic Skill Creation

Simply ask the CLI to create a new skill:

```bash
# GitHub Copilot CLI
gh copilot "create a new skill for debugging Python errors"

# Claude Code
claude "create a skill that helps with git workflows"
```

The skill will guide you through with visual progress tracking:
1. **Brainstorming** (20%) - Define purpose, triggers, and type
2. **Prompt Enhancement** (40%, optional) - Enhance with prompt-engineer skill
3. **File Generation** (60%) - Create files from templates
4. **Validation** (80%) - Check quality and standards
5. **Installation** (100%) - Choose local, global, or both

Each phase displays a progress bar:
```
[████████████░░░░░░] 60% - Step 3/5: File Generation
```

### Advanced Usage

#### Create Code Generation Skill

```bash
"Create a code skill that generates React components from descriptions"
```

The skill will:
- Use the specialized `code-skill-template.md`
- Ask about specific frameworks (React, Vue, etc.)
- Include code examples in the `examples/` folder

#### Create Documentation Skill

```bash
"Build a skill that writes API documentation from code"
```

The skill will:
- Use `documentation-skill-template.md`
- Ask about documentation formats
- Set up references for style guides

#### Install for Specific Platform

```bash
"Create a skill for Copilot only that analyzes TypeScript errors"
```

The skill will:
- Generate files only in `.github/skills/`
- Skip Claude-specific installation
- Validate against Copilot requirements

## Example Walkthrough

Here's what creating a skill looks like:

```
You: "create a skill for database schema migrations"

[████░░░░░░░░░░░░░░] 20% - Step 1/5: Brainstorming & Planning

What should this skill do?
> Helps users create and manage database schema migrations safely

When should it trigger? (3-5 phrases)
> "create migration", "generate schema change", "migrate database"

What type of skill?
> [×] General purpose

Which platforms?
> [×] Both (Copilot + Claude)

[... continues through all phases ...]

🎉 Skill created successfully!

📦 Skill Name: database-migration
📁 Location: .github/skills/database-migration/
🔗 Installed: Global (Copilot + Claude)
```

## File Structure

When you create a skill, this structure is generated:

```
.github/skills/your-skill-name/
├── SKILL.md              # Main skill instructions (1.5-2k words)
├── README.md             # User-facing documentation (this file)
├── references/           # Detailed guides (2k-5k words each)
│   └── (empty, ready for extended docs)
├── examples/             # Working code samples
│   └── (empty, ready for examples)
└── scripts/              # Executable utilities
    └── (empty, ready for automation)
```

## Configuration

**No configuration needed!** This skill uses runtime discovery to:
- Detect installed platforms (Copilot CLI, Claude Code)
- Find repository root automatically
- Extract author info from git config
- Determine optimal file locations

## Validation

Every skill created is automatically validated for:
- ✅ **YAML Frontmatter** - Required fields and format
- ✅ **Description Format** - Third-person, trigger phrases
- ✅ **Word Count** - 1,500-2,000 ideal, under 5,000 max
- ✅ **Writing Style** - Imperative form, no second-person
- ✅ **Progressive Disclosure** - Proper content organization

## Frameworks Used

This skill leverages several established methodologies:

- **Progressive Disclosure** - 3-level content hierarchy (metadata → SKILL.md → bundled resources)
- **Bundled Resources Pattern** - References, examples, and scripts as separate files
- **Anthropic Best Practices** - Official skill development standards
- **Zero-Config Design** - Runtime discovery, no hardcoded values
- **Template-Driven Generation** - Consistent structure across all skills

## Troubleshooting

### "Template not found" Error

Ensure you're in the `cli-ai-skills` repository or have cloned it:

```bash
git clone https://github.com/yourusername/cli-ai-skills.git
cd cli-ai-skills
```

### "Platform not detected" Warning

If platforms aren't detected:
1. Choose "Repository only" installation
2. Manually specify platform during setup
3. Install globally later using provided commands

### Validation Failures

If validation finds issues:
- Review suggestions in the output
- Choose automatic fixes for common problems
- Manually edit files for complex issues
- Re-run validation: `scripts/validate-skill-yaml.sh .github/skills/your-skill`

## Advanced Features

### Prompt Engineer Integration

Enhance your skill descriptions with AI:
1. Enable during Phase 2 (Prompt Refinement)
2. Skill will invoke `prompt-engineer` automatically
3. Review enhanced output before proceeding

### Bundled Resources

For complex skills, use bundled resources:
- **references/** - Detailed documentation (no word limit)
- **examples/** - Working code samples users can run
- **scripts/** - Automation utilities loaded on demand

### Version Management

Update existing skills:
```bash
scripts/update-skill-version.sh your-skill-name 1.1.0
```

## Contributing

Created a useful skill? Share it:
1. Ensure validation passes
2. Add usage examples
3. Update main README.md
4. Submit a pull request

## Resources

- **Writing Style Guide:** `resources/templates/writing-style-guide.md`
- **Anthropic Official Guide:** https://github.com/anthropics/claude-plugins-official
- **Templates Directory:** `resources/templates/`
- **Validation Scripts:** `scripts/validate-*.sh`

## Support

For issues or questions:
- Check existing skills in `.github/skills/` for examples
- Review `resources/skills-development.md` for methodology
- Open an issue in the repository

---

**Version:** 1.1.0
**Platform:** GitHub Copilot CLI, Claude Code
**Author:** Eric Andrade
**Last Updated:** 2026-02-01
