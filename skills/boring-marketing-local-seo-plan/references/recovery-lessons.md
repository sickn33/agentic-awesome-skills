# Recovery lessons: reading a slide before fixing it

Load when a local business says it's "dropping on Google", before promising any recovery, and when setting up the monthly scoreboard. These lessons come from recovery work on real local service sites, anonymized. Hartline Plumbing, Dallas TX is a sample business, and any number below is illustrative.

## Diagnose in one page first

A slide usually has more than one cause, and each cause needs a different fix. Write one row per suspected force, with the evidence and a verdict of **directly proven**, **present** or **hypothesis only**:

| Force | Evidence | Verdict |
|---|---|---|
| Non-brand rankings fell | Fixed non-brand cohort lost average position in two steps, with no site change on either date | Directly proven |
| Brand searches fell | Brand cohort impressions collapsed while its position improved, the month ads were paused | Present, a demand effect, not an SEO defect |
| Map pack is taking the clicks | Organic clicks fell while profile call taps hit a record | Hypothesis only until a grid check confirms it |

Search Console can't see map pack clicks, so absorption stays a hypothesis until you check the map pack from the towns that matter. Say so in the plan.

## Five checks that stop a wrong fix

1. **Brand versus ads.** When ads are cut, brand searches fall with them. A brand cohort whose impressions drop while its position holds or improves lost demand, not rankings. Declare recovery on the non-brand cohort only.
2. **Serving loss versus rank loss.** A query whose impressions vanish while its position improves stopped being shown for that query (a new map pack or AI Overview took the space). That's a format problem, not a page problem.
3. **Rule out your own changes before rolling anything back.** Read the deploy history, inspect the URL in Search Console and the rendered HTML for the dates of each drop. If nothing changed on those dates, the drop was external, usually an update hitting quality liabilities that were already there. Don't revert analytics-only changes on a hunch.
4. **Map pack absorption.** Organic down, profile calls up, and a map pack on most of the money results: the clicks moved, they didn't disappear. Use conservative click-through assumptions for any "recovered clicks" estimate, because a map pack above the results eats most of them.
5. **Which page should win each query.** Read Search Console page by query at the exact query. A homepage ranking around #3 for "[service] [town]" while the town page sits near #30 splits the signal. Fix it with titles, headings and internal links (the homepage speaks regionally, the town page leads with the town, links using the town and service point at the town page), never with a canonical from one page to another.

## Truth liabilities that sit on a site waiting for an update

Each of these was found live on a local service site, and each is the kind of thing an update punishes:
- a price range in FAQ text and markup the business didn't charge;
- a perfect star rating typed into the markup of every page;
- a separate business entity per town page, with invented addresses and blank coordinates;
- town pages that were the same page with the town name swapped;
- a page promising service in a state the business doesn't serve, left over from an old ad campaign;
- thank-you and status pages open to indexing; a sitemap claiming every page changed at every build.

The fix for markup: one truthful business entity matching the Google profile, town and service pages described with `areaServed` and pointing at that entity, no self-written ratings, and pricing disclosed as its structure (a dispatch fee and a minimum, for example) with no dollar amounts unless the owner publishes them. /boring-marketing-service-area-pages carries the technical checks and the duplicate test.

**Copied town pages that still earn clicks are not mass-deleted.** Triage each: rebuild it with real local substance if it earns, redirect it (both slash variants) to the nearest page you're keeping if it earns nothing.

## The fixed-cohort scoreboard

Rankings for "all keywords" move with the keyword list. Freeze cohorts instead and read them weekly:

| Cohort | What's in it | Read |
|---|---|---|
| Non-brand money terms | The 30 to 60 service and service-plus-town queries that pay | Impressions, impression-weighted position, clicks, the page that wins each |
| Brand | The business name and its variants | Impressions only, to see demand effects from ads |
| Each main town | Its "[service] [town]" queries | Position and the winning page |

Beside them: profile calls and website clicks, and map pack presence from a fixed set of points. Recovery means the non-brand cohort crossing an agreed position, not a better-looking total.

## Listings: consistency beats volume

Write a one-page listing kit first: exact business name, the one tracked phone number, website, address policy (a service-area business hides its address), service area, hours, main category, a short description, a monitored email, logo and photos. Then work in tiers:
1. **Core:** Bing Places, Apple Business Connect, Yelp, Facebook, Nextdoor, the BBB.
2. **The trade's own directories:** the highest-intent listings, and often lead sources in their own right (for an emergency trade, the directories people search when something has just broken).
3. **The long tail:** through a citation builder, bought once. Avoid services that rent listings, which vanish when you stop paying.

A listing counts when it's live, not when it's submitted. Keep a receipt per listing: publisher, direct or through an aggregator, submitted, accepted or live, its public URL, whether the name, phone and address match, duplicates found, and cost per live listing. "Reaches 300 sites" is a syndication promise, not 300 listings.

## Name collisions and copycats

Same-name businesses in other states get merged with yours by directories and AI answers. Every submission carries the name, the town and the phone together. A copycat site publishing your phone number, or an old number living on in old posts, feeds wrong facts into answers. Search the name, every phone number the business has used and the domain once a quarter, and fix what you find at its source.

## The writing trap during a rebuild

Writers told "never invent a fact" fill pages with procedure: how to call, what to have ready, questions about the booking conversation. On one rebuild, both drafting rounds drifted into it. The fix was pointing the writers at the substance of the work itself (symptoms, what gets checked, repair or replace, what waiting costs), which is truth-safe because the business really does it. Then enforce it: at most one short "when you call" block per page, and no question-and-answer entries about the call itself.
