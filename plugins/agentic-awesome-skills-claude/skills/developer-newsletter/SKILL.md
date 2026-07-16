---
name: developer-newsletter
description: When the user wants to create, write, or improve a newsletter for developer audiences. Trigger phrases include "newsletter," "email marketing," "developer email," "weekly digest," "dev newsletter," "email subscribers," "newsletter growth," or "email list."
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/developer-newsletter
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Developer Newsletter
## When to Use

Use this skill when you need when the user wants to create, write, or improve a newsletter for developer audiences. Trigger phrases include "newsletter," "email marketing," "developer email," "weekly digest," "dev newsletter," "email subscribers," "newsletter growth," or "email list.".


This skill helps you build and write newsletters that developers actually open, read, and look forward to receiving. Covers content strategy, writing, growth, and deliverability.

---

## Before You Start

**Load your audience context first.** Read `.agents/developer-audience-context.md` to understand:

- Who you're writing for (role, seniority, tech stack)
- What content resonates (problems, interests)
- Where else they consume content (to avoid duplicate effort)
- Voice & tone (how casual/technical)

If the context file doesn't exist, run the `developer-audience-context` skill first.

---

## Newsletter Strategy

### Define Your Newsletter Type

| Type | Description | Example |
|------|-------------|---------|
| **Product updates** | Changelog, new features, tips | Vercel's updates |
| **Curated links** | Best content from around the web | TLDR, Bytes |
| **Original content** | Your own articles, tutorials | Cassidy Williams |
| **Community digest** | What happened in your community | Dev community roundups |
| **Educational series** | Teaching a topic over time | Course-style newsletters |

**Best practice**: Pick ONE primary type. You can mix in others, but have a clear identity.

### Frequency Matrix

| Frequency | Best For | Risk |
|-----------|----------|------|
| **Daily** | Curated links, news | Fatigue, hard to maintain |
| **Weekly** | Most newsletters | Sweet spot for most |
| **Bi-weekly** | Original content heavy | Can lose momentum |
| **Monthly** | Product updates, digests | Easy to forget you exist |

**Developer preference**: Weekly is the sweet spot. Developers are busy and inbox-protective.

---

## Content Mix Framework

### The 70-20-10 Rule

| Percentage | Content Type | Purpose |
|------------|--------------|---------|
| **70%** | Value content | Teach, inform, help |
| **20%** | Product content | Updates, features, how-tos |
| **10%** | Promotional | CTAs, asks, sales |

### Content Categories

Build a rotation of these:

| Category | Examples |
|----------|----------|
| **Tutorials** | "How to implement X" |
| **News analysis** | "What Y announcement means for you" |
| **Tool/library roundups** | "5 libraries for handling Z" |
| **Code snippets** | "Quick tip: better error handling" |
| **Community highlights** | "Best from our Discord this week" |
| **Industry takes** | "Why I think X is overhyped" |
| **Behind the scenes** | "How we built feature Y" |
| **Q&A** | "You asked, we answered" |

---

## Writing Developer Emails

### Subject Line Framework

What works for developers:

| Pattern | Example | Why It Works |
|---------|---------|--------------|
| **Specific benefit** | "Cut your build time by 40%" | Concrete value |
| **Technical curiosity** | "The JavaScript feature nobody uses" | Triggers curiosity |
| **Direct announcement** | "v2.0 is here: async/await support" | Clear, newsworthy |
| **Number + topic** | "7 TypeScript tricks senior devs use" | Scannable, specific |
| **Question** | "Are you still using callbacks?" | Pattern interrupt |
| **Breaking news** | "React 19 is out: what you need to know" | Timely, urgent |

What doesn't work:

| Avoid | Why |
|-------|-----|
| ALL CAPS | Spam signals |
| "Quick question" | Manipulative |
| Excessive emoji | Looks like marketing |
| "You won't believe..." | Clickbait fatigue |
| No subject line | Just... no |

### Pre-header Text

The preview text after the subject line. Use it.

| Subject | Pre-header |
|---------|------------|
| "v2.0 is here" | "Plus: breaking changes to watch for" |
| "This week in Node.js" | "fetch() drama, npm security, and a cool CLI" |

### Email Structure

```
[Short personal intro - 1-2 sentences]

[Main content sections with clear headers]

[Code snippet if relevant]

[Quick links section]

[Sign-off with personality]
```

### Code in Email

Code rendering is tricky in email. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **Inline code** (`backticks`) | Works everywhere | No highlighting |
| **Plain text block** | Reliable | Ugly |
| **Image of code** | Beautiful | Can't copy, accessibility issues |
| **"View in browser" link** | Full formatting | Friction |
| **Styled HTML tables** | Decent formatting | Complex, can break |

**Recommendation**: Keep code short. Use inline code for small snippets, link to full examples.

```html
<pre style="background-color: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 14px; overflow-x: auto;">
const result = await fetch('/api/data');
</pre>
```

---

## Subject Line Testing

### A/B Test Framework

Test one variable at a time:

| Variable | Version A | Version B |
|----------|-----------|-----------|
| **Length** | "TypeScript 5.0 features" | "7 TypeScript 5.0 features that will change how you write code" |
| **Specificity** | "New features" | "Async imports, decorators, and 5 more" |
| **Format** | Statement | Question |
| **Personalization** | Generic | "[Name], your weekly digest" |
| **Emoji** | None | One relevant emoji |

### Subject Line Checklist

Before sending:

- [ ] Under 50 characters (mobile preview)
- [ ] No spam trigger words (free, act now, limited time)
- [ ] Specific, not vague
- [ ] Matches email content (no bait and switch)
- [ ] Would YOU open this?

---

## Growth Tactics

### Organic Growth

| Tactic | Implementation |
|--------|----------------|
| **Blog footer CTA** | "Get posts like this in your inbox" with inline form |
| **Content upgrades** | "Download the full checklist" for email |
| **Exit intent** | Popup when leaving (use sparingly) |
| **Twitter/social mentions** | "I write about this weekly in my newsletter" |
| **Documentation CTA** | Subscribe box in docs footer |
| **Open source README** | Newsletter link in project README |
| **Conference talks** | "Sign up for slides + bonus content" |

### Referral Programs

| Reward Tier | Reward Example |
|-------------|----------------|
| **1 referral** | Shoutout in newsletter |
| **5 referrals** | Exclusive content / early access |
| **10 referrals** | Swag (stickers, t-shirt) |
| **25 referrals** | 1:1 call / premium access |

### Cross-Promotion

Partner with complementary newsletters:

| Your Newsletter | Good Partners |
|-----------------|---------------|
| React-focused | TypeScript, Node.js, frontend newsletters |
| DevOps | Cloud, Kubernetes, infrastructure newsletters |
| AI/ML | Python, data science newsletters |

Swap mentions, not full ads.

---

## Avoiding Spam Filters

### Technical Setup

| Requirement | What to Do |
|-------------|------------|
| **SPF** | Add DNS record authorizing your sender |
| **DKIM** | Sign emails cryptographically |
| **DMARC** | Policy for handling auth failures |
| **Custom domain** | Send from `news@yourcompany.com`, not personal |
| **Warm up** | Start with small sends, increase gradually |

### Content Hygiene

| Do | Don't |
|-----|-------|
| Plain text version | HTML only |
| Reasonable image ratio | All images, no text |
| Clear unsubscribe | Hidden or difficult unsub |
| Consistent sending | Sporadic, unpredictable |
| Clean list | Bounces, inactive, purchased |

### Red Flag Words

Avoid in subject lines and body:

| Category | Words to Avoid |
|----------|----------------|
| **Urgency** | Act now, Limited time, Expires |
| **Free stuff** | Free, No cost, No obligation |
| **Money** | $$, Cash, Earn, Investment |
| **Exaggeration** | Amazing, Incredible, Best ever |
| **Spam classics** | Click here, Winner, Congratulations |

---

## Email Service Providers

### Developer-Friendly Options

| ESP | Best For | Dev Features |
|-----|----------|--------------|
| **Buttondown** | Simple, markdown-first | API, RSS import, minimal |
| **ConvertKit** | Creator newsletters | Automations, landing pages |
| **Mailchimp** | General purpose | Robust API, integrations |
| **Resend** | Developer-first | React Email, great DX |
| **Loops** | SaaS companies | Product-focused features |
| **Beehiiv** | Growth-focused | Referrals, monetization |

### DIY Options

| Tool | Use Case |
|------|----------|
| **Resend + React Email** | Custom transactional + marketing |
| **Postmark** | Reliability-focused |
| **SendGrid** | Scale-focused |

---

## Metrics & Benchmarks

### Key Metrics

| Metric | Developer Newsletter Benchmark |
|--------|-------------------------------|
| **Open rate** | 30-50% (higher than B2C) |
| **Click rate** | 5-15% |
| **Unsubscribe rate** | <0.5% per send |
| **Spam complaints** | <0.1% |
| **List growth rate** | 5-10% monthly |

### What to Track

| Metric | What It Tells You |
|--------|------------------|
| **Open rate by subject** | Subject line effectiveness |
| **Click rate by link** | Content resonance |
| **Reply rate** | Engagement depth |
| **Unsubscribe after send** | Content fit |
| **Forward rate** | Shareability |
| **Growth source** | Best acquisition channels |

---

## Newsletter Template

```markdown
Subject: [Specific, benefit-driven headline]
Pre-header: [Teaser that complements subject]

---

Hey [first name],

[1-2 sentence personal intro or hook]

## [Main Section 1]

[2-3 paragraphs with value]

\`\`\`javascript
// Quick code example if relevant
\`\`\`

## [Main Section 2]

[Content]

## Quick Links

- [Link 1]: One-line description
- [Link 2]: One-line description
- [Link 3]: One-line description

## From the Community

[Highlight something from Discord/Twitter/GitHub]

---

[Personal sign-off]

[Name]

P.S. [Optional: extra CTA, fun fact, or teaser]
```

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor developer conversations for newsletter content ideas. Track what topics are trending on HN, Reddit, and Twitter. |
| **Buttondown/ConvertKit/Beehiiv** | Newsletter platforms |
| **SparkLoop** | Referral program management |
| **Mailmeteor/Email Octopus** | Budget-friendly sending |
| **Mail-Tester** | Check spam score before sending |
| **Litmus/Email on Acid** | Email rendering preview |

---

## Related Skills

- `developer-audience-context` — Know who you're writing for
- `devrel-content` — Source content for your newsletter
- `community-building` — Generate community content
- `developer-advocacy` — Build your personal brand alongside newsletter

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
