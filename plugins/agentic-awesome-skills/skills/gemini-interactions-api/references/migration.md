# Migration Reference

How to migrate existing Gemini API code to the Interactions API and/or upgrade between model generations. Covers the agent workflow for performing migrations safely.

For detailed before/after code examples across all feature areas (text generation, multi-turn, streaming, function calling, structured output, grounding, multimodal), fetch the full migration guide: https://ai.google.dev/gemini-api/docs/migrate-to-interactions.md.txt

## Confirm the Migration Scope

**Before any edits, confirm the scope.** If the user's request does not explicitly name a single file, a specific directory, or an explicit file list, ask first and do not start editing.

Even imperative requests like "migrate my code", "upgrade to gemini 3", or "switch to the Interactions API" leave the scope ambiguous. Ask:

> Before I start editing, can you confirm the scope?
> 1. Entire project
> 2. Specific subdirectory (e.g. `src/`, `api/`)
> 3. Specific file or list of files

**Sizing the scope (large repos).** Before asking, get a per-directory count:

```sh
rg -l "generate_content\|generateContent\|gemini-2\.0\|gemini-1\.5\|gemini-2\.5\|gemini-3-flash-preview\|thinking_budget\|temperature" --type-not md | cut -d/ -f1 | sort | uniq -c | sort -rn
```

Present the breakdown in your question (e.g. *"Found 42 references across 3 directories: src/ (28), tests/ (10), scripts/ (4). Which to migrate?"*).

**Proceed without asking** only when the scope is already unambiguous, the user named an exact file ("migrate `app.py`"), pointed at a directory ("migrate everything under `src/`"), or already confirmed scope in an earlier turn.

## API Migration: `generateContent` → `Interactions`

The core changes when migrating from `generateContent` to the Interactions API:

| What | `generateContent` | Interactions API |
|------|----------------|-----------------|
| **SDK method** | `client.models.generate_content()` | `client.interactions.create()` |
| **Response text** | `response.text` | `interaction.steps[-1].content[0].text` |
| **Multi-turn** | Manual history array or `client.chats.create()` | `previous_interaction_id=interaction.id` |
| **Streaming** | `generate_content_stream()` / `:streamGenerateContent` | `stream=True` + `step.delta` events |
| **Structured output** | `config.response_format` inside `GenerateContentConfig` | Top-level `response_format` array |
| **Function calling** | `candidates[0].content.parts[0].function_call` | `function_call` step in `interaction.steps` |
| **Search grounding** | `groundingMetadata` on candidates | `google_search_call`/`google_search_result` steps + inline `annotations` |
| **Config/types** | `types.GenerateContentConfig(...)`, `types.Tool(...)`, `types.Content(...)`, `types.Part.*` | Not used. Interactions API uses plain Python dicts and direct params. Check the feature docs for exact format. |
| **REST endpoint** | `POST /v1beta/models/{model}:generateContent` | `POST /v1beta/interactions` |
| **SDK package** | `google-genai` ≥ 1.x or legacy `google-generativeai` | `google-genai` ≥ 2.0.0 |

For full before/after code examples, fetch the [Migration Guide](https://ai.google.dev/gemini-api/docs/migrate-to-interactions.md.txt) or read the Interactions API documentation pages for each feature.

## Model Migration

### Deprecated Models

| Model | Status | Drop-in Replacement |
|-------|--------|-------------------|
| `gemini-2.0-flash` | Deprecated | `gemini-3.5-flash` |
| `gemini-2.0-flash-lite` | Deprecated | `gemini-3.1-flash-lite` |
| `gemini-1.5-pro` | Deprecated | `gemini-3.5-flash` |
| `gemini-1.5-flash` | Deprecated | `gemini-3.5-flash` |

### Active Legacy Models (migration recommended)

| Current Model | Recommended Target | Why |
|--------------|-------------------|-----|
| `gemini-2.5-flash-lite` | `gemini-3.1-flash-lite` | Latest Flash-lite with Interactions API support |
| `gemini-2.5-flash` | `gemini-3.5-flash` | Latest Flash with Interactions API support |
| `gemini-2.5-pro` | `gemini-3.1-pro-preview` | Latest Pro with 1M context, complex reasoning |
| `gemini-3-flash-preview` | `gemini-3.5-flash` | Latest Flash with Interactions API support |

> **Note:** Within the Interactions API, model upgrades are generally drop-in — change the model string and verify. The breaking changes are at the **API level** (generateContent → Interactions), not between model generations.

## Migration Checklist

Every item is tagged: **`[BLOCKS]`** items cause errors or broken behavior if missed. **`[TUNE]`** items are quality/performance adjustments.

### API Migration (generateContent → Interactions)

- [ ] Updated SDK: `google-genai` ≥ 2.0.0 (Python) / `@google/genai` ≥ 2.0.0 (JS)
- [ ] Replaced `client.models.generate_content()` → `client.interactions.create()`
- [ ] Replaced `response.text` → `interaction.steps[-1].content[0].text`
- [ ] Replaced `response.candidates[0].content.parts` → iterate `interaction.steps`
- [ ] Replaced `client.chats.create()` / manual history → `previous_interaction_id`
- [ ] Removed all `types.*` wrappers (`GenerateContentConfig`, `Tool`, `Content`, `Part`) — Interactions API uses plain dicts. Check feature docs for exact format.
- [ ] Moved `response_format` from `GenerateContentConfig` to top-level parameter
- [ ] Replaced `generate_content_stream()` → `stream=True` + step-based event handling
- [ ] Updated function calling: candidates-based → step-based tool lifecycle
- [ ] REST: Changed endpoint to `/v1beta/interactions`
- [ ] REST: Add `Api-Revision: 2026-05-20` header (SDK ≥ 2.0.0 sets it automatically)
- [ ] Replaced `google-generativeai` (Python) → `google-genai` ≥ 2.0.0
- [ ] Replaced `@google/generative-ai` (JS) → `@google/genai` ≥ 2.0.0
- [ ] Updated all import statements to match new package names

### Model String Updates

- [ ] Replaced `gemini-2.0-*` model strings with current equivalents
- [ ] Replaced `gemini-1.5-*` model strings with current equivalents
- [ ] Consider upgrading `gemini-3-flash-preview` → `gemini-3.5-flash`
- [ ] Consider upgrading `gemini-2.5-flash` → `gemini-3.5-flash`
- [ ] Consider upgrading `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite`
- [ ] Consider upgrading `gemini-2.5-pro` → `gemini-3.1-pro-preview`

### Migrate to Gemini 3.5

Use this checklist if the user requests to migrate to Gemini 3.5. For full documentation of the changes, fetch the [What's new Gemini 3.5 guide](https://ai.google.dev/gemini-api/docs/interactions/whats-new-gemini-3.5.md.txt).

- [ ] Updated model name to `gemini-3.5-flash`
- [ ] Removed `temperature`, `top_p`, `top_k` from config
- [ ] Replaced `thinking_budget` with `thinking_level` (`minimal`, `low`, `medium`, `high`)

---

## Verify the Migration

After updating, run a spot-check to confirm the Interactions API is working:

1. Make a single `client.interactions.create()` call with a simple input
2. Assert `interaction.steps` is not empty
3. Assert at least one step has `type == "model_output"` with non-empty text
4. For multi-turn, verify `previous_interaction_id` preserves context across turns

For verification code snippets, fetch the [Migration Guide](https://ai.google.dev/gemini-api/docs/migrate-to-interactions.md.txt).
