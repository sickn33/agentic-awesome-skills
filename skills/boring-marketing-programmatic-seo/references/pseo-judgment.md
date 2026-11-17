# PSEO Judgment: Failure Patterns, Policy Line, Winning Archetypes

last-verified: 2026-09-02 · ttl-days: 180 · refresh: web-search "Google scaled content abuse enforcement [current year]" and "site reputation abuse update [current year]"; update the policy section below and this date.
changes: 2026-09-02. Policy wording aligned to the current spam-policies page; 2026 update cadence added (Mar spam + core, May core, Jun spam, Aug spam); "site reputation abuse" renamed "site reputation policy" with four explicit criteria and an EEA-only enforcement change (Aug 28 2026); spam policies now stated to apply to AI answers (May 2026); AI-surface section updated with Google's May 2026 generative-AI guide and 28-day citation persistence data.

Load this file during Phase 1, before issuing a GO/RESHAPE/NO verdict. The verdict is a
pattern-match against what has actually failed and actually worked, not a vibe.

---

## How PSEO actually fails

**1. Find-replace doorways.** The same 800 words with the modifier swapped: "Acme is
the best CRM for {dentists|plumbers|florists} because it saves you time." No fact on
the dentist page is dentist-specific. This is the modal PSEO failure. It ships fast,
looks like a library, and is exactly what Google's classifiers and any human on page 2
recognize instantly. The tell during validation: you can write the template's body
without looking at the dataset. If the prose works for every row, the prose is the
whole page and the dataset is decoration.

**2. Thin local pages.** "[Service] in [City]" with the city name injected into
boilerplate, a generic stock photo, and no presence in that city. Local PSEO without
local facts (real coverage, real data about that market, real availability,
city-specific pricing or regulation) is the doorway-page playbook Google has penalized
since 2015. If the business can't truthfully say something different about Tulsa than
about Akron, it doesn't get a Tulsa page.

**3. Modifier inflation.** A pattern with 40 real modifiers stretched to 600 because
the dataset technically has 600 rows. The long tail of rows has empty uniqueness
fields, so pages 41-600 are padding, and they don't just earn nothing, they dilute
the crawl priority and quality signals of the 40 that work. Scope is a quality lever:
the cut from 600 to 60 is usually the single highest-leverage decision in the project.

**4. Orphan dumps.** Hundreds of pages added with no hub, no internal links from the
existing site, sitemap-only discovery. They index slowly or never, and the ones that
do index have no architectural signal of importance. PSEO is an information
architecture, not a CSV-to-URL converter.

**5. Stale-on-arrival data.** Scraped pricing/feature data with no `last_verified`
column and no refresh plan. Six months later the pages are confidently wrong, users
notice, and the brand wears it. Wrong facts are worse than thin pages: thin pages get
ignored; wrong pages get screenshotted.

**6. Cannibalizing the modifiers.** Two pages in the set (or a set page and an existing
editorial page) targeting intents that the SERP treats as identical: "x vs y" and
"y vs x", or "[city] plumber" and "plumber in [city]". One intent, one page. Check
existing site coverage before generating.

## The policy line (and how to stay on the right side)

Google's **scaled content abuse** policy (March 2024, folded into the spam policies)
targets generating "many pages for the primary purpose of manipulating search rankings
and not helping users," and it is explicitly method-neutral: generative AI, scrapers,
synonymizing/translating transforms, stitched content, multi-site networks, and
humans-at-scale are all named. Enforcement through 2025-26 is both algorithmic
(site-wide quality classifiers; penalties hit the domain, not just the offending
section; the 2026 cadence alone was March spam + core, May core, June spam, and August
spam updates) and manual (pure-spam actions, plus **site reputation policy**
enforcement (Google dropped "abuse" from the name in Aug 2026) for third-party
content parasiting a host's ranking signals). Several high-profile sites lost
effectively all search traffic to manual actions in 2024-2025; recoveries took
quarters, not weeks. Two 2026 clarifications matter for PSEO:

- **Spam policies apply to AI answers** (May 2026): a library that would be spam in
  the ten blue links is spam in AI Overviews/AI Mode too: there is no separate,
  softer bar for "AI visibility" pages.
- **Site reputation criteria are now explicit** (Aug 28, 2026): presentation
  consistency with the host, content quality relative to the rest of the site,
  authorship clarity, and duplication across sites. Google presumes new pages match
  the domain's overall quality, which is exactly why a thin library drags the whole
  domain down. In the EEA the remedy changed (offending sections are ranked on their
  own merits instead of taking a manual action); everywhere else the manual action
  still lands.

What keeps a library on the right side: these are the policy's own carve-outs, and
they are exactly this skill's gates:

- **Unique data per page.** The page exists to deliver facts that exist nowhere else
  in the set. Scale with data is a directory; scale without data is spam. Google's
  guidance has always exempted genuinely useful database-driven sites (flight routes,
  weather, listings) because each page answers a real distinct query.
- **The genuine-utility test.** For any page, ask: if search engines didn't exist,
  would anyone want this page? An integration page a customer bookmarks during setup
  passes. A "best CRM for left-handed dentists" page that exists only to catch a query
  fails.
- **Ramp proportional to the domain.** Publishing velocity wildly out of proportion to
  the site's history is a classifier feature. Batches, indexing checks between
  batches, months not nights.
- **Prune as policy.** The cull-or-improve rule (0 impressions at 60 days → enrich,
  consolidate, or remove) is not housekeeping; index bloat is itself a site-wide
  quality signal.

## Archetypes that win

Pattern-match the candidate against these. Each wins for the same reason: the dataset
carries facts a generic writer couldn't produce.

**1. Integration pages**: "Connect {YourProduct} to {Tool}". Per-row facts: synced
fields/objects, trigger and action lists, auth method, setup steps with real
screenshots, plan requirements, known limits. First-party by definition (it's your
integration), so uncopyable. Bonus: these pages convert, because the searcher already
uses both tools. The strongest default archetype for any product with an ecosystem.

**2. Comparison matrices**: "{A} vs {B}" or "{Competitor} alternatives", generated
from a real feature/pricing dataset. Wins only when the matrix data is genuinely
collected (scraped + verified per row, dated), the verdict is honest per pairing (the
answer-first block names who wins for whom; a comparison that always crowns the
house product reads as the ad it is), and pairings are limited to ones people actually
compare. These are heavily cited by LLMs answering "X vs Y" questions. A pairing earns
a verdict only when each side has at least two facts across at least two of the
dimensions the reader weighs; below that, the page shows the matrix and says the
verdict is pending, or the pairing waits.

**3. Location pages with real local data**: wins only above the thin-local bar:
market-level stats (real prices, counts, wait times in that metro), city-specific
regulation or availability, local inventory or coverage, locally distinct FAQs.
Marketplaces and anyone with per-market supply data do this legitimately; a 5-person
agency "serving" 200 cities cannot.

**4. Glossaries with original examples**: "{Term} explained" across a domain's
vocabulary. Definitions alone are a doorway farm with a dictionary's haircut; the
uniqueness fields are an original worked example per term, a misconception note, how
the term shows up in the product, and term-to-term links that teach the domain's
structure. `DefinedTerm` schema; extremely extractable by LLMs, which is most of the
2026 payoff.

**5. "For {persona}" pages**: "{Product/category} for {industry|role}". The
uniqueness fields are persona-specific workflows (the 3 jobs THIS persona does with
it, in their vocabulary), persona-relevant integrations or templates, objections
specific to that segment, and ideally a customer example per persona. If the dataset
can't say what a property manager does differently from a dental office, this
archetype collapses into failure pattern #1; it has the highest find-replace risk of
the five, and the highest payoff when the workflow data is real.

## AI-surface opportunity (September 2026)

- Long-tail LLM citations remain a PSEO upside when a page carries distinct data and
  answers a real modifier query: patterns people ask assistants ("best <x> for
  <modifier>") can be valid targets even when classic search volume reads near zero.
- Google's May 2026 guide on generative AI features sets the bar in this skill's own
  words ("unique," "non-commodity," people-first content) and says no special markup,
  llms.txt, or chunking is required. A library passes the AI bar for the same reason it
  passes the spam bar: per-row facts nobody else has.
- Citations churn fast (only ~11% of cited URLs persisted across 28 days in a Jul 2026
  five-engine study), so a library's AI upside is a maintenance stream, not a launch
  event: the refresh column and the prune rule are what keep it.

## Calibration: one pass, one fail

**Pass (illustrative):** a scheduling tool's "for {industry}" set, 35 industries, each
row carrying: top 3 booking workflows for that industry (from first-party usage
tagging), 2 industry-specific integrations, average booking lead time for that segment
(say 4.2 days, from product data), and one named customer quote. Page 7 (med spas)
teaches no-show-fee workflows that page 3 (tutors) never mentions. GO.

**Fail (illustrative):** the same tool's "{city} appointment scheduling software" set,
300 cities. The product is location-independent SaaS; nothing about the product,
pricing, or workflows differs by city. Every uniqueness field would be census trivia
unrelated to the buying decision. NO, and the kill memo says why: no distinct intent,
no possible dataset, classic thin-local.
