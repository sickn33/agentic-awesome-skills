---
name: markstream-svelte
description: "Integrate the beta markstream-svelte renderer into Svelte 5 or SvelteKit with runes, explicit CSS, smooth streaming, workers, and SSR-safe boundaries."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-svelte
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [svelte, sveltekit, markdown, streaming, ssr]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Svelte

## Overview

Integrate Markstream using Svelte 5 runes and SvelteKit-safe browser boundaries.

## When to Use

Use for Svelte 5 or SvelteKit package setup, streaming state, workers, or scoped custom components. Svelte 4 is unsupported.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Svelte 5 and acceptance of a beta package.
2. Install only requested peers; import package CSS after resets and KaTeX CSS only for math.
3. Start with `<MarkdownRender {content} />` and smooth streaming `auto`.
4. For live chat disable fade and opt into the cursor; on completion set `final`, disable pacing/cursor, and enable fade only if desired.
5. Use `nodes` only for worker-owned parsing or shared AST state.
6. Use `$props()` and callbacks. Configure KaTeX or Mermaid workers only when requested.
7. Prefer renderer-local `customComponents`; use scoped registration only when sharing is intentional.
8. Keep browser-only workers behind SvelteKit client boundaries; validate with `svelte-check`, build, or e2e.

## Example

```svelte
<script lang="ts">
  import MarkdownRender from 'markstream-svelte'
  import 'markstream-svelte/index.css'

  let { content, isDone }: { content: string; isDone: boolean } = $props()
</script>

<MarkdownRender
  {content}
  final={isDone}
  fade={isDone}
  typewriter={!isDone}
  smoothStreaming={isDone ? false : 'auto'}
  htmlPolicy="safe"
/>
```

## Limitations

- Svelte 4 is unsupported and the package is beta.
- Workers and heavy peers require client-side bundler support.
- This skill does not migrate unrelated Svelte architecture.

## Security & Safety Notes

Keep safe HTML and strict Mermaid defaults. Review dependencies and never run browser-only peers during SSR.
