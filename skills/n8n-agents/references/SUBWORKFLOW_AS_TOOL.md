# Sub-workflow as agent tool

The default agent-tool shape for anything beyond one node is the Tool Workflow node (`@n8n/n8n-nodes-langchain.toolWorkflow`). Any sub-workflow becomes a tool the agent calls, with typed inputs filled by `$fromAI()`. It composes with everything good about n8n: branching, error handling, sub-workflow reuse, native nodes, custom logic.

For the sub-workflow primitive itself (Execute Workflow Trigger inputs/outputs, stateless design, naming, search-before-build), see **n8n-subworkflows** — this reference only covers the *agent-tool* angle.

---

## Why this is the default in n8n

In raw LangChain a tool is a function. In n8n a tool can be a whole workflow, so it can:

- Branch on input (IF / Switch).
- Call multiple APIs and aggregate.
- Have its own retries, fallbacks, error handling.
- Call other sub-workflows.
- Read/write Data Tables.
- Be tested independently with `n8n_test_workflow` and pinned data.
- Be reused across agents AND non-agent workflows.

A function-as-tool can't do most of that without growing into a workflow anyway. n8n gives you the workflow primitive directly.

---

## The shape: two halves

### 1. The sub-workflow side — an Execute Workflow Trigger with typed inputs

```json
{
  "parameters": {
    "workflowInputs": {
      "values": [
        { "name": "imagePrompt", "type": "string" },
        { "name": "imageName",   "type": "string" },
        { "name": "sessionId",   "type": "string" }
      ]
    }
  },
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "typeVersion": 1.1,
  "name": "When Executed by Another Workflow"
}
```

Each declared input becomes a parameter the caller can fill. **The trigger must be in "Define Below" mode (typed fields), not passthrough** — passthrough has no schema, so the agent has nothing to fill via `$fromAI`. Two exceptions: (a) the sub-workflow needs binary (it can't be an agent tool directly — pre-stage to storage and pass storage keys as typed string fields, see **n8n-binary-and-data**), or (b) the tool takes no inputs at all (passthrough is the only option, and the tool's only decision is whether to invoke).

Type enforcement happens on the **agent side** via the `type` argument of `$fromAI`, not at the trigger. Allowed types: `string`, `number`, `boolean`, `json`. Match them.

### 2. The Tool Workflow side — points at the sub-workflow, binds params

```json
{
  "parameters": {
    "description": "Use to create a new image from a prompt OR edit an existing image. Pass imageName as the storage key (e.g. \"abc123.png\") to edit; leave empty to generate from scratch. Returns { imageUrl, imageKey }.",
    "workflowId": { "__rl": true, "value": "<sub-workflow-id>", "mode": "list" },
    "workflowInputs": {
      "mappingMode": "defineBelow",
      "value": {
        "imagePrompt": "={{ $fromAI('imagePrompt', 'Detailed prompt describing the desired image', 'string') }}",
        "imageName":   "={{ $fromAI('imageName', 'Storage key of an existing image to edit, or empty for new generation', 'string') }}",
        "sessionId":   "={{ $('Chat Trigger').first().json.sessionId }}"
      },
      "schema": [
        { "id": "imagePrompt", "displayName": "imagePrompt", "type": "string", "display": true },
        { "id": "imageName",   "displayName": "imageName",   "type": "string", "display": true },
        { "id": "sessionId",   "displayName": "sessionId",   "type": "string", "display": true }
      ]
    }
  },
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "typeVersion": 2.2,
  "name": "Generate or edit image"
}
```

Wire it into the agent with `ai_tool`:

```json
"Generate or edit image": {
  "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
}
```

The mapping is per-input:

- **Agent-filled**: `={{ $fromAI('paramName', 'description', 'string') }}` — the agent decides.
- **Plumbed**: `={{ $('SourceNode').first().json.field }}` — your workflow fills it.

The `sessionId` line is critical: it is **NOT** an agent decision. Plumb it from the trigger so memory and session-keyed work stay consistent. **Never put `sessionId` behind `$fromAI`** — the agent will fabricate a UUID.

---

## What the agent sees (and doesn't)

The agent sees the tool's **name** (the Tool Workflow node's name) and **description** (a parameter on the node) — both follow the **TOOLS.md** rules: specific, API-doc style, treated as prompt.

It does **not** see: the sub-workflow internals, the sub-workflow's own name, or plumbed values like `sessionId`. Only `$fromAI` parameters appear in the tool schema. So you can refactor the sub-workflow heavily without changing what the agent sees.

---

## Worked example: one tool, two modes

Goal: an agent that can generate or edit images. Both share most logic; they differ only in whether they download an existing image first.

```
[Execute Workflow Trigger: { imagePrompt, imageName, sessionId }]
   ↓
[Crypto: hash for new filename]
   ↓
[IF: imageName empty?]
   ├── empty (generate)     → [Gemini: generate] ──┐
   └── not empty (edit):                            │
       [S3: Download by imageName]                  │
          ↓                                         │
       [Gemini: edit with downloaded binary] ───────┤
                                                     ↓
                                            [S3: Upload result]
                                                     ↓
                                            [Set: { imageUrl, imageKey }]
```

The agent picks the mode by what it puts in `imageName`. Two near-identical tools would have made selection harder — collapse them.

---

## Patterns inside the sub-workflow

### Return a stable shape (it's a contract)

The caller receives whatever the last node outputs. Pick a shape and keep it across modes:

```json
{ "imageUrl": "https://...", "imageKey": "abc123.png" }
```

Don't sometimes return `{ url, key }` and other times `{ result: { url, key } }`. The output shape is a contract every caller depends on — agents read it as part of the prompt, deterministic callers wire downstream nodes to specific paths. Drift breaks callers silently.

For calls that fail "expectedly" (search with no results), return a branchable shape:

```json
{ "ok": false, "error": "no_results", "message": "No matches found for query" }
```

### When to throw instead: Stop and Error

For unexpected-but-handled errors (auth failure, upstream down, unrecoverable input), use a `Stop and Error` node with a detailed message. It propagates as a thrown error: agents see a tool error and can retry/switch/report; deterministic callers catch it via `onError: 'continueErrorOutput'`. Pick this over `{ ok: false }` when the outcome is a true error, not a normal branch. For the full error story (4xx/5xx mapping, retries, error workflows) → **n8n-error-handling**.

### Wire `onError: 'continueErrorOutput'` on fallible nodes

Inside the sub-workflow, fallible nodes (HTTP, S3, DB) should set `onError: 'continueErrorOutput'` and route to a clean error response, so both agent and deterministic callers receive a structured error instead of a silent halt.

### Treat the input contract as an API and document it

The Execute Workflow Trigger's declared inputs ARE this tool's API. Document them in the sub-workflow's `description`:

```
Generates or edits an image.
Inputs:
  imagePrompt (string, required): detailed image description.
  imageName   (string, optional): storage key of existing image to edit. Empty = new generation.
  sessionId   (string, required): chat session ID, used for storage keying.
Returns:
  { imageUrl, imageKey }
```

### Keep tool sub-workflows discoverable

Name them with a standard prefix (`Subworkflow:` or domain-specific). The Tool Workflow node references them by ID (stable), but humans browse the UI by name.

---

## Testing the sub-workflow independently

A sub-workflow tool can be tested without the agent:

1. Pin representative input on the Execute Workflow Trigger.
2. `n8n_test_workflow` runs it with that pinned data.
3. Verify the output shape matches what the agent will receive.

---

## When NOT to use sub-workflow as tool

- **Simple one-node wrappers** — "call this endpoint and return" is shorter as an HTTP Request Tool.
- **One-off code-only logic specific to this agent** — a few lines of pure JS/Python that exist nowhere else work fine as a Custom Code Tool (`.toolCode`, see **n8n-code-tool**). Decision rule: reusable business logic → sub-workflow; one-off agent-specific transform → Code Tool.
- **Capabilities that already exist as native tool nodes** — don't wrap `slackTool` in a sub-workflow.

For everything else, sub-workflow as tool is the default.

---

## Cross-references

- The four tool types overview → **TOOLS.md**
- How `$fromAI` descriptions affect behavior → **TOOLS.md** "`$fromAI()`"
- The sub-workflow primitive (stateless design, naming, I/O) → **n8n-subworkflows**
- Passing binary into tools → **n8n-binary-and-data**
- The Custom Code Tool exception → **n8n-code-tool**
