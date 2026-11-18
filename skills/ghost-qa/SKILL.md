---
name: ghost-qa
description: "Run autonomous headless Playwright browser QA across Desktop, Tablet, and Mobile viewports to catch hydration, layout, overflow, and a11y bugs."
category: testing
risk: safe
source: self
source_type: self
date_added: "2026-11-14"
author: "@avivgerz-hue"
tags:
  - testing
  - playwright
  - qa
  - browser-automation
  - accessibility
  - frontend
  - e2e
  - mcp
---

# Ghost-QA — Autonomous Headless Playwright Browser QA Skill

## Overview

`ghost-qa` is a local headless Playwright browser verification CLI and MCP server that inspects running web applications across Desktop (`1440x900`), Tablet (`768x1024`), and Mobile (`375x812`) viewports. Its 8-Trap Engine detects console exceptions, React/Next.js hydration mismatches, failed network requests (`4xx`/`5xx`), dead interactions, horizontal viewport overflow, bounding-box element collisions, accessibility violations, and dark-mode contrast failures.

## When to Use This Skill

- Use this skill after building or modifying frontend pages, layouts, or interactive components to verify real browser rendering before deployment.
- Use this skill when diagnosing mobile `375px` overflow, overlapping sticky headers, or client-side hydration errors.
- Do not use this skill against third-party production websites without authorization; run it against local development servers (`http://localhost:3000`, `http://localhost:5173`, etc.).

## Workflow & Commands

### 1. Run Autonomous Multi-Viewport Browser QA

~~~bash
npx -y ghost-qa@latest test http://localhost:3000
~~~

### 2. Inspect Findings & Health Score

- Review the generated `0-100` QA Health Score, per-viewport trap breakdown, and `report.html` artifact.
- Fix any reported `scrollWidth > clientWidth` overflow, bounding-box overlaps, console errors, or missing ARIA labels.

### 3. Re-Verify Fix

~~~bash
npx -y ghost-qa@latest test http://localhost:3000
~~~

## Verification Checklist

1. Confirm `ghost-qa` reports 0 uncaught console/page errors and 0 hydration mismatches.
2. Confirm Desktop (`1440x900`), Tablet (`768x1024`), and Mobile (`375x812`) viewports have zero horizontal overflow or overlapping interactive elements.
