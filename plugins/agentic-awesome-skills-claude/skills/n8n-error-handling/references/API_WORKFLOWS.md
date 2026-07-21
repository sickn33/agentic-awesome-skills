# API Workflows

When a workflow is an HTTP API — a Webhook trigger that ends at a `Respond to Webhook` — error handling stops being optional. The caller is a machine waiting on a response, and the failure modes are unforgiving: a hanging branch becomes a timeout, a wrong status code breaks the caller's error handling, a leaked stack trace becomes a security finding.

This file covers wiring that pattern so it behaves under failure, not just on the happy path. For the per-node mechanics, see **NODE_ERROR_OUTPUTS.md**; for body conventions and status codes, **RESPONSE_SHAPES.md**.

---

## The shape

```
Webhook (responseMode: "responseNode")
  → validate input ──valid──→ process ──→ Respond (200, success body)
  │                └─invalid─→ Respond (400, validation_error body)
  └── (any fallible node's error output, sourceIndex 1)
            → Respond (5xx, structured error body)
            → optional: Log full error privately / notify
```

The non-negotiable: **every path ends at a Respond node.** Success, validation failure, execution failure — all of them. A path that doesn't reach a Respond is a hanging branch, and a hanging branch is a caller timeout.

Set `responseMode: "responseNode"` on the Webhook trigger — without it the trigger acknowledges immediately (`onReceived`) and the caller never sees your computed response. (See **n8n-node-configuration** NODE_FAMILY_GOTCHAS.md for the Webhook/Respond traps.)

---

## Wiring every fallible node

For each fallible node (HTTP, DB, third-party, file op), the two-step setup from NODE_ERROR_OUTPUTS.md:

1. `onError: "continueErrorOutput"` on the node.
2. `addConnection` from its `sourceIndex: 1` to your error Respond (directly, or via a logger).

A two-node processing chain, both fallible, both routing to one responder:

```javascript
// Turn on error outputs
{ type: "updateNode", nodeName: "Fetch User",    changes: { onError: "continueErrorOutput" } }
{ type: "updateNode", nodeName: "Call External", changes: { onError: "continueErrorOutput" } }

// Success path
{ type: "addConnection", source: "Webhook",      target: "Fetch User",      sourceIndex: 0 }
{ type: "addConnection", source: "Fetch User",   target: "Call External",   sourceIndex: 0 }
{ type: "addConnection", source: "Call External",target: "Respond Success", sourceIndex: 0 }

// Error paths — both fan in to one responder
{ type: "addConnection", source: "Fetch User",   target: "Respond Error",   sourceIndex: 1 }
{ type: "addConnection", source: "Call External",target: "Respond Error",   sourceIndex: 1 }
```

Three things to notice:

1. **One `Respond Error` for many sources.** Fan-in keeps it readable.
2. **Both nodes have `onError` set.** Miss it on either and that node's failure halts the workflow instead of routing — and the caller times out.
3. **If you surface the error message in the body, sanitize it.** See "Don't leak internals" below.

The error Respond node, in JSON:

```json
{
  "type": "n8n-nodes-base.respondToWebhook",
  "name": "Respond Error",
  "parameters": {
    "respondWith": "json",
    "responseCode": 502,
    "responseBody": "={{ JSON.stringify({ error: 'upstream_error', message: 'External service failed' }) }}",
    "options": {
      "responseHeaders": { "entries": [{ "name": "Content-Type", "value": "application/json" }] }
    }
  }
}
```

Always set `Content-Type: application/json` explicitly — the default depends on the body shape and isn't reliable.

---

## 4xx lives upstream, 5xx comes out of error outputs

This is the structural rule that keeps an API honest:

- **Validation / auth / not-found failures are *expected outcomes with a known response*.** They aren't nodes crashing. Check them **before** the work, with IF/Switch + a dedicated Respond, and return the right 4xx directly. Do not route them through error outputs.
- **Execution failures (a node actually throwing) are *unexpected*.** Those come out of error outputs as 5xx.

A real API usually needs several upstream checks, each its own IF/Switch + Respond, *before* the processing stage:

```
Webhook
  → Auth present & valid?      ── no ──→ Respond 401 unauthorized
  → Input valid?               ── no ──→ Respond 400 validation_error (with details)
  → Caller allowed this op?    ── no ──→ Respond 403 forbidden
  → Target resource exists?    ── no ──→ Respond 404 not_found
  → Processing stage (HTTP / DB / etc.) ←── this is where 5xx errors originate
```

That's not over-engineering — it's the difference between the caller getting an actionable `validation_error` and getting a generic 500 they can't act on.

---

## Input validation: the Set-node schema validator

For structured input validation, don't hand-roll an IF chain per field. Run the whole check as an **IIFE inside a single Set node**, branch on its result with one IF, and respond. One node does the work, and it's far faster than a recursive validator running in a Code node + sub-workflow (the sub-workflow invocation dominates that cost).

The validator node assigns one object field, `result`, computed by the expression below. The expression is **schema-specific** — edit the `REQUIRED_SCHEMA` constant and the per-field checks for your endpoint. The *output keys* are a contract the Respond node consumes — don't rename them.

```json
{
  "type": "n8n-nodes-base.set",
  "name": "Validate Schema",
  "parameters": {
    "mode": "manual",
    "assignments": {
      "assignments": [
        {
          "id": "a1",
          "name": "result",
          "type": "object",
          "value": "={{ (() => { const body = $json.body || {}; const errors = []; const REQUIRED_SCHEMA = { type: 'object', properties: { name: { type: 'string', minLength: 1, description: 'Customer full name' }, email: { type: 'string', pattern: '^\\\\S+@\\\\S+\\\\.\\\\S+$', description: 'Contact email address' }, plan: { type: 'string', enum: ['starter','pro','enterprise'], description: 'Subscription plan' }, seat_count: { type: 'integer', minimum: 1, maximum: 500, description: 'Number of licensed seats' } }, required: ['name','email','plan','seat_count'], additionalProperties: false }; if (!('name' in body)) errors.push({ p: 'name', m: 'Missing required field \"name\"', d: 'Customer full name' }); else if (typeof body.name !== 'string') errors.push({ p: 'name', m: 'Expected type \"string\"', d: 'Customer full name' }); if (!('email' in body)) errors.push({ p: 'email', m: 'Missing required field \"email\"', d: 'Contact email address' }); else if (!/^\\S+@\\S+\\.\\S+$/.test(body.email)) errors.push({ p: 'email', m: '\"' + body.email + '\" is not valid', d: 'Contact email address' }); if (!('plan' in body)) errors.push({ p: 'plan', m: 'Missing required field \"plan\"', d: 'Subscription plan' }); else if (['starter','pro','enterprise'].indexOf(body.plan) === -1) errors.push({ p: 'plan', m: '\"' + body.plan + '\" is not allowed. Must be one of: starter, pro, enterprise', d: 'Subscription plan' }); if (!('seat_count' in body)) errors.push({ p: 'seat_count', m: 'Missing required field \"seat_count\"', d: 'Number of licensed seats' }); else { const v = body.seat_count; if (typeof v !== 'number' || !Number.isFinite(v) || Math.floor(v) !== v) errors.push({ p: 'seat_count', m: 'Expected type \"integer\"', d: 'Number of licensed seats' }); else if (v < 1 || v > 500) errors.push({ p: 'seat_count', m: 'Must be between 1 and 500', d: 'Number of licensed seats' }); } if (errors.length === 0) return { valid: true, validationError: null }; const lines = errors.map(e => '• ' + e.p + ': ' + e.m + (e.d ? ' - ' + e.d : '')); const details = {}; errors.forEach(e => { if (!(e.p in details)) details[e.p] = e.m; }); return { valid: false, validationError: 'Validation failed (' + errors.length + ' issue' + (errors.length > 1 ? 's' : '') + '):\\n' + lines.join('\\n'), details: details, requiredSchema: REQUIRED_SCHEMA }; })() }}"
        }
      ]
    },
    "options": {}
  }
}
```

Then an IF on `={{ $json.result.valid }}` (boolean → true) routes to your business logic (200) on the true branch, and to a 400 Respond on the false branch:

```json
{
  "type": "n8n-nodes-base.respondToWebhook",
  "name": "Respond 400",
  "parameters": {
    "respondWith": "json",
    "responseCode": 400,
    "responseBody": "={{ JSON.stringify({ error: 'validation_error', message: $json.result.validationError, details: $json.result.details, request_schema: $json.result.requiredSchema }) }}"
  }
}
```

### The procedure for adapting it

1. **Lift the three-node shape** (Webhook → Validate Schema → IF → success/400 Respond) into your endpoint. Don't reinvent the graph.
2. **Edit `REQUIRED_SCHEMA` and the per-field checks** for your input. The pattern per field is mechanical: presence check → type check → constraint check → `errors.push(...)`.
3. **Leave the output keys alone.** The IIFE returns `{ valid, validationError, details, requiredSchema }` and the Respond node reads exactly those names. Rename one and the response body breaks.

The output contract:

- Valid: `{ valid: true, validationError: null }`
- Invalid: `{ valid: false, validationError: <summary string>, details: { <field>: <message> }, requiredSchema: <schema echoed back> }`

Echoing the schema back lets the caller — or an LLM driving the call — self-correct.

### Constraint cookbook

| Need | Inline check |
|---|---|
| Required field present | `if (!("name" in body)) errors.push(...)` |
| Type check | `else if (typeof body.name !== "string") errors.push(...)` |
| String length / regex | `body.name.length < N`, `/regex/.test(body.email)` |
| Number range | `body.seat_count < min`, `> max` |
| Integer | `Math.floor(v) !== v` (also reject non-numbers) |
| Enum | `["a","b","c"].indexOf(body.plan) === -1` |
| Array | `Array.isArray(body.tags)`, `body.tags.length < N` |
| Conditional | nest inside `if (body.type === "X") { ... }` |

### The escaping gotcha (regex backslashes)

Inside a JSON `responseBody`/`value` string, a regex like `\S` in the `REQUIRED_SCHEMA` literal needs **four** backslashes (`^\\\\S+...`) because it survives two layers of escaping — JSON string → JS string. The regex literal *executed* inside the IIFE (`/^\\S+@\\S+\\.\\S+$/`) needs only two per `\S`. If your email validation silently never matches, this is why.

---

## 5xx: differentiate the body, but keep it one responder

A single error responder for all 5xx is fine. Differentiate the *body* (and code) by inspecting which failure happened, with an expression instead of a Switch:

```javascript
// responseBody on one Respond node:
{{ (() => {
    const err = $json.error ?? {};
    const msg = err.message ?? '';
    if (/timeout/i.test(msg))     return JSON.stringify({ error: 'upstream_timeout',   message: 'External service did not respond in time' });
    if (/rate limit/i.test(msg))  return JSON.stringify({ error: 'service_unavailable', message: 'Upstream rate limit hit' });
    return JSON.stringify({ error: 'internal_error', message: 'An internal error occurred' });
})() }}

// responseCode on the same node:
{{ /timeout/i.test($json.error?.message ?? '') ? 504
   : (/rate limit/i.test($json.error?.message ?? '') ? 503 : 500) }}
```

Reach for Switch + multiple Respond nodes only when the responses diverge *structurally* (different headers, redirect, different body shape). Same shape, different number = one expression-driven Respond.

---

## Don't leak internals

The tempting one-liner:

```javascript
responseBody: "={{ JSON.stringify({ error: 'internal_error', details: $json.error }) }}"  // ❌
```

`$json.error` can carry stack traces, internal node names, connection strings, and upstream response bodies with embedded tokens. Surfacing it hands attackers a map and gives callers nothing useful.

Instead: log the full error privately, return a sanitized message.

```javascript
// Error output → Log node (sends full $json.error to Sentry/Slack/your logger)
{ type: "addConnection", source: "Call External", target: "Log Full Error", sourceIndex: 1 }
{ type: "addConnection", source: "Log Full Error", target: "Respond Error",  sourceIndex: 0 }
```

```json
// Respond Error keeps the body clean:
{ "responseCode": 502,
  "responseBody": "={{ JSON.stringify({ error: 'upstream_error', message: 'External service failed' }) }}" }
```

The caller sees a clean message; the detail stays internal. Full do-not-leak list in **RESPONSE_SHAPES.md**.

---

## Correlation IDs (optional)

If you run distributed tracing or log correlation, add a `request_id` consistently across **every** success and error response (partial coverage is worse than none). Two sources:

- **Caller-supplied** — read an `X-Request-ID` header, pass it through. Better for tracing across systems.
- **Generated** — use `{{ $execution.id }}` or a UUID. Easier.

Don't conflate this with the `job_id` an async (202) endpoint returns — that's how the caller polls for work later, not a correlation field.

---

## Async / 202 pattern

If the work takes longer than the caller wants to wait, respond 202 immediately and continue async:

```
Webhook → validate → Respond (202, { job_id }) → continue processing → callback / queue / email on completion
```

It has its own gotchas (idempotency, callback retries, status tracking) — build it deliberately. The `job_id` is intrinsic (it's how the work is found later), distinct from the optional `request_id`.

---

## Verifying the API workflow

Before activating:

1. **Test the success path** with `n8n_test_workflow`. Confirm shape and code. **API workflows almost always have side effects (DB writes, third-party calls, comms) — ask the user before running a test that triggers them.**
2. **Trigger an error path** — feed input that breaks a processing node, run, confirm the error Respond fires with the right code and body.
3. **Verify connections** with `n8n_get_workflow`: every fallible node has `onError: "continueErrorOutput"` AND `main[1]` wired. (NODE_ERROR_OUTPUTS.md.)
4. **Confirm no internal detail leaks** in the error body.
5. **Inspect real failures** afterward with `n8n_executions` to confirm the codes you expected are what actually went out.

If any check fails, fix before activating.
