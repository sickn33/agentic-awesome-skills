# AEO judgment: what moves citations and what's cargo cult

Load before AUDIT Phase 4 (diagnosis) and before recommending anything in OPTIMIZE. This file is the calibration layer: where the leverage is, how to spot snake oil, and when to tell a client not to bother. Current figures live in `aeo-facts.md` and, for local businesses, `local-ai-facts.md`.

---

## The leverage hierarchy (where an hour of work goes furthest)

1. **Content format dominates.** AI answers are assembled from extractable passages. A page whose heading matches the question and whose first 40 to 80 words answer it on their own gets cited. A better-researched page that buries the answer in paragraph six doesn't. Most visibility gaps close with editing, not new technology.
2. **Original data is the only durable moat.** Format can be copied in an afternoon; a number only you generated can't. Citations to a proprietary number survive churn far better than citations to a well-formatted summary, because the number has exactly one source. If a brand can do one thing this quarter, it's publishing one real stat.
3. **Entity clarity is a disqualifier, not a booster.** Fixing an ambiguous identity (inconsistent names, no Organization markup, anonymous authors) removes a reason not to be cited. It won't earn citations a page hasn't earned on format and substance.
4. **Schema helps at the margin, if at all.** About half of cited pages carry structured data, but so do most professionally built pages, and a matched-control test found no citation lift from adding it. Treat it as cheap attribution hygiene. Anyone selling schema as the AI-search strategy has the hierarchy upside down.
5. **Plumbing (IndexNow, llms.txt, crawler access) is worth exactly its cost.** Minutes of setup, small expected value, except crawler access, which is a prerequisite. Ship it, then stop talking about it.

The diagnostic consequence: when a competitor wins a citation, check format first, data second, entity third, schema last. An audit that concludes "add more schema" without checking the winner's answer blocks has diagnosed in the wrong order.

Three things sit around that hierarchy:

- **On Google's AI surfaces, organic rank comes first.** The most careful study so far held organic rank constant and found most of the apparent effect of schema and entity richness disappeared, while the top organic results got the bulk of the citations (figures in `aeo-facts.md`). So before diagnosing format on a Google question, check where the brand's best page ranks for the search version of it. A page on page three needs ranking work, not answer blocks. ChatGPT and Perplexity retrieve more widely, so rank matters less there.
- **Where the answer comes from sets the lane.** If the answers lean on roundups, threads or reference sites, on-site edits can't close the gap: the work is getting into those sources. If they lean on brand and product pages, the page itself can win. Read the source kinds before choosing between a retrofit and an outreach plan.
- **What the one controlled experiment found.** Adding quotations from named people, original statistics and cited sources lifted a page's visibility in generated answers; keyword stuffing and an "authoritative" tone did nothing or hurt. That's the craft side of formats and data, and it's cheap.

## Snake-oil detection (tools, agencies, guides)

The AI-visibility vendor market is where the SEO vendor market was in 2005. Tells that a tool, agency or guide is selling cargo cult:

- **Recommends HowTo schema** (removed in 2023) or promises FAQ rich results (removed for every site in May 2026). Their facts are years old.
- **Sells a one-time "AI visibility score" with no monitoring.** Most cited URLs don't survive a month. A single score is a photograph of the weather sold as a climate report.
- **Promises guaranteed citations or "rankings" in ChatGPT.** Nobody controls a probabilistic retrieval and generation pipeline. Honest vendors talk odds and drivers.
- **"Proprietary AI-optimization markup" or secret tags.** There is no secret channel. The levers are public: format, data, entities, freshness, distribution.
- **Reports mentions as wins without separating CITED from MENTIONED.** Being described by sources you don't control is exposure, not authority, and it can be negative exposure.
- **Reports a percentage without a denominator.** "You're 40% visible" over which questions, which engines, which city, observed how many times? No denominator, no finding.
- **Topic-level share of voice for a niche or local topic.** Check what the tool resolved the topic to. At that granularity, corpus tools often match the wrong thing (a mobile repair trade read as a consumer product), and the share is about something else.
- **Volume promises** ("500 AI-optimized pages"). Cited pages are dense, sourced and current. Thin programmatic pages are the opposite. For local businesses the same pitch arrives as "a page for every town", which is a doorway page by Google's definition.

## Why businesses with original data win out of proportion

AI assistants answer comparison and how-to questions with sources that supply specifics: numbers, criteria, named tradeoffs. B2B and software companies sit on exactly that raw material (usage data, benchmarks, pricing observations, survey access to a professional audience), and their buyers ask long, specific, high-intent questions where a citation maps to real pipeline. A 50-person software company that publishes one credible annual benchmark can out-cite a much larger competitor that publishes only product marketing, because the assistant needs the number and only one of them has it. Local businesses have their own version: real job counts, real prices paid, real response times in one city. Few publish them, so the few that do get quoted.

## The traffic-quality reframe (set expectations before the audit lands)

Clients anchor on traffic, and this work won't bring traffic back. Most searches now end without a click, and pages under an AI Overview lose a large share of their clicks even when they're cited (current figures in `aeo-facts.md`). Reframe before the numbers do it for you: the AI answer is the new first impression, the click that survives it arrives pre-sold, and AI-referred visitors convert materially better than classic organic visitors. The measure is share of model on money questions plus the conversion of AI-referred visits (and, for a local business, calls), not sessions. If the client can only accept traffic as the measure, they'll judge this work a failure however well it goes. Surface that conflict in the audit, not after.

## Local businesses: run it differently, not never

Local buyers now ask assistants and Google Maps for recommendations by city ("who's a good plumber in Dallas that answers on weekends"), and Ask Maps answers with a short list and a reason for each business. So a local business does need this audit, run its own way:

- **Always city-scoped.** A national share-of-model audit for a dentist measures nothing. Every question names the place.
- **The levers differ.** The Google profile, the volume and text of reviews, consistent listings across directories, local "best of" lists and press, and a plain facts block on the site move local answers more than answer-block retrofits do.
- **Wrong facts are the urgent finding.** A wrong phone number or a service the business doesn't offer, repeated by an AI answer, costs calls directly. Fix those before chasing citations.
- **The map pack still matters more for "near me".** Route profile and review gaps to /boring-marketing-google-business-profile and /boring-marketing-reviews; this skill measures and diagnoses the answer layer.

## Where the click lands

When an assistant does send someone, it often sends them past the homepage. For a store, AI-referred shoppers frequently land straight on a product page, so specs, compatibility, real questions and reviews on the product page matter more than another editorial post. For a service business that's researched before buying (equipment repair, a renovation, a specialist clinic), the equivalent is the service page: scope, how pricing works, the questions buyers actually ask, proof. Weight the audit's page checks toward those pages.

## When NOT to bother (say so, save their money)

- **Pure e-commerce SKU plays.** Product questions resolve through shopping feeds and marketplaces; assistants recommend categories and criteria, then route purchases through structured product data. A merchant's surface is feed hygiene and review volume, not answer blocks. The exception worth taking: category buying guides with original testing data ("we measured battery life on 14 models").
- **Brands with no defensible expertise or data, in head-to-head consumer categories.** If the honest answer to "why would an assistant cite you over Wirecutter or Reddit?" is "it wouldn't", fix the substance first. This work amplifies authority. It can't manufacture it.
- **Anyone who needs results this quarter from a standing start.** Citation gains follow crawl, recrawl and retrieval cycles measured in weeks to months, against a churn rate that makes single-month readings noise. If the timeline is 30 days, spend the money on paid search or, for a local business, on the Google profile and reviews.

## Reading churn without panicking (MONITOR calibration)

- Losing 1 or 2 citations between monthly runs is base-rate weather. Flag a pattern only when the same question is lost two runs in a row, or losses cluster in one question kind.
- A citation lost to a fresher page is a freshness problem (cheap fix: update the page, re-ping). One lost to a page with original data is a substance problem (expensive fix: build the asset). Diagnose before reacting.
- New entrants in the citation table are the earliest competitor signal you'll get. They appear here before they show up in ad libraries or pricing pages. Route real ones to /boring-marketing-competitive-intel.
