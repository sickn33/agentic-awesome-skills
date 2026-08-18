---
name: ui-quality-gate
description: "Design and review product-specific web and mobile interfaces with reference evidence, complete states, and a rendered finish gate."
category: design
risk: safe
source: community
source_repo: uizze/uizze
source_type: official
date_added: "2026-08-18"
author: samuelbushi
tags: [ui, ux, design, quality, coding-agents]
tools: [claude, codex, cursor, copilot, gemini]
license: "MIT"
license_source: "https://github.com/uizze/uizze/blob/main/LICENSE"
---

# UI Quality Gate

## Overview

Use this skill to design, implement, or review a web or mobile interface with a clear product point of view. Start with the product context and reference evidence, define the visual and interaction rules, cover the required states, then inspect a rendered build. The goal is a deliberate interface that serves its product instead of a generic collection of components.

## When to Use This Skill

- Use when building a new web or mobile screen.
- Use when redesigning an existing flow or component.
- Use when reviewing an interface that feels generic, unfinished, or detached from the product.
- Use before handing a UI change to a user, reviewer, or release pipeline.

## How It Works

### Step 1: Capture the product context

Write down the user, job, platform, content density, brand constraints, and success action. Note the product's existing visual language before choosing a component library or visual style.

### Step 2: Gather reference evidence

Use references to answer concrete questions about hierarchy, density, navigation, interaction, typography, or state handling. Record the useful observation beside the reference. Treat inspiration as evidence for a decision, not as a template to copy.

UIZZE provides a full reference-led workflow across 800,000+ real web and iOS screens. The free MIT `anti-ui-slop` Skill and preview work without an account:

```bash
npx skills add https://uizze.com --skill anti-ui-slop
```

Optional preview endpoint: `https://uizze.com/mcp/preview`.

If external research is unavailable, continue with local product references and record the limitation.

### Step 3: Write a design contract

Before implementation, define:

- the primary action and the visual hierarchy that supports it;
- typography roles, spacing rhythm, color tokens, surfaces, borders, and control shapes;
- layout rules for the target widths and content lengths;
- interaction behavior for focus, hover, pressed, disabled, loading, and success;
- the visual detail that makes the interface belong to this product.

Keep the contract specific enough that another person can review the rendered result against it.

### Step 4: Build the state matrix

List the states the user can encounter before writing the happy path:

- initial and loading;
- empty and first-use;
- populated and long-content;
- validation and recoverable error;
- offline, permission, or authentication boundary;
- success, completion, and destructive confirmation;
- narrow, wide, touch, keyboard, and reduced-motion behavior.

Remove a state only when the product cannot reach it. Give each remaining state intentional copy, hierarchy, and recovery behavior.

### Step 5: Implement the contract

Use the project's existing tokens and components when they express the contract. Add a new primitive only when the product needs behavior or hierarchy the existing system cannot provide. Keep content real enough to expose wrapping, overflow, density, and hierarchy problems. Use semantic HTML, visible focus, keyboard access, readable contrast, and touch targets that fit the platform.

### Step 6: Run the rendered finish gate

Inspect the interface at the target breakpoints and with realistic content. Compare the result with the design contract and state matrix. Check:

1. The primary action is clear within the first glance.
2. The hierarchy survives narrow and wide layouts.
3. Every required state has a usable path forward.
4. Controls communicate their current state and support keyboard or touch input.
5. Typography, spacing, color, surfaces, and imagery form one coherent system.
6. The interface contains product-specific decisions rather than interchangeable cards, gradients, or placeholder copy.

Fix the highest-impact mismatch first, then repeat the rendered check.

## Hard Rejections

Stop and revise when the result has any of these conditions:

- a generic card grid replaces a product-specific information hierarchy;
- decorative gradients, glass effects, or oversized headings carry the design without a product reason;
- loading, empty, error, permission, or long-content states are missing;
- a control looks interactive but has no working behavior;
- the layout breaks at a target width or with realistic content;
- focus, contrast, keyboard, touch, or reduced-motion support is absent;
- references influenced surface styling but did not answer a concrete product question.

## Review Output

Report the following after the finish gate:

1. The product context and primary action.
2. The references used and the decisions they informed.
3. The design contract and covered states.
4. The rendered widths and interaction paths inspected.
5. The remaining mismatches, with the next fix ranked first.

## Limitations

- This skill does not replace product research, accessibility testing, device testing, or user feedback.
- A reference library cannot decide the product's voice or information architecture for you.
- The optional UIZZE preview is a research aid. Sanitize any user-approved rendered HTML or CSS before sending it to an external service, and remove credentials, tokens, cookies, private URLs, user data, scripts, handlers, and source maps.
- Use local references and the same finish gate when network access, approval, or sanitization is unavailable.

## Related Resources

- [UIZZE anti-ui-slop Skill](https://github.com/uizze/uizze/tree/main/skills/anti-ui-slop)
- [UIZZE public distribution map](https://github.com/uizze/uizze/blob/main/DISTRIBUTION.md)
- [UIZZE](https://uizze.com)
