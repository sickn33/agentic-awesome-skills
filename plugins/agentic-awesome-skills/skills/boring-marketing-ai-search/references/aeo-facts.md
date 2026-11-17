# AEO Facts (perishable: check the header before relying on anything below)

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web-search "AI Overviews citation study {current year}", "rank-controlled AI citation study", "generative engine optimization experiment", "ChatGPT search weekly queries {current year}", "AI search zero-click rate study {current year}", "LLM citation source churn rate", and "Google rich results changelog FAQ HowTo", then update every figure below and bump last-verified. Per-brand observations (which queries the brand wins, which subreddits get cited in its category) go to `./brand/algo-cache.md`, not this file.
changes: 2026-11-16 added "What the controlled studies say" (research pass, Jun 2026; re-check on the next refresh). 2026-09-02. AIO/AI Mode reach (2.5B/1B MAU, I/O May 2026); zero-click now 68% of US Google searches and AIO cuts CTR ~60%; FAQ rich results removed for all sites May 7 2026; Google's May 2026 AI-features guide (no special markup, no chunking, llms.txt not needed, spam policies apply to AI answers); schema on cited pages ~53% with no citation lift in a matched-control test; churn sharpened (only ~11% of cited URLs persist 28 days); Reddit share is per-engine and collapsed on ChatGPT Search mid-Aug 2026; ChatGPT no longer rides Bing's index.

Load this file at the start of every /boring-marketing-ai-search mode. If today is past last-verified + ttl-days, refresh FIRST and tell the user in one line: `Refreshed AEO facts (cache was N days old).`

---

## The traffic reality

- AI surfaces answer most informational queries: Google AI Overviews 2.5B+ MAU and AI Mode 1B+ MAU (Google I/O, May 2026; the two now run as one merged experience); ChatGPT at 900M weekly users confirmed Feb 2026 and reported near 1B by late July, with ChatGPT Search estimated at 250-500M queries per week.
- 68% of US Google searches ended without a click in Jan-Apr 2026 (web-panel data). AI Overviews sit on 20%+ of searches and cut click-through by ~60% when present (8% vs 15%); AI Mode refers out on only 1.6-2.5% of queries vs 17-19% for classic results. Desktop B2B zero-click approaches 80%.
- The compensating fact: **AI-referred visitors convert materially higher** than classic organic, 4-5x in the larger 2026 samples (conversion definitions vary by study, and AI referrals are still ~1% of sessions). The answer pre-qualified them. Fewer clicks, better clicks. This reframes the goal: optimize to be the cited authority, not to recover raw click volume (see aeo-judgment.md for the full reframe).

## Citation drivers (measured, strongest first)

1. **Answer-first placement:** 44% of ChatGPT citations come from the first 30% of a page (18k verified citations, Feb 2026). A self-contained answer directly under the matching heading is what gets lifted. Google says pages need not be chopped into fragments, and it is right: one clean passage per heading is enough. LLMs extract passages, not pages.
2. **Original first-party data and a unique point of view:** Google's May 2026 guide names "non-commodity" content as what AI features surface. One stat you generated beats ten you aggregated; cited passages name their entity at first mention 96% of the time and carry 2-3x the proper-noun density of ordinary prose.
3. **Freshness:** cited passages show a visible 2025-26 date 80% of the time vs 53% for uncited ones; pages not refreshed quarterly are ~3x likelier to lose citations. Stale pages rotate out.
4. **Entity clarity:** consistent, unambiguous naming of products, companies, and people. Engines cite what they can confidently attribute.
5. **Structured data:** present on ~53% of AI-cited pages, but a matched-control test of 1,885 pages that added JSON-LD (Aug 2025-Mar 2026) found no citation lift on ChatGPT or AI Mode and a small decline on AI Overviews. Google: "no special schema.org markup you need to add" for AI features. Keep schema for rich results and entity attribution; never sell it as a citation lever.

## What the controlled studies say

- **Rank is upstream on Google.** A rank-controlled study (SSRN, 2026) found the top organic result was cited for about 43% of queries, falling to about 5% by position 7, and that generic schema and entity richness showed no effect once rank was held constant. Most "AI ranking factors" correlations are rank in disguise.
- **The one controlled experiment** (Princeton's generative engine optimization study) found that adding quotations, statistics and cited sources lifted visibility in generated answers by roughly 30 to 40%, while keyword stuffing did nothing or hurt.
- **Mentions beat links, correlationally.** Brand mentions across the web correlate with AI visibility about three times as strongly as backlinks (Ahrefs, 2025). It's a correlation that rank partly explains, not a lever proven on its own.

## Concentration and churn (why monitoring is the product)

- The head is brutally concentrated: across the large 2026 studies the top ~15 domains take roughly two-thirds of citations, and Wikipedia alone is ~48% of ChatGPT's top-10 source share. Only ~12% of AI-cited URLs also rank in Google's organic top 10.
- But citations are rented, not owned: only ~11% of cited URLs persist across a 28-day window (1,127 URLs, five engines, three waves, Jul 2026), and repeated runs of the same ChatGPT prompt share only ~21% of their sources (~31% on AI Overviews). A single audit is a snapshot, and any vendor selling a one-time "AI visibility score" is selling a photograph of weather.
- **Reddit is a per-engine number, not one number.** Jan 2026: ~24% of Perplexity citations, ~5% on ChatGPT, ~0.1% on Gemini, and the largest social source in AI Overviews. Then, in the week of Aug 14 2026, Reddit's share of ChatGPT Search citations fell from ~3.8% to ~0.5% (Google surfaces drifted down, no collapse). A Reddit thread cited for your money query is still a beatable incumbent (match its directness, beat its authority with data) and a venue worth genuine participation, never astroturfing. Check which engine cites it before building around it.

## Schema status (what died, what's left)

- **HowTo rich results: REMOVED by Google September 2023.** Never generate HowTo JSON-LD; any tool or guide recommending it is 3 years stale (a useful snake-oil tell).
- **FAQ rich results: REMOVED for every site on May 7, 2026** (restricted to government/health sites since Aug 2023; the documentation was deleted June 2026). FAQ JSON-LD earns no rich result anywhere; its remaining value is a clean Q/A structure LLMs can lift. Keep it for that reason only, and say so honestly.
- **Article schema**: still baseline. The `keywords` property is dead weight, so drop it.
- **Organization / Person schema with `sameAs`**: still how engines resolve WHO is behind a page, feeding entity clarity and E-E-A-T. Google's guidance is explicit that no markup is required for AI features, so frame it as attribution hygiene, not an AI lever.
- **Spam policies apply to AI answers** (Google, May 2026): a page that would be spam in the ten blue links is spam in AI Overviews/AI Mode too.

## Index plumbing

- **IndexNow reaches Bing and Copilot; it is no longer the ChatGPT lane.** Aug 2026 research shows ChatGPT retrieves from OpenAI's own index and page cache (~1.5% overlap with Bing's top 20). Keep pinging on publish/update (`https://api.indexnow.org/indexnow?url=<url>&key=<key>`, key file hosted at site root), which is near-free for Bing/Copilot. The ChatGPT prerequisites are OAI-SearchBot and GPTBot allowed in robots.txt and core content in server-rendered HTML. Google ignores IndexNow entirely.
- **llms.txt**: a curated markdown index at the site root (site name, blockquote summary, sectioned link lists with one-line descriptions). Google states (June 2026) it is not needed for Google Search and has no ranking effect; no engine has confirmed rewarding it. Ship it only at near-zero cost, never oversell it.
- **Search Console's Generative AI performance report** shows impressions from AI Overviews/AI Mode, the first-party baseline before any third-party tracking.
