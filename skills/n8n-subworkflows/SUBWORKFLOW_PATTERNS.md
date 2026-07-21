# Sub-workflow patterns

Three n8n-specific patterns that don't fall out of the "should this be a sub-workflow?" decision tree: choosing `mode: all` vs `each`, splitting one capability into N+1 sub-workflows when its input contracts diverge, and using fire-and-forget to get real parallelism.

---

## `mode: all` vs `each`

The caller's Execute Workflow node has a `mode` that controls how items reach the sub-workflow.

| `mode` | Sub-workflow runs | Items per run |
|---|---|---|
| `all` (default) | once | all N items, flowing through nodes per-item as usual |
| `each` | N times | exactly one item per run |

For a body that just processes items the ordinary way — map, filter, transform — the two are equivalent, because n8n nodes iterate per-item regardless of how many items arrived.

The split matters in exactly one situation: **the body assumes it sees exactly one item.** Three telltales:

- **Per-run aggregation.** A node like "sum these line items" or "build one report from these rows" produces a single output from whatever items it sees. Under `mode: all` it sees all N inputs and produces *one* aggregate across everyone. Under `mode: each` it runs N times and produces one aggregate *per input* — which is almost always what a per-customer / per-order body means.
- **"This is THE thing to act on" logic.** A body written around a single entity (`$json.customer_id`, "send this one email") silently operates on only the first item, or mis-aggregates, when handed N at once.
- **A final write that should fire once per input.** An insert/update meant to run once per record fires once total under `all`.

### Worked contrast

A sub-workflow `Customer: build monthly summary` whose body groups orders and emits one summary row.

- **Called with `mode: all`** on 50 customers' orders → the grouping node sees all orders at once and emits *one* summary blending all 50 customers. Wrong.
- **Called with `mode: each`** → 50 runs, each handed one customer's orders, each emitting that customer's summary. Right.

### Prefer `each` over an internal Loop Over Items

When you need per-item iteration, let the caller's `mode: each` do it rather than dropping a **Loop Over Items** node inside the sub-workflow. Reasons:

- The body stays single-item and simple — no batch-cursor logic, no cross-iteration state to manage.
- The contract reads as "give me one item, I act on it", which is also exactly the agent-tool contract.
- You avoid the classic SplitInBatches gotchas (see **n8n-code-javascript**) inside a workflow that's supposed to be a clean function.

Reach for an internal loop only when iteration is genuinely part of the body's own job (e.g. paginating an API until exhausted), not when it's just "do this body once per input".

---

## Splitting by input shape

**Principle:** when one capability has multiple input paths whose contracts *genuinely* differ, split into one outer sub-workflow per contract, all calling a shared downstream sub-workflow for the common work.

The forcing function is structural in n8n: on a single Execute Workflow Trigger, **passthrough** (required for binary, and the only option when the sub-workflow takes no inputs) and **Define Below** (required for typed inputs that agents and structured callers can fill) are mutually exclusive. You can't have both on one trigger, so divergent contracts can't share one cleanly.

Common cases where contracts genuinely differ:

- **Binary vs non-binary input** (the canonical one — typed fields are JSON-only).
- **Sync vs async paths** with different return contracts.
- **Different auth schemes per path.**

If the body opens with a top-level IF/Switch on *which input shape arrived*, that branch is the seam where two sub-workflows want to separate.

### The reflexive mistake

Faced with two divergent input shapes, the reflex is:

1. Pick passthrough (most permissive — it supports binary).
2. Branch internally on a flag.
3. Accept the loss of typed inputs.

Why it's wrong:

- The workflow can't be exposed as a clean agent tool — passthrough has no `$fromAI` schema.
- Body-shape branches accumulate ("in case A this field is set, in case B it's empty…").
- A future third input shape means *more* branching, not a clean third sub-workflow.

### The fix: N+1 sub-workflows

For N divergent input contracts, build **N+1** sub-workflows: one *outer* per contract, plus one *shared downstream* for the common work. Each outer does its input-specific prep — validation, fetching, normalization, hashing, extraction — and calls the shared core with a normalized shape. The shared core has a single typed input contract and knows nothing about which outer called it.

### Worked example

A "process this paper" capability that arrives either as an external ID *or* as a user-uploaded PDF:

```
Subworkflow: Process Paper from External ID
  Trigger: Define Below { arxivId: string, source: string }
    → [validate ID, dedup, fetch metadata, download PDF, extract text]
    → [Execute Workflow → "Subworkflow: Summarize and Store Paper"]
        with { arxivId, title, authors, body, source, ... }

Subworkflow: Process Paper from Uploaded PDF
  Trigger: Passthrough   (required — binary flows through)
    → [hash binary for a synthetic ID, dedup, extract text]
    → [Execute Workflow → "Subworkflow: Summarize and Store Paper"]
        with { arxivId: "<synthetic>", title, body, source: "upload", ... }

Subworkflow: Summarize and Store Paper           ← the shared core
  Trigger: Define Below { arxivId, title, body, source, ... }
    → [LLM with structured output → Data Table insert → Return result]
```

The "pull" path (look up by ID) and the "push" path (data already in hand, here as binary) each get their own typed-or-passthrough trigger, and converge on one typed core. Add a third input shape later and you add a third outer — not a third branch.

The pattern generalizes: any time a capability has both a pull path (look up by ID) and a push path (caller already holds the data, including binary or a template), the split applies. For the binary-handling specifics, see **n8n-binary-and-data**; for wiring the typed outer as an agent tool, **n8n-agents**.

---

## Fire-and-forget parallelization

`mode: each` + `options.waitForSubWorkflow: false` is the only way to get genuinely concurrent sub-workflow execution in n8n. N input items dispatch N sub-workflow runs that execute in parallel (bounded by per-instance concurrency limits).

The catch: the caller doesn't know when — or whether — any of them finished. So this only works with a **separate completion-tracking mechanism**, typically a Data Table the sub-workflow writes to as it progresses (manage it with `n8n_manage_datatable` — see **n8n-mcp-tools-expert**).

### The pattern

1. **Stage.** Insert one "in progress" row per parallel job, keyed by a run ID + a per-job sub-key.
2. **Dispatch.** Call Execute Workflow with `mode: each` and `options.waitForSubWorkflow: false`. The caller continues immediately.
3. **Each sub-workflow.** Does its work, then updates *its* row — `status: completed` / `error`, plus output.
4. **Poll.** The caller enters a loop:
   - Get all rows for this run ID.
   - If all rows are in a terminal status → exit and aggregate.
   - Else if the runtime cap is exceeded → mark the rest `timeout` and exit.
   - Else → Wait N seconds, loop back to the Get.

```
[Source: N items]
  → [Data Table: insert N rows, status = "inProgress"]
  → [Execute Workflow]                 # mode: each, waitForSubWorkflow: false
  → [Data Table: get rows for this run]
  → [IF all terminal?]
      ├── Yes → continue, aggregate
      └── No  → [IF under runtime cap?]
                 ├── Yes → [Wait N s] → loop back to the Get
                 └── No  → [update remaining rows → "timeout"] → continue
```

If a sub-workflow crashes without updating its row, the poll sees `inProgress` past the runtime cap and times it out — so a dead job can't hang the loop forever.

### When it earns its place

- **Long per-item work** (LLM calls, large media, slow APIs) where serial would take hours.
- **Independent jobs** that can each complete or fail without affecting the others.
- **You can afford eventual consistency** — the poll loop adds latency by design.

### When it's the wrong tool

- **Short per-item work** (under a second or two): default per-item iteration is simpler.
- **Latency doesn't matter:** the extra complexity and fragility isn't worth it.
- **Jobs depend on each other's output:** use sequential `mode: each` with `waitForSubWorkflow: true` instead.
- **Strict ordering matters:** parallel dispatch gives up ordering.

Pair the per-job error handling (the row's `error` status) with **n8n-error-handling** so a failed job is recorded, not just silently absent.
