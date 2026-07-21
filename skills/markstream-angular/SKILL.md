---
name: markstream-angular
description: "Integrate the alpha markstream-angular renderer into Angular 20+ applications with standalone components, signals, safe HTML defaults, and optional peer features."
category: frontend
risk: critical
source: https://github.com/Simon-He95/markstream-vue/tree/main/.agents/skills/markstream-angular
source_repo: Simon-He95/markstream-vue
source_type: official
date_added: "2026-07-21"
author: Simon-He95
tags: [angular, markdown, streaming, ai-chat, frontend]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/Simon-He95/markstream-vue/blob/main/license
---

# Markstream Angular

## Overview

Add Markstream to Angular 20+ while preserving standalone-component patterns, signal-friendly bindings, safe rendering defaults, and explicit optional dependencies. Use `markstream-install` for framework selection; use this skill once Angular is confirmed.

## When to Use

Use for Angular-specific standalone imports, CSS, signals, custom tags or components, streaming state, and optional peers. Do not use below Angular 20 or when the application cannot accept an alpha renderer API.

## Workflow

Before changing dependencies or source files, inspect the existing package manager and project conventions, preview the intended edits, and obtain explicit user approval.

1. Confirm Angular 20+ and record that `markstream-angular` is alpha.
2. Install the package plus only requested peers. Import `markstream-angular/index.css`; add KaTeX CSS only for math.
3. Import `MarkstreamAngularComponent` into the standalone component's `imports`.
4. Start with `[content]` and `[smoothStreaming]="'auto'"`. Use `nodes` plus `final` only when another layer owns the AST.
5. For live chat use `[fade]="false"` and opt into `[typewriter]="true"`. On completion set `[final]="true"`, disable pacing/cursor, and enable fade only if desired.
6. Use `[customHtmlTags]` and `[customComponents]` only for trusted tag workflows.
7. Keep `[htmlPolicy]="'safe'"` and Mermaid strict mode unless a narrowly scoped trusted legacy surface requires otherwise.
8. Validate with the smallest Angular build, typecheck, or dev command.

## Example

```ts
import { Component, signal } from '@angular/core'
import { MarkstreamAngularComponent } from 'markstream-angular'
import 'markstream-angular/index.css'

@Component({
  selector: 'app-answer',
  standalone: true,
  imports: [MarkstreamAngularComponent],
  template: `
    <markstream-angular
      [content]="markdown()"
      [final]="done()"
      [fade]="done()"
      [typewriter]="!done()"
      [smoothStreaming]="done() ? false : 'auto'"
      [htmlPolicy]="'safe'"
    />
  `,
})
export class AnswerComponent {
  markdown = signal('# Streaming answer')
  done = signal(false)
}
```

## Limitations

- Requires Angular 20+ and an alpha package.
- Browser-heavy peers may need bundler or client-boundary work.
- This skill does not design the host chat architecture or visual system.

## Security & Safety Notes

Review dependency changes before installation. Never broaden HTML or Mermaid trust settings for untrusted model output.
