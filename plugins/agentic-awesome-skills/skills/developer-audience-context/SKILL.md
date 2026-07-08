---
name: developer-audience-context
description: When the user wants to establish or update their developer audience context. Also use when starting any other developer marketing skill to ensure foundational context is loaded. Trigger phrases include "developer persona," "target developers," "who are our developers," "developer...
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/developer-audience-context
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Developer Audience Context
## When to Use

Use this skill when you need when the user wants to establish or update their developer audience context. Also use when starting any other developer marketing skill to ensure foundational context is loaded. Trigger phrases include "developer persona," "target developers," "who are our developers," "developer...


This skill helps you create and maintain `.agents/developer-audience-context.md` — a foundational document that captures everything about your target developers. All other developer marketing skills reference this document first, so you only define your audience once.

---

## Before You Start

Check if `.agents/developer-audience-context.md` exists:

- **If it exists**: Read it and offer to update specific sections
- **If it doesn't exist**: Create the directory and file, then walk through each section

---

## Two Ways to Build Context

### Option 1: Auto-Draft from Codebase (Recommended)

Analyze existing materials to draft an initial version:

1. **README.md** — Product description, features, getting started
2. **Documentation** — `/docs`, API reference, tutorials
3. **Landing pages** — `index.html`, marketing copy
4. **package.json / pyproject.toml** — Dependencies reveal ecosystem
5. **GitHub Issues** — Common questions, frustrations, use cases
6. **Existing blog posts** — Technical content, tutorials

After drafting, walk through each section to validate and fill gaps.

### Option 2: Start from Scratch

Ask questions section-by-section. Don't advance until the current section is complete.

---

## The 10 Sections to Capture

### 1. Product Overview

| Field | What to capture |
|-------|-----------------|
| Product name | Official name and any aliases |
| One-liner | "We help [developers] do [X] without [Y]" |
| Category | API, SDK, CLI, SaaS, open source library, infrastructure |
| Core technology | Languages, frameworks, platforms supported |
| Pricing model | Free/open source, freemium, usage-based, seat-based |

### 2. Developer Persona

Not "developers" generically — get specific:

| Field | What to capture |
|-------|-----------------|
| Primary role | Backend, frontend, full-stack, DevOps, data, ML, mobile |
| Seniority | Junior, mid, senior, staff, lead, architect |
| Company size | Solo, startup, scale-up, enterprise |
| Industry verticals | Fintech, healthtech, e-commerce, gaming, B2B SaaS |
| Tech stack | Languages, frameworks, cloud providers they use |
| Decision authority | Individual contributor, team lead, buyer, influencer |

**Ask**: "Describe the developer who gets the most value from your product in one paragraph. What's their day-to-day like?"

### 3. Where They Hang Out

Developers research before they buy. Know where:

| Channel | Specifics to capture |
|---------|---------------------|
| Communities | Specific subreddits, Discord servers, Slack groups |
| Social | Twitter/X hashtags, LinkedIn groups |
| Content | Blogs they read, newsletters they subscribe to, podcasts |
| Events | Conferences, meetups, hackathons |
| Code | GitHub topics, Stack Overflow tags |

**Pro tip**: Use social listening tools to monitor conversations across Hacker News, Reddit, Stack Overflow, GitHub, and Twitter. See where discussions about your problem space happen organically.

### 4. Problems & Pain Points

Capture the actual problems, not your solution's features:

| Level | What to capture |
|-------|-----------------|
| Functional | "I can't do X" / "X takes too long" / "X is error-prone" |
| Emotional | Frustration, anxiety, embarrassment, fear |
| Situational | When does the pain occur? What triggers the search? |

**Ask**: "What's the #1 frustration that brings developers to you?"

**Research**: Search Reddit, Hacker News, and Stack Overflow for complaints about your problem space. Capture verbatim quotes.

### 5. Current Alternatives

What are developers using today instead of you?

| Alternative type | Examples |
|-----------------|----------|
| Direct competitors | Tools that solve the same problem |
| DIY / build it yourself | Custom scripts, internal tools |
| Indirect solutions | Workarounds, manual processes |
| Do nothing | Live with the pain |

For each alternative, capture:
- Why developers choose it
- What's frustrating about it
- What would make them switch

### 6. Key Differentiators

What makes you different — in developer terms:

| Differentiator type | Example |
|--------------------|---------|
| Technical | "10x faster," "No dependencies," "Type-safe" |
| DX (Developer Experience) | "5-minute setup," "Great docs," "First-class CLI" |
| Ecosystem | "Works with X," "Built for Y framework" |
| Philosophy | "Open source," "Privacy-first," "Local-first" |

**Warning**: Avoid marketing fluff. Developers see through "best-in-class" and "enterprise-grade." Use specific, provable claims.

### 7. Verbatim Developer Language

Capture exact phrases developers use — not polished marketing copy:

| Category | Examples |
|----------|----------|
| Describing the problem | "This is such a pain," "I wish I could just..." |
| Describing your product | How they explain it to others |
| Objections | "But what about...", "I'm worried that..." |
| Praise | Testimonials, tweets, GitHub comments |

**Sources**: GitHub issues, Twitter mentions, Hacker News comments, support tickets, sales calls, community Slack/Discord.

### 8. Technical Trust Signals

What proof points matter to developers:

| Signal type | Examples |
|-------------|----------|
| Adoption | GitHub stars, npm downloads, Docker pulls |
| Quality | Test coverage, security audits, uptime SLA |
| Community | Contributors, Discord members, forum activity |
| Credibility | Backed by X, used by Y, created by Z |
| Transparency | Open source, public roadmap, changelog |

### 9. Conversion Actions

What does success look like at each stage?

| Stage | Primary action | Secondary actions |
|-------|---------------|-------------------|
| Awareness | Star repo, follow on Twitter | Read blog post, share content |
| Consideration | Clone repo, read docs | Watch demo, join Discord |
| Trial | Sign up, install SDK | Complete quickstart, make first API call |
| Activation | Reach "Hello World" moment | Integrate into real project |
| Conversion | Upgrade to paid | Add team members, expand usage |

### 10. Voice & Tone

How should you sound when talking to these developers?

| Dimension | Spectrum |
|-----------|----------|
| Formality | Casual ← → Professional |
| Technicality | Accessible ← → Deep technical |
| Personality | Neutral ← → Opinionated |
| Humor | Serious ← → Playful |

**Examples**:
- Stripe → Professional, precise, clean
- Vercel → Modern, confident, developer-first
- Supabase → Friendly, accessible, community-driven
- Tailwind → Opinionated, direct, practical

---

## Output Format

Save to `.agents/developer-audience-context.md` with this structure:

```markdown
# Developer Audience Context

Last updated: [DATE]

## Product Overview
[Section content]

## Developer Persona
[Section content]

## Where They Hang Out
[Section content]

## Problems & Pain Points
[Section content]

## Current Alternatives
[Section content]

## Key Differentiators
[Section content]

## Verbatim Developer Language
[Section content]

## Technical Trust Signals
[Section content]

## Conversion Actions
[Section content]

## Voice & Tone
[Section content]
```

---

## Maintenance

Update this document when:

- You learn something new from user research
- You find great verbatim quotes
- Your positioning or differentiation changes
- You expand to new developer segments

---

## Tools

| Tool | Use case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor developer conversations across GitHub, Hacker News, Reddit, Stack Overflow, Twitter. Essential for capturing verbatim language, finding pain points, and understanding where your developers hang out. |
| **GitHub Search** | Find how developers describe problems in issues |
| **Twitter Advanced Search** | Find discussions about your space |
| **Google Alerts** | Track mentions of competitors and problem keywords |

---

## Related Skills

After establishing context, these skills will reference it:

- `devrel-content` — Writing content that resonates
- `hacker-news-strategy` — Engaging on HN authentically
- `developer-onboarding` — Optimizing time-to-value
- `developer-seo` — Targeting the right technical queries
- `competitor-tracking` — Understanding your competitive landscape

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
