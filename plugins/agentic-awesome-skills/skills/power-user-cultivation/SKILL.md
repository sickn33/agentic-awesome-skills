---
name: power-user-cultivation
description: When the user wants to identify and nurture developer advocates, build champion programs, or turn active users into contributors and evangelists. Trigger phrases include "power users," "developer advocates," "ambassador program," "champion program," "community contributors," "referral...
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/power-user-cultivation
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Power User Cultivation
## When to Use

Use this skill when you need when the user wants to identify and nurture developer advocates, build champion programs, or turn active users into contributors and evangelists. Trigger phrases include "power users," "developer advocates," "ambassador program," "champion program," "community contributors," "referral...


This skill helps you identify your most engaged developers and turn them into advocates, contributors, and champions. No forced evangelism — just creating genuine value for developers who already love what you're building.

---

## Before You Start

1. **Load your developer audience context**:
   - Check if `.agents/developer-audience-context.md` exists
   - If not, run the `developer-audience-context` skill first
   - Understanding where your developers hang out and what motivates them is essential

2. **Gather your data**:
   - Usage metrics by user
   - Community participation data
   - Support interactions (helpful answers, feature requests)
   - Content created about your product
   - Referral/invitation history

---

## The Power User Spectrum

Not all engaged users want the same relationship:

| Level | Behavior | What They Want | Your Response |
|-------|----------|----------------|---------------|
| **Active User** | Uses product regularly | Product to keep working | Keep shipping |
| **Engaged User** | Participates in community | Help and recognition | Respond quickly |
| **Advocate** | Recommends you unprompted | Insider access | Early access, direct line |
| **Champion** | Creates content, answers questions | Platform and recognition | Formal program |
| **Contributor** | Contributes code, docs, extensions | Impact and ownership | Contributor program |

**Key insight**: Don't try to push everyone up the spectrum. Meet developers where they are. Some just want a great product — that's fine.

---

## Identifying Potential Advocates

### Behavioral Signals

Look for these patterns in your data:

**Usage-based signals**:
```
- Top 10% by API calls or usage
- Using advanced/power features
- Long tenure (>6 months active)
- Multiple projects using your product
- Early adopter of new features
```

**Community signals**:
```
- Answers questions from other users
- Files detailed, constructive bug reports
- Requests features thoughtfully
- Active in Discord/Slack/forums
- Mentions you positively on social
```

**Content signals**:
```
- Wrote blog post about your product
- Created tutorial or video
- Open sourced integration or extension
- Conference talk mentioning you
- Stack Overflow answers recommending you
```

### Social Listening for Discovery

Set up monitoring for:

1. **Positive mentions**:
   - People recommending your product
   - Success stories shared publicly
   - "Just shipped with [your product]" posts

2. **Content creators**:
   - Blog posts about your product
   - Tutorial videos
   - Conference talk announcements

3. **Community helpers**:
   - People answering questions about you
   - Defending your product in discussions
   - Sharing tips and tricks

### Building a Power User List

Create a simple tracker:

| Name | Company | Signals | Score | Status |
|------|---------|---------|-------|--------|
| @jane | Startup X | Top usage, wrote blog post, answers Qs | 92 | Champion candidate |
| @john | Agency Y | Heavy usage, feature requests | 65 | Engaged user |
| @sam | Corp Z | Multiple repos using product | 58 | Advocate candidate |

**Score calculation**:
- Usage in top 10%: +20
- Community active: +15
- Created content: +25
- Answers others' questions: +20
- Positive social mentions: +10
- Feature requests accepted: +10

---

## Ambassador / Champion Programs

### Program Design

**Tiered vs flat structure**:

| Structure | Best For | Pros | Cons |
|-----------|----------|------|------|
| Tiered (Bronze/Silver/Gold) | Large communities | Clear progression | Can feel corporate |
| Flat (all equal) | Small communities | Simple, egalitarian | Less motivation |
| Invite-only | Premium feeling | Exclusive, high quality | Scaling issues |
| Application-based | Qualifying interest | Self-selected engaged users | Rejection handling |

**Recommended**: Start invite-only and small. Expand once you understand what works.

### Benefits That Developers Value

**Do offer**:

| Benefit | Why It Works |
|---------|--------------|
| Early access to features | Insider feeling, first to know |
| Direct line to team | Skip support queue, real influence |
| Conference ticket sponsorship | Tangible value, networking |
| Exclusive swag | Quality items, not junk |
| Public recognition | Build their personal brand |
| Reference/recommendation | Career value |
| AWS/GCP credits | Tangible value for projects |
| Contributor credits | Public attribution |

**Don't offer**:

| Benefit | Why It Fails |
|---------|--------------|
| Mandatory content quotas | Feels like work |
| Heavy NDA restrictions | Kills enthusiasm |
| Commission-based referrals | Feels like MLM |
| Generic discounts | Cheap, not special |
| Titles without substance | "Ambassador" with no benefits |

### Champion Program Template

```markdown
# [PRODUCT] Champions Program

## What Champions Do
- Share feedback directly with our team
- Help other developers in community
- Create content when inspired (not required)
- Test new features before public release

## What Champions Get
- Private Slack channel with engineering team
- Early access to all features (2-week head start)
- Annual conference ticket sponsorship ($2,000 value)
- Quarterly swag drops (quality items, not junk)
- Public recognition on our website
- Reference letters upon request

## Expectations
- Be active in community at least 1x/week
- Give honest feedback (including criticism)
- No content quotas — create when you want to
- Maintain constructive, helpful tone

## How to Join
By invitation only. We identify champions through:
- Community participation
- Content creation
- Usage and engagement

If you think you qualify, email champions@[product].com
```

### Running the Program

**Monthly rhythm**:
- Week 1: Share upcoming features, gather feedback
- Week 2: Community metrics review, identify new candidates
- Week 3: Champion spotlight (blog post, tweet, etc.)
- Week 4: Feedback collection, swag/benefit delivery

**Communication**:
- Private Slack/Discord channel
- Monthly video call with team (optional attendance)
- Quarterly 1:1s with champion manager

---

## Open Source Contributor Experience

### Making Contribution Easy

| Barrier | Solution |
|---------|----------|
| Can't find good first issues | Label issues clearly: "good-first-issue", "help-wanted" |
| Setup too complex | One-command dev environment (Docker/devcontainer) |
| PR review takes forever | Commit to 48-hour first response |
| Unclear contribution process | CONTRIBUTING.md with clear steps |
| No feedback on rejection | Always explain why, suggest improvements |

### CONTRIBUTING.md Template

```markdown
# Contributing to [PROJECT]

Thanks for your interest in contributing!

## Quick Start

```bash
# One command setup
make dev
# or
docker-compose up
```

## Finding Issues

- **good-first-issue**: Great for first contribution
- **help-wanted**: We'd love help with these
- **documentation**: Improve our docs

## Making a Pull Request

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `make test`
5. Push and create PR

## What to Expect

- First response within 48 hours
- We'll provide clear feedback
- Small PRs reviewed faster than large ones

## Recognition

All contributors are:
- Added to CONTRIBUTORS.md
- Credited in release notes
- Eligible for contributor swag

## Questions?

- Discord: [link]
- Email: contributors@[project].com
```

### Contributor Recognition

| Contribution Level | Recognition |
|--------------------|-------------|
| First PR merged | Welcome message, added to CONTRIBUTORS |
| 3+ PRs merged | Contributor swag pack |
| 10+ PRs merged | "Core Contributor" label, direct Slack access |
| Sustained contribution | Maintainer invitation, conference sponsorship |

---

## User-Generated Content Programs

### Types of UGC

| Content Type | Value | Effort to Get |
|--------------|-------|---------------|
| Twitter/social mentions | Social proof | Low (happens naturally) |
| Blog posts | SEO, credibility | Medium |
| Video tutorials | Engagement, reach | High |
| Conference talks | Credibility, reach | Very high |
| Extensions/integrations | Ecosystem value | High |

### Encouraging Content Creation

**Passive encouragement**:
- Showcase existing content prominently
- Retweet/share everything created about you
- Feature creators in changelog and newsletters

**Active encouragement**:
- "Write about us" page with resources
- Content bounty program (see below)
- Tutorial template and guidelines
- Conference talk support (slide review, practice)

### Content Bounty Program

Offer compensation for content:

| Content Type | Bounty | Requirements |
|--------------|--------|--------------|
| Blog post | $200-500 | 800+ words, technical depth, original |
| Video tutorial | $300-750 | 5-15 min, good production, task completion |
| Conference talk | $500 + travel | Accepted talk, mentions product genuinely |
| Integration/extension | $500-2000 | Published, documented, maintained |

**Guidelines**:
- Must disclose sponsorship/bounty
- Content must be genuinely useful (not advertorial)
- You get first review but not editorial control
- They retain ownership

### Content Bounty Page Template

```markdown
# Write About [PRODUCT]

We pay developers to create great content.

## What We're Looking For

- Tutorials solving real problems with [PRODUCT]
- Integrations with popular tools
- Conference talks about [CATEGORY]
- Video content (YouTube, courses)

## Bounties

| Type | Amount | Turnaround |
|------|--------|------------|
| Blog post (800+ words) | $200-500 | 2 weeks |
| Video tutorial (5+ min) | $300-750 | 3 weeks |
| Published integration | $500-2000 | Varies |

## How It Works

1. **Pitch**: Email content@[product].com with your idea
2. **Approve**: We'll confirm scope and bounty
3. **Create**: You write/record
4. **Review**: We give feedback (you keep editorial control)
5. **Publish**: You publish on your platform
6. **Payment**: We pay within 5 business days

## Guidelines

- Must disclose: "This post was supported by [PRODUCT]"
- Must be genuinely useful (not an ad)
- You retain ownership of your content
- We may share on our channels (with credit)

## Apply

Email content@[product].com with:
- Your idea (2-3 sentences)
- Your platform/audience
- Requested bounty
- Timeline

We respond within 3 business days.
```

---

## Referral Programs for Developers

### What Works for Developers

| Approach | Effectiveness | Notes |
|----------|---------------|-------|
| Double-sided (both get value) | High | Both referrer and referred benefit |
| Credits/service | High | Use product more, not cash out |
| Cash | Medium | Works but feels transactional |
| Swag only | Low | Not enough for ongoing referrals |
| Commission/affiliate | Low | Feels like MLM, kills credibility |

### Referral Program Design

**Recommended structure**:

```
Refer a developer to [PRODUCT]:

You get: $50 in credits
They get: $50 in credits + extended trial

No limits. Stack as many as you want.
```

**Why this works**:
- Both parties benefit (fair)
- Credits encourage more usage (flywheel)
- No weird commission tracking
- Simple to understand

### Referral Program Template

```markdown
# [PRODUCT] Referral Program

## How It Works

1. Share your referral link: [DASHBOARD/REFERRALS]
2. Friend signs up and becomes a paying customer
3. You both get $50 in credits

## Fine Print

- Credits apply to future bills (never cash out)
- Referred user must be new (no existing accounts)
- Referred user must become paying customer
- No limit on referrals
- Credits never expire

## Your Referral Link

[LINK]

## Tracking

See all your referrals at: [DASHBOARD/REFERRALS]
```

### Making Referrals Easy

- Shareable link (no codes to remember)
- One-click copy button
- Pre-written tweet/message to share
- Dashboard showing referral status
- Email when referral converts

---

## Community Recognition and Rewards

### Recognition Hierarchy

| Level | Recognition | Examples |
|-------|-------------|----------|
| Public shoutout | Twitter mention, newsletter feature | "Thanks @jane for the great bug report!" |
| Spotlight feature | Blog post, video interview | "Developer spotlight: How Jane uses [PRODUCT]" |
| Contributor page | Website listing | CONTRIBUTORS.md, website wall |
| Advisory role | Input on roadmap | Beta access, feedback sessions |
| Formal title | Champion, Ambassador, Maintainer | Badge, bio update |

### Recognition That Matters

**Do**:
- Be specific about what they did
- Be public (with permission)
- Be timely (recognize quickly)
- Help their career (reference letters, intros)
- Give them platform (your blog, your stage)

**Don't**:
- Generic "thanks to our community"
- Private thanks for public contribution
- Delayed recognition (months later)
- Recognition without substance
- Titles without actual benefits

### Swag That Developers Want

| Yes | No |
|-----|-----|
| High-quality t-shirts (Bella+Canvas, etc.) | Cheap promotional tees |
| Quality hoodies | Polyester anything |
| Useful items (notebooks, cables, bags) | Stress balls, pens |
| Limited edition / exclusive | Same as conference booth giveaway |
| Stickers (always) | Outdated branding |

**Pro tip**: Ask your power users what they want. Survey > assumptions.

### Recognition Workflow

```
When someone does something notable:

1. Screenshot/document it (tweet, PR, blog post)
2. Public thank you within 24 hours
3. Add to monthly newsletter spotlight
4. Consider for champion program if pattern continues
5. Update power user tracker
```

---

## Measuring Advocate Impact

### Metrics to Track

| Metric | How to Measure | Why It Matters |
|--------|----------------|----------------|
| Content created | Count posts, videos, talks | Reach and awareness |
| Questions answered | Community activity | Support deflection |
| Referrals driven | Referral tracking | Direct acquisition |
| Social mentions | Social listening tools | Organic awareness |
| PR/contributions | GitHub activity | Product improvement |

### Attribution Challenges

Developer advocacy is hard to attribute. Accept that:
- Blog posts drive signups months later
- Word of mouth is invisible
- Stack Overflow answers compound
- Conference talks reach people who don't convert immediately

**Track directionally, not precisely**:
- Survey new signups: "How did you hear about us?"
- Track referral links when used
- Monitor social mention trends
- Correlate content with traffic spikes

### Advocate ROI Calculation

Rough framework:

```
Champion program cost:
- Swag: $200/person/year
- Conference sponsorship: $2000/person/year
- Staff time: $5000/year total

Total for 10 champions: $27,000/year

Champion value (estimate):
- Average referrals: 5/person/year = 50 total
- Referral LTV: $1000
- Referral value: $50,000

- Content created: 20 posts
- Traffic value: $500/post = $10,000

- Questions answered: 200
- Support deflection: $25/ticket = $5,000

- Social mentions: 100
- Brand value: Hard to quantify

Estimated ROI: ~3x (conservative)
```

---

## Common Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Forcing content creation | Burns out advocates, feels like work | Make it optional, reward when it happens |
| Commission-based referrals | Feels like MLM, kills authenticity | Use credits/mutual benefit instead |
| Ignoring small contributors | They become big contributors | Recognize every contribution |
| Generic recognition | Feels hollow | Be specific about what they did |
| Demanding NDAs | Kills enthusiasm to share | Limit NDAs to truly sensitive info |
| Program without benefits | People leave quickly | Real benefits, not just titles |
| Starting too big | Hard to manage | Start with 5-10 champions, grow slowly |

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Discover advocates through positive mentions, track content created about you, monitor community sentiment, identify power users across platforms |
| **FirstPromoter** | Referral program management |
| **Printful** | On-demand swag fulfillment |
| **GitHub** | Contributor tracking, recognition |

---

## Related Skills

- `developer-audience-context` — Understand what motivates your developers
- `developer-churn` — Keep power users from leaving
- `developer-listening` — Find advocate candidates through monitoring
- `developer-email-sequences` — Nurture sequences for power users
- `hackathon-sponsorship` — Events where advocates can shine

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
