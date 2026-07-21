# Merge for Keeping Binary in Context

A common, maddening bug: an item carries both `json` and `binary`, it runs through a JSON-only node (Edit Fields, Code, IF), the binary slot quietly disappears, and the email node three steps later has nothing to attach. No error, no validation warning — just a missing file.

The fix is to keep the binary on a branch that doesn't touch it, and recombine. This is the same Merge node covered in **n8n-node-configuration**'s gotchas; here it's used specifically to re-attach binary.

## Contents

- [The pattern](#the-pattern)
- [Wiring it with n8n-mcp](#wiring-it-with-n8n-mcp)
- [Configuring the Merge](#configuring-the-merge)
- [Why it works](#why-it-works)
- [Cheaper alternative: pass-through on the transform](#cheaper-alternative-pass-through-on-the-transform)
- [When Merge isn't enough](#when-merge-isnt-enough)
- [Verifying after merge](#verifying-after-merge)
- [Common mistakes](#common-mistakes)

---

## The pattern

Split the stream at the source: one branch does the JSON work, the other carries the original item (binary intact) untouched. Merge them back.

```
[Source with binary] ─┬─→ [Edit Fields: change JSON] ─┐
                      │      (binary stripped here)     │
                      │                                 ├─→ [Merge: combineByPosition] ─→ [Email: attach]
                      │                                 │
                      └──────────────────────────────────┘
                          (bypass — binary passes through unchanged)
```

- **Transform branch:** does the JSON work; may lose binary. That's fine — this branch only contributes the JSON.
- **Bypass branch:** the original item, with binary. No node needed; just route the connection straight into the Merge.

The merged item gets its JSON from the transform branch and its binary from the bypass branch.

---

## Wiring it with n8n-mcp

The source already feeds the transform branch. You add the bypass connection and the Merge with `n8n_update_partial_workflow`:

```json
{
  "operations": [
    { "type": "addNode", "node": {
        "name": "Merge",
        "type": "n8n-nodes-base.merge",
        "parameters": { "mode": "combine", "combineBy": "combineByPosition" }
    }},
    { "type": "addConnection", "source": "Edit Fields", "target": "Merge", "targetInput": 0 },
    { "type": "addConnection", "source": "Source",      "target": "Merge", "targetInput": 1 },
    { "type": "addConnection", "source": "Merge",       "target": "Send Email" }
  ]
}
```

The exact parameter names (`mode`, `combineBy`, `combineByPosition`, and how `numberOfInputs` is expressed) have shifted across Merge node versions — confirm the current shape with `get_node` on `nodes-base.merge` for the user's version before committing the structure. The principle is stable; the field names move.

Two wiring details that bite (both detailed in **n8n-node-configuration**'s Merge section):

- The Merge defaults to **2 inputs**. If you wire 3+ branches, set the input count to match or the extra branch silently drops.
- Connection input indexes are **0-based**. The bypass branch above lands on `targetInput: 1` (the second input).

---

## Configuring the Merge

For re-attaching binary, you want position-based combination:

| Mode | What it does | Use for binary re-attach? |
|---|---|---|
| `combineByPosition` | Pairs item N from input 1 with item N from input 2 | ✅ Yes |
| `combineBySql` / `combineByFields` | Joins on a key | Only if the two branches share a join key |
| `combineAll` | Cartesian product (N×M items) | ❌ No — explodes the item count |
| `append` | Concatenates inputs end to end | ❌ No — doesn't pair items |

`combineByPosition` is the right default: it keeps the item count at N and pairs each transformed JSON item with its corresponding binary-bearing original. For this to work, both branches must emit items in the same order and count — which they do when they share a single source.

---

## Why it works

A Merge combines both `json` and `binary` from the items it pairs. When one input holds the JSON you want and the other holds the binary you want, the merged item carries both. The binary survives because it traveled on the branch that never touched it.

---

## Cheaper alternative: pass-through on the transform

If the transforming node can preserve binary itself, do that instead — it's one node, not three:

- **Edit Fields (Set):** enable `includeOtherFields` so the node carries unmentioned fields and the binary slot forward.
- **Code node:** return `binary: $input.item.binary` explicitly in the returned item (see `BINARY_BASICS.md`).
- **IF / Filter:** these route items rather than rebuild them, and generally preserve binary on the items they pass — but verify in the execution rather than assuming.

Reach for Merge only when the transforming node genuinely can't carry the binary, or when the JSON and binary come from genuinely different upstream nodes.

---

## When Merge isn't enough

If the chain has many strip points, threading binary through all of them — and Merging at each one — becomes more work than it's worth. Two better routes:

- **Upload early.** Push the bytes to object storage as soon as they exist, carry the URL/key as plain JSON through the whole chain (JSON survives every transform trivially), and re-fetch only at the node that needs the bytes. This is also the right move for large files (see `BINARY_BASICS.md`).
- **Push the binary work into a sub-workflow.** Hand the file to a sub-workflow that does the binary handling and returns the final result. The Execute Workflow Trigger's input mode matters: the default typed-input mode carries only named JSON fields and drops `$binary`, so use the passthrough input mode if the sub-workflow must receive bytes directly.

Past a couple of strip points, one of these is usually less work — and less fragile — than keeping every node in a long chain honest about binary.

---

## Verifying after merge

A merged-but-missing binary won't show in validation. Confirm in the execution:

1. Run with `n8n_test_workflow`, then pull the execution with `n8n_executions`.
2. On the Merge node's output, check the merged item has the `json` from the transform branch **and** the `binary` from the bypass branch.
3. If binary is missing: check the Merge mode (some modes don't pair the way you expect) and confirm the bypass branch actually carried binary into the Merge in the first place.

---

## Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Noticing the strip too late | The original binary is already gone | Inspect the execution after each node during development |
| "Merging" a single-source chain with no bypass | Nothing to merge with; binary still missing | Split the stream at the source so binary rides a bypass branch |
| `combineAll` where you meant `combineByPosition` | N×M items instead of N | Choose the mode deliberately |
| Bypass branch on the wrong input index | Wrong pairing, or the branch drops | Connections are 0-based; verify with `n8n_get_workflow` |
| Forgetting to raise the Merge input count past 2 | A third branch silently drops | Set the input count to match the wired branches |
