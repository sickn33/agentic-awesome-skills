---
name: manage-skills
description: Discover, list, create, edit, toggle, copy, move, and delete AI agent skills across 11 tools (Cursor, Claude, Agents, Windsurf, Copilot, Codex, Cline, Aider, Continue, Roo Code, Augment)
---

# Manage AI Agent Skills

You can manage skills and rules for all major AI coding tools directly from the terminal. This skill teaches you the directory layout, file format, and operations for each tool.

## Supported Tools & Paths

### Directory-based tools (multiple skills)

Each skill lives in its own subdirectory with a `SKILL.md` file containing YAML frontmatter.

| Tool | Global Path | Project Path |
|------|------------|--------------|
| Agents | `~/.agents/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` |
| Cursor | `~/.cursor/skills/<name>/SKILL.md` | `.cursor/skills/<name>/SKILL.md` |
| Claude | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/<name>/SKILL.md` |
| Windsurf | `~/.windsurf/rules/<name>/<name>.md` | `.windsurf/rules/<name>/<name>.md` |
| Cline | `~/.cline/rules/<name>/<name>.md` | `.cline/rules/<name>/<name>.md` |
| Continue | `~/.continue/rules/<name>/<name>.md` | `.continue/rules/<name>/<name>.md` |
| Roo Code | `~/.roo/rules/<name>/<name>.md` | `.roo/rules/<name>/<name>.md` |

### Single-file tools (one config file)

| Tool | Global Path | Project Path |
|------|------------|--------------|
| Copilot | `~/.github/copilot-instructions.md` | `.github/copilot-instructions.md` |
| Codex | `~/.codex/AGENTS.md` | `.codex/AGENTS.md` |
| Aider | `~/.aider.conf.yml` | `.aider.conf.yml` |
| Augment | `~/augment-guidelines.md` | `augment-guidelines.md` |

### Cursor plugins (read-only)

Plugin skills are cached at `~/.cursor/plugins/cache/<org>/<plugin>/<version>/skills/<name>/SKILL.md`. These are managed by Cursor and should not be edited directly.

## Skill File Format

For directory-based tools (Agents, Cursor, Claude), skills use YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description of what this skill does
---

# Skill Name

Skill instructions go here. The AI agent reads this content
when the skill is activated.
```

For Windsurf, Cline, Continue, and Roo Code, skills are plain `.md` files (frontmatter optional).

## Operations

### List all skills

```bash
# List skills for a specific tool
ls ~/.agents/skills/
ls ~/.cursor/skills/
ls ~/.claude/skills/
ls ~/.windsurf/rules/
ls ~/.cline/rules/
ls ~/.continue/rules/
ls ~/.roo/rules/

# Count total skills across all tools
echo "Agents: $(ls ~/.agents/skills/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Cursor: $(ls ~/.cursor/skills/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Claude: $(ls ~/.claude/skills/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Windsurf: $(ls ~/.windsurf/rules/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Cline: $(ls ~/.cline/rules/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Continue: $(ls ~/.continue/rules/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Roo: $(ls ~/.roo/rules/ 2>/dev/null | wc -l | tr -d ' ')"

# Check single-file tools
test -f ~/.github/copilot-instructions.md && echo "Copilot: exists" || echo "Copilot: not found"
test -f ~/.codex/AGENTS.md && echo "Codex: exists" || echo "Codex: not found"
test -f ~/.aider.conf.yml && echo "Aider: exists" || echo "Aider: not found"
test -f ~/augment-guidelines.md && echo "Augment: exists" || echo "Augment: not found"
```

### Read a skill

```bash
cat ~/.cursor/skills/my-skill/SKILL.md
```

### Create a new skill

```bash
# For Agents/Cursor/Claude (SKILL.md format)
mkdir -p ~/.agents/skills/my-new-skill
cat > ~/.agents/skills/my-new-skill/SKILL.md << 'EOF'
---
name: my-new-skill
description: What this skill does
---

# My New Skill

Instructions for the agent go here.
EOF

# For Windsurf/Cline/Continue/Roo (plain .md format)
mkdir -p ~/.windsurf/rules/my-new-rule
cat > ~/.windsurf/rules/my-new-rule/my-new-rule.md << 'EOF'
# My New Rule

Instructions go here.
EOF

# For single-file tools
cat > .github/copilot-instructions.md << 'EOF'
Instructions for Copilot go here.
EOF
```

### Enable / Disable a skill

Disabling renames the file to `.disabled` so the tool ignores it but the content is preserved:

```bash
# Disable
mv ~/.cursor/skills/my-skill/SKILL.md ~/.cursor/skills/my-skill/SKILL.md.disabled

# Enable
mv ~/.cursor/skills/my-skill/SKILL.md.disabled ~/.cursor/skills/my-skill/SKILL.md
```

### Copy a skill between tools

```bash
# Copy from Cursor to Claude
cp -r ~/.cursor/skills/my-skill ~/.claude/skills/my-skill

# Copy from Agents to Windsurf (adapt format)
mkdir -p ~/.windsurf/rules/my-skill
cp ~/.agents/skills/my-skill/SKILL.md ~/.windsurf/rules/my-skill/my-skill.md
```

### Move a skill

```bash
mv ~/.cursor/skills/my-skill ~/.agents/skills/my-skill
```

### Delete a skill

```bash
rm -rf ~/.cursor/skills/my-skill
```

### Copy a skill from global to project scope

```bash
cp -r ~/.cursor/skills/my-skill .cursor/skills/my-skill
```

### Search across all skills

```bash
# Search by name
find ~/.agents/skills ~/.cursor/skills ~/.claude/skills ~/.windsurf/rules ~/.cline/rules ~/.continue/rules ~/.roo/rules -maxdepth 1 -type d 2>/dev/null | sort

# Search by content
grep -rl "search term" ~/.agents/skills/ ~/.cursor/skills/ ~/.claude/skills/ 2>/dev/null
```

### Find disabled skills

```bash
find ~/.agents/skills ~/.cursor/skills ~/.claude/skills -name "*.disabled" 2>/dev/null
```

## Guidelines

- When the user asks to "manage skills", "list my skills", "create a skill", "copy a skill to X", or similar, use the paths and formats above.
- Always confirm before deleting skills.
- When copying between tools with different formats (e.g., Cursor SKILL.md to Windsurf plain .md), adapt the file naming accordingly.
- Project-scoped skills override global skills of the same name.
- For single-file tools (Copilot, Codex, Aider, Augment), editing means replacing the entire file content.
- When creating skills, use kebab-case for directory names (e.g., `my-new-skill`).
