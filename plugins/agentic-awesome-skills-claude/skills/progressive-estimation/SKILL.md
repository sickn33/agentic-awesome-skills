---
name: progressive-estimation
description: "Estimate AI-assisted and hybrid human+agent development work with research-backed PERT statistics and calibration feedback loops"
category: project-management
risk: safe
source: community
date_added: "2026-03-10"
author: Enreign
tags:
  - estimation
  - project-management
  - pert
  - sprint-planning
  - ai-agents
tools:
  - claude
---

# Progressive Estimation

Estimate AI-assisted and hybrid human+agent development work using research-backed formulas with PERT statistics, confidence bands, and calibration feedback loops.

## Overview

Progressive Estimation adapts to your team's working mode — human-only, hybrid, or agent-first — applying the right velocity model and multipliers for each. It produces statistical estimates rather than gut feelings.

## When to Use This Skill

- Estimating development tasks where AI agents handle part of the work
- Sprint planning with hybrid human+agent teams
- Batch sizing a backlog (handles 5 or 500 issues)
- Staffing and capacity planning with agent multipliers
- Release date forecasting with confidence intervals

## How It Works

1. **Mode Detection** — Determines if the team works human-only, hybrid, or agent-first
2. **Task Classification** — Categorizes by size (XS–XL), complexity, and risk
3. **Formula Application** — Applies research-backed multipliers grounded in empirical studies
4. **PERT Calculation** — Produces expected values using three-point estimation
5. **Confidence Bands** — Generates P50, P75, P90 intervals
6. **Output Formatting** — Formats for Linear, JIRA, ClickUp, GitHub Issues, Monday, or GitLab
7. **Calibration** — Feeds back actuals to improve future estimates

## Examples

**Single task:**
> "Estimate building a REST API with authentication using Claude Code"

**Batch mode:**
> "Estimate these 12 JIRA tickets for our next sprint"

**With context:**
> "We have 3 developers using AI agents for ~60% of implementation. Estimate this feature."

## Best Practices

- Start with a single task to calibrate before moving to batch mode
- Feed back actual completion times to improve the calibration system
- Use "instant mode" for quick T-shirt sizing without full PERT analysis
- Be explicit about team composition and agent usage percentage

## Common Pitfalls

- **Problem:** Overconfident estimates
  **Solution:** Use P75 or P90 for commitments, not P50

- **Problem:** Missing context
  **Solution:** The skill asks clarifying questions — provide team size and agent usage

- **Problem:** Stale calibration
  **Solution:** Re-calibrate when team composition or tooling changes significantly

## Related Skills

- `@sprint-planning` - Sprint planning and backlog management
- `@project-management` - General project management workflows
- `@capacity-planning` - Team velocity and capacity planning

## Additional Resources

- [Source Repository](https://github.com/Enreign/progressive-estimation)
- [Installation Guide](https://github.com/Enreign/progressive-estimation/blob/main/INSTALLATION.md)
- [Research References](https://github.com/Enreign/progressive-estimation/tree/main/references)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
