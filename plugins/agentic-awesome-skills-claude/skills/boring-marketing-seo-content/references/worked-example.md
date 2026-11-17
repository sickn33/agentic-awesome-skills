# Worked example: from a keyword brief to a saved article

This is an illustrative workflow, not a completed research run. Bracketed values are placeholders. Do not publish them, and do not say the piece rests on live research unless Phase 1 and Phase 1.5 actually gathered live evidence. Phases 1 and 1.5 below show working notes (they go in the notes file). Only the last section shows what the client sees.

## Starting context

```text
Target keyword: "[target keyword]"
Search intent: [informational / commercial / other]
Content type: [guide / comparison / how-to / other]
Audience: [specific reader]
Unique angle: [real experience, original research, or a specific point of view]
Real experience available: [what the user can substantiate]
```

Sample context, for the sample business Hartline Plumbing, Dallas TX (illustrative, not a real research run):

```text
Target keyword: "water heater replacement cost dallas"
Search intent: commercial, price research
Content type: price guide
Audience: a Dallas homeowner whose water heater just failed
Unique angle: a real price range from the business's own recent jobs, with what moves it up or down
Real experience available: the owner's job records (the user supplies them; never invented)
```

## Phase 1: SERP Reality

Run the target keyword and its useful variations. Fan out one evidence pack for each selected result. The sample below is a working note, not client text, and shows the shape of the evidence, not actual findings.

```text
SERP REALITY: "[target keyword]"

[URL]
- H2/H3 map: [captured headings]
- Schema: [types found]
- Dates shown: [publish / update dates shown]
- Answer blocks: [what the page answers directly]
- Evidence it uses: [attributed facts or examples]
- Gap: [what the page misses, gets wrong, or cannot say]

Classic SERP gap: [evidence-backed gap the article can address]
```

If live scraping is unavailable, say so plainly. A fallback is described in the Sources and assumptions note as resting on general knowledge, to verify before publishing, and is never presented as live research.

## Phase 1.5: AI Surface Analysis

Capture the answer surface and citations for the target query, then compare useful conversational phrasings. Keep the classic SERP gap and AI citation gap separate.

```text
AI SURFACE: "[target keyword]"
AIO present: [yes / no]
Cited: [domain → claim supported → why it appears useful]
Variant phrasings cited: [differences observed]
Citation gap: [what no cited source supplies yet, grounded in the evidence]
```

## Phase 2: Brief and structure

Turn the evidence into a brief (working notes, saved with the notes file). Every promise in the outline needs a source, a user-provided fact, or a clearly marked question to resolve.

```text
Working title: [direct answer plus distinct angle]
Primary keyword: [target keyword]
Secondary concepts: [terms that belong naturally]
Reader: [specific audience]
Unique edge: [real experience or original evidence]
Questions to answer: [captured questions]
Classic SERP gap to address: [gap]
AI citation gap to address: [gap]
Internal links: [real URLs from a sitemap or local site materials]
CTA: [one appropriate next step]
```

Sample coverage map for the sample price guide (illustrative, not a real research run):

```text
Angle: the cited answers quote national averages and a two-year-old cost survey. Hartline can
publish what water heater replacement actually cost its Dallas customers, from its own jobs.
Where the answer comes from today: two national cost sites and one forum thread. A table with
a real local range and what moves it wins the lift.

Questions, grouped by the job they do
  Budgeting ("how much should I expect to pay?")
    "how much does water heater replacement cost in dallas"   Search Console  table   GAP: answer incomplete, cited sources give national averages only
    "tankless vs tank water heater cost"                      People Also Ask comparison  covered well by two guides
  Deciding repair or replace
    "is it worth repairing a 12 year old water heater"        AI-native       direct  GAP: brand absent from 3 of 3 observed answers
  Avoiding surprises
    "do you need a permit to replace a water heater in dallas" derived        direct  not checked; the city's permit page is the source

Depth benchmark: the two cited cost pages carry 6 and 9 standalone answers and one price table
each, around 1,400 words. Match the answers and the table; the words follow.

Claim contract
  May say: "We replace tank and tankless water heaters across Dallas, Garland, Mesquite and Richardson."
  Must not say: "Dallas's most trusted plumber"; any guarantee the owner hasn't written down.
  Needs checking first: the price range (needs the owner's export of the last 12 months of jobs),
  "same-day replacement" (owner to confirm how often it's true).
Open items: the job export; one customer story of repair versus replace, with permission.
```

Example outline:

```text
H1: [clear answer-oriented title]
Opening: [direct answer in the first paragraph]
H2: [first reader question]
  Answer block: [self-contained answer]
  Evidence: [user-supplied fact or attributed source]
H2: [second reader question]
  Answer block: [self-contained answer]
  Evidence: [user-supplied fact or attributed source]
H2: [the unique angle only this brand can support]
FAQ: [remaining relevant questions]
CTA: [next step]
```

## Phase 3: Draft

Draft from the brief and the loaded voice profile. The opening answers the query before expanding it:

> [Target keyword] means [plain-language answer]. For [specific reader], it matters because [user-supported consequence]. This article explains [what the reader will be able to decide or do].

Under each major heading, write an answer-first block that can stand alone. Add examples, experience, and numbers only when the user supplied them or a source supports them. Use a placeholder rather than manufacturing proof:

```text
[Real example or attributed fact needed here before publication.]
```

## Phase 4: Humanize

Load `references/humanize.md`, then make the draft sound like the actual author: remove generic phrasing, vary the rhythm, and add only real experience. Keep answer blocks direct; let the surrounding prose carry the voice.

## Phase 5: Optimize

Check the two tracks silently before saving (an internal pass, never shown to the client):

```text
Classic on-page
- [Primary keyword appears naturally in the required places]
- [Headings match intent and the captured questions]
- [Internal and external links are real]

Citation engineering
- [Each major section has a self-contained answer block]
- [Every original fact is user-supplied or attributed]
- [Names are consistent and unambiguous]
- [Freshness claims are verified]
```

## Phase 6: Schema

Add only the schema the finished article supports:

```yaml
schema:
  Article: [headline, description, dates, main page]
  Person: [real author name and profiles]
  Organization: [real publisher name, URL, and logo]
  FAQPage: [only when the article has a real FAQ]
```

## Save paths and what the client sees

On a real run, save the finished draft and the working notes to:

```text
./campaigns/content/{keyword-slug}.md
./campaigns/content/{keyword-slug}.notes.md   # Phase 1 and 1.5 evidence packs
./brand/assets.md                              # append the saved asset entry
```

The chat output is the passing work, one short note and the next steps. No data tag, gate score, tool names or evidence packs (sample, illustrative):

```markdown
## SEO ARTICLE: Water heater replacement cost in Dallas
Nov 16, 2026 · for the Hartline Plumbing price guide (sample business)

**The piece:** a price guide built on a real local range from the business's own jobs. The pages ranking now quote national averages, so a dated Dallas range with what moves it is the edge.

**Before you publish:**
- Confirm the price range against the last 12 months of jobs (it holds a placeholder until then).
- Add one repair-versus-replace customer story, with permission.
- Ping IndexNow on publish and check that OAI-SearchBot is allowed in robots.txt.

**Sources and assumptions:**
- Built from 6 ranking pages read in full and the AI answers for 3 phrasings, Nov 16.
- No job data supplied yet, so the cost section quotes cited ranges, marked as such.
- Not checked: Gemini answers. Send the job export and the cost section becomes the only local price data on the page.

**Files saved:**
- ./campaigns/content/water-heater-replacement-cost-dallas.md (new)
- ./campaigns/content/water-heater-replacement-cost-dallas.notes.md (new)
- ./brand/assets.md (1 entry appended)

**What's next:**
- /boring-marketing-content-atomizer: social posts from the article (~10 min)
- /boring-marketing-ai-search: check who AI assistants name for the cost questions (~20 min)
```

This example creates no actual article or research result.
