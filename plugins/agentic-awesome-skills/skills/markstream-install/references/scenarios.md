# Install Scenarios

## Package selection

| Host app | Package and setup |
|----------|-------------------|
| Vue 3 / Nuxt 3 or 4 | `markstream-vue` |
| Vue 2.6 | `markstream-vue2` plus `@vue/composition-api`; register the plugin before mounting the app |
| Vue 2.7 | `markstream-vue2`; use Vue's built-in Composition API and do not install `@vue/composition-api` |
| React 18+ / Next.js | `markstream-react` |
| Angular 20+ | `markstream-angular` |
| Svelte 5 | `markstream-svelte` |

## Peer selection

| Feature | Peer | Supported packages | Activation |
|---------|------|--------------------|------------|
| Lightweight highlighted code blocks | `stream-markdown` | `markstream-vue`, `markstream-vue2`, `markstream-react` | Configure the package's `MarkdownCodeBlockNode` as the `code_block` override |
| Monaco-powered code blocks | `stream-monaco` | All framework packages | Install only when Monaco interactions are required |
| Mermaid diagrams | `mermaid` | All framework packages | Install when Mermaid fences are rendered |
| D2 diagrams | `@terrastruct/d2` | All framework packages | Install when D2 fences are rendered |
| KaTeX math | `katex` | All framework packages | Install and load KaTeX CSS when math is rendered |

## CSS checklist

- Load reset styles first.
- Load the framework-specific Markstream CSS after the reset.
- In Tailwind or UnoCSS projects, use `@import '...' layer(components)`.
- Import KaTeX CSS when math is enabled.
- When rendering standalone node components directly, wrap them with the relevant package root class such as `.markstream-vue`, `.markstream-react`, or `.markstream-svelte`.

## Input choice

- `content`: static documents, low-frequency updates, and most SSE or token-streaming chat surfaces.
- `content` with built-in smooth streaming: irregular AI streams whose visible output should be paced independently from raw chunk cadence.
  - `smoothStreaming="auto"` or `smooth-streaming="auto"` is the default.
  - Auto pacing activates when `typewriter=true` or `maxLiveNodes <= 0` / `max-live-nodes <= 0`.
  - `typewriter` controls the cursor and defaults to `false`.
  - `fade` controls node-entry and streamed-text fade effects.
- `nodes` plus `final`: worker-preparsed content, shared AST stores, custom AST transforms, or cases where another layer already owns parsing.

## Next.js entry selection

| Surface | Entry |
|---------|-------|
| Live SSE or WebSocket output in a Client Component | `markstream-react` |
| SSR-first HTML with client hydration | `markstream-react/next` |
| Server-only Markdown rendering | `markstream-react/server` |
