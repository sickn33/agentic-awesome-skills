# Paid Ads Platform Specs (perishable, so check the header before relying on anything below)

last-verified: 2026-09-02 · ttl-days: 90 · refresh: web-search "Meta ad specs primary text headline character limits {current year}", "Google responsive search ad asset limits site:support.google.com", "Performance Max asset group requirements", "LinkedIn ads specs single image carousel", "TikTok ads text specs safe zone"; update every limit and safe zone below and bump last-verified. Per-brand delivery observations go to ./brand/algo-cache.md, not this file.
changes: 2026-09-02. Meta: feed recommendation is now 4:5 at 1440x1800, Stories/Reels safe zone is top 14% / bottom 35% / sides 6%, Reels run to 15 min, carousel card headline ~20; Google: PMax descriptions are 2-5 x 90 (60-char short slot gone), video cap 5→15, Demand Gen headlines 1-5 x 40 + 9:16 images; LinkedIn intro-text cap 600→3,000 (carousel 255), video 3s-30min; TikTok auction video up to 10 min, US joint venture + algorithm split dated (2026-01-22).

Load this file at the start of Phase 3 (platform copy) and when writing creative briefs
(Phase 4). If today is past last-verified + ttl-days, refresh FIRST. If the refresh isn't possible, say
in the Sources and assumptions note that the specs are as of last-verified.

---

## Meta (Facebook + Instagram)

### Copy fields

| Field | Limit | Working rule |
|---|---|---|
| Primary text | technically long; ~125 chars visible before "See more" (Meta recommends 50-150 Facebook Feed, 125 Instagram Feed/Stories, ~40 Reels) | Hook must land inside the visible 125. Provide a short and a ~300-500 char long version per ad |
| Headline | ~40 chars before truncation (Meta recommends 27 Facebook Feed, 40 Instagram Feed/Stories, 55 Reels; the ads-on-Reels overlay shows 10) | The claim compressed, not a label |
| Description | ~30 chars; Meta no longer lists it for Feed and it rarely renders | Optional; urgency or proof fragment |
| CTA button | fixed list | Shop Now / Learn More / Sign Up / Get Offer / Download / Book Now / Subscribe |

Advantage+ creative: supply multiple text variants per field and images at 1:1, 4:5,
and 9:16; the system mixes per placement. Don't bake text into images destined for
Advantage+ (auto-enhancements and overlays collide with it).

### Image / video

| Placement | Ratio | Size | Notes |
|---|---|---|---|
| Feed | 4:5 (1:1 still accepted) | 1440x1800 recommended (1080x1350 / 1080x1080 fine) | 4:5 takes the most screen real estate; Meta's guide now leads with it |
| Stories / Reels | 9:16 | 1440x2560 recommended (1080x1920 fine) | Meta's stated safe zone: keep the top ~14%, bottom ~35%, and ~6% each side clear of text/logos, so the usable band is the middle half |
| Carousel | 1:1 | 1080x1080, 2-10 cards | Card 1 must work standalone; Meta recommends ~20-char card headlines, 18-char descriptions |
| Video | per placement | Feed 1s-241min (use 15-30s); Stories up to 60min, Reels up to 15min (use 5-15s) | Auto-plays muted, so a visual hook and captions are mandatory |

The old hard "20% text rule" is gone, but text-heavy images still reduce delivery in
practice. Keep on-image text ≤6 words and let the text fields carry the copy.

## Google Ads

### Responsive Search Ads (RSA)

| Asset | Limit | Count |
|---|---|---|
| Headlines | 30 chars each | up to 15 (write all 15) |
| Descriptions | 90 chars each | up to 4 (write all 4) |
| Display paths | 15 chars each | 2 |
| Business name | 25 chars | 1 |

Google assembles up to 3 headlines + 2 descriptions per impression, and may also drop a
headline into a description slot or a link asset. Write headlines in
four interchangeable groups (hook/keyword, benefit, proof, CTA) so any combination
reads as a sentence pair, never a repetition. Pinning reduces combinations and lowers
Ad Strength; pin only compliance/brand lines (position 1), with 2-3 alternatives per
pinned position.

### Performance Max asset groups

| Asset | Spec |
|---|---|
| Headlines | 3-15 × 30 chars (include one ≤15 chars) |
| Long headlines | 1-5 × 90 chars |
| Descriptions | 2-5 × 90 chars (the old 60-char "short description" slot is gone) |
| Business name | 25 chars |
| Images | up to 20 per ratio: 1.91:1 (1200x628), 1:1 (1200x1200), 4:5 (960x1200) |
| Logos | 1:1 (1200x1200, up to 5) and 4:1 (1200x300, up to 20) |
| Video | up to 15, ≥10s, 16:9 / 1:1 / 9:16; supply your own or Google auto-generates one (usually worth pre-empting) |

One asset group per matrix hook row keeps the cell mapping clean.

### Display (fixed sizes, by impression volume)

300x250 (medium rectangle) > 728x90 (leaderboard) > 160x600 (skyscraper) > 320x50
(mobile) > 970x250 (billboard). Responsive Display assets: landscape 1200x628, square
1200x1200, logo 1200x1200 + 1200x300, short headline 30, long headline 90, description
90. **No text in responsive-display images**; Google overlays its own.

### Demand Gen / YouTube

Demand Gen (replaced the old Discovery campaigns) serves YouTube, Discover, and Gmail:
images at 1.91:1 / 1:1 / 4:5 / 9:16 (1080x1920), 1-5 headlines × 40 chars (one ≤30),
1-5 descriptions × 90, business name 25, carousels 2-10 cards; video in 16:9, 9:16 or
4:5, 1:1 (min 5s; under 10s is ineligible for in-stream). YouTube video: 16:9 or 9:16
(Shorts placements); bumper = 6s non-skippable, one message; skippable in-stream must
hook before the 5s skip; custom thumbnail 1280x720.

## LinkedIn

### Copy fields

| Field | Limit | Working rule |
|---|---|---|
| Intro text | 3,000 max (carousel: 255); truncates ~150 desktop, ~100 mobile | Insight in the first 150 chars; no "I'm excited to share" |
| Headline | 200 max; ~70 before truncation | Outcome-focused, zero hype words |
| Description | 300 max (~100 shown); only renders when the image is <200px wide or on the Audience Network | Don't put load-bearing copy here |
| CTA button | fixed list | Learn More / Download / Register / Sign Up / Request Demo / Subscribe |

### Formats

| Format | Spec |
|---|---|
| Single image | 1200x628 (1.91:1), 1200x1200 (1:1) or 720x900 (4:5); ≤5MB |
| Carousel | 1080x1080, 2-10 cards, card headline 45 chars (2 lines), ≤10MB/card; cards can't be edited after save |
| Video | 16:9 / 1:1 / 4:5 / 9:16; 3s-30min allowed (in-stream ≤90s), 15-30s qualifies for every placement; SRT captions (sound-off default) |
| Document ad | PDF; first page is the creative |

LinkedIn is the one platform where firmographic targeting (title, function, company
size, industry) legitimately beats broad, because it's the product. CPCs are high; see
ads-judgment budget floors before recommending it.

## TikTok

### Copy + creative

| Field / spec | Value |
|---|---|
| Ad text | keep ≤100 Latin chars (≤50 CJK) or it truncates to "See more"; max 4 lines shown; emoji display, `{}` unsupported, @/# not clickable in non-Spark ads; native voice |
| Video | 9:16, 1080x1920 (min 540x960); auction ads up to 10 min, reservation 5-60s; sweet spot 9-15s for conversion; hook inside first 2s; ≤500MB |
| Safe zones | TikTok ships a downloadable safe-zone template and the mask grows with caption length; rule of thumb on a 1920-tall frame: top ~130px (brand/music UI), bottom ~480px (caption + CTA stack), right ~140px (engagement icons); keep subject center-left |
| CTA button | fixed list: Shop Now / Learn More / Sign Up / Download / Book Now |

Native-feel is a delivery factor, not taste: over-produced creative gets skipped and
the algorithm prices the ad accordingly. Phone-shot aesthetic, spoken hook, on-screen
text captions. Spark Ads (boosting an organic post via authorization code) inherit
organic engagement and usually outperform dark ads. If an organic account exists, test
organic first, boost winners.

US note: TikTok's US operations moved to the Oracle-led TikTok USDS joint venture on
2026-01-22 and the US For You feed now runs a separately retrained model (US data only,
full cutover in Q2 2026). US performance patterns no longer transfer 1:1 from other
markets; re-test rather than porting "what worked in the UK."

## Cross-platform adaptation (judgment, stable)

Adapting a concept across platforms means re-cutting, not resizing:

- **Meta → Google responsive/PMax:** strip baked-in text (Google overlays its own),
  simplify to one focal point that survives 300x250.
- **Meta → LinkedIn:** swap emotional urgency for insight/data framing; lifestyle →
  business context; keep the same hook_type, change its register.
- **Anything → TikTok:** drop the polish, move subject center-left, lead with motion
  or a spoken line; a resized Meta ad is TikTok's most expensive format.
- **Search ≠ social:** Search copy answers a query (keyword in headline group 1);
  social copy interrupts a scroll (hook first). Don't port social hooks into RSA
  headlines verbatim. Compress to the claim.
