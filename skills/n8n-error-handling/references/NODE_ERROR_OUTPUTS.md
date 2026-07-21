# Per-Node Error Outputs

This file is about the **error output on a single node** — the second `main` output that fires when that node throws — and the two-step setup that trips up nearly everyone. For the workflow-level catch-all (Error Trigger workflows) and the webhook/Respond shape, see the rest of `n8n-error-handling`.

The whole point: a node failing should route somewhere *you* control, instead of halting the run. The cost of forgetting half the setup is one of the worst silent-failure modes in n8n — a run that shows green while quietly dropping its work.

---

## The two-step setup (both are required)

Routing a node's failure takes exactly two changes. Either one alone looks finished and misbehaves.

### Step 1 — create the error output

Set `onError: "continueErrorOutput"` on the node. This is what *adds* the second output. Until you do, `main[1]` does not exist and nothing you wire to it can fire.

```javascript
{ type: "updateNode", nodeName: "Google Sheets",
  changes: { onError: "continueErrorOutput" } }
```

Surgical alternative if you're touching only this field:

```javascript
{ type: "patchNodeField", nodeName: "Google Sheets",
  fieldPath: "onError", value: "continueErrorOutput" }
```

The valid `onError` values:

| Value | Effect |
|---|---|
| `"stopWorkflow"` (default) | Error halts the whole workflow. The right default for runs you watch. |
| `"continueRegularOutput"` | The error item flows out the **normal** output (`main[0]`) alongside successes. Rare and usually a mistake — downstream gets error-shaped data and keeps going. |
| `"continueErrorOutput"` | The error item flows out a **separate** error output (`main[1]`). This is the one you wire below. |

### Step 2 — wire the error output

With `onError: "continueErrorOutput"`, the node has two outputs:

- `main[0]` → success path (`sourceIndex: 0`)
- `main[1]` → error path (`sourceIndex: 1`)

Wire the error output to a real handler:

```javascript
{ type: "addConnection",
  source: "Google Sheets",
  target: "Handle Error",
  sourceIndex: 1 }
```

`sourceIndex: 1` is the error output. (IF nodes accept the friendly aliases `branch: "true"`/`branch: "false"` for index 0/1; a generic fallible node has no such alias — use the explicit `sourceIndex: 1`.)

---

## Failure modes — why "one of two" is so dangerous

### `onError` set, error output NOT wired

```javascript
// onError: "continueErrorOutput" set on the node,
// but no addConnection from sourceIndex 1.
```

On failure the node emits to `main[1]`, which has **no targets**. The error data is silently discarded, downstream never fires, and — this is the trap — the execution is recorded as **succeeded**, because from n8n's perspective the error was "handled" by a branch that happens to go nowhere. No failed execution logged, nothing in the dashboard. The integration "just stops working" and there's no trail.

**Fix:** wire `sourceIndex: 1` to a real handler, *or* set `onError` back to `"stopWorkflow"` so the failure is loud again.

### Error output wired, `onError` NOT set

```javascript
// addConnection from "Some Node" sourceIndex 1 → "Handle Error" exists,
// but the node still has the default onError: "stopWorkflow".
```

The connection sits in the JSON, but the slot it feeds from never fires. The handler is unreachable. On failure the workflow simply **halts** (default behavior). Less dangerous than the first mode — at least it's loud — but the handler you built does nothing.

**Fix:** set `onError: "continueErrorOutput"` on the node.

### Why validation won't save you

A half-wired error output **validates clean**. `validate_workflow` and `n8n_validate_workflow` don't flag "`onError` is set but `main[1]` is empty" or vice versa — both are structurally legal. This is a runtime behavior, not a schema violation. The only reliable check is to read the workflow back (see Verification below).

---

## Common wiring shapes

### Single fallible node → error handler

```javascript
// Node config: onError: "continueErrorOutput"
{ type: "addConnection", source: "HTTP Request", target: "Respond Error", sourceIndex: 1 }
```

### Success path fans out, error path goes elsewhere

```javascript
{ type: "addConnection", source: "HTTP Request", target: "Save Result",  sourceIndex: 0 }
{ type: "addConnection", source: "HTTP Request", target: "Notify Slack",  sourceIndex: 0 }
{ type: "addConnection", source: "HTTP Request", target: "Respond Error", sourceIndex: 1 }
```

### Multiple fallible nodes → one shared error handler (fan-in)

```javascript
// Each of these nodes needs onError: "continueErrorOutput" on its own config.
{ type: "addConnection", source: "Fetch User",     target: "Respond Error", sourceIndex: 1 }
{ type: "addConnection", source: "Call External",  target: "Respond Error", sourceIndex: 1 }
{ type: "addConnection", source: "Write Database", target: "Respond Error", sourceIndex: 1 }
```

Fan-in keeps the graph readable: one error responder, many sources. The handler can inspect which node failed (the error payload carries the failing node's name) to differentiate the response.

### Both log AND respond on the same failure

Wiring the error output to two targets composes without conflict — both receive the error data:

```javascript
{ type: "addConnection", source: "Call External", target: "Log Full Error", sourceIndex: 1 }
{ type: "addConnection", source: "Call External", target: "Respond Error",  sourceIndex: 1 }
```

Useful when you want a sanitized response *and* a private full-detail log on the same failure. (Or chain them: error output → Log → Respond, so the log runs first.)

---

## What counts as "fallible"

Wire an error output on anything that can throw at runtime:

- Network calls — HTTP Request, third-party API nodes, databases.
- Auth failures — expired credential, rotated token.
- Schema mismatches — missing DB column, JSON parse failure.
- Rate limits — 429 from upstream (configure `retryOnFail` first so these self-heal).
- File/binary operations — missing path, permission denied (see **n8n-binary-and-data**).
- Code nodes that can throw.

Usually **not** worth an error output:

- Set / Edit Fields on already-validated data.
- IF / Switch with simple expressions — if those throw it's a bug to fix, not a path to catch.
- Pure transformations with no I/O.

When unsure, wire it. The cost is one connection; the cost of not wiring it is a silent halt.

---

## Verification (do this every time)

After any create/update, pull the workflow with `n8n_get_workflow` and check **both halves** on each fallible node:

1. **Node config** — `onError` is `"continueErrorOutput"` (or whatever you intended).
2. **Connections** — `connections["<node>"].main[1]` contains the expected handler(s).

If either half is missing, you have a silent-failure setup. Fix before activating.

`n8n_autofix_workflow` can repair some structural issues, but it won't infer that you *meant* to wire an error path — the intent to handle a given node's failure is yours to express. Treat the read-back as mandatory.

---

## When to use an error workflow instead

Per-node outputs handle the failure of *one node you remembered to wire*. They do **not** catch:

- Failures on nodes you forgot to wire.
- Crashes between nodes.
- Whole-workflow timeouts.
- Trigger failures.

For those, you need a workflow-level **error workflow** (Error Trigger node). And note the inverse: a per-node error output that's wired to a no-op which drops the data counts as "handled" — so it will *suppress* the error workflow. Only catch per-node when you're genuinely acting on the error. See **ERROR_WORKFLOWS.md**.
