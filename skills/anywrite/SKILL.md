---
name: anywrite
description: "Compiled CLI covering all 52 endpoints of the Anytype local API — objects, properties, tags, search, chat, files — one binary, no MCP server needed."
category: productivity
risk: critical
source: community
source_repo: Antheurus/anywrite
source_type: community
date_added: "2026-07-15"
author: Antheurus
tags: [anytype, cli, pkm, notes, api-integration, productivity, knowledge-management]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/Antheurus/anywrite/blob/main/LICENSE"
---

# anywrite

## Overview

`anywrite` is a single compiled Bun/TypeScript CLI for the [Anytype](https://anytype.io) desktop app's local HTTP API — **all 52 endpoints** across spaces, objects, properties, tags, types, templates, lists, chat, files, members, search, and auth — as one binary with zero runtime dependencies. It exists as a low-context alternative to Anytype's official MCP server: rather than exposing 52 always-loaded tools to every agent session, `anywrite` is a normal CLI wired as a skill that costs zero context until it's actually invoked, and is equally usable from a terminal or any script.

## When to Use This Skill

- Use when the user mentions Anytype or asks to create, update, search, or organize notes, tasks, or PKM objects.
- Use when working with Anytype spaces, properties, tags, types, templates, or lists (sets and collections).
- Use when the user asks to upload files to a space, chat inside a space, or read/write structured objects programmatically.

## How It Works

### Step 1: Ensure Anytype desktop is running and authenticated

The Anytype desktop app must be running locally (default `http://localhost:31009`). Authenticate once:

```bash
./dist/anywrite auth --status        # shows configured yes/no and where the key came from
./dist/anywrite auth                 # challenge flow — a 4-digit code appears in the app
./dist/anywrite auth --code 1234     # non-interactive form of the same exchange
```

The key is written to `~/.anywrite/config.json` and is never printed by any command.

### Step 2: Invoke a resource + action

```
anywrite <resource> <action> [positionals] [--flag value]
```

Resources: `spaces`, `objects`, `properties`, `tags`, `types`, `templates`, `lists`, `files`, `members`, `search`, `chat`, `auth`. Output is JSON by default; add `--pretty` for a human view, `--json` as an escape hatch for anything the typed flags don't model yet. `space`/`type`/`property` positionals accept a name or an id — names are resolved to ids automatically.

## Examples

### Example 1: Create and update an object

```bash
./dist/anywrite objects create <space> --type task --name "Buy milk"
./dist/anywrite objects update <space> <object_id> --status "Done"
```

### Example 2: Search and upload a file

```bash
./dist/anywrite search global --query "task" --types task
./dist/anywrite files upload <space> --file ./image.png
```

### Example 3: Read chat messages

```bash
./dist/anywrite chat messages <space> <chat_id> --all
```

## Best Practices

- ✅ Pass names for `space`/`type`/`property` and let the CLI resolve them to ids.
- ✅ Use default JSON output for scripting and `--pretty` for human review.
- ✅ Reach for `--json` when a brand-new API field isn't yet covered by a typed flag.
- ❌ Don't set an empty-string emoji `--icon`; omit the flag entirely instead.
- ❌ Don't expect `lists add`/`remove` to work on sets — they only apply to collections.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Bounded by the Anytype local API itself: no block-level editing (body is whole-markdown replace only), no member invite/role management, no template create/update/delete, no space deletion.
- The object body field is named `--body` on create but `--markdown` on update.

## Security & Safety Notes

- The API key is stored locally in `~/.anywrite/config.json` and is never printed by any command, including `auth --status`.
- Config precedence at runtime: `ANYTYPE_API_KEY` env var, then `~/.anywrite/config.json`, then a read-only fallback to an existing `~/.anytype-cli/config.yaml`.
- All operations target a locally-running Anytype desktop instance; no data is sent to third-party servers.
- Delete is a soft archive everywhere and is idempotent — a repeated delete stays `200`, never `410`.

## Common Pitfalls

- **Problem:** `lists add`/`remove` silently does nothing on a set.
  **Solution:** These only work on collections, not sets.
- **Problem:** Re-uploading an identical file returns an existing object id instead of a new one.
  **Solution:** This is intentional — file upload dedupes by content hash.
- **Problem:** Chat messages don't paginate like everything else.
  **Solution:** Chat paginates by cursor; every other resource paginates by offset.

## Related Skills

- `@docx` - When the deliverable is a Word document rather than an Anytype object.
