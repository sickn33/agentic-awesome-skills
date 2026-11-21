---
name: growth-loops
description: 'Designing how a product grows: loops that compound (viral, usage, collaboration, user-generated, referral).'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: product
---

# Growth loops

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Designing how a product grows: loops that compound (viral, usage, collaboration, user-generated, referral).


## Overview

**Design one growth loop that compounds user acquisition through the product.** Compare the five mechanisms for fit and choose the most promising one.

## When to use

Use this analysis for:

- Designing growth mechanisms for a product
- Building sustainable viral or referral traction
- Reducing reliance on paid acquisition
- Analyzing competitor growth strategies
- Optimizing a product for product-led growth

## The 5 growth loop types

### 1. Viral loop

**Shared user-created product content brings new users back to the product.** Users share it on external platforms.

| Aspect | Details |
|---|---|
| Mechanism | Users create content in-product → Share on social/external platforms → New users discover and signup |
| Example | Figma designs shared as links, Loom videos shared in emails |
| Strength | Exponential user acquisition if content is inherently shareable |
| Challenge | Requires highly shareable output and strong incentive to share |

### 2. Usage loop

**Sharing content or value created in-product invites new users or drives re-engagement.**

| Aspect | Details |
|---|---|
| Mechanism | User creates → Shares creation → Others consume → Become engaged users |
| Example | Twitter threads, Medium articles, Notion templates shared publicly |
| Strength | Growth tied directly to product usage and network effects |
| Challenge | Requires content creation friction to be very low |

### 3. Collaboration loop

**Inviting colleagues to co-create expands the user base within organizations.** Users invite them to collaborate within the product.

| Aspect | Details |
|---|---|
| Mechanism | User creates → Invites colleagues for collaboration → Colleagues discover product value |
| Example | Google Docs invitations, Figma team projects, Slack channels |
| Strength | Deep organizational penetration and high retention |
| Challenge | Works best for collaborative/team-based products |

### 4. User-generated loop

**Users discover others' creations, then create and share their own content.** They discover new content or features through those creations.

| Aspect | Details |
|---|---|
| Mechanism | User discovers content → Creates similar content → Shares creation → Others discover |
| Example | TikTok, Pinterest, YouTube trends driving creator participation |
| Strength | Creates content flywheel and network effects |
| Challenge | Requires critical mass of quality content to sustain |

### 5. Referral loop

**Users invite potential users for rewards, incentives or social recognition.**

| Aspect | Details |
|---|---|
| Mechanism | User refers → Referred user joins → Referrer gets reward → Shares more referrals |
| Example | Dropbox referral bonus, Uber rider referrals, PayPal signup bonuses |
| Strength | Directly incentivizes acquisition; easy to measure ROI |
| Challenge | Requires valuable incentive without eroding unit economics |

## How it works

### Step 1: Define product value

**Clarify the core value users experience.** Identify:

- The primary action users take in your product
- Value created per user action
- Network effects present (if any)
- Friction points in the experience

### Step 2: Evaluate loop fit

**Assess which growth loops align with your product.** Consider:

- Product type (collaborative, content-based, utility, etc.)
- Target user behavior and sharing habits
- Network effects already present
- Existing user base and engagement

### Step 3: Design loop mechanics

**Design the specific mechanics of the loop.** Include:

- The trigger that initiates sharing or invitations
- Incentive for participation (intrinsic or extrinsic)
- Ease of the sharing mechanism
- Conversion rate from invite to activation
- Frequency of loop repetition per user

### Step 4: Calculate loop coefficient

**Measure the loop before projecting how fast it can grow.** Use observed inputs where available and label estimates as assumptions. Measure or estimate:

- Invites/shares per user per cycle
- Conversion rate of invites to new users
- Net new users per cycle
- Time per cycle iteration

### Step 5: Build the loop

**Design the first test for the highest-leverage loop.** Start with the most natural loop for your product. State which step could break, what to measure, and how the result changes the next iteration.

## Input format

**Pass the product and growth context through $ARGUMENTS.** Include:

- Product description and primary user action
- Target user demographics and behavior
- Existing sharing/collaboration features
- Current growth channels and metrics
- Constraints or opportunities

## Output

**Deliver one loop, its conversion chain and its first measurable test.** Give the reason for choosing this loop, who acts and why, what each step produces, and how it brings the next user. Include the incentive's unit economics when the loop offers a reward.

**Add a roadmap or projections when the inputs support them.** Use activation and cycle-time evidence for growth projections. For a 30-60-90 day roadmap, use rollout constraints and the resources available. Mark any estimates as assumptions.

## Framework

Based on growth loops research by Ognjen Bošković. The focus is compounding user acquisition through built-in, product-native sharing and collaboration mechanisms.

## Tips

- **Start with one loop and master it before adding complexity.**
- **Viral loops compound fastest but take time to build.**
- **Collaboration loops create the strongest retention and LTV.**
- **Measure loop health weekly during the optimization phase.**
- **Combine loops for multiplicative effect once operating at scale.**

## How you can tell it worked

The chosen loop names who acts, what their action produces and how that brings the next user. The first test measures the step most likely to break.

## Example

For a shared report, a reader opens a viewer link, creates their own report and shares it. Measure the completion rate at each step and validate the initial premise with consented events.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/growth-loops).
