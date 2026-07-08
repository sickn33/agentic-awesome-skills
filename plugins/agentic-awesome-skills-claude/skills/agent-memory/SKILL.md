---
name: agent-memory
description: A hybrid memory system that provides persistent, searchable knowledge management for AI agents.
risk: unknown
source: https://github.com/webzler/agentMemory/tree/main/
source_repo: webzler/agentMemory
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/webzler/agentMemory/blob/main/LICENSE
---

# agentMemory Skill
## When to Use

Use this skill when you need a hybrid memory system that provides persistent, searchable knowledge management for AI agents.


This skill extends your capabilities by providing a persistent, searchable memory bank that automatically syncs with project documentation.

## Prerequisites

- Node.js installed
- Check if `agentMemory` is already installed in the project:
  ```bash
  ls -la .agentMemory
  ```

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build the Project**:
   ```bash
   npm run compile
   ```

3. **Start the Memory Server**:
   You need to run the MCP server to interact with the memory bank.
   ```bash
   npm run start-server <project_id> <absolute_path_to_workspace>
   ```
   *Note: This skill typically runs as a background process or via an mcp-server configuration. ensuring it is running is key.*

## Capabilities (MCP Tools)

Once the server is running, you can use these tools:

### `memory_search`
Search for memories by query, type, or tags.
- **Args**: `query` (string), `type?` (string), `tags?` (string[])
- **Usage**: "Find all authentication patterns" -> `memory_search({ query: "authentication", type: "pattern" })`

### `memory_write`
Record new knowledge or decisions.
- **Args**: `key` (string), `type` (string), `content` (string), `tags?` (string[])
- **Usage**: "Save this architecture decision" -> `memory_write({ key: "auth-v1", type: "decision", content: "..." })`

### `memory_read`
Retrieve specific memory content by key.
- **Args**: `key` (string)
- **Usage**: "Get the auth design" -> `memory_read({ key: "auth-v1" })`

### `memory_stats`
View analytics on memory usage.
- **Usage**: "Show memory statistics" -> `memory_stats({})`

## Workflow

1. **Initialization**: The first time you run this in a project, it may attempt to import existing markdown memory banks from `.kilocode/`, `.clinerules/`, or `.roo/`.
2. **Development Loop**:
   - **Before Task**: Search memory for relevant context.
   - **During Task**: Use read/search to answer questions.
   - **After Task**: Write new findings to memory.
3. **Sync**: Your writes are automatically synced to standard markdown files in the project.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
