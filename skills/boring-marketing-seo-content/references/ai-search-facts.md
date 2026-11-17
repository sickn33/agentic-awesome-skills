# AI Search Facts (perishable: check the header before relying on anything below)

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web-search "AI Overviews citation study {current year}", "ChatGPT search referral data {current year}", "Google structured data documentation changelog", and "FAQ HowTo rich results status". Update every figure below and bump last-verified. Per-brand observations go to ./brand/algo-cache.md, not this file.
changes: 2026-09-02: AIO/AI Mode reach (2.5B/1B MAU); zero-click 68% of US Google searches and AIO cuts CTR ~60%; ChatGPT's May 2026 search update made citations clickable and lifted referrals (~60% land on homepages); FAQ rich results removed for all sites May 7 2026; Google's May 2026 AI-features guide (no special markup, no chunking, llms.txt not needed, spam policies apply to AI answers); schema on cited pages ~53% with no citation lift in a matched-control test; churn sharpened; Reddit share per-engine and collapsed on ChatGPT Search mid-Aug 2026; ChatGPT no longer rides Bing's index.

Load this file during Phase 1.5 (AI Surface Analysis) and Phase 5 (Optimize. GEO track). If today is past last-verified + ttl-days, refresh FIRST and tell the user in one line.

---

## Where search traffic actually goes

- AI surfaces now answer most informational queries: Google AI Overviews 2.5B+ MAU and AI Mode 1B+ MAU (I/O, May 2026; now one merged experience); ChatGPT 900M weekly users confirmed Feb 2026 and reported near 1B by late July, with ChatGPT Search estimated at 250-500M queries per week.
- 68% of US Google searches ended without a click in Jan-Apr 2026 (web-panel data). AI Overviews appear on 20%+ of searches and cut click-through by ~60% when present (8% vs 15%). AI Mode refers out on only 1.6-2.5% of queries.
- ChatGPT referrals: a May 2026 search update made brand mentions clickable; referral share of web traffic jumped ~37% in a month, ~60% of AI-referred visits land on the homepage (vs ~17% for organic), and ~7% of US ChatGPT answers now carry citations (travel/auto 20%+, professional services under 4%).
- The flip side: visitors referred BY an AI surface convert materially higher than classic organic: 4-5x in the larger 2026 samples (conversion definitions vary; AI referrals are still ~1% of sessions). They arrive pre-qualified by the answer. Citations are worth chasing even at lower volume.
- Consequence for success metrics: a piece that ranks #3 but holds the AIO citation can beat a #1 that doesn't. Measure rank AND citations AND conversions; Search Console's Generative AI performance report is the first-party baseline.

## What gets a page cited (measured drivers, strongest first)

1. **Answer-first placement**: 44% of ChatGPT citations come from the first 30% of a page (18k verified citations, Feb 2026). Put a self-contained answer directly under each matching heading; Google says pages need not be chopped into fragments, and one clean passage per heading is enough. LLMs extract passages, not pages.
2. **Original first-party data and a unique point of view**: Google's May 2026 guide names "non-commodity" content as what AI features surface. One real stat you generated beats ten aggregated ones; cited passages name their entity at first mention 96% of the time and run 2-3x the proper-noun density of ordinary prose.
3. **Freshness**: cited passages show a visible 2025-26 date 80% of the time vs 53% for uncited ones; pages not refreshed quarterly are ~3x likelier to lose citations. Stale pages rotate out.
4. **Entity clarity**: unambiguous, consistent naming of products, companies, and people. Engines cite pages they can confidently attribute and disambiguate.
5. **Structured data**: present on ~53% of AI-cited pages, but a matched-control test of 1,885 pages that added JSON-LD (Aug 2025-Mar 2026) found no citation lift on ChatGPT or AI Mode and a small decline on AI Overviews; ChatGPT and Perplexity read JSON-LD as plain text. Google: "no special schema.org markup you need to add" for AI features. Its job is rich-result eligibility and attribution, not citations.

## Citation concentration and churn

- The head is brutally concentrated: across the large 2026 studies the top ~15 domains take roughly two-thirds of citations, and Wikipedia alone is ~48% of ChatGPT's top-10 source share. Only ~12% of AI-cited URLs also rank in Google's organic top 10, but:
- Citations are rented, not owned: only ~11% of cited URLs persist across a 28-day window (1,127 URLs, five engines, Jul 2026), and repeated runs of the same ChatGPT prompt share only ~21% of their sources (~31% on AI Overviews). This makes citation monitoring (Refresh mode / a recurring routine) a real recurring job, not a one-time audit.
- Reddit is a per-engine number, not one number: Jan 2026 ~24% of Perplexity citations, ~5% on ChatGPT, ~0.1% on Gemini, and the largest social source in AI Overviews. In the week of Aug 14 2026 Reddit's share of ChatGPT Search citations fell from ~3.8% to ~0.5% (Google surfaces drifted down, no collapse). If a Reddit thread is cited for your query, that's a beatable source: match its directness, beat its authority, but check which engine is citing it first.

## Schema status (what died, what's left)

As of September 2026, schema produces rich results for a shrinking set of types, and FAQ and
HowTo are no longer among them. Its durable job is machine parseability: clarifying what a
page is, who wrote it, and who published it.

- **HowTo rich results: REMOVED by Google September 2023.** Never generate HowTo JSON-LD. Any guidance recommending it is 3 years stale.
- **FAQ rich results: REMOVED for every site on May 7, 2026** (restricted to government/health sites since Aug 2023; the documentation was deleted June 2026). FAQ JSON-LD produces NO rich result anywhere. Its remaining value is LLM parseability: a clean Q/A structure machines can lift. Worth keeping for that reason alone, but say so honestly.
- **Article schema:** still the baseline. The `keywords` property is dead weight. Drop it.
- **Person / Organization schema:** author `Person` with `sameAs` links (LinkedIn, X, personal site) and publisher `Organization` remain how engines resolve WHO is behind a page, feeding both E-E-A-T assessment and entity clarity. Google's guidance is explicit that no markup is required for AI features, so frame it as attribution hygiene, not an AI lever.
- **Spam policies apply to AI answers** (Google, May 2026): what would be spam in the ten blue links is spam in AI Overviews/AI Mode too.

## Indexing for AI surfaces

- **IndexNow reaches Bing and Copilot; it is no longer the ChatGPT lane.** Aug 2026 research shows ChatGPT retrieves from OpenAI's own index and page cache (~1.5% overlap with Bing's top 20). Keep pinging IndexNow on publish/update: near-free for Bing/Copilot, but the ChatGPT prerequisites are OAI-SearchBot and GPTBot allowed in robots.txt and core content in server-rendered HTML. (Google ignores IndexNow.)
- **llms.txt** (a markdown index at the site root listing key pages with one-line descriptions): Google states (June 2026) it is not needed for Google Search and has no ranking effect; no engine has confirmed rewarding it. Cheap to maintain; propose it only at that price, don't oversell it.
