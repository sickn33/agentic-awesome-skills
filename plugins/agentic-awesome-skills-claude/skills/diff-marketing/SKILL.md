---
name: "diff-marketing"
description: "Turn verified shipped Git changes into customer-facing launch drafts for blogs, newsletters, social posts and documentation."
category: "marketing"
risk: "safe"
source: "https://github.com/Illyism/seo-skills"
source_repo: "Illyism/seo-skills"
source_type: "community"
license: "MIT"
license_source: "https://github.com/Illyism/seo-skills/blob/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/README.md#license"
author: "Ilias Ism"
upstream_commit: "a158c36a1c2c84a44ee7a1ae69c009caf73e1a35"
date_added: "2026-11-21"
---

# Diff marketing

Generate content suggestions from recent code changes, commits, merged pull requests, and shipped features.

## When to Use

Use after a release when a verified version range or merged PR list should become coordinated customer-facing drafts.

## Process

1. Analyze recent changes:
   - Prefer the release tag range supplied by the user. For a weekly digest, use:
     `git log --since="1 week ago" --pretty=format:"%h - %s (%an, %ar)"`
   - Check merged PRs and their descriptions. Verify that each item shipped to the intended audience and flag uncertain rollout status.
   - Review relevant files at the selected revisions and record the commit or PR behind each customer-facing claim.
   - Identify new features, bug fixes, improvements, and refactors.

2. Categorize changes by impact:
   - High impact: new features, major improvements, breaking changes.
   - Medium impact: enhancements, notable bug fixes, performance improvements.
   - Low impact: minor fixes, refactors, dependency updates.

3. Read relevant files to understand the user-facing change before writing.

4. Generate specific content suggestions with drafts, prioritizing user value,
   SEO opportunities, and useful distribution channels.

## Content suggestions by type

### Blog posts

For high-impact changes:

- Focus on features that solve user problems.
- Include the problem, solution, benefits, screenshots or demos, and code examples when useful.
- Use an educational, in-depth, SEO-optimized angle.
- Aim for 800–2,000 words.
- Possible angles:
  - "Introducing [Feature]: How We Built..."
  - "How [Feature] Helps You..."
  - "Behind the Scenes: Building [Feature]"

### Tweets and social media

Use all impact levels for:

- Launch posts that explain the benefit and include a visual.
- Threads that break down complex features.
- Tip posts with a quick, useful takeaway.
- Behind-the-scenes posts about decisions and tradeoffs.

Keep the tone conversational, concise, and specific. Include emojis,
hashtags, mentions, links, and visuals when they add value. Treat a meaningful
release as a launch opportunity and suggest a way to gather early feedback.

### Changelog updates

- Structure entries as `## [Version] - [Date]`.
- Use Added, Changed, Fixed, Deprecated, Removed, and Security categories as applicable.
- Write in user-facing language.
- Link to documentation or blog posts for major features.
- Keep the writing technical but accessible.

### Email updates

For medium- and high-impact changes, suggest newsletters, feature
announcements, or onboarding updates.

- Include a hero image, brief introduction, feature highlights, and CTA when appropriate.
- Use a personal, benefit-focused, actionable tone.

### Press releases

Suggest these only for major launches, milestones, partnerships, or funding.
Include a headline, summary, approved quotes, boilerplate, and public press contact. Use a
professional, newsworthy, quotable tone.

### Documentation

Suggest updates to:

- Getting-started guides.
- Feature documentation.
- API references.
- Code examples and use cases.
- Troubleshooting sections.

### Video content

For high-impact changes, suggest demos, tutorial walkthroughs, release
overviews, or development diaries.

## Content strategy

1. Repurpose a blog post into a thread, newsletter, and documentation update.
2. Coordinate content with the release.
3. Lead with user benefits.
4. Show the product with screenshots, GIFs, or videos.
5. Include keywords, meta descriptions, and alt text where relevant.
6. Give every piece a clear next step.
7. Cross-link related content.
8. Suggest how to collect feedback and measure response.

## Output format

Use this structure:

```markdown
## Week of [Date Range]

### Summary

[High-level overview of what shipped]

### High impact changes

- [Change 1]: [Description]
- [Change 2]: [Description]

### Medium impact changes

- [Change]: [Description]

### Low impact changes

- [Change]: [Description]

### Content suggestions

#### Blog posts

1. **"[Title]"**: [Brief description, key points, and target audience]
2. **"[Title]"**: [Brief description, key points, and target audience]

#### Tweets and threads

1. Launch post: [Draft text with emojis when appropriate]
2. Thread idea: [Topic and key points]
3. Tip: [Quick value post]

#### Changelog entry

## [Version] - [Date]

### Added

- [Feature]: [User-facing description]

### Fixed

- [Bug]: [What was fixed]

#### Email subject lines

- "[Compelling subject line option 1]"
- "[Compelling subject line option 2]"

#### Video ideas

- "[Video concept and key points to cover]"

#### Documentation updates needed

- [ ] Update [doc page] with [new information]
- [ ] Add [new guide] for [feature]
```

## Writing standards

- Use customer-centric messaging.
- Say what shipped and what it does. Do not invent metrics, customer results, or product behavior.
- Use diff output and relevant source files to ground every claim.
- Prefer plain language over hype.
- Avoid generic launch copy, unsupported superlatives, and vague claims.
- Use sentence-case headings and varied, natural prose.
- Keep emojis functional and sparse.
- End with the most useful next action for the reader.

## Example

For a release with CSV export and an internal dependency upgrade, tie the newsletter and launch post to the export PR and explain what users can do with the exported report. Keep the dependency upgrade in internal notes unless it has a verified customer impact.

## Limitations

A merge does not establish deployment or account availability. Keep embargoed changes, private commit details, and credentials out of drafts. Publication and sending require separate authorization.

Adapted from [Ilias Ism’s upstream skill](https://github.com/Illyism/seo-skills/tree/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/marketing/diff-marketing).
