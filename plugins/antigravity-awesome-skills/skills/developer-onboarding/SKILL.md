---
name: developer-onboarding
description: 'Get developers to "Hello World" fast with optimized quickstarts, tutorials, and sample apps. Trigger phrases: developer onboarding, time to first value, quickstart guide, hello world tutorial, developer activation, onboarding checklist, sample apps, getting started experience, reduce...'
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/developer-onboarding
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Developer Onboarding
## When to Use

Use this skill when you need get developers to "Hello World" fast with optimized quickstarts, tutorials, and sample apps. Trigger phrases: developer onboarding, time to first value, quickstart guide, hello world tutorial, developer activation, onboarding checklist, sample apps, getting started experience, reduce...


Get developers from signup to working code as fast as possible, then guide them to deeper engagement.

## Overview

Developer onboarding is the critical window between "I signed up" and "I understand how to use this." You have about 10 minutes of developer attention. Every second of confusion, every error message without guidance, every "it should work but doesn't" moment costs you users.

Great onboarding feels like pair programming with someone who anticipated every question. Bad onboarding feels like being dropped in a foreign city without a map.

## Before You Start

Review the `/devmarketing-skills/skills/developer-audience-context` skill to understand your target developers. A hobbyist building side projects needs different onboarding than an enterprise architect evaluating tools for production. Review `/devmarketing-skills/skills/developer-signup-flow` to ensure signup flows smoothly into onboarding.

## Time-to-First-Value Optimization

### Defining "First Value"

First value isn't "made an API call." First value is when the developer sees your tool doing something useful for them.

| Tool Type | First Value Moment |
|-----------|-------------------|
| API | Response returns meaningful data |
| SDK | Library performs expected function |
| Database | Query returns results |
| Hosting | App is live and accessible |
| Auth | User successfully logs in |
| Payment | Test charge processes |

### Measuring Time to First Value (TTFV)

Track timestamps at each stage:

```
signup_completed: 2024-01-15T10:00:00Z
dashboard_loaded: 2024-01-15T10:00:05Z
api_key_copied: 2024-01-15T10:01:30Z
first_api_call: 2024-01-15T10:04:45Z
first_successful_response: 2024-01-15T10:04:46Z  # TTFV = 4:46
```

**Benchmarks by category:**
- Simple APIs: <5 minutes
- SDKs requiring installation: <10 minutes
- Complex infrastructure: <30 minutes
- Self-hosted: <60 minutes

### Removing TTFV Obstacles

Map every step and eliminate blockers:

**Common TTFV killers:**
1. Email verification before dashboard access
2. API keys hidden in account settings
3. Quickstart assumes dependencies already installed
4. First example requires paid features
5. Error messages without resolution guidance
6. Docs search finds outdated tutorials

**TTFV audit process:**
1. Create new account (fresh browser, no cookies)
2. Screen record your first 30 minutes
3. Note every moment of confusion or friction
4. Time each step
5. Repeat with 5 different developer personas

## Quickstart Checklist Design

### The Ideal Quickstart Structure

```markdown
# Quickstart: [Specific Goal] in 5 Minutes

What you'll build: [Screenshot or description of end result]

Prerequisites:
- Node.js 18+ (check: node --version)
- npm or yarn

## Step 1: Install the SDK
[One command, copy button]

## Step 2: Initialize with your API key
[Code with placeholder, copy button]

## Step 3: Make your first request
[Complete working example, copy button]

## Step 4: See the result
[Expected output shown]

## Next steps
- [Link to common second task]
- [Link to full documentation]
```

### Checklist Patterns That Work

**Progress indicators (Stripe style):**
```
Your integration progress:
[x] Create account
[x] Get API keys
[ ] Install SDK
[ ] Make first API call
[ ] Handle webhooks
```

**Contextual next steps (Vercel style):**
```
You've deployed your first site.

What's next?
[ ] Add a custom domain
[ ] Set up environment variables
[ ] Enable analytics
```

### Common Quickstart Failures

**Too much context upfront:**
```
# Bad: The history of authentication
Before we begin, let's understand OAuth 2.0...
[500 words of background]

# Good: Jump to action
Install the SDK and make your first authenticated request.
```

**Assuming environment:**
```
# Bad
Run `npm install` to install dependencies.

# Good
npm install our-sdk
# Or with yarn: yarn add our-sdk
# Or with pnpm: pnpm add our-sdk
```

**Hidden prerequisites:**
```
# Bad (prerequisite discovered in Step 3)
Step 3: Connect to Redis
First, make sure Redis is running...

# Good (prerequisites listed upfront)
Prerequisites:
- Redis 6+ running locally (docker run -p 6379:6379 redis)
```

## Interactive vs Static Tutorials

### When to Use Interactive Tutorials

**Interactive tutorials work for:**
- Complex setup sequences
- Concepts that benefit from immediate feedback
- Onboarding flows where you control the environment
- Features requiring API keys or credentials

**Interactive tutorial tools:**
- Embedded code editors (CodeSandbox, StackBlitz)
- Terminal emulators (Instruqt, Killercoda)
- In-dashboard walkthroughs (Appcues, Pendo)
- Interactive notebooks (Jupyter, Observable)

### When Static Documentation Wins

**Static docs work better for:**
- Reference documentation
- Copy-paste code snippets
- Steps involving local development
- Content that changes frequently

### Hybrid Approach

**Best practice: Offer both**

```
# Make Your First API Request

## Quick version (copy-paste)
[Code block with copy button]

## Interactive version
[Launch in StackBlitz] [Try in CodeSandbox]

## Video walkthrough
[5-minute embedded video]
```

### Interactive Tutorial UX Guidelines

**Do:**
- Save progress automatically
- Allow skipping ahead
- Show estimated time remaining
- Provide escape hatch to static docs
- Work in mobile browsers (at least for viewing)

**Don't:**
- Require account creation for tutorials
- Auto-play videos
- Lock content behind completed steps
- Time out idle sessions without warning
- Require specific IDE or browser

## Sample Apps and Templates

### Template Strategy

**Tiered approach:**

1. **Minimal example** (Hello World)
   - Single file
   - Zero dependencies beyond your SDK
   - Works in 30 seconds
   - Purpose: Prove the SDK works

2. **Starter template** (Basic app)
   - Simple folder structure
   - Common patterns demonstrated
   - Works in 5 minutes
   - Purpose: Starting point for real projects

3. **Production template** (Full app)
   - Production-ready architecture
   - Auth, error handling, testing included
   - Works in 30 minutes
   - Purpose: Reference implementation

### Template Organization

```
github.com/your-org/
├── examples/
│   ├── minimal/
│   │   ├── node/
│   │   ├── python/
│   │   └── go/
│   ├── starter/
│   │   ├── nextjs/
│   │   ├── express/
│   │   └── fastapi/
│   └── production/
│       ├── saas-starter/
│       └── internal-tool/
```

### Template Maintenance

Templates that don't work are worse than no templates.

**Template health checklist:**
- [ ] CI runs against all templates weekly
- [ ] Dependencies updated monthly
- [ ] SDK version pinned and updated with releases
- [ ] README tested by new contributor quarterly
- [ ] Deprecation notices added before removal

### Real Examples

**Excellent templates: Supabase**
- Templates for multiple frameworks
- One-click deploy to Vercel/Netlify
- Include auth, database, and storage patterns
- Actively maintained

**Excellent templates: Clerk**
- Framework-specific quickstarts
- Complete with authentication flows
- Progressive complexity (minimal → full-featured)

## Handling Onboarding Failures Gracefully

### Common Failure Points

1. **Installation failures**
   - Dependency conflicts
   - Version mismatches
   - Platform-specific issues

2. **Authentication failures**
   - Invalid API key
   - Expired token
   - Wrong environment (test vs production)

3. **First request failures**
   - Network issues
   - CORS problems
   - Rate limiting
   - Invalid request format

### Error Message Design

**Bad error message:**
```
Error: Request failed with status 401
```

**Good error message:**
```
Authentication failed: Invalid API key

Your API key starts with 'sk_test_' but you're calling the production endpoint.

To fix:
1. Use the production API key (starts with 'sk_live_'), or
2. Change endpoint to https://api.example.com/test/

Docs: https://docs.example.com/auth#environments
```

### Proactive Failure Prevention

**Detect common mistakes in real-time:**

```javascript
// Client SDK that catches common errors
if (apiKey.startsWith('sk_test_') && endpoint.includes('/v1/')) {
  console.warn(
    'Warning: Using test API key with production endpoint. ' +
    'This will fail. Use production key or test endpoint.'
  );
}
```

### Recovery Flows

**In-dashboard error recovery:**

```
Something went wrong with your integration.

We detected:
- Last API call: 2 hours ago
- Status: 401 Unauthorized
- Likely cause: API key rotated

[Regenerate API Key] [View Error Logs] [Contact Support]
```

## Measuring Activation Metrics

### Defining Activation

Activation = the moment a developer has enough success to keep using your product.

Different products, different activation definitions:

| Product | Activation Definition |
|---------|----------------------|
| Stripe | First successful test charge |
| Twilio | First SMS sent and delivered |
| Auth0 | First user authenticated |
| Vercel | First deploy accessible via URL |
| Algolia | First search returns results |

### Core Activation Metrics

**Activation rate**
```
Activated users / Signed up users × 100
```
Benchmark: 20-40% for self-serve developer products

**Time to activation**
```
Median time from signup to activation event
```
Benchmark: <10 minutes for APIs, <1 hour for infrastructure

**Activation by cohort**
Track weekly or monthly cohorts to identify improvements:
```
Week 1 cohort: 25% activation
Week 2 cohort: 28% activation (added better error messages)
Week 3 cohort: 35% activation (added interactive tutorial)
```

### Leading Indicators

Track behaviors that predict activation:

| Leading Indicator | Correlation to Activation |
|-------------------|---------------------------|
| Copied API key | 2x more likely |
| Viewed quickstart | 1.5x more likely |
| Installed SDK | 3x more likely |
| Joined Discord | 2.5x more likely |

### Lagging Indicators

Confirm activation led to value:

| Lagging Indicator | Meaning |
|-------------------|---------|
| Day 7 retention | Still using after a week |
| API calls in week 2 | Continued development |
| Upgrade to paid | Perceived enough value |
| Invited team member | Expanding usage |

### Activation Funnel Example

```
Signed up: 1,000
├── Visited dashboard: 950 (95%)
├── Viewed quickstart: 700 (74%)
├── Copied API key: 500 (71%)
├── Made first API call: 350 (70%)
├── Got successful response: 300 (86%)  ← Activation
├── Made 10+ API calls: 150 (50%)
└── Day 7 return: 100 (67%)
```

## Onboarding Email Sequences

### Email Timing

| Email | Timing | Purpose |
|-------|--------|---------|
| Welcome | Immediate | Confirm signup, provide key links |
| Getting started | +1 hour | Drive first API call if not done |
| Tips | +1 day | Share common patterns |
| Check-in | +3 days | Ask if stuck, offer help |
| Activation push | +7 days | Final nudge if not activated |

### Email Content Principles

**Do:**
- Include code snippets (syntax highlighted)
- Link to specific docs pages
- Offer direct reply for help
- Stop sequence once activated

**Don't:**
- Send marketing content during onboarding
- Require clicks to view content
- Send more than one email per day
- Continue sequence after activation

## Examples from Real Developer Tools

### Excellent Onboarding: Stripe

- Test API keys visible immediately
- Interactive "make your first charge" in dashboard
- Language-specific code examples
- Error messages include fix suggestions
- Progress indicator shows completion

### Excellent Onboarding: Railway

- One-click template deploys
- No configuration required for common frameworks
- Live preview URL in seconds
- Clear free tier limits shown

### Excellent Onboarding: Planetscale

- Interactive database explorer
- Import from existing database offered
- SQL examples match your schema
- Branch workflow explained with visuals

### Poor Onboarding Patterns to Avoid

- Multi-step wizards that can't be skipped
- "Complete your profile" blocking code access
- Documentation requiring search to find quickstart
- Quickstarts that assume too much setup
- Error messages without guidance

## Tools

### Onboarding Platforms

- **Appcues** - In-app walkthroughs and checklists
- **Pendo** - Product analytics with onboarding features
- **Userflow** - No-code onboarding flows
- **CommandBar** - Developer-focused command palette with onboarding

### Interactive Documentation

- **CodeSandbox/StackBlitz** - Browser-based code environments
- **Killercoda** - Interactive terminal scenarios
- **ReadMe** - API documentation with "Try It" features
- **Mintlify** - Modern docs with embedded code runners

### Email and Lifecycle

- **Customer.io** - Behavior-triggered emails
- **Loops** - Email for SaaS
- **Intercom** - Chat + email onboarding

### Analytics

- **Amplitude** - Onboarding funnel analysis
- **PostHog** - Open source alternative
- **Heap** - Auto-capture for retroactive analysis

## Related Skills

- `/devmarketing-skills/skills/developer-signup-flow` - Getting to the onboarding start
- `/devmarketing-skills/skills/developer-audience-context` - Who you're onboarding
- `/devmarketing-skills/skills/free-tier-strategy` - What they can do without paying

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
