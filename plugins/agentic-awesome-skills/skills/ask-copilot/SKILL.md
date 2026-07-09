---
name: ask-copilot
description: "Use GitHub Copilot CLI in non-interactive mode to ask questions, review code, or generate snippets without manual interaction."
category: development
risk: critical
source: self
source_repo: cshara1/antigravity-awesome-skills
source_type: self
date_added: "2026-07-08"
author: cshara1
tags: [copilot, github, cli, review, prompt]
tools: [claude, cursor, gemini]
---

# Ask Copilot

## Overview

This skill allows the agent to interact with GitHub Copilot CLI (`copilot`) in a non-interactive (headless) mode. Use this skill when the user explicitly wants secondary advice, code reviews, explanations, or code generation from GitHub Copilot's models.

Use `source: self` and `source_type: self` when the skill is original to this repository and does not require README external-source credit.

Copilot is an external service. Treat prompts, file paths, snippets, repository content, command output, and generated suggestions as data that may leave the local environment.

## When to Use This Skill

- **User Request Only**: Use this skill **ONLY** when the user explicitly asks to "consult Copilot", "ask Copilot", "review with Copilot", or explicitly requests a second opinion using Copilot.
- **Do NOT Invoke Automatically**: To comply with privacy policies, the agent must not invoke this skill automatically for its own second opinions or checks without explicit user consent.

## How It Works

### Step 1: Request Explicit User Consent

Before executing any command that references local files, repository paths, snippets, command output, secrets-adjacent config, or private project context, you **MUST** obtain explicit user consent to send that material to GitHub Copilot.

Ask for separate approval before allowing Copilot to run tools, execute shell commands, edit files, install packages, or mutate the workspace.

### Step 2: Execute with Minimal Permitted Flags

To prevent TUI lockups, execute the `copilot` command with headless flags. Do not use blanket bypasses such as `--yolo` or `--allow-all-tools` for routine Q&A or review.

- **For Read-Only / General Q&A**: Avoid `--yolo` and use `--allow-all-paths` instead. This allows Copilot CLI to directly access and read local files referenced in your prompt.
- **For Trusted Mutation Tasks**: Prefer a scoped permission flag if the CLI supports one. Use blanket mutation bypasses only after the user explicitly authorizes Copilot to execute tools and mutate the workspace for the specific task.

### Step 3: Use Session Management (Optional)

To maintain conversation context, use `--name` and `--resume` flags, or pass a `--session-id` on subsequent calls.

## Examples

### Example 1: General Question (Read-Only)

Does not require repository path access or mutation permissions.
```bash
copilot -p "Explain how to implement a debounce function in TypeScript" -s
```

### Example 2: Code Review (Direct File Reference)

Always confirm with the user before executing. If consented, pass the file path directly in the prompt. Copilot CLI will read it using its path access permissions:
```bash
copilot -p "Review the file path/to/file.ts for potential memory leaks" -s --allow-all-paths
```

### Example 3: Named Session Management

```bash
copilot -p "Remember this session label for follow-up questions." -s --name "my-session-name"
copilot -p "Summarize the prior advice in this session." -s --resume "my-session-name"
```

## Best Practices

- ✅ **Do:** Ask for user consent before uploading any project files to third-party endpoints.
- ✅ **Do:** Pass file paths directly in the prompt text and let Copilot read them, instead of expanding them via shell `cat`.
- ✅ **Do:** Use minimal permission flags like `--allow-all-paths` for read-only queries instead of `--yolo`.
- ✅ **Do:** Use `-s` (silent) to suppress metadata and statistics, leaving only clean output.
- ❌ **Don't:** Automatically trigger this skill for background second opinions without the user's explicit ask.
- ❌ **Don't:** Send files, logs, environment details, or private repository context to Copilot without explicit approval.
- ❌ **Don't:** Run `copilot` without permission-bypass flags in background tasks, as it will hang waiting for interactive input.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Copilot responses may be incomplete, outdated, or wrong; verify any proposed code locally before using it.

## Security & Safety Notes

- The `--yolo` flag bypasses all permission prompts and allows Copilot CLI to run arbitrary shell commands and mutate workspace files. It must be treated as a high-risk option and never used by default.
- Always check that the code/files being sent do not contain sensitive credentials, API keys, or private environment variables.
- Prefer redacted snippets over whole files when only a small context sample is needed.

## Common Pitfalls

- **Problem:** The terminal hangs or the command times out.
  **Solution:** Ensure both `-p` (or `--prompt`) and the narrowest required non-interactive permission flag are present in the command arguments. Without required permission flags, the CLI may prompt for confirmation and hang headless processes.

## Related Skills

- `@cli-assistant` - How to interact with CLI tools in general.
