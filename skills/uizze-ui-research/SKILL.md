---
name: uizze-ui-research
description: "Use when building or reviewing web and iOS product UI and you need a free UI Slop Gate, real UI references, structured design contracts, or implementation validation through UIZZE."
category: design
risk: safe
source: https://github.com/uizze/uizze
source_repo: uizze/uizze
source_type: official
license: MIT
license_source: https://github.com/uizze/uizze/blob/main/LICENSE
date_added: "2026-07-12"
author: UIZZE
tags: [ui-design, ui-research, mcp, design-contracts, agent-workflows]
tools: [claude, cursor, codex, copilot, antigravity, lovable]
---

# UIZZE UI Research

## Overview

Use UIZZE to give coding agents a concrete UI check before implementation turns into another generic screen. Start with the free UI Slop Gate when you need a fast rendered HTML/CSS check. Use the full UIZZE MCP when the work needs real product references, a design contract, and a final implementation review.

This skill turns UI research into an explicit workflow: retrieve relevant references, translate transferable patterns into a design contract, implement within the current project's system, and run the available validation or critique gates.

## When to Use This Skill

- You are designing a new product screen, flow, or component for web or iOS.
- You need real interface references before implementing an AI-generated UI.
- You are reviewing an implementation against explicit design constraints.
- You need to reduce generic or repetitive UI by grounding work in observed product patterns.
- You have rendered HTML/CSS and need a no-account first check before deciding whether the task needs deeper reference research.

## How It Works

### Step 1: Start with the smallest useful check

For a quick rendered-screen check, add the free UI Slop Gate to a supported coding agent:

```bash
codex mcp add uizze-preview --url https://uizze.com/mcp/preview
```

Give `check_ui_slop` the rendered HTML and CSS you are comfortable supplying. The preview requires no UIZZE login and exposes only that bounded diagnostic. It does not search the reference catalog or create a design contract.

If the task needs research rather than a first check, browse the public catalog or connect the full UIZZE MCP through the client’s normal OAuth flow. Do not bypass access controls or expose credentials.

### Step 2: Retrieve relevant visual context

When the full connection is available, use UIZZE to find screens, flows, components, or elements that match the product task. Focus on transferable patterns such as hierarchy, navigation, interaction states, spacing, density, and responsive behavior.

### Step 3: Make constraints explicit

Create or use a structured design contract when the task needs explicit acceptance criteria. Adapt patterns to the existing project design system instead of treating any reference as a visual template.

### Step 4: Validate before completion

Use the full UIZZE validation, audit, or critique workflow when the implementation is ready for review. Resolve the findings in the project and run normal project tests before calling the work complete.

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

- Keep any full-connection credential in local agent configuration only; never commit it or include it in client-side code.
- The free preview receives only rendered HTML/CSS explicitly supplied for its one diagnostic tool. It does not grant access to the full reference catalog or contract workflow.
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
- The free preview cannot search UIZZE references, create design contracts, or replace the full implementation review workflow.
- Stop and ask for clarification if the product goal, existing design system, or access boundaries are missing.
