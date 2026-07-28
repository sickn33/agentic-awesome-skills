---
name: browser-act
description: "Use BrowserAct for authenticated browser automation, JS-rendered extraction, screenshots, parallel sessions, verification handling, and human handoff."
allowed-tools: Bash(browser-act:*)
category: browser-automation
risk: critical
source: https://github.com/browser-act/skills/tree/main/browser-act
source_repo: browser-act/skills
source_type: official
date_added: "2026-07-28"
author: BrowserAct
tags: [browser-automation, web-extraction, ai-agents, cli, multi-session]
tools: [claude, codex, cursor, gemini, windsurf]
license: MIT
license_source: https://github.com/browser-act/skills/blob/main/LICENSE
metadata:
  version: "2.0.2"
  install: "uv tool install browser-act-cli --python 3.12"
  homepage: "https://www.browseract.com"
---

# BrowserAct Browser Automation

## Overview

BrowserAct is a browser automation CLI for AI agents. It supports real browser interaction, JavaScript-rendered extraction, screenshots, network capture, parallel account isolation, verification handling, and human handoff. The canonical Skill is maintained at [browser-act/skills](https://github.com/browser-act/skills/tree/main/browser-act).

## When to Use This Skill

- Use when a task needs a real browser, authenticated state, or JavaScript-rendered content.
- Use for navigation, clicks, form input, screenshots, DOM extraction, or network capture.
- Use when multiple browser sessions or isolated accounts must run in parallel.
- Use when verification or a manual handoff may be required to complete a workflow safely.

## How It Works

1. Load BrowserAct instructions that match the installed CLI version.
2. Follow the returned browser selection, session ownership, interaction, verification, and cleanup workflow.
3. Apply confirmation gates before browser creation, login, form submission, uploads, and other sensitive operations.
4. Keep cookies, profiles, page content, and session data local except when the user invokes optional verification assistance.

## Examples

Install the CLI after the user approves the external package installation:

```bash
uv tool install browser-act-cli --python 3.12
```

After this Skill is invoked, load the complete version-matched guide before running any browser command:

```bash
browser-act get-skills core --skill-version 2.0.2
```

Example requests:

```text
Open this authenticated dashboard, export the visible table, and verify the row count.
```

```text
Run the same browser workflow across two isolated accounts and return separate results.
```

## Best Practices

- Load the complete core guide and do not truncate its output.
- Reuse only sessions created by the current conversation.
- Verify page state after navigation or any state-changing action.
- Close sessions created for the task when the work is complete.
- Stop and request user participation when authentication or verification cannot be completed automatically.

## Limitations

- Requires Python 3.12+, `uv`, and a compatible BrowserAct CLI installation.
- Site permissions, terms, access controls, and rate limits still apply.
- Login challenges, CAPTCHAs, MFA, and destructive actions can require explicit user participation.
- Command details are served by the CLI and may differ across installed versions.

## Security and Safety Notes

- Risk is `critical` because browser workflows can change remote state.
- Ask for confirmation before installing the CLI, creating a browser, logging in, submitting a form, or uploading a file.
- Never expose credentials, cookies, browser profiles, or extracted private data.
- The optional verification service receives only the challenge image when explicitly invoked.

## Additional Resources

- [Official BrowserAct Skill](https://github.com/browser-act/skills/tree/main/browser-act)
- [BrowserAct website](https://www.browseract.com)
- [MIT license](https://github.com/browser-act/skills/blob/main/LICENSE)
