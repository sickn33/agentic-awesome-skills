# Developer Audience Context

Last updated: 2024-01-15

---

## Product Overview

| Field | Value |
|-------|-------|
| **Product name** | Checkmate (fictional example) |
| **One-liner** | We help backend developers write API tests without learning a new DSL |
| **Category** | CLI + Open source library |
| **Core technology** | TypeScript, works with any Node.js project |
| **Pricing model** | Open source core, paid cloud dashboard for teams |

---

## Developer Persona

| Field | Value |
|-------|-------|
| **Primary role** | Backend / Full-stack |
| **Seniority** | Mid to Senior (2-8 years experience) |
| **Company size** | Startup to Scale-up (10-500 employees) |
| **Industry verticals** | B2B SaaS, Fintech, E-commerce |
| **Tech stack** | Node.js, TypeScript, Express/Fastify, PostgreSQL, REST APIs |
| **Decision authority** | Individual contributor who influences tooling decisions |

**Day-in-the-life**:
> Sarah is a senior backend engineer at a Series B fintech startup. She spends most of her day writing and reviewing API code. She knows they should have better test coverage but the existing test setup is brittle and slow. Every time she tries to add tests, she spends more time fighting the test framework than writing actual tests. She's evaluated Postman and other tools but doesn't want to maintain tests in a separate GUI. She wants tests that live in her codebase and run in CI.

---

## Where They Hang Out

| Channel | Specific places |
|---------|-----------------|
| **Reddit** | r/node, r/typescript, r/webdev, r/ExperiencedDevs |
| **Discord/Slack** | Reactiflux, TypeScript Community, various company Slacks |
| **Twitter/X** | #typescript, #nodejs, follows @sindresorhus, @maaboroosh, @benloeb |
| **Newsletters** | Node Weekly, JavaScript Weekly, bytes.dev |
| **Podcasts** | Syntax.fm, JS Party, The Changelog |
| **Blogs** | Dev.to, Kent C. Dodds, Testing JavaScript |
| **Conferences** | NodeConf, TSConf, local JavaScript meetups |
| **GitHub** | Topics: testing, api-testing, typescript |
| **Stack Overflow** | Tags: node.js, typescript, api-testing, jest, vitest |

---

## Problems & Pain Points

### Functional problems
- Existing test setups are slow and flaky
- Learning curve for testing frameworks is steep
- Mocking APIs and databases is painful
- Tests don't catch the bugs that actually matter
- CI runs take forever because of integration tests

### Emotional pain
- Embarrassment when production bugs could have been caught by tests
- Frustration with test maintenance overhead
- Anxiety about shipping without confidence
- Guilt about skipping tests due to time pressure

### Trigger moments
- Just shipped a bug that tests would have caught
- New team member asks "where are the tests?"
- CI is taking 20+ minutes
- Tried to refactor code and broke everything

**#1 frustration that brings developers to us**:
> "I want to test my APIs but I don't want to spend a week learning a new framework and setting up fixtures. Just let me write tests that look like the code I'm already writing."

---

## Current Alternatives

| Alternative | Why devs choose it | What's frustrating | Switching triggers |
|-------------|-------------------|-------------------|-------------------|
| **Jest + Supertest** | Already using Jest, Supertest is simple | Slow, verbose setup, bad TypeScript support | Speed issues, TypeScript errors |
| **Postman/Insomnia** | Visual, easy to start | Tests live outside codebase, hard to version control | Need tests in CI, team scaling |
| **Playwright/Cypress** | Powerful, good DX | Overkill for API testing, slow | Just need API tests, not E2E |
| **Build it themselves** | Full control | Maintenance burden, reinventing the wheel | Team grows, need standards |
| **Do nothing** | No time investment | Bugs in production, no confidence | Major incident, new compliance requirement |

---

## Key Differentiators

| Type | Our claim | Proof |
|------|-----------|-------|
| **Technical** | 10x faster than Jest+Supertest | Benchmark: 500 tests in 2s vs 20s |
| **DX** | Zero-config TypeScript support | Just `npm install`, no setup |
| **Ecosystem** | Works with your existing test runner | Vitest, Jest, Node test runner |
| **Philosophy** | Tests should look like your code | No DSL, just TypeScript |

---

## Verbatim Developer Language

### How they describe the problem
> "Testing APIs shouldn't be this hard"
> "I just want to make a request and check the response"
> "Why do I need 50 lines of setup for one test?"
> "Our test suite takes 15 minutes to run"

### How they describe our product
> "It's like if fetch() was designed for testing"
> "Finally, API tests that don't suck"
> "The TypeScript support is *chef's kiss*"

### Common objections
> "What about when I need to mock the database?"
> "Will this work with our existing Jest setup?"
> "We're already invested in Postman"
> "Is this maintained? I don't want to depend on an abandoned project"

### Praise / testimonials
> "Migrated 200 tests in an afternoon. CI went from 12 minutes to 90 seconds." — @devname on Twitter
> "Best testing DX I've experienced in 10 years of backend work." — GitHub issue #142

**Sources**: GitHub issues, Twitter mentions, Hacker News launch thread, support Discord

---

## Technical Trust Signals

| Signal | Current value |
|--------|---------------|
| **GitHub stars** | 3,200 |
| **npm downloads** | 45k/week |
| **Contributors** | 28 |
| **Community size** | Discord: 1,200 members |
| **Notable users** | Vercel, Linear, Cal.com |
| **Backed by** | YC W24 |

---

## Conversion Actions

| Stage | Primary action | Secondary actions |
|-------|---------------|-------------------|
| **Awareness** | Star repo | Read blog post, follow on Twitter |
| **Consideration** | Read docs/quickstart | Watch 5-min demo, join Discord |
| **Trial** | `npm install checkmate` | Run first test |
| **Activation** | Migrate 1 existing test | Add to CI |
| **Conversion** | Sign up for cloud dashboard | Add team members |

**"Hello World" moment**:
> Developer runs their first test and sees it pass in <100ms. They think "wait, that's it?" Then they look at the TypeScript autocomplete and realize they get full type safety on their API responses.

---

## Voice & Tone

| Dimension | Our position (1-5) |
|-----------|-------------------|
| Casual ← → Professional | 2 (casual but competent) |
| Accessible ← → Deep technical | 4 (assume backend knowledge) |
| Neutral ← → Opinionated | 4 (we have opinions about testing) |
| Serious ← → Playful | 3 (occasional humor, not try-hard) |

**Voice inspiration** (brands/people to emulate):
- Tailwind (opinionated but practical)
- Vitest (modern, fast, developer-first)
- tRPC (TypeScript-native thinking)

**Words we use**:
- Fast, simple, TypeScript-native, zero-config, real tests
- "Just works", "designed for", "built by developers"

**Words we avoid**:
- Enterprise-grade, best-in-class, revolutionary, game-changing
- Anything that sounds like marketing fluff
