# Platform Facts: algorithms, formats, posting APIs

last-verified: 2026-09-02 · ttl-days: 90 · refresh: for each platform below, web search `"{platform} algorithm change {current month} {current year}"` and `"{platform} ranking signals {current year}"`; for X also check github.com/xai-org/x-algorithm commit history. Update changed entries, update last-verified, and note material changes in one line to the user. Per-brand observations (what worked for THIS brand) belong in `./brand/algo-cache.md`, not here.
changes: 2026-09-02: X published its live scoring weights (Aug 13 expanded open-source; the "+75 author reply" figure was the 2023 legacy table and is replaced below), added Grok-based engagement-solicitation enforcement (Jul 16) and the "Under the Hood" label export, and ended the free API tier (Feb 6; pay-per-use, $0.20 per URL post). LinkedIn suppresses generic-AI posts and automated comments beyond the author's network (May 20) and shipped a "seems like AI slop" report button (Jul 30; reported posts ~40% fewer views). Instagram stopped recommending repost/aggregator accounts for photos and carousels (Apr 30). Threads hit 500M MAU with Dear Algo / Your Algo feed steering. Reddit's AI-citation share is now engine-specific (ChatGPT ~0.5% since mid-Aug; Perplexity and AI Overviews still heavy). YouTube Shorts signals restated from YouTube's own help page; TikTok US retrain confirmed. Bluesky and default posting times: no material change.

**When to load:** Phase 3 of /boring-marketing-content-atomizer (consult the relevant platform section while drafting), the freshness gate at skill start, and the Scheduling section (Posting APIs below). Where `./brand/algo-cache.md` conflicts with this file, the fresher `last-verified` wins.

---

## Cross-platform quality signal (September 2026)

- Three platforms now enforce against rephrased-spray and aggregation with named mechanisms. LinkedIn suppresses generic AI posts and automated comments beyond the author's own network (May 20) and lets readers report "AI slop" (Jul 30). X demotes duplicated viral text and watermark-reposts and removes repeat engagement-solicitors from its creator program (Jul 16). Instagram stopped recommending accounts that mostly repost others' work (Apr 30). Audiences pattern-matched it as slop first; "1 piece → 16 posts → 8 platforms" is a strategy for being ignored at scale.
- Atomizing your OWN source into platform-native pieces is unaffected. Re-uploading, rephrasing, and templating are what get caught.

## X (Twitter)

**Ranker:** Jan 2026 Grok-transformer ranker ("Phoenix"), open-sourced at github.com/xai-org/x-algorithm. The Aug 13, 2026 release expanded the repo 10-15x and includes the live scoring weights (`home-mixer/params/param.rs`). The old hand-tuned tables (QT > RT > like, "+75 for an author reply") were the 2023 legacy ranker, so do not reason from them.

- **Score = Σ weight × P(action).** Default weights: like 0.5 · repost 1.0 · reply 5.0 (+15 when viewer and author follow each other) · quote 5.0 · share 2.0 · share via DM 5.0 · share via copy-link 20.0 · follow-author 4.0 · link open 0.2 · dwell 0.05. Negatives: not-interested −43 · block −31 · mute −59 · report −234. Read it as: a reply is worth ten likes, a copy-link share forty, and one report erases ~470 likes. Design for replies, DM-shares, and follows from outside the follower graph; anything that provokes "not interested" or reports is net-negative at any engagement level.
- **External links: 30-50% reach penalty** in independent 2026 tests (up to 94% in some). The scorer values a link open at 0.2 versus 5.0 for a reply, so a clicked link barely counts even where it isn't penalized. Links go in the first reply, or don't go at all. The post itself must deliver the value.
- **SimClusters topical focus:** accounts that post consistently within a topic cluster get up to **3x For You reach**. Off-topic spray from one account dilutes this, which is another reason atomization should respect what the account is *about*.
- **Constructive sentiment is boosted; combative/ragebait is suppressed.** This is modeled sentiment, not keyword matching, so genuinely adversarial framing loses reach even when polite in wording.
- **Engagement bait is enforced, not just demoted (Jul 16, 2026):** Grok-based detection. Three or more direct engagement solicitations ("I'll follow everyone who replies", follow-and-RT prompts, "comment X for Y") remove the account from the creator-revenue program and forward it to policy review. Reposted/remixed content with added watermarks or intros and duplicated viral text posts are demoted the same way.
- **Distribution window and author cap:** candidates older than 48 hours leave For You; additional posts from the same author in one feed load are multiplied by 0.5 (floor 0.25); out-of-network posts carry a 0.75 factor. Five posts an hour do not earn five feed slots.
- **Premium** unlocks long-form posts (the "Show more" fold, so the pre-fold lines are the hook surface). No Premium multiplier appears in the open-sourced scorer; treat the widely quoted "2-5x impressions" as unverified.
- **"Under the Hood" (Aug 2026):** accounts with 10+ posts in the past month can export the visibility labels applied to their account and posts. Check it before diagnosing a reach drop as a content problem.

## LinkedIn

- **Format ranking: carousels/documents #1** (~6.6% engagement rate), **text posts #2, native video #3** (+36% YoY growth). External-link posts underperform; put links in comments or use a text-led post.
- **Dwell-time gate: ≥5 seconds** of feed dwell is the quality threshold a post must clear before wider distribution.
- **First 60-90 minutes ≈ 70% of total reach.** Comment velocity in that window is the main accelerant. Post when the author can be present to reply, not at an abstract "best time."
- **Generic-AI suppression is official (May 20, 2026):** posts that read as AI-generated without a clear perspective, and comments produced at scale by automation or that merely restate the post, are distributed only to the author's immediate network (not removed, not amplified). LinkedIn claims 94% detection accuracy, with no false-positive figure. AI-assisted drafts are explicitly fine when the perspective is the author's. Since Jul 30 readers can flag "seems like AI slop": 1M+ reports in three weeks, and LinkedIn's CPO says reported posts average ~40% fewer views. The "enhance your post" AI rewriter was removed and replaced with a proofreader.
- **Saves/bookmarks and substantive comments outrank reactions** as quality signals; a like is the weakest positive. The 2025-26 interest-graph shift cut broad reach and rewards topical authority.
- **Newsletters bypass the feed** (delivered to subscriber inbox/notifications). Long-form material may be worth more as a newsletter edition than as 3 posts.
- Hashtags are near-irrelevant for reach; 0-3 maximum, never a tag wall.

## Instagram

- **Aggregator accounts lost recommendations (Apr 30, 2026):** accounts that regularly repost content they didn't create (now for photos and carousels, not just Reels) are no longer recommended to non-followers. Materially transformed content (added commentary, text, voiceover) counts as original; watermarks and speed changes don't. Repurposing your own source is unaffected; re-uploading others' is dead.
- **Hashtags are effectively dead** for discovery, since ranking is semantic inference from the content itself. Don't generate hashtag blocks.
- **Hook window <1.5 seconds** on Reels. The first frame and first spoken words decide retention.
- **Sends, saves, and shares outrank likes.** Mosseri's confirmed top signals are watch time, sends per reach, and likes per reach. "Send this to someone who..." content wins because of the *send*, not the caption asking for it, so design for shareability and don't beg for it. Resharing a feed post to Stories does not meaningfully change its reach (Mosseri, Apr 2026), so skip the ritual.
- Carousels remain the strongest save-driver for educational material; 1080x1350 (4:5) is the standard canvas.

## TikTok

- **Completion and rewatch are the top-weighted signals.** One tight idea that loops beats a long list that loses 70% of viewers mid-way.
- **US algorithm forked:** the TikTok USDS joint venture closed Jan 22, 2026; the recommendation model is hosted in Oracle data centers and retrained, tested, and updated on US user data only (NPR/CNBC). US distribution now diverges from the rest of the world. Don't generalize ROW performance reports to US audiences or vice versa; if the brand's audience is US-based, prefer US-sourced performance evidence.
- Captions on-screen are mandatory craft (majority sound-off viewing); trending audio is a discovery lever when it fits, never a requirement.

## YouTube

- **Shorts run up to 3 minutes** (since Oct 2024), so a Short is no longer necessarily a 30-second clip; tutorials fit.
- **Shorts signals, per YouTube's help page:** % of viewers who chose to view (vs swipe), average view duration, average % viewed, likes, and post-watch survey results. Shorts performance does not hurt long-form recommendations. Creator data (Tubefilter, unconfirmed by YouTube) shows Shorts older than ~30 days losing reach since Sept 2025, so Shorts are a recency channel and long-form is the evergreen one.
- **Satisfaction, not just watch time:** post-watch surveys feed ranking platform-wide. Session contribution still outweighs raw watch time, so a video that leads viewers to watch more (of anything) is favored over one that strands them. Long-form: thumbnail/title CTR and retention curve remain the operating levers.

## Threads

- **500M monthly users (Jun 2026); ads global since Apr 2025, DMs since mid-2025.** A mature platform, not a quiet beta; organic reach has normalized accordingly. Users can steer their own feed by topic with "Dear Algo" (public post, Feb 2026) and "Your Algo" (private, Jun 2026), so topical clarity in the post text is what gets a post into a steered feed.
- Reply depth and reshares drive distribution; conversational, take-led posts outperform broadcast-style content. Mosseri: link posts now get greater value (the earlier link penalty was reversed); "nice post"/emoji-only and bait-driven replies are down-ranked.

## Bluesky

- **Growth plateaued:** ~43M registered accounts, ~27M claimed monthly and ~3.7M daily actives (spring 2026), growing 2-3% per period. Treat as a niche channel, worthwhile only if the brand's audience (tech, media, journalism, academia) demonstrably lives there. Custom feeds are the discovery mechanism; 300-char posts; chronological-first culture.

## Reddit

- **AI-citation share is engine-specific and volatile.** Perplexity draws roughly a quarter of its citations from Reddit and Google AI Overviews lean on it heavily (early 2026); ChatGPT Search dropped from ~3.8% to ~0.5% of citations in mid-Aug 2026 after a retrieval change toward site:-scoped queries (Promptwatch/Qwairy tracking; cause unconfirmed). A strong value post in the right subreddit still has Google/Perplexity shelf life that feed posts never get. Just don't sell it as a ChatGPT play.
- Mechanics are evergreen: first-hour upvote velocity gates Hot; subreddit rules and disclosure norms are enforced by humans who remember; self-promotion without standing gets removed.

---

## Posting APIs (for the Scheduling section)

- **X API v2:** `POST /2/tweets` is pay-per-use. The free tier ended Feb 6, 2026 (legacy free/Basic accounts are being migrated). List price: $0.015 per post created, **$0.200 if the post contains a URL**, reads $0.005 per post, capped at 3M post reads per month before Enterprise (docs.x.com/x-api/getting-started/pricing). Budget the URL surcharge or put the link in a reply.
- **LinkedIn Posts API** (successor to the UGC Posts API): posting on behalf of a member or organization requires an approved app with the Community Management / w_member_social scopes; not casually self-serve.
- **Threads API:** public since mid-2024; supports publishing and reply management via Meta's developer platform.
- **Buffer** (`BUFFER_ACCESS_TOKEN`) and **Hootsuite** (`HOOTSUITE_API_KEY`) remain the simplest multi-platform queues; neither covers every platform (Reddit and Bluesky typically excluded; TikTok/YouTube need native upload).
- Regardless of transport: show final text + platform + time and get explicit confirmation before anything goes live. Non-interactive runs write files only.

## Default posting times (no learnings data)

Generic priors. Real priors from `./brand/learnings.md` always override:

| Platform | Default window (audience-local) |
|---|---|
| LinkedIn | Tue-Thu 8-10 AM |
| X | Weekdays 9 AM-1 PM |
| Instagram | Mon/Wed/Fri 11 AM-1 PM |
| TikTok | Tue-Thu 6-9 PM |
| YouTube Shorts | Daily 12-3 PM |
| Threads | Daily 9-11 AM |
| Reddit | Weekday mornings, subreddit-dependent |

More important than any slot: post when the author can spend the following 30 minutes in the replies (see X reply weights and LinkedIn first-60-minutes above).
