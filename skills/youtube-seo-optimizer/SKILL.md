---
name: youtube-seo-optimizer
description: >
  Generate complete YouTube & podcast SEO packages with live-researched keywords —
  titles, descriptions, tags, hashtags, chapters, and audit fixes. Use for new or
  underperforming content.
risk: safe
source: community
source_type: community
author: whoisabhishekadhikari
date_added: "2026-06-15"
allowed-tools: web_search web_fetch
---

# YouTube & Podcast SEO Optimizer

## When to Use
- User wants a title/description/tags/hashtags package for a new upload
- User needs an audit of a live video or podcast episode that isn't getting views
- User asks for show notes, timestamps, or podcast episode metadata
- User says "SEO my video", "audit my YouTube video", "write a podcast description", "why isn't my video ranking", "generate tags", "fix my podcast SEO"
- Use this for any video or podcast SEO request — new, already published, or short-form

## Overview

You need web search + URL fetch for this to work. Whatever your host calls them — `web_search`/`web_fetch`, `WebSearch`/`WebFetch`, an MCP tool — use those.

This skill covers 6 scenarios: 3 content types (video, podcast, short-form) × 2 states (new or underperforming). Each has its own mode below.

Two rules:

1. **Every keyword is researched, not guessed.** Never generate tags or "trending" from memory. Ask the creator what they want to rank for, then search it.
2. **Match the ask.** If the user asked for just a title, deliver just a title. If they asked for the full package, ship every numbered section. Don't overwhelm them.

## How to execute this skill

The sections below are organized as: **Steps → Rules → Templates → Checks**. Follow them in order:

1. **Read the user's request** — scope check first (see below)
2. **Steps 0-2** — Classify, find the keyword, research it, gather missing info
3. **Pick your mode** (A-F) from the templates below
4. **Build what they asked for** using the rules (Title Rules, Tags Strategy, etc.)
5. **Run the Quality Checklist** before sending

---

## Step 0 — Check scope then classify

**Scope check first.** This skill handles one video, podcast episode, or short-form clip at a time — not entire channels or playlists. If the user asks for something outside that, say: *"I can optimize individual videos or episodes. Which one should I start with?"* Once they pick one, restart the flow from Step 0 with that specific item.

**Then classify.** Read the user's message first — they might have already told you everything. Don't ask something they just said.

**Content type** — If unclear from what they said, ask once: *"Is this a regular video, a podcast episode, or a Short/Reel?"*

**Status** — Did they give a URL? Fetch it. Did they say "no views" or "not ranking"? It's existing. Did they say "uploading" or "about to post"? It's new. If you can't tell, ask once.

| Content type | New | Existing |
|---|---|---|
| Standalone video | Mode A | Mode B |
| Podcast episode | Mode C | Mode D |
| Short-form clip / Reel | Mode E | Mode F |

If they gave a URL, fetch the live metadata — don't ask them to repeat what's already there.

---

## Step 1 — Find the target keyword

Check if they already named one. If not, extract it from their topic/outline and propose it. Only ask if you genuinely can't infer it.

If the user asked for just a title or just tags, skip the full research batch — but still do one quick search to validate the keyword angle. Otherwise run the full research:
- `[target keyword]` — see what's ranking
- `[target keyword] [current year]`
- `[niche/topic] trending` or `[target keyword] reddit` — real phrasing people use
- For podcasts: also search the guest's name

Pull 3-6 related phrases as secondary/long-tail keywords.

**No data you don't have:** never make up search volume, view counts, or algorithm claims. A thin result set is fine — lower competition.

**Use today's real date** for every "[Year]" slot.

**Verify superlatives.** If they say "top 10," "#1," "fastest-growing" — search for proof. If unverified, drop it or mark `[VERIFY: ...]`.

---

## Step 2 — Gather what you still need (scrape first, ask last)

Before writing the Resources/CTA block, check what info the user already gave or that you can scrape from their URL/name/channel. For anything still unknown, look it up. Ask the user only if you hit a dead end:

- Links: website, socials, newsletter, affiliate/products
- CTA goal: subscribe, visit, join, buy
- Offer, lead magnet, discount code, or sponsor
- For podcasts: guest name, bio, links; episode number; sponsor details; platform links (Spotify, Apple Podcasts, etc.)

One question at a time. After each answer, see if you can fill the rest from what you learned. If they say "placeholders," use `[ADD: ...]` markers — never fake URLs.

---

## Title Rules

Use these rules for every mode that includes a title (A-F).

### Formula
```
[Primary Keyword] : [Outcome or Benefit] + [Power Word / Number / Year]
```

### Power word bank
How · Why · What · Best · Full · Real · Free · New · Step-by-Step · Complete · Proven · Ultimate · Inside · Secret · Zero to · In [X] Days · [Number] Ways · [Year]

### Rules
- 60-70 characters exactly — count them
- Primary keyword in the first 4-5 words where possible
- One emotional hook per title
- Include year only if Step 1 research shows year-stamped titles are common
- No ALL CAPS except one word for emphasis
- No misleading promise
- A/B variant must use a genuinely different hook, not a word-order shuffle

### Title patterns by content type
| Type | Pattern | Example |
|---|---|---|
| How-to | How to [Result] in [Time/Steps] | How to Rank #1 on YouTube in 30 Days |
| List | [N] [Things] Every [Audience] Needs | 7 SEO Tools Every Creator Needs in [Year] |
| Story | How [Subject] [Achieved Outcome] | How One Farmer Built Nepal's First Agritech App |
| Question | [Burning Question]? (Full Answer) | Why Your YouTube Videos Get No Views (Fixed) |
| Geo | [Topic] in [Location]: [Outcome] | Agritech in Nepal: Farmers Earning 3x More |
| Comparison | [A] vs [B]: Which [Outcome]? | YouTube SEO vs Google SEO: What Actually Works |
| Podcast | [Guest] on [Topic]: [Outcome] \| [Show] #[Ep] | Sara Lin on Cold Outreach That Works \| Growth Lab #42 |

---

## Tags Strategy

Use for every mode that includes tags (A-F). Generate 15-20 tags using this mix:

| Type | Count | Rule |
|---|---|---|
| Exact match primary keyword | 2 | Must match Step 1 target keyword exactly |
| Broad topic | 3-4 | 1-2 word umbrella terms |
| Long-tail (3-5 words) | 5-6 | Pulled from Step 1 research |
| Question-based | 2 | "how to [topic]", "what is [topic]" |
| Branded / show name | 1-2 | Channel/podcast/website name |
| Year-tagged | 1-2 | Only if Step 1 research shows it's common |
| Geo-tagged | 1-2 | Always include for location-specific content |

Rules:
- All lowercase except proper nouns
- No special characters, no hashtags, no commas within a tag
- Under 500 characters total
- Never repeat the same keyword phrase

---

## Hashtag Rules

Use for every mode that includes hashtags (A-F).

- 5-8 hashtags (video/podcast); 3-5 (short-form)
- First 3 hashtags surface below the title — choose strategically
- Placement: final line of the description only — never in the tags field
- Format: CamelCase (`#AgritechNepal`)
- Mix: 2 broad + 2 specific + 1-2 geo + 1 branded
- Don't reuse an identical set across every upload — vary 3-6 per video

---

## Description Structure

Use for every mode that includes a description (A-F).

### Block 1 — Hook (first ~150 characters, shown in search results)
- Sentence 1: Step 1 target keyword used naturally
- Sentence 2: core promise
- Sentence 3: who this is for
- 80-120 words total

### Block 2 — Body
- 4-6 short paragraphs or ▶-marked list
- Weave in secondary keywords — one per paragraph, naturally
- Geo signal: mention location 2-4 times
- For podcasts: guest bio paragraph with links
- 450-650 words (video); podcasts can run slightly longer

### Block 3 — Footer
- 🔗 Resources & Links with real links from Step 2
- Subscribe CTA, 2 sentences
- For podcasts: "Listen on" platform-links block
- Hashtags on the very last line

**Total length:** 700-900 words (video), 800-1,000 (podcast). Shorts: 150-200 words.

### Full description template
```
[Hook — target keyword in sentence 1. Core promise. Who this is for.]

In this video/episode you'll learn:
▶ [Point 1]
▶ [Point 2]
▶ [Point 3]
▶ [Point 4]
▶ [Point 5]

[Body paragraph — secondary keyword woven in naturally]

[Body paragraph — secondary keyword woven in naturally]

[Body paragraph — geo signal if applicable]

[Body paragraph — guest bio (podcast) or credentials (video)]

Use the chapters below to jump to any section ↓

📌 CHAPTERS / TOPICS DISCUSSED
0:00 – [Chapter/topic]
[N:NN] – [Continue]

==========================
🔗 RESOURCES & LINKS
🌐 Website: [real link from Step 2]
💼 LinkedIn: [real link from Step 2]
📺 Subscribe: [real link from Step 2]
📧 Contact: [real link from Step 2]
[Podcast — 🎧 Listen on: Spotify | Apple Podcasts | ...]

[Subscribe CTA — 2 sentences, includes channel/show name]

#Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5 [#Tag6 #Tag7 optional]
```

---

## Chapters / Timestamps Rules

Use for modes A-D. **Hard cap: 6-10 markers.** Merge adjacent topics if you have more.

- First chapter MUST be `0:00` — YouTube ignores all chapters without it
- Each title: 3-6 words, action-oriented, keyword signal where natural
- Titles must reflect actual content
- For podcast episodes: mark guest intro and sponsor reads in the timestamps

---

## Geo / Local SEO Rules

Do this when the content is tied to a place:

- Mention location 2-4 times in description
- Geo-tagged tags: `[topic] [city]`, `[topic] [country]`
- First 3 hashtags: include at least one geo hashtag
- Bilingual channels: English description + one sentence in local language
- Location in title: use when it's a competitive differentiator

---

## Shorts / Clips Adaptation (secondary clip)

Use when the user asks for a Short cut from a specific video they mentioned. 

If they ask for a Short without mentioning a source video, ask: *"Which video should I pull the Short from?"* — once they tell you, treat the Short as the primary request and use Mode E directly (no need to also package the source video).

If they ask for both a main video SEO package + a Short cut from it, produce the main mode first, then append this as a separate block.

- **Title:** 60-70 characters, keyword in first 3 words
- **Description:** 150-200 words — hook + hashtags, no chapters
- **Hashtags:** 3-5 with `#Shorts`, placed in description
- **Tags:** reuse 5-8 from the main video
- No chapters (Shorts don't support them)

Output this as a separate block after the main package if they ask for it.

---

## Mode A — New Video Upload Package

### Required input (minimum one)
- Video topic, title idea, or the Step 1 target keyword
- Outline / roadmap of what the video covers
- Niche + target audience

### Optional inputs
- Channel name, target location, language, video length
- CTA goal, whether a Shorts version will be posted
- Links/offers for the description

If only a topic is given, extract the keyword, research it. When sections of the Mode template lack input (chapters, thumbnail, playlist, etc.), use reasonable defaults based on the topic — don't leave them blank or ask for every detail. Ask one question at a time, and only if you genuinely can't infer or look up the answer.

### Output template
```
==================================================
📺 YOUTUBE SEO PACKAGE — NEW UPLOAD
==================================================

① SEO TITLE (Primary)
[Title — 60-70 characters, built around Step 1 target keyword]
Character count: [N]/70

② SEO TITLE (A/B Variant)
[Alternative title — different hook, same keyword]
Character count: [N]/70

③ DESCRIPTION
[Full description — see Description Structure section]

④ PRIMARY KEYWORDS
1. [Step 1 target keyword, exact phrase]
2. [secondary keyword from Step 1 research]
3. [secondary keyword from Step 1 research]
4. [secondary keyword from Step 1 research]
5. [secondary keyword from Step 1 research]

⑤ TAGS
[tag1], [tag2], [tag3] ... [tag15-20 total]
Total character count: [N]/500

⑥ HASHTAGS
#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 [#Tag6 #Tag7 #Tag8 optional]

⑦ CHAPTERS / TIMESTAMPS (6-10 markers)
0:00 – [Chapter title]
[N:NN] – [Chapter title]

⑧ THUMBNAIL TEXT
"[3-5 bold words for overlay]"
Style note: [color contrast / emotion / visual hook]

⑨ CARDS & END SCREEN
Card 1 (at [N:NN]): [Related video to link]
Card 2 (at [N:NN]): [Playlist or external link]
End Screen: Subscribe + [related video]

⑩ PLAYLIST SEO NOTE
Suggested playlist: [Playlist name]
Description if new: [50-100 word SEO description]

⑪ PINNED COMMENT
[2-3 sentences. Target keyword + chapter teaser + question]

⑫ END SCREEN SCRIPT
"[2-3 sentences — natural speech, next topic + subscribe]"

==================================================
```

---

## Mode B — Existing Video Audit + Fix

### Required input
- YouTube URL (preferred — fetch live metadata) or current title/description
- Views/performance complaint

### Output template
```
==================================================
🔍 YOUTUBE SEO AUDIT REPORT
==================================================

VIDEO: [Title or URL]
TARGET KEYWORD: [confirmed in Step 1]
AUDIT DATE: [today's date]

==================================================
SECTION 1 — AUDIT SCORECARD
==================================================

| Element            | Score     | Issue Found |
|--------------------|-----------|-------------|
| Title              | ✅/⚠️/❌  | [Finding]   |
| Description        | ✅/⚠️/❌  | [Finding]   |
| Tags               | ✅/⚠️/❌  | [Finding]   |
| Hashtags           | ✅/⚠️/❌  | [Finding]   |
| Chapters           | ✅/⚠️/❌  | [Finding]   |
| Keyword targeting  | ✅/⚠️/❌  | [Finding]   |
| Geo/Local SEO      | ✅/⚠️/❌  | [Finding]   |
| Thumbnail text     | ✅/⚠️/❌  | [Finding]   |
| Cards/End screen   | ✅/⚠️/❌  | [Finding]   |
| Pinned comment     | ✅/⚠️/❌  | [Finding]   |

OVERALL SEO SCORE: [X/10]
PRIORITY FIXES: [Top 3 issues]

==================================================
SECTION 2 — DETAILED FINDINGS
==================================================

TITLE ANALYSIS
Current: "[existing title]"
Character count: [N] (ideal: 60-70)
Target keyword position: [where, or "absent"]
Missing: [power words, year, hook]

DESCRIPTION ANALYSIS
Current word count: [N] (ideal: 700-900)
Above-the-fold (first 150 chars): [paste]
Target keyword in first sentence: Yes / No
Chapters in description: Yes / No
Links/CTA present: Yes / No

TAGS ANALYSIS
Count: [N] (ideal: 15-20)
Tag type coverage: [which of 7 types are missing]

HASHTAG ANALYSIS
Count: [N] (ideal: 5-8)
Placement: [where they appear]
Issues: [in tags field? missing?]

CHAPTERS ANALYSIS
Present: Yes / No | Starts at 0:00: Yes / No

GEO / LOCAL SEO
Location signals: Yes / No

==================================================
SECTION 3 — FULL REWRITTEN METADATA
==================================================

① REWRITTEN TITLE (Primary)
[New title — 60-70 chars]
Character count: [N]/70

② REWRITTEN TITLE (A/B Variant)
[Alternative title — different hook]
Character count: [N]/70

③ REWRITTEN DESCRIPTION
[Full 3-block description]

④ REWRITTEN TAGS
[15-20 tags across all 7 types]

⑤ REWRITTEN HASHTAGS
#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 [#Tag6 #Tag7 optional]

⑥ REWRITTEN CHAPTERS (6-10 markers)
0:00 – [Chapter]
[N:NN] – [Continue]

⑦ THUMBNAIL TEXT
"[3-5 word overlay]"
Note: [needs change?]

⑧ PINNED COMMENT (replace existing)
[Target keyword + value teaser]

==================================================
SECTION 4 — POST-FIX ACTION PLAN
==================================================

Step 1 — Do immediately (YouTube Studio):
  □ Replace title
  □ Replace description
  □ Replace tags
  □ Add chapters if missing
  □ Post new pinned comment

Step 2 — Within 48 hours:
  □ Update thumbnail if flagged
  □ Add to correct playlist
  □ Share updated link

Step 3 — Check in 7 days:
  □ Monitor CTR in Analytics
  □ If impressions up but CTR flat, fix thumbnail
  □ Try A/B title after 14 days if no improvement

==================================================
```

---

## Mode C — New Podcast Episode Package

### Podcast-specific inputs (gather alongside Steps 1-2)
- Show name and episode number
- Guest name(s), one-line bio, and links
- Sponsor: name and where the read goes (pre/mid/post-roll)
- Platform links: Spotify, Apple Podcasts, etc.
- Series/season for playlist note

If Step 1 research shows people search the guest's name, lead the title with it. Otherwise lead with the topic.

### Output template
```
==================================================
🎙️ PODCAST EPISODE SEO PACKAGE — NEW EPISODE
==================================================

① SEO TITLE (Primary)
[Title — 60-70 chars. Lead with guest name if searchable, else keyword.]
Character count: [N]/70

② SEO TITLE (A/B Variant)
[Different hook, same target keyword]
Character count: [N]/70

③ DESCRIPTION
[Full description — guest bio in Block 2, platform links in Block 3]

④ PRIMARY KEYWORDS
1. [Step 1 target keyword]
2. [guest name + "podcast" / "interview"]
3. [secondary keyword from research]
4. [secondary keyword from research]
5. [show name + topic]

⑤ TAGS
[tag1], [tag2] ... [tag15-20 — include show + guest name]
Total: [N]/500

⑥ HASHTAGS
#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 [#Tag6 #Tag7 optional]

⑦ TOPICS DISCUSSED (6-10 markers)
0:00 – Intro
[N:NN] – Guest intro
[N:NN] – [Topic 1]
[N:NN] – Sponsor read (if applicable)
[N:NN] – [Topic 2]
[N:NN] – Closing / where to find guest

⑧ THUMBNAIL TEXT
"[3-5 bold words]"
Style note: [color contrast / visual hook]

⑨ CARDS & END SCREEN
Card 1 (at [N:NN]): Related past episode
Card 2 (at [N:NN]): Playlist or guest's site
End Screen: Subscribe + related episode

⑩ SERIES / PLAYLIST NOTE
Suggested playlist: [Series/season name]
Description: [50-100 word SEO description]

⑪ PINNED COMMENT
[2-3 sentences. Keyword + teaser + question]

⑫ LISTEN ON
🎧 Spotify: [link]
🎧 Apple Podcasts: [link]
🎧 [Other platforms as supplied]

⑬ END SCREEN SCRIPT
"[2-3 sentences — thank guest, tease next, subscribe]"

==================================================
```

---

## Mode D — Existing Podcast Episode Audit + Fix

### Required input
- YouTube URL (preferred — fetch live metadata) or current title/description
- Views/performance complaint

### Output template
```
==================================================
🔍 PODCAST EPISODE SEO AUDIT REPORT
==================================================

EPISODE: [Title or URL]
SHOW / EP #: [if known]
TARGET KEYWORD: [confirmed in Step 1]
AUDIT DATE: [today's date]

==================================================
SECTION 1 — SCORECARD
==================================================

| Element              | Score     | Issue Found |
|----------------------|-----------|-------------|
| Title                | ✅/⚠️/❌  | [Finding]   |
| Description          | ✅/⚠️/❌  | [Finding]   |
| Tags                 | ✅/⚠️/❌  | [Finding]   |
| Hashtags             | ✅/⚠️/❌  | [Finding]   |
| Topics/Timestamps    | ✅/⚠️/❌  | [Finding]   |
| Keyword targeting    | ✅/⚠️/❌  | [Finding]   |
| Guest bio + links    | ✅/⚠️/❌  | [Finding]   |
| Platform links       | ✅/⚠️/❌  | [Finding]   |
| Sponsor disclosure   | ✅/⚠️/❌  | [Finding]   |
| Series/playlist      | ✅/⚠️/❌  | [Finding]   |
| Pinned comment       | ✅/⚠️/❌  | [Finding]   |

OVERALL SCORE: [X/10]
PRIORITY FIXES: [Top 3]

==================================================
SECTION 2 — DETAILED FINDINGS
==================================================

TITLE ANALYSIS
Current: "[existing title]"
Character count: [N] (ideal: 60-70)
Guest name / keyword position: [where, or "absent"]

DESCRIPTION ANALYSIS
Word count: [N] (ideal: 800-1,000)
Keyword in first sentence: Yes / No
Guest bio present: Yes / No
Timestamps present: Yes / No
Platform links present: Yes / No

TAGS ANALYSIS
Count: [N] (ideal: 15-20)
Show / guest name as tags: Yes / No

TOPICS / TIMESTAMPS ANALYSIS
Present: Yes / No | Starts at 0:00: Yes / No
Sponsor marked (if applicable): Yes / No

==================================================
SECTION 3 — FULL REWRITTEN METADATA
==================================================

① REWRITTEN TITLE (Primary)
[New title — 60-70 chars]
Character count: [N]/70

② REWRITTEN TITLE (A/B Variant)
[Different hook]
Character count: [N]/70

③ REWRITTEN DESCRIPTION
[3-block structure, guest bio in Block 2, platform links in Block 3]

④ REWRITTEN TAGS
[15-20 tags including show + guest name]

⑤ REWRITTEN HASHTAGS
#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 [#Tag6 #Tag7 optional]

⑥ REWRITTEN TOPICS / TIMESTAMPS (6-10)
0:00 – Intro
[N:NN] – [Continue]

⑦ THUMBNAIL TEXT
"[3-5 word overlay]"
Note: [needs change?]

⑧ PINNED COMMENT (replace existing)
[Rewritten comment]

==================================================
SECTION 4 — ACTION PLAN
==================================================

Step 1 — Do immediately (YouTube Studio):
  □ Replace title
  □ Replace description
  □ Replace tags
  □ Add/fix timestamps
  □ Post new pinned comment

Step 2 — Within 48 hours:
  □ Update thumbnail if flagged
  □ Add to correct playlist
  □ Cross-post platform links
  □ Share with guest

Step 3 — Check in 7 days:
  □ Monitor CTR
  □ Try A/B title after 14 days if flat

==================================================
```

---

## Mode E — New Short-Form / Reel Package

### Required input
- Clip's topic/hook or the Step 1 target keyword
- If cut from a longer video: which moment and the parent video's tags
- Platform(s): YouTube Shorts (primary), plus Instagram Reels / TikTok if needed

### Output template
```
==================================================
🎬 SHORT-FORM SEO PACKAGE — NEW SHORT / REEL / CLIP
==================================================

① YOUTUBE SHORTS TITLE (Primary)
[Title — 60-70 chars. Keyword in first 3 words. One power word/hook.]
Character count: [N]/70

② TITLE (A/B Variant)
[Different hook, same keyword]
Character count: [N]/70

③ DESCRIPTION (150-200 words)
[Sentence 1: target keyword. 2-4 more sentences. Hashtags on final line.]

④ PRIMARY KEYWORDS
1. [Step 1 target keyword]
2. [secondary keyword]
3. [secondary keyword]

⑤ TAGS (5-8)
[tag1], [tag2] ... [tag5-8]
If cut from a longer video: reuse 5-8 of its tags.

⑥ HASHTAGS (3-5, #Shorts always included)
#Shorts #Tag2 #Tag3 [#Tag4 #Tag5 optional]

⑦ CROSS-POST CAPTION (Reels / TikTok — if cross-posting)
[60-150 words. Keyword in first ~125 chars. End with 3-5 hashtags.]

⑧ COVER FRAME / THUMBNAIL TEXT
"[3-5 bold words]"

⑨ PINNED COMMENT
[1-2 sentences. Keyword + question]

⑩ END-OF-CLIP CTA
[1 sentence — "full episode linked above", "part 2 tomorrow", etc.]

==================================================
```

---

## Mode F — Existing Short-Form Audit + Fix

### Required input
- URL (preferred) or current title/description/hashtags
- Views/performance complaint

### Output template
```
==================================================
🔍 SHORT-FORM SEO AUDIT REPORT
==================================================

CLIP: [Title or URL]
TARGET KEYWORD: [confirmed in Step 1]
AUDIT DATE: [today's date]

==================================================
SECTION 1 — SCORECARD
==================================================

| Element             | Score     | Issue Found |
|---------------------|-----------|-------------|
| Title               | ✅/⚠️/❌  | [Finding]   |
| Description/Caption | ✅/⚠️/❌  | [Finding]   |
| Hashtags            | ✅/⚠️/❌  | [Finding]   |
| Keyword targeting   | ✅/⚠️/❌  | [Finding]   |
| Cover/thumbnail text| ✅/⚠️/❌  | [Finding]   |

OVERALL SCORE: [X/10]
PRIORITY FIXES: [Top 3]

==================================================
SECTION 2 — DETAILED FINDINGS
==================================================

TITLE ANALYSIS
Current: "[existing]"
Chars: [N] (ideal: 60-70)
Keyword position: [where or "absent"]

DESCRIPTION ANALYSIS
Word count: [N] (ideal: 150-200)
Keyword in sentence 1: Yes / No

HASHTAG ANALYSIS
Count: [N] (ideal: 3-5)
#Shorts present: Yes / No
Placement: [description vs title]

==================================================
SECTION 3 — REWRITTEN METADATA
==================================================

① REWRITTEN TITLE (Primary)
[60-70 chars]
Character count: [N]/70

② REWRITTEN TITLE (A/B Variant)
[Different hook]
Character count: [N]/70

③ REWRITTEN DESCRIPTION (150-200 words)
[Keyword in sentence 1, hashtags on final line]

④ REWRITTEN TAGS (5-8)
[tags]

⑤ REWRITTEN HASHTAGS (3-5, #Shorts included)
#Shorts #Tag2 #Tag3

⑥ CROSS-POST CAPTION (if applicable)
[60-150 words, keyword in first 125 chars]

⑦ COVER/THUMBNAIL TEXT
"[3-5 word overlay]"

⑧ PINNED COMMENT
[Rewritten comment]

==================================================
SECTION 4 — ACTION PLAN
==================================================

Step 1 — Do immediately:
  □ Replace title, description, hashtags, tags
  □ Move hashtags out of title into description if needed
  □ Update cover frame if flagged

Step 2 — Check in 7 days:
  □ Monitor retention/completion rate
  □ If impressions up but completion flat, fix hook first

==================================================
```

---

## Build the output

Now assemble the output. Deliver only what the user asked for:

- **Full package**: Use your mode's template, fill every numbered section
- **Single item** (title/description/tags only): Deliver just that + anything naturally attached (e.g., description should include its hashtags and chapters; title should include its A/B variant)
- **Only say what they need** — don't dump sections they didn't request

Reference the rules by section:
1. **Title** → Title Rules
2. **Description** → Description Structure
3. **Tags** → Tags Strategy
4. **Hashtags** → Hashtag Rules
5. **Chapters** → Chapters / Timestamps Rules
6. **Geo/Local** → Geo / Local SEO Rules

Then run the Quality Checklist below.

---

## Quality Checklist — run before sending

### Completeness
- [ ] All numbered sections in the matched mode are present with real content
- [ ] Chapters: 6-10 markers, not more

### Research
- [ ] Target keyword confirmed (or proposed + confirmed)
- [ ] Step 1 search batch run — secondary keywords from real results
- [ ] Current year from today's date
- [ ] No fabricated search-volume or view-count claims
- [ ] Superlative claims verified or marked `[VERIFY: ...]`

### Title
- [ ] 60-70 characters, counted exactly
- [ ] Target keyword in first 5 words
- [ ] One emotional hook; A/B variant uses a different angle

### Description
- [ ] Target keyword in sentence 1
- [ ] All 3 blocks present; 700-900 words (video) / 800-1,000 (podcast)
- [ ] Chapters/timestamps pasted inside description
- [ ] Real links from Step 2 (or `[ADD: ...]` markers)
- [ ] Hashtags on final line only

### Tags & Hashtags
- [ ] 15-20 tags, under 500 chars, all 7 types represented
- [ ] No hashtag symbols in the tags field
- [ ] 5-8 hashtags (3-5 for short-form), CamelCase, strongest 3 first
- [ ] Hashtag set differs from recent uploads

### Chapters & Geo
- [ ] Starts at 0:00, 6-10 sections, keyword-aware titles
- [ ] Geo mentioned 2-3 times (if applicable)

### Extras
- [ ] Thumbnail text, cards/end screen, playlist note, pinned comment all included
- [ ] Podcast episodes: guest placement, platform links, sponsor disclosure, episode numbering
- [ ] Short-form: 3-5 hashtags, #Shorts included, no chapters, cross-post caption if applicable

---

## Failure Modes

| Mistake | Correct approach |
|---|---|
| Generating tags/keywords from memory | Run Step 1 research batch first |
| Inventing search-volume or view-count numbers | Never state unverified numbers; use directional language |
| Hardcoding a year from training data | Use today's actual date |
| Description full of placeholders | Run Step 2 for real links first |
| Title is 71+ characters | Count exactly; cut filler |
| Description under 400 words | Must hit 700-1,000 words |
| Hashtags in tags field | Tags = keywords; hashtags in description only |
| All tags are one-phrase variants | Use all 7 tag types |
| 0:00 chapter missing | YouTube ignores all chapters without it |
| Geo skipped for local content | Always include for location-specific content |
| A/B title is just reworded | Must test a genuinely different hook |
| Pinned comment is "Check out my video!" | Include keyword + value teaser |
| Podcast title omits searchable guest name | Lead with guest name if people search for it |
| More than 10 chapter markers | Merge adjacent topics |
| Unverified superlative stated as fact | Verify or mark `[VERIFY: ...]` |
| Assuming a specific tool name for search/fetch | Use whatever your host calls these |

---

## Examples

**Video, new upload:** User says "uploading a video about how farmers in Nepal can use mobile apps to sell vegetables directly." → Confirm target keyword ("sell vegetables online Nepal"), run Step 1, produce Mode A package — title, A/B variant, 800-word description with geo signals, 18 tags, 7 hashtags, 8 chapters, thumbnail text, cards, playlist note, pinned comment, end-screen script.

**Podcast, existing episode, underperforming:** User says "My episode with [guest] has barely any views, here's the URL." → Fetch URL, confirm target keyword, produce Mode D audit — scorecard, detailed findings, rewritten metadata, action plan.

**Short-form, new clip from a podcast:** User says "Cut a Short from the Antigravity Awesome Skills part of that episode." → Mode E: reuse episode's keyword and tags, 60-70 char title, 150-200 word description, 3-5 hashtags including `#Shorts`, cross-post caption.

---

## Limitations
- Use this skill only when the task matches the scope described above
- Do not treat output as a substitute for platform-specific validation, testing, or expert review
- Stop and ask for clarification if required inputs, permissions, or success criteria are missing
