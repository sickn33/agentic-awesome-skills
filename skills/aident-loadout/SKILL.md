---
name: aident-loadout
description: "Run multi-step work across apps the user connected in Aident Loadout: live action schemas, connection checks, cost preflight, and approval before side effects."
category: api-integration
risk: critical
source: "https://github.com/Aident-AI/aident-skill/tree/main/aident-loadout/skills/aident-loadout"
source_repo: Aident-AI/aident-skill
source_type: official
date_added: "2026-10-16"
author: Aident-AI
tags: [mcp, integrations, oauth, vault, audit, agent-tools]
tools: [claude-code, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Aident-AI/aident-skill/blob/main/LICENSE"
---

# Aident Loadout

Aident Loadout (https://aident.ai) is a capability layer for AI agents. The user
connects apps once (OAuth in the browser, API keys kept in Aident Vault), and
any MCP client can search those apps' actions by intent, read the live schema,
check cost, and run the action. Every run is recorded in Audit. The tools come
from the hosted `aident` MCP server.

## When to Use

- Use when the user asks you to look something up in, or do something with, a service they connected through Aident Loadout (for example Gmail, Slack, GitHub, Linear, Notion or Google Sheets).
- Use when the user wants to know which Aident action can do a task, what it will cost, or whether an account is connected.
- Use when the user needs a reusable multi-step procedure from Aident's 400+ Skills (research, outreach, content, operations).
- Do not use it for questions you can answer from the current conversation, or for services the user has not connected.

## Connect once

If the `aident` tools are missing, tell the user:

- Claude Code: `claude mcp add --transport http aident https://loadout.aident.ai/mcp`, then sign in with OAuth in the browser on first use.
- Other MCP clients: add a Streamable HTTP server at `https://loadout.aident.ai/mcp` and sign in with OAuth.
- Docs: https://docs.aident.ai/loadout/overview

Never ask for credentials, API keys, MFA codes or other secrets in chat.

## Workflow

1. Identify the concrete outcome and the services involved.
2. If the exact canonical action name is unknown, call `capabilities_search` with a short description of the operation.
3. Call `capabilities_get` before the first use of an action to read its current input schema, side effects, account requirements and approval behavior.
4. Use `vault` to check connection status. If a connection is missing, give the user the returned Aident-hosted connection URL.
5. Call `capabilities_preflight` before a metered or dynamically priced action, and explain the returned cost or approval requirement before going on.
6. Before a side-effecting action, state the target, the effect and the important inputs. Get any acknowledgement the action requires and keep the exact acknowledged request.
7. Call `capabilities_execute` with the exact canonical action name and schema-valid input. Report the result without exposing internal identifiers or private provider data the user did not ask for.

Use `skills_search` and `skills_read` when the user needs domain guidance or a multi-step procedure rather than a single known action.

## Examples

```text
User: Find the open Linear issues assigned to me and post a summary in #standup on Slack.

1. capabilities_search "list Linear issues assigned to me" and "post Slack message"
2. capabilities_get on both actions to read their schemas
3. vault: confirm Linear and Slack are connected (if not, share the connection URL and stop)
4. capabilities_execute the Linear read, then draft the summary
5. Show the exact Slack message and channel, wait for the user's yes
6. capabilities_execute the Slack post and report the result
```

```text
User: How much would it cost to scrape these 20 pages?

1. capabilities_search "scrape a web page"
2. capabilities_preflight with the 20 URLs
3. Report the returned cost and ask before running anything
```

## Rules

- Treat connection, acknowledgement and credit-approval requirements as hard gates.
- Do not send, publish, delete, disconnect or change external data unless the user asked for that effect and any required acknowledgement is satisfied.
- Do not use Aident Loadout to buy subscriptions, credits, tokens or other digital goods.
- Keep provider access inside the user's authorized accounts and the requested task.
- Do not claim an action succeeded until its terminal result confirms success.

## Limitations

- Requires an Aident account and the `aident` MCP server connected; actions only reach apps the user has connected or built-in Aident services.
- Built-in and metered services draw from the user's Aident balance; costs come from `capabilities_preflight` and can change.
- Action schemas change over time, so always read the live schema with `capabilities_get` instead of reusing remembered inputs.
- The hosted service is closed source; this skill file is MIT-licensed.
