---
name: uizze-ui-research
description: "Use when building or reviewing web and iOS product UI and you need real UI references, structured design contracts, or implementation validation through UIZZE MCP."
category: design
risk: safe
source: https://github.com/aislon/uizze-mcp/tree/main/skills/uizze-ui-research
source_repo: aislon/uizze-mcp
source_type: official
date_added: "2026-07-12"
author: samuelbushi
tags: [ui-design, ui-research, mcp, design-contracts, agent-workflows]
tools: [claude, cursor, codex, copilot, antigravity, lovable]
---

# UIZZE UI Research

## Overview

Use UIZZE to give coding agents real product-UI context before implementation rather than relying on a generic styling prompt. The public catalog is free to browse; the hosted MCP workflow requires full access and a configured UIZZE agent token.

This skill turns UI research into an explicit workflow: retrieve relevant references, translate transferable patterns into a design contract, implement within the current project's system, and run the available validation or critique gates.

## When to Use This Skill

- You are designing a new product screen, flow, or component for web or iOS.
- You need real interface references before implementing an AI-generated UI.
- You are reviewing an implementation against explicit design constraints.
- You need to reduce generic or repetitive UI by grounding work in observed product patterns.

## How It Works

### Step 1: Confirm access and scope

Confirm that the UIZZE MCP connection is already configured with a valid agent token before invoking hosted workflows. If it is unavailable, use the free public catalog for research or ask the user to configure access; do not attempt to bypass access controls or expose credentials.

### Step 2: Retrieve relevant visual context

Use the available UIZZE tools to find screens, flows, components, or elements that match the product task. Focus on transferable patterns such as hierarchy, navigation, interaction states, spacing, density, and responsive behavior.

### Step 3: Make constraints explicit

Create or use a structured design contract when the task needs explicit acceptance criteria. Adapt patterns to the existing project design system instead of treating any reference as a visual template.

### Step 4: Validate before completion

Use the available UIZZE validation, audit, or critique workflow when the implementation is ready for review. Resolve the findings in the project and run normal project tests before calling the work complete.

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
- **Problem:** Exposing an agent token in a repository or chat transcript.
  **Solution:** Store credentials only in supported local configuration or environment variables and rotate a token if it is exposed.

## Related Skills

- `@stitch-ui-design` - Use when generating or iterating UI concepts in Google Stitch.

## Limitations

- This skill does not replace product-specific user research, accessibility review, project tests, or human design judgment.
- It cannot make a hosted UIZZE MCP workflow available without a valid authorized connection.
- Stop and ask for clarification if the product goal, existing design system, or access boundaries are missing.
