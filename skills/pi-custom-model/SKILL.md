---
name: pi-custom-model
description: "Register custom Pi Agent model slugs so saved OpenRouter variants resolve correctly."
category: operations
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [pi-agent, models, openrouter]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
disable-model-invocation: true
---

# Pi custom / variant model

## When to Use
Use when a requested provider/model ID is unavailable or a saved selection resolves unexpectedly. Verify the installed Pi version and catalog first: current Pi can overlay its bundled catalog with newer data, and `pi update --models` refreshes it. Do not assume a particular fallback model or that every variant needs manual registration. Check the provider's actual supported ID and routing options.

## Files (global)
- `~/.pi/agent/settings.json` — `defaultProvider`, `defaultModel`, `defaultThinkingLevel`
- `~/.pi/agent/models.json` — custom models, keyed by provider
- `~/.pi/agent/auth.json` — provider credentials (check the provider key exists)

## Steps

Preserve existing provider entries, keep a backup, and never print credential values or copy `auth.json` into reports.
1. **Confirm the slug is real** before adding it (e.g. check the OpenRouter model/variant exists). A typo'd id also silently falls back.
2. **Confirm auth.** The provider must have a key in `auth.json` (or an env var like `OPENROUTER_API_KEY`). No auth → the model is registered but unavailable → still falls back.
3. **Add the model to `models.json`** under `providers.<provider>.models`. For a **built-in provider** (openrouter, anthropic, etc.) you only supply metadata — `api`, `baseUrl`, and auth are inherited from the bundled defaults. Example:
   ```json
   {
     "providers": {
       "openrouter": {
         "models": [
           {
             "id": "z-ai/glm-5.2:nitro",
             "name": "Z.ai: GLM 5.2 (nitro)",
             "reasoning": true,
             "thinkingLevelMap": { "xhigh": "xhigh" },
             "input": ["text"],
             "cost": { "input": 0.95, "output": 3, "cacheRead": 0.18, "cacheWrite": 0 },
             "contextWindow": 1048576,
             "maxTokens": 32768,
             "compat": { "supportsDeveloperRole": false, "thinkingFormat": "openrouter" }
           }
         ]
       }
     }
   }
   ```
   The JSON above is illustrative, not a verified model advertisement. Replace the ID and every capability/limit/cost field with verified provider metadata and the installed Pi schema; variant routing can change pricing. Prefer a minimal entry when overrides are unnecessary. See [Pi model configuration](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/models.md).
4. **Set the default** in `settings.json`: `defaultProvider` + `defaultModel` = the exact id. Leave `defaultThinkingLevel` as the user has it.
5. **Verify:** `pi --list-models | grep <id>` shows it, and JSON parses. An authorized smoke test may incur provider charges; verify the selected model through client/provider metadata, not the model's self-identification.

## Quirks
- **Exact match only.** `find()` is exact `provider`+`id` — no fuzzy/colon-stripping for the *saved default* path. The slug in `settings.json` and `models.json` must be byte-identical.
- **Resolution behavior varies by version.** Inspect the selected provider/model and diagnostics rather than assuming silent fallback.
- **Don't edit `settings.json` alone.** Setting `defaultModel` to an unregistered slug does nothing — `models.json` is the actual fix.
- **`enabledModels`** (optional) pins the model picker so Ctrl+P cycling can't drift back: `"enabledModels": ["<provider>/<id>:<thinking>"]`.
- **Project override.** A repo's `.pi/settings.json` overrides global. If a default reverts only inside one project, check that file first.
- Current Pi reloads `models.json` when opening `/model`; verify behavior for the installed version. Restart only if needed.

## Example

**User request:**

> Register custom Pi Agent model slugs so saved OpenRouter variants resolve correctly.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
