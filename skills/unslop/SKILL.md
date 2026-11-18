---
name: unslop
description: "Audit frontend codebases with 72 deterministic UI design craft rules, WCAG 2.1 AA/AAA and APCA contrast math, and 10 studio design presets."
category: frontend
risk: safe
source: self
source_type: self
date_added: "2026-11-14"
author: "@avivgerz-hue"
tags:
  - ui
  - design-system
  - accessibility
  - wcag
  - tailwind
  - css
  - frontend
  - mcp
---

# Unslop — 72-Rule UI Design Craft & Anti-Slop Skill

## Overview

`unslop` is a deterministic, offline static UI design auditor and design-token generator for React, Next.js, Vue, Svelte, Tailwind CSS, and CSS codebases. It evaluates 72 rules across 7 UI craft pillars, validates WCAG 2.1 AA/AAA and APCA perceptual contrast ratios, and applies 10 curated studio design archetypes (`swiss-grid`, `linear-dark`, `editorial-serif`, `neo-brutalist`, `nordic-minimal`, `warm-craft`, `technical-mono`, `glassmorphic-depth`, `high-contrast-pro`, `organic-calm`).

## When to Use This Skill

- Use this skill when generating, refactoring, or reviewing frontend UI components, landing pages, dashboards, or Tailwind/CSS themes.
- Use this skill when a user asks to make an AI-generated web app look less generic or fix contrast, typography, spacing, and visual hierarchy issues.
- Do not use this skill for backend database queries or non-UI infrastructure scripts.

## Workflow & Commands

### 1. Run a 72-Rule UI Design & Contrast Audit

~~~bash
npx -y unslop-mcp@latest audit .
~~~

### 2. Inspect Available Studio Design Archetypes

~~~bash
npx -y unslop-mcp@latest presets
~~~

### 3. Initialize a Studio Preset & Agent Rules

~~~bash
npx -y unslop-mcp@latest init --preset linear-dark --agent all
~~~

## Verification Checklist

1. Re-run `npx -y unslop-mcp@latest audit .` after applying UI refactors.
2. Confirm zero critical WCAG 2.1 AA / APCA contrast violations remain.
3. Confirm spacing tokens, border radii, and typography follow a consistent modular scale.
