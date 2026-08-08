# Competitive Landscape Analysis Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Competitive Landscape Analysis

Comprehensive frameworks for analyzing competition, identifying differentiation opportunities, and developing winning market positioning strategies.

## Use this skill when

- Working on competitive landscape analysis tasks or workflows
- Needing guidance, best practices, or checklists for competitive landscape analysis

## Do not use this skill when

- The task is unrelated to competitive landscape analysis
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Overview

Understand competitive dynamics using proven frameworks (Porter's Five Forces, Blue Ocean Strategy, positioning maps) to identify opportunities and craft defensible competitive advantages.

## Porter's Five Forces

Analyze industry attractiveness and competitive intensity.

### Force 1: Threat of New Entrants

**Barriers to Entry:**
- Capital requirements
- Economies of scale
- Switching costs
- Brand loyalty
- Regulatory barriers
- Access to distribution
- Network effects

**High Threat:** Low barriers, easy to enter (e.g., simple SaaS tools)
**Low Threat:** High barriers (e.g., regulated industries, hardware)

**Analysis Questions:**
- How easy is it for new competitors to enter?
- What would it cost to launch a competing product?
- Are there network effects or switching costs protecting incumbents?

### Force 2: Bargaining Power of Suppliers

**Supplier Power Factors:**
- Supplier concentration
- Availability of substitutes
- Importance to supplier
- Switching costs
- Forward integration threat

**High Power:** Few suppliers, critical inputs (e.g., cloud infrastructure providers)
**Low Power:** Many alternatives, commoditized (e.g., generic services)

**Analysis Questions:**
- Who are our critical suppliers?
- Could they raise prices or reduce quality?
- Can we switch suppliers easily?

### Force 3: Bargaining Power of Buyers

**Buyer Power Factors:**
- Buyer concentration
- Volume purchased
- Product differentiation
- Price sensitivity
- Backward integration threat

**High Power:** Few large customers, standardized products (e.g., enterprise deals)
**Low Power:** Many small customers, differentiated product (e.g., consumer subscriptions)

**Analysis Questions:**
- Can customers easily switch to competitors?
- Do few customers generate most revenue?
- How price-sensitive are buyers?

### Force 4: Threat of Substitutes

**Substitute Considerations:**
- Alternative solutions
- Price-performance tradeoff
- Switching costs
- Buyer propensity to substitute

**High Threat:** Many alternatives, low switching cost (e.g., productivity software)
**Low Threat:** Unique solution, high switching cost (e.g., ERP systems)

**Analysis Questions:**
- What alternative ways can customers solve this problem?
- How do substitutes compare on price and performance?
- What's the cost to switch to a substitute?

### Force 5: Competitive Rivalry

**Rivalry Intensity Factors:**
- Number of competitors
- Industry growth rate
- Product differentiation
- Exit barriers
- Strategic stakes

**High Rivalry:** Many competitors, slow growth, commoditized (e.g., email marketing)
**Low Rivalry:** Few competitors, fast growth, differentiated (e.g., emerging AI tools)

**Analysis Questions:**
- How many direct competitors exist?
- Is the market growing or stagnant?
- How differentiated are offerings?
- Are competitors competing on price or value?

### Forces Analysis Summary

Create a scorecard:

| Force | Intensity (1-5) | Impact | Key Factors |
|-------|-----------------|--------|-------------|
| New Entrants | 3 | Medium | Low barriers but network effects |
| Supplier Power | 2 | Low | Many cloud providers |
| Buyer Power | 4 | High | Enterprise customers concentrated |
| Substitutes | 3 | Medium | Manual processes alternative |
| Rivalry | 4 | High | 10+ direct competitors |

**Overall Assessment:** Moderate industry attractiveness with high rivalry and buyer power

## Blue Ocean Strategy

Identify uncontested market space through value innovation.

### Four Actions Framework

**Eliminate:**
What factors can be eliminated that the industry takes for granted?

**Reduce:**
What factors can be reduced well below industry standard?

**Raise:**
What factors can be raised well above industry standard?

**Create:**
What factors can be created that the industry never offered?

### Strategy Canvas

Map your offering vs. competitors on key factors.

**Example: Budget Hotels**

```
High |                    ★ Traditional Hotels
     |          ★ Budget Hotels (new)
     |
Low  |___________________________________
     Price  Luxury  Convenience  Cleanliness

Budget Hotel Strategy:
- Eliminate: Luxury amenities, room service
- Reduce: Lobby size, staff
- Raise: Cleanliness, online booking
- Create: Self-service kiosks, mobile app
```

### Value Innovation

Find the sweet spot: Lower cost + higher value

**Steps:**
1. Map industry competing factors
2. Identify factors to eliminate/reduce (cost savings)
3. Identify factors to raise/create (differentiation)
4. Validate that combination creates new market space

## Competitive Positioning

### Positioning Map

Plot competitors on 2-3 key dimensions.

**Example Dimensions:**
- Price vs. Features
- Complexity vs. Ease of Use
- Enterprise vs. SMB Focus
- Self-Service vs. High-Touch
- Generalist vs. Specialist

**How to Create:**
1. Choose 2 dimensions most important to customers
2. Plot all competitors
3. Identify gaps (white space)
4. Validate gap represents real customer need

**Example:**
```
High Price
    |
    |  ★ Enterprise A      ★ Enterprise B
    |
    |          ● Our Position (gap)
    |
    |  ★ Competitor C      ★ Competitor D
    |
Low Price |____________________________________________
        Simple                           Complex
```

### Differentiation Strategy

**How to Differentiate:**

1. **Product Differentiation**
   - Unique features
   - Superior performance
   - Better design/UX
   - Integration ecosystem

2. **Service Differentiation**
   - Customer support quality
   - Onboarding experience
   - Response time
   - Success programs

3. **Brand Differentiation**
   - Trust and reputation
   - Thought leadership
   - Community
   - Values alignment

4. **Price Differentiation**
   - Premium positioning
   - Value positioning
   - Transparent pricing
   - Flexible packaging

### Positioning Statement Framework

```
For [target customer]
Who [statement of need or opportunity]
Our product is [product category]
That [statement of key benefit]
Unlike [primary competitive alternative]
Our product [statement of primary differentiation]
```

**Example:**
```
For e-commerce companies
Who struggle with email marketing automation
Our product is an AI-powered email platform
That increases conversion rates by 40%
Unlike Klaviyo and Mailchimp
Our product uses AI to personalize at scale
```

## Competitive Intelligence

### Information Gathering

**Public Sources:**
- Company websites and blogs
- Press releases and news
- Job postings (hint at strategy)
- Customer reviews (G2, Capterra)
- Social media and forums
- Glassdoor (employee insights)
- SEC filings (public companies)
- Patent filings

**Direct Research:**
- Customer interviews
- Win/loss analysis
- Sales team feedback
- Product demos and trials
- Conference attendance

### Competitor Profile Template

For each key competitor, document:

**Company Overview:**
- Founded, HQ, funding, size
- Leadership team
- Company stage and trajectory

**Product:**
- Core features
- Target customers
- Pricing and packaging
- Technology stack
- Recent launches

**Go-to-Market:**
- Sales model (self-serve, sales-led)
- Marketing strategy
- Distribution channels
- Partnerships

**Strengths:**
- What they do better than anyone
- Key competitive advantages
- Market position

**Weaknesses:**
- Gaps in product
- Customer complaints
- Operational challenges

**Strategy:**
- Stated direction
- Inferred priorities
- Likely next moves

## Competitive Pricing Analysis

### Price Positioning

**Premium (Top 25%):**
- Superior product/service
- Strong brand
- High-touch sales
- Enterprise focus

**Mid-Market (Middle 50%):**
- Balanced value
- Standard features
- Mixed sales model
- Broad market

**Value (Bottom 25%):**
- Basic functionality
- Self-service
- Cost leadership
- High volume, low margin

### Pricing Comparison Matrix

| Competitor | Entry Price | Mid Tier | Enterprise | Model |
|-----------|-------------|----------|------------|-------|
| Competitor A | $29/mo | $99/mo | Custom | Subscription |
| Competitor B | $49/mo | $199/mo | $499/mo | Subscription |
| Us | $39/mo | $129/mo | Custom | Subscription |

**Analysis:**
- Are we priced competitively?
- What does our pricing signal?
- Are there gaps in our packaging?

## Go-to-Market Strategy

### Market Entry Strategies

**Direct Competition:**
- Head-to-head against established players
- Requires differentiation and resources
- Example: Better features at lower price

**Niche Focus:**
- Target underserved segment
- Become specialist vs. generalist
- Example: "Salesforce for real estate"

**Disruptive Innovation:**
- Target non-consumers or low end
- Improve over time to move upmarket
- Example: Freemium model disrupting enterprise

**Platform Play:**
- Build ecosystem and network effects
- Aggregate complementary services
- Example: Marketplace or API platform

### Beachhead Market

**Characteristics of Good Beachhead:**
- Specific, reachable segment
- Acute pain you solve well
- Limited competition
- Willing to pay
- Can lead to expansion

**Example:**
Instead of "project management software", target "project management for construction teams"

## Competitive Advantage

### Sustainable Advantages

**Network Effects:**
- Value increases with users
- Example: Slack, marketplaces

**Switching Costs:**
- High cost to change
- Example: CRM systems with data

**Economies of Scale:**
- Unit costs decrease with volume
- Example: Cloud infrastructure

**Brand:**
- Trust and reputation
- Example: Security software

**Proprietary Technology:**
- Patents or trade secrets
- Example: Algorithms, data

**Regulatory:**
- Licenses or approvals
- Example: Fintech, healthcare

### Testing Your Advantage

Ask:
- Can competitors copy this in < 2 years?
- Does this matter to customers?
- Do we execute this better than anyone?
- Is this advantage durable?

If "no" to any, it's not a sustainable advantage.

## Competitive Monitoring

### What to Track

**Product Changes:**
- New features
- Pricing changes
- Packaging adjustments

**Market Signals:**
- Funding announcements
- Key hires (especially leadership)
- Customer wins/losses
- Partnerships

**Performance Metrics:**
- Revenue (if public or disclosed)
- Customer count
- Growth rate
- Market share estimates

### Monitoring Cadence

**Weekly:**
- Product release notes
- News mentions

**Monthly:**
- Win/loss analysis review
- Positioning map updates

**Quarterly:**
- Deep competitive review
- Strategy adjustment

**Annually:**
- Major strategy reassessment
- Market trends analysis

## Additional Resources

### Reference Files
- **`references/frameworks-deep-dive.md`** - Detailed application of each framework with worksheets
- **`references/intel-sources.md`** - Comprehensive list of competitive intelligence sources

### Example Files
- **`examples/competitor-analysis.md`** - Complete competitive analysis for a SaaS startup
- **`examples/positioning-workshop.md`** - Step-by-step positioning development process

## Quick Start

To analyze competitive landscape:

1. **Identify competitors** - Direct, indirect, and future threats
2. **Apply Porter's Five Forces** - Assess industry attractiveness
3. **Create positioning map** - Visualize competitive space
4. **Profile top 3-5 competitors** - Deep dive on key rivals
5. **Identify differentiation** - What makes you unique
6. **Analyze pricing** - Where do you fit?
7. **Assess advantages** - What's defensible?
8. **Develop strategy** - How to win

For detailed frameworks and examples, see `references/` and `examples/`.
