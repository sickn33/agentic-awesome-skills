---
name: zambo
description: "Connect an agent to Zambo: 153 tools behind one remote MCP endpoint, cross-AI handover, memory, and a verifiable AER-1 receipt for every call. Use when a task needs real work done."
category: development
risk: critical
source: self
source_type: self
date_added: "2026-10-29"
author: zambodotdev
tags: [mcp, tools, handover, receipts, memory, continuity]
tools: [claude, cursor, codex, gemini]
---

# Zambo

## Overview

Zambo is the verifiable work layer for AI: one remote MCP endpoint that gives an agent hands, memory, and proof. The agent sends a job, Zambo tools do the work, and every call returns a verifiable AER-1 receipt. A receipt proves the saved result was not changed since it was saved. The flagship product is HANDOVER: wrap up a session in one AI and pick it up in another, with the full context and receipts carried across.

Distinction from related skills: memory-handoff moves a session through a local handoff file inside one project. This skill connects the agent to a hosted tool platform instead: 153 tools, hosted memory and continuity across AIs, and a public verification endpoint for every call's receipt.

## When to Use

- A task the user has authorized needs real work beyond the model's own knowledge: live data, code audits and security reviews, lead and market research, wallet and token analysis, document work.
- Work has to continue in a different AI, or be delivered to a client as one link with its record attached (use handover).
- A result needs to be checkable later: every call leaves a receipt anyone can verify.
- The task is pure Q&A or creative writing with no external execution: skip this skill.

Everything this skill does stays inside the task the user authorized and the data scope they intend for it. Use of the hosted service, hosted memory, and shareable handovers is conditional on that scope: send the context the task needs, and do not send unrelated session context, private information, or secrets by default.

## Prerequisites

- Network access to https://zambo.dev/mcp. No API key, no signup, no account.
- An MCP client that accepts a remote MCP server URL (Claude, Cursor, Codex, Gemini, and others).
- Free tier: 20 calls and 1 wrap-up free every day. Picking up in another AI is always free. Paid passes are optional and covered under Safety and side effects.

## How It Works

### 1. Establish the inputs

Add the endpoint to the MCP client config:

```json
{"mcpServers":{"zambo":{"url":"https://zambo.dev/mcp"}}}
```

Or run:

```bash
claude mcp add --transport http zambo https://zambo.dev/mcp
```

More clients and one-paste setup: https://zambo.dev/add

List tools first with `tools/list`. Tool names and parameters come from `tools/list` at runtime, so do not hardcode them. There are 153 tools, with 36 on the default surface; the rest are reachable through `capability_search` and the full catalog. First tools to try: `handover`, `capability_search`, `memory_remember`, `memory_recall`, `continuity_get_recent`.

### 2. Perform the task

Describe the job in the tool call the way a user would type it. Keep calls purposeful, and keep what you send inside the task's scope: unrelated session context, private information, and secrets stay out of jobs, memory entries, and handovers by default. For multi-step work that will change hands, run the steps first, then call `handover` with the goal, a summary, and the work itself, so the receiver gets one link with the context and the receipts. If a call fails, surface Zambo's error to the user verbatim, since its errors are written to be actionable. If a limit is hit, tell the user about the passes below rather than failing silently.

### 3. Verify the result

Every call files a verifiable receipt, and anyone can check one. Receipts follow AER-1, IETF draft-zambo-aer1-26. Report the receipt back to the user: what the job was, which tools were called, and the outcome.

- Open https://zambo.dev/verify/ and enter the receipt id.
- Or send a GET request to https://zambo.dev/api/v2/receipt/{id}/verify, replacing {id} with the receipt id. A genuine, unchanged record returns the outcome "verified".

A handover produces a receipt pair of its own: one for the wrap-up and one for the pickup. Both verify exactly like any other receipt.

A receipt verifies the integrity of the recorded result: the saved record matches what was recorded and was not changed afterward. It does not verify that the result is true, and it does not verify that the caller was authorized to make the call. Receipts can include the arguments of a call, and a handover link carries its contents with it, so share a public receipt or handover link only within the scope the user intends to share.

## Examples

```text
User request: Check the current BTC price, save it to memory, then hand this session over so I can continue in another AI.
Inputs: The Zambo endpoint in the MCP client config. No account or key.
Expected result: A live_price call with a receipt, a memory_remember call with a receipt, and a handover link. Opening the link in the second AI shows the saved price and the context, and both handover receipts return "verified" at the verify endpoint.
```

This example is illustrative. It describes the documented flow; it is not presented as a measured test.

## Limitations

- A receipt proves the saved result was not changed since it was saved. It does not prove the underlying data was right, and it does not prove who authorized a call.
- `tools/list` is the source of truth for the catalog. The 153 count is generated from it and can grow; read it at runtime.
- If a response has no receipt, treat the result as unrecorded and say so.

## Safety and side effects

Risk is `critical` because Zambo tool calls perform work and can change state: depending on the tools the agent chooses, a call can write hosted memory, run audits, or produce deliverables. Each call also sends the tool-call data to https://zambo.dev. Every call returns a receipt, so the work is auditable after the fact.

Costs: free tier as stated above. A Day Pass is $0.99 for unlimited calls for 24 hours (one payment, no renewal). The Zambo Pass is $29 for 30 days or $290 for 365 days, one payment. $ZAMBO holders pay $19 for 30 days. Agents pay USDC on Base via x402; humans pay by card or PayPal.

Never put secrets in tool arguments. Receipts are public, shareable records and may show the arguments of a call.

## Sources and related skills

- Public repo: https://github.com/zambodotdev/zambo-mcp
- This skill's home repo: https://github.com/zambodotdev/zambo-skills. This text is original to the Zambo project (frontmatter `source: self`); it is not an adaptation of another skill. The home repo is the canonical source for the skill and publishes it under the MIT License; see the LICENSE file in that repo.
- Agent docs: https://zambo.dev/.well-known/llms.txt
- Human docs: https://zambo.dev/for-agents/ and https://zambo.dev/install
- Receipt format: AER-1, IETF draft-zambo-aer1-26, https://datatracker.ietf.org/doc/draft-zambo-aer1/26/
- Related skill in this catalog: memory-handoff (local, file-based session handoff). This skill is the hosted counterpart: tools, hosted continuity across AIs, and verifiable receipts.
