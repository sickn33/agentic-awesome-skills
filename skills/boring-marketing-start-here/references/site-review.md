# Site review engine: shared by Audit and Prospect

One procedure, two callers. `/boring-marketing-start-here audit` runs it on the active brand's own URL;
`/boring-marketing-start-here prospect <url>` runs it on someone else's. Nothing here is a new skill: the
engine composes three modes that already exist and ranks what they find.

## Inputs

- `url`: the homepage. Audit: `brand.yaml` url. Prospect: the URL given.
- `mode`: `audit` | `prospect`.
- `goal`: audit: the goal word on line 1 of `./brand/stack.md` (recorded at first run);
  prospect: the one question ("what would you sell them first?") or infer from the site's
  own offer and say so. Goal words are route.py's: traffic, leads, convert, authority,
  launch, unsure, and for a local business found, chosen, calls (agency: clients).
- Local evidence (audit only): the project scan from SKILL.md First Run: `README.md`,
  `MARKETING.md`, `docs/`, `content/`, `copy/`, `emails/`, site source. Read before the
  live fetch and tagged as local docs in the notes file. Unpublished local plans are
  intent, not fact.

## Steps (∥ = dispatch in parallel as Task agents of type `boring-marketing:research`: files + web only, no connectors; `general-purpose` only if that type is unavailable; wall-clock is the slowest branch)

1. ∥ **/boring-marketing-landing-page TEARDOWN** on the homepage and on the one page the goal implies:
   leads → the opt-in page; convert → the pricing or offer page; traffic or authority →
   the best content page you can identify; launch → the product page; a local business →
   the page its ads or Google profile open, read with the /boring-marketing-first-screen-check method on
   a phone viewport (number, promise and proof on the first screen); unsure → homepage
   only. Each teardown returns its section-by-section score, the 7-dimension copy score,
   and a rewrite plan ranked by leverage. Those scores are working data: they go in the
   notes file, with the scrape date, and never in the report.
2. ∥ **/boring-marketing-ai-search AUDIT, compressed**: Phases 1-3 only (~10 money queries; skip Phase 4
   winner diagnosis). Audit: build the query list from `keyword-plan.md` or `positioning.md`
   exactly as the mode does. Prospect: derive it from the site's own headline and category;
   the competitor set comes from step 3, so the mode's one competitor question is never
   asked. Record CITED / MENTIONED / ABSENT per query and the cited domains.
3. Competitor context, by mode:
   - a local business, either mode → one search for `<trade> <town>`: the map pack and
     top results, each with rating and review count when visible. That is the competitor
     set and the review gap in one read.
   - audit → if `./brand/competitors.md` exists and is ≤ 90 days old, read its positioning
     map and note where the site's live claims now sit (saturated / contested / white
     space). Older or missing → skip with one line naming /boring-marketing-competitive-intel as the fix.
   - prospect → **/boring-marketing-competitive-intel TEARDOWN, single target**: the Phase 2 six-surface
     evidence pack (homepage messaging, pricing, lead magnets, paid ads, recent launches,
     AI-citation presence) on the prospect's own domain (the prospect is the competitor
     being torn down), plus the same pack on 2-3 peers found from its category. No roster
     question; no `competitors.md` is written.
4. **Rank the gaps** by impact on the stated goal × ease. One line per gap: what, the
   evidence in plain words, the fix, an honest wall-clock estimate. The skill that does
   the fix goes in the notes file and in the chat's What's next, never in a proposal.

## Output

- **audit** → `./campaigns/audit/audit-<YYYY-MM-DD>.md` with three sections: Snapshot
  (what the site says, sells, and proves; share of model), Top 3 priorities, All gaps,
  then a Sources and assumptions note (5 lines at most). The working data goes to
  `./campaigns/audit/notes-<YYYY-MM-DD>.md`: the baseline for the next audit (the query
  list and per-query states, verbatim, so the next audit and the citation monitor can
  diff), the teardown scores, the evidence and its source labels. Register the audit
  with one line in `./brand/assets.md`. Skip if the asset hook already did. Present the
  Top 3 in chat, nothing else.
- **prospect** → `./campaigns/prospects-<slug>/proposal.md` from `proposal-template.md` (Findings,
  Gaps ranked, Proposed 90-day plan in plain deliverables, What we'd need from you, a
  short Sources and assumptions note). The prospect reads it, so it names no skills,
  tools or scripts. Working files from steps 1-3 (teardown scores, evidence, the
  skill that fixes each gap) also live under `./campaigns/prospects-<slug>/notes.md`,
  never `./brand/` or `./brands/`. No pricing.

## Honesty rules (hard)

- In the notes file every number is `LIVE` with a source, `LOCAL DOCS` with a path, or
  `MODEL KNOWLEDGE` marked as such; the report's note says in plain words which is which.
  Estimates carry `~`. No invented traffic, revenue, or conversion figures.
- A surface you could not fetch is `NOT FOUND (checked: <urls>)` in the notes, never
  assumed; the report says so in one line.
- Prospect proposals contain no pricing and promise no outcomes; the "what we'd need from
  you" list replaces guesses about their numbers.

Wall-clock: audit ~15-25 min, prospect ~20-30 min, the slowest agent, not the sum.
