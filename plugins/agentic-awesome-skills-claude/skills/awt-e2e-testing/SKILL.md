---
name: awt-e2e-testing
description: "AI-powered E2E web testing — eyes and hands for AI coding tools. Declarative YAML scenarios, Playwright execution, visual matching (OpenCV + OCR), platform auto-detection (Flutter/React/Vue), learning DB. Install: npx skills add ksgisang/awt-skill --skill awt -g"
risk: critical
source: "https://github.com/ksgisang/awt-skill"
date_added: "2026-03-16"
---

# AWT — AI-Powered E2E Testing (Beta)

> `npx skills add ksgisang/awt-skill --skill awt -g`

AWT gives AI coding tools the ability to see and interact with web applications through a real browser. Your AI designs YAML test scenarios; AWT executes them with Playwright.

## When to Use
- You need AI-assisted end-to-end testing through a real browser with declarative YAML scenarios.
- The test flow depends on visual matching, OCR, or platform auto-detection instead of stable DOM selectors.
- You want an E2E toolchain that can both execute tests and explain failures for AI coding workflows.

## Upstream Advertised Capabilities
- YAML scenarios → Playwright with human-like interaction
- Visual matching: OpenCV template + OCR (no CSS selectors needed)
- Platform auto-detection: Flutter, React, Next.js, Vue, Angular, Svelte
- Structured failure diagnosis with investigation checklists
- Learning DB: failure→fix patterns in SQLite
- 5 AI providers: Claude, OpenAI, Gemini, DeepSeek, Ollama
- Skill Mode: no extra AI API key needed

## Execution Boundary

This entrypoint does not bundle the AWT runtime or its YAML schema. Inspect the selected upstream revision and actual installed commands before authoring a scenario. The installation command above is an upstream option, not permission to change global skills. Prefer an explicitly authorized project-scoped installation.

Confirm the target environment, test accounts, permitted browser actions and data retention. A checkout test can place orders or send notifications; use an isolated fixture environment and inspect effects before execution. Do not send screenshots, credentials or application data to a cloud provider without authorization. Record the actual scenario, runtime/version, observed result and artifact paths. If runtime is absent, return a draft and mark execution pending rather than inventing a pass.

## Links
- Main repo: https://github.com/ksgisang/AI-Watch-Tester
- Skill repo: https://github.com/ksgisang/awt-skill
- Cloud demo: https://ai-watch-tester.vercel.app

Built with the help of AI coding tools — and designed to help AI coding tools test better.

Actively developed by a solo developer at AILoopLab. Feedback welcome!

## Example

**User request:**

> Create and run a declarative browser test for the checkout flow, including visual assertions and a clear failure report.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
