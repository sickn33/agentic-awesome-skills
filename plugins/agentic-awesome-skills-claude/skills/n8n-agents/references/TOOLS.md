# Agent tools

The agent picks tools by reading their **name** and **description** — nothing else. Both are part of the prompt. Treat tool design like API design: what it does, when to use it, what each parameter means, and how it fails.

---

## The four tool types

### 1. Native tool node

Pre-built tool versions of regular nodes: `slackTool`, `gmailTool`, `googleSheetsTool`, `toolCalculator`, `notionTool`, `httpRequestTool`, and so on. Identical to their non-tool counterparts except parameters can be agent-filled via `$fromAI()`.

- **Pros**: minimal config, well-tested, native feel.
- **Cons**: one node = one operation. Multi-step logic doesn't fit.
- **Use when**: the capability maps cleanly to one node and one operation.

When a native node is missing an operation or needs a non-standard param shape, point an **HTTP Request Tool** at the service's API with the service's *predefined credential type* — you reuse the existing OAuth/API-key credential and get the full API.

### 2. Sub-workflow as tool (`@n8n/n8n-nodes-langchain.toolWorkflow`)

The default for anything beyond one node. Any workflow becomes a tool with typed `$fromAI()` inputs.

- **Pros**: full power of n8n inside the tool — branching, error handling, sub-sub-workflows, native nodes, custom logic. Reusable across agents. Independently testable.
- **Cons**: one extra workflow boundary, slight latency.
- **Use when**: more than one node, logic that might be reused, or you want testability.

The canonical n8n way to build agent capabilities. → **SUBWORKFLOW_AS_TOOL.md**

### 3. HTTP Request Tool (`@n8n/n8n-nodes-langchain.toolHttpRequest`)

A wrapper around the HTTP Request node exposing its parameters to the agent.

- **Pros**: any HTTP API becomes a tool with one node.
- **Cons**: HTTP only. Auth/retry/error handling are yours to wire.
- **Use when**: calling a single external API the agent should orchestrate directly.

One thing to know: HTTP Request has its own HTTP-level timeout (default 5 minutes) — bump `options.timeout` for slow endpoints. The agent tool itself has no timeout; the agent waits as long as the tool takes. Pointing it at, say, the Notion API (with the Notion predefined credential) lets the agent compose path, method, and body itself — covering operations the native node doesn't expose. Trade-off: the agent is now writing API requests, which is more error-prone and needs a capable model plus clear endpoint guidance in the description. That widens the blast radius — make sure the user understands.

### 4. MCP Client Tool (`@n8n/n8n-nodes-langchain.mcpClientTool`)

Connects the agent to any MCP server. Two flavors:

- **External MCP servers** — any third-party or self-hosted MCP (GitHub, Linear, Notion, custom internal). One node exposes every tool that server offers.
- **n8n-hosted MCP** — a workflow on the same instance published with MCP access enabled. Same client node, pointed at an n8n MCP trigger URL. Lets one workflow serve many agents.

- **Cons**: tool descriptions and shapes come from the server, so quality varies and you can't easily tune them. Auth and reachability are yours.
- **Use when**: a maintained MCP server already covers the capability, or you want one published workflow to serve many agents.

### Plus: Custom Code Tool (`@n8n/n8n-nodes-langchain.toolCode`)

Pure inline computation (math, parsing, formatting). Its runtime contract is **string in / string out, no `$fromAI`, no `$helpers`** and is owned by the **n8n-code-tool** skill — read it before writing one. Rule of thumb: if you want `$fromAI()` in the code, you want `.toolWorkflow` instead.

---

## Decision: which tool type?

```
Capability the agent needs?
├── One native node + one operation does it
│     → native tool node
├── Native node missing an op / needs custom params for ONE API
│     → HTTP Request Tool (with the service's predefined credential)
├── More than one node, or logic that might be reused
│     → Sub-workflow as tool (.toolWorkflow)   ← default when in doubt
├── Pure deterministic computation, one-off, inline
│     → Custom Code Tool (.toolCode)            ← see n8n-code-tool
└── A maintained MCP server covers it / publish n8n logic to many agents
      → MCP Client Tool
```

---

## `$fromAI()`: how the agent fills tool parameters

`$fromAI()` is a **real n8n expression helper**, written inside a tool node's parameter expressions. Parameters the agent should decide get wrapped in it:

```
sendTo:  ={{ $fromAI('recipient', 'Email address of the recipient', 'string') }}
subject: ={{ $fromAI('subject', 'Email subject line, concise and informative', 'string') }}
body:    ={{ $fromAI('body', 'Email body in plain text, professional tone', 'string') }}
```

Shape: `$fromAI(paramName, description, type?, defaultValue?)`

- **paramName** — the name the model uses internally. snake_case or camelCase, be consistent.
- **description** — what value to produce. **Part of the prompt.** Be specific: format, range, example.
- **type** — `'string'` (default), `'number'`, `'boolean'`, `'json'`. Enforced — a wrong-typed value fails the call.
- **defaultValue** — used when the model omits the parameter.

It carries **JSON only** — it cannot carry binary (no base64, no file bytes), even through a non-AI binding. For binary, pass a storage key as a string and have the tool re-fetch (→ **n8n-binary-and-data**).

A good description vs a useless one:

```
✅ ={{ $fromAI('imageName', 'Storage key for an existing image to edit, or empty for a new generation. Use the exact key shown in the system prompt; do not reconstruct or guess.', 'string') }}

❌ ={{ $fromAI('imageName', 'image name', 'string') }}   // useless to the model
```

Treat `$fromAI` descriptions like JSDoc — the model reads them to figure out what to pass.

---

## Plumbed params: hide what the agent shouldn't decide

Not every parameter has to be `$fromAI`. Any parameter can be filled deterministically from workflow context, and **plumbed values are invisible to the agent** — not in the tool schema, not influenceable by anything the model produces:

```
reason:        ={{ $fromAI('reason', 'Why the user is requesting a refund', 'string') }}   // agent-filled
customerId:    ={{ $('Chat Trigger').first().json.user.id }}                                 // hidden
maxRefund:     ={{ $('Get user tier').first().json.refundLimit }}                            // hidden
idempotencyKey:={{ $('Chat Trigger').first().json.sessionId }}                               // hidden
```

Plumb anything the agent shouldn't get wrong or see:

- **Identity** — `userId`, `customerId`, authenticated actor, tenant scope.
- **Authority limits** — refund caps, tier flags, allowed regions.
- **Correlation IDs** — `sessionId`, idempotency keys, trace IDs.

**Give the agent a button to push, not a steering wheel.** The strongest version is a sensitive tool with **zero `$fromAI` parameters**: a "Refund order" tool takes `orderId` from the trigger, `amount` from the fetched order record, `actor` from the session — all plumbed. The agent literally cannot refund the wrong order; it only chooses whether to fire. Pair with **HUMAN_REVIEW.md** for actions needing both deterministic params and sign-off.

---

## Tool name and description as prompt

Selection process the model runs every turn:

1. It gets the system prompt, conversation, and the list of tools.
2. For each tool it reads name + description + parameter schema (with `$fromAI` descriptions).
3. It picks the tool whose description best matches what it needs to do.

**Bad names and descriptions cause bad selection — usually silently.** The model just doesn't call your tool, or calls a different one with garbage parameters. No error.

### Names: verb-first and specific

| Good | Bad | Why |
|---|---|---|
| `Search customer database` | `query` / `tool1` | Generic names say nothing |
| `Generate image with Veo` | `imageGen` | Which generator? |
| `Edit existing image` | `edit` | Edit what? |
| `Send Slack message to channel` | `slack` | Name the action, not just the surface |
| `Lookup user by email` | `getUser` | Lookup how? |

### Descriptions: three parts

1. **What it does** (one sentence).
2. **When to use it** (one or two sentences, with boundaries / examples).
3. **Parameter notes** (only if not already covered in `$fromAI` descriptions).

```
Edit existing image: Modifies an image the user already uploaded, based on a prompt.
Use when the user uploaded an image and asks for changes (color, style, composition, content).
Do NOT use for generating new images from scratch — use Generate Image for that.
The imageName parameter must be the storage key of the existing image as listed in your
available files; do not pass the original filename or a URL.
```

That description does work that would otherwise bloat the system prompt — which is exactly the point.

---

## Tool descriptions as modular prompts

Anything specific to *how to call this tool* belongs in the tool's description, not the system prompt:

| In the system prompt (move out) | Better in the tool description |
|---|---|
| "When generating images, prefer realistic photography over `8k cinematic`" | `Generate Image`: "Default to realistic photography aesthetics…" |
| "If the search tool returns nothing, summarize politely" | `Search`: "Returns up to 10 results; if empty, report 'no matches' rather than retrying broader" |
| "Use 9:16 for video tools" | `Generate Video`: "Defaults to 9:16; pass `aspectRatio: '16:9'` for landscape" |

Three reasons: **reusability** (the tool teaches each new agent how to use it), **token efficiency** (per-tool guidance only loads when the model considers that tool, not every turn), **maintainability** (one description, not a buried paragraph).

---

## Granularity: one tool with branching, not two near-identical tools

The model gets confused choosing between near-identical tools. If two are ~80% the same internally:

- **One tool with a branching parameter.** `Generate Image` vs `Edit Image` share most logic → collapse to one with an `imageName` parameter (empty = generate, populated = edit).
- **Two tools only when genuinely distinct AND the descriptions clearly differentiate.** `Send DM` vs `Send Channel Message` are distinct.

---

## Operational notes

- **maxIterations.** Agents have a configurable tool-call cap (`options.maxIterations`), and the default is **low**. A multi-tool agent that chains calls hits it and surfaces "max iterations reached" or empty output. Raise it. Build a fallback — don't trust graceful recovery.
- **Tool-call cost.** Each call is at minimum one extra model round-trip. Frequently-called tools should return **concise** results — bloated returns burn input tokens fast.
- **Tool failure handling.** Set `onError: 'continueErrorOutput'` on tool sub-workflows where you want the agent to receive an error string instead of halting; the agent can retry, switch tools, or report. → **n8n-error-handling**.

---

## Cross-references

- The sub-workflow tool pattern in detail → **SUBWORKFLOW_AS_TOOL.md**
- System-prompt-vs-tool-description split → **SYSTEM_PROMPT.md**
- Passing binary into tools → **n8n-binary-and-data**
- The Custom Code Tool contract → **n8n-code-tool**
