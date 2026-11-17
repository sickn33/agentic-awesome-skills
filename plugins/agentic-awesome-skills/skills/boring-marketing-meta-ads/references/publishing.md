# Publishing campaigns programmatically

Base URL: `https://graph.facebook.com/v26.0` (versions expire; check `meta-facts.md`)
Auth: `Authorization: Bearer $META_ACCESS_TOKEN`

## The object hierarchy

```
Campaign          objective, special ad category, buying type
  └─ Ad Set       budget, schedule, targeting, optimization, bid strategy
       └─ Ad      pairs an ad set with a creative
            └─ Ad Creative    image/video + copy + link + CTA, tied to a Page
```

Budget lives on **either** the campaign (CBO) **or** each ad set, not both.
Budget on the ad set requires `is_adset_budget_sharing_enabled` on the campaign.

## Minimal request helper

```js
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v26.0'}`;

async function graph(path, { method = 'GET', body } = {}) {
  const init = { method, headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` } };
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${GRAPH}/${path}`, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    // error_user_msg is the human-readable half and is often the only useful part
    throw new Error(`${res.status} ${e.message || JSON.stringify(json).slice(0, 300)}`
      + (e.error_user_msg ? ` | ${e.error_user_msg}` : ''));
  }
  return json;
}
```

Meta errors carry `message` (developer-facing) and sometimes `error_user_msg`
(what the UI would show). Log both; they frequently disagree about the cause.

## Campaign

```js
await graph(`${AD_ACCOUNT}/campaigns`, { method: 'POST', body: {
  name: 'Brand | Market | Objective | 2026-09',
  objective: 'OUTCOME_LEADS',
  status: 'PAUSED',
  special_ad_categories: [],
  buying_type: 'AUCTION',
  is_adset_budget_sharing_enabled: false,
}});
```

Objectives (the ODAX set; the old `LINK_CLICKS`-era names are gone):
`OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`,
`OUTCOME_ENGAGEMENT`, `OUTCOME_APP_PROMOTION`.

`special_ad_categories` is **immutable after creation.** Getting it wrong means
deleting the campaign and starting over. Employment, housing, financial products and services, and social
issues, elections or politics all have their own category and their own restrictions.

## Ad set

```js
await graph(`${AD_ACCOUNT}/adsets`, { method: 'POST', body: {
  name: 'Market +25mi | Broad',
  campaign_id,
  status: 'PAUSED',
  daily_budget: 3000,                        // CENTS
  billing_event: 'IMPRESSIONS',
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  optimization_goal: 'OFFSITE_CONVERSIONS',
  promoted_object: { pixel_id: PIXEL_ID, custom_event_type: 'LEAD' },
  targeting: {
    geo_locations: {
      custom_locations: [{ latitude: 32.7767, longitude: -96.7970, radius: 20, distance_unit: 'mile' }],
    },
    age_min: 18, age_max: 65, genders: [1, 2],
    targeting_automation: { advantage_audience: 1 },
  },
}});
```

**Budgets are in the account's minor currency unit.** `3000` is $30.00 in a USD
account. Sending dollars creates a 100× overspend, which is the single most
expensive mistake available in this API.

**`bid_strategy` must be explicit.** Meta rejects an ad set that has a budget but
no stated strategy. `LOWEST_COST_WITHOUT_CAP` is the right default for a new
pixel: a bid cap on a pixel with no conversion history throttles delivery
before it can learn.

**Geo targeting** takes either `custom_locations` (lat/lng + radius) or named
`cities` / `regions` / `countries`. Radius is capped at 50 miles, and Special Ad
Categories impose a 15-mile *minimum*. Proximity targeting around several points
is how you cover a corridor without buying a whole state.

Common optimization goals: `OFFSITE_CONVERSIONS` (needs `promoted_object`),
`LEAD_GENERATION` (instant forms), `LANDING_PAGE_VIEWS`, `LINK_CLICKS`,
`REACH`, `THRUPLAY`.

## Uploading an image

Images go up as multipart. A JSON helper cannot carry the file.

```js
const form = new FormData();
form.append('filename', new Blob([readFileSync(file)]), basename(file));
const res = await fetch(`${GRAPH}/${AD_ACCOUNT}/adimages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}` },
  body: form,
});
const json = await res.json();
const hash = Object.values(json.images)[0].hash;
```

The response keys images by a mangled filename, so read the value rather than
looking the key up.

## Ad creative

```js
await graph(`${AD_ACCOUNT}/adcreatives`, { method: 'POST', body: {
  name: 'variant-a',
  object_story_spec: {
    page_id: PAGE_ID,
    link_data: {
      image_hash: hash,
      link: 'https://example.com/landing?utm_source=facebook&utm_medium=paid&utm_campaign=...',
      message: PRIMARY_TEXT,     // the body copy above the image
      name: HEADLINE,            // bold line under the image
      description: DESCRIPTION,  // small line under the headline
      call_to_action: { type: 'LEARN_MORE' },
    },
  },
}});
```

A creative is **immutable**. Changing copy or image means creating a new
creative and a new ad. There is no edit.

CTA types include `LEARN_MORE`, `APPLY_NOW`, `BOOK_TRAVEL`, `CONTACT_US`,
`GET_QUOTE`, `SIGN_UP`, `SHOP_NOW`, `CALL_NOW`. Some are restricted by objective.

Put the variant name in `utm_content` so performance is attributable in your own
analytics, not only in Ads Manager.

## Ad

```js
await graph(`${AD_ACCOUNT}/ads`, { method: 'POST', body: {
  name: 'variant-a',
  adset_id,
  creative: { creative_id },
  status: 'PAUSED',
}});
```

## Replacing creative

Since creatives are immutable, iterating means delete-and-recreate the ads:

```js
const existing = await graph(`${adsetId}/ads?fields=id,name&limit=50`);
for (const ad of existing.data) await graph(ad.id, { method: 'DELETE' });
// then create new creatives + ads as above
```

Deleting the *ads* keeps the ad set's learning. Deleting the ad set resets it.

## Reading results

```js
await graph(`${campaignId}/insights?fields=spend,impressions,clicks,actions,cost_per_action_type`
          + `&date_preset=last_7d&level=ad`);
```

`actions` is an array of `{ action_type, value }`. Conversions are in there
under names like `offsite_conversion.fct.lead`, not as a top-level field.

**Attributed conversions are not caused conversions.** Meta reports what it can
match to an impression or click within the attribution window, which includes
people who would have converted anyway. For anything with a real budget, compare
against a holdout or a before/after on total volume rather than trusting the
in-platform number.

## Safety rules for an agent

- **Create PAUSED. Always.** Enabling is a separate, human-confirmed step.
- **Dry-run first.** A `--check` mode that does no writes catches permission and
  config problems before any object exists.
- **Range-check the budget** before sending. Assert it's an integer within an
  expected band; a `NaN` or a dollars-instead-of-cents value should throw.
- **Clean up orphans** from failed runs before retrying.
- **Never commit the token.** Environment only.
