---
name: markstream-vue
description: "Integrate markstream-vue into plain Vue 3 with renderer modes, code and DOM choices, streaming state, virtualization, optional peers, and scoped components."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-vue
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [vue, markdown, streaming, virtualization, ai-chat]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Vue 3

## Overview

Configure the Vue 3 renderer beyond generic installation: surface modes, streaming lifecycle, code rendering, long-message virtualization, and scoped overrides.

## When to Use

Use for a plain Vue 3 application after the package has been selected. Use `markstream-nuxt` when SSR-specific Nuxt boundaries matter.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Vue 3 and not Nuxt. Install only requested peers and import `markstream-vue/index.css` after resets.
2. Start with `content`. Use `mode="chat"` for AI streams, `docs` for rich documents, and `minimal` for lightweight non-chat surfaces.
3. Choose fenced-code rendering explicitly: `pre` without a peer, `shiki` with `stream-markdown`, or compatibility-named `monaco` backed by `stream-diffs`.
4. For live chat use smooth streaming `auto`, no fade, and an optional cursor. On completion keep the same mode, set `final`, and disable pacing/cursor.
5. Use `nodes` only for worker parsing or structural AST ownership.
6. For long transcripts, keep an existing outer message virtualizer in charge. Use Markstream logical height rather than mounted DOM height.
7. Use scoped component registration and preserve safe HTML and Mermaid strict mode.
8. Validate the smallest build/typecheck plus one incremental stream and one long-message case.

## Example

```vue
<script setup lang="ts">
import MarkdownRender from 'markstream-vue'
import 'markstream-vue/index.css'

defineProps<{ content: string; isDone: boolean }>()
</script>

<template>
  <MarkdownRender
    mode="chat"
    :content="content"
    :final="isDone"
    :fade="isDone"
    :typewriter="!isDone"
    :smooth-streaming="isDone ? false : 'auto'"
    html-policy="safe"
  />
</template>
```

## Limitations

- Optional peers add bundle and browser-runtime cost.
- DOM-minimal mode disables wrapper-dependent features.
- Virtualization integration requires stable content and measurement keys.

## Security & Safety Notes

Review dependency changes. Never enable trusted HTML or loose Mermaid rendering for untrusted model output.
