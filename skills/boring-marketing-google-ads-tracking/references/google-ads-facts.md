# Google Ads facts for tracking work (perishable)

last-verified: 2026-11-13 · ttl-days: 90 · refresh: fetch support.google.com/google-ads/answer/6095882 ("Measure calls from ads") for the call tracking labels and steps; support.google.com/google-ads/answer/10995103 and /11461796 for goals and primary/secondary; support.google.com/google-ads/answer/9013908 and /3246303 for local actions; support.google.com/google-ads/answer/10993988 for tracking status meanings; developers.google.com/google-ads/api/reference/rpc/latest (the page header names the current API version); for enum numbers read the proto files at github.com/googleapis/googleapis under google/ads/googleads/<version>/enums/. Update every label and number below and bump last-verified.

Load at the start of every run. SKILL.md holds the method; this file holds the names and
numbers that change.

## UI labels and paths (checked 2026-11-13)

- Conversion actions live at **Goals > Conversions > Summary**.
- New call action: **+ Create conversion action > Conversions from phone calls > Save and
  continue > category "Phone call lead" > + Conversion action**, then one of:
  - **Calls from ads**: calls from call assets and location assets. Once call reporting is
    on, Google creates a default action with this name and includes it in Conversions.
  - **Calls from website visits**, defined as either **"Someone calls a number shown on my
    website"** (a Google forwarding number replaces the number on the page) or **"Someone
    makes a call by clicking a number on my website"** (counts taps on phone links).
  - **Calls via uploads**: not offered in the Phone call lead category; available in
    other categories for importing calls tracked elsewhere.
- Requirements for calls from ads: a call asset or a location asset with a verified phone
  number, **call reporting** on in account settings, a business in an eligible country.
- **AI-qualified call leads:** with call recording on, Google's AI analyzes the recording
  to judge lead quality. Recording is limited to calls where both parties are in the US or
  Canada and is governed by the Call Ads Supplemental Terms. Without a recording, Google
  falls back to the minimum call duration you set; without call reporting, to ad
  interaction data.
- **Business Profile calls:** when the Google Ads account is linked to the Business
  Profile, call history is on in the profile, and call reporting is on, profile calls that
  can be attributed to an ad interaction are reported in **Calls from ads**.
- **Primary vs secondary:** a primary action is used for bidding and appears in the
  Conversions column when the campaign optimizes toward its goal. A secondary action is
  excluded from Conversions and shows in **All conv.** for observation.
- **Account-default goals** are what campaigns bid toward unless a campaign is set to its
  own goals.
- **Tracking status column:** "No recent conversions" usually means no ad clicks led to a
  conversion in the last 7 to 14 days (not always a tag error). "Inactive", "Needs
  attention" or "Unverified" usually point at a missing or misconfigured tag, a wrong
  conversion ID or label, or an enhanced conversions problem. Allow 24 to 48 hours after
  a tag change.
- **Tag Assistant:** tagassistant.google.com. Connect the live domain, act like a
  customer, read which tags and events fire and to which destination.
- Campaign columns for the budget read: **Search impr. share**, **Search lost IS
  (rank)**, **Search lost IS (budget)**.

## Local actions (the credit that inflates)

- When location assets are active, Google Ads creates **local actions** conversions
  automatically. **Get directions** is biddable in Performance Max and Search; **Clicks to
  call** is biddable in Performance Max. They bid only if set to Primary and included in
  the campaign's goals.
- A local action counts when the customer interacts with the ad and later takes the
  action, **including on a later organic result for the business**, within the click-through
  window (default 30 days).
- In the API these show as conversion origin **GOOGLE_HOSTED** and type **GOOGLE_HOSTED**
  ("local actions from Google's products and services after interacting with an ad").
  Accounts often name them "Business profile - Call" or similar.

## API facts (checked 2026-11-13)

- Current API version on the reference pages: **v26**. Use the newest version in the URL
  (`https://googleads.googleapis.com/v26/...`) and re-check here when a call fails with a
  version error.
- **BiddingStrategyType** (from the v26 proto): UNSPECIFIED 0, UNKNOWN 1, ENHANCED_CPC 2,
  MANUAL_CPC 3, MANUAL_CPM 4, PAGE_ONE_PROMOTED 5, TARGET_CPA 6, TARGET_OUTRANK_SHARE 7,
  TARGET_ROAS 8, **TARGET_SPEND 9 (UI: Maximize clicks)**, **MAXIMIZE_CONVERSIONS 10**,
  MAXIMIZE_CONVERSION_VALUE 11, PERCENT_CPC 12, MANUAL_CPV 13, TARGET_CPM 14,
  TARGET_IMPRESSION_SHARE 15, COMMISSION 16, INVALID 17, MANUAL_CPA 18, FIXED_CPM 19,
  TARGET_CPV 20, TARGET_CPC 21, FIXED_SHARE_OF_VOICE 22. The numbers are listed so you can
  decode a raw value, not so you can write your own map. Prefer the library's enum name.
- **ConversionOrigin:** WEBSITE 2, GOOGLE_HOSTED 3, APP 4, CALL_FROM_ADS 5, STORE 6,
  YOUTUBE_HOSTED 7, LOCAL_SERVICES_ADS 8.
- **ConversionActionType** values you'll meet in a local account: AD_CALL 2 (call from an
  ad's call asset), CLICK_TO_CALL 3 (tap on a phone number on a mobile site), UPLOAD_CALLS
  6, UPLOAD_CLICKS 7, WEBPAGE 8, WEBSITE_CALL 9 (call to a dynamically generated number on
  the site), GOOGLE_HOSTED 28 (local actions), STORE_VISITS 36, WEBPAGE_CODELESS 37,
  LOCAL_SERVICES_ADS 51.
- **CustomerConversionGoal** resource name: `customers/{customer_id}/customerConversionGoals/{category}~{origin}`,
  with the category and origin written as enum names (`PHONE_CALL_LEAD~WEBSITE`). Its
  `biddable` field is set on the goal itself.

## Measurement options beyond a pause test

- Google lowered the minimum for its own incrementality experiments (Conversion Lift) to
  **$5,000** in 2025, using a Bayesian method. A free pause test against the phone log
  (`/boring-marketing-ads-incrementality-check`) answers the same question for a small local account.
