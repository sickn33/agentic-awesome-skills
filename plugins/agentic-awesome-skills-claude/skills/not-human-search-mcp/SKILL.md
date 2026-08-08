---
name: not-human-search-mcp
description: "Search AI-ready websites, inspect indexed site details, verify MCP endpoints, and discover tools and APIs using the Not Human Search MCP server"
category: mcp
risk: safe
source: "https://nothumansearch.ai"
source_type: community
date_added: "2026-04-16"
author: unitedideas
tags: [mcp, search, ai-discovery, api-discovery, mcp-verification, agent-tools]
tools: [claude, cursor, gemini]
---

# Not Human Search MCP

## Overview

Not Human Search is a remote MCP server that lets AI agents search a curated index of 1,750+ AI-ready websites, inspect indexed site details, submit new sites for analysis, and verify live MCP endpoints via JSON-RPC probe. It is designed for AI agents that need to discover tools, APIs, and services at runtime without relying on hardcoded lists.

## When to Use This Skill

- Use when an AI agent needs to discover tools, APIs, or MCP servers for a specific task
- Use when you want to check whether a website exposes machine-readable endpoints (llms.txt, OpenAPI, MCP)
- Use when verifying that an MCP endpoint is actually responding to JSON-RPC
- Use when building agent workflows that need to find and connect to external services dynamically

## MCP Configuration

Add the Not Human Search MCP server to your client configuration. The endpoint uses streamable HTTP and requires no authentication.

### Claude Desktop / Cursor / Windsurf

```json
{
  "mcpServers": {
    "not-human-search": {
      "url": "https://nothumansearch.ai/mcp"
    }
  }
}
```

No API key or authentication is required.

## Available Tools

### `search_agents`

Search the index of 1,750+ AI-ready websites by keyword. Returns ranked results with scores, categories, and available endpoints.

```
search_agents({ query: "code review tools", limit: 10 })
```

### `get_site_details`

Check a specific domain's AI-readiness score and available machine-readable endpoints.

```
get_site_details({ domain: "linear.app" })
```

### `get_stats`

Get aggregate index statistics, including total indexed sites, categories, and endpoint coverage.

```
get_stats({})
```

### `submit_site`

Submit a URL for crawling and AI-readiness analysis.

```
submit_site({ url: "https://example.com" })
```

### `verify_mcp`

Verify whether a URL is a live MCP endpoint by sending a JSON-RPC probe and checking for a valid response.

```
verify_mcp({ url: "https://example.com/mcp" })
```

### `list_categories`

List available discovery categories for narrowing searches.

```
list_categories({})
```

### `get_top_sites`

Retrieve top-ranked indexed sites.

```
get_top_sites({ limit: 10 })
```

### `register_monitor`

Register a domain monitor using a user-provided email address.

```
register_monitor({ domain: "example.com", email: "user@example.com" })
```

## Examples

### Example 1: Discover Code Review Tools

```text
Use @not-human-search-mcp to find code review tools that expose MCP or API endpoints.
```

The agent will call `search_agents({ query: "code review", limit: 10 })` and return ranked results with scores and endpoint details.

### Example 2: Check if a Site is AI-Ready

```text
Use @not-human-search-mcp to check the AI-readiness of linear.app.
```

The agent will call `get_site_details({ domain: "linear.app" })` and return the site's score breakdown.

### Example 3: Verify an MCP Endpoint

```text
Use @not-human-search-mcp to verify that https://heliumtrades.com/mcp is a working MCP server.
```

The agent will call `verify_mcp({ url: "https://heliumtrades.com/mcp" })` and confirm whether it responds to JSON-RPC.

## Best Practices

- Use `search_agents` for broad discovery, then `get_site_details` for detailed analysis of specific indexed results
- Use `verify_mcp` to confirm an MCP endpoint is live before wiring it into an agent workflow
- Use `submit_site` when a relevant site is absent from the index and the user wants it analyzed
- Use `register_monitor` only with an email address the user explicitly provides for monitoring
- Combine with other MCP skills to build dynamic tool-discovery pipelines

## Limitations

- The search index covers 1,750+ sites and is updated regularly, but may not include every site on the internet.
- Scoring reflects machine-readable signals (llms.txt, OpenAPI, MCP, structured data) rather than content quality.
- `verify_mcp` sends a JSON-RPC probe to the target URL; only use it on URLs you expect to be MCP endpoints.
- `register_monitor` requires a user-provided email address and consent to receive monitoring notifications.

## Related Skills

- `@mcp-builder` - For building your own MCP servers
- `@ai-dev-jobs-mcp` - Search AI/ML job listings via MCP
