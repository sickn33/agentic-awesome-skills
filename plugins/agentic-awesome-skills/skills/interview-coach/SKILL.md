---
name: interview-coach
description: "Full job search coaching system — JD decoding, resume, storybank, mock interviews, transcript analysis, comp negotiation. Coaching guide with an optional separately installed command package and scoped state."
category: productivity
risk: safe
source: community
date_added: "2026-03-11"
author: dbhat93
tags: [interview, job-search, coaching, career, storybank, negotiation]
tools: [claude]
---

# Interview Coach

## Overview

A persistent, adaptive coaching system for the full job search lifecycle.
Not a question bank — an opinionated system that tracks your patterns,
scores your answers, and gets sharper the more you use it. Persist state to `coaching_state.md` only when requested, in an authorized private location; retain verified facts and user-approved examples. The host may not recover it automatically.

## Package availability

This AAS entry contains the guide, not the 23-command implementation. `/coach` is an external package/host convention; discover actual availability before claiming it ran. Basic coaching can proceed directly with supplied role, CV and examples. Verify current company process/salary sources and dates; never invent achievements, hiring steps or ATS scores. Avoid unnecessary transcript identifiers and ask before third-party uploads.

## Direct coaching workflow

Without the optional command package, start with the supplied job description, CV and target interview. Extract five role requirements and map each to a verified example or a stated gap. Ask one behavioral question at a time; after the answer, assess relevance, concrete evidence, personal contribution, structure and reflection using a stated rubric. Draft a STAR revision using only supplied facts, then repeat the weakest portion as a drill. Return a short preparation plan and unresolved research questions. Coaching scores reflect that rubric, not an employer’s actual assessment or an ATS prediction.

## Install

```bash
# Review an immutable upstream revision/license, then install only into the explicitly authorized workspace/host path.
```

Then type `/coach` → `kickoff`.

## When to Use This Skill

- Use when starting a job search and need a structured system
- Use when preparing for a specific interview (company research, mock, hype)
- Use when you want to analyze a past interview transcript
- Use when negotiating an offer or handling comp questions on recruiter screens
- Use when building or maintaining a storybank of interview-ready stories

## What It Covers

- **JD decoding** — six lenses, fit verdict, recruiter questions to ask
- **Resume + LinkedIn** — ATS audit, bullet rewrites, platform-native optimization
- **Mock interviews** — behavioral, system design, case, panel, technical formats
- **Transcript analysis** — paste from Otter/Zoom/Grain, auto-detected format
- **Storybank** — STAR stories with earned secrets, retrieval drills, portfolio optimization
- **Comp + negotiation** — pre-offer scripting, offer analysis, exact negotiation scripts
- **Upstream advertises 23 commands** across the full search lifecycle; not bundled here

## Examples

### Example 1: Start your job search

```
/coach
kickoff
```

The coach asks for your resume, target role, and timeline — then builds
your profile and gives you a prioritized action plan.

### Example 2: Prep for a specific company

```
/coach
prep Stripe Senior PM
```

Runs company research, generates a role-specific prep brief, and queues
up mock interview questions tailored to Stripe's process.

### Example 3: Analyze an interview transcript

```
/coach
analyze
```

Paste a raw transcript from Otter, Zoom, or any tool. The coach
auto-detects the format, scores each answer across five dimensions,
and gives you a drill plan targeting your specific gaps.

### Example 4: Handle a comp question

```
/coach
salary
```

Coaches you through the recruiter screen "what are your salary
expectations?" moment with a defensible range and exact scripts.

## Source

https://github.com/dbhat93/job-search-os

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
