---
name: usage-based-pricing
description: "Design pricing models that developers understand, accept, and can predict. Trigger phrases: usage-based pricing, API pricing, metered billing, developer pricing, pricing page, cost calculator, pay as you go, pricing transparency, competitive pricing, developer billing"
risk: critical
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/usage-based-pricing
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Usage-Based Pricing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use

Use this skill when you need design pricing models that developers understand, accept, and can predict. Trigger phrases: usage-based pricing, API pricing, metered billing, developer pricing, pricing page, cost calculator, pay as you go, pricing transparency, competitive pricing, developer billing.


Design pricing models that developers understand, accept, and can predict—without surprise bills or confusing metrics.

## Usage Metrics Developers Accept

### Good Metrics: Direct Value Correlation

**API calls/requests**
- Developers understand what triggers a call
- Easy to monitor and predict
- Scales with actual usage
- Example: Stripe charges per transaction, Twilio per message

**Compute time**
- Clear relationship to server costs
- Predictable for consistent workloads
- Fair for variable workloads
- Example: AWS Lambda per GB-second, Vercel build minutes

**Storage**
- Simple to understand
- Easy to predict growth
- Clear cost driver
- Example: S3 per GB stored, databases per GB

**Bandwidth/data transfer**
- Makes sense for CDN and hosting
- Can be surprising if not monitored
- Example: Cloudflare per GB, Vercel bandwidth

**Active users (MAU)**
- Works for auth and user-facing tools
- Aligns with customer's growth
- Example: Auth0, Firebase Auth

### Problematic Metrics

**"Compute units" or proprietary measures**
```
Bad: "1 CU = 0.25 CPU seconds at 1.5GHz equivalent with 256MB memory allocation"
Developers can't estimate usage.
```

**Compound metrics**
```
Bad: "Charged per operation, where operation = read OR write OR delete,
     multiplied by document size factor"
Too complex to predict.
```

**Metrics that punish success**
```
Bad: Per-user pricing that penalizes viral growth
Developer's successful launch becomes a cost crisis.
```

**Metrics with hidden multipliers**
```
Bad: "Per request, but each retry counts, and warming requests count,
     and health checks count"
Actual usage is unpredictable.
```

### Metric Selection Framework

| Metric | When It Works | When It Fails |
|--------|---------------|---------------|
| API calls | Discrete operations | Streaming, persistent connections |
| Compute time | Variable workloads | Idle resources still cost |
| Storage | Data products | Temporary/cache data |
| Bandwidth | CDN, media | Retry-heavy protocols |
| MAU | User-facing apps | Machine-to-machine |
| Seats | Collaboration tools | Individual developers |

## Examples: Pricing That Works

### Stripe

- Per-transaction percentage (2.9% + 30¢)
- Aligns with customer revenue
- Predictable and simple
- Volume discounts for scale

### Twilio

- Per-message/per-minute pricing
- Clear unit costs
- Usage dashboard and alerts
- Prepaid credits for discount

### Vercel

- Clear tier structure
- Generous free tier
- Usage-based for bandwidth/builds
- Team pricing separate

### DigitalOcean

- Predictable monthly pricing
- Clear size/price relationship
- Hourly billing option
- Bandwidth included in pricing

## Examples: Pricing Problems

### Confusing Unit Pricing

Some cloud providers:
- Per "compute unit" (undefined)
- Multiple meters per service
- Different rates for different operations
- Bill requires expert interpretation

### Enterprise Tax

Some companies:
- SSO requires enterprise tier
- SSO tier is 10x team tier
- No intermediate option
- Punishes security-conscious teams

### Punishing Success

Some user-based pricing:
- Free tier: 100 users
- Paid tier: $0.10/user
- Viral success = immediate $$$
- Discourages growth

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
