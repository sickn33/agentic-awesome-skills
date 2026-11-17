# Platform Facts: X and LinkedIn ranking mechanics

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web search "X algorithm open source
x-algorithm github changes" and "LinkedIn algorithm format ranking carousel dwell time
{current year}"; prefer primary sources (xai-org/x-algorithm repo, LinkedIn engineering
posts, large-sample creator studies). Update this file AND `./brand/algo-cache.md` if the
brand keeps one, then note the refresh in one line of the deliverable.
changes: 2026-09-02. X: live scoring weights public since the Aug 13 release (the "+75
author reply" line was the 2023 legacy table; replaced), Jul 16 solicitation enforcement.
LinkedIn: May 20 generic-AI suppression, Jul 30 "AI slop" report button. Rest unchanged.

Load when: DRAFT, QT/REPLY, or CADENCE runs and `./brand/algo-cache.md` is missing or
staler than this file. If today > last-verified + ttl-days, refresh BEFORE relying on
anything below.

---

## X (verified 2026-09-02)

- Ranker: Jan 2026 Grok-transformer model ("Phoenix"), open-sourced at github.com/xai-org/
  x-algorithm; the Aug 13, 2026 release added the live weights (`home-mixer/params/param.rs`).
- **Score = Σ weight × P(action):** like 0.5 · repost 1.0 · reply 5.0 (+15 when viewer
  and author follow each other) · quote 5.0 · share about 2 · DM-share 5.0 · copy-link share
  20 · follow-author 4.0 · link open 0.2. Negatives: not-interested -43 · block -31 ·
  mute -59 · report -234. Each weight multiplies the predicted probability of that action, not a raw count (X's repo note says so), so don't read it as "one report cancels 470 likes". Reply speed matters.
- **External links: 30-50% reach penalty** (independent tests range up to 94%); a link
  open scores 0.2 vs 5.0 for a reply. Links go in a first reply; the post stands alone.
- **SimClusters / topical focus:** topically-consistent accounts get up to 3x For You
  reach. Off-lane posts cost more than their own reach, because they dilute the account's cluster.
- **Constructive sentiment is boosted; combative is suppressed.** Attack mechanisms, not people.
- **Solicitation is enforced (Jul 16, 2026):** three direct asks ("I'll follow everyone
  who replies") remove the account from the creator program; duplicated viral text and
  watermark-reposts are demoted. Posts older than 48h leave For You.
- Premium unlocks long posts (no length penalty) but has no multiplier in the scorer.

## LinkedIn (verified 2026-09-02)

- **Format ranking: carousels/documents #1, text #2, native video #3** (video +36% YoY).
  Document posts average ~6.6% engagement, the best organic format on the platform.
- **Dwell gate: ≥5 seconds.** The two lines visible before "see more" must open a loop
  worth resolving; context-first openers die at the fold.
- **First 60 minutes ≈ 70% of total reach**, driven by comment velocity. Hence the
  first-60-min comment plan: seed 2-3 discussion comments, answer every reply fast.
- **Generic-AI suppression is official (May 20, 2026):** AI-pattern posts with no clear
  perspective and automated or restating comments reach only the author's own network;
  the Jul 30 "seems like AI slop" button drew 1M+ reports in three weeks and reported
  posts average ~40% fewer views. AI-assisted drafting is fine when the take is the
  author's. Saves and substantive comments outrank reactions; a like is the weakest.
- Newsletters bypass the feed (subscriber delivery), a separate distribution channel,
  not a post format.
- The 2025-26 organic reach drop is the interest-graph shift: reach follows topic
  relevance over connection graph. Same implication as X's SimClusters: stay in your lane.
