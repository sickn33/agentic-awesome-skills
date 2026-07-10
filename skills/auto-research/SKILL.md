---
name: auto-research
description: Research uncertain questions with an explicit, user-approved web search or ChatGPT consultation, then present options and wait for implementation approval.
category: automation
risk: critical
source: self
source_type: self
date_added: "2026-07-09"
author: zyu51
tags: [research, chatgpt, playwright, browser-automation, decision-support, chinese]
tools: [claude, playwright]
license: MIT
---

# Auto-Research Skill

## Overview

When implementing tasks, Claude Code can encounter uncertainties — design choices, algorithm details, API usage, or best practices. This skill provides an explicit-consent research path, presents findings, and waits for user approval before writing code.

The skill supports web research and an optional ChatGPT consultation. It never sends
conversation context, files, browser state, or credentials to a third party without the
user's explicit approval of the exact, redacted text.

## When to Use This Skill

- User asks a question where multiple valid approaches exist
- Claude is uncertain about algorithm details or API usage
- Design/architecture choices need comparison
- The user explicitly asks to search the web or consult ChatGPT and approves the proposed query

## How It Works

**Step 1: Propose the research boundary** — State the source to use, the exact query or
redacted prompt, whether any local/workspace text would leave the machine, and the likely
cost. Wait for the user to approve that exact boundary.

**Step 2: Research** — After approval, use web search or a browser session the user has
explicitly selected and authorized. Use a pinned, user-configured browser automation
connector; do not install packages automatically, use `@latest`, or access browser cookies,
other tabs, saved passwords, or sessions.

**Step 3: Present** — Distill findings into concise options with sources, presented to the user.

**Step 4: Await Approval** — Do NOT write code until the user says "go ahead" or picks an option.

**Step 5: Implement** — Once approved, execute with confidence.

### Explicit ChatGPT Consultation

Do not treat `?`, `??`, or another shorthand as consent. First propose a minimal prompt,
for example: `请评估这个已脱敏的方案的正确性、完整性和可改进之处：<text>`.
Explicitly identify every piece of text that would be sent. Only after the user confirms
the exact prompt may you open the selected ChatGPT session, submit that prompt, and present
the response. Do not include conversation history by default.

Redact secrets, personal data, proprietary code, customer data, and internal URLs before
proposing the prompt. If safe redaction is not possible, do not submit it.

### Browser Automation Boundary

If browser automation is necessary, the user must separately authorize the selected browser
profile and connector version. Restrict the session to the consultation tab. Do not inspect,
reuse, export, or rely on cookies from other tabs or profiles.

## Examples

### Example 1: Design Question with GPT
```
User: PyTorch 中自定义 ADMM 优化器怎么设计？
Claude: 我可以搜索公开资料，或将以下已脱敏问题发给 ChatGPT：
        “如何设计 PyTorch 自定义 ADMM 优化器？请比较可行模式。”
        不会发送工作区文件或对话历史。是否允许？
User: 允许发送这段文字
Claude: [Opens only the authorized consultation tab, submits the approved prompt]
Claude: GPT suggests approach A with these pros/cons. Proceed?
User: 行
Claude: [Implements code]
```

### Example 2: Web Search
```
User: ?? ADMM convergence criteria best practices
Claude: [WebSearch + WebFetch → finds Boyd et al. paper, extracts criteria]
Claude: Boyd recommends ||r|| < ε·max(||Ax||, ||Bz||, ||c||). Use this?
User: Yes
Claude: [Implements]
```

## Best Practices
- ✅ Always present findings to user before writing code
- ✅ Use `page.fill()` for instant text injection instead of `keyboard.type()`
- ✅ Ask for fresh approval before every external consultation
- ✅ Include sources in findings
- ❌ Don't skip research and write code speculatively
- ❌ Don't send context, files, or browser data because of a shorthand trigger
- ❌ Don't alter the user's browser profile or session state

## Limitations
- Requires a user-configured, pinned browser automation connector if browser consultation is used
- ChatGPT consultation is optional; use ordinary web search when it meets the need
- GPT response time varies (10-30s typically)
- Web search quality depends on available sources
- Does not replace expert domain knowledge — always let user make the final call

## Security & Safety Notes
- Obtain explicit consent for each third-party submission, including the exact redacted text
- Never access, export, or depend on cookies, saved passwords, or unrelated browser tabs
- Never submit sensitive credentials, tokens, proprietary code, personal data, or internal URLs
- Do not install or execute browser tooling from an unpinned package version

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| ChatGPT shows login page | Let the user log in themselves; do not handle cookies or credentials |
| The prompt contains sensitive context | Redact it or use local reasoning instead |
| Browser automation is unavailable | Use web search or stop and ask the user for a different approved method |

## Related Skills
- @systematic-debugging — use when debugging Playwright interactions with ChatGPT
- @condition-based-waiting — use when waiting for GPT responses in the browser
