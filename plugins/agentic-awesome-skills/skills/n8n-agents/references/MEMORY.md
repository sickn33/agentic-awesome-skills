# Agent memory

Memory is a sub-node on the agent, wired via `ai_memory`. Without it, every invocation is stateless. With it, the agent holds a conversation across turns — and across executions, depending on type — keyed by whatever expression you bind to `sessionKey`.

Memory node availability shifts between n8n versions, so confirm what's installed with `search_nodes({ query: 'memory' })`.

---

## The two non-negotiables

1. **Plumb a stable key through.** Memory buckets by whatever you bind to `sessionKey`. The Chat Trigger fills `sessionId` automatically. For other triggers, derive a stable identifier (Slack `thread_ts`, a webhook conversation ID, a generated UUID, a multi-tenant composite) and forward it to memory and any session-keyed tools. Without consistency across the same conversation, memory never matches.
2. **Default to `memoryBufferWindow`.** It persists across executions via n8n's internal store, keyed on `sessionKey`, and is the right choice for nearly every chat agent. Reach for Postgres/Redis only when memory must be read **outside** the agent.

---

## The memory types

### `memoryBufferWindow` (the default)

In-context memory of the last N exchanges, persisted across executions via n8n's store.

```json
{
  "parameters": {
    "sessionIdType": "customKey",
    "sessionKey": "={{ $json.sessionId }}",
    "contextWindowLength": 50
  },
  "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
  "typeVersion": 1.3,
  "name": "Simple Memory"
}
```

`contextWindowLength` is the number of exchanges retained. **The default is 5 — very low** for modern chat expectations, where users assume a conversation feels close to endless. **50 is a reasonable starting point.** Higher = more context but more tokens per turn.

**Messages past the window are removed entirely.** Once the buffer fills, the oldest exchanges are dropped and the agent can't recall, search, or even know they existed. If a user said something 60 turns ago and the window is 50, that's gone from the agent's perspective. For recall beyond the window, raise `contextWindowLength`, or persist key facts in a Data Table that's read and injected into the system prompt.

The "window" is a sliding cap on how many messages stay in context — **not** a scope on persistence. With `sessionIdType: 'customKey'` you bind the key to any expression (`{{ $json.sessionId }}`, a Slack `thread_ts`, a multi-tenant composite). Each user/thread/context gets its own bucket.

### `memoryPostgresChat` / `memoryRedisChat`

Reach for these only when memory must be queried or read **outside** the agent: displaying conversation history in your own UI, analytics on past chats, sharing memory across systems, or migrating instances cleanly.

```json
{
  "parameters": {
    "sessionIdType": "customKey",
    "sessionKey": "={{ $json.sessionId }}"
  },
  "type": "@n8n/n8n-nodes-langchain.memoryPostgresChat",
  "typeVersion": 1.3,
  "name": "Postgres Memory"
}
```

**Wrong for** the default chat case — `memoryBufferWindow` already survives across executions and is the cleaner pick.

---

## Custom patterns (Chat Memory Manager)

Most agents don't need this. But when a fixed window isn't enough, the `@n8n/n8n-nodes-langchain.memoryManager` node operates against any wired memory backend and exposes three modes:

- **`load`** (default) — read current memory into the workflow (for inspection, branching on size, feeding a summarizer).
- **`insert`** — append a message. An optional `hideFromUI` flag covers messages that should affect the agent but not show in the chat UI.
- **`delete`** — remove some or all messages.

### Pattern: rolling summarization

When a conversation runs long and you want the gist of older turns instead of dropping them:

1. After each turn, `load` the buffer.
2. If it's approaching the cap, route to a summarizer (otherwise no-op).
3. Summarize the older turns with an LLM.
4. `delete` the buffer.
5. `insert` the summary as one message, plus the most recent few turns for continuity.

The agent now sees `[summary of turns 1-40] + [recent 5 turns]`, paying far fewer input tokens while keeping long-history context.

Other patterns built the same way: **prune by relevance** (`load` → filter → `delete` → `insert` the keepers), **inject runtime facts** (`insert` with `hideFromUI: true`), **reset on command** (`delete` all on `/clear`).

The Memory Manager node is more recent than the rest of n8n's memory tooling — verify the modes against your installed version before relying on them in production.

---

## Session ID handling by trigger

### Chat Trigger
Sets `sessionId` automatically. Wire it everywhere consistently:
- Memory: `sessionKey: ={{ $('Chat Trigger').first().json.sessionId }}`
- Tools: `sessionId: ={{ $('Chat Trigger').first().json.sessionId }}` (**NOT** through `$fromAI`)
- Storage keying: derive bucket keys / filenames from `sessionId` for trivial per-session cleanup.

### Webhook trigger
You manage it: the caller passes a header or body field (`body.sessionId`) and you forward it, or you issue one on first call and expect it back. Either way, it must be consistent across the whole conversation, including reconnections.

### Manual / scheduled
Usually no session. Use a stable identifier per "conversation" if one exists (ticket ID, thread ID); otherwise memory adds nothing — omit it.

---

## Memory and tools

When a tool is invoked, the tool's sub-workflow does **NOT** see conversation memory — memory is the agent's context, not the tool's input. Pass needed context through `$fromAI` parameters explicitly. For session-keyed state, plumb `sessionId` and have the tool look up state from a Data Table or storage keyed by session.

---

## Memory and binary

Memory stores **text turns**. Binary uploaded mid-conversation is NOT in memory — it's in the Chat Trigger's `files[]` for that turn only. The text memory captures that "the user mentioned uploading a file," but to actually use the file in a later tool call it must still be in storage and its key must be in **that** turn's system prompt. In practice, inject the session's file inventory into the system prompt every turn (loaded by `sessionId`). → **n8n-binary-and-data**.

---

## Common mistakes

- **Hardcoding `sessionId: 'default'`** — all conversations share one bucket; memory becomes meaningless.
- **Different `sessionId` on memory vs tools** — memory looks right but tools can't find related state.
- **Unbounded `memoryBuffer` for chat** — token cost grows until timeout. Use BufferWindow with a sane limit.
- **Adding memory where there's no session** — a "summarize this article" workflow doesn't need it.
- **Expecting tools to see memory** — they see only their `$fromAI` parameters and plumbed context.
- **Drift between the surface and memory** — if anything posts to the conversation outside the agent (a scheduled reply, a human writing directly), the agent operates on an incomplete view and will contradict messages it can't see. Whatever shows on the user-facing surface must also be `insert`ed into memory.

---

## Operational notes

- **Memory size drives token cost.** A 15-turn buffer of 200-token messages is 3000 tokens of input every turn before the user even speaks. Plan for it.
- **Rate limits.** A model that hits a limit fails mid-conversation; memory holds everything until then, and the next turn resumes (assuming session-id continuity).
- **Concurrent sessions.** Persistent backends key on `sessionId`, so concurrent conversations don't interfere. Verify with two simultaneous tests.

---

## Cross-references

- Where the agent fits → parent **SKILL.md**
- Passing session-keyed state into tools → **SUBWORKFLOW_AS_TOOL.md**
- Threading-as-session on chat surfaces → **CHAT_AGENT_PATTERNS.md**
- Session-keyed file storage → **n8n-binary-and-data**
