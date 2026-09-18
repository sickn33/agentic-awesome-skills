# Code Tool Error Patterns

The most common failure modes for `@n8n/n8n-nodes-langchain.toolCode`, with exact error strings, root causes, and fixes.

---

## Error 1: `"Cannot assign to read only property 'name' of object: Error: No execution data available"`

**Full message (wrapped by n8n):**
> There was an error: "Cannot assign to read only property 'name' of object 'Error: No execution data available'"

**Cause**: Calling `$fromAI()` inside the Code Tool sandbox. `$fromAI()` is a helper intended for *other* tool-enabled nodes (HTTP Request Tool, SendGrid Tool, `toolWorkflow`) where AI-supplied values flow through workflow execution data. The Code Tool sandbox has no execution data — it receives input directly via `query`. The helper throws, n8n tries to annotate the error's `name` property, and that assignment fails because the error object is frozen.

**Fix**: remove `$fromAI()`. Read from `query` (or define an input schema, see [INPUT_SCHEMA.md](INPUT_SCHEMA.md)).

```javascript
// ❌ Broken
const price = $fromAI('price', 'Car price in SEK', 'number');

// ✅ Unstructured — parse a JSON string
const params = JSON.parse(query);
const price = Number(params.price);

// ✅ Structured — with specifyInputSchema: true
const { price } = query;
```

---

## Error 2: `"Wrong output type returned"`

**Cause**: You returned the workflow item format (`[{json: {...}}]`) from the Code Tool. That format is for regular Code **nodes**; tools follow the LangChain contract and must return a string.

**Fix**: return a string. For structured output, stringify:

```javascript
// ❌ Broken
return [{ json: { monthly_payment: 5405 } }];

// ✅ Fixed
return JSON.stringify({ monthly_payment: 5405 });
```

---

## Error 3: `"The response property should be a string, but it is an <type>"`

Where `<type>` is `object`, `undefined`, `function`, etc.

**Cause**: You returned a bare object, array, or nothing at all.

| Returned value | Error says | Fix |
|---|---|---|
| `{ result: 42 }` | `...is an object` | `JSON.stringify({ result: 42 })` |
| `[1, 2, 3]` | `...is an object` | `JSON.stringify([1, 2, 3])` |
| *(no `return`)* | `...is an undefined` | Add a `return` |
| `undefined` | `...is an undefined` | Return something |

**Numbers are fine** — n8n auto-converts them to strings:
```javascript
return 42;  // ✅ becomes "42"
```

**Booleans are NOT auto-converted** — stringify explicitly:
```javascript
return String(someBoolean);  // ✅
return JSON.stringify(someBoolean);  // ✅
```

---

## Error 4: AI never calls the tool

**Symptom**: the agent answers from its own reasoning and ignores the tool. No tool invocation shows up in the execution trace.

**Common causes and fixes**:

1. **Generic name**. Default names like `Code Tool` or `My Tool` give the LLM no signal.
   - Fix: rename to verb-y, domain-specific snake_case: `calculate_car_loan`, `search_orders`, `lookup_customer`.

2. **Description doesn't state the trigger**. "Calculates things" is too vague.
   - Fix: explicitly list the user intents that should invoke the tool. `"Use this whenever the user asks about monthly cost, loan breakdown, or total interest."`

3. **Tool isn't wired**. The node sits in the canvas but isn't connected to the AI Agent's `ai_tool` input.
   - Fix: connect it. Check the workflow JSON `connections` block has `"<tool_name>": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] }`.

4. **Name violates `[A-Za-z0-9_]+`**. Spaces, hyphens, and emoji in the tool name cause silent skip on v1.1+.
   - Fix: rename to `snake_case_only`.

---

## Error 5: LLM sends malformed `query`

**Symptom**: your `JSON.parse(query)` throws, or fields come through as wrong types.

**Causes**:
- You're in unstructured mode and the description is ambiguous, so the LLM invents a format.
- You asked for a JSON string but the LLM sent a natural-language sentence.
- Numeric fields arrive as strings because the LLM serialized them that way.

**Fixes**, in order of preference:

1. **Switch to structured mode**. Set `specifyInputSchema: true` and define fields. The LLM now gets a typed schema and n8n validates before your code runs.

2. **Give a concrete example in the description**. LLMs imitate examples well:
   ```
   Call with a single JSON string. Example:
   {"price":439900,"down_payment":87980,"interest_rate":6.95}
   ```

3. **Coerce defensively**:
   ```javascript
   const params = JSON.parse(query);
   const price = Number(params.price);
   if (!isFinite(price)) throw new Error('price must be numeric');
   ```

---

## Error 6: `"$helpers is not defined"` / `"$input is not defined"`

**Cause**: you assumed the Code Tool sandbox exposes the same helpers as the Code node. It doesn't.

**Unavailable in Code Tool**:
- `$input`, `$json`, `$binary`
- `$node["OtherNode"]`
- `$helpers.httpRequest()`
- `$jmespath()`
- `this.getContext(...)`, `$getWorkflowStaticData(...)`
- `$fromAI()`

**Fix**:
- Pure computation? Stay in Code Tool, use plain JS.
- Need HTTP? Move to **HTTP Request Tool** (with `$fromAI()` in URL/body).
- Need other-node data or credentials? Move to **Call Sub-workflow Tool (`toolWorkflow`)** — its sub-workflow has a full Code node sandbox.
- Need state across calls? Not possible in Code Tool. Use a sub-workflow that reads/writes a Data Table, Redis, etc.

---

## Error 7: Python-specific — `"name 'query' is not defined"`

**Cause**: in Python, the input variable is `_query` (underscore prefix), not `query`.

```python
# ❌ Broken
result = process(query)

# ✅ Fixed
result = process(_query)
```

---

## Error Prevention Checklist

Before saving a Code Tool:

- [ ] Tool **name** is snake_case, descriptive, and unique
- [ ] **Description** tells the LLM when to call it, with an example if unstructured
- [ ] **No `$fromAI()`** in the code body
- [ ] **No `$input`, `$json`, `$helpers`** — not in this sandbox
- [ ] Input read from `query` (JS) or `_query` (Python)
- [ ] All code paths `return` a string (or a number that auto-converts)
- [ ] If returning structured data, wrapped in `JSON.stringify(...)`
- [ ] Wired to an AI Agent via `ai_tool` connection
- [ ] For multi-field input: either example JSON in description, or `specifyInputSchema: true`

---

## Debugging tips

- **Use the Execution view**, not just the test output. The agent's tool invocation and raw input/output are visible there — you can see exactly what `query` the LLM sent.
- **Log inside the tool** by including fields in the returned JSON:
  ```javascript
  return JSON.stringify({ received_query: query, result: /* ... */ });
  ```
  The LLM sees the echo, and you can spot malformed input.
- **Test the tool without the LLM** by temporarily turning the tool node into a standalone Code node with hard-coded `query`, running it manually, then swapping back.
