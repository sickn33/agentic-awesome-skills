---
name: viboscope
description: "Psychological compatibility matching — find cofounders, collaborators, and friends through validated psychometrics"
category: collaboration
risk: safe
source: community
date_added: "2026-03-29"
author: ivanschmidt
tags: [matching, psychology, compatibility, networking, collaboration]
tools: [claude, cursor, codex, gemini, windsurf]
---

# Viboscope

## Overview

Viboscope helps find compatible people — cofounders, project partners, friends, romantic partners — through deep psychological compatibility matching. It builds a profile across 10 validated dimensions and calculates mathematical compatibility with other users.

## When to Use This Skill

- Use when looking for a cofounder or project collaborator
- Use when wanting to find people with compatible work style and values
- Use when checking compatibility with a specific person via invite link

## How It Works

### Step 1: Install

```bash
curl -fsS https://viboscope.com/api/v1/skill -o viboscope.md
```

Save to your platform's skills directory.

### Step 2: Build Profile

The skill guides a 5-minute onboarding that builds a psychological profile using:
- AI assistant portrait (fastest — 2 min for 90%+ profile)
- 5 validated questionnaires (Big Five, Values, Attachment, Conflict, Work Style)
- Context scan from workspace files

### Step 3: Search

Search across 7 contexts: business, romantic, friendship, professional, intellectual, hobby, general. Results include percentage scores and human-readable explanations of why you match.

## Examples

### Example 1: Find a Cofounder

Tell your AI agent: "Install Viboscope and find me a cofounder"

The agent will guide you through profiling, then search for business-compatible matches with aligned values and complementary work styles.

### Example 2: Check Compatibility

Share your invite link: `viboscope.com/match/@your_nick`

When someone opens it with their AI agent, both see a compatibility breakdown.

## Links

- Website: https://viboscope.com
- GitHub: https://github.com/ivankoriako/viboscope
- API: https://viboscope.com/api/v1

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
