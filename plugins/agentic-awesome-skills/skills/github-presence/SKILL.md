---
name: github-presence
description: When the user wants to optimize their GitHub profile, README, or project discoverability. Trigger phrases include "GitHub README," "README optimization," "GitHub profile," "GitHub stars," "GitHub discoverability," "awesome lists," or "GitHub marketing."
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# GitHub Presence
## When to Use

Use this skill when you need when the user wants to optimize their GitHub profile, README, or project discoverability. Trigger phrases include "GitHub README," "README optimization," "GitHub profile," "GitHub stars," "GitHub discoverability," "awesome lists," or "GitHub marketing.".


GitHub is where developers evaluate your project before trying it. This skill covers README optimization, profile READMEs, discoverability through topics and awesome lists, and using GitHub features for marketing.

---

## Before You Start

1. Read `.agents/developer-audience-context.md` if it exists
2. Audit your current GitHub presence (profile, pinned repos, READMEs)
3. Understand: GitHub is often the first technical evaluation — optimize accordingly

---

## README Structure

### The Anatomy of a Great README

| Section | Purpose | Required? |
|---------|---------|-----------|
| **Logo/Banner** | Brand recognition, visual appeal | Recommended |
| **Badges** | Quick trust signals, status | Recommended |
| **One-liner** | What it does in one sentence | Required |
| **Hero example** | Immediate "what does it look like?" | Highly recommended |
| **Features** | Why use this over alternatives | Required |
| **Quick start** | Get running in < 2 minutes | Required |
| **Installation** | All installation methods | Required |
| **Usage** | Core usage examples | Required |
| **Documentation** | Link to full docs | Required |
| **Contributing** | How to contribute | Recommended |
| **License** | Legal clarity | Required |

### README Template

```markdown
<div align="center">
  <img src="logo.svg" alt="Project Name" width="200">
  <h1>Project Name</h1>
  <p><strong>One compelling sentence explaining what this does.</strong></p>

  <!-- Badges -->
  <a href="https://github.com/org/repo/actions"><img src="https://github.com/org/repo/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/name"><img src="https://img.shields.io/npm/v/name.svg" alt="npm version"></a>
  <a href="https://github.com/org/repo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://discord.gg/invite"><img src="https://img.shields.io/discord/123456789" alt="Discord"></a>

  <br>
  <br>

  <a href="https://docs.example.com">Documentation</a> •
  <a href="https://example.com">Website</a> •
  <a href="https://discord.gg/invite">Discord</a>
</div>

---

## Why Project Name?

- **Feature 1** — Brief explanation
- **Feature 2** — Brief explanation
- **Feature 3** — Brief explanation

## Quick Start

```bash
npm install project-name
```

```javascript
import { thing } from 'project-name';

const result = thing.doSomething();
console.log(result);
```

## Installation

### npm
```bash
npm install project-name
```

### yarn
```bash
yarn add project-name
```

### pnpm
```bash
pnpm add project-name
```

## Usage

### Basic Example

```javascript
// Code example with comments
```

### Advanced Example

```javascript
// More complex example
```

## Documentation

Full documentation available at [docs.example.com](https://docs.example.com)

- [Getting Started](https://docs.example.com/getting-started)
- [API Reference](https://docs.example.com/api)
- [Examples](https://docs.example.com/examples)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence/CONTRIBUTING.md) for details.

## License

MIT © [Your Name](https://yoursite.com)
```

---

## Badges That Matter

### Trust Signal Badges

| Badge | What it shows | When to use |
|-------|--------------|-------------|
| CI/Build status | Code quality | Always |
| Version | Latest release | Always for packages |
| License | Legal clarity | Always |
| Downloads/installs | Adoption | When impressive |
| Coverage | Test quality | If > 70% |
| Security | Audit status | If you have it |

### Community Badges

| Badge | Source | Purpose |
|-------|--------|---------|
| Discord members | shields.io | Show active community |
| GitHub stars | shields.io | Social proof |
| Contributors | shields.io | Open source health |
| Last commit | shields.io | Project activity |

### Badge Services

| Service | URL | Best for |
|---------|-----|----------|
| Shields.io | shields.io | Most badges |
| Badgen | badgen.net | Fast, minimal |
| GitHub badges | Native | Actions, issues |

### Badge Examples

```markdown
<!-- Build status -->
![CI](https://github.com/org/repo/workflows/CI/badge.svg)

<!-- npm version -->
[![npm](https://img.shields.io/npm/v/package-name.svg)](https://www.npmjs.com/package/package-name)

<!-- Downloads -->
[![Downloads](https://img.shields.io/npm/dm/package-name.svg)](https://www.npmjs.com/package/package-name)

<!-- License -->
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<!-- Discord -->
[![Discord](https://img.shields.io/discord/SERVER_ID?color=7289da&logo=discord&logoColor=white)](https://discord.gg/invite)

<!-- Stars -->
[![GitHub stars](https://img.shields.io/github/stars/org/repo?style=social)](https://github.com/org/repo)
```

---

## Profile README

### Setting Up Profile README

1. Create a repository with your username (e.g., `github.com/yourname/yourname`)
2. Add a `README.md` file
3. This displays on your profile page

### Profile README Structure

```markdown
# Hi, I'm [Name] 👋

[One sentence about what you do]

## What I'm Working On

- 🔭 Building [project] — [brief description]
- 🌱 Learning [technology]
- 💬 Ask me about [expertise areas]

## Projects

| Project | Description | Stars |
|---------|-------------|-------|
| [Project 1](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence/link) | Brief description | ![Stars](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence/badge) |
| [Project 2](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence/link) | Brief description | ![Stars](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/github-presence/badge) |

## Recent Blog Posts

<!-- BLOG-POST-LIST:START -->
<!-- Automated with GitHub Actions -->
<!-- BLOG-POST-LIST:END -->

## Connect

[![Twitter](https://img.shields.io/badge/-Twitter-1DA1F2?style=flat&logo=twitter&logoColor=white)](https://twitter.com/handle)
[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/handle)

## GitHub Stats

![Your GitHub stats](https://github-readme-stats.vercel.app/api?username=yourusername&show_icons=true)
```

### Profile README Best Practices

| Do | Don't |
|----|-------|
| Keep it scannable | Write paragraphs |
| Show your best projects | List everything |
| Include current work | Let it get stale |
| Add contact methods | Make it hard to reach you |
| Show personality | Be generic |

---

## Discoverability

### GitHub Topics

Topics are how people find repositories. Optimize for search.

| Topic strategy | Example |
|----------------|---------|
| Technology | `javascript`, `rust`, `python` |
| Framework | `react`, `nextjs`, `django` |
| Use case | `cli`, `api`, `testing` |
| Category | `developer-tools`, `devops` |
| Problem | `authentication`, `caching` |

**Add topics**: Repository settings → Topics (up to 20)

### Search Optimization

GitHub search considers:
1. **Repository name** — Include main keyword
2. **Description** — 350 chars, keyword-rich
3. **README content** — Full text indexed
4. **Topics** — Category matching
5. **Language** — Auto-detected

### Awesome Lists

Getting on awesome lists drives traffic and credibility.

| Step | Action |
|------|--------|
| 1 | Find relevant awesome lists (search "awesome + [topic]") |
| 2 | Check list requirements (quality, activity, docs) |
| 3 | Ensure your project meets criteria |
| 4 | Submit PR following list's guidelines |
| 5 | Be patient — curation takes time |

**Popular awesome lists for dev tools**:
- `awesome-cli-apps`
- `awesome-selfhosted`
- `awesome-nodejs`
- `awesome-python`
- `awesome-go`
- `awesome-rust`
- `awesome-devops`

---

## GitHub Actions for Marketing

### Automated README Updates

```yaml
# .github/workflows/readme-update.yml
name: Update README

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Example: Update blog post list
      - uses: gautamkrishnar/blog-post-workflow@master
        with:
          feed_list: "https://yourblog.com/feed"

      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add -A
          git diff --quiet && git diff --staged --quiet || git commit -m "Update README"
          git push
```

### Metrics and Stats

```yaml
# Auto-update GitHub stats image
- uses: lowlighter/metrics@latest
  with:
    token: ${{ secrets.METRICS_TOKEN }}
    filename: github-metrics.svg
```

### Release Announcements

```yaml
# Tweet on new release
name: Release Announcement
on:
  release:
    types: [published]

jobs:
  announce:
    runs-on: ubuntu-latest
    steps:
      - name: Tweet
        uses: ethomson/send-tweet-action@v1
        with:
          status: "🚀 ${{ github.repository }} ${{ github.event.release.tag_name }} released! ${{ github.event.release.html_url }}"
          consumer-key: ${{ secrets.TWITTER_CONSUMER_KEY }}
          # ... other secrets
```

---

## GitHub Sponsors

### Setting Up Sponsors

1. Join GitHub Sponsors (github.com/sponsors)
2. Create compelling tier descriptions
3. Set up funding.yml in repos

**funding.yml example**:
```yaml
github: [yourusername]
patreon: yourpatreon
open_collective: yourproject
ko_fi: yourkofi
custom: ["https://buymeacoffee.com/you"]
```

### Sponsor Tiers That Work

| Tier | Price | Offer |
|------|-------|-------|
| **Supporter** | $5/mo | Thanks + name in README |
| **Backer** | $15/mo | Logo in README + Discord role |
| **Sponsor** | $50/mo | Priority support + feature voting |
| **Enterprise** | $200+/mo | Dedicated support + consultation |

---

## Platform-Specific Do's and Don'ts

### Do's

1. **Do** optimize your README for first impression
2. **Do** use badges for quick trust signals
3. **Do** add relevant topics (up to 20)
4. **Do** keep your profile README current
5. **Do** respond to issues and PRs promptly
6. **Do** pin your best repositories
7. **Do** include clear installation instructions
8. **Do** submit to relevant awesome lists

### Don'ts

1. **Don't** neglect the README — it's your landing page
2. **Don't** use too many badges (cluttered)
3. **Don't** let issues pile up unanswered
4. **Don't** forget a license file
5. **Don't** use low-quality or broken images
6. **Don't** write walls of text without structure
7. **Don't** ignore contribution guidelines

---

## Measuring Success

### GitHub Metrics to Track

| Metric | What it tells you | Goal |
|--------|-------------------|------|
| Stars | Interest/bookmarks | Growth over time |
| Forks | Active usage | Quality > quantity |
| Clones | People trying it | Pre-install interest |
| Traffic | Profile/repo views | Awareness |
| Referrers | Where traffic comes from | Channel effectiveness |
| Contributors | Community health | Sustainable project |

### Traffic Insights

Access via: Repository → Insights → Traffic

- Views and unique visitors
- Popular content (which files)
- Referring sites
- Clone activity

---

## Tools

| Tool | Use case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor GitHub for mentions of your project, competitors, and relevant discussions. Get alerts when people talk about problems you solve. |
| **Shields.io** | Generate status badges |
| **GitHub Readme Stats** | Dynamic stats for profile |
| **Carbon** | Beautiful code screenshots |
| **readme.so** | README generator |
| **Metrics** | Advanced profile stats |

---

## README Audit Checklist

- [ ] Clear, keyword-rich name and description
- [ ] Badges show CI status, version, license
- [ ] One-liner explains what it does
- [ ] Quick start gets users running in < 2 min
- [ ] Code examples are copy-pasteable
- [ ] All links work and are HTTPS
- [ ] Images have alt text
- [ ] Mobile-readable formatting
- [ ] License file present
- [ ] Contributing guidelines exist
- [ ] Topics are set (up to 20)
- [ ] Social preview image uploaded

---

## Related Skills

- `developer-audience-context` — Know who evaluates your repo
- `hacker-news-strategy` — HN users check GitHub before upvoting
- `reddit-engagement` — Redditors evaluate via GitHub
- `dev-to-hashnode` — Link from README to content

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
