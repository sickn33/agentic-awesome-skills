# Metrics Judgment

last-verified: 2026-09-02 · ttl-days: 180 · refresh: web search "GA4 modeled key events thresholding <current year>" + "Apple Mail Privacy Protection open rate inflation" + "AI chatbot referral traffic GA4 sources list <current year>"
changes: 2026-09-02. GA4 latency restated from Google's docs (24-48h processing; key-event attribution can shift for up to 12 days); GA4 gained a native "AI Assistant" default channel (medium `ai-assistant`, 2026-05-13), so the referral list now works alongside it; grok/deepseek/meta.ai added to the source list; MPP and complaint-rate lines unchanged.

Loaded by /boring-marketing-performance-review before the DIAGNOSE phase. This file is the judgment layer: how to read small samples honestly, how to find the funnel bottleneck, which platform numbers lie and how, which metrics matter per channel, and how to spot AI-referral traffic. All numbers in worked examples are illustrative unless marked otherwise.

## Small-sample discipline

Most customers have n in the dozens-to-hundreds per period, not the millions A/B-test
literature assumes. The intuition that replaces the math: **a difference is real when the
rarer event's counts couldn't plausibly swap by chance.** Counts in single digits swap all
the time; counts 2x apart at 20+ events per arm almost never do.

Worked examples (real vs noise):

- **REAL.** Subject A: say 41 clicks, subject B: 17 clicks, on equal halves of one send.
  2.4x on 58 total click events. Flipping a handful of clicks doesn't close that gap.
  Verdict: clear win, write the prior.
- **NOISE.** Landing variant A converts say 4.4%, variant B 3.8%, on ~180 sessions each.
  That is 8 conversions vs 7. One visitor's mood apart. Verdict: no difference detectable
  at this n; you'd need roughly 10x the traffic to see a 15% effect, so test bigger swings
  instead.
- **REAL via consistency.** Question-style hooks beat direct-style in 5 of 5 weekly sends,
  each send individually too small to call. Five independent same-direction results is
  strong evidence. Write the prior with `n=5 sends`.
- **TRAP: denominator shift.** CTR "doubled" but impressions fell from say 1,200 to 80
  because budget moved. The metric didn't improve; the audience changed. Always check the
  denominator before celebrating a rate.
- **TRAP: segment slicing.** Any small sample sliced enough ways yields a "winner"
  (mobile users in week 2 loved variant B). If the segment wasn't named before looking,
  it's a hypothesis for the next test, never a finding.

Operating rules: report direction and rough magnitude ("about 2x", "roughly flat"), never
false-precision percentages on two-digit counts. Compare counts of the rarer event, not
rates. No p-values or confidence dressing on tiny samples; the honest verdict set is
*clear win / lean / can't tell yet (here's the n that would tell)*. When n won't grow soon,
prefer tests with expected 2x+ effects (different hook class, different offer) over
tweaks (button color, comma placement) that small samples can never adjudicate.

**How many events to call a winner:** an order-of-magnitude rule of thumb, counted in the
rarer event (clicks, conversions) per arm:

| Effect you're trying to see | Events per arm before calling it |
|---|---|
| ~2x or bigger | ~20-30 |
| ~1.5x | ~75-100 |
| ~1.2x | ~500+ |
| ~1.1x | thousands, which is out of reach for most small lists; don't run this test |

Use it both directions: to refuse a verdict ("8 vs 6 conversions can't show 1.3x") and to
size the next test ("at ~40 clicks/send, only a 2x hypothesis is testable, so pick a bigger
swing"). The table is a guide for honesty, not a license for precision.

## Funnel bottleneck math: worked example

Illustrative month for a service business: 6,200 sessions → 148 leads → 9 sales.

| Stage | Rate | Attainable (typical range) | Read |
|---|---|---|---|
| Session → lead | 2.4% | ~2-5% for a focused offer page | within range |
| Lead → sale | 6.1% | ~10-25% for a warm, nurtured list | **worst leak** |

The walk: traffic is adequate (6,200 sessions is enough volume to judge with). Lead capture
is mid-range: improvable, not broken. Lead→sale at 6.1% against a ~10-25% attainable band
is the stage furthest below attainable, so this is an **offer problem** (or a nurture-path
problem), not a traffic problem. Doubling traffic at the same rates buys 9 more sales and
doubles spend; fixing lead→sale to a modest 15% turns the *existing* leads into ~22 sales.
Fix the stage that leaks worst against its attainable band first. Every upstream
improvement passes through it, so a leaky stage taxes all the other work.

Classification shorthand: worst leak at the top = traffic problem (volume or relevance);
middle = conversion problem (page, magnet, friction); bottom = offer problem (positioning,
pricing, trust, follow-up). Always state which one the headline diagnosis is.

## Metric-source quirks

| Source / metric | The quirk | What to do |
|---|---|---|
| Email opens | Apple Mail Privacy Protection pre-fetches tracking pixels, so opens fire whether or not a human looked. Inflation varies by list's Apple share; comparisons across lists or time are unreliable | Judge on clicks, replies, unsubscribes, conversions. Opens are only useful as a deliverability cliff detector (sudden drop = inbox placement problem) |
| Email clicks (B2B) | Security scanners click every link on arrival, inflating clicks | Discount instant-burst clicks (all links, seconds after delivery). Replies are unfakeable, so weight them highest |
| GA4 conversions / key events | Modeled (consent-gated users estimated in); Google's processing window is 24-48h after the day closes, and key-event attribution credit can keep shifting for up to 12 days as the model updates | Wait 48h (72h to be safe) before judging a day; compare periods measured the same way; treat key-event counts as estimates, not ledger entries |
| GA4 explorations | Sample on large date ranges | Pull standard reports or the Data API for counting jobs |
| Ad platforms (Meta/Google/LinkedIn) | Conversions backfill for ~72h after spend; view-through conversions inflate "results"; frequency fatigue decays CTR | Never kill or crown a cell within 72h of last spend. Prefer click-through conversions for judgment. CTR falling as frequency passes ~2-3 = creative fatigue, not message failure, so rotate creative before changing the hook |
| GSC position | Impression-weighted average across all queries/impressions: "position 8.2" can be position 3 sometimes and 15 sometimes; long-tail queries are partly anonymized; data lags ~2-3 days | Treat position as a distribution, not a rank. Clicks and impressions are the solid numbers. Position 8-15 with impressions = striking distance |
| Social platform analytics | Reach/impression definitions differ per platform and change without notice; follower counts move on platform whims | Compare within-platform, within-period only. Judge on the engagement metrics below, not reach |
| Cross-source totals | Ad-platform conversions vs GA4 key events vs ESP-reported conversions never match: different attribution windows, models, and dedup rules, by design | Pick one source of truth per question (platform numbers for in-platform comparisons, GA4 for cross-channel funnels) and never "reconcile" them into a blended figure |
| Google Ads local actions ("Business profile" calls, "Clicks to call", "Get directions") | Counted when they follow an ad interaction within the click window (30 days by default), including a later tap on the organic Business Profile. A known local business gets these every day with or without ads | Treat the count as an upper bound on ambient activity, not demand the campaign created. Read it against the phone log; test with `/boring-marketing-ads-incrementality-check` before crediting it |
| "Calls from ads" in Google Ads | Includes Business Profile calls attributable to an ad interaction when the profile is linked and call history is on; short calls count unless a minimum length or AI qualification is set | Check the call length setting before reading it as leads |
| Phone system call logs | Raw inbound includes spam, misdials, vendors and customers chasing booked jobs; times are often UTC; voicemail is logged differently per system | Use answered inbound calls of 30 seconds or longer on the public lines, plus unique callers. Convert to local time before splitting by hour |
| Screenshots of any dashboard | Lowest fidelity: cropped ranges, rounded numbers, filtered views invisible to the reader | Record what's legible, flag `UNVERIFIED` for the rest, note the visible date range or its absence |

## The 3 metrics that matter per channel

- **Email:** clicks (on delivered), replies, unsubscribe/complaint rate. Opens are
  MPP-inflated diagnostics only. Complaint rate is the one with a cliff: >0.10% risks
  throttling under the Gmail/Yahoo/Outlook bulk-sender rules; 0.30% is a hard fail.
- **SEO/AEO:** impressions (the early signal that Google is testing the page), clicks, and AI
  citations (whether AI surfaces cite the page; see below). Average position is
  derivative; rankings without impressions are trivia.
- **Paid ads:** CPA vs LTV, the only ratio that decides scale-or-kill; CTR as creative
  health; the fatigue curve (CTR vs frequency) as the rotate-creative alarm. Spend
  metrics (CPM) explain costs, never success.
- **Social:** replies, profile clicks, and link clicks (links are usually demoted in-feed, so
  clicks often live in replies). Followers are vanity; impressions are mood; neither
  earns a learnings entry on its own.

## Detecting AI-referral traffic in GA4

GA4 now has a native **AI Assistant** default channel (added 2026-05-13): recognized
assistant referrers get medium `ai-assistant` (Google names ChatGPT, Gemini, Claude,
DeepSeek, Copilot, and Grok), so start with `sessionDefaultChannelGroup = AI Assistant`.
It is not retroactive and the referrer list is unpublished, so also pull `sessionSource`
and match against the AI surfaces (the list grows, so refresh per the header when stale):
`chatgpt.com`, `chat.openai.com`, `perplexity.ai` (still landed in Referral at last
check), `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`,
`edgeservices.bing.com`, `grok.com`, `deepseek.com`, `meta.ai`, `you.com`, `poe.com`,
plus `utm_source` values naming the same (assistants increasingly append
`utm_source=chatgpt.com`-style tags to cited links). Caveats: some AI surfaces strip
referrers, so measured AI traffic is a floor; a rise in "direct" sessions landing deep on
informational pages is a plausible AI-referral shadow. Report that as inference, labeled.

Why it matters more than its volume: an AI referral arrives pre-sold. The assistant
already answered the user's basics and *recommended this page*. A citation is a warm
intro, not a keyword match, which is why AI-referred visitors convert materially higher
than organic. Read it two ways: (1) per-page: pages earning AI referrals are being cited;
protect them, keep them fresh, and hand the list to `/boring-marketing-ai-search` to widen the footprint
(citation churn is high, so presence decays without maintenance); (2) per-funnel: if
AI-referred conversion runs ~2x organic, AEO work is justified even while the session
counts still look small. Small-sample rules apply here doubly: AI-referral n is usually
tiny, so judge direction and conversion *rate vs organic*, not raw counts.

## Denominators

Loaded by Phase 1f and 2e. The denominator is a count of customers arriving that no ad
platform controls. It is what every channel claim gets read against.

| Business | Denominator | Cleaning that matters |
|---|---|---|
| Leads phone in (most local services) | Answered inbound calls 30s or longer per day on the public lines; unique callers per day; Google Business Profile call clicks per day | Drop staff, vendor and spam numbers; dedupe transfers; local time; don't count with an auto-classifier until its coverage is checked |
| Online store | New-customer orders per day | Split new from returning; exclude test and refunded orders |
| Lead-gen with a CRM | Leads created and deals won per week, by source field | Dedupe contacts; check the source field is filled for most records before splitting by it |

**The case behind the phone-log rule.** A home service business's Performance Max campaign was credited with most of the account's Google Ads conversions over three months.
During a pause, GBP call clicks, raw inbound calls, answered 30-second calls and unique callers per day all held about level.
The platform count had been read as demand the campaign created. The phone log said it
was mostly calls that came anyway. Full method: `/boring-marketing-ads-incrementality-check`.

**Reading a channel against the denominator:** when the denominator holds steady while a
channel's claimed conversions swing (a budget cut, a pause, a new campaign), the channel is
mostly taking credit. When the denominator moves with the channel's spend, in both
directions, the channel is bringing customers. Small-sample rules above still apply:
compare against the normal week-to-week swing, not against a single prior week.
