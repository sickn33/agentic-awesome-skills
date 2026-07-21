# Node Family Gotchas

Silent-failure traps grouped by node family. These don't show up in `validate_node` or `validate_workflow` — the workflow validates clean, runs without error, and quietly does the wrong thing. `get_node` shows you the fields exist; it doesn't tell you what happens when you leave them off. This file covers the consequence.

Each entry: **symptom** (what you see at runtime), **cause** (why), **fix** (in n8n-mcp / JSON terms).

## Contents

- [Switch — dropped items on the unmatched path](#switch)
- [Merge — wrong input count and the 1-vs-0 index trap](#merge)
- [Database (Postgres / MySQL / Supabase) — SQL injection, transactions, no-rows](#database)
- [Slack — Block Kit, threads, operation values](#slack)
- [Webhook / Respond to Webhook — response codes and modes](#webhook--respond-to-webhook)
- [Schedule Trigger — timezone, cron fields, missed runs](#schedule-trigger)

---

## Switch

**Symptom:** items that match none of the rules vanish. No error, no warning — the workflow just loses data on the unmatched path.

**Cause:** without a fallback output, the Switch has nowhere to send unmatched items, so it discards them.

**Fix:** set `options.fallbackOutput: "extra"` and give it a name with `options.renameFallbackOutput`. While you're there, name every rule output too — unnamed `0 / 1 / 2` outputs are unreadable a month later, and a failure on "output 2" tells the operator nothing.

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        { "outputKey": "Paid", "renameOutput": true, "conditions": { "...": "..." } },
        { "outputKey": "Refunded", "renameOutput": true, "conditions": { "...": "..." } }
      ]
    },
    "options": {
      "fallbackOutput": "extra",
      "renameFallbackOutput": "Unexpected"
    }
  }
}
```

Apply surgically with `patchNodeField` on `parameters.options.fallbackOutput`, or with `updateNode` for the full `options` object. After wiring, confirm the fallback branch goes somewhere real (a log, an alert, a NoOp) — an enabled fallback that connects to nothing drops items just the same.

---

## Merge

Two traps, both silent. They live on different Merge modes — `numberOfInputs` on Append/Combine, `useDataOfInput` on Choose Branch — so in practice you hit one or the other, not both.

### Trap 1: input count defaults to 2

**Symptom:** you wire 3+ sources into a Merge, the canvas shows three wires going in, the workflow validates and runs — but only the first two sources' items appear downstream. The third silently drops.

**Cause:** `numberOfInputs` defaults to `2`. The third wire connects to an input slot that doesn't exist on the node.

**Fix:** set `numberOfInputs` to match your wire count.

```json
{ "parameters": { "mode": "append", "numberOfInputs": 3 } }
```

Verify with `get_node` for the merge node on the user's n8n version — the field name has shifted across versions. After building, pull the workflow with `n8n_get_workflow` and confirm `parameters.numberOfInputs` matches the number of source entries in the `connections` object feeding it.

### Trap 2: `useDataOfInput` is 1-indexed, connections are 0-indexed

**Symptom:** the Merge passes through the wrong source. Downstream gets real data with real field names — just from the wrong upstream branch. Looks identical to a working flow; the shape is right, the contents are wrong.

**Cause:** `parameters.useDataOfInput` matches the UI labels (Input 1, Input 2, Input 3 — **1-indexed**), but the wiring position in `connections.<source>.main[idx]` is **0-indexed** like every other array. Off by one.

**Fix — the translation rule:**

> `useDataOfInput: "N"` is fed by the connection at `main[N-1]`.

| `useDataOfInput` | Connection slot |
|---|---|
| `"1"` | `connections.<source>.main[0]` |
| `"2"` | `connections.<source>.main[1]` |
| `"3"` | `connections.<source>.main[2]` |

When you add the connection via `n8n_update_partial_workflow`, the `addConnection` operation targets a specific input index. To pass through Input 2, the source whose data you want must land on the connection at `main[1]`. After wiring, **verify with `n8n_get_workflow`**: read the `connections` object and confirm the source you intend to pass through actually sits at `main[N-1]`. This is the only reliable check — it won't surface in validation.

---

## Database

Covers Postgres, MySQL, and Supabase (when used via the Postgres node against the same database). The exact field set differs per node and version — `get_node` is canonical. This is the security and behavior layer it doesn't show.

### Never interpolate user input into SQL

**Symptom:** the query works in testing, then a value containing a quote or `;` produces a SQL error — or worse, executes injected SQL. `$json.email = "x'; DROP TABLE users; --"` is game over.

**Cause:** n8n substitutes `{{ ... }}` expressions into the query text **before** the database driver binds parameters. Anything inside `{{ }}` becomes part of the SQL itself, not a bound value.

**Fix:** use `$1, $2, ...` placeholders in the query and pass values through `options.queryReplacement`. The values flow through the driver's parameter binding and never touch the SQL text. (The n8n MySQL node also uses `$1, $2` + `queryReplacement`, not MySQL's native `?` — the node normalizes to the driver.)

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM users WHERE email = $1",
    "options": {
      "queryReplacement": "={{ $json.email }}"
    }
  }
}
```

`queryReplacement` takes a comma-separated list — each piece becomes one parameter: `={{ $json.email }},={{ $json.id }}` → `$1, $2`. The `=` prefix is just n8n's expression-mode marker. Treat any DB node with a `{{ ... }}` expression inside `parameters.query` as a critical injection finding.

### Transactions are bounded to one node

**Symptom:** two separate DB nodes, the second fails, and the first's write is already committed — no rollback.

**Cause:** there is no cross-node transaction in n8n. Atomicity is bounded to a single `executeQuery` invocation.

**Fix:** for atomic multi-step writes, put all the statements in one Postgres/MySQL `executeQuery` node and set `options.queryBatching: "transaction"` explicitly — don't rely on the default, which has shifted across node versions (single-query and independent batching are the other modes; confirm the current set and default with `get_node`). Everything that node runs in that execution goes through one BEGIN/COMMIT; any failure rolls it all back. Pre-compute lookups and derived values upstream so the transactional node receives ready-to-write data.

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO orders (customer_id, total) VALUES ($1, $2)",
    "options": {
      "queryBatching": "transaction",
      "queryReplacement": "={{ $json.customerId }},={{ $json.total }}"
    }
  }
}
```

Supabase's REST layer has no transactions — drop to the Postgres node connected directly to the same database when you need atomicity.

### "No rows" produces no items

**Symptom:** a `select` / `executeQuery` that matches nothing returns zero items, and the downstream node simply doesn't run — looks like the branch was skipped.

**Cause:** zero matched rows = zero n8n output items, and most nodes treat "no input items" as "nothing to do."

**Fix:** set `alwaysOutputData: true` on the DB node so a single empty item flows through, then branch on the result with an IF. (This is the same gotcha as write operations — INSERT/UPDATE/DELETE often return 0 items too; `alwaysOutputData: true` keeps the chain alive.)

---

## Slack

The exact param shapes shift across versions — `get_node` for `nodes-base.slack` is canonical. These are the traps it won't warn you about.

### Block Kit must be wrapped, or it posts as plain text

**Symptom:** you pass a Block Kit array, the request succeeds, but the message arrives as plain text (or empty). No node error, no validation warning.

**Cause:** the node accepts a bare array silently and drops the rich content. Slack's `chat.postMessage` expects `{ "blocks": [...] }` — an object with a `blocks` key — and the node forwards your value as-is.

**Fix:** wrap the array in an object, in expression mode so the node receives a real object (not a stringified one). Reference the source by node name, not `$json`:

```
={{ { "blocks": $('Build Message').item.json.blocks } }}
```

Don't stringify-then-reparse hybrids (`{{ ... .toJsonString() }}` glued into a string) — they work on some versions but break on escaping and large payloads. Hand the node the structure directly.

### Thread replies need `thread_ts`

**Symptom:** a "reply" posts as a new top-level channel message instead of in the thread.

**Cause:** without `thread_ts` (the timestamp of the message being replied to), Slack has no thread to attach to.

**Fix:** set `thread_ts` to the parent message's `ts`. Use `get_node` to find where the field sits on the current version — it moved out of `otherOptions` where older docs put it. Add `reply_broadcast: true` if the reply should also show in the main channel.

### Operation display name ≠ internal value

**Symptom:** you set `operation: "send"` (matching the UI's "Send a message") and validation rejects it.

**Cause:** the display label and the stored value diverge. "Send a message" is `operation: "post"`, not `"send"`.

**Fix:** read the real operation values from `get_node` for `nodes-base.slack` rather than guessing from the UI label. This display-vs-value mismatch recurs across resource nodes (e.g. "Get Many" → `getAll` on Gmail/Supabase).

---

## Webhook / Respond to Webhook

Entry and exit of request/response API workflows. `get_node` is canonical for field shapes; this is the runtime behavior it doesn't show.

### Response code defaults to 200 — even on error branches

**Symptom:** an error branch returns HTTP 200 with an error body. The caller's HTTP client sees success while the body says failure — the worst of both worlds, because the caller's error handling never fires.

**Cause:** `responseCode` defaults to `200` on every Respond to Webhook node, including the ones you wired to error paths.

**Fix:** set `responseCode` explicitly on every Respond branch — 4xx for caller errors (400 validation, 401/403 auth, 409 conflict, 429 rate limit), 5xx for server errors. A workflow can have multiple Respond nodes, one per response shape; n8n returns whichever fires first.

### Use `responseMode: "responseNode"` for real request/response APIs

**Symptom:** the caller gets an immediate 200 and never sees the workflow's actual output, even though the workflow computes a response.

**Cause:** the Webhook trigger's `responseMode` defaults to `onReceived` (acknowledge immediately, run async). The caller can't see downstream results.

**Fix:** set `parameters.responseMode: "responseNode"` on the Webhook trigger and control the response with explicit Respond to Webhook nodes. (`lastNode` returns the last node's output synchronously — fine for simple cases; `responseNode` is the flexible choice for multi-status APIs.)

### `respondWith: "json"` takes the object, not a stringified string

**Symptom:** the response body comes back double-encoded — escaped quotes, a JSON string wrapped in another JSON string.

**Cause:** the `responseBody` field accepts both an object and a string. If you pass `JSON.stringify(obj)`, n8n serializes that string again.

**Fix:** pass the object directly in expression mode and let the node serialize it once:

```
={{ { "status": "ok", "id": $('Create Record').item.json.id } }}
```

---

## Schedule Trigger

`get_node` for `nodes-base.scheduleTrigger` shows the rule structure. These are the behaviors outside the type def.

### Timezone is workflow-level, not per-rule

**Symptom:** a job that should fire at 9am local drifts after a DST change or an instance move.

**Cause:** the Schedule Trigger uses the **workflow's** timezone (Workflow Settings → Timezone). There is no `timezone` field inside a rule. Without an explicit workflow timezone, it follows the host's clock.

**Fix:** set the workflow timezone explicitly for any schedule that must run at a specific local time. The per-rule config has no timezone to set — don't look for one.

### Cron accepts 5 or 6 fields

**Symptom:** confusion over whether a cron expression needs a seconds field — the UI hint shows 6 fields, the placeholder shows 5.

**Cause:** n8n's cron supports both 5-field (`Minute Hour DoM Month DoW`) and 6-field (`Second Minute Hour DoM Month DoW`) formats. Both are valid.

**Fix:** use whichever you intend; just be consistent. For simple recurrences ("every Monday 9am"), the interval modes (`field: "weeks"` etc.) are clearer and less error-prone than cron.

### Restarts can miss runs — design for idempotency

**Symptom:** an instance restart or downtime window overlapping a scheduled time, and that run never happens.

**Cause:** schedules fire against the instance's clock. If the instance is down at fire time, the run is simply skipped — there's no catch-up queue.

**Fix:** for business-critical schedules, make the workflow idempotent (running it twice produces the same result) and, where it matters, detect missed runs at workflow start by comparing the last successful run to the expected cadence and catching up.
