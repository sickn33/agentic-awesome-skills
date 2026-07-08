---
name: idea-os
description: "Five-phase pipeline (triage → clarify → research → PRD → plan) that turns a raw idea into four linked files: clarifying questions, deep research, a PRD with non-goals and metrics, and a phased execution plan with mermaid user journey and kill criteria."
category: product-management
risk: safe
source: community
source_repo: Slashworks-biz/idea-os
source_type: community
date_added: "2026-04-18"
author: Slashworks-biz
tags: [product-management, prd, market-research, mvp, idea-validation, jtbd, swot, competitor-analysis, founder, non-technical]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Slashworks-biz/idea-os/blob/main/LICENSE"
---

# idea-os

An operating system for turning a raw idea into a build-ready plan. Takes a rough problem statement and produces four files: clarifying questions, deep research, a PRD, and a phased execution plan with platform/stack picks, a user-journey diagram, and kill criteria.

## Overview

idea-os is a 5-phase sequential pipeline where each phase's output feeds the next — research shapes the PRD, PRD shapes the plan, plan's kill criteria tie back to research insights. Unlike single-command PRD generators, idea-os refuses to write a PRD until research is done, and refuses to write a plan until the PRD is stable. Depth and vocabulary adapt to a two-axis classification (complexity × builder sophistication) so a first-time builder isn't drowning in jargon and a founder gets full rigor.

Source: https://github.com/Slashworks-biz/idea-os — full skill, 11 reference files, 4 asset templates, and a 590-line worked example.

## When to Use

- Use when a user shares a raw product idea or problem statement and wants a structured pipeline from clarifying questions through deep research, PRD, and a phased execution plan.
- Use when the user says "I have an idea for…", "help me build X", "validate and plan this concept", or "what should I build?" — and wants files they can take forward, not a one-shot answer.
- Use when a non-technical founder, PM, or hobbyist needs structure to bridge the gap between "idea" and "Monday morning's build queue".
- Do **not** use for quick sanity-check feedback on a half-formed idea (use `idea-refine` instead) or for editing an existing PRD (use `product-management` instead).

## How It Works

### Phase 1 — Triage

Classify the idea on two axes before anything else. Depth of research/PRD/plan and question count scale with complexity; vocabulary scales with sophistication.

- **Idea tier (T1/T2/T3)** — T1 = weekend utility, T2 = SaaS MVP or AI wrapper, T3 = marketplace / B2B SaaS / regulated.
- **Sophistication (S1/S2/S3)** — S1 = non-technical, no framework names; S2 = hobbyist, introduce frameworks with definitions; S3 = founder/senior PM, full vocabulary.

State the classification in one line (e.g. "T2 · S2 — moderate SaaS, builder has shipped before") before proceeding.

### Phase 2 — Clarify

Write `questions.md` with 4–18 questions (count scales with complexity), grouped: Who and Pain · Scope and Wedge · Constraints and Goals. Every question must be actionable — the answer has to change what you build. Generic questions are rejected.

After writing, stop and wait for answers. Do not proceed to research until answered or autonomous-mode assumptions are declared.

### Phase 3 — Research

Write `research.md` using WebSearch + WebFetch. Minimum: 5 WebSearches, 2 WebFetches on named competitors, 1 source per TAM number, date on every source. Anything unsourced gets flagged `[assumption]`.

Required sections: problem validation, JTBD, market (TAM/SAM/SOM top-down + bottom-up), competitors (direct/indirect/substitutes + positioning map), SWOT, distribution (first-100-users channel fit), risks, and 3–7 non-obvious insights.

### Phase 4 — PRD

Write `PRD.md` with: falsifiable problem statement, named personas, ranked JTBD, non-goals (mandatory — it's where bad PRDs die), leading and lagging metrics.

### Phase 5 — Plan

Write `plan.md` with: user journey (text + mermaid), platform recommendation tied to research findings, stack in conservative/modern/cutting-edge matrix, phased build (MVP → v1 → target) with kill criteria per phase and first-100-users distribution per phase, metrics per phase, and 3–5 immediate next actions.

## Limitations

- Requires user input between phases for best results; if answers are missing, outputs depend on explicit assumptions.
- Produces planning artifacts (`questions.md`, `research.md`, `PRD.md`, `plan.md`) but does not execute build or deployment work.
- Source quality determines output quality; weak or outdated references can reduce recommendation accuracy.
- Better suited to new-idea validation and early planning than late-stage optimization of an existing shipped product.

## Examples

### Example 1: Non-technical founder with a consumer-app idea

User: "I want to build a habit tracker for people with ADHD."

idea-os classifies T2 · S1, writes 8 plain-language clarifying questions, runs research with sourced competitor pricing and community signal from ADHD subreddits, produces a PRD with ADHD-specific non-goals (no streaks, no punishment mechanics), and a plan with a single-screen MVP and a kill criterion tied to 14-day retention.

### Example 2: Founder with a B2B SaaS idea

User: "I'm thinking about procurement software for mid-market manufacturers."

idea-os classifies T3 · S3, writes 18 questions including procurement-cycle specifics, runs research with Wardley-map option and Porter 5 forces, produces a PRD with tiered personas (buyer/approver/IT), and a plan with a phase-1 kill criterion tied to paid-pilot close rate.

## Full source

Full 11-reference skill, 4 asset templates, worked example, and MIT license at https://github.com/Slashworks-biz/idea-os. This antigravity entry is a reference copy — the upstream repo is where ongoing development lives.
