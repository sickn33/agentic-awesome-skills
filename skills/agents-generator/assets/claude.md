# CLAUDE.md — Template

ONLY generate if Claude Code is detected in the project. Detection signals:

- `.claude/` directory exists
- `CLAUDE.md` file exists at project root
- `.claude/skills/` directory exists
- `claude` appears in devDependencies or as a tool reference

The CLAUDE.md file should be **thin**. Its only job is to point to AGENTS.md. Do not duplicate content.

```markdown
# CLAUDE.md

See @AGENTS.md

{{CLAUDE_SPECIFIC_SECTION}}
```

## Filling rules

### `{{CLAUDE_SPECIFIC_SECTION}}`

Only add if the project actually uses Claude-specific features. If none, omit entirely:

- **`.claude/rules/`** — if modular rule files exist: `Additional rules in @.claude/rules/`
- **`.claude/commands/`** — if custom slash commands exist: `Custom commands: @.claude/commands/`
- **`.claude/agents/`** — if custom subagents exist: `Custom subagents: @.claude/agents/`
- **Claude-only behavior**: "Use plan mode for non-trivial tasks", "Use subagents for parallel work"

If none of these apply, CLAUDE.md is just:

```markdown
# CLAUDE.md

See @AGENTS.md
```

That's the whole file. Don't add empty sections.
