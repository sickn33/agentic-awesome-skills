---
name: n8n-subworkflows
description: Build reusable n8n sub-workflows with typed inputs, all-vs-each execution, discoverable naming, and agent-tool exposure.
risk: unknown
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/n8n-subworkflows
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# n8n Sub-workflows

## When to Use

Use this skill when shared or multi-step logic should become a typed reusable workflow, when an existing workflow is growing difficult to reason about, or when an agent needs a workflow exposed as a tool.

Preserve authentication and authorization boundaries when extracting logic. Do not place credentials in inputs or returned data, declare state-changing behavior explicitly, and ask before running or activating a sub-workflow that sends, writes, deletes, or calls a billable external service.

A sub-workflow is a reusable function. An **Execute Workflow Trigger** declares typed inputs, the body does the work, and the last node returns the output. A caller invokes it through an **Execute Workflow** node like any other step.

That framing buys you the things functions buy you everywhere: encapsulation, reuse, testability, replaceability. It's the primary reuse mechanism in n8n, and it's badly underused. Without it, the same logic gets copy-pasted across workflows — then a bug gets fixed in two places, the third copy gets missed, and your "identical" copies quietly drift apart.

This skill is about when to reach for a sub-workflow, how to define its input/output contract so callers (and agents) can actually use it, how to call it correctly (`all` vs `each`, blocking vs fire-and-forget), and how to name it so it gets found instead of rebuilt.

---

## The two non-negotiables

Everything else is judgement. These two are not.

### 1. Search before you build

Before you write logic for a generic problem, check whether a sub-workflow already does it. The community MCP can't filter workflows by tag, so the **name is the discovery surface**:

```
n8n_list_workflows()                          # scan the library
n8n_get_workflow({ id: "<candidate>" })       # read its inputs/outputs + body
```

If something fits, use it and tell the user ("I found `Subworkflow: Parse RFC2822 date` — using that"). If nothing fits, build it *with a discoverable name* so the next search finds it. The discovery convention (verb-first prefixes) lives in **references/NAMING_AND_DISCOVERY.md**.

### 2. The Execute Workflow Trigger uses "Define Below" with typed fields — not passthrough

The trigger has two input modes. **Default to "Define Below"** with explicit typed fields. Define Below is the only mode that gives callers a schema to fill — it's what lets an AI agent pass values via `$fromAI` and what lets structured callers map fields cleanly. Passthrough has no schema, so the trigger can't be wired as a clean agent tool and structured callers have nothing to bind to.

Two exceptions, and only two:

- **Binary input.** Typed fields are JSON-only. If the sub-workflow must receive an image/file/PDF, you need passthrough so the `binary` slot flows through.
- **Zero inputs.** Define Below requires at least one field. A genuinely no-arg operation ("list active credentials", "current count") has nowhere to put an empty schema, so passthrough is the only option.

Outside those two cases, passthrough is a bug. See "Inputs and outputs as a contract" below.

---

## Should this be a sub-workflow?

You're about to write a chunk of logic. Run it through this:

```
Could this plausibly be needed in another workflow?
  └─ Yes → extract.

Is it a generic concern (auth, retry, parsing, formatting, ID generation)?
  └─ Almost always → extract. These are the canonical reusable sub-workflows.

Is it >5 nodes and conceptually one thing?
  └─ Probably extract, even if reuse isn't certain. It's better isolated.

Is it one HTTP call with no logic around it?
  └─ Don't. A sub-workflow that's just trigger → HTTP → return adds a boundary
     for nothing.

Is it tightly coupled to this one caller's data shape?
  └─ Don't extract yet — fix the data shape first, or you just relocate the coupling.
```

The reasons to extract go beyond reuse:

- **Readability.** The caller shows one node ("Parse date") instead of five.
- **Testability.** Run the sub-workflow alone with pinned input (`n8n_test_workflow`).
- **Replaceability.** Swap the implementation without rippling to callers.

A 20-node workflow is fine *if it's mostly a linear sequence of Execute Workflow calls and decisions* — each node has one purpose, and you inspect a section by opening the sub-workflow it calls. A 20-node workflow of inline transformations is not fine. If yours has 15+ nodes and isn't mostly sub-workflow calls and branches, extract more.

---

## Stateless vs. stateful (deliberately)

Both are first-class. The choice is about intent and what the contract promises.

**Stateless** — input in, output out, no I/O beyond that. The default for pure logic. When you need it again, you call it without worrying about side effects firing.

- `Subworkflow: Parse RFC2822 date` — date string → ISO date or error.
- `Subworkflow: Compute MRR from subscription` — subscription object → number.
- `Subworkflow: Format invoice as HTML` — invoice data → HTML string.

**Stateful (deliberate)** — reads or writes external state *behind a clean contract*. This is the repository pattern: the sub-workflow abstracts the storage operation so callers think in domain terms, not SQL.

- `Customer: get by id` — id → customer object or `{ ok: false, error: "not_found" }`. Reads the DB.
- `Customer: write billing record` — record → `{ ok: true, id }`. Writes the DB.
- `Notify: send to on-call` — channel, message → `{ ok: true, messageId }`. Calls Slack/SMTP.

Why build these as sub-workflows: callers think `get customer by id` instead of writing the query; you can swap the store (Postgres → Supabase, native node → HTTP) without touching a single caller; and idempotency, retry, and validation get centralized in one place.

What to avoid is **accidental state** — a sub-workflow named and described as pure that quietly writes to a log table. That ambushes every caller who reasonably assumed it was safe to retry or compose. Either make the side effect part of the contract (rename it, document it, return its result) or move it out.

---

## Inputs and outputs as a contract

The trigger's declared fields and the last node's output shape *are* the sub-workflow's API. Treat them like one.

### Declaring typed inputs (Define Below)

Each declared input is a typed parameter the caller fills. Pick types deliberately (`string`, `number`, `boolean`, `array`, `object`) — an agent uses these as the required types when filling tool parameters, and humans rely on them when wiring callers. The trigger node parameters look like this:

```json
{
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "parameters": {
    "workflowInputs": {
      "values": [
        { "name": "list_of_ids",        "type": "array" },
        { "name": "include_transcript", "type": "boolean" },
        { "name": "session_id",          "type": "string" }
      ]
    }
  }
}
```

Inside the body, read them as `$json.list_of_ids`, or from anywhere downstream as `$('When Executed by Another Workflow').first().json.<field>` (see **n8n-expression-syntax**).

### The contract rules

- **Document inputs and outputs in the workflow `description`.** Field names, types, purpose, and a few representative keywords. The description is what callers (human and agent) read for the contract, and it's what `n8n_list_workflows` matches against.
- **Return consistent, natural shapes — not storage shapes.** A sub-workflow that owns a Data Table or an S3 file hides that representation from callers. Arrays return as arrays, objects as objects, dates as ISO strings — regardless of whether the underlying storage was JSON-stringified text. The return contract is the *interface*; the storage layout is *implementation detail*. Common slip: a sub-workflow with a "fresh" path (just-computed, natural shape) and a "cached" path (just read from a stringified column). Wrong instinct: stringify the fresh path to match the cached one. Right instinct: parse the cached path so both return the natural shape.
- **Return errors, don't always throw.** For *expected* failures (a parse error, a not-found), return `{ ok: false, error: "..." }` so the caller can branch without wiring an error output. Reserve throwing for genuinely unexpected failures — see **n8n-error-handling**.
- **The contract is frozen once it has callers.** Adding *optional* fields is safe. Renaming or removing a field is dangerous: n8n won't error on an unrecognized input field — the body just sees `undefined`, the caller has no idea, and you get a silent contract break. To change a field, enumerate every caller (`n8n_list_workflows` + inspect each one's Execute Workflow node), migrate them in the same change, and verify with `validate_workflow` and `n8n_get_workflow` before you're done.

### The final Return node — the legitimate Set exception

Shape the output with a final **Set / Edit Fields** node, named `Return` or `Return <thing>`. This is the one place a Set node earns its keep against the usual "don't add a trailing Set node" advice from **n8n-expression-syntax**: the implicit consumer of a sub-workflow's last node is *every caller*, so an explicit Set makes the return contract visible — a reader sees the whole API by reading one node, and you strip any noise fields the last computation node carried.

---

## Calling sub-workflows: `mode` and `waitForSubWorkflow`

Two settings on the caller's **Execute Workflow** node decide how the sub-workflow runs.

### `mode`: `all` vs `each`

| `mode` | Sub-workflow runs | Items per run |
|---|---|---|
| `all` (default) | once | all N items (flowing per-item through nodes as usual) |
| `each` | N times | exactly one item per run |

For a body that just processes items the normal way, the two are equivalent — n8n nodes iterate per-item either way. **The split only matters when the body assumes it sees exactly one item**: a per-run aggregation, "this is THE customer to act on" logic, or a final write that should fire once per input. With `all`, that body gets all N items at once and the assumption breaks (you aggregate everyone into one result instead of one-per-input). With `each`, each invocation gets one item and the assumption holds.

So: when you need per-item iteration, prefer `mode: each` over dropping a Loop Over Items node *inside* the sub-workflow. The mode does the iteration for you, and the body stays simple and single-item.

### `waitForSubWorkflow`: `true` vs `false`

`waitForSubWorkflow` defaults to `true` — the caller blocks until the sub-workflow returns, then continues with its output. Set `options.waitForSubWorkflow: false` to fire-and-forget: the call dispatches, the caller moves on immediately, the sub-workflow runs in the background, and downstream sees no return data.

### The only true parallelization n8n offers

`mode: each` + `waitForSubWorkflow: false` is **the only way to get genuinely concurrent sub-workflow execution**: N items dispatch N runs that execute in parallel (still bounded by per-instance concurrency limits). The caller doesn't know when — or whether — any of them finished, so it's only useful with a separate completion-tracking mechanism, typically a Data Table the sub-workflow updates as it progresses. The full stage → dispatch → poll pattern is in **references/SUBWORKFLOW_PATTERNS.md** ("Fire-and-forget parallelization").

---

## Splitting by input shape (the N+1 pattern)

When a sub-workflow has multiple input paths whose contracts *genuinely* differ — binary vs JSON, sync vs async, divergent auth schemes — don't cram them under one trigger with passthrough + an internal Switch. The forcing function is real: passthrough (for binary or zero-input) and Define Below (for typed inputs) are mutually exclusive on a single trigger. The reflex to "pick passthrough because it's most permissive, then branch inside" costs you the typed schema (no clean agent tool), grows branch-shape cruft, and turns every new input shape into more branching.

The fix: for N divergent input contracts, build **N+1 sub-workflows** — one outer per contract, each doing its input-specific prep (validation, fetching, hashing, extraction) and calling **one shared downstream** sub-workflow with a normalized shape. The shared core has a single typed input contract and knows nothing about which outer called it. The worked example (process a paper from an external ID *or* an uploaded PDF) is in **references/SUBWORKFLOW_PATTERNS.md**.

---

## Sub-workflow as an agent tool

A sub-workflow with a typed Define Below trigger doubles as an AI-agent tool: the agent fills the declared fields via `$fromAI`, the body runs, the result comes back as the tool observation. This is the high-value reason to default to Define Below — passthrough triggers can't expose a fill-able schema.

The zero-input case still works as a tool: the agent's only decision is whether to invoke. The binary case does *not* wire cleanly as a tool, because agents can't pass binary directly.

For tool naming, descriptions, and the binary-input workaround, see **n8n-agents**; for the binary handling itself, **n8n-binary-and-data**.

---

## Anti-patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| Duplicating the same logic in three workflows | A bug gets fixed in two places, the third drifts | Extract once to a named sub-workflow |
| Building a new sub-workflow without searching | The library grows duplicates; future searches find both | `n8n_list_workflows` / `n8n_get_workflow` first |
| Trigger set to passthrough when not handling binary and not zero-input | No schema → agents can't fill params, structured callers can't bind | Use Define Below with typed `workflowInputs.values` |
| Zero-input passthrough with no clear-and-document | Body silently reads stray fields from whatever the caller forwarded | Start with a Set ("Keep Only Set", no fields) and a sticky noting "no inputs expected" |
| Sub-workflow named/described as pure that quietly writes state | Callers can't reason about retry/idempotency; the side effect ambushes them | Make the side effect part of the contract, or move it out |
| Sub-workflow with no `description` | Won't be found in future searches; nobody knows what it does | Set `description` with input/output shape + keywords |
| Name like `Helper 3` / no prefix | Doesn't say what it does, matches no prefix search | Verb-first prefix (`Subworkflow:`, `<Domain>:`, `Tool:`) |
| `mode: all` on a body that assumes one item | Aggregates all inputs into one result instead of one-per-input | `mode: each` (and skip the internal Loop Over Items) |
| Renaming a live input field without migrating callers | Callers send the old name → body sees `undefined`, no error anywhere | Migrate every caller in the same change; verify with `validate_workflow` |
| 30-node workflow with no extraction | Hard to read, test, and replace | Extract logical sections into sub-workflows |

---

## What's NOT available via the community MCP

| Want to do | Reality |
|---|---|
| Filter/discover workflows by **tag** | The MCP can't read or filter by tags (UI-only). Discovery is the *name* — use verb-first prefixes and `n8n_list_workflows`. |
| Catch an **unrecognized input field** | n8n doesn't error on one. The body sees `undefined` and the caller never knows — a silent contract break. Verify field renames by hand across callers. |
| Set the input mode / fields without a typed trigger | The trigger node itself must declare `workflowInputs.values`. Configure it with `n8n_update_partial_workflow` (`updateNode` / `patchNodeField`); validate with `get_node` / `validate_node`. |

What the MCP **can** do: build the sub-workflow and its callers (`n8n_update_partial_workflow` with `addNode` / `addConnection` / `updateNode` / `patchNodeField`), discover existing ones (`n8n_list_workflows`, `n8n_get_workflow`), validate (`validate_workflow`, `n8n_validate_workflow`), test in isolation (`n8n_test_workflow`), inspect runs (`n8n_executions`), back a stateful sub-workflow with a Data Table (`n8n_manage_datatable`), and activate (`activateWorkflow`).

---

## Reference files

| File | Read when |
|---|---|
| **references/SUBWORKFLOW_PATTERNS.md** | `mode: all` vs `each` in depth, splitting by input shape (the N+1 worked example), fire-and-forget parallelization with Data Table polling |
| **references/NAMING_AND_DISCOVERY.md** | Naming a new sub-workflow, the verb-first prefix convention, searching for existing ones, writing a discoverable description |

---

## Integration with other skills

- **n8n-workflow-patterns** — use it for the overall shape of the orchestrating workflow; use this skill to decide which sections become sub-workflows.
- **n8n-mcp-tools-expert** — parameter formats for `n8n_list_workflows`, `n8n_get_workflow`, `n8n_update_partial_workflow`, and `n8n_manage_datatable` (the Data Table behind a stateful sub-workflow and the fire-and-forget poll).
- **n8n-node-configuration** — `workflowInputs` and the `inputSource` (Define Below vs passthrough) toggle are displayOptions-driven config on the Execute Workflow Trigger.
- **n8n-expression-syntax** — reading inputs (`$json`, `$('When Executed by Another Workflow')`) and the legitimate final-Set exception both live here.
- **n8n-error-handling** — expected failures return `{ ok: false, error }`; unexpected ones throw and route through error outputs. A sub-workflow boundary is a natural place to define that line.
- **n8n-validation-expert** — validate the sub-workflow and its callers; an unrecognized input field won't surface here, so verify field changes manually.
- **n8n-code-javascript / n8n-code-python** — when a sub-workflow's body is a single Code node, its contract is still the trigger's typed inputs and the returned shape, not the Code node's internals.
- **n8n-code-tool** — the Custom Code Tool is the *inline* agent-tool option; a sub-workflow tool is the reusable, multi-step one. Pick the sub-workflow when the logic is shared across agents or needs the full Code-node sandbox.
- **n8n-agents** — wiring a typed sub-workflow as an agent tool, including the zero-input and binary cases.
- **n8n-binary-and-data** — passthrough triggers for binary input, and why binary can't flow through an agent tool directly.
- **using-n8n-mcp-skills** — when to consult which skill across a build.

---

## Quick reference checklist

Before shipping a sub-workflow:

- [ ] **Searched first** with `n8n_list_workflows` / `n8n_get_workflow` — it doesn't already exist
- [ ] **Trigger uses Define Below** with typed `workflowInputs.values` (unless binary or zero-input)
- [ ] **Zero-input passthrough** (if used) starts with a "Keep Only Set" Set node + a sticky noting no inputs
- [ ] **Name** has a verb-first prefix (`Subworkflow:`, `<Domain>:`, `Tool:`)
- [ ] **Description** documents input/output shape and carries searchable keywords
- [ ] **Returns a natural, consistent shape** via a final `Return` Set node — not a storage shape
- [ ] **Expected failures** return `{ ok: false, error }`; only unexpected ones throw
- [ ] **Caller `mode`** is `each` if the body assumes a single item (not an internal Loop Over Items)
- [ ] **`waitForSubWorkflow`** is set deliberately (`false` only with a completion-tracking mechanism)
- [ ] **Stateful sub-workflows** declare their side effect in name + description — no accidental state
- [ ] **Validated** with `validate_workflow`; tested in isolation with `n8n_test_workflow`

---

**Remember**: a sub-workflow is a function. Its API is the trigger's typed inputs and the last node's output shape — make both explicit, name it so it's found, and call it with the `mode` its body expects. A passthrough trigger that isn't for binary or a zero-arg op, or a name nobody can search, is how a reusable function quietly becomes the next duplicate.

## Limitations

- Validation does not detect every caller contract mismatch, side effect, or item-linking error.
- Tags and some workflow settings remain UI-only and may not be discoverable through the connected MCP server.
- Refactoring shared logic requires checking every caller; this skill cannot prove that external callers were migrated.
