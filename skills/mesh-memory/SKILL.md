---
name: mesh-memory
description: "Self-hosted semantic memory for AI agents via MCP. Save worklogs, decisions, and notes, then recall them across sessions by meaning, not keyword. Postgres + pgvector with auto-tagging."
risk: safe
source: dklymentiev/mesh-memory (MIT)
date_added: "2026-05-23"
---

# Mesh Memory

Mesh Memory is a self-hosted semantic memory service with a built-in MCP server. It stores documents (worklogs, decisions, notes, research) in PostgreSQL with pgvector and retrieves them by meaning, so a query like "what database did we pick?" surfaces a saved note that says "chose Redis for caching" even with zero keyword overlap. Embeddings are generated locally with `multilingual-e5-base` (768 dimensions); the core flow requires no external API keys.

Use this skill when an agent needs persistent memory across sessions: saving its own work, recalling prior decisions, or building a project knowledge base shared between multiple agents.

## When to Use This Skill

- Saving a session worklog, decision, or research note so a later session can find it.
- Recalling past work by topic when you do not remember the exact words you used.
- Sharing a long-lived knowledge base across multiple agents, terminals, or teammates.
- Organizing context by role or project through workspaces (one workspace per role/project).
- Looking up structured tags (e.g. all `type:decision` entries from one project).

## Prerequisites

- A running Mesh Memory instance reachable from the MCP server. Local Docker is the common path -- `docker compose up -d` in the upstream repo brings it up; see https://github.com/dklymentiev/mesh-memory for the full Quick Start.
- The MCP server (`mcp_server.py`) registered with your client (Claude Code, Cursor, Claude Desktop, or any other MCP-aware agent).
- `MESH_API_URL` pointing at the running instance (default: `http://localhost:8000`).

## Setup

Register the MCP server in your client configuration:

```json
{
  "mcpServers": {
    "mesh": {
      "command": "python3",
      "args": ["/path/to/mesh-memory/mcp_server.py"],
      "env": {
        "MESH_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

When the server is reachable, the 13 tools listed below become available.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `mesh_focus` | Switch the active workspace (optionally prefetch recent docs). |
| `mesh_add` | Save a document with optional tags. Auto-adds `date:YYYY-MM-DD` and `source:`. |
| `mesh_update` | Update content, tags, or pinned status of an existing document. |
| `mesh_delete` | Delete a document by GUID. |
| `mesh_get` | Fetch a single document by GUID. |
| `mesh_search` | Semantic search by query, optionally across multiple workspaces with weights. |
| `mesh_bytag` | List documents that match one or more tags (AND logic). |
| `mesh_recent` | List most recently created documents, optionally filtered by `type:` tag. |
| `mesh_projects` | List per-project document counts (uses `guid:` tag as project marker). |
| `mesh_tags` | List existing tags with counts; optional prefix filter. |
| `mesh_versions` | Show the version chain of a document (similarity-linked revisions). |
| `mesh_stats` | Memory statistics for the active workspace. |
| `mesh_schema` | Show the tag schema (recognized prefixes and types). |

## Workflows

### Save a session worklog

After completing work, persist it for future sessions:

```
mesh_add(
  content="Investigated 502s on the checkout flow. Root cause: missing CORS header on the cart API. Fix shipped in commit abc123.",
  tags="type:worklog,topic:checkout,date:2026-05-23",
  workspace="developer"
)
```

`date:` and `source:` are added automatically when omitted. Type and topic tags are inferred from nearest neighbors after the embedding completes (5-10 seed documents required before inference kicks in).

### Recall past work by meaning

Search across sessions for related context, even with different vocabulary:

```
mesh_search(query="checkout was failing for some users", limit=5, workspace="developer")
```

The query shares no keywords with the original note ("502s", "CORS"), but the embedding-based search surfaces it.

### Switch role / context

For a multi-role agent, switch the active workspace at the start of a session:

```
mesh_focus(workspace="sysadmin", prefetch=true, limit=5)
```

Subsequent calls default to that workspace. Pin a role-prompt document at the top of each workspace so the agent re-orients on every prefetch.

### Cross-workspace search with weights

To pull context from related domains without diluting the primary signal:

```
mesh_search(
  query="nginx rate limit recipe",
  workspaces={"sysadmin": 0.7, "security": 0.2, "developer": 0.1},
  limit=10
)
```

Results are merged across workspaces and re-scored by workspace weight.

### Structured lookups by tag

When you need an exact filter rather than semantic similarity:

```
mesh_bytag(tags="type:decision,status:active,guid:my-project", limit=20)
```

## Tag Conventions

Mesh accepts arbitrary tags. The recommended prefixes (used by auto-inference and surfaced by `mesh_schema`):

| Prefix | Meaning |
|--------|---------|
| `type:worklog` | Completed work; the most common type. |
| `type:note` | Quick notes, observations. |
| `type:decision` | Architecture or product decisions. |
| `type:research` | Investigation results, findings. |
| `type:task` | Action items. |
| `type:rfc` | Proposals for review. |
| `status:active` / `status:completed` / `status:archived` | Lifecycle. |
| `date:YYYY-MM-DD` | When the document was created (auto-added). |
| `source:` | How the document arrived (auto-added: `mcp`, `api`, etc.). |
| `guid:<project-id>` | Project marker -- use a consistent slug across all docs of a project. |

With fewer than ~5-10 documents in a workspace, neighbor inference is skipped; manually tag seed documents until the corpus self-organizes.

## Troubleshooting

**Tool calls fail with connection errors.** The MCP server cannot reach `MESH_API_URL`. Verify the instance is up (`curl $MESH_API_URL/health` returns `{"status":"healthy"}`) and the env var is set in the MCP config.

**A saved document does not appear in semantic search yet.** Embedding generation runs in the background. After a save, expect a 1-2 second delay before semantic search hits the new document. `mesh_get(guid=...)` confirms the document exists immediately.

**Search returns results from the wrong domain.** The active workspace is not what you expected. Call `mesh_focus(workspace="<name>")` explicitly, or pass `workspace=` on every call. With no focus and no explicit param, calls land in the `default` workspace.

**Auto-tagging never adds anything.** The workspace has too few documents for neighbor inference (~5-10 minimum). Manually tag a handful of seed documents, then auto-inference takes over.

**A deleted document still appears in a search result.** Embedding indices are eventually consistent; rerun the search after a few seconds, or use `mesh_get(guid=...)` to confirm deletion.

## Limitations

- Mesh is a knowledge store, not a chat memory. Long conversation transcripts should be summarized before being saved.
- Vector similarity is robust but not perfect; for high-precision structured lookups, prefer `mesh_bytag` over `mesh_search`.
- Embeddings run on CPU by default; very large corpora (hundreds of thousands of documents) benefit from a dedicated instance and pgvector tuning, not covered here.
- The optional AI categorizer requires an OpenAI-compatible LLM endpoint and is disabled by default.
