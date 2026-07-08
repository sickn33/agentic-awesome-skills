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
Pi's saved default only loads if the exact `provider/id` exists in its model registry. Pi ships a static bundled list per provider — so OpenRouter **routing-shortcut variants** (`:nitro` = sort by throughput, `:floor` = cheapest, `:exacto` = quality tool-use) and any brand-new slug are NOT in it. When the default doesn't resolve, Pi silently falls through to its built-in per-provider default (for openrouter that's `moonshotai/kimi-k2.6`) — looking like Pi "reset" your model. Fix = register the slug as a custom model so `find(provider, id)` matches.

## Files (global)
- `~/.pi/agent/settings.json` — `defaultProvider`, `defaultModel`, `defaultThinkingLevel`
- `~/.pi/agent/models.json` — custom models, keyed by provider
- `~/.pi/agent/auth.json` — provider credentials (check the provider key exists)

## Steps
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
   Copy `cost`/`contextWindow`/`compat` from the base model (the variant shares them) — find the bundled entry in `<pi-pkg>/node_modules/@earendil-works/pi-ai/dist/providers/<provider>.models.js`. Don't hardcode generic 128k/16k if the real model is bigger.
4. **Set the default** in `settings.json`: `defaultProvider` + `defaultModel` = the exact id. Leave `defaultThinkingLevel` as the user has it.
5. **Verify:** `pi --list-models | grep <id>` shows it, and JSON parses. Optionally smoke-test: `pi --provider <p> --model "<id>" "which model are you?"`.

## Quirks
- **Exact match only.** `find()` is exact `provider`+`id` — no fuzzy/colon-stripping for the *saved default* path. The slug in `settings.json` and `models.json` must be byte-identical.
- **Silent fallback.** Pi prints no error when the default doesn't resolve; it just shows a different model in the footer. That's the tell.
- **Don't edit `settings.json` alone.** Setting `defaultModel` to an unregistered slug does nothing — `models.json` is the actual fix.
- **`enabledModels`** (optional) pins the model picker so Ctrl+P cycling can't drift back: `"enabledModels": ["<provider>/<id>:<thinking>"]`.
- **Project override.** A repo's `.pi/settings.json` overrides global. If a default reverts only inside one project, check that file first.
- Restart Pi fully — the registry loads at startup.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
