# Chat agent patterns: shell + core + sub-agents

For external chat surfaces — Slack, Discord, Microsoft Teams, Telegram, embedded webhook chats. The building blocks (memory, tools, sub-workflow-as-tool, structured output) live in their own references; this file covers the **multi-workflow composition** production chat agents grow into, plus chat-surface gotchas the other refs don't.

---

## The one non-negotiable: anti-loop filtering

**Any chat-triggered workflow that posts a reply MUST filter out the bot's own user ID right after the trigger, or it triggers itself forever** — every reply fires another run, until rate limits or n8n concurrency stop it (and it can take n8n down with it). That's the minimum bar for **every** bot, simple or complex.

**Prefer trigger-level filtering when the trigger supports it** — the loop then breaks before any downstream node runs. Semantics differ per surface; verify against your version:

- **Slack** (`n8n-nodes-base.slackTrigger`): `options.userIds` is an **exclusion list** — listed users are dropped before the workflow runs. Put the bot's user ID here. (Verified in the trigger source: it returns early `if (userIds.includes(event.user))`.)
- **Telegram** (`n8n-nodes-base.telegramTrigger`): `additionalFields.userIds` is an **inclusion / allowlist** (only listed users fire). NOT a bot-exclusion filter — and Telegram bots don't see their own messages by default, so anti-loop usually isn't needed. Use the allowlist to restrict a private bot to specific humans.
- **Discord, Teams**: no native user-level trigger filter — use the downstream Filter node.

Slack trigger-level example:

```json
{
  "parameters": {
    "trigger": ["message"],
    "channelId": { "__rl": true, "mode": "list", "value": "<CHANNEL_ID>" },
    "options": { "userIds": "={{ [\"<BOT_USER_ID>\"] }}" }
  },
  "type": "n8n-nodes-base.slackTrigger"
}
```

When the trigger doesn't expose a usable exclusion filter, the first node after the trigger must drop the bot's own ID:

```json
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json.user }}",
          "rightValue": "<BOT_USER_ID>",
          "operator": { "type": "string", "operation": "notEquals" }
        }
      ]
    }
  },
  "type": "n8n-nodes-base.filter"
}
```

The bot user ID is the API ID from your bot's auth (Slack `bot_user_id`, Discord application ID, Teams `botId`).

---

## When to split into shell + core + sub-agents

Beyond the anti-loop filter, a **simple bot (one trigger → one agent → one reply, with the filter)** lives fine in a single workflow. The shell + core + sub-agents split is for production robustness — it earns its keep once any of these is true:

- The bot needs loading-state UX (typing indicator, reaction, placeholder) and graceful error handling beyond a single message.
- It's invoked from more than one surface (Slack AND Discord).
- There are specialist domains the agent shouldn't carry inline (Notion DB schema, CRM custom fields, Linear labels).
- The agent or its tools will be reused across workflows.

If none apply, keep it in one workflow (filter still in place). The shape when you do split:

```
[chat-surface workflow]  ──►  [agent core workflow]  ──►  [sub-agent workflows]
("the shell")                 ("the brain")               ("specialists")

- Trigger from the surface    - Stateless                 - One narrow domain each
- Anti-loop filter            - chatInput + threadId       - chatInput only
- Routing / event types       - Memory keyed on threadId   - Their own tools + model
- Loading + error UX          - Tools, sub-agents
- Render the reply            - No surface concerns
```

See **EXAMPLES.md** for a Slack router shell and a domain sub-agent snippet.

---

## The shell

Receives chat events, decides whether to respond, manages UX, calls the core, renders the reply. No reasoning, no LLM.

### Switch on event type

The same trigger fires for messages, reactions, mentions, slash commands, button clicks. One Switch right after the anti-loop filter routes each to the right handler:

```
"owner message"            → Execute Workflow: agent-core
"owner reaction"           → no-op (or a reaction handler)
"unknown user"             → canned reply
"slash command: /summary"  → Execute Workflow: summary-command
"button click"             → Execute Workflow: interaction-handler
```

Each case is its own sub-workflow because the routing decision and the work are different concerns (different models, timeouts, memory shapes). Adding a slash command means one Switch output + one sub-workflow, not a new top-level trigger.

Slack-specific notes (payload shapes evolve — verify against a live event before hardcoding paths): reactions/mentions flow through the Slack Trigger as Events API events; **slash commands and Block Kit button clicks generally don't** (Slack delivers those to separate Request URLs). Bring them in via a second Webhook node feeding the same Switch, or a community Socket Mode node. Slash commands expose a `command` field; Block Kit interactions arrive with `type === 'block_actions'` and an `actions` array.

### Loading-state UX

Users assume nothing is happening without acknowledgement. Pattern: **add a loading indicator before the agent call, remove it on every exit path — including error.**

```
[Trigger] → [Filter bot] → [Switch]
   → (owner message)
   → [Add loading reaction]                  (:spinner:, etc.)
   → [Execute Workflow: Agent core]   onError: 'continueErrorOutput'
        ├── (success) → [Remove reaction] → [Send reply]
        └── (error)   → [Remove reaction] → [Send error message with link]
```

The error path is the easy one to forget — without it the indicator sits forever and the user thinks the bot is still working. `onError: 'continueErrorOutput'` on the Execute Workflow node enables the second branch (→ **n8n-error-handling**). For Discord/Telegram, typing indicators are time-bounded; for long agents send a placeholder message and edit it.

### Threading as session continuity

Use the surface's thread primitive as the memory `sessionKey`:

```json
"workflowInputs": {
  "value": {
    "chatInput": "={{ $('Filter bot').item.json.text }}",
    "threadId":  "={{ $('Filter bot').item.json.thread_ts || $('Filter bot').item.json.ts }}"
  }
}
```

`thread_ts || ts` is the canonical Slack idiom: replies in a thread carry `thread_ts` (referencing the parent), the parent itself only has `ts`. Falling back to `ts` makes the parent message the session key for its thread, so each thread is a fresh conversation and memory doesn't leak across threads. **User ID, channel ID, or workspace ID alone are wrong — they cross conversations.** When sending the reply, target the same thread (`otherOptions.thread_ts.replyValues.thread_ts` = the same `thread_ts || ts`).

### Error UX: surface, don't hang

The error branch sends a short message with a link to the failed execution:

```
There was a workflow error. https://<n8n-host>/workflow/<id>/executions/{{ $execution.id }}
```

`$execution.id` is the live execution ID at the time the error fires. Parameterize the host across environments.

---

## The agent core

A sub-workflow with two declared inputs: `chatInput` (the user's message) and `threadId` (the surface's thread/session ID). Returns the agent's final output — a string, a structured object, or a surface-specific envelope (Block Kit, adaptive card).

The only chat-specific wiring beyond **MEMORY.md** is plumbing `threadId` straight to `sessionKey`:

```json
"sessionIdType": "customKey",
"sessionKey": "={{ $json.threadId }}"
```

`threadId` flows trigger → (pass-through nodes) → memory. Don't put it behind `$fromAI`.

Per-execution context (user identity, attached files) goes in a Set node before the agent and gets templated into the system prompt (→ **SYSTEM_PROMPT.md** "file-handling injection" and "piecing"). Don't add a Set node speculatively — inline in `systemMessage` is fine until reuse is real.

**Block Kit / adaptive cards: pair the agent with `outputParserStructured`** (→ **STRUCTURED_OUTPUT.md**). The "use `schemaType: 'manual'` with a real JSON Schema" guidance applies even harder here: Block Kit and adaptive cards lean on `oneOf` union types across block kinds plus per-block enums (`style`, etc.) — `jsonSchemaExample` can't express any of it, and will produce confidently-wrong block trees the surface rejects.

### Block Kit envelope gotcha (Slack)

When the agent returns Block Kit and you post it via the Slack node's `blocksUi`, the value must be an object shaped `{ "blocks": [...] }` where the value is a **real array**, not the array alone and not a stringified one:

```
✅ ={{ { "blocks": $('Call Agent core').item.json.output.blocks } }}
❌ ={{ $('Call Agent core').item.json.output.blocks }}
```

Passing only the array fails **silently** — the Slack node accepts the input, the message posts with no rich content, and there's no error or warning. → **n8n-node-configuration** `NODE_FAMILY_GOTCHAS.md` (Slack section).

---

## Sub-agents (an agent as a tool)

A sub-agent is its own workflow with its own Agent node, called from the router agent via `.toolWorkflow`. Reach for one when:

- The domain has a schema/enum set the router shouldn't carry (Notion DB properties, Linear labels, CRM fields).
- The domain has 5+ tools that would clutter the router's tool list.
- The capability is reused across more than one router.
- The domain warrants a different (cheaper, faster) model than the router.

**The contract is stateless.** The router sends the full request in `chatInput` — no shared memory, no implicit context. Reinforce it in both the tool description (router-side) AND the sub-agent's system prompt (callee-side):

> IMPORTANT: This tool is stateless. Send all relevant context in a single message. If you need to create an entry, include ALL required fields upfront.

Without that, the router assumes implicit context and the sub-agent guesses. Everything else about wiring sub-workflows as tools → **SUBWORKFLOW_AS_TOOL.md**.

### Fresh schema injection

When the domain schema can change at runtime (Notion DB options evolve, Linear teams add labels), refetch it on every sub-agent call instead of hardcoding it:

```
[Execute Workflow Trigger]
   ↓
[Notion: Get Database]                  # fetches the live schema
   ↓
[Agent]   system prompt template includes:
   ## Database Schema
   {{ $('Get a database').first().json.properties.toJsonString() }}
```

One extra API call per invocation; in exchange the sub-agent never returns "that property doesn't exist" because the prompt is stale. Worth it for low-volume chat assistants. For high-volume hot paths, cache the schema in a Data Table with a TTL.

---

## Anti-patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| No bot-user-ID filter at the top of the shell | Bot's own messages re-trigger the workflow — infinite loop | Trigger-level exclusion (Slack `options.userIds`) or a Filter on `$json.user !== '<BOT_USER_ID>'` first |
| Bot ID in Telegram's `userIds` expecting exclusion | It's an **allowlist** — only the bot would fire, so no human gets through; looks "fixed" but is silent | Telegram bots don't see their own messages; use `userIds` only to allowlist humans |
| Loading indicator removed only on success | User sees the bot stuck "thinking" forever after any error | `onError: 'continueErrorOutput'` + remove on both branches |
| User/channel/workspace ID as the session key | Conversations cross threads in the same channel | Use the thread primitive (Slack `thread_ts || ts`) |
| One workflow when multi-surface/sub-agent/reuse is already needed | Can't reuse, UX leaks into reasoning, hard to test in isolation | Split into shell + core + sub-agents (only once a need is real) |
| Sub-agent that reads/writes shared memory | Caller can't reason about behavior, not safely retryable | Sub-agents are stateless — full context in `chatInput` |
| Hardcoded domain schema in a sub-agent's prompt | Schema rots, sub-agent picks invalid options later | Re-fetch and template it at runtime |
| Passing the bare blocks array to `blocksUi` | Slack posts an empty message, no error | Wrap as `{ "blocks": [...] }` with a real array |

---

## Cross-references

- Tool naming, descriptions, `$fromAI` → **TOOLS.md**
- The `.toolWorkflow` shape and parameter mapping → **SUBWORKFLOW_AS_TOOL.md**
- Per-execution context, file injection, prompt storage → **SYSTEM_PROMPT.md**
- Parser config, autoFix, fixer model → **STRUCTURED_OUTPUT.md**
- Memory types, `sessionKey` persistence → **MEMORY.md**
- `onError: 'continueErrorOutput'` and error UX → **n8n-error-handling**
- Slack node parameter shapes (Block Kit) → **n8n-node-configuration** `NODE_FAMILY_GOTCHAS.md` (Slack section)
- Receiving uploaded files / returning generated files per surface → **n8n-binary-and-data**
