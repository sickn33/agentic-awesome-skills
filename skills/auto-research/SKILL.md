---
name: auto-research
description: Automatically research via ChatGPT browser or web search when uncertain — ? to ask GPT, ?? to search web, present options and wait for user approval
category: automation
risk: safe
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

When implementing tasks, Claude Code encounters uncertainties — design choices, algorithm details, API usage, best practices. This skill teaches Claude to automatically research first (via ChatGPT/Playwright or web search), present findings, and wait for user approval before writing code.

The skill also provides trigger words: `?` sends the full conversation context to ChatGPT for feedback on Claude's last output, and `??` triggers web search research.

## When to Use This Skill

- User asks a question where multiple valid approaches exist
- Claude is uncertain about algorithm details or API usage
- Design/architecture choices need comparison
- User types `?` (ask GPT for feedback on current discussion)
- User types `??` (trigger web search research)

## How It Works

**Step 1: Research** — Use Playwright MCP (`@playwright/mcp@latest --extension --browser msedge`) to open ChatGPT via browser extension (no need to close browser, auto-carries login cookies). Or use WebSearch/WebFetch for web research.

**Step 2: Present** — Distill findings into concise options with sources, presented to the user.

**Step 3: Await Approval** — Do NOT write code until the user says "go ahead" or picks an option.

**Step 4: Implement** — Once approved, execute with confidence.

### `?` Trigger — GPT Feedback

When user types `?` alone, compose a ChatGPT prompt from:
1. User's last meaningful question/instruction
2. Claude's last output (summary + key conclusions)
3. Append: "请评估上述方案/输出的正确性、完整性和可改进之处"

Then open ChatGPT, fill the prompt instantly via `page.locator('#prompt-textarea').fill(text)`, click send using `[data-testid="send-button"]`, capture response, and present to user.

### Playwright Configuration

MCP server config: `npx @playwright/mcp@latest --extension --browser msedge`
Browser extension: https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm

Performance optimization: use `page.fill()` instead of `keyboard.type()` (15s → 0.1s), reuse tab between calls.

## Examples

### Example 1: Design Question with GPT
```
User: PyTorch 中自定义 ADMM 优化器怎么设计？
Claude: (analyzes, forms question) → Suggests asking GPT, input ? to confirm
User: ?
Claude: [Opens ChatGPT, asks about ADMM optimizer, captures response]
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
- ✅ Reuse the ChatGPT tab across multiple `?` calls
- ✅ Include sources in findings
- ❌ Don't skip research and write code speculatively
- ❌ Don't ask for permission on trivial single-line fixes
- ❌ Don't close the user's browser (extension mode doesn't require it)

## Limitations
- Requires Playwright Extension installed in Edge/Chrome
- ChatGPT login session must be active in the browser
- GPT response time varies (10-30s typically)
- Web search quality depends on available sources
- Does not replace expert domain knowledge — always let user make the final call

## Security & Safety Notes
- Playwright MCP connects via browser extension — user must approve the connection once
- The extension has access to browser tabs and cookies — standard browser extension permissions apply
- Never submit sensitive credentials or tokens in ChatGPT prompts
- `page.fill()` is safer than raw `document.execCommand()` as it uses Playwright's built-in fill mechanism

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| ChatGPT shows login page | Check browser is logged in; extension mode carries cookies |
| `keyboard.type()` is too slow | Use `page.fill()` for instant injection |
| Page context closes between calls | Keep page reference alive, reuse tab |
| Browser context doesn't have cookies | Use extension mode (`--extension`), not CDP |

## Related Skills
- @systematic-debugging — use when debugging Playwright interactions with ChatGPT
- @condition-based-waiting — use when waiting for GPT responses in the browser
