---
name: vscode-extension-guide-en
description: "Guide for VS Code extension development from scaffolding to Marketplace publication"
category: core-dev
risk: safe
source: community
source_repo: lewiswigmore/agent-skills
source_type: community
date_added: "2026-04-12"
author: lewiswigmore
tags: [vscode, extension, ide, typescript, marketplace]
tools: [claude, cursor, copilot, codex, gemini]
---

# VS Code Extension Guide (English)

## Overview

An English guide for building VS Code extensions, covering the full lifecycle from scaffolding to Marketplace publication. Includes reference material on webview patterns, CSP security, TreeView, testing, packaging and troubleshooting. Updated for VS Code 1.74+ APIs.

Adapted from aktsmm/agent-skills (CC BY-NC-SA 4.0), translated to English with corrections for current VS Code APIs.

## When to Use This Skill

- Use when creating a new VS Code extension from scratch
- Use when adding commands, keybindings or settings to an extension
- Use when building TreeView or Webview UI in an extension
- Use when publishing an extension to the VS Code Marketplace
- Use when troubleshooting extension activation or packaging issues

## How It Works

### Quick Start

```bash
npm install -g yo generator-code
yo code
```

### Project Structure

```
my-extension/
├── package.json          # Extension manifest
├── src/extension.ts      # Entry point
├── out/                  # Compiled JS
├── images/icon.png       # 128x128 PNG for Marketplace
└── .vscodeignore         # Exclude files from VSIX
```

### Building and Packaging

```bash
npm run compile           # Build once
npm run watch             # Watch mode (F5 to launch debug)
npx @vscode/vsce package  # Creates .vsix
```

## Reference Topics

The full skill includes detailed reference documents on:

- **Webview patterns** with CSP security and message passing
- **TreeView** data providers and drag-and-drop
- **Testing** setup with @vscode/test-electron
- **Publishing** to the VS Code Marketplace
- **AI customization** for extension projects
- **Code review prompts** for extension code
- **Troubleshooting** common extension issues

## Install the Full Skill

For the complete guide with all reference documents:

```bash
npx skills add lewiswigmore/agent-skills --skill vscode-extension-guide-en
```

## Best Practices

- Unify package name, setting keys, command IDs and view IDs before publishing
- Keep package size under 5MB using `.vscodeignore`
- Since VS Code 1.74, `activationEvents` are auto-detected for contributed commands and views
- Always test with the Extension Development Host (F5) before packaging

## Common Pitfalls

- **Problem:** Extension not loading
  **Solution:** Check `activationEvents`. Since VS Code 1.74, these are auto-detected for contributed commands/views.

- **Problem:** Command not found
  **Solution:** Match the command ID exactly between package.json and your code.

- **Problem:** Webview content not displaying
  **Solution:** Check your Content Security Policy. Use the webview's `cspSource` property.

## Related Skills

- `@test-driven-development` - Write tests before implementing extension features
- `@debugging-strategies` - Systematic troubleshooting for extension issues

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
