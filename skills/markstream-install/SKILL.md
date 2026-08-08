---
name: markstream-install
description: "Install and configure Markstream streaming Markdown renderers for Vue, React, Svelte, Angular, Nuxt, Next.js, and Vue 2 applications."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-install
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-19"
author: Simon-He95
tags: [markdown, streaming, vue, react, svelte, angular, ai-chat]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Install

## Overview

Integrate the correct [Markstream](https://github.com/Simon-He95/markstream-vue) streaming Markdown renderer into an existing frontend application. This skill selects the framework package, installs only requested optional peers, preserves safe HTML and Mermaid defaults, and handles CSS, streaming state, and SSR boundaries.

Read [references/scenarios.md](references/scenarios.md) before selecting packages or optional peers.

## When to Use

Use this skill when the user asks to:

- add streaming Markdown rendering to an AI chat or document interface;
- install Markstream in Vue, Nuxt, React, Next.js, Svelte, Angular, or Vue 2;
- repair missing Markstream styles, an incorrect framework package, or an SSR failure;
- replace another Markdown renderer with Markstream;
- choose between static content, built-in smooth streaming, or externally parsed AST input.

## How It Works

### 1. Inspect the host application

Before changing dependencies, inspect:

- the framework and version in `package.json`;
- the existing package-manager lockfile;
- whether the application uses SSR;
- reset, Tailwind, UnoCSS, or design-system styles;
- required optional features such as highlighted code, Monaco, Mermaid, D2, or KaTeX.

Do not select `markstream-vue` merely because the source repository has Vue in its name. Choose the framework-specific package from the scenario table.

### 2. Install the smallest dependency set

Before installing or changing source files, preview the exact dependency and code changes and obtain explicit user approval. Do not switch package managers or replace an existing renderer implicitly.

Install exactly one framework package and preserve the repository's package manager. Add optional peers only when the requested UI uses their feature.

Examples:

```bash
npm install markstream-vue
npm install markstream-react
npm install markstream-svelte
npm install markstream-angular
npm install markstream-vue2
```

For Vue 2.6, also install and register `@vue/composition-api`. Vue 2.7 has a built-in Composition API and must not install that plugin.

### 3. Wire styles in the correct order

Import application resets before Markstream styles. Import package CSS explicitly instead of relying on component imports to inject it.

For Tailwind or UnoCSS, put the matching package stylesheet in a component layer:

```css
@import 'markstream-vue/index.css' layer(components);
```

When math rendering is enabled, also import:

```css
@import 'katex/dist/katex.min.css';
```

Vue CLI 4 and other Webpack 4-based Vue 2 projects do not understand package export maps. Use the published file path in those projects:

```ts
import 'markstream-vue2/dist/index.css'
```

### 4. Add the smallest working renderer

Prefer `content` for static documents and most streaming chat interfaces. Markstream's built-in smooth streaming can pace irregular token delivery without requiring the host application to maintain an AST.

Use `nodes` plus `final` only when a worker, shared AST store, custom transform, or another application layer already owns parsing.

### 5. Handle framework boundaries

- In Nuxt, keep browser-only optional peers behind client boundaries.
- In Next.js, use root `markstream-react` inside a `'use client'` component for live SSE or WebSocket streams.
- Use `markstream-react/next` for SSR-first HTML with hydration and `markstream-react/server` for server-only rendering.
- Use `markstream-svelte` only with Svelte 5.
- Confirm the host meets the current `markstream-angular` version requirement.
- In Vue 3, use `mode="chat"` for AI chat, `mode="docs"` for rich documents, and `mode="minimal"` for lightweight non-chat surfaces.

### 6. Preserve safe defaults

HTML policy defaults to `safe`, and Mermaid uses strict mode. Do not broaden either setting unless the user explicitly identifies a trusted legacy surface that requires it. Scope any exception to that surface.

### 7. Validate

Run the smallest relevant build, typecheck, or test command. Confirm:

1. the selected package matches the framework;
2. only requested optional peers were added;
3. styles load after resets;
4. SSR pages do not evaluate browser-only peers on the server;
5. static content and at least one incremental update render correctly.

Report the selected package, added peers, CSS location, streaming input choice, and validation command.

## Examples

### Vue 3 streaming chat

```vue
<MarkdownRender
  mode="chat"
  :content="markdown"
  :final="false"
  smooth-streaming="auto"
  :fade="false"
  typewriter
/>
```

### Vue 3 completed chat history

```vue
<MarkdownRender
  mode="chat"
  :content="markdown"
  :final="true"
  :smooth-streaming="false"
  :fade="true"
  :typewriter="false"
/>
```

Setting `final=true` tells the parser that the document is complete; disabling pacing alone does not finalize trailing constructs.

## Best Practices

- Install the minimal peer set instead of every optional integration.
- Keep the renderer mode stable when a chat message transitions from streaming to history.
- Let an existing outer message virtualizer own mounted rows; coordinate Markstream height metrics instead of adding a competing virtualizer.
- Scope component overrides with `customId` or `custom-id` when multiple render surfaces coexist.
- Test SSR and incremental client updates separately.

## Limitations

- This skill does not choose application-specific visual styling or chat architecture.
- Optional browser-heavy peers can require framework-specific client boundaries and bundler configuration.
- Vue 2.6 and legacy Webpack projects require the compatibility steps documented above.
- Current package and framework requirements must be checked against the host lockfile and Markstream documentation before installation.

## Security & Safety Notes

- Package installation changes the dependency manifest and lockfile. Review the proposed package set before running the install command.
- Do not enable trusted HTML or non-strict Mermaid rendering for untrusted model output.
- Keep optional browser runtimes out of server-only execution paths.
- Run installs only inside the intended project directory and use its existing package manager.

## Common Pitfalls

- **Problem:** Styles appear missing or are overwritten.
  **Solution:** Load resets first, then the matching Markstream stylesheet explicitly.
- **Problem:** A completed response still looks incomplete.
  **Solution:** Set `final=true` when the stream finishes, not only `smoothStreaming=false`.
- **Problem:** Next.js evaluates browser-only code on the server.
  **Solution:** Select the root, `/next`, or `/server` entry according to the render boundary.
- **Problem:** Lightweight highlighting does not activate after installing `stream-markdown`.
  **Solution:** On Vue, Vue 2, or React, configure `MarkdownCodeBlockNode` as the `code_block` override.

## Additional Resources

- [Installation](https://markstream.simonhe.me/guide/installation)
- [AI chat and streaming](https://markstream.simonhe.me/guide/ai-chat-streaming)
- [Performance](https://markstream.simonhe.me/guide/performance)
- [Troubleshooting](https://markstream.simonhe.me/guide/troubleshooting)
- [Component overrides](https://markstream.simonhe.me/guide/component-overrides)
