---
name: omentir-linkedin-outreach
description: "Run LinkedIn prospecting and outreach through the Omentir MCP server: find people, score fit, draft messages, and check campaigns. Never signs into LinkedIn."
category: marketing
risk: critical
source: https://github.com/vanshyadav1408/Omentir/tree/main/plugins/omentir/skills/linkedin-outreach
source_repo: vanshyadav1408/Omentir
source_type: official
date_added: "2026-09-28"
author: vanshyadav1408
tags: [linkedin, sales, outreach, lead-generation, prospecting, mcp]
tools: [claude, cursor, codex]
license: MIT
license_source: https://github.com/vanshyadav1408/Omentir/blob/main/LICENSE
---

# LinkedIn outreach through Omentir

Omentir already holds the user's LinkedIn connection and daily send limits. Talk to that workspace over MCP. Do not open LinkedIn in the Bot browser. Do not ask the user to take over for a LinkedIn password, passkey, two-factor code, or CAPTCHA.

> Imported from the official Omentir `linkedin-outreach` skill ([source](https://github.com/vanshyadav1408/Omentir/blob/main/plugins/omentir/skills/linkedin-outreach/SKILL.md), MIT). The opening paragraph and the First calls, Finding people, Sending, and Grok Bot sections are the upstream text, unchanged. Overview, When to Use This Skill, Prerequisites, Examples, and Limitations were added for this catalog.

## Overview

Omentir is an open-source AI sales workspace for LinkedIn. This skill tells the agent how to use the Omentir MCP server to find and score prospects, draft messages, and check campaigns. It defaults to research and drafts only. It never sends unless the user asks, and it never signs into LinkedIn.

## When to Use This Skill

- Use when the user wants to find LinkedIn prospects that match their product, and the Omentir MCP server is connected.
- Use when the user wants fit scoring or first-message drafts for leads already in their Omentir workspace.
- Use when the user asks about the state of an Omentir campaign: agents, scheduled sends, replies, or stats.
- Do not use it to drive LinkedIn in a browser. This skill works only through Omentir MCP tools.

## Prerequisites

- An Omentir account with a LinkedIn account connected inside Omentir. The hosted service is Pro at $49/month; self-hosting is free under MIT.
- The Omentir MCP server connected in the host: `https://omentir.com/api/agent/v1/mcp` (streamable HTTP). Sign-in is OAuth 2.1. An API key from https://omentir.com/api-keys also works as `Authorization: Bearer <key>`.
- Installing this skill alone does not connect the server.

## First calls

1. `omentir_get_context`
2. `omentir_list_workspaces` if the user has more than one company, then `omentir_switch_workspace` after they pick
3. `omentir_get_product_profile`
4. `omentir_list_linkedin_accounts`
5. `omentir_list_agents`

If LinkedIn is not connected or Workspace is empty, stop and tell the user to finish that in Omentir. Do not guess ICP from a homepage.

## Finding people

- Classic finder: `omentir_create_agent` with a prompt plus titles, industries, locations, and keywords. `omentir_draft_agent_setup` fills those from Workspace. Show the config and wait for a yes before creating.
- Steal Customers: `mode: "steal_customers"` plus competitor or founder URLs. Workspace must already be set.
- Outreach only: `mode: "outreach"` plus `csvContents` or `omentir_import_csv_leads`. Pass `steps` for a custom sequence.
- After create, discovery can still be empty. Use `omentir_list_activity` before treating that as failure.
- Score from evidence on the lead. Rewrite a note that could fit two buyers.

## Sending

Default to research and drafts only. Do not send, enroll, or reply unless the user asks in this session.

If they do ask to send, Omentir's planner owns timing unless they ask to send now (`omentir_run_scheduled_action_now`). Read `omentir_list_scheduled_actions` for committed send times. Stay inside `omentir_get_context` remaining invite and message allowance. Stop one lead with `omentir_stop_lead_outreach`.

Replies go through `omentir_reply_to_lead` on a captured thread, or `omentir_reply_to_chat` on a live inbox chat (attachments allowed). List live chats with `omentir_list_inbox`.

## Grok Bot

Installed plugins are account-wide. Attach this plugin with `@omentir`. Keep this stop rule in the Bot description: research and draft only. Never send. Never enroll. Never sign into LinkedIn.

## Examples

### Connect the server in Claude Code

```bash
claude mcp add --transport http omentir https://omentir.com/api/agent/v1/mcp
```

### Research and drafts only

```text
User: Find heads of sales at seed-stage SaaS companies in Germany and draft a first message for the best five. Do not send anything.

Agent: calls omentir_get_context, omentir_get_product_profile,
omentir_list_linkedin_accounts, and omentir_list_agents; uses
omentir_draft_agent_setup to propose titles, industries, locations, and
keywords; shows that config and waits for a yes before omentir_create_agent;
checks omentir_list_activity while discovery runs; then scores leads from
omentir_list_leads / omentir_get_lead and returns five drafts without sending.
```

## Limitations

- Needs an Omentir workspace with LinkedIn already connected. The agent cannot create an Omentir account, change billing, connect LinkedIn, create or delete a workspace, or mint API keys.
- Sends are human-paced and capped by the daily invite and message allowance that `omentir_get_context` reports.
- Lead discovery is asynchronous, so a new agent can show no leads for a while.
- The agent never sees the user's LinkedIn password and does not open LinkedIn in a browser.
