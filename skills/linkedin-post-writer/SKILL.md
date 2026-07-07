---
name: linkedin-post-writer
description: "Draft LinkedIn posts from 16 tested hook formulas mapped to engagement goals (comments, reposts, likes, saves), with 2026 algorithm formatting rules and an AI-tell scrub pass before publishing."
category: marketing
risk: none
source: community
source_repo: sergebulaev/linkedin-skills
source_type: community
date_added: "2026-07-06"
author: sergebulaev
tags: [linkedin, copywriting, hooks, social-media, personal-brand, content-marketing]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/sergebulaev/linkedin-skills/blob/main/LICENSE"
---

# LinkedIn Post Writer

## Overview

Drafts long-form LinkedIn posts using 16 hook formulas that were reverse-engineered from posts that outperformed their authors' baselines in 2025-2026, each with a reference engagement number. Instead of asking "what should I write", the workflow asks "what should this post earn" (comments, reposts, likes, or saves), shortlists 2-3 matching formulas, fills the chosen skeleton with the user's voice, then scrubs the draft for AI tells before it ships.

This is the flagship skill from [sergebulaev/linkedin-skills](https://github.com/sergebulaev/linkedin-skills), a 10-skill LinkedIn bundle (writer, humanizer, pre-publish audit, comment drafter, reply handler, hook extractor, content planner, profile optimizer, engager analytics, thread monitor) installable as a Claude Code or Codex plugin. This standalone version covers the drafting workflow; scheduling and publishing automation live in the full bundle.

## When to Use This Skill

- Use when the user says "write me a LinkedIn post about X"
- Use when the user has a topic and a rough angle but needs a hook and structure
- Use when the user wants to pick from proven post formats instead of improvising
- Use when a draft exists but the hook is weak and needs a formula-based rebuild
- Not for replying to comments or optimizing profiles; this skill only drafts posts

## How It Works

### Step 1: Gather inputs

Collect: topic, angle, target audience (founders, operators, marketers), desired length (short 300-500, medium 900-1,300, or long 1,500-1,900 characters), and any raw material the user already has (numbers, anecdotes, names).

### Step 2: Pick the formula by engagement goal first

Ask (or infer) what the post should earn, then shortlist:

| Goal | Earned by | Formulas |
|---|---|---|
| Comments | questions, contrarian takes, vulnerability | F4 Time-Anchor Confession, F10 Contrarian + Receipts, F12 Permission Slip, F9 Curiosity-Gap |
| Reposts | quotable maxims, tributes, "X isn't Y" distinctions | F14 Named Gratitude, F2 R.I.P. Obituary, F8 Paid-vs-Free Reversal |
| Likes | emotional stories, celebrations, status-strip | F11 Emotional Cold-Open, F13 Bait-and-Switch Reversal, F16 Status-Strip Humility |
| Saves | simplifications, exact how-to, frameworks | F15 Explain-to-Kids, F7 Odd-Precision Money Ledger, F8 Paid-vs-Free Reversal |

The full set of 16, with reference engagement:

| Code | Formula | Reference | Best for |
|---|---|---|---|
| F1 | Platform Risk Anaphora | 4,240 eng | Category and platform-risk arguments |
| F2 | R.I.P. Obituary | 3,822 eng | Era-ending claims, industry pivots |
| F3 | Year-over-Year Pivot | 494 eng, 3.74x baseline | Identity shifts, founder reflection |
| F4 | Time-Anchor Confession | 1,519+ eng | Vulnerability, voice reset |
| F5 | Self-Proving Meta | 1,082 eng, 435 comments | Commitments and tests in public |
| F6 | Comment-Gate Lead Magnet | 717-3,008 eng | List building (max once a month) |
| F7 | Odd-Precision Money Ledger | 1,755 eng, 9.4x baseline | Build logs, cost breakdowns |
| F8 | Paid-vs-Free Reversal | 550 eng, 19.64x baseline | Framework giveaways |
| F9 | Curiosity-Gap Teaser | 306 eng, 4.25x baseline | Surprise and behind-the-scenes stories |
| F10 | Contrarian + Historical Receipts | 3,083 eng | Sacred-cow takes backed by history |
| F11 | Emotional Cold-Open | high raw reach | Real stories with emotional stakes |
| F12 | Permission Slip | comment-heavy | Encouragement to a discouraged audience |
| F13 | Bait-and-Switch Reversal | high raw reach | Bad-news framing that turns into an upgrade |
| F14 | Named Gratitude / Tribute | repost-heavy | Thanking mentors, teams, departing colleagues |
| F15 | Explain-to-Kids | save-heavy | Demystifying jargon into a reference post |
| F16 | Status-Strip Humility | like-heavy | Senior voices trading prestige for warmth |

Important caveat: F1-F10 references are engagement counts or format multipliers against the author's own baseline; F11-F16 references are raw corpus reach, often inflated by a famous author or a reshare. The two groups measure different things, so never rank formulas across groups by number.

### Step 3: Draft the post

Fill the formula skeleton with the user's voice and material, respecting the 2026 formatting rules:

- Hook lands in the first 210 characters (before the "... see more" fold)
- 900-1,300 characters is the sweet spot for text posts
- Double line-breaks between ideas, never walls of text
- 0-2 hashtags, placed at the end
- No external links in the body (put links in the first comment)
- Prefer "How I" over "How to": first-person experience hooks outperform generic instruction 2-3x
- Put one specific number in the first sentence ($873.47 beats $900; 40,000 beats "a lot")

### Step 4: Scrub AI tells

Before showing the draft: strip em dashes, AI vocabulary ("game-changer", "deep dive", "delve"), rule-of-three lists without receipts, and generic openers like "In today's fast-paced world". Add human fingerprints: at least one specific number, one named entity, and one first-person concrete detail per 100 words. Vary sentence length aggressively (mix 3-word and 25-word sentences).

### Step 5: Present the result

Show the user: formula used, full draft, character count, and a suggested posting window (Tuesday to Thursday, 7:30-9:00 AM local time performs best for B2B audiences).

## Examples

### Example 1: Founder build-log (F7 Odd-Precision Money Ledger)

```text
User:  write a post about what my bootstrapped SaaS actually costs to run
Agent: Goal check: this reads like a saves play (people screenshot cost
       breakdowns). Best fit is F7 Odd-Precision Money Ledger (9.4x baseline).
       Draft hook:

       "My SaaS costs $412.83 a month to run. Here is every line item."

       Then the ledger: hosting $94.20, email $35.00, monitoring $18.63...
       exact numbers only, totals that actually add up, one lesson at the end.
```

### Example 2: Goal-first selection

```text
User:  I want a post that gets real comments, topic: why I stopped doing demos
Agent: Comment-earners are F4 Confession, F10 Contrarian, F12 Permission Slip.
       For "I stopped doing X" the strongest is F10 Contrarian + Receipts:
       open with the unpopular claim, back it with 2 historical parallels,
       close with a question that forces side-picking. Reference: 3,083 eng.
```

## Best Practices

- ✅ Pick the formula by engagement goal first, topic second
- ✅ Lead with a real failure or a specific number in the first 3 lines
- ✅ Include one moment of genuine vulnerability or concrete stakes; pure insight posts underperform in 2026
- ❌ Don't blend two hook formulas in one post; it dilutes both
- ❌ Don't use F5 Self-Proving Meta unless the user will actually keep the promise
- ❌ Don't pair F7 Money Ledger with rounded or invented numbers; readers notice
- ❌ Don't open with an all-caps line ("THIS CHANGED EVERYTHING")
- ❌ Don't frame LinkedIn as inferior inside a LinkedIn post

## Limitations

- Reference engagement numbers describe the 2025-2026 corpus the formulas were extracted from; they are priors, not guarantees, and LinkedIn's ranking changes over time.
- The skill drafts text posts; it does not generate images, carousels, or video scripts.
- This standalone version does not schedule or publish. Scheduling, comment drafting, reply handling, and engagement analytics require the full bundle from the source repo.
- Voice quality depends on the raw material the user provides; a formula cannot invent authentic anecdotes, and the skill should ask for real details rather than fabricate them.

## Common Pitfalls

- **Problem:** The draft sounds like every other AI-written LinkedIn post.
  **Solution:** Run Step 4 ruthlessly. Cut em dashes, cut "game-changer" vocabulary, and force one concrete first-person detail per 100 words.
- **Problem:** The hook is buried in paragraph two.
  **Solution:** The first 210 characters must carry the hook; everything before the fold decides the expand rate.
- **Problem:** Comparing F11's raw reach to F8's 19.64x multiplier and picking F11 "because the number is bigger".
  **Solution:** The columns measure different things. Match formula to goal and topic, not to the largest number.
- **Problem:** Post gets reach but zero comments.
  **Solution:** The formula was picked for the wrong goal. Comment-earners end with a question or a side-picking claim, not a summary.

## Related Skills

- `@linkedin-content-generator` - broader LinkedIn content suite (carousels, newsletters, calendars)
- `@linkedin-profile-optimizer` - profile and authority optimization rather than post drafting
- `@social-post-writer-seo` - multi-platform social copy when LinkedIn is not the only target

## Additional Resources

- [Source repo with all 16 formula skeletons and worked examples](https://github.com/sergebulaev/linkedin-skills)
- [Full 10-skill bundle install (Claude Code / Codex plugin)](https://github.com/sergebulaev/linkedin-skills#install)
