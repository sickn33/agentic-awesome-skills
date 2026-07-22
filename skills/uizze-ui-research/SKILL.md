---
name: uizze-ui-research
description: "Use when building or reviewing web and iOS UI and you need real references from the free UIZZE public catalog, a structured design contract, or a hard pre-ship finish gate; use MCP when configured."
category: design
risk: safe
source: https://github.com/uizze/uizze-mcp/tree/main/skills/uizze-ui-research
source_repo: uizze/uizze-mcp
source_type: official
date_added: "2026-07-12"
author: samuelbushi
tags: [ui-design, ui-research, mcp, design-contracts, agent-workflows]
tools: [claude, cursor, codex, copilot, antigravity, lovable]
---

# UIZZE UI Research

## Overview

Use [UIZZE](https://uizze.com) to give coding agents real product-UI context before implementation rather than relying on a generic styling prompt. The public catalog at https://uizze.com supports a free manual workflow without an account; the hosted MCP automates the workflow and requires full access plus a configured UIZZE agent token.

This skill turns UI research into an explicit workflow: retrieve relevant references, translate transferable patterns into a design contract, implement within the current project's system, and run the available validation or critique gates.

## When to Use This Skill

- You are designing a new product screen, flow, or component for web or iOS.
- You need real interface references before implementing an AI-generated UI.
- You are reviewing an implementation against explicit design constraints.
- You need to reduce generic or repetitive UI by grounding work in observed product patterns.

## How It Works

### Step 1: Confirm product scope and access mode

Identify the screen's primary user, job, action, existing design system, real content or data, and required loading, empty, error, success, and permission states. If UIZZE MCP is already configured, use it for the hosted workflow. Otherwise, continue with the free public catalog at https://uizze.com. If browsing is unavailable, ask the user for two or three relevant UIZZE links or screenshots. Do not block the manual workflow, bypass access controls, or expose credentials.

### Step 2: Retrieve relevant visual context

Find the smallest useful set of screens, flows, components, or elements that match the product task. Focus on transferable patterns such as hierarchy, navigation, interaction states, spacing, density, and responsive behavior. Distinguish observed evidence from assumptions, and do not claim that MCP returned results when the research was manual.

### Step 3: Make constraints explicit

Write a short design contract that names the screen job, content hierarchy, primary action, allowed project components and tokens, required states, responsive behavior, product-specific decisions, forbidden generic patterns, and verification criteria. Adapt patterns to the existing project design system instead of treating any reference as a visual template.

### Step 4: Implement within the product

Build with the repository's existing components and tokens. Preserve platform conventions and make the interface specific to the product's content and workflow rather than adding decorative cards, badges, gradients, or motion by default.

### Step 5: Run a hard finish gate

Inspect the rendered result when the environment supports it, use the available UIZZE validation, audit, or critique workflow when configured, and reject completion if any of these checks fail:

- The hierarchy does not make the screen job and primary action immediately clear.
- A visible control is inert, ambiguous, or missing its interaction outcome.
- Required loading, empty, error, success, permission, or responsive states are absent.
- The implementation drifts from the project's existing components, tokens, or platform conventions.
- Interchangeable card grids, filler metrics, vague copy, or decorative effects replace product-specific decisions.

Name each blocking issue, fix it, and rerun the gate plus the project's normal tests. Never claim a rendered or MCP-backed check that was not actually performed.

## Examples

### Research an iOS onboarding flow

```text
Use UIZZE to research real iOS onboarding flows for a subscription product. Identify transferable patterns for progressive disclosure and permission timing, turn them into a concise design contract, then propose an implementation that fits this app's existing design system.
```

### Review a web settings screen

```text
Use UIZZE to inspect relevant real product settings screens, audit this implementation against a design contract for hierarchy, form states, and navigation, then list the concrete changes needed before release.
```

## Best Practices

- ✅ Start with the smallest relevant set of references rather than collecting a broad gallery.
- ✅ Separate observed patterns from the current project's brand and component rules.
- ✅ Use validation findings as implementation feedback, not as permission to copy an interface.
- ✅ Keep the manual workflow useful when hosted MCP access is unavailable.
- ❌ Do not reproduce another product's brand, proprietary copy, assets, or exact layout.
- ❌ Do not commit agent tokens, include them in prompts, or place them in client-side code.

## Security & Safety Notes

- Keep the UIZZE agent token in local agent configuration or an environment variable only.
- Hosted MCP workflows require authorized access; the free catalog does not grant permission to use paid workflows.
- Treat returned references as research context, not reusable visual assets.

## Common Pitfalls

- **Problem:** Treating a reference as a design to clone.
  **Solution:** Extract the interaction or hierarchy pattern, then implement it using the target project's own design system and content.
- **Problem:** Starting implementation before the agent has relevant UI context.
  **Solution:** Search for the smallest useful set of matching screens or flows first, then define constraints before coding.
- **Problem:** Treating an unavailable MCP connection as a reason to stop.
  **Solution:** Use the free public catalog manually, or ask the user for two or three relevant UIZZE links or screenshots, and continue with the same design-contract and finish-gate workflow.
- **Problem:** Exposing an agent token in a repository or chat transcript.
  **Solution:** Store credentials only in supported local configuration or environment variables and rotate a token if it is exposed.

## Related Skills

- `@stitch-ui-design` - Use when generating or iterating UI concepts in Google Stitch.

## Limitations

- This skill does not replace product-specific user research, accessibility review, project tests, or human design judgment.
- It cannot make a hosted UIZZE MCP workflow available without a valid authorized connection.
- Stop and ask for clarification if the product goal, existing design system, or access boundaries are missing.