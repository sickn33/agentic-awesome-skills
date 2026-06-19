---
name: ui-setup
description: "Interactive StyleSeed setup wizard for choosing app type, brand color, visual style, typography, and the first screen scaffold."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ui, design-system, setup, frontend, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UI Setup

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this setup wizard turns a raw project into a design-system-guided workspace. It collects the minimum brand and product context needed to configure tokens, pick a visual direction, and generate an initial page without drifting into generic UI.

## When to Use
- Use when you are starting a new app with the StyleSeed Toss seed
- Use when you copied the seed into an existing project and need to personalize it
- Use when you want the AI to ask one design decision at a time instead of guessing
- Use when you need a first page scaffold after selecting colors, font, and app type

## How It Works

### Step 1: Ask One Question at a Time

Do not front-load the full questionnaire. Ask a single question, wait for the answer, store it, then continue.

### Step 2: Capture the App Type

Identify the product shape before touching tokens or layout recipes.

Suggested buckets:
- SaaS dashboard
- E-commerce
- Fintech
- Social or content
- Productivity or internal tool
- Other with a short freeform description

Use the answer to choose the page composition pattern and the type of first screen to scaffold.

### Step 3: Choose the Brand Color

Offer a few safe defaults plus a custom hex option. Once selected:
- update the light theme brand token
- update the dark theme brand token with a lighter accessible variant
- keep all other colors semantic rather than hardcoding the brand everywhere

If the project uses the StyleSeed Toss seed, the main target is `css/theme.css`.

### Step 4: Offer an Optional Visual Reference

Ask whether the user wants to borrow the feel of an established brand or design language. Good examples include Stripe, Linear, Vercel, Notion, Spotify, Supabase, and Airbnb.

Use the reference to influence density, tone, and composition, not to clone assets or trademarks.

### Step 5: Pick Typography

Confirm the font direction:
- keep the default stack
- swap to a preferred font if already installed or available
- preserve hierarchy rules for display, heading, body, and caption text

If the seed is present, update the font-related files rather than scattering overrides across components.

### Step 6: Generate the First Screen

Ask for:
- app name
- first page or screen name
- a one-sentence purpose for that page

Then scaffold the page using the seed's page shell, top bar, navigation, spacing scale, and card structure.

## Output

Return:
1. The captured setup decisions
2. The files or tokens updated
3. The first page or scaffold created
4. Any follow-up recommendations for components, patterns, accessibility, or copy

## Best Practices

- Keep the interaction conversational, but deterministic
- Make brand color changes through tokens, not component-by-component edits
- Use an inspiration brand as a reference, not as a permission slip to copy
- Prefer semantic tokens and reusable patterns over page-specific CSS

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [StyleSeed Toss seed](https://github.com/bitjaru/styleseed/tree/main/seeds/toss)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ui-setup/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
