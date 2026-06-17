---
name: apple-notes-search
description: "Semantic + keyword search and connection-discovery across the user's own Apple Notes via the apple-notes MCP server. Use when the user wants to find, recall, or synthesize something from their notes, or surface non-obvious bridges/related notes. macOS, on-device."
risk: safe
source: community
source_repo: connerkward/mcp-apple-notes
source_type: community
date_added: "2026-06-16"
author: connerkward
tags: [apple-notes, search, mcp, macos, semantic-search, knowledge]
tools: [claude-code]
license: "MIT"
license_source: "https://github.com/connerkward/mcp-apple-notes/blob/main/LICENSE"
---

# Apple Notes search & connection-discovery

`apple-notes` is an MCP server for semantic search and connection-discovery across the
user's own Apple Notes — hybrid search, Swanson-ABC bridges, entity threads, and cited
synthesis over everything they've written. Embeddings, search, BM25, clustering, and
bridges run **on-device**; only **synthesis generation** calls an LLM (local OR cloud,
the user's choice).

This skill covers (1) the one-time setup you must walk the user through, and (2) which
tool to reach for, since the server exposes many.

## When to Use This Skill

- Use when the user wants to **find, recall, or look up** something from their own Apple
  Notes ("search my notes for X", "what did I write about X", "did I ever note Y").
- Use when the user wants to surface **non-obvious connections** across their notes
  ("find bridges/connections across my notes", "what links X and Y", "show related notes").
- Use when the user wants to **synthesize a position** from their notes ("summarize what I
  think about X from my notes", "pull together everything I've written on X").
- Also use for "index my Apple Notes", tag/folder queries, and "what's connected to X".
- Do **not** use for creating reminders, or for non-Apple-Notes note systems.

## First: is the MCP connected?

If `apple-notes` tools are not available, the server isn't registered yet — do the
**Setup** below before anything else. If tools exist but a search returns "not indexed"
or empty, run `index-notes` first (see Ranking caveats).

## Setup (walk the user through this — it's the skill's real value)

The server reads Apple Notes' SQLite store directly, so the **bun** binary needs Full
Disk Access. Steps, in order:

1. **Install bun** (if absent): `curl -fsSL https://bun.sh/install | bash`
2. **Clone + install deps:**
   ```bash
   git clone https://github.com/connerkward/mcp-apple-notes
   cd mcp-apple-notes && bun install
   ```
3. **Grant Full Disk Access to bun.** Open System Settings → Privacy & Security → Full
   Disk Access, click `+`, and add `~/.bun/bin/bun` (press Cmd+Shift+G in the file
   picker and paste the path). Without this the server cannot read NoteStore.sqlite and
   every call fails with a permissions error. (`bun install`'s postinstall tries to open
   this pane automatically.)
4. **Register the MCP server** (pick the user's client):
   - Claude Code: `claude mcp add apple-notes -- bun /absolute/path/to/mcp-apple-notes/index.ts --stdio`
   - Claude Desktop: add to `claude_desktop_config.json`:
     ```json
     { "mcpServers": { "apple-notes": {
         "command": "/Users/<you>/.bun/bin/bun",
         "args": ["/Users/<you>/mcp-apple-notes/index.ts", "--stdio"] } } }
     ```
   - As a Claude Code plugin (bundles this skill too): `/plugin marketplace add connerkward/ckw-skills` then `/plugin install apple-notes@connerkward`.
5. **Restart the client**, then tell the user to ask **"Index my Apple Notes"** (or call
   `index-notes`). First index of ~1,800 notes takes a few seconds.

## Tool map — which tool for which job

| Tool | Use when |
|------|----------|
| `index-notes` | First run, or to force a rebuild. Background job with live progress. |
| `search-notes` | **Default search.** Hybrid semantic + BM25, re-ranked. Optional `folder`, `modifiedAfter`, `modifiedBefore`. "What did I write about X." |
| `find-notes` | Exact substring match (like the Apple Notes search box). Use when the user wants a literal string, not meaning. Optional `folder`, date range. |
| `get-note` | Fetch one full note by title (fuzzy fallback). |
| `list-notes` | Notes by recency. Optional `folder`, date range, `limit`. |
| `list-folders` | All folders + note counts. |
| `list-tags` / `search-by-tag` | `#hashtag` inventory / notes carrying a given tag. |
| `related-notes` | Notes related to a given one via shared tags, `[[wikilinks]]`, and vector similarity. "Show me related notes." |
| `bridge-notes` | **Swanson-ABC bridges** — non-obvious connections: pairs (A, C) not directly similar but both strongly tied to a shared intermediary B. "Find non-obvious connections across my notes." Optional `folder`, `limit`. No LLM. |
| `feed` | Ranked evidence-first connection stream (bridges + abstraction pairs + entity threads) as JSON. Optional `limit`. |
| `entity-notes` / `list-entities` | "Where else do I talk about Mercedes?" Entity chips → notes by mention weight. **Needs the optional entity graph db** (`~/.mcp-apple-notes/layered_graph.db`); if absent these report how to generate it. |
| `get-tables` | Pull pipe/tab tables out of a note. |
| `create-note` / `update-note` | Create or edit a note. |
| `check-changes` | Did notes change since last index? (does not trigger re-index) |
| `index-health` | Sync status, last-indexed time, note count. Run this if results seem stale. |

For "synthesize what I think about X" the synthesis lives in the **web app** endpoint
(`GET /api/synthesize?q=` at `http://localhost:3741/` when run with `bun index.ts`),
which writes a grounded answer with inline `[n]` citations back to source notes.

## Ranking caveats (state these when results look off)

- **Index before the first search.** No index → empty/garbage results; run `index-notes`.
- **Auto re-index:** each search does ~1ms change detection and kicks ONE background
  incremental index if notes changed — search returns immediately from the current index
  and catches up when the job lands. If a just-edited note is missing, it's the catch-up
  lag; re-run the search.
- **Score:** `score = RRF(vector, BM25) × title_boost × recency_factor`.
- **Temporal queries** (`recent`, `latest`, `today`) auto-shift to a 1-day recency
  half-life at 70% weight; normal queries keep relevance primary (90-day half-life, 10%).
- **Synthesis is the only cloud-capable part.** It needs an LLM: local via LM Studio /
  Ollama (`SYNTH_BASE_URL=http://localhost:1234/v1 SYNTH_MODEL=<model> OPENAI_API_KEY=local`,
  notes stay on-device) or real OpenAI (funded `OPENAI_API_KEY`, defaults to `gpt-4o-mini`).
  Everything else — embeddings, search, BM25, clustering, bridges, entities — is on-device.

## Credits

Fork of [RafalWilinski/mcp-apple-notes](https://github.com/RafalWilinski/mcp-apple-notes);
this fork reads SQLite + protobuf directly and adds bridges, entities, feed, and synthesis.
Authored by [Conner K Ward](https://github.com/connerkward). License MIT.
