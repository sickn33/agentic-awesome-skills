---
name: progressive-estimation
description: "Estimate AI-assisted and hybrid human+agent development work with explicit PERT assumptions and calibration feedback loops"
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

Estimate AI-assisted and hybrid human+agent development work using three-point estimates, stated uncertainty assumptions and calibration feedback loops.

## Overview

Progressive Estimation adapts to your team's working mode — human-only, hybrid, or agent-first — choosing explicit assumptions for each. Estimates remain uncertain and require local calibration.

## When to Use This Skill

- Estimating development tasks where AI agents handle part of the work
- Sprint planning with hybrid human+agent teams
- Batch sizing a backlog (handles 5 or 500 issues)
- Staffing and capacity planning with agent multipliers
- Release date forecasting with confidence intervals

## How It Works

1. **Mode Detection** — Determines if the team works human-only, hybrid, or agent-first
2. **Task Classification** — Categorizes by size (XS–XL), complexity, and risk
3. **Formula Application** — Applies locally measured multipliers when available, or clearly labeled scenarios
4. **PERT Calculation** — Produces expected values using three-point estimation
5. **Confidence Bands** — Generates percentiles only with a specified, calibrated forecast model
6. **Output Formatting** — Formats for Linear, JIRA, ClickUp, GitHub Issues, Monday, or GitLab
7. **Calibration** — Feeds back actuals to improve future estimates

## Examples

**Single task:**
> "Estimate building a REST API with authentication using Claude Code"

**Batch mode:**
> "Estimate these 12 JIRA tickets for our next sprint"

**With context:**
> "We have 3 developers using AI agents for ~60% of implementation. Estimate this feature."

## Estimation procedure

Record scope, dependencies, acceptance criteria and whether durations mean effort or elapsed time. Elicit optimistic O, most likely M and pessimistic P in the same units, with O ≤ M ≤ P. A conventional PERT approximation is E = (O + 4M + P)/6 and SD ≈ (P − O)/6; these are modeling assumptions, not observed certainty. For O=2, M=4, P=12 hours, E=5 hours and SD≈1.67 hours. Record the assumptions behind each bound.

Do not derive P50/P75/P90 directly from the mean or label a range a confidence interval without a stated distribution and method. For a project forecast include dependencies, correlated risks, review/queue time and limited human capacity. Use actual comparable completed tasks to calibrate AI multipliers; absent data, present explicit scenarios rather than claiming a research-backed speedup. Report actuals against the original scope and revise future forecasts. This guide does not bundle an estimation engine or calibration database.

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
