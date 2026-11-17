# Brand Memory

Brand memory is how every skill remembers who the user is, what their brand sounds like,
who they sell to, and what has actually worked. It lives on disk, accumulates over time,
and is loaded selectively: each skill declares what it reads and writes in its
frontmatter, and `brand_context.py` emits exactly that.

---

## Layout

### MARKETING.md: the standing brief

`./MARKETING.md` lives at the workspace root and is user-authored: goals, offers,
constraints, priorities, and a do-not-do list. Every skill loads it first, verbatim;
`/boring-marketing-start-here` offers to write it from the Foundation Report, but it is never required.

### preferences.md: standing preferences

`./brand/preferences.md` is user-authored standing guidance for banned words, refused
channels, tone, review rules, and budget ceilings. `/boring-marketing-start-here` writes it during the
correction pass and for explicit “remember that…” statements; every skill reads it.
It is distinct from extracted `voice-profile.md` and data-written `learnings.md`, whose
single-writer rule remains unchanged.

**Single brand (default):**

```
./brand/
  brand.yaml              <- manifest (see spec below)
  voice-profile.md        <- /boring-marketing-brand-voice
  positioning.md          <- /boring-marketing-positioning-angles
  audience.md             <- /boring-marketing-audience-research
  voc.md                  <- /boring-marketing-audience-research (verbatim customer language)
  competitors.md          <- /boring-marketing-competitive-intel
  creative-kit.md         <- /boring-marketing-creative setup
  keyword-plan.md         <- /boring-marketing-keyword-research
  stack.md                <- /boring-marketing-start-here (tools, keys, MCP servers)
  preferences.md          <- user-authored standing preferences
  algo-cache.md           <- any skill (dated platform facts, TTL'd)
  assets.md               <- append-only registry (all skills)
  learnings.md            <- append-only priors (/boring-marketing-performance-review + explicit user feedback)
  checks.md               <- append-only yes/no checks from the user's edits (any skill)
  gold/<skill>/           <- gold cases: what a skill wrote, what shipped, and why
  .history/               <- auto-versioned prior copies of profile files
```

**Agency / multi-brand mode:**

```
./brands/
  active                  <- plain-text file containing one brand slug, e.g. "acme"
  acme/                   <- full brand dir, same layout as ./brand/ above
  northwind/
```

**Resolution order** (every skill, every run; `brand_context.py --dir` implements it):

1. Explicit `--brand <slug>` argument → `./brands/<slug>/`
2. `./brands/active` pointer file → `./brands/<contents>/`
3. `./brand/` fallback

Switching brands is writing one slug to `./brands/active`. Skills never hardcode
`./brand/` paths: they resolve through this order.

---

## brand.yaml: the manifest

One file the orchestrator can read instead of globbing the directory. Owned by whichever
skill last wrote a profile file: **any skill that writes a profile file updates the
matching `files:` entry (and `updated:`) in the same operation.**

```yaml
# ./brand/brand.yaml
brand:
  name: Hartline Plumbing (sample)
  slug: hartline
  url: https://hartlineplumbing.com
  created: 2026-05-02
  updated: 2026-06-10
  # optional business facts, written by the /boring-marketing-start-here first run (lite or deep);
  # brand_context.py prints this whole brand: block for every skill
  category: plumber
  depth: lite
  phone: (214) 555-0100
  city: Dallas, TX
  service_area: [Dallas, Richardson, Garland]
  services: [water heaters, drain cleaning, slab leaks]
  rating: "4.8 (212 Google reviews, seen 2026-11-13)"

files:
  voice-profile.md:  { updated: 2026-06-08, owner: brand-voice }
  positioning.md:    { updated: 2026-06-10, owner: positioning-angles }
  audience.md:       { updated: 2026-05-14, owner: audience-research }
  voc.md:            { updated: 2026-05-14, owner: audience-research }
  stack.md:          { updated: 2026-05-02, owner: start-here }
  preferences.md:    { updated: 2026-06-10, owner: start-here }

campaigns:
  - name: spring-launch
    path: ./campaigns/spring-launch/
    status: active        # planning | active | complete
    started: 2026-06-01
```

Schema: `schemas/brand-manifest.schema.json` (in this folder). Missing manifest is not an error.
`brand_context.py` falls back to file mtimes for freshness and skills proceed normally.
/boring-marketing-start-here creates it on first run.

---

## Enforcement: frontmatter `reads` / `writes`

The v2 prose table ("which skill reads which file") is gone. The contract now lives in
each skill's frontmatter and is executed by the loader:

```yaml
metadata:
  boring:
    reads: [voice-profile, positioning#chosen-angle, voc, learnings]
    writes: [audience]
```

- Valid tokens: `voice-profile`, `positioning`, `audience`, `competitors`, `voc`,
  `creative-kit`, `keyword-plan`, `stack`, `assets` (append-only), `learnings`
  (append-only), `algo-cache`, `preferences`, `brand-manifest` (= brand.yaml).
- `file#section` anchors load only that `##` section; partial reads keep context lean.
- A skill loads context with one line, only when a brand folder or `MARKETING.md` exists:
  `python3 ${CLAUDE_SKILL_DIR}/../boring-marketing-start-here/scripts/brand_context.py --for <skill-name>`
  The script resolves the active brand dir, reads the skill's `reads:` list, extracts
  anchored sections, and emits one context block with per-file freshness flags.
- A skill writes ONLY the files in its `writes:` list. Reading outside `reads:` is a
  bug; writing outside `writes:` is a worse one.

---

## Reading brand memory

### Graceful degradation (three tiers)

1. **Brand dir exists, file exists** → load it (the script does this) and use it.
2. **Brand dir exists, file missing** → not an error. The context block lists it as
   `absent`. Do not enumerate or announce missing files in the deliverable. If a gap
   changes the work, name it in one line of the Sources and assumptions note. Ask the
   user only the questions that file would have answered, or proceed with reasonable
   defaults, and suggest ONE high-impact next step in What's next ("Running /boring-marketing-brand-voice
   would give me your tone profile for next time").
3. **No brand dir at all** → skip brand loading entirely. Proceed standalone as a
   first-time user and note once: "I don't see a brand profile yet. /boring-marketing-start-here or
   /boring-marketing-brand-voice can set one up, or I'll work without it."

No skill ever breaks because a brand file is missing. The system works on day one with
zero context and gets better with use. (Quick Mode still wins: a specific single-asset
request gets the asset, not a setup lecture.)

### Use loaded context quietly

The work shows what shaped it. No line announces which files were loaded or says "using
your positioning". Stale data still gets caught: when a file is old or conflicts with
what the user says, flag that in one line (the file, its age, the skill that refreshes
it). Anything else about what was loaded stays out of the deliverable.

### Freshness flags

The context block flags each file by age (brand.yaml `updated:` timestamp, else mtime):

| Age | Treatment |
|-----|-----------|
| < 30 days | loaded as-is, nothing said |
| 30 to 90 days | one line only if the file shapes the work: may be stale, sanity-check against the current session |
| > 90 days | recommend refresh: name the owning skill to re-run before relying on it |

If file content conflicts with what the user is saying right now, flag it and ask.
Never silently override brand memory with session context, and never silently override
the session with old memory.

---

## Writing brand memory

### Profile files: auto-version, then overwrite

Profile files (`voice-profile`, `positioning`, `audience`, `competitors`, `voc`,
`creative-kit`, `keyword-plan`, `stack`, `algo-cache`) represent current state. When the
owning skill produces a new version of an existing file:

1. Copy the current file to `./brand/.history/<file>.<YYYY-MM-DD>.md` (same brand dir;
   if a copy from today already exists, suffix `-2`, `-3`, ...).
2. Write the new file.
3. Update the `files:` entry in `brand.yaml`.
4. Show a 3-line summary of what changed ("Primary angle shifted from speed to
   simplicity; added 2 proof points; competitor list unchanged.").

No y/n confirmation. History makes overwrites reversible, so the interrogation ceremony
is gone. Skills never write profile files they do not own (see `writes:`).

Every profile file starts with a `## Last Updated` line carrying the date and the
writing skill. Keep files human-readable: a marketer should understand any brand file
in a text editor without running a skill.

### The taste loop: checks.md and gold/

When the user edits a skill's work, the skill saves a gold case and one to three yes/no
checks, and every later run of that skill answers those checks before handing work over.
The loader prints the checks tagged for the running skill (plus `all`) and its three
newest gold cases, right after `preferences.md`. Full rules: `taste-loop.md` in this
folder. `learnings.md` holds what the data proved and `checks.md` holds what the owner
wants, so the two never mix.

### Append-only files: assets.md and learnings.md

Never overwrite, never truncate, never reorder. Read, then append at the bottom of the
appropriate section. If the file does not exist, create it from the templates below,
then append.

**assets.md**: every skill appends one row per asset created:

```markdown
# Asset Registry

| Asset | Type | Created | Campaign | Status | Notes |
|-------|------|---------|----------|--------|-------|
| welcome-sequence | Email (5-part) | 2026-06-04 | spring-launch | draft | |
| MA-H2-B-9x16-v1.mp4 | Video ad | 2026-06-09 | spring-launch | live | matrix cell MA-H2-B |
```

Status starts at `draft`; the user (or /boring-marketing-performance-review) moves it to `live` /
`retired`. Ad creative is named by its ad-matrix cell ID.

**learnings.md**: written ONLY by /boring-marketing-performance-review (from real data) and by explicit
user feedback; read by every generator, which applies the priors that fit. When a prior
changed the work, one line in the Sources and assumptions note says so ("Question
subjects beat curiosity subjects in your Apr data, so the lead subject is a question");
a prior that changed nothing is not mentioned. Structured entry format, one line each:

```markdown
- [2026-06-10] [email-sequences] subject-pattern=question outperformed curiosity 2.3x (n=4 sends, source: kit-api)
- [2026-06-08] [content-atomizer] linkedin carousel > text post for reach, 3.1x median (n=6 posts, source: linkedin-csv)
```

`[date] [skill] finding (n=sample, source: where-the-number-came-from)`. Specific and
actionable: not "emails worked well" but the pattern, the magnitude, and the sample.
Sections: `## What Works`, `## What Doesn't Work`, `## Audience Insights` (default when
unsure), plus `## PRIORS` (see compaction).

### Learnings compaction protocol

When learnings.md exceeds ~50 entries, /boring-marketing-performance-review compacts:

1. **Promote** durable, repeatedly-confirmed findings to a `## PRIORS` section at the
   top: one line each, with the supporting entry dates ("proof-style subjects beat
   question-style for this list, confirmed 2026-03, 2026-05, 2026-06").
2. **Merge** duplicate or near-duplicate entries into the strongest single entry
   (keep the largest sample / most recent data).
3. **Archive** stale or superseded entries to `./brand/.history/learnings.<YYYY-MM-DD>.md`,
   moved, never deleted.

Generators read PRIORS first; raw entries are the evidence trail beneath them.

---

## voc.md: voice of customer

Owned by /boring-marketing-audience-research. Verbatim customer language with provenance: quoted, never
paraphrased, by /boring-marketing-direct-response-copy, /boring-marketing-positioning-angles, /boring-marketing-lead-magnet, and
/boring-marketing-email-sequences ("use their words" with a data source). Schema:
`schemas/voc.schema.json` (in this folder).

```markdown
# Voice of Customer
## Last Updated: 2026-06-10 by /boring-marketing-audience-research

## Pains
- "I'm spending my whole Sunday building proposals that don't even get answered" · https://reddit.com/r/freelance/... (2026-05-22)

## Desires
- "I just want a template I can send in 10 minutes that doesn't look like a template" · https://g2.com/... (2026-04-30)

## Objections
- "Every one of these toolkits is the same recycled Notion doc" · https://x.com/... (2026-05-12)

## Vocabulary
- "feast or famine", "scope creep", "anchor client": community shorthand; use as-is in copy
```

Every entry: verbatim quote, source URL, date. No invented quotes. An empty section
beats a fabricated one.

---

## algo-cache.md: dated platform facts

Per-brand cache of perishable facts (algorithm behavior, platform specs, format weights)
that skills refresh instead of trusting baked-in knowledge. Entries carry the freshness
header (a `last-verified` date, a `ttl-days` number and a refresh instruction):

```markdown
# Algorithm & Platform Cache

## linkedin-formats
last-verified: YYYY-MM-DD · ttl-days: 60 · refresh: <instruction, e.g. web search "LinkedIn algorithm format weighting <current month year>">
- Carousels #1 format; dwell ≥5s gate; first 60 min ≈ 70% of reach.
```

At use time, check staleness by comparing `last-verified` plus `ttl-days` with today's date. Stale → refresh via the stated instruction, update the entry, and say
so in one line: "Refreshed LinkedIn facts (cache was 94 days old)." Perishable facts
never live in SKILL.md bodies.

---

## Campaigns (not brand memory, but referenced by it)

Time-bound projects in `./campaigns/<kebab-name>/` with a `brief.md` (schema:
`campaign-brief.schema.json`); brand memory is the persistent context they draw on.
Skills creating campaign assets write the asset to the campaign dir, append a row to
assets.md, and register the campaign in brand.yaml `campaigns:`.

---

## Research Quality Signal

Skills that depend on external data (competitor analysis, SERP research, keyword
volumes, trending topics, news) MUST declare their research mode. The user always knows
whether they are getting live data or conceptual analysis.

Declare it once per deliverable, in plain words, in the Sources and assumptions note at
the end (never in the header, never on every line or row):

- Live: "Based on 6 sources read on Nov 13." Web search, scraping or APIs were used.
- Model knowledge: "No research tools were available, so this rests on general
  knowledge. Verify before spending." The analysis is conceptual and directional.

Files inside `./brand/` are working memory, so they may carry the short form
(`Data: LIVE (6 sources)` or `Data: MODEL KNOWLEDGE`) for the next skill to read.

Rules:

1. Always say it, once. Never silently fall back to conceptual data.
2. When using conceptual data, flag the specific claims that would benefit from
   verification: "Estimated: competitor X likely ranks for this term (verify with a
   live SERP check)."
3. Ask before proceeding on estimates: "I don't have web search connected. I can give
   you a conceptual analysis, but live data would be more accurate. Proceed, or set up
   web search first?"
4. If the user proceeds, prefix research-dependent numbers with `~`:
   `~2,400 monthly searches`, not `2,400 monthly searches`.

---

## Voice Injection Protocol

When voice-profile.md is loaded, the skill output **demonstrates** the brand's voice:
it does not just acknowledge it.

**Wrong, acknowledging voice:** "I see your brand voice is confident and direct. Here
are your positioning angles:" followed by generic-sounding output.

**Right, demonstrating voice:** no announcement at all. The output starts at the header
and is written IN that voice: short sentences if the profile says short sentences, brand
vocabulary throughout, none of the banned words anywhere.

Rules:

1. If the profile says "short sentences," use short sentences in the output itself.
2. If the brand avoids certain words, those words appear nowhere in the output.
3. Nothing announces that the voice profile was loaded.
4. This applies to ALL content sections: analysis and recommendations included, not
   just copy deliverables.

---

## Principles

1. **Human-readable first.** JSON/YAML mirrors are secondary to markdown a marketer can read.
2. **Graceful degradation.** Zero context works; context enhances, never gates.
3. **Quiet context use.** The work shows what shaped it; no line announces what was
   loaded. A stale or conflicting file gets one flag line.
4. **Append, don't destroy.** Learnings and assets accumulate; profile files version to
   `.history/` before overwrite; nothing is ever silently deleted.
5. **Declared access.** `reads:`/`writes:` frontmatter is the contract; the loader
   enforces it.
6. **Cross-skill coherence.** Voice written by /boring-marketing-brand-voice is honored by every other
   skill; brand memory is the shared source of truth.
7. **Learnings come from data.** /boring-marketing-performance-review writes priors from real numbers;
   generators apply the priors that fit and note a prior only when it changed the work.
   No honor-system feedback interviews.
