---
name: wiki-vitepress
description: "Transform generated wiki Markdown files into a polished VitePress static site with dark theme and interactive Mermaid diagrams. Use when user asks to \"build a site\" or \"package as VitePress\", user runs the /deep-wiki, or user wants a browsable HTML output from generated wiki pages."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Wiki VitePress Packager

Transform generated wiki Markdown files into a polished VitePress static site with dark theme and interactive Mermaid diagrams.

## When to Use
- User asks to "build a site" or "package as VitePress"
- User runs the `/deep-wiki:build` command
- User wants a browsable HTML output from generated wiki pages

## VitePress Scaffolding

Generate the following structure in a `wiki-site/` directory:

```
wiki-site/
├── .vitepress/
│   ├── config.mts
│   └── theme/
│       ├── index.ts
│       └── custom.css
├── public/
├── [generated .md pages]
├── package.json
└── index.md
```

## Config Requirements (`config.mts`)

- Use `withMermaid` wrapper from `vitepress-plugin-mermaid`
- Set `appearance: 'dark'` for dark-only theme
- Configure `themeConfig.nav` and `themeConfig.sidebar` from the catalogue structure
- Mermaid config must set dark theme variables:

```typescript
mermaid: {
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1e3a5f',
    primaryTextColor: '#e0e0e0',
    primaryBorderColor: '#4a9eed',
    lineColor: '#4a9eed',
    secondaryColor: '#2d4a3e',
    tertiaryColor: '#2d2d3d',
    background: '#1a1a2e',
    mainBkg: '#1e3a5f',
    nodeBorder: '#4a9eed',
    clusterBkg: '#16213e',
    titleColor: '#e0e0e0',
    edgeLabelBackground: '#1a1a2e'
  }
}
```

## Dark-Mode Mermaid: Three-Layer Fix

### Layer 1: Theme Variables (in config.mts)
Set via `mermaid.themeVariables` as shown above.

### Layer 2: CSS Overrides (`custom.css`)
Target Mermaid SVG elements with `!important`:

```css
.mermaid .node rect,
.mermaid .node circle,
.mermaid .node polygon { fill: #1e3a5f !important; stroke: #4a9eed !important; }
.mermaid .edgeLabel { background-color: #1a1a2e !important; color: #e0e0e0 !important; }
.mermaid text { fill: #e0e0e0 !important; }
.mermaid .label { color: #e0e0e0 !important; }
```

### Layer 3: Inline Style Replacement (`theme/index.ts`)
Mermaid inline `style` attributes override everything. Use `onMounted` + polling to replace them:

```typescript
import { onMounted } from 'vue'

// In setup()
onMounted(() => {
  let attempts = 0
  const fix = setInterval(() => {
    document.querySelectorAll('.mermaid svg [style]').forEach(el => {
      const s = (el as HTMLElement).style
      if (s.fill && !s.fill.includes('#1e3a5f')) s.fill = '#1e3a5f'
      if (s.stroke && !s.stroke.includes('#4a9eed')) s.stroke = '#4a9eed'
      if (s.color) s.color = '#e0e0e0'
    })
    if (++attempts >= 20) clearInterval(fix)
  }, 500)
})
```

Use `setup()` with `onMounted`, NOT `enhanceApp()` — DOM doesn't exist during SSR.

## Click-to-Zoom for Mermaid Diagrams

Wrap each `.mermaid` container in a clickable wrapper that opens a fullscreen modal:

```typescript
document.querySelectorAll('.mermaid').forEach(el => {
  el.style.cursor = 'zoom-in'
  el.addEventListener('click', () => {
    const modal = document.createElement('div')
    modal.className = 'mermaid-zoom-modal'
    modal.innerHTML = el.outerHTML
    modal.addEventListener('click', () => modal.remove())
    document.body.appendChild(modal)
  })
})
```

Modal CSS:
```css
.mermaid-zoom-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; cursor: zoom-out;
}
.mermaid-zoom-modal .mermaid { transform: scale(1.5); }
```

## Post-Processing Rules

Before VitePress build, scan all `.md` files and fix:
- Replace `<br/>` with `<br>` (Vue template compiler compatibility)
- Wrap bare `<T>` generic parameters in backticks outside code fences
- Ensure every page has YAML frontmatter with `title` and `description`

## Build

```bash
cd wiki-site && npm install && npm run docs:build
```

Output goes to `wiki-site/.vitepress/dist/`.

## Known Gotchas

- Mermaid renders async — SVGs don't exist when `onMounted` fires. Must poll.
- `isCustomElement` compiler option for bare `<T>` causes worse crashes — do NOT use it
- Node text in Mermaid uses inline `style` with highest specificity — CSS alone won't fix it
- `enhanceApp()` runs during SSR where `document` doesn't exist — use `setup()` only

### When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
