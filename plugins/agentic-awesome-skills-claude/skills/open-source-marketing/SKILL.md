---
name: open-source-marketing
description: When the user wants to market an open source project authentically. Trigger phrases include "open source marketing," "OSS marketing," "GitHub marketing," "promote my library," "grow stars," "launch open source," "open source growth," or "contributor marketing."
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/open-source-marketing
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Open Source Marketing
## When to Use

Use this skill when you need when the user wants to market an open source project authentically. Trigger phrases include "open source marketing," "OSS marketing," "GitHub marketing," "promote my library," "grow stars," "launch open source," "open source growth," or "contributor marketing.".


This skill helps you market open source projects without being cringe. Covers GitHub optimization, community building, contributor experience, launch strategies, and sustainable growth.

---

## Before You Start

**Load your audience context first.** Read `.agents/developer-audience-context.md` to understand:

- Who would use this project (role, tech stack, problem)
- Where they discover tools (communities, social, search)
- What alternatives exist (why would they switch?)
- How they evaluate OSS (stars, activity, docs, community)

If the context file doesn't exist, run the `developer-audience-context` skill first.

---

## The OSS Marketing Mindset

### What Works vs. What Doesn't

| Works | Doesn't Work |
|-------|--------------|
| Building in public | Spamming "check out my project" |
| Solving real problems | Building solutions seeking problems |
| Genuine community engagement | Transactional follows/unfollows |
| Great docs and DX | "The code is self-documenting" |
| Celebrating contributors | Taking sole credit |
| Consistent presence | Launch and disappear |

### The Growth Equation

```
Growth = (Real value) × (Discoverability) × (First-use experience)
```

If any factor is zero, growth is zero.

---

## GitHub Optimization

### README Excellence

Your README is your landing page. Optimize it.

**Structure:**

```markdown
# Project Name

[One-line description that explains what it does]

[Badges: build status, version, license, downloads]

[Screenshot or GIF showing it in action]

## Why [Project Name]?

- ✅ [Benefit 1 - specific, not fluffy]
- ✅ [Benefit 2]
- ✅ [Benefit 3]

## Quick Start

\`\`\`bash
npm install project-name
\`\`\`

\`\`\`javascript
// 5 lines that show immediate value
\`\`\`

## Installation

[Detailed installation for all platforms]

## Usage

[Core usage patterns with examples]

## Documentation

[Link to full docs]

## Contributing

We love contributions! See [CONTRIBUTING.md](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/open-source-marketing/CONTRIBUTING.md).

## License

[License type] - see [LICENSE](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/open-source-marketing/LICENSE)
```

### README Checklist

| Element | Why It Matters |
|---------|---------------|
| **Clear name** | Memorable, searchable, spellable |
| **One-liner** | "A [type] for [audience] that [does what]" |
| **Badges** | Social proof, health signals |
| **Visual** | GIF > Screenshot > Nothing |
| **Quick start** | <5 lines to first value |
| **Why this?** | Differentiation from alternatives |
| **Installation** | All platforms, copy-paste |
| **Examples** | Real use cases, not contrived |
| **Docs link** | More detail available |
| **Contributing** | Community welcome |

### Repository Optimization

| Element | Best Practice |
|---------|--------------|
| **Description** | 100 chars max, keyword-rich |
| **Topics** | 5-10 relevant tags for discoverability |
| **Website** | Link to docs or landing page |
| **Releases** | Semantic versioning, changelogs |
| **Issues** | Templates for bugs/features |
| **Discussions** | Enable for community Q&A |
| **Sponsors** | Enable if you want funding |

### Issue & PR Templates

**Bug report template:**

```markdown
---
name: Bug Report
about: Report a bug to help us improve
---

## Bug Description
[Clear description]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS:
- Node version:
- Package version:

## Additional Context
[Screenshots, logs, etc.]
```

**Feature request template:**

```markdown
---
name: Feature Request
about: Suggest an idea for this project
---

## Problem
[What problem does this solve?]

## Proposed Solution
[How would you like it to work?]

## Alternatives Considered
[Other approaches you've thought about]

## Additional Context
[Examples, mockups, etc.]
```

---

## Community Building

### Community Spaces

| Platform | Best For | Setup Effort |
|----------|----------|--------------|
| **GitHub Discussions** | Q&A, announcements | Low |
| **Discord** | Real-time chat, community feel | Medium |
| **Slack** | Enterprise communities | Medium |
| **Forum (Discourse)** | Async, searchable discussions | High |

Start with GitHub Discussions. Add Discord when you have 50+ active users.

### Community Principles

| Principle | Implementation |
|-----------|----------------|
| **Be responsive** | Respond to issues within 48 hours (even if just "looking into it") |
| **Celebrate contributions** | Thank every contributor publicly |
| **Be transparent** | Share roadmap, explain decisions |
| **Set expectations** | Clear SLA for maintainer response |
| **Welcome newcomers** | "good first issue" labels, mentorship |

### Contributor Funnel

```
User → Star → Issue → PR → Regular Contributor → Maintainer
```

Optimize each transition:

| Transition | How to Improve |
|------------|----------------|
| User → Star | Great README, visible value |
| Star → Issue | Clear issue templates, welcoming tone |
| Issue → PR | "good first issue" labels, CONTRIBUTING.md |
| PR → Regular | Quick review, encouraging feedback |
| Regular → Maintainer | Trust, shared ownership |

---

## Contributor Experience

### CONTRIBUTING.md Essentials

```markdown
# Contributing to [Project]

First off, thanks for considering contributing! ❤️

## Quick Start

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b my-feature`
5. Make your changes
6. Run tests: `npm test`
7. Commit: `git commit -m "Add my feature"`
8. Push: `git push origin my-feature`
9. Open a Pull Request

## Development Setup

[Detailed setup instructions]

## Code Style

- We use [Prettier/ESLint config]
- Run `npm run lint` before committing
- [Other conventions]

## Commit Messages

We follow [Conventional Commits](https://conventionalcommits.org/):
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update readme`
- `chore: update dependencies`

## Pull Request Process

1. Update docs if needed
2. Add tests for new features
3. Ensure CI passes
4. Get one approval

## Good First Issues

Look for issues labeled `good first issue` — these are great starting points!

## Questions?

Open a Discussion or reach out on Discord.
```

### "Good First Issue" Strategy

Create genuinely approachable issues:

| Good | Not Good |
|------|----------|
| "Add TypeScript types for X function" | "Refactor the entire codebase" |
| "Fix typo in README" | "Performance optimization" |
| "Add test for Y method" | "Debug intermittent CI failure" |
| "Update dependency Z" | "Implement feature from RFC" |

For each good first issue:
- Explain context and why it matters
- Link to relevant code files
- Describe expected outcome
- Offer to help in comments

---

## Launch Strategies

### Pre-Launch Checklist

| Task | Done? |
|------|-------|
| README polished | ☐ |
| Quick start works | ☐ |
| Docs exist | ☐ |
| 3+ examples/demos | ☐ |
| Tests passing | ☐ |
| License chosen | ☐ |
| CONTRIBUTING.md | ☐ |
| Issue templates | ☐ |
| Social preview image | ☐ |
| 5-10 GitHub topics | ☐ |

### Launch Day Playbook

**Timeline:**

| Time | Action |
|------|--------|
| **Day before** | Final README review, prep all posts |
| **Launch morning** | HN post (best: 6-8am PT, Tuesday-Thursday) |
| **+1 hour** | Twitter thread |
| **+2 hours** | Reddit post to relevant subreddits |
| **Throughout day** | Respond to all comments/questions |
| **End of day** | Thank everyone, share metrics |

### Platform-Specific Tactics

**Hacker News:**
- Title: Descriptive, no hype ("Show HN: X — a Y for Z")
- First comment: Explain motivation, tech decisions
- Be available to respond for hours
- Don't ask for upvotes (instant death)

**Reddit:**
- Find 2-3 relevant subreddits (not just r/programming)
- Read the rules first
- Be a community member, not a marketer
- Share genuinely useful context

**Twitter/X:**
- Thread format: Problem → Solution → Demo → Link
- Include GIF/video
- Tag relevant accounts (framework authors, etc.)
- Share builds-in-public journey

**Dev.to / Hashnode:**
- Write a "Why I Built This" article
- Technical depth, personal story
- Cross-post from your blog

### Post-Launch

| Week | Focus |
|------|-------|
| **Week 1** | Respond to all feedback, fix bugs |
| **Week 2** | Blog post: "What I learned from launch" |
| **Week 3** | Start regular updates, ship new feature |
| **Month 1** | Community building, contributor docs |
| **Ongoing** | Consistent presence, regular releases |

---

## Sustainable Growth

### Growth Tactics

| Tactic | Effort | Impact | Timeline |
|--------|--------|--------|----------|
| **SEO-optimized docs** | Medium | High | 3-6 months |
| **Integration tutorials** | Medium | High | 1-2 months |
| **Conference talks** | High | Medium | 3-6 months |
| **Comparison content** | Low | Medium | 1-2 months |
| **Guest blog posts** | Medium | Medium | 1-2 months |
| **Newsletter features** | Low | Low-Medium | 2-4 weeks |
| **Twitter presence** | Medium | Medium | Ongoing |

### Content Strategy for OSS

| Content Type | Purpose |
|--------------|---------|
| **"Why we built X"** | Launch story, motivation |
| **"X vs Y vs Z"** | Capture comparison searches |
| **"Migrating from Y to X"** | Convert competitor users |
| **"X + [Popular Tool]"** | Capture integration searches |
| **"How We Use X at [Company]"** | Social proof, real use case |
| **"X Performance Benchmarks"** | Technical credibility |

### Avoiding Burnout

| Risk | Mitigation |
|------|------------|
| **Overwhelming issues** | Set response SLA expectations |
| **Feature demands** | Public roadmap, RFC process |
| **Solo maintenance** | Actively recruit co-maintainers |
| **Always-on pressure** | Scheduled "office hours" vs. 24/7 |
| **Negative feedback** | Code of conduct, moderation |

---

## Metrics That Matter

### Vanity vs. Value

| Vanity Metric | Value Metric |
|---------------|--------------|
| Stars | Active issues + PRs |
| Forks | Returned contributors |
| Downloads | Weekly active users |
| Twitter followers | Community engagement |

### What to Track

| Metric | Where to Find It |
|--------|------------------|
| **Stars over time** | GitHub Insights, Star History |
| **Clones** | GitHub Traffic |
| **Referrers** | GitHub Traffic |
| **npm downloads** | npm-stat.com |
| **Community size** | Discord/Slack member count |
| **Contributor count** | GitHub Insights |
| **Issue response time** | Manual tracking |

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor mentions of your project across GitHub, HN, Reddit, Twitter, and Stack Overflow. Track competitor projects. Find contributors asking questions. |
| **Star History** | Track star growth over time |
| **npm-stat** | Download statistics |
| **GitHub Traffic** | Views, clones, referrers |
| **Shield.io** | Dynamic badges |
| **All Contributors** | Recognize all contributors |
| **Probot** | Automate GitHub workflows |

---

## Related Skills

- `developer-audience-context` — Know who your users are
- `community-building` — Build Discord/Slack community
- `devrel-content` — Create supporting content
- `developer-advocacy` — Conference talks, podcasts
- `hacker-news-strategy` — Launch and engage on HN

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
