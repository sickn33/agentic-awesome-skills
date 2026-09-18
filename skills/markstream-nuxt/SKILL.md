---
name: markstream-nuxt
description: "Integrate markstream-vue into Nuxt 3 or 4 with SSR-safe client boundaries, renderer modes, explicit CSS, and browser-only optional peers."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-nuxt
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [nuxt, vue, ssr, markdown, streaming]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Nuxt

## Overview

Integrate `markstream-vue` into Nuxt while keeping hydration, browser-only peers, workers, and streaming behavior on the correct side of SSR boundaries.

## When to Use

Use for Nuxt 3 or 4 pages, components, or plugins. Use `markstream-vue` for non-Nuxt Vue applications and `markstream-install` when the framework is not yet known.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Nuxt 3 or 4 and install only requested peers.
2. Put browser-only peers behind `<ClientOnly>`, `.client` plugins, dynamic imports, or guarded initialization.
3. Import `markstream-vue/index.css` explicitly from a client-safe shell or plugin.
4. Start with `content`: `mode="chat"` for AI streams, `docs` for rich documents, and `minimal` for lightweight non-chat surfaces.
5. Keep smooth streaming in `auto` mode for SSR; do not force `true` on first-screen server content.
6. When a chat row completes, keep its mode stable, set `final`, disable pacing/cursor, and enable fade only if desired.
7. Keep HTML safe and Mermaid strict. Put optional code, diagram, and worker runtimes behind client boundaries.
8. Validate build/typecheck, hydration, and one incremental client update.

## Example

```vue
<script setup lang="ts">
import MarkdownRender from 'markstream-vue'
import 'markstream-vue/index.css'

defineProps<{ markdown: string; done: boolean }>()
</script>

<template>
  <MarkdownRender
    mode="chat"
    :content="markdown"
    :final="done"
    :fade="done"
    :typewriter="!done"
    :smooth-streaming="done ? false : 'auto'"
    html-policy="safe"
  />
</template>
```

## Limitations

- Browser-only peers cannot run during SSR.
- Hydration depends on correct host plugin/component boundaries.
- This skill does not configure deployment adapters.

## Security & Safety Notes

Do not expose trusted HTML or loose Mermaid settings to untrusted model output. Review dependency and runtime-boundary changes.
