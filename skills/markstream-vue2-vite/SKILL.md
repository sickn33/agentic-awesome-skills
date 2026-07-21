---
name: markstream-vue2-vite
description: "Integrate markstream-vue2 into Vue 2 plus Vite with bundled worker imports, CSS ordering, Composition API compatibility, and safe streaming defaults."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-vue2-vite
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [vue2, vite, markdown, workers, streaming]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Vue 2 Vite

## Overview

Use Vite-native worker bundling while preserving Vue 2 compatibility and rendering safety.

## When to Use

Use when the host is Vue 2 with Vite and needs bundled Mermaid or KaTeX workers. Use the generic Vue 2 skill when worker/bundler behavior is irrelevant.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Vue 2 with Vite and install only requested peers.
2. Import `markstream-vue2/index.css` after reset, Tailwind, or UnoCSS layers.
3. Use package worker entrypoints with Vite `?worker` or `?worker&inline` imports only when needed.
4. Add `@vue/composition-api` only for Vue 2.6 code requiring it.
5. Keep `content` with smooth streaming for chat; set `final` and disable pacing/cursor for history.
6. Use `nodes` only for externally owned parsing. Keep HTML safe and Mermaid strict.
7. Validate the Vite build and worker loading path.

## Example

```vue
<script>
import MarkdownRender from 'markstream-vue2'
import 'markstream-vue2/index.css'

export default {
  components: { MarkdownRender },
  props: { content: String, done: Boolean },
}
</script>

<template>
  <MarkdownRender
    :content="content"
    :final="done"
    :fade="done"
  />
</template>
```

## Limitations

- Vite worker syntax is not portable to Vue CLI/Webpack 4.
- Inline workers can increase bundle size.
- Optional peers may impose additional browser requirements.

## Security & Safety Notes

Review worker source, CSP, dependency changes, and bundle impact. Do not relax safe rendering defaults.
