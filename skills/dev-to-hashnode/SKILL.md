---
name: dev-to-hashnode
description: When the user wants to publish on Dev.to, Hashnode, or other developer blogging platforms. Trigger phrases include "Dev.to," "Hashnode," "developer blog," "cross-posting," "technical blogging," "canonical URL," or "developer content platform."
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/dev-to-hashnode
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Dev.to & Hashnode Publishing
## When to Use

Use this skill when you need when the user wants to publish on Dev.to, Hashnode, or other developer blogging platforms. Trigger phrases include "Dev.to," "Hashnode," "developer blog," "cross-posting," "technical blogging," "canonical URL," or "developer content platform.".


Developer blogging platforms offer built-in audiences of hundreds of thousands of developers. This skill covers cross-posting strategy, platform-specific optimization, and building followers on Dev.to and Hashnode.

---

## Before You Start

1. Read `.agents/developer-audience-context.md` if it exists
2. Decide your canonical URL strategy (important for SEO)
3. Create accounts on both platforms to reserve your username
4. Understand: These platforms reward consistency and engagement

---

## Platform Comparison

### Dev.to vs Hashnode

| Feature | Dev.to | Hashnode |
|---------|--------|----------|
| Monthly visitors | ~10M+ | ~3M+ |
| Custom domain | No (subdomain only) | Yes (free) |
| Canonical URL support | Yes | Yes |
| SEO benefits | High domain authority | Your domain gets SEO |
| Monetization | No native | Sponsors, newsletter |
| Newsletter | No | Built-in |
| Series support | Yes | Yes |
| Code highlighting | Excellent | Excellent |
| Community features | Strong (reactions, comments) | Growing |
| Audience | Broader, more beginners | More senior, focused |

### When to Use Each

| Use Dev.to when | Use Hashnode when |
|-----------------|-------------------|
| Maximum reach is priority | Building your own brand |
| Targeting beginners/mid-level | Want custom domain SEO |
| Community engagement matters | Building email list |
| Quick validation of content | Long-term content strategy |
| Don't have your own blog | Supplementing your main blog |

---

## Cross-Posting Strategy

### The Canonical URL Decision

| Strategy | Pros | Cons |
|----------|------|------|
| **Original on your blog** | SEO to your domain, full control | Platforms may rank lower |
| **Original on Dev.to** | Maximum initial reach | No SEO to your domain |
| **Original on Hashnode (custom domain)** | SEO + platform reach | Smaller initial audience |

### Best Practice: Your Blog + Cross-Post

1. **Publish on your blog first** — This is canonical
2. **Wait 1-2 days** — Let Google index your original
3. **Cross-post to Dev.to** — Set canonical URL to your blog
4. **Cross-post to Hashnode** — Set canonical URL to your blog

### Setting Canonical URLs

**Dev.to** (in frontmatter):
```yaml
---
title: Your Title
canonical_url: https://yourblog.com/your-post
---
```

**Hashnode** (in editor):
- Click "Article settings" gear icon
- Paste original URL in "Canonical URL" field

---

## Dev.to Optimization

### Frontmatter Structure

```yaml
---
title: "Specific, Keyword-Rich Title (Not Clickbait)"
published: true
description: "One compelling sentence that shows up in previews and SEO"
tags: javascript, webdev, tutorial, beginners
cover_image: https://your-cdn.com/image.png
canonical_url: https://yourblog.com/original-post
series: "Building a CLI from Scratch"
---
```

### Tag Strategy

| Tag | Followers | Use for |
|-----|-----------|---------|
| #javascript | 200K+ | JS content |
| #webdev | 150K+ | General web development |
| #beginners | 120K+ | Accessible content |
| #tutorial | 100K+ | Step-by-step guides |
| #react | 80K+ | React specific |
| #programming | 80K+ | General programming |
| #python | 70K+ | Python content |
| #devops | 50K+ | DevOps, CI/CD |
| #opensource | 40K+ | OSS projects |
| #productivity | 40K+ | Dev tools, workflows |

**Rules**:
- Maximum 4 tags per post
- First tag is primary (appears in URL)
- Check tag follower count before using

### What Performs on Dev.to

| Content type | Performance | Notes |
|--------------|-------------|-------|
| Beginner tutorials | High | Largest audience segment |
| Listicles ("10 tools...") | High | Easy to consume |
| Career advice | High | Aspirational content |
| Hot takes | Medium-high | Controversial drives engagement |
| Deep technical | Medium | Niche but engaged audience |
| Project showcases | Medium | Best with story behind it |
| News/updates | Low | Competes with official sources |

### Dev.to Engagement Features

| Feature | How to use |
|---------|------------|
| **Reactions** | Heart, unicorn, saved, fire — different meanings |
| **Comments** | Reply to every comment for algorithm boost |
| **Series** | Group related posts, drives binge reading |
| **Discussion** | Tag #discuss for opinion/question posts |
| **Listings** | Post jobs, events, products |

---

## Hashnode Optimization

### Article Settings

| Setting | Recommendation |
|---------|----------------|
| **Subtitle** | Use for SEO keywords |
| **Cover image** | 1600x840 optimal size |
| **SEO title** | Can differ from article title |
| **SEO description** | 155 characters max |
| **Canonical URL** | Your original if cross-posting |
| **Enable table of contents** | Yes for long posts |
| **Disable comments** | No — engagement helps |

### Tag Strategy

Hashnode tags work differently:
- Tags are linked to global topics
- Some tags have dedicated feeds
- Fewer tags, more focused

**Popular Hashnode tags**:
- `javascript`, `web-development`, `react`
- `devops`, `cloud`, `aws`
- `beginners`, `tutorial`
- `opensource`, `programming`

### What Performs on Hashnode

| Content type | Performance | Notes |
|--------------|-------------|-------|
| In-depth tutorials | High | Audience expects depth |
| Architecture posts | High | More senior audience |
| DevOps/cloud content | High | Strong niche presence |
| Career stories | Medium-high | Personal narratives work |
| Quick tips | Medium | Less than on Dev.to |
| Listicles | Medium | Less effective here |

### Hashnode-Specific Features

| Feature | How to use |
|---------|------------|
| **Newsletter** | Enable to collect subscribers |
| **Series** | Great for tutorials, courses |
| **Custom CSS** | Style your blog uniquely |
| **Widgets** | Add GitHub, newsletter CTAs |
| **Sponsors** | Hashnode has sponsor program |
| **Analytics** | Built-in, more detailed than Dev.to |

---

## Content Formatting

### Structure That Works

```markdown
# Title

[Compelling hook — why should they care?]

## Table of Contents (for long posts)
- [Section 1](#section-1)
- [Section 2](#section-2)

## The Problem

[What pain point are you solving?]

## The Solution

[Your approach, with code examples]

### Code Example

```language
// Well-commented code
const example = "explained";
```

## Step-by-Step

1. **Step one** — Explanation
2. **Step two** — Explanation
3. **Step three** — Explanation

## Common Pitfalls

[What to watch out for]

## Conclusion

[Summary + CTA]

---

*If you found this helpful, [follow me](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/dev-to-hashnode/link) for more content about [topic].*
```

### Formatting Best Practices

| Element | Guideline |
|---------|-----------|
| **Headers** | Use H2 for sections, H3 for subsections |
| **Code blocks** | Always specify language for syntax highlighting |
| **Images** | Use descriptive alt text, compress for speed |
| **Links** | Descriptive text, not "click here" |
| **Length** | 1000-2500 words performs best |
| **Paragraphs** | Keep short, 2-3 sentences max |
| **Lists** | Use liberally for scannability |

---

## Building Followers

### Consistency Strategy

| Frequency | Result |
|-----------|--------|
| 4+ posts/month | Rapid follower growth |
| 2-3 posts/month | Steady growth |
| 1 post/month | Slow but sustainable |
| Sporadic | Minimal follower retention |

### Engagement Tactics

| Tactic | Why it works |
|--------|--------------|
| Reply to every comment | Algorithm boost + relationship building |
| Comment on others' posts | Visibility + community |
| Follow relevant authors | Often reciprocated |
| Share on social media | Drives external traffic |
| Link between your posts | Keeps readers on your content |
| Create series | Encourages following for updates |

### Bio and Profile Optimization

**Dev.to profile**:
- Clear profile photo
- Bio with what you write about
- Link to your main site
- List your expertise areas

**Hashnode profile**:
- Custom domain setup
- Newsletter enabled
- Social links populated
- Blog name and tagline set

---

## Platform-Specific Do's and Don'ts

### Do's

1. **Do** set canonical URLs to protect your SEO
2. **Do** use platform-specific formatting (embeds, etc.)
3. **Do** engage with comments within 24 hours
4. **Do** cross-post to both platforms
5. **Do** use series for related content
6. **Do** optimize cover images for each platform
7. **Do** include a CTA at the end

### Don'ts

1. **Don't** post identical content without canonical URLs
2. **Don't** ignore comments
3. **Don't** use only self-promotional content
4. **Don't** neglect tags — they're discovery mechanisms
5. **Don't** forget mobile readability
6. **Don't** publish unfinished drafts
7. **Don't** keyword stuff your content

---

## Analytics and Iteration

### Dev.to Dashboard

| Metric | What it tells you |
|--------|-------------------|
| Views | Reach/impressions |
| Reactions | Engagement quality |
| Comments | Discussion value |
| Reading time | Content depth |
| Followers from post | Conversion rate |

### Hashnode Analytics

| Metric | What it tells you |
|--------|-------------------|
| Total views | Reach |
| Unique visitors | Audience size |
| Read ratio | Completion rate |
| Time on page | Engagement depth |
| Referrers | Traffic sources |
| Newsletter signups | List growth |

### What to Optimize

| Low metric | Try this |
|------------|----------|
| Low views | Better title, different tags |
| Low reactions | More engaging opening |
| Low comments | End with a question |
| High bounce | Better structure, hook |
| Low followers | Stronger CTA, series |

---

## Tools

| Tool | Use case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor Dev.to and Hashnode for mentions of your topic, competitors, and trends. Find popular content to learn from. |
| **Hemingway Editor** | Improve readability |
| **Carbon** | Beautiful code screenshots |
| **Unsplash** | Free cover images |
| **Canva** | Custom cover image design |
| **Grammarly** | Catch errors before publishing |

---

## Content Calendar Template

| Week | Dev.to | Hashnode | Topic |
|------|--------|----------|-------|
| 1 | Publish | Cross-post (day 2) | Tutorial |
| 2 | Cross-post | Publish | Deep dive |
| 3 | Publish | Cross-post (day 2) | Listicle |
| 4 | Cross-post | Publish | Opinion/experience |

---

## Related Skills

- `developer-audience-context` — Know who you're writing for
- `hacker-news-strategy` — Drive traffic from HN to your posts
- `reddit-engagement` — Share posts in relevant subreddits
- `github-presence` — Link from READMEs to your content
- `x-devs` — Promote posts on Twitter/X

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
