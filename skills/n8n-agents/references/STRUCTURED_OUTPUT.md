# Structured output

Non-negotiable: the output parser must **parse AND retry on failure**. Without retry, one malformed model response halts the entire workflow.

The parser is the `@n8n/n8n-nodes-langchain.outputParserStructured` node, wired into the agent (or Basic LLM Chain) via the `ai_outputParser` connection.

---

## The pattern (node objects)

The parser, with `autoFix` and its own fixer model:

```json
{
  "parameters": {
    "schemaType": "manual",
    "inputSchema": "{ \"type\": \"object\", \"properties\": { \"score\": { \"type\": \"integer\", \"minimum\": 1, \"maximum\": 5 }, \"reason\": { \"type\": \"string\" } }, \"required\": [\"score\", \"reason\"] }",
    "autoFix": true
  },
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.3,
  "name": "Structured Output Parser"
}
```

Wire the parser to the agent, and a **coding-capable fixer model** to the parser:

```json
"Structured Output Parser": {
  "ai_outputParser": [[{ "node": "AI Agent", "type": "ai_outputParser", "index": 0 }]]
},
"Fixer LLM": {
  "ai_languageModel": [[{ "node": "Structured Output Parser", "type": "ai_languageModel", "index": 0 }]]
}
```

On the agent, set `hasOutputParser: true` so the slot is active.

---

## Why a schema, not an example

`schemaType: 'manual'` with a real JSON Schema is the default. `jsonSchemaExample` (`schemaType: 'fromJson'`) looks easier, but an example **cannot** express:

- **Required vs optional fields** — an example is one snapshot; the parser can't tell which keys are mandatory.
- **Enums** — `"category": "compliance"` doesn't constrain the model to `compliance | history | risk`; it will invent new categories.
- **Numeric ranges** — `"score": 3` doesn't say `1-5`; the model returns `7` or `0.85` and passes.
- **Array constraints** — min/max items, item-type uniformity.
- **String formats** — email, UUID, ISO date, regex.

A schema gives the model clearer rules and the parser real validation:

```json
{
  "type": "object",
  "properties": {
    "decision":   { "type": "string", "enum": ["approve", "reject", "escalate"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "reasons": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": { "type": "string", "enum": ["compliance", "history", "risk"] },
          "weight":   { "type": "number", "minimum": 0, "maximum": 1 },
          "note":     { "type": "string" }
        },
        "required": ["category", "weight"]
      }
    },
    "follow_up_required": { "type": "boolean" }
  },
  "required": ["decision", "confidence", "reasons", "follow_up_required"]
}
```

Reach for `fromJson` + `jsonSchemaExample` only for one-off shapes you're certain will never grow constraints. Once a field needs to be optional, enum-ed, or range-bounded, you're rewriting the parser anyway — start with the schema.

---

## `autoFix: true` and the fixer model

The model can produce almost-but-not-quite-valid JSON: trailing comma, missing field, wrong type, or JSON wrapped in a markdown code block. Without `autoFix`, the workflow halts. With it, the parser sends the bad output to a model with a "fix this" prompt, retries, and continues.

The fixer is wired as a **separate** sub-node into the parser's `ai_languageModel` slot. **Use a coding-capable model** (Sonnet-class or better). Reconciling broken JSON against a schema with enums, ranges, and required fields is a structured-output / coding task — a weak or generic model routinely produces another malformed retry, defeating the point and burning tokens.

When you want to customize the retry prompt, set `customizeRetryPrompt: true` and provide `prompt`. The placeholders `{instructions}`, `{completion}`, `{error}` are filled at retry time:

```
Instructions:
--------------
{instructions}
--------------
Completion:
--------------
{completion}
--------------
Above, the Completion did not satisfy the constraints in the Instructions.
Error:
--------------
{error}
--------------
Please try again with an answer that satisfies the constraints.
This is a structured output parser tool in n8n. Ensure the output format is correct to pass parsing.
DO NOT wrap the output in a markdown code block.
```

Generally, leave the retry prompt as default unless you have a specific reason to override it.

---

## "DO NOT wrap the output in a markdown code block"

This line is **load-bearing**. Models default to wrapping JSON in triple-backtick `json` fences, which breaks the parser. If you see parse failures on output that's clearly valid JSON inside a code block, this instruction is the fix — in both the retry prompt and, if the main model wraps aggressively, the **main** system prompt:

> When responding with structured output, return raw JSON only. DO NOT wrap in markdown code blocks. DO NOT include any prose before or after the JSON.

---

## System prompt + parser: belt and suspenders

The parser tells the model the schema; the system prompt should ALSO state the shape:

```
## Output Format
Respond with a JSON object matching this exact shape:
{ "score": 1-5 integer, "reason": "brief explanation" }

ONLY output the JSON. No prose, no markdown wrapping.
```

It's repetition, but the model takes the system prompt seriously and reinforcement helps. The parser catches what slips through.

---

## Common parse failures and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| "Failed to parse output" but the text looks like JSON | Wrapped in a markdown code block | Add "DO NOT wrap in markdown" to retry prompt and system prompt |
| Empty fields where the schema expects values | Model thinks it can omit unknowns | "Use empty string '' or null for unknown fields, never omit" |
| Wrong types (number as string) | Schema/example wasn't typed clearly | Use a real number in the schema, not a string |
| Truncated JSON (unclosed brace) | Hit max tokens mid-response | Increase max tokens, tighten the prompt to produce shorter output |
| Field names paraphrased ("Score" vs "score") | Schema didn't pin the name | "Field names are exactly as shown" in the system prompt |
| `autoFix` retries forever | Fixer model too weak for the schema | Swap in a coding-capable (Sonnet-class) fixer; tighten the retry prompt |

---

## When NOT to use a parser

- **Free-form chat replies to the user** — conversational text doesn't need parsing.
- **Tool calls only, no final structured output** — if the user-visible output is text, skip it.
- **Trivial key-value extraction** — a Set node with `JSON.parse($json.output)` covers it.

The parser is for when downstream nodes must consume strict JSON.

---

## Cross-references

- Why and where to use agents at all → parent **SKILL.md**
- The system-prompt half of structured output → **SYSTEM_PROMPT.md**
- Block Kit / adaptive cards need the manual schema even more (union types) → **CHAT_AGENT_PATTERNS.md**
