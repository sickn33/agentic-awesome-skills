# Ads judgment

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web search "Meta learning phase optimization events" (facebook.com/business/help/112167992830700) + "Meta Advantage+ audience default original audiences objectives" + "Performance Max run at least 6 weeks site:support.google.com" + "Google Ads learning period duration site:support.google.com" + "Meta creative fatigue creative limited" (facebook.com/business/help/1346816142327858); update the learning-phase numbers, the audience-guidance block, and the per-platform floors; bump last-verified.
changes: 2026-11-16. Added "Creative volume, cadence and fatigue" (Meta's fatigue labels, diversification guidance and testing cadence, sources inline; the rest of the file is as of last-verified). 2026-09-02. Header added; Meta learning phase restated in Meta's terms (~50 optimization events in the 7 days after the last significant edit); PMax floor restated from Google's guidance (run 6+ weeks; bid strategies calibrate up to ~3 weeks / 1-2 conversion cycles); audience block dated September 2026 with the objectives where Advantage+ audience is the default.

Load before Phase 1 cell selection and Phase 2 structure in CAMPAIGN BUILD, and before
any RESULTS REVIEW verdict. Nothing here is a perishable platform spec (those live in
platform-specs.md). This is the operating doctrine that decides whether the spec-level
work pays off.

## Creative is the targeting

The delivery systems now decide who sees an ad better than any manual audience does.
What they optimize toward is the people who respond to the creative, which means the
hook IS the audience selection. A hook written for "freelancers stuck at, say, $5k
months" finds those freelancers inside a broad audience; the same budget pointed at an
interest stack of "freelancing, Upwork, small business" finds a demographic, not a
problem. Practical consequences:

- Spend differentiation effort on hooks, not audience settings. Four genuinely
  different hooks in one broad ad set out-learns one hook in four narrow ad sets.
- When performance stalls, the fix is almost never a targeting tweak. It is a new hook,
  a better offer, or a more congruent landing page, in that order of likelihood.
- Audience exclusions still matter (existing customers, employees); audience
  *inclusions* mostly don't, outside LinkedIn firmographics and retargeting.

## Audience guidance (September 2026)

- Broad targeting + creative-as-targeting is the default: the hook selects the audience
  and the platform finds people who respond. On Meta, Advantage+ audience is the default
  for sales, leads, and app objectives. Detailed-targeting inputs are treated as
  suggestions the system expands beyond, and "original audiences" survive only on
  awareness and some traffic objectives. Interest-stack micro-targeting fragments
  signal. Exceptions: LinkedIn firmographics, retargeting audiences, and hard
  geo/language limits.

## The 2026 platform reality

Advantage+ (Meta) and Performance Max (Google) are the default campaign surfaces, and
they are black boxes on purpose: placements, bids, and audience expansion are handled
by the system. Fighting this (manual placements, bid caps as a strategy, 40-ad-set
account architectures) is energy spent where the platform has removed the steering
wheel. The levers that remain, and they are sufficient:

1. **Creative**: what the system tests on your behalf. Feed it genuinely different
   concepts (the matrix), not 12 crops of one idea.
2. **Offer**: the only variable that can move CPA by multiples rather than percents.
3. **Landing page**: congruence and conversion rate (below).
4. **Conversion signal**: what event you tell the system to optimize, and how cleanly
   it fires. Optimizing for a cheap proxy event gets you cheap proxy people.

Budget and structure still matter as *constraints* (see budget math), just not as
optimization levers. Bid hacking is dead; signal hygiene is not.

## Creative volume, cadence and fatigue

Facts checked 2026-11-16 on Meta's pages named inline. The tiers below them are our rule
of thumb.

- **Meta's fatigue labels.** Ads Manager's delivery column shows "Creative limited" when
  an ad's cost per result is above your past ads but under twice as much, and "Creative
  fatigue" at twice or more. It counts all recent exposures of that image or video,
  including from your Page's other campaigns, and can warn before launch when fatigue is
  likely in the first 7 days. Meta's fix is a new image or video "materially different
  from the original creative" (facebook.com/business/help/1346816142327858).
- **Similar ads count as one.** Meta says creative that is too similar may not be
  recognized as different and can be delivered to the same audiences, which leads to
  those labels. Its "Creative diversity" metric rates an ad set's images and video
  thumbnails high, medium or low (facebook.com/business/m/small-business/creative-differentiation;
  facebook.com/business/help/2371176336684086). A new angle or format adds diversity. A
  hook swap or a recolor mostly doesn't.
- **Meta's cadence guidance.** Its November 2024 guidance recommends launching new ads
  weekly, keeping at least 20 diversified ads in Advantage+ shopping campaigns, and
  putting 20-30% of budget toward testing
  (facebook.com/business/news/three-steps-to-optimize-your-performance-with-creative-diversification).
  Its Instagram video ads page suggests testing up to 10 creatives per ad set, keeping
  the top 5, and running at least 4 days (facebook.com/business/help/188534925073536).
- **Our tiers by budget.** Those numbers are written for large accounts. The 2x-CPA rule
  below decides how many live ads a budget can judge. Under $50/day: 3-6 live ads and 2-3
  new concepts every two weeks. $50-150/day: 6-10 live and 3-5 new a week. Above that,
  work toward Meta's weekly launches and 20+ diversified ads.
- **Our fatigue signal from the numbers.** Over 3 or more days at steady spend, frequency
  climbs while CTR falls and cost per result rises. One bad day is noise (see the 72-hour
  rule). When the label or the signal shows, refresh with a new format on the winning
  angle first (the angle is still proven), then a new angle.

## Hooks → awareness stages

Schwartz's awareness ladder decides which matrix hook rows fit which traffic. Mismatch
here is the most common silent killer: a direct-claim ad shown to people who don't yet
know they have the problem reads as noise, and a problem-question shown to people
comparing vendors reads as condescension.

| Awareness stage | Buyer state | Matrix hooks that fit |
|---|---|---|
| Unaware | Doesn't know the problem exists | H4 contrarian (pattern interrupt is the only door in); cold video |
| Problem-aware | Feels the pain, no named solution | H2 question (name the pain in their words), H4 contrarian |
| Solution-aware | Knows the category, comparing approaches | H3 proof, H4 contrarian (against the default approach) |
| Product-aware | Knows you, hasn't bought | H1 direct, H3 proof (specific evidence, offer-forward) |
| Most-aware | Ready, needs a reason now | H1 direct with the offer as the hook; retargeting territory |

Cold prospecting traffic is mostly problem- and solution-aware → H2/H3/H4 carry
prospecting; H1 direct earns its budget in retargeting and branded search. If the
matrix's selected cells are all H1, the campaign is structurally a retargeting campaign
whatever the audience settings say.

## Honest budget math

Most "the ads didn't work" stories are actually "the budget couldn't have answered the
question." Run this math before selecting cells, and state the result in the plan in a line or two.

- **The judgment unit is 2× target CPA per cell.** Before a cell has spent twice the
  target CPA, its results are noise. At that spend a true-at-target ad has produced
  ~2 conversions, so zero conversions starts (only starts) to be evidence. Minimum
  honest test budget = `cells × 2 × target CPA`. Six cells at a $50 CPA target =
  ~$600 minimum, and that buys one verdict round, not a winner.
- **Learning-phase math (Meta):** an ad set wants ~50 optimization events in the 7 days
  after its last significant edit to exit learning (Meta's own figure; "Learning
  limited" means it is not on track for 50). At $50 CPA that is ~$350/day *per ad set*
  to fully feed the algorithm. Almost nobody testing has that, which is the argument
  for ONE consolidated ad set, not four starved ones.
- **Why $10/day across 12 cells is structurally useless:** $0.83/cell/day means the
  first cell reaches its 2×-CPA judgment threshold in months, during which creative
  fatigues and seasonality shifts. The data never matures. Fewer cells at honest spend
  always beats more cells at homeopathic spend.
- **Per-platform floors** (orders of magnitude, not quotes): Meta tests get honest
  around $30-50/day minimum on a consolidated structure. Google Search judges per ad
  group at ~100 clicks or 2× CPA spend, whichever first; PMax wants ~6 weeks before any
  verdict (Google's own guidance for a new campaign; bid strategies take up to ~3 weeks
  or 1-2 conversion cycles to calibrate after any significant change), and a few dozen
  conversions in that window. LinkedIn CPCs run high single to low double digit
  dollars. Under roughly $2-3k/month LinkedIn testing is structurally thin; it is a
  B2B-with-real-LTV platform, not a small-budget one. TikTok needs video volume more
  than spend: 3-5 creatives minimum or fatigue outruns learning.
- **Scaling is +20-30%/day**, not doubling. Budget jumps reset learning and the
  winner's CPA with it. Impatience at the scaling step quietly executes winners.

## Small-budget structure

Applies to any account where a campaign gets fewer than about 30 conversions a month.
Bid strategies learn mostly from each campaign's own conversion history (a portfolio bid
strategy can pool several campaigns). Every campaign added to a small account divides the
signal it learns from.

**The local case.** One local service business ran at low conversion volume.
One broad campaign covering every town it served ran at a good cost per conversion; split into three campaigns by region, the same money cost several times as much per conversion.
Each piece sat below the learning threshold for good, and the split was reverted to the
one campaign.

What made the single campaign work, and what to copy:

- **Location in the ad, not in the structure.** Location insertion in the ad copy lets one
  campaign read as local in every town. Separate town campaigns are the expensive way to
  do the same thing.
- **The search terms usually say so.** In many local markets, keyword ideas skew to "near me" and few city-name service terms have any volume. People let their phone supply the location.
  Check the keyword ideas before building by town.
- **Impression share told the budget story.** The single campaign lost more impressions to budget than to rank. The constraint was money, not targeting.
- **Maximize clicks is the wrong objective when the conversion is a call.** It can spend a whole budget with no conversions.
- **Broad match only on proven converters,** and alongside dynamic keyword insertion it can
  write competitor names into headlines. Pick one or the other, and read the search terms
  a week after any broad match goes live.

**An online example (illustrative).** A store at say 40 purchases a month runs four
campaigns, one per product line, at about 10 purchases each. None can learn. One campaign
with the product lines as ad groups (Search) or asset groups (Performance Max) pools all 40.
Split a line out only when it needs its own budget (a very different margin, stock that
runs out) and would still reach about 30 purchases a month alone.

**When a split is right anyway:** a market the business can't serve faster (one technician
already fully booked), a margin so different that one target can't fit both, or a hard
legal or geographic limit. Each piece should still reach about 30 conversions a month, or
the split is buying control at the cost of learning, knowingly.

## Signal-loss literacy (iOS, modeled conversions)

Since iOS ATT, a large share of conversions is *modeled*, not observed: the platform
statistically estimates conversions it can no longer track. What this means for reading
numbers:

- **Trust trends, not absolutes.** A CPA moving from say $80 to $55 over two weeks is
  real information; whether "$55" is the true number is unknowable. Compare cells
  against each other inside the same platform; the modeling error is roughly shared.
- **72-hour rule.** Reporting lags and backfills up to ~3 days. Yesterday always looks
  worse than it was. Never kill on data under 3 days old; re-pull before verdicts.
- **Platform numbers ≠ GA/landing analytics, and neither is lying.** The platform
  over-claims (modeled + view-through), GA under-claims (lost attribution). Use the
  platform for *relative* cell comparisons and first-party UTM data for *absolute*
  volume sanity checks. The UTM-per-cell convention exists precisely so you have a
  second witness.
- **Feed the signal back:** Conversions API (Meta) / enhanced conversions (Google)
  materially improve both delivery and reporting; if the stack supports it, it
  outranks any creative tweak on the to-do list.

## Landing-page congruence

The ad makes a promise; the landing page must be that promise, immediately. The
specific bar: **the hook of the winning cell should be, nearly verbatim, the landing
page's headline.** A question-hook ad landing on a generic feature page pays twice:
once in bounce rate, once in the platform's quality/relevance scoring, which prices
incongruent ads upward. When the matrix tests 4 hooks against one static page, expect
the page to flatter whichever hook it happens to match; before declaring a hook the
loser, check whether it lost the auction or lost the landing. Route to
`/boring-marketing-direct-response-copy` for per-hook landing variants; its BUILD mode can ship variant
routes that pair 1:1 with cells.
