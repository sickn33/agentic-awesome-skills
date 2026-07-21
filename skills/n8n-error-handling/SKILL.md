---
name: n8n-error-handling
description: Design visible, structured, recoverable n8n failures using error outputs, retries, Error Trigger workflows, and HTTP error responses.
risk: unknown
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/n8n-error-handling
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# n8n Error Handling

## When to Use

Use this skill for unattended workflows, webhook/API response contracts, retry design, error outputs, Error Trigger workflows, alerting, or any path where failure must be visible and recoverable.

Make retries bounded and idempotent, especially for sends, payments, and writes. Redact credentials, personal data, request bodies, and stack details from caller-facing responses and alerts; expose only the minimum diagnostic context required.

By default, when an n8n node throws, the **whole workflow halts**. For an interactive run you're watching, that's fine — you see the red node and fix it. For anything unattended (a webhook API, a cron job, a queue worker, an agent tool), it's the wrong default: the caller gets a timeout or an empty 500, the operator gets no alert, and the symptom is "the integration just stopped working" with no log and no clue.

This skill is about making failures **loud, structured, and recoverable** — and, best case, **self-healing** so transient blips never reach a human at all.

The two ideas that prevent most silent failures:

- **Per-node error outputs** — a node's failure routes down a second output you control, instead of killing the run.
- **A workflow-level error workflow** — a catch-all that fires for anything that escapes per-node handling (timeouts, crashes between nodes, unwired failures).

---

## When you actually need this

| Workflow shape | Error handling posture |
|---|---|
| Webhook / API (anything with `Respond to Webhook`) | **Required.** Every fallible node's error output wired; status code matches cause. |
| Scheduled / cron / queue worker / agent tool (unattended) | **Required.** A workflow-level error workflow, plus `retryOnFail` on network nodes. |
| Internal one-off you run and watch yourself | **Optional.** Default `onError: "stopWorkflow"` is fine — you'll see the red node and re-run. |

The dividing line: **if anyone other than you sees the output** — a downstream system, an end user, an on-call engineer — the failure has to be handled, not swallowed. If you're the only watcher and the cost of failure is "I notice and re-run", looser is fine.

---

## The #1 silent trap: per-node error output is a TWO-step setup

This is the single most common way an n8n workflow "handles" errors while actually swallowing them. Routing a node's failure to a handler takes **two** changes, and doing only one looks complete but misbehaves:

1. **Set `onError: "continueErrorOutput"`** on the node. This is what *creates* the second output. Without it, `main[1]` doesn't exist no matter what you wire.
2. **Wire that error output** (`connections.<node>.main[1]`, i.e. `sourceIndex: 1`) to a real handler. Without a target, the error data is emitted into the void.

Get one without the other and you hit a failure mode:

| What you did | What happens at runtime |
|---|---|
| `onError` set, error output **not** wired | Error data is silently discarded. Downstream doesn't fire. The dashboard shows the run as **succeeded**. Worst case — no error logged anywhere. |
| Error output wired, `onError` **not** set | The slot never fires; the handler is unreachable. On failure the workflow just **halts** (default `stopWorkflow`). |
| Both done | Failure routes down `main[1]` to your handler. ✅ |

### Doing both with `n8n_update_partial_workflow`

```javascript
// 1) Turn on the error output (creates main[1])
{ type: "updateNode", nodeName: "HTTP Request",
  changes: { onError: "continueErrorOutput" } }

// 2) Wire the error output to a handler. sourceIndex: 1 = the error output.
{ type: "addConnection",
  source: "HTTP Request",
  target: "Handle Error",
  sourceIndex: 1 }
```

`sourceIndex: 0` is the success path, `sourceIndex: 1` is the error path. (For IF nodes the aliases `branch: "true"`/`"false"` map to index 0/1; for a generic fallible node, use the explicit `sourceIndex: 1`.)

**Then verify.** This trap doesn't surface in `validate_workflow` — a half-wired error output validates clean. Pull the workflow with `n8n_get_workflow` and confirm **both** halves:

- The node's `onError` is `"continueErrorOutput"`.
- `connections["HTTP Request"].main[1]` contains your handler.

Valid `onError` values:

| Value | Effect |
|---|---|
| `"stopWorkflow"` (default) | Error halts the whole workflow. |
| `"continueRegularOutput"` | Error item flows out the **normal** output. Rare, usually wrong — downstream gets error-shaped data and keeps going. |
| `"continueErrorOutput"` | Error item flows out the **separate** error output (`main[1]`). The one you wire. |

Full failure-mode catalog, fan-in/fan-out shapes, and verification: **references/NODE_ERROR_OUTPUTS.md**.

---

## Self-healing first: `retryOnFail` before you wire error paths

Before you build error branches, absorb the transient failures so they never reach those branches. On **any node that calls a network service** — HTTP Request, comms (Gmail/Slack/Discord), databases, AI nodes, third-party integrations — set node-level retry:

```javascript
{ type: "updateNode", nodeName: "HTTP Request",
  changes: {
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000   // ms
  } }
```

Why this comes **first**: a 429 or a brief upstream hiccup will retry and usually succeed on its own. The error output then fires only on *real, persistent* failures — so your 5xx responses and on-call alerts reflect actual problems instead of noise.

Engine limits to know: retry fires on **any** error (there's no per-status-code filter), `maxTries` caps at 5, and `waitBetweenTries` caps at 5000ms — so 5000 is both the max and a sensible default. See **n8n-node-configuration** (NODE_FAMILY_GOTCHAS.md) for node-specific notes.

---

## API workflows: the canonical shape

A webhook-triggered workflow that responds to its caller has one rule that overrides everything else: **no hanging branches**. Every path — success and every error — must end at a `Respond to Webhook`, or the caller sits there until it times out.

```
Webhook (responseMode: "responseNode")
  ├── validate input → process → Respond (200, body)
  └── (any fallible node's error output → sourceIndex 1)
            → Respond (4xx/5xx, structured error body)
            → optional: log full error privately / notify
```

Three things make this work:

1. **Fan-in to one error responder.** Many fallible nodes can route their `main[1]` to a single `Respond` node. Keeps the graph readable.
2. **Validation failures (4xx) are checked *upstream*, not via error outputs.** A missing field isn't a node *crashing* — it's an expected outcome with a known response. Branch on it with IF/Switch (or the schema validator below) and return 400/401/403/404 directly. Error outputs are for *unexpected* failures (5xx).
3. **`responseCode` defaults to 200 — even on error branches.** This is its own silent trap (see references/RESPONSE_SHAPES.md and **n8n-node-configuration** at `../n8n-node-configuration/references/NODE_FAMILY_GOTCHAS.md`): an error branch that returns 200 with an error body looks like success to the caller's HTTP client, so their error handling never fires. Set `responseCode` explicitly on every Respond node.

### Input validation: the Set-node schema validator

For any endpoint doing structured input validation, run the check as an IIFE inside a single **Set** node rather than a chain of IF/Switch nodes per field. One node validates the whole payload, returns `{ valid, validationError, details, requiredSchema }`, and an IF branches on `valid` → your logic (200) or a 400 Respond that echoes the schema back so the caller can self-correct. It's also dramatically faster than a recursive validator in a Code node + sub-workflow. The full pattern, the constraint cookbook, and the expression-escaping gotchas live in **references/API_WORKFLOWS.md**.

---

## Response shapes: map cause → status code

A 5xx with `text/plain "Internal Server Error"` is technically an error response and practically useless. And not every failure is a 5xx. **Match the status code to *why* the request failed**, because the caller branches on it: their monitoring alerts on 5xx (your fault) but not 4xx (their fault), and 5xx suggests "retry" while 4xx suggests "don't".

**The common mistake:** wiring everything — including bad input — to one `Respond` that returns 500 `internal_error`. Now the caller can't tell their bug from your outage, and your error rates can't separate real incidents from client noise.

| Cause | Status | `error` code | Where it's handled |
|---|---|---|---|
| Required field missing / wrong type | 400 | `validation_error` | Upstream check (schema validator / IF), not error output |
| Auth missing or invalid | 401 | `unauthorized` | Upstream check |
| Authenticated but not allowed | 403 | `forbidden` | Upstream check |
| Resource ID valid in request, absent in your data | 404 | `not_found` | Branch on the lookup *result*, not its error |
| Conflicts with current state (duplicate, race) | 409 | `conflict` | Detect with logic |
| Caller exceeded rate limit | 429 | `rate_limit_exceeded` | Set `Retry-After` header |
| Node threw, cause unknown | 500 | `internal_error` | Error output path |
| Third-party API returned an error | 502 | `upstream_error` | Error output of the HTTP node |
| Can't process right now (downstream down) | 503 | `service_unavailable` | Detect specific error, hint retry |
| Third-party API timed out | 504 | `upstream_timeout` | Error output filtered by message |

So there are two distinct flows: **4xx is decided before the work** (IF/Switch + dedicated Respond), **5xx comes out of error outputs** ("we tried, it broke").

**One Respond, expression-driven code.** When error paths differ only by *number and message* (same body shape, same headers), don't fan out to N Respond nodes through a Switch. The Respond node accepts expressions in both `Response Code` and body — compute the code inline:

```javascript
// Response Code field on a single Respond to Webhook:
{{ (() => {
    const msg = $json.error?.message || $json.message || '';
    if (msg.includes('INVALID_ID')) return 400;
    if (/429|too many/i.test(msg)) return 429;
    if (/timeout/i.test(msg))      return 504;
    if (/upstream|llm|api/i.test(msg)) return 502;
    return 500;
})() }}
```

Reserve Switch + multiple Responds for paths that diverge *structurally* (different headers, different body shapes, redirects). Same shape with a different number is one expression-driven Respond.

The default envelope is `{ "error": "<code>", "message": "<human text>" }` — the HTTP status already says success-vs-failure, so no `ok: false` flag. **Never leak internals** (stack traces, SQL, upstream bodies, tokens) into the response — log those privately, return a sanitized message. Correlation IDs, `retry_after`, validation `details`, and the full do-not-leak list are in **references/RESPONSE_SHAPES.md**.

---

## Workflow-level error workflow (the catch-all)

Per-node outputs handle the failures you anticipated on the nodes you remembered to wire. An **error workflow** catches everything else: a node you forgot to wire, a crash between nodes, a whole-workflow timeout, a trigger failure. For unattended workflows this is the safety net that turns "it silently stopped" into "an alert arrived".

Build it as a separate workflow starting with an **Error Trigger** node. n8n invokes it with the failure context:

```json
{
  "execution": { "id": "...", "url": "...", "lastNodeExecuted": "Fetch order",
    "error": { "name": "NodeApiError", "message": "...", "timestamp": 1715000000000 } },
  "workflow": { "id": "...", "name": "Sync Stripe customers" }
}
```

Minimal version — **capture → notify**:

```
Error Trigger → Set (build alert from execution + error) → Slack/email (post to #incidents)
```

A good alert includes the workflow name, a link to the editor and a link to the failed execution, the failed node name, and the **real** error message (not "Workflow failed"). Field expressions and the optional "fetch the failing input via the n8n node" upgrade are in **references/ERROR_WORKFLOWS.md**.

Two traps worth flagging up front:

- **The recursion trap.** If the error workflow notifies Slack and Slack is what's down, the error workflow fails too — and the original error vanishes. Notify on a *different* channel than your monitored workflows use (most workflows alert Slack → error workflow uses email), and add a fallback (write to a Data Table) so a failed notification still leaves a trace.
- **A "handled" error won't bubble up.** If a node's error output is wired to a no-op that drops the data, n8n considers the error *handled* and the error workflow does **not** fire. Only catch per-node when you're actually doing something with the error.

> **What the community MCP can't do:** assigning the error workflow (instance default or per-workflow override) is an n8n **UI setting** — Workflow Settings → Error Workflow. There is no MCP tool to set it. Build the error workflow with the MCP, then tell the user the exact UI step to wire it up, and to repeat it (or set the instance default) for every unattended workflow.

---

## What's NOT available via the community MCP

| Want to do | Reality |
|---|---|
| Set a workflow's **Error Workflow** setting | UI only (Workflow Settings → Error Workflow). No MCP tool. Build the workflow, then hand the user the UI step. |
| Toggle other **workflow settings** (Save Execution Data, timezone, timeout, caller policy) | UI only. `n8n_update_partial_workflow` has `updateSettings`, but the error-workflow assignment is not reliably exposed — confirm in the UI. |
| Enable instance-wide error logging (Sentry, server logs) | Instance config, outside n8n workflows entirely. |

What the MCP **can** do: build the error workflow, set `onError`/`retryOnFail` on nodes (`updateNode`/`patchNodeField`), wire error outputs (`addConnection` with `sourceIndex: 1`), validate (`validate_workflow`, `n8n_validate_workflow`), auto-fix common issues (`n8n_autofix_workflow`), test (`n8n_test_workflow`), and inspect failures (`n8n_executions`).

---

## Anti-patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| `onError` set but error output unwired | Error silently discarded; run shows as **succeeded** | Wire `sourceIndex: 1` to a real handler, or revert `onError` to `stopWorkflow` so it's loud |
| Error output wired but `onError` not set | Slot never fires; handler unreachable; workflow halts on failure | Set `onError: "continueErrorOutput"` |
| Webhook → process → respond, no error branch | Caller gets a timeout or n8n's generic 500 | Wire every fallible node's error output to a Respond |
| Error branch returns 200 with an `{error}` body | Caller's client reads success; their error handling never fires | Set `responseCode` to 4xx/5xx explicitly on error Responds |
| One 500 `internal_error` for everything | Caller can't tell their bad input from your outage | Map cause → status (4xx caller, 5xx you) |
| Catching errors in a Code node and returning them as data | Downstream processes error-shaped data and continues | Let it throw; use `onError: "continueErrorOutput"` + wired path |
| Network node with no `retryOnFail` | Every transient 429/blip surfaces as a 5xx; alerts fire on noise | `retryOnFail: true, maxTries: 3, waitBetweenTries: 5000` |
| Switch → N Responds differing only by status code | 5 nodes for what's one Respond | Compute the code inline in one expression-driven Respond |
| Unattended workflow with no error workflow | A genuine failure goes nowhere | Build an Error Trigger workflow + assign it in the UI |
| Error workflow notifies the same channel the workflows monitor | Channel down → error workflow also fails → error vanishes | Use a different channel + a Data Table fallback |
| Leaking `$json.error` (stack/SQL/tokens) into the response | Exposes internals to callers/attackers | Log privately, return a sanitized message |

---

## Reference files

| File | Read when |
|---|---|
| **references/NODE_ERROR_OUTPUTS.md** | Wiring a per-node error output on individual fallible nodes |
| **references/API_WORKFLOWS.md** | Building/reviewing a webhook → Respond workflow, including the schema validator |
| **references/RESPONSE_SHAPES.md** | Defining response body conventions, status codes, and what not to leak |
| **references/ERROR_WORKFLOWS.md** | Setting up the workflow-level catch-all for unattended workflows |

---

## Integration with other skills

- **n8n-workflow-patterns** — the webhook/API and scheduled patterns are where error handling lives. Use it for the overall shape; use this skill to harden it.
- **n8n-node-configuration** — `onError`/`retryOnFail` are node config; NODE_FAMILY_GOTCHAS.md covers the Webhook/Respond response-code traps in depth.
- **n8n-validation-expert** — the half-wired error output (one of the two steps missing) is a connection/config audit item, not a validation error. This skill is the fix.
- **n8n-expression-syntax** — the expression-driven `Response Code` and the alert-message expressions rely on correct `{{ }}` syntax and `$json.error` access.
- **n8n-code-javascript / n8n-code-python** — if you catch errors *inside* a Code node, decide deliberately: re-throw to use the error output, or handle and continue. Don't return error-shaped data and pretend it succeeded.
- **n8n-code-tool** — an agent's Code Tool surfaces thrown errors back to the LLM, which then retries; that's a different error contract from workflow nodes.
- **n8n-binary-and-data** — file/binary operations are fallible too; wire their error outputs like any network node.

---

## Quick reference checklist

For an **API / webhook** workflow:

- [ ] Webhook trigger uses `responseMode: "responseNode"`
- [ ] Input validated upstream → 4xx Respond (schema validator or IF)
- [ ] Every fallible node has `onError: "continueErrorOutput"` **and** `main[1]` wired
- [ ] Network nodes have `retryOnFail: true, maxTries: 3, waitBetweenTries: 5000`
- [ ] Error path ends at a Respond with an **explicit** 4xx/5xx `responseCode`
- [ ] Status code matches cause (4xx caller, 5xx you)
- [ ] Error body is `{ error, message }` — no stack traces, SQL, or tokens
- [ ] Verified with `n8n_get_workflow`: both `onError` and `main[1]` present on each fallible node

For an **unattended** (scheduled/cron/queue) workflow:

- [ ] Network nodes have `retryOnFail` configured
- [ ] An Error Trigger workflow exists (capture → notify, optional retry)
- [ ] The error workflow notifies on a different channel + has a fallback (recursion trap)
- [ ] The error-workflow setting is assigned in the n8n UI (MCP can't do it — remind the user)

---

**Remember**: the default is silence. Error handling is two moves — make the failure *route* (per-node `onError` + wired output, or a catch-all error workflow) and make it *speak* (a status code and body that tell the truth). Half a move is worse than none, because it looks done.

## Limitations

- Retry safety depends on each downstream operation's idempotency and cannot be inferred from workflow shape alone.
- MCP validation cannot assign or prove the instance-level Error Workflow setting; verify it in the n8n UI.
- Redaction rules must be adapted to the workflow's data classification and legal requirements.
