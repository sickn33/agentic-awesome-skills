# Google Ads API path (optional)

Load when a developer token is available and the user wants the audit read from the API or
the fixes scripted. The UI path in SKILL.md gets the same answers by hand. API version and
enum numbers live in `google-ads-facts.md`; check its header first.

## Setup in one paragraph

You need a developer token from a Google Ads manager account (basic access is granted after
a short review), OAuth credentials for a user who can see the account, and the customer
ID (10 digits, no dashes). When the account sits under a manager, send the manager's ID as
`login-customer-id`. Every call carries `Authorization: Bearer <token>` and
`developer-token: <token>`. Keep all of it in `.env` and never print it.

The variable names, which follow the Google Ads client libraries' convention:
`GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`,
`GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` and, under a manager,
`GOOGLE_ADS_LOGIN_CUSTOMER_ID`. Only the developer token is detected by the shared
capability check; the rest are read from `.env` when the API path runs. Get a short-lived
access token by exchanging the refresh token at `https://oauth2.googleapis.com/token`
(`grant_type=refresh_token`). With no OAuth credentials, use the UI path in SKILL.md.

## Read first: four queries that make the audit

POST `https://googleads.googleapis.com/<version>/customers/<id>/googleAds:search` with
`{"query": "..."}`. REST returns enum fields as names (`"TARGET_SPEND"`), which is what you
want. Some client libraries return numbers; convert with the library's enum helper, never
a hand-written map.

**1. Every conversion action and how it's set**

```sql
SELECT conversion_action.id, conversion_action.name, conversion_action.type,
  conversion_action.category, conversion_action.origin, conversion_action.status,
  conversion_action.primary_for_goal, conversion_action.include_in_conversions_metric,
  conversion_action.counting_type, conversion_action.click_through_lookback_window_days
FROM conversion_action
WHERE conversion_action.status != 'REMOVED'
```

**2. What each action actually recorded** (GAQL has no LAST_90_DAYS literal; use dates)

```sql
SELECT segments.conversion_action_name, metrics.conversions, metrics.all_conversions
FROM customer
WHERE segments.date BETWEEN '2026-08-15' AND '2026-11-12'
```

**3. Which goals bid, account level and per campaign**

```sql
SELECT customer_conversion_goal.category, customer_conversion_goal.origin,
  customer_conversion_goal.biddable
FROM customer_conversion_goal
```

```sql
SELECT campaign.name, conversion_goal_campaign_config.goal_config_level
FROM conversion_goal_campaign_config
```

**4. Bid strategy, budget and why impressions are lost**

```sql
SELECT campaign.name, campaign.status, campaign.bidding_strategy_type,
  campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.conversions,
  metrics.search_impression_share, metrics.search_budget_lost_impression_share,
  metrics.search_rank_lost_impression_share
FROM campaign
WHERE campaign.status = 'ENABLED' AND segments.date DURING LAST_30_DAYS
```

`amount_micros` and `cost_micros` are millionths of the account currency: 40000000 is 40.00.

## The biddable trap, and the fix

`customer_conversion_goal.biddable` is **not derived** from each action's
`primary_for_goal`. Seen in practice:

- Setting `primary_for_goal=false` on the only action in a goal left that goal biddable.
- Creating a new action with `primary_for_goal=false` still made its goal biddable.

Fix the goal itself with `customerConversionGoals:mutate`:

```json
POST https://googleads.googleapis.com/<version>/customers/<id>/customerConversionGoals:mutate
{
  "operations": [{
    "updateMask": "biddable",
    "update": {
      "resourceName": "customers/<id>/customerConversionGoals/PURCHASE~CALL_FROM_ADS",
      "biddable": false
    }
  }]
}
```

The resource name takes **enum names**, `PURCHASE~CALL_FROM_ADS`. The numeric form of
the same pair fails with a request error. Then re-run query 3 and confirm the result.
Never report a goal change from the write's success response alone.

## Creating website lead actions

The fields that matter for a lead action, as used in one repair:

```
name: "Web: Phone Tap"
type: WEBPAGE
category: PHONE_CALL_LEAD
status: ENABLED
counting_type: ONE_PER_CLICK
click_through_lookback_window_days: 30
value_settings: { default_value: 0, always_use_default_value: true }
primary_for_goal: true
```

A form action is the same with `category: SUBMIT_LEAD_FORM` and, if the form is rarely
used, `primary_for_goal: false` (then check goal biddability as above). After creating,
read back `conversion_action.tag_snippets` to get the conversion label the site needs. The
label isn't knowable before the action exists. Labels are not secrets, but they identify
an account: keep real ones out of anything shared publicly.

## Write discipline

- Scripts default to a dry run that prints every planned mutation (object, field, before,
  after). Writing needs an explicit flag and the user's yes for that exact change.
- One change at a time when diagnosing. Two changes at once make the result unreadable.
- Goal and bidding changes restart learning on every campaign that uses them, including
  paused campaigns when they resume. Note that in the report.
- Removing a conversion action can't be undone. Hide placeholders instead.
