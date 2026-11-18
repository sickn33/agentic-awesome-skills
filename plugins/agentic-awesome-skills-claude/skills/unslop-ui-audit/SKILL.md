---
name: unslop-ui-audit
description: "Use the Unslop UI design linter for static frontend diagnostics, contrast checks, and reviewing design presets."
category: frontend
risk: critical
source: self
source_type: self
date_added: "2026-11-14"
author: "@avivgerz-hue"
tags: [ui, accessibility, design-system, frontend, css]
---

# Unslop UI Audit

## When to Use

Use this skill to review spacing, typography, focus indicators, and color contrast in frontend source. The separate `unslop` skill in this catalog processes prose.

## Workflow

1. Choose an authorized local frontend source directory. Review the pinned Unslop MCP npm package before running it. Its first invocation may fetch code from npm.
2. Run the static diagnostics on that directory and review the reported file and line for each finding.

~~~bash
npx -y unslop-mcp@2.1.2 audit ./src
~~~

3. Inspect available presets with `npx -y unslop-mcp@2.1.2 presets`. Presets are optional design references. Applying one can write design tokens, instruction files, and MCP configuration. Obtain authorization, use an isolated branch, and inspect the complete changes.
4. Verify the corrected component in a browser at relevant viewport sizes and repeat the audit.

## Examples

For a Tailwind dashboard with low-contrast labels, run the audit against its source, confirm the theme tokens used by the labels, patch the tokens, and verify rendered contrast and focus states.

## Limitations

Static checks cannot establish accessibility conformance or evaluate all rendered states, dynamic styles, or human interaction. Review diagnostics in context. Keep URL extraction and writes outside the scope of an ordinary local audit.

## Sources

- [Unslop UI linter and preset documentation](https://github.com/avivgerz-hue/unslop)
