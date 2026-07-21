---
name: n8n-code-tool
description: Write and debug JavaScript or Python for the AI-callable n8n Custom Code Tool, including schemas, sandbox limits, and return formats.
risk: unknown
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/n8n-code-tool
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# n8n Custom Code Tool

## When to Use

Use this skill specifically for code executed by the AI-agent-callable n8n Custom Code Tool. Use the separate JavaScript or Python Code-node skills for ordinary workflow Code nodes.

Do not hardcode secrets or accept arbitrary executable code from untrusted input. Constrain inputs with a schema, validate outputs, allowlist any network destinations, and ask before testing a tool whose code can write data or invoke an external service.

Expert guidance for writing code inside `@n8n/n8n-nodes-langchain.toolCode` — the tool an AI Agent can invoke, **not** the regular workflow Code node.

---

## ⚠️ This is NOT the Code node

The Custom Code Tool looks like a Code node in the editor — same JavaScript editor, similar layout — but it is a **completely different node** from a different package with a **different runtime contract**.

| | Code node | Custom Code Tool |
|---|---|---|
| **Node type** | `n8n-nodes-base.code` | `@n8n/n8n-nodes-langchain.toolCode` |
| **Package** | `n8n-nodes-base` | `@n8n/n8n-nodes-langchain` |
| **Invoked by** | Previous node (workflow flow) | AI Agent (LangChain) |
| **Input** | `$input.all()` — item stream | `query` — string or object from LLM |
| **Return** | `[{json: {...}}]` (items array) | **A string** |
| **`$fromAI()`** | N/A | **Not available** (see Errors) |
| **HTTP helper** | `this.helpers.httpRequest` (auth helpers blocked) | Not exposed to the tool sandbox |
| **State** | Per-run execution data | No `getContext`, no `$getWorkflowStaticData` |

**If you treat it like a Code node, it fails.** The rest of this skill covers the Code Tool's actual contract.

---

## Quick Start

### Minimal JavaScript Code Tool

```javascript
// `query` is whatever the AI sent (a string by default)
return `You asked: ${query}`;
```

### Minimal Python Code Tool

```python
# `_query` is whatever the AI sent (a string by default)
return f"You asked: {_query}"
```

### Essential Rules

1. **Return a string.** Numbers are auto-converted. Anything else throws `"The response property should be a string, but it is an object"`.
2. **Input variable is fixed**: `query` (JS), `_query` (Python). You cannot rename it.
3. **Do NOT use `$fromAI()`** inside the Code Tool sandbox — it throws `"No execution data available"`.
4. **Do NOT use `[{json: {...}}]`** return format — that's for Code nodes. Throws `"Wrong output type returned"`.
5. **Use a descriptive tool name** (letters/numbers/underscores, v1.1+). The agent calls the tool by its name.
6. **Write a precise description** — the LLM decides whether to invoke the tool based on it.

---

## The Two Input Modes

The Code Tool has two input shapes, controlled by `specifyInputSchema`:

### Mode 1: Unstructured (default, `specifyInputSchema: false`)

The AI passes **a single string** as `query`. If you need multiple fields, the AI has to stuff them into that one string and you parse them out. In practice, LLMs will happily pass a JSON string if your description tells them to.

```javascript
// Parse a JSON string the AI sent
let params;
try {
  params = typeof query === 'string' ? JSON.parse(query) : query;
} catch (e) {
  throw new Error('Expected a JSON object. Parser said: ' + e.message);
}
const price = Number(params.price);
const months = Number(params.months);
// ...
return JSON.stringify({ monthly_payment: /* ... */ });
```

**Pros**: simplest to set up, one field to describe.
**Cons**: no schema validation — if the LLM forgets a field, the tool throws at runtime.

**Best for**: quick prototypes, tools with one natural input (a question, a URL, a text blob).

### Mode 2: Structured (`specifyInputSchema: true`)

The tool becomes a LangChain `DynamicStructuredTool`. The LLM sees a typed argument schema and passes a **validated object** as `query`. You access fields directly.

```javascript
// query is now an object matching your schema
const price = query.price;
const months = query.months;
const residual_percent = query.residual_percent;

const monthly = computeAnnuity(price, months, residual_percent);
return JSON.stringify({ monthly_payment: monthly });
```

Schema is defined via either:
- `schemaType: "fromJson"` + `jsonSchemaExample` (n8n v≥1.3) — paste an example JSON, n8n infers the schema
- `schemaType: "manual"` + `inputSchema` — write a full JSON Schema yourself

**Pros**: LLM gets type hints, invalid calls rejected before your code runs, cleaner code.
**Cons**: a little more setup; requires n8n version with schema support.

**Best for**: production tools with multiple typed parameters (calculators, API wrappers, anything with numeric fields the LLM tends to stringify).

**See**: [references/INPUT_SCHEMA.md](references/INPUT_SCHEMA.md) for complete schema setup.

---

## Return Format

**The return value must be a string.** The LLM reads it as the tool's observation.

```javascript
// ✅ String
return "42";

// ✅ Number (auto-converted to string by n8n)
return 42;

// ✅ JSON-encoded structured result (recommended for rich output)
return JSON.stringify({ result: 42, currency: "SEK" });

// ❌ Raw object → "The response property should be a string, but it is an object"
return { result: 42 };

// ❌ Workflow item format → "Wrong output type returned"
return [{ json: { result: 42 } }];

// ❌ Array → "The response property should be a string, but it is an object"
return [1, 2, 3];
```

### Best practice: JSON-stringify structured results

When your tool has more than a trivial scalar output, return a JSON string:

```javascript
return JSON.stringify({
  monthly_payment_sek: 5405,
  loan_amount: 351920,
  total_cost_of_credit: 63295
});
```

The LLM parses JSON reliably and can pick the fields it needs to present to the user.

### Error handling: the agent reads your failures

Errors don't just stop the workflow — they go back to the LLM, which usually corrects its call and retries. Use that:

```javascript
// Option A: throw — n8n surfaces the message to the agent
if (!isFinite(price)) throw new Error('price must be a number, e.g. 439900');

// Option B: return an error string — agent reads it like any tool result
if (!isFinite(price)) return JSON.stringify({ error: 'price must be a number, e.g. 439900' });
```

Either way, write error messages **for the LLM**: state what was wrong and what a valid call looks like. A bare `throw new Error('invalid input')` wastes the retry; an instructive message usually fixes the next call.

---

## Tool Name and Description

These fields are NOT documentation — they are the **tool contract the LLM sees**. Treat them as prompt engineering.

### Name
- Must match `[A-Za-z0-9_]+` (v1.1+). No spaces, no hyphens, no emoji.
- Use a verb-y descriptive name: `calculate_car_loan`, `get_weather`, `search_orders`.
- The agent calls the tool by this name. `Code Tool` (the default) is useless — the agent won't know when to call it.

### Description
- Explain **when** to use it and **what** to send.
- If unstructured mode, **include an example of the JSON string** the LLM should send.
- If structured mode, the schema speaks for itself — just describe purpose.

**Unstructured example (JSON-in-string pattern):**
```
Deterministiskt beräknar månadskostnad för billån. Anropa med EN JSON-sträng:
{"price":439900,"down_payment":87980,"interest_rate":6.95,"months":36,"residual_percent":50}
Fält: price (SEK), down_payment (SEK), interest_rate (% per år), months, residual_percent (0-99).
```

**Structured example (schema-defined):**
```
Deterministically computes the monthly car-loan payment given price, down payment,
annual interest rate, term, and residual percent. Use whenever the user asks for
monthly cost, total credit cost, or loan breakdown.
```

---

## Top Errors and Fixes

### Error 1: `"There was an error: 'Cannot assign to read only property \"name\" of object: Error: No execution data available'"`

**Cause**: you called `$fromAI()` inside the Code Tool sandbox.

**Fix**: `$fromAI()` is a helper for **other** tool-enabled nodes (HTTP Request Tool, SendGrid Tool, `toolWorkflow`, etc.) — it's not exposed inside `toolCode`. Read the AI's input from `query` directly (or use `specifyInputSchema` for structured fields).

### Error 2: `"Wrong output type returned"`

**Cause**: you returned a workflow-style array like `[{ json: { ... } }]`. That's the Code **node** contract, not the Code **Tool** contract.

**Fix**: return a string. For structured data, `return JSON.stringify(output)`.

### Error 3: `"The response property should be a string, but it is an object"`

**Cause**: you returned a plain object or array.

**Fix**: `JSON.stringify()` the result, or coerce to a string.

### Error 4: AI never calls the tool

**Cause**: tool name is generic (`Code Tool`, `My Tool`) or description doesn't clearly state when to use it.

**Fix**: rename to a verb-y name (`calculate_car_loan`), and rewrite the description to explicitly state the trigger conditions (e.g. "Use this whenever the user asks about monthly cost").

### Error 5: AI sends garbage into `query`

**Cause**: unstructured tool with a vague description. The LLM guesses at the format.

**Fix**: either (a) include a concrete JSON example in the description, or (b) switch to `specifyInputSchema: true` so the LLM gets a typed schema.

**See**: [references/ERROR_PATTERNS.md](references/ERROR_PATTERNS.md) for full catalog with reproductions.

---

## What's NOT Available in the Sandbox

The Code Tool sandbox is **narrower** than the Code node sandbox. Don't assume helpers carry over:

| Helper | Code node | Code Tool |
|---|---|---|
| `$input.all()`, `$input.first()`, `$input.item` | ✅ | ❌ |
| `$node["NodeName"]` | ✅ | ❌ |
| `$json`, `$binary` | ✅ | ❌ |
| `$fromAI()` | ❌ | ❌ (despite sitting next to an AI agent) |
| `this.helpers.httpRequest()` | ✅ | ❌ |
| `DateTime` (Luxon) | ✅ | ✅ (standard in JS sandbox) |
| `$jmespath()` | ✅ | ❌ |
| `this.getContext(...)` | ✅ | ❌ |
| `$getWorkflowStaticData(...)` | ✅ | ❌ |

**Implication**: the Code Tool is for **pure computation**. If you need an HTTP call, an API lookup, or cross-invocation state, use a different tool node:
- HTTP Request Tool for external API calls
- `toolWorkflow` (Call Sub-workflow Tool) for multi-step logic with access to the full Code node sandbox
- MCP / database tools for persistent state

---

## When to Use Code Tool vs Alternatives

Use **Code Tool** when:
- ✅ Pure deterministic computation (math, parsing, formatting, validation)
- ✅ Lightweight transformations the LLM shouldn't do itself (precision math, regex)
- ✅ You want the code inline in the workflow, not in a separate sub-workflow

Use **`toolWorkflow`** (Call Sub-workflow Tool) when:
- ✅ You need multiple parameters with clean `$fromAI()` typing
- ✅ You need access to `this.helpers`, credentials, or other nodes
- ✅ Logic is reusable across agents
- ✅ You want structured typed inputs WITHOUT writing a JSON Schema

Use **HTTP Request Tool** when:
- ✅ The tool is fundamentally a single API call
- ✅ You want per-parameter `$fromAI()` bindings in URL/query/body

**Rule of thumb**: if you find yourself wanting `$fromAI()`, you probably want `toolWorkflow` instead of `toolCode`.

---

## Complete Working Example

A production calculator tool (unstructured, JSON-in-string pattern):

```json
{
  "parameters": {
    "name": "calculate_car_loan",
    "description": "Computes monthly car-loan payment using an annuity formula with residual/balloon. Call with a single JSON string. Example: {\"price\":439900,\"down_payment\":87980,\"interest_rate\":6.95,\"months\":36,\"residual_percent\":50,\"setup_fee\":695,\"monthly_admin_fee\":59}. Required: price, down_payment, interest_rate, months, residual_percent. Optional: setup_fee, monthly_admin_fee (default 0).",
    "language": "javaScript",
    "jsCode": "let params;\ntry {\n  params = typeof query === 'string' ? JSON.parse(query) : query;\n} catch (e) {\n  throw new Error('Invalid JSON: ' + e.message);\n}\n\nconst price           = Number(params.price);\nconst down_payment    = Number(params.down_payment);\nconst interest_rate   = Number(params.interest_rate);\nconst months          = Number(params.months);\nconst residual_percent= Number(params.residual_percent);\nconst setup_fee       = Number(params.setup_fee ?? 0) || 0;\nconst monthly_admin_fee = Number(params.monthly_admin_fee ?? 0) || 0;\n\nif (!isFinite(price) || price <= 0) throw new Error('price must be > 0');\nif (down_payment < 0 || down_payment >= price) throw new Error('down_payment must be in [0, price)');\n\nconst principal = price - down_payment;\nconst residual  = price * (residual_percent / 100);\nconst r = interest_rate / 100 / 12;\nconst growth = Math.pow(1 + r, months);\nconst base = r === 0\n  ? (principal - residual) / months\n  : (principal - residual / growth) * r / (1 - 1 / growth);\nconst monthly_payment = base + monthly_admin_fee;\n\nreturn JSON.stringify({\n  monthly_payment_sek: Math.round(monthly_payment),\n  loan_amount: Math.round(principal),\n  residual_value_sek: Math.round(residual),\n  total_cost_of_credit: Math.round(monthly_payment * months + residual + setup_fee - principal)\n});"
  },
  "type": "@n8n/n8n-nodes-langchain.toolCode",
  "typeVersion": 1.3,
  "name": "calculate_car_loan"
}
```

Wire it into an AI Agent via the `ai_tool` connection type.

---

## Integration with Other Skills

**n8n-code-javascript**: the Code **node** skill. Most JavaScript patterns (arrays, map/filter, DateTime) transfer — but I/O contract is different. Don't copy data-access code.

**n8n-node-configuration**: `specifyInputSchema` is a classic displayOptions-driven conditional field. Use `get_node({detail: "standard"})` on `@n8n/n8n-nodes-langchain.toolCode` to see schema-related properties.

**n8n-workflow-patterns**: Code Tool sits inside the "AI Agent with tools" pattern. An agent typically has several tools; Code Tool is the "local compute" option.

**n8n-validation-expert**: the three Code Tool errors listed above have clear signatures — if validation surfaces "Wrong output type returned", you know to switch from array-of-items to a string.

---

## Quick Reference Checklist

Before deploying a Code Tool:

- [ ] **Node type** is `@n8n/n8n-nodes-langchain.toolCode` (not `nodes-base.code`)
- [ ] **Tool name** is descriptive, verb-y, snake_case (e.g. `calculate_car_loan`)
- [ ] **Description** states when to use the tool and (if unstructured) shows a JSON example
- [ ] **Input** read from `query` (JS) or `_query` (Python)
- [ ] **No `$fromAI()`** in the code body
- [ ] **No `$input` / `$json` / `$helpers`** — those aren't in the sandbox
- [ ] **Return** is a string (use `JSON.stringify()` for structured output)
- [ ] **Wired** into an AI Agent via `ai_tool` connection
- [ ] **Tested** with the exact kind of input the LLM will send (JSON in a string, or schema-validated object)

---

## Additional Resources

- [references/INPUT_SCHEMA.md](references/INPUT_SCHEMA.md) — structured input (DynamicStructuredTool) in depth
- [references/ERROR_PATTERNS.md](references/ERROR_PATTERNS.md) — full error catalog with causes and fixes

### Official sources
- [n8n Custom Code Tool docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/)
- [ToolCode source](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/tools/ToolCode/ToolCode.node.ts) — the sandbox contract
- [LangChain tool docs](https://js.langchain.com/docs/modules/agents/tools/) — DynamicTool / DynamicStructuredTool

---

**Remember**: the Code Tool is a LangChain tool wearing a Code-node UI. Contract is: **string in, string out**. Everything else follows from that.

## Limitations

- The Custom Code Tool sandbox and available globals can change with n8n releases; verify the installed node version.
- Static review cannot establish runtime permissions, network reachability, or the behavior of external services.
- This skill does not authorize arbitrary code execution or testing against production data.
