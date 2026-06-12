---
name: mcp-tool-developer
description: "Build Model Context Protocol (MCP) servers and tools from scratch. Full-stack MCP development with TypeScript/Python, testing, deployment, and registry publishing."
category: developer-tools
risk: safe
source: community
source_repo: demo112/yunqu-ai-skills
source_type: community
date_added: "2026-05-13"
author: yundu-ai
tags: [mcp, ai-agent, tool-development, typescript, python, llm, model-context-protocol]
tools: [claude, cursor, gemini]
---

# MCP Tool Developer

## Overview

Expert at building Model Context Protocol (MCP) servers that give AI agents new capabilities. Covers the full MCP development lifecycle: specification, implementation, testing, deployment, and registry publishing. Supports both TypeScript and Python with production-ready patterns.

This skill understands MCP specification primitives (tools, resources, prompts, sampling), transport options (stdio, SSE, Streamable HTTP), and the tool design patterns that make MCP servers reliable and composable.

## When to Use This Skill

- Use when building a new MCP server from scratch
- Use when wrapping an existing API as an MCP tool
- Use when debugging MCP server issues
- Use when designing the tool schema for an MCP server
- Use when publishing an MCP server to a registry

## How It Works

### Step 1: Define the MCP Server Scope

Identify what capabilities the server should expose:
- **Tools** - Functions the LLM can call (primary use case)
- **Resources** - Data the LLM can read (files, APIs, databases)
- **Prompts** - Reusable prompt templates

Choose the transport:
- **stdio** - For local CLI tools (Claude Code, Cursor)
- **SSE (Server-Sent Events)** - For remote/hosted tools
- **Streamable HTTP** - New in MCP spec for modern deployments

### Step 2: Design the Tool Schema

Define input/output schemas before writing implementation:

```typescript
{
  name: "tool_name",
  description: "What this tool does (visible to the LLM)",
  inputSchema: {
    type: "object",
    properties: { ... },
    required: [ ... ]
  }
}
```

### Step 3: Implement the Server

Create the server with proper error handling, validation, and logging. Use the official MCP SDK for TypeScript (@modelcontextprotocol/sdk) or Python (mcp).

### Step 4: Test and Deploy

Test with the MCP Inspector, validate tool schemas, handle edge cases, then deploy locally or remotely.

## Examples

### Example 1: TypeScript MCP Server

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-tools", version: "1.0.0" });

server.tool("greet", "Greet someone by name",
  { name: z.string().describe("Person's name") },
  async ({ name }) => ({ content: [{ type: "text", text: `Hello, ${name}!` }] })
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Example 2: API Wrapper Pattern

Wrap an external API as an MCP tool with auth, rate limiting, and error handling:
- Map API endpoints to tools
- Handle auth via environment variables
- Transform API responses to LLM-friendly format
- Add retry logic with exponential backoff

## Best Practices

- Build small, focused tools that can be chained rather than monolithic tools
- Return structured errors, not crashes - tools should fail gracefully
- Define schemas before implementation
- Include descriptions that help the LLM understand when and how to use each tool
- Validate all inputs against the schema
- Add rate limiting for external API calls
- Use environment variables for secrets, never hardcode credentials

## Limitations

- This skill provides guidance and code generation; actual runtime testing requires a development environment
- MCP specification is evolving; always check the latest spec version
- Security review is essential before deploying tools that handle sensitive data

## Security and Safety Notes

- Never hardcode API keys or credentials in tool implementations
- Use environment variables or secret managers for all authentication
- Validate and sanitize all inputs to prevent injection attacks
- Rate limit external API calls to prevent abuse
- Review tool permissions carefully - tools can access files, networks, and execute code

## Common Pitfalls

- **Problem:** LLM calls tools with wrong parameters
  **Solution:** Improve tool descriptions and add examples in the description field. The LLM reads descriptions to decide how to call tools.

- **Problem:** Tool times out on large inputs
  **Solution:** Add input size validation and pagination. Stream large responses instead of buffering.

## Related Skills

- `api-integration-architect` - For API design patterns used in MCP tools
- `security-audit-code-reviewer` - For reviewing MCP server code security
