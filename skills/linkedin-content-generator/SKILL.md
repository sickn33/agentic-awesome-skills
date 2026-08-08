---
name: linkedin-content-generator
description: "AI-powered LinkedIn content suite: generate posts, carousels, newsletters, and 30-day calendars with niche-specific SEO rules and a reinforcement-learning personal memory system."
category: marketing
risk: safe
source: community
source_repo: sarveshtalele/linkedin-content-skill
source_type: community
date_added: "2026-06-04"
author: sarveshkishortalele
tags: [linkedin, content-creation, social-media, marketing, newsletter, carousel, content-calendar, reinforcement-learning, seo, copywriting]
tools: [claude]
license: "MIT"
license_source: "https://github.com/sarveshtalele/linkedin-content-skill/blob/main/LICENSE"
---

# LinkedIn Content Generator

## Overview

A full LinkedIn content-creation suite for Claude Code that turns a topic and niche into
publish-ready posts, multi-slide carousels, long-form newsletter editions, and 30-day content
calendars — all wired through a personal reinforcement-learning memory system so every output
improves as you give feedback.

Seven coordinated commands cover the full content workflow:

| Command | Purpose |
|---|---|
| `/generate-post` | Single ready-to-publish LinkedIn post |
| `/generate-carousel` | Numbered slide content + caption |
| `/generate-newsletter` | Long-form newsletter edition |
| `/generate-calendar` | 30-day posting calendar with Markdown table |
| `/show-memory` | Display current preferences and feedback log |
| `/feedback` | Save what worked for future outputs |
| `/clear-memory` | Reset memory to factory defaults |

All helper scripts are bundled inside `skills/linkedin-content-generator/scripts/` and ship
alongside this `SKILL.md`. They build richly engineered prompts, inject your saved
preferences, and enforce LinkedIn SEO rules before Claude generates output.
A local `memory.md` file persists your style, tone, successful hooks, and top-performing
formats across every session.

## When to Use This Skill

- Use when you need a ready-to-paste LinkedIn post with SEO-optimised hooks and hashtags.
- Use when building a multi-slide carousel deck for LinkedIn Documents.
- Use when writing a long-form LinkedIn Newsletter edition with structured sections.
- Use when planning an entire month of content with format variety and pacing rules.
- Use when you want content that adapts to your personal voice over time via saved feedback.
- Use when working in any niche (AI, SaaS, Marketing, Finance, Healthcare, etc.) and need
  platform-native formatting that avoids common LinkedIn algorithmic pitfalls.

## Prerequisites

**Python 3.8 or later** must be available in your shell path.

The skill is self-contained. Install it from the Agentic Awesome Skills library:

```bash
# Install via antigravity CLI (recommended)
antigravity install linkedin-content-generator

# Or copy manually into your Claude Code skills directory
cp -r skills/linkedin-content-generator ~/.claude/skills/
```

All six Python scripts and the default `memory.md` are bundled inside the
`scripts/` subdirectory of this skill. No additional cloning or downloads are required.
No API keys, external services, or network access are needed.

## How It Works

### Architecture

```
User command (/generate-post ...)
        │
        ▼
SKILL.md parses $ARGUMENTS
        │
        ▼
Python script builds prompt
  • Injects LinkedIn SEO rules
  • Injects memory.md preferences
        │
        ▼
Claude generates publish-ready output
        │
        ▼
/feedback saves what worked → memory.md
        (loop — every future output improves)
```

### Step 1: Set Up Your Niche (One-Time)

Open `~/.claude/skills/linkedin-content-generator/scripts/memory.md` and update the
**Primary Niche** field:

```markdown
## Core Identity & Tone
- **Primary Niche:** AI & Technology   ← change this
```

This field is injected into every prompt. Without it, the skill defaults to
`"AI & Technology"`.

### Step 2: Generate Content

Run any of the seven commands described in the **Commands Reference** section below.
Claude reads the script output and produces the final content directly in the chat.

### Step 3: Save What Works

After each output, save successful patterns with `/feedback`:

```
/feedback the storytelling hook in this post got 3x more comments than usual
```

The feedback is appended to `memory.md` and automatically injected into all future
generation prompts.

## Commands Reference

### `/generate-post` — Single LinkedIn Post

Generates a scroll-stopping, SEO-optimised LinkedIn text post.

**Usage:**
```
/generate-post <topic> [in <niche>] [tone: controversial|storytelling|educational|motivational|professional]
```

**Parameters:**

| Parameter | Default | Options |
|---|---|---|
| `topic` | required | any subject |
| `niche` | `"AI & Technology"` | any industry |
| `tone` | `professional` | `professional` · `storytelling` · `controversial` · `educational` · `motivational` |
| `style` | `list-based` | `list-based` · `text-only` · `storytelling` · `data-driven` · `contrarian` |

**Examples:**

```
/generate-post why most developers fail at time management in Software Engineering tone: storytelling
```

```
/generate-post the real cost of technical debt in SaaS tone: controversial
```

```
/generate-post 5 things I wish I knew before my first startup in Entrepreneurship tone: educational style: list-based
```

**Output structure:**
1. Scroll-stopping hook (2 lines, triggers "see more")
2. Context / problem setup (2–3 short sentences)
3. Core value (numbered list or bullets, max 7 items)
4. Key takeaway (1–2 punchy sentences)
5. Specific call to action
6. 3–5 hashtags (broad + niche + community mix)

---

### `/generate-carousel` — LinkedIn Carousel

Generates numbered slide content plus a ready-to-use LinkedIn caption.

**Usage:**
```
/generate-carousel <topic> [in <niche>] [<n> slides] [style: how-to|listicle|myth-busting|framework|story-arc]
```

**Parameters:**

| Parameter | Default | Options |
|---|---|---|
| `topic` | required | any subject |
| `niche` | `"AI & Technology"` | any industry |
| `slides` | `7` | `3`–`12` |
| `style` | `listicle` | `how-to` · `listicle` · `myth-busting` · `framework` · `story-arc` |

**Style guide:**

| Style | Structure |
|---|---|
| `how-to` | Slide 1 = problem → slides 2–N = steps → last = result / CTA |
| `listicle` | Each slide = one item with bold title + 1–2 sentence explanation |
| `myth-busting` | Each slide = `MYTH: [belief]` → `TRUTH: [reality]` |
| `framework` | Introduce a proprietary framework; each slide = one component |
| `story-arc` | Slide 1 = before → middle = journey → last = after + CTA |

**Examples:**

```
/generate-carousel 10 prompt engineering mistakes 8 slides style: myth-busting
```

```
/generate-carousel building a second brain in Knowledge Management 7 slides style: how-to
```

```
/generate-carousel the PARA method for productivity in Personal Development style: framework
```

**Output:** Slides numbered `1` through `N`, followed by a LinkedIn caption with hook,
teaser context, "Swipe →" prompt, and hashtags.

---

### `/generate-newsletter` — LinkedIn Newsletter Edition

Generates a complete long-form newsletter edition structured for the LinkedIn Newsletter
editor.

**Usage:**
```
/generate-newsletter <topic> [in <niche>] [length: short|medium|long] [title: "<series title>"]
```

**Parameters:**

| Parameter | Default | Options |
|---|---|---|
| `topic` | required | any subject |
| `niche` | `"AI & Technology"` | any industry |
| `length` | `medium` | `short` (~700 w) · `medium` (~1,200 w) · `long` (~2,000 w) |
| `title` | auto-generated | optional series name |

**Examples:**

```
/generate-newsletter how AI is reshaping hiring in HR & Recruiting length: medium
```

```
/generate-newsletter the state of developer tools in 2026 in DevTools length: long title: "Build Layer Weekly"
```

**Output structure:**
1. SEO-optimised H1 headline
2. Opening hook (personal anecdote, statistic, or bold claim)
3. Body sections with H2 subheadings
4. Key takeaways (3–5 bullets)
5. One specific action step for this week
6. Engagement question to spark comments

---

### `/generate-calendar` — 30-Day Content Calendar

Generates a Markdown table calendar with monthly theme, SEO keywords, and format breakdown.

**Usage:**
```
/generate-calendar [niche: <niche>] [days: <n>] [frequency: <freq>] [goal: awareness|engagement|leads|authority|growth]
```

**Parameters:**

| Parameter | Default | Options |
|---|---|---|
| `niche` | required | any industry |
| `days` | `30` | any positive integer |
| `frequency` | `"3 times a week"` | any posting cadence |
| `goal` | `growth` | `awareness` · `engagement` · `leads` · `authority` · `growth` |

**Goal guide:**

| Goal | Strategy |
|---|---|
| `awareness` | Shareable, relatable, trending; heavy on carousels and contrarian takes |
| `engagement` | Opinion posts, polls, questions, storytelling to maximise comments |
| `leads` | Educational value posts + authority-building + clear DM CTAs |
| `authority` | Deep insights, data-backed posts, thought leadership, newsletters |
| `growth` | Mix viral formats (carousels, lists, contrarian) with high-value education |

**Examples:**

```
/generate-calendar niche: Fintech days: 30 frequency: daily goal: authority
```

```
/generate-calendar niche: Marketing Agencies days: 14 frequency: 5 times a week goal: leads
```

**Output:** Markdown table (`# | Day | Format | Topic / Angle | Hook | CTA`) + monthly theme +
top 5 SEO keywords + format breakdown summary.

---

### `/show-memory` — Display Preferences

Displays current memory contents: niche, tone, style, and all saved feedback entries.

**Usage:**
```
/show-memory
```

**Output:** Full `memory.md` content with entry count, primary niche, and tone summary.

---

### `/feedback` — Save Successful Patterns

Appends a labelled feedback entry to `memory.md`. Future outputs automatically incorporate
saved patterns.

**Usage:**
```
/feedback <what worked well>
```

**Examples:**

```
/feedback the contrarian hook "everyone is wrong about X" drove 400% more impressions
```

```
/feedback myth-busting carousels in the DevOps niche get 3x more saves than listicles
```

```
/feedback storytelling tone with a personal failure story outperforms data-driven in my audience
```

---

### `/clear-memory` — Reset Memory

Resets `memory.md` to factory defaults. The command asks for confirmation before
executing.

**Usage:**
```
/clear-memory
```

## LinkedIn SEO Rules (Enforced Automatically)

The skill injects these rules into every prompt via the bundled `scripts/utils.py`. They are **not**
optional; they are part of the prompt engineering that makes outputs platform-native.

### Hook Engineering
- Line 1 must be scroll-stopping (bold claim, surprising stat, provocative question, or
  personal story opener).
- Line 2 must create a pattern interrupt that forces "see more".
- Forbidden openers: `"In today's..."`, `"I am excited to..."`, `"Happy to share..."`,
  `"Thrilled to announce..."`.

### Readability Rules
- Maximum 2 sentences per paragraph.
- Aggressive line breaks — white space wins on LinkedIn.
- Bold used sparingly, only for critical points.
- Target reading level: Grade 8 or below.

### Hashtag Strategy
- 1 broad hashtag (`#AI`, `#Marketing`, `#Leadership`).
- 2 niche hashtags (`#AIAgents`, `#ContentMarketing`, `#StartupLife`).
- 1–2 community hashtags (`#LinkedInTips`, `#PersonalBranding`).
- Hard limit: **never more than 5** total.

## Best Practices

- ✅ Set `Primary Niche` in `memory.md` before generating any content.
- ✅ Run `/feedback` after any post that performs well — the memory compounds over time.
- ✅ Use `/generate-calendar` first when planning a content sprint; it provides topics
  for `/generate-post` and `/generate-carousel` runs.
- ✅ Mix carousel styles across a calendar period: listicle, myth-busting, and
  story-arc perform differently and prevent audience fatigue.
- ✅ Test the `controversial` tone on topics where you have a genuine, defensible stance;
  avoid it for topics where nuance is more valuable than edge.
- ❌ Do not skip the `/feedback` loop — without it, every output starts from generic
  LinkedIn best practices rather than your specific audience data.
- ❌ Do not post more than 5 hashtags; LinkedIn's algorithm penalises hashtag stuffing.
- ❌ Do not use the `data-driven` style without real statistics to cite; fabricated
  numbers destroy credibility faster than any other LinkedIn mistake.
- ❌ Do not generate a 30-day calendar without specifying `goal`; the default `growth`
  goal mixes formats broadly and may not match a specific campaign objective.

## Limitations

- This skill does not publish to LinkedIn directly. All output is copy-paste ready but
  requires manual posting via the LinkedIn web or mobile app.
- The memory system is file-based and local. It is not shared across machines or team
  members without manually syncing `memory.md`.
- The skill does not verify real-time LinkedIn algorithm changes. SEO rules are based on
  documented best practices as of mid-2025 and may need manual updates as the platform
  evolves.
- Calendar output does not auto-schedule posts or integrate with scheduling tools
  (Buffer, Hootsuite, etc.). It produces a Markdown table for manual import.
- The `slides` parameter is clamped to the range `3–12`. Carousels outside this range
  will silently be adjusted to the nearest boundary.
- `memory.md` grows unbounded as feedback accumulates. Very large memory files (500+
  entries) may exceed prompt context limits and cause truncation. Periodically archive
  old entries using `/clear-memory` and re-seed with your top learnings.
- Does not work in sandboxed environments where `python3` is unavailable or `Bash` tool
  calls are blocked.

## Security & Safety Notes

This skill uses the `Bash` allowed-tool to run Python scripts bundled at
`~/.claude/skills/linkedin-content-generator/scripts/`. All scripts are read-only
operations except `memory_manager.py`, which writes only to `memory.md` inside that
same bundled `scripts/` directory.

- No network requests are made by any script.
- No credentials, tokens, or secrets are read, written, or logged.
- No files outside `~/.claude/skills/linkedin-content-generator/scripts/` are modified.
- The `clear` command in `memory_manager.py` overwrites only the bundled `memory.md`;
  it does not delete any other files.
- All `--feedback` and `--id` arguments passed to `memory_manager.py` are written
  verbatim to `memory.md`. Do not pass shell metacharacters or sensitive data as
  feedback strings.

All Bash commands in this skill are local Python invocations with no elevated privileges
required:

```bash
# SKILL_SCRIPTS resolves to ~/.claude/skills/linkedin-content-generator/scripts
SKILL_SCRIPTS="${HOME}/.claude/skills/linkedin-content-generator/scripts"
python3 "${SKILL_SCRIPTS}/generate_post.py" --topic "..." --niche "..." --tone professional --style list-based
python3 "${SKILL_SCRIPTS}/memory_manager.py" add --id "..." --feedback "..." --tags "..."
python3 "${SKILL_SCRIPTS}/memory_manager.py" read
python3 "${SKILL_SCRIPTS}/memory_manager.py" clear
```

<!-- security-allowlist: approved — all commands are local Python script invocations with no network access, no credential handling, and writes scoped to the skill's own bundled scripts/memory.md only -->

## Common Pitfalls

- **Problem:** Script exits with `ModuleNotFoundError` or `No module named 'utils'`.
  **Solution:** Each script uses `sys.path.insert(0, SCRIPT_DIR)` to locate `utils.py`
  relative to itself, so they must be invoked with an absolute path — not from inside
  the `scripts/` directory. Use
  `python3 "${HOME}/.claude/skills/linkedin-content-generator/scripts/generate_post.py" ...`.

- **Problem:** Memory is not being applied to generated content.
  **Solution:** Check that `memory.md` exists at
  `~/.claude/skills/linkedin-content-generator/scripts/memory.md`. Run `/show-memory`
  to confirm. If missing, run any generator command once — it auto-creates the file from
  the bundled template.

- **Problem:** Calendar output is missing days or the table is malformed.
  **Solution:** Verify the `--days` value is a positive integer and `--frequency` is
  quoted if it contains spaces (e.g., `"3 times a week"`). The script passes these
  values directly into the prompt string.

- **Problem:** Carousel slides exceed the requested count.
  **Solution:** The `slides` value is clamped server-side to `[3, 12]`. If Claude
  generates more slides than requested, it is following the style guide structure
  (cover + content + CTA). Specify an exact count and style to get precise control.

- **Problem:** Generated post sounds generic despite feedback being saved.
  **Solution:** Memory entries are injected as context, not as hard rules. Use specific,
  actionable feedback: `"opening with a personal failure story outperforms stats for my
  audience"` is more useful than `"storytelling was good"`.

- **Problem:** `python3` not found on Windows.
  **Solution:** Install Python 3.8+ from python.org and ensure it is on PATH, or run via
  `py "%USERPROFILE%\.claude\skills\linkedin-content-generator\scripts\generate_post.py" ...`. On Windows without WSL, the `Bash` tool invocation
  may need adjustment in the SKILL.md `allowed-tools` context.

## Related Skills

- `@content-creator` — Broader brand voice analysis, SEO optimisation, and
  cross-platform content frameworks. Use when building a full content marketing system
  beyond LinkedIn alone.
- `@content-strategy` — Topic cluster planning, editorial roadmap, and content mix
  strategy. Use before running `/generate-calendar` when you need to define pillar topics
  first.
- `@content-marketer` — Campaign-level content planning across channels. Complements
  this skill when LinkedIn is one channel in a broader multi-platform launch.
- `@linkedin-automation` — Programmatic LinkedIn post publishing via the Composio/Rube
  MCP. Use alongside this skill when you want to automate the publishing step after
  generating content here.
- `@linkedin-profile-optimizer` — LinkedIn profile and personal brand optimisation.
  Use before running this skill to align generated content voice with your profile's
  headline, summary, and featured section.

## Additional Resources

- [LinkedIn Algorithm Guide (Official)](https://www.linkedin.com/help/linkedin/answer/a522537)
- [LinkedIn Newsletter Best Practices](https://www.linkedin.com/help/linkedin/answer/a544800)
- [Source Repository — linkedin-content-skill](https://github.com/sarveshtalele/linkedin-content-skill)
