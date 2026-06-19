---
name: skill-creator
description: "To create new CLI skills following Anthropic's official best practices with zero manual configuration. This skill automates brainstorming, template application, validation, and installation processes while maintaining progressive disclosure patterns and writing style standards."
category: meta
risk: safe
source: community
tags: "[automation, scaffolding, skill-creation, meta-skill]"
date_added: "2026-02-27"
---

# skill-creator

## Purpose

To create new CLI skills following Anthropic's official best practices with zero manual configuration. This skill automates brainstorming, template application, validation, and installation processes while maintaining progressive disclosure patterns and writing style standards.

## When to Use This Skill

This skill should be used when:
- User wants to extend CLI functionality with custom capabilities
- User needs to create a skill following official standards
- User wants to automate repetitive CLI tasks with a reusable skill
- User needs to package domain knowledge into a skill format
- User wants both local and global skill installation options

## Core Capabilities

1. **Interactive Brainstorming** - Collaborative session to define skill purpose and scope
2. **Prompt Enhancement** - Optional integration with prompt-engineer skill for refinement
3. **Template Application** - Automatic file generation from standardized templates
4. **Validation** - YAML, content, and style checks against Anthropic standards
5. **Installation** - Local repository or global installation with symlinks
6. **Progress Tracking** - Visual gauge showing completion status at each step

## Step 0: Discovery

Before starting skill creation, gather runtime information:

```bash
# Detect available platforms
COPILOT_INSTALLED=false
CLAUDE_INSTALLED=false
CODEX_INSTALLED=false

if command -v gh &>/dev/null && gh copilot --version &>/dev/null 2>&1; then
    COPILOT_INSTALLED=true
fi

if [[ -d "$HOME/.claude" ]]; then
    CLAUDE_INSTALLED=true
fi

if [[ -d "$HOME/.codex" ]]; then
    CODEX_INSTALLED=true
fi

# Determine working directory
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SKILLS_REPO="$REPO_ROOT"

# Check if in cli-ai-skills repository
if [[ ! -d "$SKILLS_REPO/.github/skills" ]]; then
    echo "⚠️  Not in cli-ai-skills repository. Creating standalone skill."
    STANDALONE=true
fi

# Get user info from git config
AUTHOR=$(git config user.name || echo "Unknown")
EMAIL=$(git config user.email || echo "")
```

**Key Information Needed:**
- Which platforms to target (Copilot, Claude, Codex, or all three)
- Installation preference (local, global, or both)
- Skill name and purpose
- Skill type (general, code, documentation, analysis)

## Main Workflow

### Progress Tracking Guidelines

Throughout the workflow, display a visual progress bar before starting each phase to keep the user informed. The progress bar format is:

```
[████████████░░░░░░] 60% - Step 3/5: Creating SKILL.md
```

**Format specifications:**
- 20 characters wide (use █ for filled, ░ for empty)
- Percentage based on current step (Step 1=20%, Step 2=40%, Step 3=60%, Step 4=80%, Step 5=100%)
- Step counter showing current/total (e.g., "Step 3/5")
- Brief description of current phase

**Display the progress bar using:**
```bash
echo "[████░░░░░░░░░░░░░░] 20% - Step 1/5: Brainstorming & Planning"
```

### Phase 1: Brainstorming & Planning

**Progress:** Display before starting this phase:
```bash
echo "[████░░░░░░░░░░░░░░] 20% - Step 1/5: Brainstorming & Planning"
```

Display progress:
```
╔══════════════════════════════════════════════════════════════╗
║     🛠️  SKILL CREATOR - Creating New Skill                  ║
╠══════════════════════════════════════════════════════════════╣
║ → Phase 1: Brainstorming                 [10%]               ║
║ ○ Phase 2: Prompt Refinement                                 ║
║ ○ Phase 3: File Generation                                   ║
║ ○ Phase 4: Validation                                        ║
║ ○ Phase 5: Installation                                      ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ███░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Ask the user:**

1. **What should this skill do?** (Free-form description)
   - Example: "Help users debug Python code by analyzing stack traces"
   
2. **When should it trigger?** (Provide 3-5 trigger phrases)
   - Example: "debug Python error", "analyze stack trace", "fix Python exception"

3. **What type of skill is this?**
   - [ ] General purpose (default template)
   - [ ] Code generation/modification
   - [ ] Documentation creation/maintenance
   - [ ] Analysis/investigation

4. **Which platforms should support this skill?**
   - [ ] GitHub Copilot CLI
   - [ ] Claude Code
    - [ ] Codex
    - [ ] All three (recommended)

5. **Provide a one-sentence description** (will appear in metadata)
   - Example: "Analyzes Python stack traces and suggests fixes"

**Capture responses and prepare for next phase.**

### Phase 2: Prompt Enhancement (Optional)

**Progress:** Display before starting this phase:
```bash
echo "[████████░░░░░░░░░░] 40% - Step 2/5: Prompt Enhancement"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 1: Brainstorming                                     ║
║ → Phase 2: Prompt Refinement             [30%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: █████████░░░░░░░░░░░░░░░░░░░░░  30%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Ask the user:**
"Would you like to refine the skill description using the prompt-engineer skill?"
- [ ] Yes - Use prompt-engineer to enhance clarity and structure
- [ ] No - Proceed with current description

If **Yes**:
1. Check if prompt-engineer skill is available
2. Invoke with current description as input
3. Review enhanced output with user
4. Ask: "Accept enhanced version or keep original?"

If **No** or prompt-engineer unavailable:
- Proceed with original user input

### Phase 3: File Generation

**Progress:** Display before starting this phase:
```bash
echo "[████████████░░░░░░] 60% - Step 3/5: File Generation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 1: Brainstorming                                     ║
║ ✓ Phase 2: Prompt Refinement                                 ║
║ → Phase 3: File Generation               [50%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ███████████████░░░░░░░░░░░░░░░  50%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Generate skill structure:**

```bash
# Convert skill name to kebab-case
SKILL_NAME=$(echo "$USER_INPUT" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Create directories
if [[ "$PLATFORM" =~ "copilot" ]]; then
    mkdir -p ".github/skills/$SKILL_NAME"/{references,examples,scripts}
fi

if [[ "$PLATFORM" =~ "claude" ]]; then
    mkdir -p ".claude/skills/$SKILL_NAME"/{references,examples,scripts}
fi

if [[ "$PLATFORM" =~ "codex" ]]; then
    mkdir -p ".codex/skills/$SKILL_NAME"/{references,examples,scripts}
fi
```

**Apply templates:**

1. **SKILL.md** - Use appropriate template:
   - `skill-template-copilot.md`, `skill-template-claude.md`, or `skill-template-codex.md`
   - Substitute placeholders:
     - `{{SKILL_NAME}}` → kebab-case name
     - `{{DESCRIPTION}}` → one-line description
     - `{{TRIGGERS}}` → comma-separated trigger phrases
     - `{{PURPOSE}}` → detailed purpose from brainstorming
     - `{{AUTHOR}}` → from git config
     - `{{DATE}}` → current date (YYYY-MM-DD)
     - `{{VERSION}}` → "1.0.0"

2. **README.md** - Use `readme-template.md`:
   - User-facing documentation (300-500 words)
   - Include installation instructions
   - Add usage examples

3. **References/** (optional but recommended):
   - Create `detailed-guide.md` for extended documentation (2k-5k words)
   - Move lengthy content here to keep SKILL.md under 2k words

**File creation commands:**

```bash
# Apply template with substitution
sed "s/{{SKILL_NAME}}/$SKILL_NAME/g; \
     s/{{DESCRIPTION}}/$DESCRIPTION/g; \
     s/{{AUTHOR}}/$AUTHOR/g; \
     s/{{DATE}}/$(date +%Y-%m-%d)/g" \
    resources/templates/skill-template-copilot.md \
    > ".github/skills/$SKILL_NAME/SKILL.md"

# Create README
sed "s/{{SKILL_NAME}}/$SKILL_NAME/g" \
    resources/templates/readme-template.md \
    > ".github/skills/$SKILL_NAME/README.md"

# Apply template for Codex if selected
if [[ "$PLATFORM" =~ "codex" ]]; then
    sed "s/{{SKILL_NAME}}/$SKILL_NAME/g; \
         s/{{DESCRIPTION}}/$DESCRIPTION/g; \
         s/{{AUTHOR}}/$AUTHOR/g; \
         s/{{DATE}}/$(date +%Y-%m-%d)/g" \
        resources/templates/skill-template-codex.md \
        > ".codex/skills/$SKILL_NAME/SKILL.md"
    
    sed "s/{{SKILL_NAME}}/$SKILL_NAME/g" \
        resources/templates/readme-template.md \
        > ".codex/skills/$SKILL_NAME/README.md"
fi
```

**Display created structure:**
```
✅ Created:
   .github/skills/your-skill-name/ (if Copilot selected)
   .claude/skills/your-skill-name/ (if Claude selected)
   .codex/skills/your-skill-name/ (if Codex selected)
   ├── SKILL.md (832 lines)
   ├── README.md (347 lines)
   ├── references/
   ├── examples/
   └── scripts/
```

### Phase 4: Validation

**Progress:** Display before starting this phase:
```bash
echo "[████████████████░░] 80% - Step 4/5: Validation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 3: File Generation                                   ║
║ → Phase 4: Validation                    [70%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: █████████████████████░░░░░░░░░  70%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Run validation scripts:**

```bash
# Validate YAML frontmatter
scripts/validate-skill-yaml.sh ".github/skills/$SKILL_NAME"

# Validate content quality
scripts/validate-skill-content.sh ".github/skills/$SKILL_NAME"
```

**Expected output:**
```
🔍 Validating YAML frontmatter...
✅ YAML frontmatter valid!

🔍 Validating content...
✅ Word count excellent: 1847 words
✅ Content validation complete!
```

**If validation fails:**
- Display specific errors
- Offer to fix automatically (common issues)
- Ask user to manually correct complex issues

**Common auto-fixes:**
- Convert second-person to imperative form
- Reformat description to third-person
- Add missing required fields

### Phase 5: Installation

**Progress:** Display before starting this phase:
```bash
echo "[████████████████████] 100% - Step 5/5: Installation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 4: Validation                                        ║
║ → Phase 5: Installation                  [90%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ██████████████████████████░░░░░  90%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Ask the user:**
"How would you like to install this skill?"

- [ ] **Repository only** - Files created in `.github/skills/` (works when in repo)
- [ ] **Global installation** - Create symlinks in `~/.copilot/skills/` (works everywhere)
- [ ] **Both** - Repository + global symlinks (recommended, auto-updates with git pull)
- [ ] **Skip installation** - Just create files

**If global installation selected:**

```bash
# Detect which platforms to install for
INSTALL_TARGETS=()

if [[ "$COPILOT_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "copilot" ]]; then
    INSTALL_TARGETS+=("copilot")
fi

if [[ "$CLAUDE_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "claude" ]]; then
    INSTALL_TARGETS+=("claude")
fi

if [[ "$CODEX_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "codex" ]]; then
    INSTALL_TARGETS+=("codex")
fi

# Ask user to confirm detected platforms
echo "Detected platforms: ${INSTALL_TARGETS[*]}"
echo "Install for these platforms? [Y/n]"
```

**Installation process:**

```bash
# GitHub Copilot CLI
if [[ " ${INSTALL_TARGETS[*]} " =~ " copilot " ]]; then
    ln -sf "$SKILLS_REPO/.github/skills/$SKILL_NAME" \
           "$HOME/.copilot/skills/$SKILL_NAME"
    echo "✅ Installed for GitHub Copilot CLI"
fi

# Claude Code
if [[ " ${INSTALL_TARGETS[*]} " =~ " claude " ]]; then
    ln -sf "$SKILLS_REPO/.claude/skills/$SKILL_NAME" \
           "$HOME/.claude/skills/$SKILL_NAME"
    echo "✅ Installed for Claude Code"
fi

# Codex
if [[ " ${INSTALL_TARGETS[*]} " =~ " codex " ]]; then
    ln -sf "$SKILLS_REPO/.codex/skills/$SKILL_NAME" \
           "$HOME/.codex/skills/$SKILL_NAME"
    echo "✅ Installed for Codex"
fi
```

**Verify installation:**

```bash
# Check symlinks
ls -la ~/.copilot/skills/$SKILL_NAME 2>/dev/null
ls -la ~/.claude/skills/$SKILL_NAME 2>/dev/null
ls -la ~/.codex/skills/$SKILL_NAME 2>/dev/null
```

### Phase 6: Completion

**Progress:** Display completion message:
```bash
echo "[████████████████████] 100% - ✓ Skill created successfully!"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 5: Installation                                      ║
║ ✅ SKILL CREATION COMPLETE!                                  ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ██████████████████████████████  100%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Display summary:**

```
🎉 Skill created successfully!

📦 Skill Name: your-skill-name
📁 Location: .github/skills/your-skill-name/
🔗 Installed: Global (Copilot + Claude)

📋 Files Created:
   ✅ SKILL.md (1,847 words)
   ✅ README.md (423 words)
   ✅ references/ (empty, ready for extended docs)
   ✅ examples/ (empty, ready for code samples)
   ✅ scripts/ (empty, ready for utilities)

🚀 Next Steps:
   1. Test the skill: Try trigger phrases in CLI
   2. Add examples: Create working code samples in examples/
   3. Extend docs: Add detailed guides to references/
   4. Commit changes: git add .github/skills/your-skill-name && git commit
   5. Share: Push to repository for team use

💡 Pro Tips:
   - Keep SKILL.md under 2,000 words (currently: 1,847)
   - Move detailed content to references/ folder
   - Add executable scripts to scripts/ folder
   - Update README.md with real usage examples
   - Run validation before committing: scripts/validate-skill-yaml.sh
```

## Error Handling

### Platform Detection Issues

If platforms cannot be detected:
```
⚠️  Unable to detect GitHub Copilot CLI or Claude Code
    
Would you like to:
1. Install for repository only (works when in repo)
2. Specify platform manually
3. Skip installation
```

### Template Not Found

If templates are missing:
```
❌ Error: Template not found at resources/templates/

This skill requires the cli-ai-skills repository structure.

Options:
1. Clone cli-ai-skills: git clone <repo-url>
2. Create minimal skill structure manually
3. Exit and set up templates first
```

### Validation Failures

If content doesn't meet standards:
```
⚠️  Validation Issues Found:

1. YAML: Description not in third-person format
   Expected: "This skill should be used when..."
   Found: "Use this skill when..."
   
2. Content: Word count too high (5,342 words, max 5,000)
   Suggestion: Move detailed sections to references/

Fix automatically? [Y/n]
```

### Installation Conflicts

If symlink already exists:
```
⚠️  Skill already installed at ~/.copilot/skills/your-skill-name

Options:
1. Overwrite existing installation
2. Rename new skill
3. Skip installation
4. Install to different location
```

## Bundled Resources

This skill includes additional resources in subdirectories:

### references/

Detailed documentation loaded when needed:
- `anthropic-best-practices.md` - Official Anthropic skill development guidelines
- `writing-style-guide.md` - Writing standards and examples
- `progressive-disclosure.md` - Content organization patterns
- `validation-checklist.md` - Pre-commit quality checks

### examples/

Working examples demonstrating skill usage:
- `basic-skill-creation.md` - Simple skill creation walkthrough
- `advanced-skill-bundled-resources.md` - Complex skill with references/
- `global-installation.md` - Installing skills system-wide

### scripts/

Executable utilities for skill maintenance:
- `validate-all-skills.sh` - Batch validation of all skills in repository
- `update-skill-version.sh` - Bump version and update changelog
- `generate-skill-index.sh` - Auto-generate skills catalog

## Technical Implementation Notes

**Template Substitution:**
- Use `sed` for simple replacements
- Preserve YAML formatting exactly
- Handle multi-line descriptions with proper escaping

**Symlink Strategy:**
- Always use absolute paths: `ln -sf /full/path/to/source ~/.copilot/skills/name`
- Verify symlink before considering installation complete
- Benefits: Auto-updates when repository is pulled

**Validation Integration:**
- Run validation before installation
- Block installation if critical errors found
- Warnings are informational only

**Git Integration:**
- Extract author from `git config user.name`
- Use repository root detection: `git rev-parse --show-toplevel`
- Respect `.gitignore` patterns

## Quality Standards

**SKILL.md Requirements:**
- 1,500-2,000 words (ideal)
- Under 5,000 words (maximum)
- Third-person description format
- Imperative/infinitive writing style
- Progressive disclosure pattern

**README.md Requirements:**
- 300-500 words
- User-facing language
- Clear installation instructions
- Practical usage examples

**Validation Checks:**
- YAML frontmatter completeness
- Description format (third-person)
- Word count limits
- Writing style (no second-person)
- Required fields present

## References

- **Anthropic Official Skill Development Guide:** https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md
- **Repository:** https://github.com/yourusername/cli-ai-skills
- **Writing Style Guide:** `resources/templates/writing-style-guide.md`
- **Progress Tracker Template:** `resources/templates/progress-tracker.md`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
