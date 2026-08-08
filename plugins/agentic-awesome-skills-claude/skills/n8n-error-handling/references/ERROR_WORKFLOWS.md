# Workflow-Level Error Workflows

Per-node error outputs handle the failures you anticipated on the nodes you remembered to wire. A **workflow-level error workflow** is the catch-all for everything else — and for an unattended workflow (scheduled, cron, queue worker), it's the difference between "the job silently stopped three days ago" and "an alert arrived the moment it broke".

What per-node outputs **don't** catch:

- Failures on nodes you forgot to wire.
- Crashes between nodes.
- Whole-workflow timeouts.
- Trigger failures.

When an unhandled error escapes any of those, n8n invokes the designated **error workflow** with the failure context. You build that workflow once; it serves every workflow that points at it.

---

## What the error workflow receives

It starts with an **Error Trigger** node, which fires with roughly this payload:

```json
{
  "execution": {
    "id": "...",
    "url": "https://your-n8n/workflow/<wfId>/executions/<execId>",
    "retryOf": "...",
    "error": {
      "name": "NodeApiError",
      "message": "...",
      "description": "...",
      "timestamp": 1715000000000
    },
    "lastNodeExecuted": "Fetch order",
    "mode": "trigger"
  },
  "workflow": { "id": "...", "name": "Sync Stripe customers" }
}
```

Note what's **not** there: the payload carries the error message and the failed node's *name* (`lastNodeExecuted`), but **not the input data** that caused the failure. Recovering that takes an extra step (below).

---

## Minimal error workflow (capture → notify)

For most workflows, this is enough:

```
Error Trigger → Set (build alert message) → Slack / email (post to #incidents)
```

Three nodes. Fast, hard to get wrong, and it turns silence into a message. Build it with `n8n_create_workflow` (or the partial-update ops), then assign it in the UI (see "Assigning it" below).

---

## What to put in the alert

A good notification lets on-call act without opening n8n first. Pull these from the payload:

| Field | Expression |
|---|---|
| Workflow name | `{{ $json.workflow.name }}` |
| Workflow ID | `{{ $json.workflow.id }}` |
| Editor link | `{{ $json.execution.url.split('/executions/')[0] }}` |
| Execution ID | `{{ $json.execution.id }}` |
| Execution link | `{{ $json.execution.url }}` |
| Failed node | `{{ $json.execution.lastNodeExecuted }}` |
| Error message | `{{ $json.execution.error.message }}` |
| Error description | `{{ $json.execution.error.description }}` (often empty, useful when set) |
| Timestamp | `{{ DateTime.fromMillis($json.execution.error.timestamp).toISO() }}` |

The `timestamp` is a Unix-ms number — format it with Luxon's `DateTime.fromMillis(...)`. The execution `url` is `{base}/workflow/{id}/executions/{execId}`, so stripping the `/executions/...` tail gives the editor URL.

A useful Slack body:

```
Workflow failure: *{{ $json.workflow.name }}* (`{{ $json.workflow.id }}`)
Open editor: {{ $json.execution.url.split('/executions/')[0] }}
Failed node: `{{ $json.execution.lastNodeExecuted }}`
Error: {{ $json.execution.error.message }}
Execution: {{ $json.execution.url }}
Time: {{ DateTime.fromMillis($json.execution.error.timestamp).toISO() }}
```

Two links matter: the **editor link** so on-call can start fixing, and the **execution link** so they can see the exact failed run. Skipping either costs a step. "Workflow failed." is not an alert — it's a notification that you'll have to investigate from scratch.

---

## Featureful version: recover the failing input

The Error Trigger payload tells you *which* node failed, not *what data* broke it. To get the offending payload, fetch the execution with the **n8n** node:

```
Error Trigger
  → n8n  (resource: Execution, operation: Get,
          Execution ID: {{ $json.execution.id }},
          Include Execution Details: true)
  → Set  (extract failed-node input from the execution data)
  → Switch (route by severity)
        ├── high → PagerDuty
        ├── med  → Slack #incidents
        └── low  → Slack #monitoring
  → Data Table (log for tracking)
```

"Include Execution Details: true" hits `GET /executions/{id}?includeData=true` and returns the full run data, so you can pluck the failed node's input out of `data.resultData.runData[<lastNodeExecuted>]`. Now the on-call message can carry the actual offending payload (which customer, which order id), not just "node X errored".

Caveats, all of which can turn the error workflow itself into a *new* silent failure:

- **Requires an n8n API credential** on this workflow (Settings → API → personal access token, then attach it to the n8n node). Without it the node throws a 401 — an unhandled error *inside the error workflow*.
- **Requires the failing workflow to persist execution data** (Save Execution Data, instance default or per-workflow). If it doesn't, the API returns metadata only.
- **The n8n node call can itself fail** (API down, rate-limited). Wire its error output (`sourceIndex: 1`) to a fallback that still notifies, or the original error vanishes behind a fetch failure.

Minimal is enough most of the time. The featureful version earns its keep on production-critical workflows where on-call minutes matter.

---

## Assigning it (UI only — the MCP can't)

> The error workflow is assigned in the n8n **UI**: per workflow under **Workflow Settings → Error Workflow**, or as an instance-wide default. There is **no community-MCP tool** to set this assignment. `n8n_update_partial_workflow` exposes an `updateSettings` op, but the error-workflow setting is not reliably writable through it — confirm in the UI.

So the agent's job is: **build the error workflow with the MCP, then hand the user the exact UI step** — "Open the failing workflow → Settings → Error Workflow → select '<name>'" — and remind them to do it for *every* unattended workflow (or set the instance default once). Building the workflow without assigning it does nothing; the trigger only fires for workflows that point at it.

---

## When the error workflow fires (and when it doesn't)

**Fires** when:

- A node throws unhandled (not routed via a wired per-node error output).
- The workflow itself fails (timeout, OOM).
- A trigger fails (rare, possible for non-webhook triggers).

**Does NOT fire** when:

- A node's error output is wired — even if the handler does nothing. n8n considers the error *handled*.
- You manually stop an execution.
- The workflow is paused / inactive.

That second case is the subtle one: **a per-node error output wired to a no-op that drops the data will *suppress* the error workflow.** From n8n's perspective the error was handled, even though it was swallowed. So only catch per-node when you're genuinely acting on the error; if you want a failure to bubble up to the catch-all, leave it unwired.

---

## What the error workflow should NOT do

- **Make external calls that can themselves fail without a fallback.** If the error workflow fails, the original error disappears — you've added a second silent failure on top of the first.
- **Take significant time.** It runs synchronously; a slow error workflow compounds the original failure's impact.

Keep it fast: parse, notify, return.

---

## The recursion trap

If your monitored workflows alert Slack, and the *error* workflow also alerts Slack, then a Slack outage takes out both — the error workflow fails and the failure goes nowhere. n8n won't re-trigger on its own failure (no infinite loop), but you've lost the alert.

Mitigations:

- **Use a different channel than the monitored workflows.** If everything notifies Slack, the error workflow should use email (or vice versa).
- **Add a fallback** — write to a Data Table (`n8n_manage_datatable`) if the primary notification fails, so there's always a trace.
- **Lean on instance-level logging** (server logs, Sentry) so even an error-workflow failure surfaces somewhere outside n8n.

---

## Verifying it works

After building and assigning:

1. Make a throwaway workflow that always fails — e.g. an HTTP Request to an invalid URL, with **no** error output wired so the failure is unhandled.
2. Run it.
3. Confirm the error workflow fires and the notification arrives.

This catches the setup mistakes that otherwise stay invisible until a real incident: wrong workflow assigned, wrong channel, missing API credential. Do it once before you rely on the alerting.

---

## Drift watch

The Error Trigger payload shape can shift between n8n versions. If a field isn't where this file says, check current n8n docs and update your expressions — a renamed field fails silently as an empty alert, not a thrown error.
