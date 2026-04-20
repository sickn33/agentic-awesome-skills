---
name: blog-writing-guide
description: "This skill enforces Sentry's blog writing standards across every post — whether you're helping an engineer write their first blog post or a marketer draft a product announcement."
risk: unknown
source: community
---

# Sentry Blog Writing Skill

This skill enforces Sentry's blog writing standards across every post — whether you're helping an engineer write their first blog post or a marketer draft a product announcement.

**The bar:** Every Sentry blog post should be something a senior engineer would share in their team's Slack, or reference in a technical decision.

What follows are the core principles to internalize and apply to every piece of content.

## When to Use
- You need to draft or edit a Sentry blog post.
- The task involves technical storytelling, product announcements, or engineering deep-dives in Sentry's blog voice.
- You want blog content that is opinionated, specific, and technically credible rather than generic marketing copy.

## The Sentry Voice

**We sound like:** A senior developer at a conference afterparty explaining something they're genuinely excited about — smart, specific, a little irreverent, deeply knowledgeable.

**We don't sound like:** A corporate blog, a press release, a sales deck, or an AI-generated summary.

Be technically precise, opinionated, and direct. Humor is welcome but should serve the content, not replace it. Sarcasm works. One good joke per post is plenty.

Use "we" (Sentry) and "you" (the reader). This is a conversation, not a paper.

## Banned Language

Never use these. They are automatic red flags:

- "We're excited/thrilled to announce" — just announce it
- "Best-in-class" / "industry-leading" / "cutting-edge" — show, don't tell
- "Seamless" / "seamlessly" — nothing is seamless
- "Empower" / "leverage" / "unlock" — say what you actually mean
- "Robust" — describe what makes it robust instead
- "At [Company], we believe..." — just state the belief
- "Streamline" — everyone is streamlining, stop
- Filler transitions: "That being said," "It's worth noting that," "At the end of the day," "Without further ado," "As you might know"
- "In this blog post, we will explore..." — be direct, just start

## The Opening (First 2-3 Sentences)

The opening must do one of two things: **state the problem** or **state the conclusion**. Never start with background, company history, or hype.

**Good:** "Two weeks before launch, we killed our entire metrics product. Here's why pre-aggregating time-series metrics breaks down for debugging, and how we rebuilt the system from scratch."

**Bad:** "At Sentry, we're always looking for ways to improve the developer experience. Today, we're thrilled to share some exciting updates to our metrics product that we think you'll love."

## Structure: Follow the Reader's Questions

Structure every post around what the reader is actually wondering, not your internal narrative:

1. **What problem does this solve?** (1-2 paragraphs max)
2. **How does it actually work?** Not buttons-you-click, but underlying technology. (Bulk of the post — be specific)
3. **What were the trade-offs or alternatives?** (This separates good from great)
4. **How do I use/try/implement this?** (Concrete next steps)

For engineering deep-dives, also address:
5. **What did we try that didn't work?** (Builds trust)
6. **What are the known limitations?** (Shows intellectual honesty)

## Section Headings Must Convey Information

**Weak:** "Background," "Architecture," "Results," "Conclusion"

**Strong:** "Why time-series pre-aggregation destroys debugging context," "The scatter-gather approach to distributed GROUP BY," "Where this breaks down: the cardinality wall"

## Technical Quality Standards

**Numbers over adjectives.** If you make a performance claim, include the number.
- Bad: "This significantly reduced our error processing time."
- Good: "This reduced our p99 error processing time from 340ms to 45ms — a 7.5× improvement."

**Code must work.** If a post includes code, test it. Include imports, configuration, and context. Comments should explain *why*, not *what*.

**Diagrams for systems.** If you describe a system with more than two interacting components, include a diagram. Label with real service names, not generic boxes.

**Honesty over hype.** Never overstate what a feature does. Acknowledge limitations. If something is in beta, say so. If a competitor does something well, it's okay to note that. Do not claim AI features are more capable than they are — "Seer suggests a likely root cause" ≠ "Seer finds the root cause."

## Title Guidelines

The title is the highest-leverage sentence in the post. It must stop a developer scrolling through their RSS feed or Twitter.

**Strong titles** make a specific claim, tell a story, or promise a specific payoff:
- "The metrics product we built worked. But we killed it and started over anyway"
- "How we reduced release delays by 5% by fixing Salt"
- "Your JavaScript bundle has 47% dead code. Here's how to find it."

**Weak titles** are vague announcements:
- "Introducing our new metrics product"
- "Performance improvements in Sentry"
- "AI-powered debugging with Seer"

## The Closing

End with something useful — a link to docs, a way to try it, a call to give feedback. Never end with generic hype ("We can't wait to see what you build!") or recaps of what you just said.

## Post Types

Here's the quick map by post type:

| Type | Goal | Byline |
|------|------|--------|
| Engineering Deep Dive | Explain a technical system/decision so other engineers learn | The engineer(s) who built it. Always. |
| Product Launch | Explain what shipped, why it matters, how to use it | PM, engineer, or DevEx. Not PMM unless marketing built it. |
| Postmortem | Transparent failure analysis with timeline and fixes | Engineering leadership |
| Data / Research | Original insights from Sentry's unique data position | Data team, engineering, or research |
| Tutorial / Guide | Help a developer accomplish something specific | DevEx, engineer, or community contributor |

## The "Would I Share This?" Test

Before publishing, ask: Would a developer share this post? Does it have a shot at getting on Hacker News? If the answer is no, the post either needs more depth, more original insight, or it belongs in the changelog instead.

Posts worth sharing contain at least one of:
- A technical decision explained with trade-offs
- Original data or research not found elsewhere
- A real-world debugging story with specific details
- An honest accounting of something that went wrong
- A how-to that saves the reader real time

## Non-Negotiables (Quick Reference)

1. Never publish without a real person's name on it. No "The Sentry Team" bylines.
2. Never publish code that doesn't work.
3. Never say "we're excited to announce." Just announce it.
4. If you describe a system, include a diagram.
5. If you make a performance claim, include the number.
6. If you discuss a decision, explain what you didn't choose and why.
7. Every post must have a clear "who is this for" in the author's mind before writing.
8. Changelogs belong in the changelog. Blog posts should offer something more.
9. When in doubt, go deeper. The risk of being too shallow is far greater than being too detailed.
10. Write the post you wish existed when you were trying to solve this problem.

## When Reviewing or Editing a Draft

Run through both checklists:

**Technical Review:**
- All technical claims accurate
- Code samples work
- Architecture descriptions match reality
- Numbers and benchmarks correct
- No oversimplifications that would make an expert cringe

**Editorial Review:**
- Opening hooks reader within 2 sentences
- Passes the "would I share this?" test
- No corporate language, filler, or fluff
- Headings convey information
- Right length (not padded, not too thin)
- Title is specific and compelling

**Final Check:**
- Author byline is correct (real person's name)
- Links to docs/getting-started included
- Post doesn't duplicate what's in the changelog

When providing feedback, be specific and constructive. Quote the weak passage, explain why it's weak, and rewrite it to show the standard.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
