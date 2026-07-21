---
name: markstream-vue2
description: "Integrate markstream-vue2 into Vue 2.6 or 2.7 with correct Composition API decisions, CSS, streaming state, optional peers, and scoped overrides."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-vue2
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [vue2, markdown, streaming, compatibility, frontend]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Vue 2

## Overview

Handle Vue 2.6/2.7 compatibility decisions that the generic installer cannot resolve safely.

## When to Use

Use for Vue 2 integration when no bundler-specific edge case dominates. Use `markstream-vue2-cli` for Vue CLI/Webpack 4 and `markstream-vue2-vite` for Vite worker imports.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Vue 2.6 or 2.7 and install `markstream-vue2`.
2. Add `@vue/composition-api` only for Vue 2.6 code that uses Composition API patterns; Vue 2.7 has built-in support.
3. Import `markstream-vue2/index.css` after resets.
4. Start with `<MarkdownRender :content="markdown" />` and smooth streaming `auto`.
5. For live chat disable fade and opt into the cursor; on completion set `final`, disable pacing/cursor, and enable fade only if desired.
6. Use `nodes` only when another layer owns parsing. Use scoped mappings for overrides.
7. Keep HTML safe and Mermaid strict; validate with the smallest build or dev command.

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
    :typewriter="!done"
  />
</template>
```

## Limitations

- Vue 2.6 and 2.7 have different Composition API requirements.
- Legacy bundlers require the dedicated specializations.
- Optional modern peers may not support every Vue 2 toolchain.

## Security & Safety Notes

Review dependency and compatibility changes. Do not relax rendering safety for untrusted content.
