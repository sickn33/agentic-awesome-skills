# {{PLATFORM_NAME}} Rules — Template

ONLY generate if the corresponding platform is detected in the project. Detection signals per platform below.

This file is wrapped in managed blocks. The agent regenerates content between markers on update; human edits outside markers are preserved.

```text
<!-- AGENTS-GENERATED-START -->
# {{PLATFORM_RULES_HEADER}}

{{PLATFORM_SPECIFIC_CONTENT}}
<!-- AGENTS-GENERATED-END -->
```

## Platform detection and output

| Platform           | Detection signal                                  | Output file                       | Content mapping                                                          |
| ------------------ | ------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| **Cursor**         | `.cursorrules` exists or `.cursor/` directory     | `.cursorrules`                    | AGENTS.md sections: Setup commands, Code Style, Hard Rules, Prohibitions |
| **GitHub Copilot** | `.github/copilot-instructions.md` exists          | `.github/copilot-instructions.md` | Flat instructions: Setup, Code Style, Testing                            |
| **Gemini CLI**     | `GEMINI.md` exists or `.gemini/` directory        | `GEMINI.md`                       | System prompt style: Overview, Commands, Conventions                     |
| **Windsurf**       | `.windsurfrules` exists or `.windsurf/` directory | `.windsurfrules`                  | Progressive disclosure: Tech Stack, Rules, Testing                       |
| **Codex**          | Already covered by AGENTS.md (native support)     | —                                 | AGENTS.md is the primary file                                            |

## Filling rules

### `{{PLATFORM_NAME}}`

The platform name: "Cursor", "GitHub Copilot", "Gemini CLI", "Windsurf".

### `{{PLATFORM_RULES_HEADER}}`

Platform-specific heading:

- Cursor: `# Project Rules: {PROJECT_NAME}`
- Copilot: `# Copilot Instructions`
- Gemini: `# Gemini CLI Guidelines`
- Windsurf: `# Windsurf Rules`

### `{{PLATFORM_SPECIFIC_CONTENT}}`

Adapt from AGENTS.md but use platform-specific format:

- **Cursor**: Progressive disclosure with severity levels. Include BAD/GOOD code examples.
- **Copilot**: Flat markdown. Keep it short — Copilot has limited context window.
- **Gemini**: System prompt style. Second person, instructional.
- **Windsurf**: Progressive disclosure. Include cascade rules.

## Generation rules

1. Only generate for platforms actually detected in the project.
2. Keep each file under 200 lines — they're companions to AGENTS.md, not replacements.
3. Include a pointer back to AGENTS.md: `> Full rules in @AGENTS.md`
4. Use managed blocks (`<!-- AGENTS-GENERATED-START -->` / `<!-- AGENTS-GENERATED-END -->`) to preserve human edits.
