---
name: before-you-build
description: "Review product risk before coding by checking demand, alternatives, channels, switching costs, and failure signals."
category: product
risk: safe
source: community
source_repo: bin1874/before-you-build-skill
source_type: community
date_added: "2026-07-02"
author: bin1874
tags: [product-validation, planning, ai-coding, risk-review]
tools: [claude, cursor, codex, gemini, antigravity]
license: "MIT"
license_source: "https://github.com/bin1874/before-you-build-skill/blob/main/LICENSE"
---

# Before You Build

## Overview

Before You Build helps an AI coding workflow pause before implementation and check whether the feature, product, or tool is worth building. It focuses on product risk rather than code structure: who needs the thing, what they use today, why they would switch, how distribution works, and what evidence would make the project safer to start.

The upstream project ships a standalone skill repository and an `npx` installer for several coding assistants.

## When to Use This Skill

- Use when a user asks an AI coding assistant to build a new app, feature, internal tool, SaaS, or side project.
- Use when the idea sounds plausible but the buyer, workflow, distribution path, or switching reason is still vague.
- Use before writing code so the assistant can turn the request into sharper assumptions, risk checks, and validation steps.

## How It Works

### Step 1: Identify the Build Bet

Restate the product or feature in one concrete sentence. Name the intended user, the job they are trying to finish, and the current workaround or competitor.

### Step 2: Check the Main Risks

Review the idea across demand, workflow fit, willingness to switch, distribution, pricing, data access, and operational burden. Prefer specific doubts over generic brainstorming.

### Step 3: Decide the Next Small Test

Suggest the smallest useful validation step before implementation. This could be a buyer conversation, landing page test, manual concierge workflow, prototype, waitlist, paid pilot, or narrow internal trial.

### Step 4: Continue or Stop

If the risk is acceptable, move into implementation with the assumptions written down. If the risk is high or evidence is weak, recommend a smaller experiment instead of building the full version.

## Examples

### Example 1: SaaS Feature Request

```text
User: Build a dashboard for AI trend monitoring.

Before coding, check:
- Which role needs this dashboard every week?
- What source do they use today?
- What decision changes because of the dashboard?
- Would they pay for alerts, reports, or workflow integration?
- What is the smallest manual report that proves repeat use?
```

### Example 2: Internal Tool

```text
User: Build an internal CRM for our small team.

Before coding, check:
- What breaks in the current spreadsheet or existing CRM?
- How many people will use it daily?
- What data must be imported or kept in sync?
- What process change is required after launch?
- Can a no-code workflow prove the need first?
```

## Best Practices

- ✅ Ask for the user, job, current alternative, and switching reason before implementation.
- ✅ Separate product risk from engineering risk so the team does not solve the wrong problem well.
- ✅ Recommend small validation steps when the idea has weak demand evidence.
- ✅ Keep product names, numbers, and claims grounded in what the user provides.
- ❌ Do not present a generic checklist as proof that an idea is validated.
- ❌ Do not fabricate market size, revenue, competitor traction, or buyer quotes.

## Limitations

- This skill does not replace customer research, legal review, financial advice, or domain expert review.
- It cannot prove demand by itself; it helps the assistant surface assumptions and choose a smaller validation step.
- If the user already has strong evidence and a clear spec, keep the review short and move into implementation.

## Security & Safety Notes

- This skill is safe to run as a planning layer because it does not require credentials, external network access, or file mutation.
- If paired with an installer or repository fetch, only install from the upstream repository or npm package you trust.

## Common Pitfalls

- **Problem:** The assistant repeats the product pitch instead of challenging the assumptions.
  **Solution:** Ask for current alternatives, switching triggers, and a validation step before code.

- **Problem:** The review becomes too broad and blocks progress.
  **Solution:** Pick the riskiest assumption and test only that first.

- **Problem:** The idea is treated as a startup even when it is a small internal workflow.
  **Solution:** Scale the risk review to the project size and only ask questions that change the build decision.

## Related Skills

- `@saas-mvp-launcher` - Use when moving from validation into MVP planning and launch execution.
- `@ux-research-methodology` - Use when the next step needs structured user research.
