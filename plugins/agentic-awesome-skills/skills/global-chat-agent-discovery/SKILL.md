---
name: global-chat-agent-discovery
description: "Discover and search 18K+ MCP servers and AI agents across 6+ registries using Global Chat's cross-protocol directory and MCP server."
category: development
risk: safe
source: community
source_repo: pumanitro/global-chat
source_type: community
date_added: "2026-04-06"
author: pumanitro
tags: [mcp, ai-agents, agent-discovery, agents-txt, a2a, developer-tools]
tools: [claude, cursor, gemini, codex]
---

# Global Chat Agent Discovery

## Overview

Global Chat is a cross-protocol AI agent discovery platform that aggregates MCP servers and AI agents from 6+ registries into a single searchable directory. This skill helps you find the right MCP server, A2A agent, or agents.txt endpoint for any task by searching across 18,000+ indexed entries. It also provides an MCP server (`@global-chat/mcp-server`) for programmatic access to the directory from any MCP-compatible client.

## When to Use This Skill

- Use when you need to find an MCP server for a specific capability (e.g., database access, file conversion, API integration)
- Use when evaluating which agent registries carry tools for your use case
- Use when you want to search across multiple protocols (MCP, A2A, agents.txt) simultaneously
- Use when setting up agent-to-agent communication and need to discover available endpoints

## How It Works

### Option 1: Use the MCP Server (Recommended for Agents)

Install the Global Chat MCP server to search the directory programmatically from Claude Code, Cursor, or any MCP client.

```bash
npm install -g @global-chat/mcp-server
```

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "global-chat": {
      "command": "npx",
      "args": ["-y", "@global-chat/mcp-server"]
    }
  }
}
```

Then ask your agent to search for tools:

```
Search Global Chat for MCP servers that handle PostgreSQL database queries.
```

### Option 2: Use the Web Directory

Browse the full directory at [https://global-chat.io](https://global-chat.io):

1. Visit the search page and enter your query
2. Filter by protocol (MCP, A2A, agents.txt)
3. Filter by registry source
4. View server details, capabilities, and installation instructions

### Option 3: Validate Your agents.txt

If you maintain an `agents.txt` file, use the free validator:

1. Go to [https://global-chat.io/validate](https://global-chat.io/validate)
2. Enter your domain or paste your agents.txt content
3. Get instant feedback on format compliance and discoverability

## Examples

### Example 1: Find MCP Servers for a Task

```
You: "Find MCP servers that can convert PDF files to text"
Agent (via Global Chat MCP): Searching across 6 registries...
  - @anthropic/pdf-tools (mcpservers.org) — PDF parsing and text extraction
  - pdf-converter-mcp (mcp.so) — Convert PDF to text, markdown, or HTML
  - ...
```

### Example 2: Discover A2A Agents

```
You: "What A2A agents are available for code review?"
Agent (via Global Chat MCP): Found 12 A2A agents for code review across 3 registries...
```

### Example 3: Check Agent Protocol Coverage

```
You: "How many registries list tools for Kubernetes management?"
Agent (via Global Chat MCP): 4 registries carry Kubernetes-related agents (23 total entries)...
```

## Best Practices

- Use the MCP server for automated workflows and agent-to-agent discovery
- Use the web directory for manual exploration and comparison
- Validate your agents.txt before publishing to ensure maximum discoverability
- Check multiple registries — coverage varies significantly by domain

## Common Pitfalls

- **Problem:** Search returns too many results
  **Solution:** Add protocol or registry filters to narrow the scope

- **Problem:** MCP server not connecting
  **Solution:** Ensure `npx` is available and run `npx -y @global-chat/mcp-server` manually first to verify

## Related Skills

- `@mcp-client` - For general MCP client setup and configuration
- `@agent-orchestration-multi-agent-optimize` - For orchestrating multiple discovered agents
- `@agent-memory-mcp` - For persisting discovered agent information across sessions

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
