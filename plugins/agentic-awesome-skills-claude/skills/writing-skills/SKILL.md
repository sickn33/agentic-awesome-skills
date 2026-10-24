---
name: writing-skills
description: "Use when creating, updating, or improving agent skills."
category: meta
risk: critical
source: community
date_added: "2026-02-27"
---

# Writing Skills (Excellence)

Compatibility: these templates are conventions, not a universal loader schema. Use the target host's documented skill directory and current schema; custom `metadata.triggers` is optional and does not itself guarantee discovery. Bundled upstream guidance is a historical snapshot. Rendering requires Node.js and a locally installed Graphviz `dot`; inspect trusted DOT only, and open generated SVG cautiously. `--combine` shares node IDs across graphs and is a visual convenience, not a semantics-preserving merge. Outputs are exclusive: remove or choose another output directory deliberately before rerunning.

Scope: examples are authoring/test fixtures, not live instructions. Follow the user, host, and repository instruction hierarchy. Run pressure tests only with authorized isolated fixtures; never delete user work or weaken safety/approval boundaries to enforce a skill. Preserve existing work and adapt the validation plan when a baseline already passes. Sample compliance does not prove universal reliability.

Dispatcher for skill creation excellence. Use the decision tree below to find the right template and standards.

## ⚡ Quick Decision Tree

### What do you need to do?

1. **Create a NEW skill:**
   - Is it simple (single file, <200 lines)? → [Tier 1 Architecture](references/tier-1-simple/README.md)
   - Is it complex (multi-concept, 200-1000 lines)? → [Tier 2 Architecture](references/tier-2-expanded/README.md)
   - Is it a massive platform (10+ products, AWS, Convex)? → [Tier 3 Architecture](references/tier-3-platform/README.md)

2. **Improve an EXISTING skill:**
   - Fix "it's too long" -> [Modularize (Tier 3)](references/templates/tier-3-platform.md)
   - Fix "AI ignores rules" -> [Anti-Rationalization](references/anti-rationalization/README.md)
   - Fix "users can't find it" -> [CSO (Search Optimization)](references/cso/README.md)

3. **Verify Compliance:**
   - Check metadata/naming -> [Standards](references/standards/README.md)
   - Add tests -> [Testing Guide](references/testing/README.md)

## 📚 Component Index

| Component | Purpose |
|-----------|---------|
| **[CSO](references/cso/README.md)** | "SEO for LLMs". How to write descriptions that trigger. |
| **[Standards](references/standards/README.md)** | File naming, YAML frontmatter, directory structure. |
| **[Anti-Rationalization](references/anti-rationalization/README.md)**| How to write rules that agents won't ignore. |
| **[Testing](references/testing/README.md)** | How to ensure your skill actually works. |

## 🛠️ Templates

- [Technique Skill](references/templates/technique.md) (How-to)
- [Reference Skill](references/templates/reference.md) (Docs)
- [Discipline Skill](references/templates/discipline.md) (Rules)
- [Pattern Skill](references/templates/pattern.md) (Design Patterns)

## When to Use
- Creating a NEW skill from scratch
- Improving an EXISTING skill that agents ignore
- Debugging why a skill isn't being triggered
- Standardizing skills across a team

## How It Works

1. **Identify goal** → Use decision tree above
2. **Select template** → From `references/templates/`
3. **Apply CSO** → Optimize description for discovery
4. **Add anti-rationalization** → For discipline skills
5. **Test** → RED-GREEN-REFACTOR cycle

## Quick Example

```yaml
---
name: my-technique
description: Use when [specific symptom occurs].
metadata:
  category: technique
  triggers: error-text, symptom, tool-name
---

# My Technique

## When to Use
- [Symptom A]
- [Error message]
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Description summarizes workflow | Describe the capability and specific use conditions concisely |
| No `metadata.triggers` | Optional host-specific metadata; include useful terms in description |
| Generic name ("helper") | Use a descriptive lowercase hyphenated ID |
| Long monolithic SKILL.md | Split into `references/` |

See [gotchas.md](gotchas.md) for more.

## ✅ Pre-Deploy Checklist

Before deploying any skill:

- [ ] `name` field matches directory name exactly
- [ ] `SKILL.md` filename is ALL CAPS
- [ ] Description explains what the skill does and when to use it
- [ ] Frontmatter matches the target host and repository schema
- [ ] Total lines < 500 (use `references/` for more)
- [ ] No `@` force-loading in cross-references
- [ ] Tested with real scenarios

## 🔗 Related Skills

- **opencode-expert**: For OpenCode environment configuration
- If your host defines `/write-skill`, it may provide guided creation; that command is not bundled here

## Examples

**Create a Tier 1 skill:**
```bash
mkdir -p ~/.config/opencode/skills/my-technique
touch ~/.config/opencode/skills/my-technique/SKILL.md
```

**Create a Tier 2 skill:**
```bash
mkdir -p ~/.config/opencode/skills/my-skill/references/core
touch ~/.config/opencode/skills/my-skill/{SKILL.md,gotchas.md}
touch ~/.config/opencode/skills/my-skill/references/core/README.md
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
