---
name: devrel-content
description: When the user wants to create technical content for developers including blog posts, tutorials, and documentation. Trigger phrases include "write a blog post," "technical article," "developer content," "tutorial," "devrel content," "dev blog," "technical writing," or "content for...
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/devrel-content
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# DevRel Content
## When to Use

Use this skill when you need when the user wants to create technical content for developers including blog posts, tutorials, and documentation. Trigger phrases include "write a blog post," "technical article," "developer content," "tutorial," "devrel content," "dev blog," "technical writing," or "content for...


This skill helps you create technical content that developers actually read: blog posts, tutorials, documentation, and thought leadership pieces that build trust and drive adoption.

---

## Before You Start

**Load your audience context first.** Read `.agents/developer-audience-context.md` to understand:

- Who you're writing for (role, seniority, tech stack)
- Their pain points (what problems resonate)
- Verbatim language (how they describe things)
- Voice & tone (how formal/technical to be)

If the context file doesn't exist, run the `developer-audience-context` skill first.

---

## The DevRel Content Framework

### Phase 1: Research & Validation

Before writing anything, validate the topic is worth writing about.

| Research Type | What to Do |
|--------------|------------|
| **Search intent** | Google your topic. What already ranks? What's missing? |
| **Community signals** | Search Reddit, HN, Stack Overflow. Are developers asking about this? |
| **Competitor gaps** | What have competitors written? What haven't they covered? |
| **Internal data** | Support tickets, Discord questions, GitHub issues about this topic |
| **Keyword research** | Use Ahrefs/SEMrush for search volume on technical terms |

**Red flags** — Don't write if:
- You're the only one who cares about this topic
- 10 identical articles already exist
- The topic is too broad ("Introduction to JavaScript")
- The topic is too narrow (no search volume, no community interest)

### Phase 2: Content Type Selection

Choose the right format for your goal:

| Content Type | Best For | Structure |
|-------------|----------|-----------|
| **Tutorial** | Teaching a specific skill | Step-by-step, code-heavy |
| **Guide** | Covering a topic comprehensively | Sections, reference material |
| **Comparison** | Helping with decisions | Table-based, pros/cons |
| **Announcement** | Launching features/products | News lead, what/why/how |
| **Thought leadership** | Building authority | Opinion, predictions, takes |
| **Case study** | Social proof | Problem → Solution → Results |
| **Troubleshooting** | Solving specific errors | Error → Cause → Fix |

### Phase 3: Outline Structure

Use this outline template:

```markdown
# [Title that promises specific value]

## Hook (2-3 sentences)
- State the problem or opportunity
- Establish credibility ("We migrated 10,000 repos...")
- Promise what the reader will learn

## Context (optional)
- Brief background if needed
- Link to prerequisites

## The Meat
### Section 1: [First major concept]
- Explanation
- Code example
- Common pitfall

### Section 2: [Second major concept]
- Explanation
- Code example
- Real-world application

### Section 3: [Third major concept]
- Explanation
- Code example
- Advanced tip

## Putting It Together
- Complete example
- Working code

## What's Next
- Links to deeper content
- Call to action (try the product, join Discord, etc.)
```

---

## Writing Code Examples

Code is the content. Get it right.

### The Copy-Paste Test

Every code example must:

| Requirement | Why It Matters |
|------------|----------------|
| **Run without modification** | Developers will copy-paste. If it fails, you lose trust. |
| **Include imports** | Don't assume they know which libraries to import. |
| **Show output** | What should they see when it works? |
| **Handle errors** | Real code has error handling. Show it. |
| **Use real values** | No `foo`, `bar`, `example.com` unless necessary. |

### Code Example Structure

```markdown
First, install the dependencies:

\`\`\`bash
npm install your-library axios
\`\`\`

Now create a file called `fetch-data.js`:

\`\`\`javascript
// fetch-data.js
import { Client } from 'your-library';
import axios from 'axios';

const client = new Client({
  apiKey: process.env.YOUR_API_KEY // Use environment variables
});

async function fetchUserData(userId) {
  try {
    const user = await client.users.get(userId);
    console.log(`Fetched user: ${user.name}`);
    return user;
  } catch (error) {
    console.error(`Failed to fetch user: ${error.message}`);
    throw error;
  }
}

// Example usage
fetchUserData('user_123')
  .then(user => console.log(user))
  .catch(err => process.exit(1));
\`\`\`

Run it:

\`\`\`bash
YOUR_API_KEY=sk_test_xxx node fetch-data.js
\`\`\`

Expected output:

\`\`\`
Fetched user: Jane Developer
{ id: 'user_123', name: 'Jane Developer', email: 'jane@example.dev' }
\`\`\`
```

### Language-Specific Conventions

| Language | Code Block | Package Install | Env Vars |
|----------|-----------|-----------------|----------|
| JavaScript/Node | `javascript` or `js` | `npm install` | `process.env.VAR` |
| TypeScript | `typescript` or `ts` | `npm install` | `process.env.VAR` |
| Python | `python` or `py` | `pip install` | `os.environ['VAR']` |
| Go | `go` | `go get` | `os.Getenv("VAR")` |
| Rust | `rust` | `cargo add` | `std::env::var("VAR")` |
| Shell | `bash` or `shell` | N/A | `$VAR` |

---

## Technical Accuracy Checklist

Run through before publishing:

| Check | How to Verify |
|-------|---------------|
| **Code runs** | Copy-paste every snippet and run it |
| **Versions match** | Are you using the current library version? |
| **Links work** | Click every link |
| **Commands work** | Run every CLI command |
| **Screenshots current** | Do UI screenshots match the current product? |
| **No deprecated APIs** | Check if any APIs used are deprecated |
| **Security review** | No hardcoded secrets, SQL injection, etc. |
| **Peer review** | Have an engineer read it for accuracy |

---

## SEO for Developer Content

Developers use Google differently than consumers.

### Developer Search Patterns

| Pattern | Example Searches |
|---------|-----------------|
| **Error messages** | "TypeError: Cannot read property 'map' of undefined" |
| **How to** | "how to deploy next.js to vercel" |
| **Comparison** | "prisma vs typeorm 2024" |
| **Best practices** | "typescript project structure best practices" |
| **Alternatives** | "alternatives to firebase" |
| **With** | "react with typescript tutorial" |

### Technical SEO Checklist

| Element | Best Practice |
|---------|--------------|
| **Title** | Include primary keyword, framework names, year if relevant |
| **Meta description** | 150 chars, include keyword, promise specific outcome |
| **H1** | Match or closely match title |
| **H2s** | Include secondary keywords, make scannable |
| **Code blocks** | Use proper syntax highlighting (helps featured snippets) |
| **Internal links** | Link to related docs, tutorials, API reference |
| **External links** | Link to official docs of tools mentioned |
| **URL slug** | Lowercase, hyphens, include keyword |

### Example Optimized Title

| Bad | Good |
|-----|------|
| "Using Our API" | "How to Authenticate with the YourProduct API (Node.js)" |
| "Database Guide" | "PostgreSQL Connection Pooling: Complete Guide with pgBouncer" |
| "Getting Started" | "Getting Started with YourProduct: Your First API Call in 5 Minutes" |

---

## Content Quality Signals

What separates great devrel content from mediocre:

### Do This

- **Show, don't tell** — Code over prose
- **Address the "why"** — Not just how to do it, but when and why
- **Acknowledge tradeoffs** — Nothing is perfect; developers respect honesty
- **Link to sources** — Official docs, RFCs, related articles
- **Include dates** — "Updated March 2024" or version numbers
- **Progressive disclosure** — Start simple, add complexity
- **Real examples** — Production scenarios, not just hello world

### Don't Do This

- **Wall of text** — Break up with code, headers, bullets
- **Marketing speak** — "Best-in-class," "seamless," "revolutionary"
- **Assuming knowledge** — Define acronyms, link to prerequisites
- **Outdated content** — Nothing worse than a 2019 tutorial with deprecated APIs
- **Buried lede** — Put the answer first, explanation second
- **No code** — Developers came for code, not prose

---

## Content Templates

### Blog Post Template

```markdown
# [Specific, keyword-rich title]

[2-3 sentence hook: problem + promise]

## The Problem

[1 paragraph explaining the pain point]

## The Solution

[Brief explanation of your approach]

### Step 1: [Action]

[Explanation]

\`\`\`language
// Code
\`\`\`

### Step 2: [Action]

[Explanation]

\`\`\`language
// Code
\`\`\`

### Step 3: [Action]

[Explanation]

\`\`\`language
// Code
\`\`\`

## Complete Example

\`\`\`language
// Full working code
\`\`\`

## Troubleshooting

### [Common Error 1]
[Solution]

### [Common Error 2]
[Solution]

## What's Next

- [Link to deeper dive]
- [Link to related tutorial]
- [CTA: Try it yourself]
```

### Comparison Post Template

```markdown
# [Tool A] vs [Tool B]: [Specific Use Case] ([Year])

[1 paragraph: Who this comparison is for and what you'll learn]

## Quick Comparison

| Feature | Tool A | Tool B |
|---------|--------|--------|
| [Feature 1] | | |
| [Feature 2] | | |
| [Feature 3] | | |

## When to Choose [Tool A]

- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## When to Choose [Tool B]

- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Deep Dive: [Specific Aspect]

### Tool A Approach
[Explanation + code]

### Tool B Approach
[Explanation + code]

## Our Recommendation

[Specific guidance based on use case]
```

---

## Measuring Content Success

### Metrics to Track

| Metric | What It Tells You |
|--------|------------------|
| **Page views** | Reach (but vanity without context) |
| **Time on page** | Engagement (are they reading?) |
| **Scroll depth** | Did they read to the end? |
| **Bounce rate** | Did they find what they needed? |
| **Search rankings** | SEO performance |
| **Backlinks** | Authority and reference value |
| **Social shares** | Resonance (especially HN, Twitter, Reddit) |
| **Conversion events** | Sign-ups, installs, docs clicks |

### Content → Conversion Path

Track the journey:
1. Search/social → Blog post
2. Blog post → Docs / quickstart
3. Docs → Sign up / install
4. Sign up → Activation (first success)

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor where your content gets shared (HN, Reddit, Twitter). Track competitor content performance. Find content ideas from developer conversations. |
| **Grammarly / Hemingway** | Readability and grammar checking |
| **Carbon / Ray.so** | Beautiful code screenshots |
| **Excalidraw** | Technical diagrams |
| **Loom** | Quick video walkthroughs |
| **Ahrefs / SEMrush** | Keyword research and SEO tracking |
| **Google Search Console** | Track search performance |

---

## Related Skills

- `developer-audience-context` — Foundation for knowing your readers
- `technical-tutorials` — Deep dive into step-by-step content
- `developer-newsletter` — Distributing content via email
- `developer-seo` — Technical SEO optimization
- `hacker-news-strategy` — Sharing content on HN effectively

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
