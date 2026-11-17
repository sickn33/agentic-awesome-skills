# Newsletter Strategy: platforms, growth, monetization

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web-search each platform's current pricing
page and monetization docs (Beehiiv, Substack, Kit, Ghost); verify boost/recommendation payout
ranges against Beehiiv Boosts and SparkLoop current marketplaces; spot-check sponsorship CPMs
against two live sponsorship marketplaces before quoting any number.
changes: 2026-09-02: pricing snapshot added from the four live pricing pages (Beehiiv Scale
$43/mo annual, Kit Creator $33/mo annual with Free to 10k subs, Ghost(Pro) Publisher $29/mo
annual, Substack 10% + Stripe unchanged); paid-recommendation payouts corrected (beehiiv
Boosts ~$1-5 per verified sub after a 20% fee, SparkLoop's stated $2-20 after 20% + 3.5%);
sponsorship CPM shorthand raised to 2026 marketplace ranges (SponsorGap Mar 2026, Paved Jul
2026). Platform positioning, growth ladder, ESP API shapes: unchanged (API shapes not
re-verified this pass. No live keys).

Load only when the user asks a strategy question (platform choice, growth, monetization) or
when Phase 2 needs the ESP API notes. Never load for edition writing. **Every number in this
file is illustrative market shorthand, not a quote**: verify before the user spends or prices
anything on it.

---

## Platform choice

The decision is what the newsletter is *for*, not feature counts:

- **Beehiiv:** the newsletter as a media business. Strongest growth/monetization tooling
  (referrals, Boosts, ad network, recommendations) and the deepest stats API. The default
  recommendation for growth-focused operators.
- **Substack:** the writer who wants zero ops and built-in discovery. Network
  (recommendations, Notes) drives real free growth; the trade is ~10% of paid-sub revenue,
  thin automation/segmentation, and building on their land.
- **Kit** (the ESP formerly ConvertKit; never call it ConvertKit in output): the newsletter
  as top-of-funnel for digital products. Best automation/tagging/commerce; plain-design
  emails; weakest as a media-style publication.
- **Ghost:** ownership and publication design. Open source, no revenue cut, real website;
  you bring all your own growth. Right for established audiences, wrong for cold starts.

Pricing snapshot (live pages, 2026-09-02; verify before quoting):

- Beehiiv: Launch free to 2,500 subs; Scale from $43/mo annual (to 100k subs) unlocks paid
  recommendations, ad network, referral program; Max from $96/mo; 0% take on paid subs.
- Substack: no platform fee; 10% of paid revenue plus Stripe (~2.9% + $0.30 + 0.7%
  recurring): unchanged in 2026.
- Kit: Free to 10,000 subs (one automation, one sequence); Creator $33/mo annual ($39
  monthly) at 1k subs adds unlimited automations, recommendations, and the SparkLoop-powered
  referral system; Pro $66/mo annual ($79 monthly). The Sept 2025 price rise stands.
- Ghost(Pro): Starter $18/mo annual (no paid memberships); Publisher $29/mo annual (paid
  memberships, 0% fee, 1k members); Business $199/mo annual (10k members); self-host free.

Migration is painful everywhere; pick for the 2-year model, not this month's feature.
Formatting judgment carries over: Beehiiv/Ghost tolerate rich layouts; Substack wants simple;
Kit performs best near-plain-text.

## ESP API notes (for the SKILL.md Phase 2 stats pull)

Auth keys come from `.env` (Beehiiv also needs `BEEHIIV_PUBLICATION_ID`). Shapes as of last-verified. If a call 404s, refresh per header.

- **Beehiiv** (`BEEHIIV_API_KEY`, Bearer): `GET https://api.beehiiv.com/v2/publications/{pubId}/posts?expand[]=stats&order_by=publish_date&direction=desc&limit=10`.
  Stats include recipients, unique opens, unique clicks; expanding clicks on a single post
  returns the per-URL click breakdown. Publication id discoverable via `GET /v2/publications`.
- **Kit** (`KIT_API_KEY`, header `X-Kit-Api-Key`): `GET https://api.kit.com/v4/broadcasts`
  for the send list, then `GET /v4/broadcasts/{id}/stats` for recipients, open/click rates,
  unsubscribes. Per-link breakdown is not reliably exposed: note that limitation rather than
  guessing.
- **Ghost** (`GHOST_ADMIN_API_KEY`, the `id:secret` string from a custom integration, plus `GHOST_URL` for the site address; sign a short-lived JWT from it): `GET {GHOST_URL}/ghost/api/admin/posts/?filter=email.email_count:>0&order=published_at desc&limit=10`.
  Each post carries an `email` object (sent/opened counts). Per-link clicks:
  `GET /ghost/api/admin/links/?filter=post_id:'{id}'`.

Across all three: treat opens as direction-only (Apple MPP inflation), clicks as truth.

## Growth: what compounds for a small list

Ordered by leverage-per-effort for lists under ~25k. Channel-stacking beats channel-hopping;
pick two and run them for a quarter.

1. **Recommendation networks** (Beehiiv recommendations, Substack recommendations,
   SparkLoop partner network). The closest thing to free compounding growth: other
   newsletters send you their new subscribers. Costs an ask and a reciprocal slot. Quality
   control matters: recommend only letters you'd defend, or your own engagement decays.
2. **Atomized distribution.** Every edition becomes platform-native social posts
   (`/boring-marketing-content-atomizer`); the newsletter's archive doubles as SEO surface (`/boring-marketing-seo-content`).
   The edition you already wrote is the cheapest growth asset you have.
3. **Cross-promotions.** Swap genuine 2-3 sentence recommendations with letters of similar
   size (within ~2x) in adjacent, not competing, niches. Co-written editions are the
   high-effort, high-impact version.
4. **A lead magnet at the door** (`/boring-marketing-lead-magnet`). Converts ambient traffic into subscribers;
   the magnet's topic should be the newsletter's promise in miniature, or the subscribers
   churn.
5. **Referral programs:** earn their keep only after the list is big enough that 1-2% of
   readers referring moves the number (rule of thumb: ~5k+ engaged). Below that, the reward
   ops cost more than the growth. Rewards should signal belonging, not cash value.

Social proof rules: quote real reader replies (with permission) on the signup page; state
concrete reader identity ("read by 4,000 heads of growth") over raw counts when the count is
small.

## Monetization: what actually pays small newsletters now

In rough order of when each turns on as a list grows. Skip any revenue-by-subscriber-count
table you've seen: variance by niche and engagement is the whole game, and static milestones
go stale and get quoted as fact.

1. **Paid recommendations / boosts. The first real money.** Beehiiv Boosts and SparkLoop pay
   the *recommending* list per verified engaged subscriber sent to another newsletter. Beehiiv
   Boosts: publisher-set CPA, typically ~$1-5 per verified sub, minus beehiiv's 20% fee (a
   $2.50 CPA nets $2.00); paid plans only. SparkLoop Partner Network: a stated $2-20 per sub,
   minus 20% commission + 3.5% fees; works with Kit and beehiiv, not Substack or Ghost, and
   SparkLoop itself suggests waiting until ~500-1,000 subs (all illustrative: verify current
   marketplace rates). This monetizes
   the signup flow, not the list size, so it works from near-zero. Guardrails: recommend only
   relevant letters, cap the post-signup offers shown, and watch your own engagement: junk
   recs poison deliverability and trust. Substack's recommendation network is the unpaid
   cousin: it pays in growth, not cash.
2. **Sponsorships. Once engagement is provable.** Sponsors of small lists buy *clicks and
   audience specificity*, not reach. Realistic from roughly 2-5k engaged subscribers in a
   defined niche. Pricing shorthand from two marketplaces (illustrative: check live listings
   before quoting a sponsor): SponsorGap (Mar 2026) lists consumer/lifestyle $25-70 CPM,
   health $40-100, tech/dev $60-150, finance $70-180, B2B marketing/SaaS $80-200, and
   $250-750 per dedicated send for lists under 5k. Paved's Jul 2026 benchmarks put HR/B2B at
   the top of revenue per subscriber and show realized rates well under headline ranges, for example a
   20k marketing list clearing ~$35-40 CPM (~$700-800 per primary placement); Paved's
   starter rule for a new list is 2.5-5% of subscriber count in dollars per placement (3k
   subs → $75-150). For small lists, flat per-send or per-click pricing beats CPM math. Practice judgment: sponsors the audience would genuinely use, ad
   copy written in the letter's own voice, clearly labeled, 1-2 placements max per edition,
   and share real click numbers with sponsors: it's the renewal engine.
3. **Own products and services. The best margin, no minimum list size.** Courses, templates,
   paid community, consulting. The newsletter is the trust engine; the sell stays soft (case
   studies and P.S. mentions inside regular editions, hard sells confined to dedicated launch
   sequences: `/boring-marketing-email-sequences`). Ratio discipline: at least ~80% of editions should carry
   zero pitch beyond a passing mention.
4. **Paid subscriptions: last, not first.** Needs a differentiated paid layer (depth, data,
   access, community), not the same letter with a velvet rope. Free-to-paid conversion for
   healthy letters runs on the order of 2-5% (illustrative); model revenue on that before
   committing to the production load of a paid tier. Annual plans discounted ~20% cut churn.
   Platform take on paid revenue: Substack 10% + processing; beehiiv and Ghost 0% + processing.

Most durable small-letter stacks combine #1 from day one, add #3 as the audience clarifies,
and treat #2/#4 as scale rewards. Deliverability is the substrate under all of it: Gmail/
Yahoo/Outlook bulk-sender rules are enforced; run `/boring-marketing-email-sequences`' preflight before any
monetized send matters.
