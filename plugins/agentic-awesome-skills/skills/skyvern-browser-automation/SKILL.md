---
name: skyvern-browser-automation
description: "AI-powered browser automation — navigate sites, fill forms, extract structured data, log in with stored credentials, and build reusable workflows."
category: browser-automation
risk: safe
source: community
source_repo: Skyvern-AI/skyvern
source_type: official
date_added: "2026-04-23"
author: mark1ian
tags: [browser-automation, mcp, web-scraping, form-filling, ai-agents, workflow-automation]
tools: [claude, cursor, gemini, codex]
license: "AGPL-3.0"
license_source: "https://github.com/Skyvern-AI/skyvern/blob/main/LICENSE"
---

# Skyvern Browser Automation -- CLI Judgment Procedure

Skyvern uses AI to navigate and interact with websites. Every command below is a runnable `skyvern <command>` invocation.

## When to Use This Skill

- Use when you need AI-assisted browser automation for navigation, extraction, form filling, login flows, or reusable website workflows.
- Use when deterministic selectors are unavailable and Skyvern's visual/a11y reasoning can identify page controls.
- Use when a one-off browser task should become a repeatable workflow with run history and verification.

## Step 1: Classify Your Task (ALWAYS do this first)

| Classification | Signal | CLI Command | Cost | What Happens |
|---|---|---|---|---|
| Quick check (yes/no) | "is the user logged in?" | `skyvern browser validate` | 1 LLM + screenshots | Lightweight validation (2 steps max), returns boolean. Cheapest AI option. |
| Quick inspection | "what does the page show?" | `skyvern browser extract` | 1 LLM + screenshots | Dedicated extraction LLM + schema validation + caching. |
| Single action (known target) | "click #submit" | `skyvern browser click/type` | 0 LLM | Deterministic Playwright. No AI. Fastest. |
| Single action (unknown target) | "click the submit button" | `skyvern browser act` | 2-3 LLM, no screenshots | No screenshots in reasoning. Economy a11y tree. For visual targets, use hybrid mode (selector + intent). |
| Same-page multi-step | "fill the form and submit" | `skyvern browser act` or primitive chain | 2-3 LLM or 0 LLM | Use `act` when labels are clear. Use click/type/select directly when you know selectors. |
| Throwaway autonomous trial | "try this once", "see if this works" | `skyvern browser run-task` | Higher | One-off autonomous agent for exploration. Do not use for recurring or multi-page production automations. |
| Multi-page or reusable automation | "navigate a multi-page wizard", "set this up", "automate this weekly" | `skyvern workflow create` + `run` | N LLM + screenshots | Build a workflow with one block per step. Each block gets visual reasoning, verification, and reusable run history. |

**MCP note:** if you are using the Skyvern MCP instead of the CLI, prefer `observe + execute` for same-page multi-step UI work. The CLI does not expose that pair directly.

## Step 2: Apply These Decision Rules

1. If the prompt includes a selector, id, XPath, or exact field target, use browser primitives -- not `act`.
2. If you only need a yes/no answer, use `validate` -- not `extract` or `act`.
3. If the work stays on one page and labels are clear, use `act` or a primitive chain.
4. If the user says `try this once`, `see if this works`, or clearly wants a one-off exploratory trial, use `run-task`.
5. If the task spans multiple pages and is meant to be reusable, scheduled, repeatable, or explicitly `set up` as automation, use `workflow create`.
6. Never type passwords. Always use stored credentials with `skyvern browser login`.

## Step 3: Create a Session

Every browser command needs a session. Create one first:

```bash
# Cloud session (default -- works for public URLs)
skyvern browser session create --timeout 30

# Local session (for localhost URLs or self-hosted mode)
skyvern browser session create --local --timeout 30

# Connect to existing browser via CDP
skyvern browser session connect --cdp "ws://localhost:9222"
```

Session state persists between commands. After `session create`, subsequent commands auto-attach.
Override with `--session pbs_...`. Close when done: `skyvern browser session close`.

## Step 4: Execute by Classification

### Quick check (yes/no)

```bash
skyvern browser validate --prompt "Is the user logged in? Look for a dashboard or avatar."
```

Returns true/false. Cheapest AI option -- prefer over extract or act for boolean checks.

### Quick inspection

```bash
skyvern browser extract \
  --prompt "Extract all product names and prices" \
  --schema '{"type":"object","properties":{"items":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"string"}}}}}}'
```

Uses screenshots + dedicated extraction LLM. Better than screenshot+read because Skyvern's LLM interprets the page.

### Single action (known target)

```bash
skyvern browser click --selector "#submit-btn"
skyvern browser type --text "user@co.com" --selector "#email"
skyvern browser select --value "US" --intent "the country dropdown"
```

Deterministic. No AI. Three targeting modes:
1. **Intent**: `--intent "the Submit button"` (AI finds element)
2. **Selector**: `--selector "#submit-btn"` (CSS/XPath, deterministic)
3. **Hybrid**: both (selector narrows, AI confirms)

### Single action (unknown target)

```bash
skyvern browser act --prompt "Click the Sign In button"
skyvern browser act --prompt "Close the cookie banner, then click Sign In"
```

**Warning:** act has NO screenshots in its LLM reasoning. It uses an economy accessibility tree.
Fine for well-labeled elements. For visually complex targets, use MCP observe+click or hybrid mode.

### Same-page multi-step

```bash
skyvern browser act --prompt "Fill the shipping form and click Continue"
```

Use `act` when the fields and buttons are clearly labeled and the flow stays on one page.
If you need tighter control, break the work into `click`, `type`, `select`, `press-key`, and `wait`.

### Throwaway autonomous trial

```bash
skyvern browser run-task \
  --url "https://example.com" \
  --prompt "Check whether the checkout flow works end to end and extract the confirmation number"
```

Use `run-task` to prove feasibility or do one-off exploration. If the task becomes important enough
to rerun, debug, or share, convert it to a workflow.

### Multi-page or reusable automation — build a workflow with one block per step

```bash
skyvern workflow create --definition @checkout-workflow.yaml
skyvern workflow run --id wpid_123 --wait
skyvern workflow status --run-id wr_789
```

Each navigation block runs with visual reasoning + verification. Split complex flows into
multiple blocks (one per page/step). First run uses AI; subsequent runs replay cached scripts.

### Repeated/production

```bash
skyvern workflow create --definition @workflow.yaml
skyvern workflow run --id wpid_123 --params '{"email":"user@co.com"}'
skyvern workflow status --run-id wr_789
```

Split into one block per step. Use **navigation** blocks for actions, **extraction** for data.
First run uses AI; subsequent runs replay a cached script (10-100x faster).
Set `--run-with agent` to force AI mode for debugging.

## Step 5: Verify

Always verify after page-changing actions:

```bash
skyvern browser screenshot                          # visual check
skyvern browser validate --prompt "Was the form submitted successfully?"  # boolean assertion
skyvern browser evaluate --expression "document.title"                    # JS state check
```

## Step 6: Error Recovery

| Problem | Fix |
|---------|-----|
| Action clicked wrong element | Add context to prompt. Use hybrid mode (selector + intent). |
| Extraction returns empty | Wait for content. Relax required fields. Check row count first. |
| Login passes but next step fails | Ensure same session. Add post-login validate check. |
| Element not found | Add wait: `skyvern browser wait --selector "#el" --state visible` |
| Overloaded prompt | Split into smaller goals -- one intent per command. |

## Credentials

NEVER type passwords through `skyvern browser type` or `act`. Always use stored credentials:

```bash
skyvern credentials add --name "my-login" --type password --username "user@co.com"
skyvern credential list                          # find the credential ID
skyvern browser login --url "https://login.example.com" --credential-id cred_123
```

Types: `password`, `credit_card`, `secret`. Also supports bitwarden, 1password, and azure_vault providers.

## Workflow Quick Reference

```bash
skyvern workflow create --definition @workflow.yaml   # create
skyvern workflow run --id wpid_123 --wait             # run and wait
skyvern workflow status --run-id wr_789               # check status
skyvern workflow list --search "invoice"              # find workflows
skyvern block schema --type navigation                # discover block types
skyvern block validate --block-json @block.json       # validate before creating
```

Engine: known path = 1.0 (default). Dynamic planning = 2.0. Split into multiple 1.0 blocks when in doubt.
Status lifecycle: `created -> queued -> running -> completed | failed | canceled | terminated | timed_out`

## Common Patterns

**Login flow:**
```bash
skyvern credential list                          # find credential ID
skyvern browser session create
skyvern browser navigate --url "https://login.example.com"
skyvern browser login --url "https://login.example.com" --credential-id cred_123
skyvern browser validate --prompt "Is the user logged in?"
skyvern browser screenshot
```

**Pagination loop:**
```bash
skyvern browser extract --prompt "Extract all rows"
skyvern browser validate --prompt "Is there a Next button that is not disabled?"
# If true:
skyvern browser act --prompt "Click the Next page button"
# Repeat extraction. Stop when: no next button, duplicate first row, or max page limit.
```

**Debugging:**
```bash
skyvern browser screenshot                       # visual state
skyvern browser evaluate --expression "document.title"
skyvern browser evaluate --expression "document.querySelectorAll('table tr').length"
```

## Limitations

- Do not use Skyvern to bypass site access controls, rate limits, consent gates, or terms that prohibit automation.
- Browser automation can change remote state; confirm user intent before submitting forms, purchasing, deleting, or sending messages.
- Prefer deterministic selectors for stable production flows; AI actions can misread unlabeled or visually ambiguous controls.
- Store credentials only in the supported credential vaults and never type passwords directly through `type` or `act`.

## Agent Mode

All commands accept `--json` for structured output. Set `SKYVERN_NON_INTERACTIVE=1` to prevent prompts.
Use `skyvern capabilities --json` for full command discovery. See [references/agent-mode.md](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/agent-mode.md).

## Deep-Dive References

| Reference | Content |
|-----------|---------|
| [`references/prompt-writing.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/prompt-writing.md) | Prompt templates and anti-patterns |
| [`references/engines.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/engines.md) | When to use tasks vs workflows |
| [`references/schemas.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/schemas.md) | JSON schema patterns for extraction |
| [`references/pagination.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/pagination.md) | Pagination strategy and guardrails |
| [`references/block-types.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/block-types.md) | Workflow block type details with examples |
| [`references/parameters.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/parameters.md) | Parameter design and variable usage |
| [`references/ai-actions.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/ai-actions.md) | AI action patterns and examples |
| [`references/precision-actions.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/precision-actions.md) | Intent-only, selector-only, hybrid modes |
| [`references/credentials.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/credentials.md) | Credential naming, lifecycle, safety |
| [`references/sessions.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/sessions.md) | Session reuse and freshness decisions |
| [`references/common-failures.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/common-failures.md) | Failure pattern catalog with fixes |
| [`references/screenshots.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/screenshots.md) | Screenshot-led debugging workflow |
| [`references/status-lifecycle.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/status-lifecycle.md) | Run status states and guidance |
| [`references/rerun-playbook.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/rerun-playbook.md) | Rerun procedures and comparison |
| [`references/complex-inputs.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/complex-inputs.md) | Date pickers, uploads, dropdowns |
| [`references/tool-map.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/tool-map.md) | Complete tool inventory by outcome |
| [`references/cli-parity.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/cli-parity.md) | CLI/MCP mapping and agent-aware features |
| [`references/quick-start-patterns.md`](https://github.com/Skyvern-AI/skyvern/blob/main/skyvern/cli/skills/skyvern/references/quick-start-patterns.md) | Quick start examples, common patterns, and workflow templates |
