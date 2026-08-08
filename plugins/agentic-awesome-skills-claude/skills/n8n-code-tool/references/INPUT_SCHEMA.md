# Input Schema for Code Tool (Structured Mode)

How to turn `@n8n/n8n-nodes-langchain.toolCode` into a **DynamicStructuredTool** so the LLM passes typed arguments instead of a free-form string.

---

## Why use a schema?

Without a schema, the Code Tool is a LangChain `DynamicTool`:
- LLM sees: "one string argument called query"
- You must parse whatever the LLM sends
- Typos, missing fields, wrong types are your problem at runtime

With a schema, the Code Tool becomes a `DynamicStructuredTool`:
- LLM sees: a typed object with named fields and descriptions
- Runtime rejects invalid calls before your code runs
- Numeric fields stay numeric (no more `Number(params.price)` for every field)
- Tool calls are more reliable — most modern LLMs handle structured tools better than "here's a JSON string please"

**Cost**: a little config to define the schema, and the node must be on a version that supports it.

---

## Enabling the schema

Set `specifyInputSchema: true` on the `toolCode` parameters. Two schema-definition styles:

### Style A: `fromJson` — paste a representative example (v≥1.3, recommended)

The easiest. Give n8n an example JSON, and it infers the schema for you.

```json
{
  "parameters": {
    "name": "calculate_car_loan",
    "description": "Computes monthly car-loan payment using an annuity formula with optional balloon.",
    "language": "javaScript",
    "specifyInputSchema": true,
    "schemaType": "fromJson",
    "jsonSchemaExample": "{\n  \"price\": 439900,\n  \"down_payment\": 87980,\n  \"interest_rate\": 6.95,\n  \"months\": 36,\n  \"residual_percent\": 50,\n  \"setup_fee\": 695,\n  \"monthly_admin_fee\": 59\n}",
    "jsCode": "// query is now a validated OBJECT, not a string\nconst { price, down_payment, interest_rate, months, residual_percent, setup_fee = 0, monthly_admin_fee = 0 } = query;\n\nconst principal = price - down_payment;\nconst residual  = price * (residual_percent / 100);\nconst r = interest_rate / 100 / 12;\nconst growth = Math.pow(1 + r, months);\nconst base = r === 0\n  ? (principal - residual) / months\n  : (principal - residual / growth) * r / (1 - 1 / growth);\nconst monthly_payment = base + monthly_admin_fee;\n\nreturn JSON.stringify({\n  monthly_payment_sek: Math.round(monthly_payment),\n  loan_amount: Math.round(principal)\n});"
  },
  "type": "@n8n/n8n-nodes-langchain.toolCode",
  "typeVersion": 1.3,
  "name": "calculate_car_loan"
}
```

**How it works**: n8n looks at the example, infers `{price: number, down_payment: number, ...}`, and generates a JSON Schema. The LLM sees that schema and passes a validated object.

### Style B: `manual` — write the JSON Schema yourself

Use when you need descriptions per field, enums, min/max constraints, or optional fields.

```json
{
  "parameters": {
    "name": "calculate_car_loan",
    "description": "Computes monthly car-loan payment.",
    "language": "javaScript",
    "specifyInputSchema": true,
    "schemaType": "manual",
    "inputSchema": "{\n  \"type\": \"object\",\n  \"required\": [\"price\", \"down_payment\", \"interest_rate\", \"months\", \"residual_percent\"],\n  \"properties\": {\n    \"price\": { \"type\": \"number\", \"description\": \"Car price in SEK\" },\n    \"down_payment\": { \"type\": \"number\", \"description\": \"Down payment in SEK\" },\n    \"interest_rate\": { \"type\": \"number\", \"description\": \"Annual nominal rate in percent, e.g. 6.95\" },\n    \"months\": { \"type\": \"integer\", \"minimum\": 1, \"description\": \"Loan term in months\" },\n    \"residual_percent\": { \"type\": \"number\", \"minimum\": 0, \"maximum\": 99, \"description\": \"Balloon as % of price\" },\n    \"setup_fee\": { \"type\": \"number\", \"default\": 0 },\n    \"monthly_admin_fee\": { \"type\": \"number\", \"default\": 0 }\n  }\n}",
    "jsCode": "const { price, down_payment, interest_rate, months, residual_percent, setup_fee = 0, monthly_admin_fee = 0 } = query;\n// ... same computation as above ...\nreturn JSON.stringify({ monthly_payment_sek: /*...*/ });"
  },
  "type": "@n8n/n8n-nodes-langchain.toolCode",
  "typeVersion": 1.3,
  "name": "calculate_car_loan"
}
```

**When `manual` is worth it**:
- You want per-field `description` strings (the LLM reads these)
- You need `enum` values (e.g. currency: `["SEK", "EUR", "USD"]`)
- You need numeric constraints (`minimum`, `maximum`)
- You want to mark fields as optional cleanly

---

## How `query` behaves with a schema

Source of truth from the ToolCode sandbox:

```typescript
const sandbox = new JsTaskRunnerSandbox(workflowMode, ctx, undefined, { query });
```

The sandbox always receives `{ query }`. The difference is what `query` holds:

| Mode | Type of `query` | How to use |
|---|---|---|
| No schema | `string` | `JSON.parse(query)` if you want structure |
| With schema | `object` (validated) | Destructure: `const { price, months } = query;` |

In Python, the same applies — `_query` is a string without schema, a dict with schema.

---

## Schema version compatibility

- `specifyInputSchema` and `schemaType: "manual"` with `inputSchema`: available in v1.2
- `schemaType: "fromJson"` with `jsonSchemaExample`: requires v≥1.3

Set `typeVersion: 1.3` on the node if you want `fromJson`. Older installs should use `manual`.

---

## Picking a pattern

```
Does your tool need more than one input field?
├─ No (just a URL, question, text blob)
│  └─ Unstructured — skip the schema
├─ Yes, and fields are all typed (numbers, bools, enums)
│  └─ Structured with fromJson (easiest)
├─ Yes, and you need constraints or rich descriptions
│  └─ Structured with manual
└─ Yes, and fields are complex / reusable across agents
   └─ Use toolWorkflow (sub-workflow tool) instead of toolCode
```

---

## Gotcha: schema must be valid JSON

`jsonSchemaExample` and `inputSchema` are **strings containing JSON**, not objects. Watch the escaping when you paste them into workflow JSON. If the node won't save or the LLM doesn't see the fields, validate the JSON separately first.

---

## Gotcha: schema changes don't retroactively fix old agent runs

If an agent was already started with an unstructured tool and you flip it to structured, the agent's system prompt may still reflect the old contract until it's reloaded. Force a re-run / re-open the agent node after changing schema settings.
