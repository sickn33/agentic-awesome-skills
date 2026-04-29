---
name: buywhere-product-catalog
description: "Use BuyWhere's MCP and API surfaces to add product search, price comparison, and deal discovery to AI shopping agents."
category: ecommerce
risk: safe
source: official
source_repo: BuyWhere/buywhere-cursor-plugin
source_type: official
license: "Not declared"
license_source: "https://github.com/BuyWhere/buywhere-cursor-plugin"
date_added: "2026-04-29"
author: BuyWhere
tags: [buywhere, ecommerce, shopping, mcp, api, product-catalog]
tools: [claude, cursor, codex, gemini]
---

# BuyWhere Product Catalog

## Overview

BuyWhere gives AI agents a product-catalog surface for shopping flows, price comparison, and deal discovery. Use this skill when you want an agent to connect product search or merchant-aware commerce actions through BuyWhere's MCP setup path or API onboarding flow.

The safest public starting points are the live developer portal, API key signup flow, MCP guide, and the official Cursor plugin repository.

## When to Use This Skill

- Use when you want to add structured product search to an AI shopping or recommendation agent.
- Use when the user asks for BuyWhere MCP setup in Cursor, Claude Desktop, or a custom agent runtime.
- Use when you need a concrete onboarding path for BuyWhere API keys, MCP configuration, or plugin discovery.

## How It Works

### Step 1: Choose the integration surface

Start from the public BuyWhere entry point that matches the user's setup:

- Developer portal: `https://buywhere.ai/developers/`
- API key signup: `https://buywhere.ai/api-keys/`
- MCP integration guide: `https://api.buywhere.ai/docs/guides/mcp`
- Cursor plugin repo: `https://github.com/BuyWhere/buywhere-cursor-plugin`

### Step 2: Confirm the user's runtime

Ask which host the user is integrating with before giving setup instructions:

- Cursor or another MCP-capable coding assistant
- Claude Desktop
- A custom MCP client
- A direct REST API integration

Do not assume the same config file or launch command works across all hosts.

### Step 3: Guide the first successful connection

Prefer a minimal first-run path:

1. Get a BuyWhere API key.
2. Follow the MCP or plugin setup path for the host runtime.
3. Run one simple product-search request before expanding to comparison or deal workflows.

### Step 4: Expand into commerce workflows

Once the first query works, help the user branch into the next layer:

- product search and discovery
- price comparison across merchants
- deal discovery flows
- shopping-agent orchestration that routes users to merchant destinations

## Examples

### Example 1: Cursor plugin discovery

```text
Use BuyWhere Product Catalog to help me connect BuyWhere inside Cursor and verify one product-search query.
```

### Example 2: MCP onboarding

```text
Use BuyWhere Product Catalog to set up BuyWhere MCP for my shopping agent and keep the first test minimal.
```

## Best Practices

- ✅ Start from the live developer portal or API key flow before giving configuration details.
- ✅ Keep the first proof of integration to one successful query.
- ✅ Ask which MCP host or API runtime the user is using.
- ❌ Do not claim a specific product-count or retailer-count unless you have current runtime evidence.
- ❌ Do not send users to deprecated or broken documentation surfaces when a working public page exists.

## Limitations

- This skill does not replace environment-specific validation inside the target MCP host or API client.
- Public BuyWhere surfaces can change, so re-check live URLs when precise setup details matter.

## Security & Safety Notes

- Treat API keys as secrets. Use placeholders in examples and never paste live credentials into chat, docs, or screenshots.
- Confirm the user's target host before suggesting filesystem paths, launch commands, or local config edits.

## Common Pitfalls

- **Problem:** The user wants BuyWhere setup help but has not created an API key yet.
  **Solution:** Start at `https://buywhere.ai/api-keys/` and only move to config after that step is complete.

- **Problem:** A documentation hostname is unavailable.
  **Solution:** Prefer the live developer portal, API key flow, MCP guide on `api.buywhere.ai`, and the official GitHub plugin repo.

## Related Skills

- `@api-design-principles` - Use when the user needs API-shape guidance around a commerce integration.
- `@mcp-builder` - Use when the user is building or extending an MCP server rather than consuming one.
