---
name: n8n-agents
description: Design n8n AI agents, chains, classifiers, extractors, tool calling, memory, RAG, structured output, and human-review flows.
risk: critical
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/n8n-agents
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# n8n Agents

## When to Use

Use this skill for n8n AI Agent, LangChain, classifier, extractor, memory, RAG, tool-calling, structured-output, or human-review design. Confirm the target n8n instance and inspect the live node schema before applying version-sensitive configuration.

Before activating or testing a workflow that can send messages, write data, make purchases, change accounts, or call external services, show the user the exact effects and obtain approval. Store provider keys and tokens only in n8n credentials; never place them in prompts, Set nodes, workflow JSON, examples, or logs.

The n8n AI Agent node (`@n8n/n8n-nodes-langchain.agent`) is a multi-turn LLM driver with sub-nodes for the model, memory, tools, and an optional output parser. This skill is the **deep** guide to designing agents and the LangChain family around them. For the high-level "where an agent fits in a workflow" picture, see the **n8n-workflow-patterns** skill — this skill goes one level down into *how to build it well*.

For node-type formats: in workflow JSON the LangChain nodes use the long `@n8n/n8n-nodes-langchain.*` form (`.agent`, `.lmChatOpenAi`, `.memoryBufferWindow`, `.outputParserStructured`, `.toolWorkflow`, `.toolHttpRequest`, `.toolCode`). When you call `get_node` / `validate_node`, use the **short** form (`nodes-langchain.agent`). See **n8n-mcp-tools-expert** for the format rules.

---

## Pick the right node first

Reaching for an Agent when the task is one-shot classification or extraction is the most common over-build. Decide before you wire anything:

| You need to… | Use | Why |
|---|---|---|
| Call tools, reason over multiple turns, or hold memory | **AI Agent** (`.agent`) | The full loop: model + tools + memory + optional parser. Also a fine default when you'd rather standardize. |
| One-shot text in → text out, no tools | **Basic LLM Chain** (`.chainLlm`) | No agent loop, easier to debug. Still accepts an `outputParserStructured` sub-node. |
| Route a natural-language input to one of **N branches** | **Text Classifier** (`.textClassifier`) | ONE node, N output handles, downstream wires directly into each. Not Agent + Switch. |
| Pull structured fields out of free text | **Information Extractor** (`.informationExtractor`) | Purpose-built field extraction with a schema. |
| 3-way positive/neutral/negative split | **Sentiment Analysis** (`.sentimentAnalysis`) | Built-in branch outputs. |
| Condense a long document | **Summarization Chain** (`.chainSummarization`) | Map-reduce summarization built in. |
| Generate an image / audio / video | **The provider's native single-call node** (OpenAI, Gemini, ElevenLabs…) | NEVER wrap media generation in an Agent — see "Binary and the agent boundary". |

**Text Classifier detail (the Agent + Switch anti-pattern):** every category needs both a **name AND a description**. The model routes against the *description*, not the name — a category with no description gets picked by coin-flip. Set `options.enableAutoFixing: true` for robustness on edge inputs. One node, N branches, done. Reaching for an Agent that "decides" then a Switch that "routes" is two nodes plus prompt boilerplate for what Text Classifier does natively.

Chat-model nodes (`.lmChatOpenAi`, `.lmChatAnthropic`, `.lmChatOpenRouter`, …) are **sub-nodes** — they don't run standalone. They wire into a chain, agent, classifier, or extractor via the `ai_languageModel` connection.

---

## The sub-node pattern

The Agent has a **main input** (the prompt / user message) and up to four **sub-node slots**, each wired by its own `ai_*` connection type:

| Slot | Connection type | Required? | Node example |
|---|---|---|---|
| **model** | `ai_languageModel` | Yes | `.lmChatOpenAi`, `.lmChatAnthropic`, `.lmChatOpenRouter` |
| **memory** | `ai_memory` | Optional | `.memoryBufferWindow`, `.memoryPostgresChat` |
| **tools** | `ai_tool` | Optional (but the point of an agent) | `slackTool`, `.toolWorkflow`, `.toolHttpRequest`, `.toolCode` |
| **outputParser** | `ai_outputParser` | Optional | `.outputParserStructured` |

A sub-node connects FROM itself TO the agent. In workflow JSON the connection lives on the **sub-node**, keyed by the `ai_*` type:

```json
"Main LLM": {
  "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
},
"Simple Memory": {
  "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]]
},
"Search customer DB": {
  "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
}
```

Multiple tools all connect into the same `ai_tool` index 0 — they stack, they don't fan into separate indices. With `n8n_update_partial_workflow` you wire each with an `addConnection` op using `sourceOutput: "ai_tool"`. The agent puts its final answer in **`$json.output`** (not `.text`, not `.response`) — downstream nodes read `{{ $json.output }}`.

See **references/EXAMPLES.md** for a complete stateless agent-core node-object snippet.

---

## Two non-negotiables

1. **Tool names and descriptions ARE part of the prompt.** The model picks a tool by reading its name and description — nothing else. A tool named `tool1` with an empty description is invisible to the model: it skips it, mis-selects it, or hallucinates parameters. There's usually no error — just an agent that "won't use my tool". Treat both like API design. → **references/TOOLS.md**
2. **Structured output must parse AND autoFix.** An `outputParserStructured` with `autoFix: true` and a **coding-capable fixer model** is the production pattern. Without autoFix, one malformed JSON response halts the whole workflow. → **references/STRUCTURED_OUTPUT.md**

---

## Strong defaults

- **Per-tool usage goes in the tool description, not the system prompt.** Anything about *how to call this specific tool* belongs with the tool, so it travels across agents and keeps the system prompt focused. → **references/SYSTEM_PROMPT.md**
- **Sub-workflow tools (`.toolWorkflow`) for anything multi-step.** Any workflow becomes a tool with typed `$fromAI()` inputs, and composes with branching, error handling, and reuse. Default here when in doubt. → **references/SUBWORKFLOW_AS_TOOL.md** and **n8n-subworkflows**.
- **Wrap tools with user-visible side effects in human review.** Sends, payments, refunds, account changes get gated behind an approval node so a human signs off before the tool fires. → **references/HUMAN_REVIEW.md**
- **Raise `maxIterations`.** The default tool-call cap is **low** (single digits on most versions) — fine for a one-tool agent, far too low for a multi-tool agent that chains several calls per turn. It surfaces as "max iterations reached" or empty output. Set `options.maxIterations` to a realistic ceiling (15 for a focused sub-agent, 50-200 for a broad orchestrator).
- **Put the current date in the system prompt** via `{{ $now }}` (or `{{ $now.format('DDDD') }}`). A hardcoded date is stale immediately.

---

## The four tool types

Pick the lightest option that covers the job:

| Tool type | Node | Use when |
|---|---|---|
| **Native tool node** | `slackTool`, `gmailTool`, `toolCalculator`, … | The capability maps to one existing node + one operation. Lowest overhead. |
| **Sub-workflow as tool** | `.toolWorkflow` | More than one node, reusable logic, or you want independent testability. The canonical n8n way — **default when in doubt**. |
| **HTTP Request Tool** | `.toolHttpRequest` | A single external HTTP API the agent should orchestrate directly. Reuse the service's predefined credential to cover operations a native node doesn't expose. |
| **MCP Client Tool** | `.mcpClientTool` | A maintained MCP server already covers it, or you want one published workflow to serve many agents. |

There is also a **Custom Code Tool** (`.toolCode`) for pure inline computation — but its runtime contract (string in / string out, no `$fromAI`, no `$helpers`) is owned by the **n8n-code-tool** skill. Read that before writing one. Rule of thumb: if you find yourself reaching for `$fromAI()` inside the code, you want `.toolWorkflow` instead.

### `$fromAI()`: how the agent fills tool parameters

Tool parameters the agent should decide are wrapped in `$fromAI()`. It is a **real n8n expression helper**, used inside a tool node's parameter expressions:

```
={{ $fromAI('paramName', 'what to put here — be specific: format, range, example', 'string') }}
```

- **paramName** — the name the model uses internally (snake_case or camelCase, be consistent).
- **description** — tells the model what value to produce. **It is part of the prompt** — write it like JSDoc.
- **type** (optional) — `'string'` (default), `'number'`, `'boolean'`, `'json'`. A wrong-typed value fails the call.
- **defaultValue** (optional) — used when the model omits it.

`$fromAI()` carries JSON only — it **cannot carry binary** (no base64, no file bytes). And not every parameter has to be `$fromAI`: plumb identity, authority limits, and correlation IDs (`userId`, refund caps, `sessionId`) deterministically from workflow context so the agent can't get them wrong or even see them. → **references/TOOLS.md** for the full anatomy and the "give the agent a button, not a steering wheel" pattern.

---

## System prompt vs tool description

| Belongs in the **system prompt** | Belongs in the **tool's description** |
|---|---|
| Persona, role, voice | What this specific tool does |
| Global output/format rules ("respond in markdown") | When to use it vs other tools |
| Refusal / safety behavior | What each parameter means and its shape |
| Display protocols (`![]()` for images) | Examples of good vs bad invocations |
| Universal context (current date via `$now`, user role) | Tool-specific gotchas (rate limits, edge cases) |
| Inter-tool flow ("after generating, always display") | Tool-specific input transformations |

Why split it: a well-described tool works in **any** agent that drops it in, tool details only "load" when the model considers that tool (token efficiency), and you update one tool description instead of a paragraph buried in a 5000-token prompt. → **references/SYSTEM_PROMPT.md**

---

## Structured output: when and how

Add an `outputParserStructured` sub-node (wired `ai_outputParser`) when downstream needs strict JSON, not free-form text. Two rules:

1. **Use `schemaType: 'manual'` with a real JSON Schema, not `jsonSchemaExample`.** An example can't express required-vs-optional, enums, numeric ranges, or array constraints — you outgrow it the first time the shape gets non-trivial. Reach for `fromJson` + an example only for throwaway shapes.
2. **`autoFix: true` with a coding-capable fixer model.** Wire a *second* model into the parser's `ai_languageModel` slot. Reconciling broken JSON against a schema is a coding task — a weak fixer just produces another malformed retry and burns tokens.

→ **references/STRUCTURED_OUTPUT.md** for the schema patterns, the load-bearing "DO NOT wrap in markdown" retry line, and the parse-failure cookbook.

---

## Memory: brief mental model

Memory is a sub-node (`ai_memory`). Without it, every call is stateless — correct for one-shot tasks (classify, summarize). With it, the agent holds a conversation, keyed by whatever expression you bind to `sessionKey`.

- **`memoryBufferWindow`** — keeps the last N exchanges per key and persists across executions via n8n's store. The default for chat. **`contextWindowLength` defaults to 5, which is very low** — 50 is a saner starting point. Messages past the window are gone entirely.
- **`memoryPostgresChat` / `memoryRedisChat`** — only when memory must be read *outside* the agent (your own UI, analytics, cross-system). Not needed just to survive restarts; BufferWindow already does that.

**Plumb a stable key from the trigger to memory consistently.** Chat triggers fill `sessionId` automatically; for other surfaces derive one (Slack `thread_ts`, a webhook conversation ID). Never hardcode `sessionId: 'default'` and never put `sessionId` behind `$fromAI` (the model will fabricate a UUID). → **references/MEMORY.md**

---

## Binary and the agent boundary

This is the seam that trips people up:

- **The model CAN see uploaded images** (vision) via `options.passthroughBinaryImages: true` on the agent.
- **Tools CANNOT receive binary.** `$fromAI()` is JSON-only — no base64, no bytes, even through non-AI bindings.
- **The agent's output is text-shaped** (or structured-text with a parser). When a model returns image/audio/video bytes, the Agent doesn't surface them at all — there's nothing to recover downstream.

**Workaround:** pre-stage uploads to storage before the agent runs, inject the storage keys into the system prompt, and let tools accept the key as a string parameter and re-fetch internally. For one-shot media generation, skip the agent and call the provider's native single-call node directly.

The binary mechanics (which storage, how to stage, how to re-fetch) are owned by **n8n-binary-and-data** — see its agent-tool binary reference. This skill only marks the boundary; don't re-derive the mechanics here.

---

## Human review (gate destructive tools)

When a tool's effect needs human sign-off before execution (sends, payments, refunds, account changes), wrap it with a review tool node — `slackHitlTool`, `discordHitlTool`, `telegramHitlTool`, `gmailHitlTool`, etc. (n8n names these "Hitl" / human-in-the-loop). The review node sits **between** the wrapped tool and the agent on the `ai_tool` connection: wrapped tool → review node → Agent.

Whether sign-off is needed is a product/policy call — **surface the question to the user**, recommend based on blast radius, and let them decide.

**The critical rule: show the actual parameters the wrapped tool will receive.** Use the literal `{{ $tool.parameters.<name> }}` in the approval message, never a `$fromAI()` paraphrase — otherwise the human approves text the model made up, not the call about to fire. → **references/HUMAN_REVIEW.md**

---

## Chat agents (Slack, Discord, Teams, Telegram)

**The one non-negotiable, regardless of complexity:** any chat-triggered workflow that posts a reply MUST **filter out the bot's own user ID**, or its own replies re-trigger it in an infinite loop that burns runs and tokens. Prefer trigger-level filtering when available (Slack Trigger's `options.userIds` is an **exclusion list** — put the bot ID there); otherwise filter `$json.user !== '<BOT_USER_ID>'` in the first node after the trigger.

Beyond the filter, a simple bot (trigger → agent → reply) lives fine in one workflow. Split into **shell + core + sub-agents** only once you need loading UX, sub-agents, multi-surface reuse, or robust error handling:

- **Shell** — trigger, anti-loop filter, event-type Switch, loading/error UX, renders the reply. No LLM.
- **Core** — stateless agent, `chatInput` + `threadId` inputs, memory keyed on `threadId`, tools and sub-agents.
- **Sub-agents** — one narrow domain each, called via `.toolWorkflow`, **stateless** (full context in `chatInput`).

→ **references/CHAT_AGENT_PATTERNS.md** for per-surface semantics, threading-as-session, and the full topology.

---

## RAG (retrieval augmented generation)

n8n ships the LangChain RAG primitives (document loaders, splitters, embeddings, vector stores, retrievers). Two opinions worth stating up front:

1. **Rule out cheaper lookups first.** Exact lookups → a database or Data Table query, not RAG. Freshness → a live search tool. A small/structured doc set → give the agent list/fetch tools. Reach for a vector store only when there are too many docs to list and queries are semantic.
2. **Wire the vector store as a retrieval tool** (`mode: 'retrieve-as-tool'`, `ai_tool`) so the agent decides when retrieval is relevant and can phrase the query itself. Embed query and documents with the **same** model.

→ **references/RAG.md** (intentionally thin — defaults depend on data shape and scale).

---

## Reference files

| File | Read when |
|---|---|
| **references/TOOLS.md** | Adding tools, choosing among the four types, writing names/descriptions, `$fromAI` anatomy |
| **references/SUBWORKFLOW_AS_TOOL.md** | Wiring a sub-workflow as a tool via `.toolWorkflow`, mapping agent-filled vs plumbed params |
| **references/SYSTEM_PROMPT.md** | Writing/refactoring a system prompt, the system-prompt-vs-tool-description split |
| **references/STRUCTURED_OUTPUT.md** | Forcing JSON output, configuring autoFix, the fixer model, parse-failure fixes |
| **references/MEMORY.md** | Choosing a memory type, persistence, sessionId handling |
| **references/HUMAN_REVIEW.md** | Adding human approval, approval-message content, multi-channel approver |
| **references/CHAT_AGENT_PATTERNS.md** | Building a Slack/Discord/Teams/Telegram bot, shell + core + sub-agents topology |
| **references/RAG.md** | Retrieval-augmented agents (thin by design) |
| **references/EXAMPLES.md** | Concrete node-object snippets: stateless agent core, Slack router shell, domain sub-agent |

---

## Anti-patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| Generic tool names (`tool1`, `doStuff`, `runQuery`) | Model can't tell which tool to pick — skips them or hallucinates params | Verb-first specific names: `Search customer database`, `Generate image with Veo` |
| Empty or one-line tool descriptions | Model has no idea when to invoke; bad selection, no error | Write a real description: what it does, when to use, what each param means |
| Cramming per-tool instructions into the system prompt | Bloated prompt, no reuse, per-tool guidance buried | Move tool-specific instructions into tool descriptions |
| Agent + Switch to route on natural language | Two nodes + prompt boilerplate where Text Classifier is one node | Use Text Classifier — each category gets its own output handle (name **and** description) |
| Wrapping image/audio/video generation in an Agent | Binary doesn't flow through tools or out of the agent output | Use the provider's native single-call node directly |
| `outputParserStructured` without `autoFix` | One malformed response halts the workflow | `autoFix: true` + a coding-capable fixer model |
| Passing binary directly to a tool | Doesn't work — binary can't cross the tool boundary | Pre-stage to storage, pass keys; see **n8n-binary-and-data** |
| Hardcoded `sessionId` / no sessionId / `sessionId` behind `$fromAI` | Conversations cross, or the model fabricates a UUID | Plumb a stable key from the trigger to memory and tools |
| Two near-identical tools | Selection is non-deterministic, model gets confused | One tool with internal branching driven by a parameter |
| Chat bot with no bot-user filter | Its own replies re-trigger it → infinite loop | Exclude the bot user ID at the trigger or first node |
| `maxIterations` left at the low default on a multi-tool agent | "Max iterations reached" / empty output | Raise `options.maxIterations` |
| Filling the human-review message via `$fromAI()` | Approver signs off on a paraphrase, not the real call | Use literal `{{ $tool.parameters.<name> }}` |

---

## What's NOT available via the community MCP

| Want to do | Reality |
|---|---|
| Run / chat-test the agent end-to-end with live tokens | `n8n_test_workflow` runs the workflow, but a true multi-turn chat session is a UI activity (canvas chat tester). |
| Set credentials' actual secret values | `n8n_manage_credentials` creates/updates credential records, but the agent provider keys themselves are entered/verified in the UI. |
| Assign a workflow's Error Workflow | UI only — see **n8n-error-handling**. Build the catch-all, then hand the user the UI step. |
| Pin the exact model availability per instance | Model lists shift between versions — `search_nodes`/`get_node` reflect what's installed. Verify on the target instance. |

What the MCP **can** do: search and inspect every LangChain node (`search_nodes`, `get_node`), validate node config and the whole graph (`validate_node`, `validate_workflow`), build and patch the agent and its sub-nodes (`n8n_update_partial_workflow` with `addConnection` on `ai_*` outputs), test (`n8n_test_workflow`), and pull the saved JSON to verify wiring (`n8n_get_workflow`). The deep AI-agent guide also lives in `tools_documentation({topic: "ai_agents_guide", depth: "full"})`.

---

## Integration with other skills

- **n8n-workflow-patterns** — the high-level "agent in a workflow" shape. This skill is the deep dive; start there for architecture.
- **n8n-mcp-tools-expert** — node-type formats (short form for `get_node`, long form in JSON) and tool-selection guidance. Consult before any MCP call.
- **n8n-node-configuration** — `displayOptions`-driven fields on the agent and sub-nodes; Slack/Block Kit message shapes (`NODE_FAMILY_GOTCHAS.md`, Slack section).
- **n8n-expression-syntax** — `{{ }}`, `$json.output`, `$now`, and `$fromAI`/`$tool.parameters` all rely on correct expression syntax.
- **n8n-code-tool** — the Custom Code Tool's runtime contract (string in/out, no `$fromAI`). Read it before writing a `.toolCode`.
- **n8n-subworkflows** — the sub-workflow primitive that `.toolWorkflow` builds on (Execute Workflow Trigger inputs/outputs, naming, search-before-build).
- **n8n-binary-and-data** — owns the agent-tool binary boundary mechanics (staging uploads, returning generated files).
- **n8n-validation-expert** — interpreting `validate_workflow` results, including AI-connection issues (a tool wired into `main` instead of `ai_tool` flags as disconnected).
- **n8n-error-handling** — `onError: 'continueErrorOutput'` on tool sub-workflows and the agent-core call; error UX on chat shells.
- **n8n-code-javascript / n8n-code-python** — for Code-node logic *inside* a tool sub-workflow (different sandbox from the Code Tool).

---

## Quick reference checklist

Before shipping an agent:

- [ ] **Right node**: Agent for tools/memory/multi-turn; Text Classifier for routing; Information Extractor for fields; native node for media
- [ ] **Model** wired via `ai_languageModel`
- [ ] **Every tool** has a verb-first specific name AND a real description
- [ ] **`$fromAI()` descriptions** are specific (format, range, example); identity/limits/sessionId plumbed deterministically, not via `$fromAI`
- [ ] **Per-tool guidance** lives in tool descriptions, not the system prompt
- [ ] **`$now`** in the system prompt (no hardcoded date)
- [ ] **`maxIterations`** raised for multi-tool agents
- [ ] **Memory** keyed on a stable `sessionKey` from the trigger (not `'default'`, not `$fromAI`); `contextWindowLength` raised from 5
- [ ] **Structured output**: `schemaType: 'manual'` + `autoFix: true` + a coding-capable fixer model
- [ ] **Destructive tools** wrapped in human review; approval message uses `$tool.parameters`, not `$fromAI`
- [ ] **Chat bots** filter the bot's own user ID (trigger-level or first node)
- [ ] **Binary**: model vision via `passthroughBinaryImages`; tools get storage keys, never bytes
- [ ] **Validated** with `validate_workflow` and verified with `n8n_get_workflow` (sub-nodes on `ai_*`, not `main`)

---

**Remember**: an agent is only as good as its tool names, descriptions, and system-prompt discipline. The model can't see your wiring — it sees a system prompt and a list of named, described tools. Design those like an API and most "the agent won't behave" problems disappear.

## Limitations

- Node types, parameters, model availability, and defaults vary by n8n version; verify them against the target instance.
- This guidance cannot set provider secret values or prove a live multi-turn agent works without an authorized execution.
- Validation does not prove tool selection quality, correct wiring, idempotency, or safe side effects; inspect and test those separately.
