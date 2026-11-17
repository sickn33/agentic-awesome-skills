# Meta facts (perishable)

last-verified: 2026-11-13 · ttl-days: 90 · refresh: fetch developers.facebook.com/docs/marketing-api/marketing-api-changelog/ for versions and expiry dates; facebook.com/business/help/2220749868045706 for Special Ad Category audience rules; facebook.com/business/help/761812391313386 for instant forms; the Meta ad specs pages for placement ratios. Update the values below, set the scripts' default version if it is within 60 days of expiry, and bump last-verified.

Load before running any script, and whenever Meta returns a version or deprecation error.

## Marketing API versions (checked 2026-11-13)

| Version | Released | Expires |
|---|---|---|
| v27.0 | 2026-11-04 | not yet set |
| v26.0 | 2026-07-29 | not yet set |
| v25.0 | 2026-02-18 | 2027-02-23 |
| v24.0 | 2025-10-08 | expired 2026-11-10 |

Marketing API versions expire sooner than the Graph API platform dates suggest. The
scripts default to **v26.0** and read `META_GRAPH_VERSION` when set. Older copies of
this skill shipped with v21.0, which has expired: anyone using an old copy needs the
version bumped.

## Special Ad Categories (checked 2026-11-13)

- Categories: **Employment**, **Housing**, **Financial products and services** (replaced
  the narrower Credit category; required for US advertisers and audiences since
  2025-01-21), and **Social issues, elections or politics**.
- Required when the advertiser is in the US or the ad reaches people in the US, Canada or
  parts of Europe.
- What declaring one locks: age fixed to 18 to 65+, all genders, no ZIP or postal code
  targeting, no location exclusions, city, address and pin-drop audiences widened to at
  least a **15-mile radius** in the US, no lookalikes, some detailed targeting unavailable
  and no detailed targeting exclusions. Saved audiences are updated to comply.
- The category is set on the campaign and **can't be changed after creation**.
- In the API it is the campaign's `special_ad_categories` array. Read the allowed values
  in the current campaign reference before sending one; the financial category's API
  value changed when Credit was replaced.

## Delivery and learning

- An ad set wants about **50 optimization events in the 7 days** after its last
  significant edit to exit the learning phase. Below that, delivery is uneven and cost per
  result is noise.
- Custom location radius: an earlier version of this skill found a 50-mile maximum for `custom_locations`.
  Verify before relying on it.

## Placements and the crop

- A 1080x1920 asset is cropped, not letterboxed, for feed. 4:5 (1080x1350) removes about
  285px from each end; 1:1 (1080x1080) removes about **420px from each end**. Keep text,
  faces and the CTA inside y 420 to 1500.
- Stories and Reels: keep roughly the top 14%, the bottom 35% and 6% each side clear of
  text and logos (Meta's stated safe zone at the paid-ads specs check, 2026-09-02).

## Lead forms (checked 2026-11-13)

- Instant form types: **Higher intent** (adds a review step), **More volume**, **Rich
  creative**.
- Performance goals: maximize leads (volume) or **maximize conversion leads** (quality),
  which needs the CRM connected through the Conversions API so Meta learns which leads
  became customers.
