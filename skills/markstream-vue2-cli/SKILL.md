---
name: markstream-vue2-cli
description: "Integrate markstream-vue2 into Vue CLI or Webpack 4 with export-map-safe CSS, CDN worker fallbacks, and conservative code-block defaults."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-vue2-cli
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [vue2, vue-cli, webpack4, markdown, workers]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Vue 2 CLI

## Overview

Handle Vue CLI and Webpack 4 constraints that differ materially from modern Vue 2/Vite setup.

## When to Use

Use when Vue 2 runs on Vue CLI or Webpack 4 and package export maps or Vite worker imports are unavailable.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Vue 2 plus Vue CLI/Webpack 4.
2. Install `markstream-vue2` and only requested peers.
3. Import `markstream-vue2/dist/index.css`, because legacy tooling may not understand the CSS export map.
4. Avoid `?worker` imports. Use Markstream CDN worker helpers for KaTeX or Mermaid only when needed.
5. Prefer `stream-markdown` code blocks over fragile Monaco worker wiring.
6. Keep `content` with smooth streaming for chat; set `final` and disable pacing/cursor for completed history.
7. Keep HTML safe and Mermaid strict; validate the actual legacy build.

## Example

```vue
<script>
import MarkdownRender from 'markstream-vue2'
// Legacy Webpack may not resolve the package CSS export map.
import 'markstream-vue2/dist/index.css'

export default {
  components: { MarkdownRender },
  data: () => ({ content: '# Answer', done: false }),
}
</script>

<template>
  <MarkdownRender
    :content="content"
    :final="done"
    :fade="false"
  />
</template>
```

## Limitations

- CDN workers require network access and compatible content-security policy.
- Monaco-style worker setups are intentionally not covered.
- Vue 2.6 may also require `@vue/composition-api`.

## Security & Safety Notes

Do not introduce CDN workers without reviewing CSP, network policy, and dependency trust. Preserve safe rendering defaults.
