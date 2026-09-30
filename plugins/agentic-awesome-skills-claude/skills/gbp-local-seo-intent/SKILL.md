---
name: gbp-local-seo-intent
description: 'Google Business Profile register: element, primary and supporting keywords, search intent, landing page, post dates, review rating and reply status, visibility and status. Use for local SEO.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, gbp, google-business-profile, local-seo, local-pack, map-pack, intent, categories, services, reviews, posts, photos, attributes, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# GBP & Local SEO Intent

**What it is:** the Google Business Profile taken from claimed to complete, with the search-intent map behind it - which query means what, which one the profile should answer, and what proves the answer is right.

## Overview

Works out the smallest useful profile for the business in front of it, then builds it only
when asked. The default output is a short recommendation, not a profile. The GBP register -
CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request, from one field list so
the four cannot drift apart.

Layer: Layer 3: Acquire. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** five different things are recorded in one place
and must not be confused - the profile itself, the services, the posts, the reviews, and
the questions. A `Row Type` discriminator keeps them apart, because a profile update and a
review reply are different actions with different owners, and merging them turns the
register into a log nothing can be filtered out of.

**The second rule:** local rank is relevance, distance and prominence. A profile controls
relevance directly and prominence partly. Nobody can buy a better local rank, and this skill
never suggests otherwise.

## When to Use This Skill

- Google Business Profile, Google My Business, GMB, GBP
- map pack, local pack, local SEO, "near me" searches
- "we do not appear on Google Maps"
- categories, services, products, attributes, business description
- GBP posts, updates, offers, events
- reviews, review replies, review strategy
- Bing Places, Apple Business Connect, and the other map surfaces
- local keyword and intent research

Do not use it for: the website's own page structure (`business-website-setup`), off-site
directory citations (`seo-directory-backlinks`), or paid advertising - which buys clicks,
not rank.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "claim" / "we do not have one" -> artifacts wanted; go to Step 2.
- "we have one, it is not showing" -> something exists; capture the current state, then
  Step 2.
- "review" / "audit" / "what is wrong with it" -> a check, not a build.
- "which keywords" / "why do we not rank" -> an intent question, not a build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the profile spec.

- **Location** - Can customers visit a physical address, or is it a service-area business?
  / One location or several? / City, country, and the exact address as it should print?
- **What it does** - The full service list, in the words customers would use? / What does
  a new customer ask for first? / Is there a second, different kind of work?
- **Current state** - Is a profile already claimed and verified? / Who owns the login, and
  is it a personal account or a shared one? / What is the review count and average now?
- **Proof** - Can the premises be photographed, inside and out? / Is there a team, a
  process, stock or equipment worth showing? / Any seasonal or by-appointment behaviour?
- **Engagement** - Who reviews replies, and how fast? / Is anyone being asked for a
  review, and by what method? / Is there time to post weekly?

Never invent an answer. Address, phone, categories, services, review counts, ratings,
keywords, opening hours and metrics the user has not supplied are `Unknown`. A review count
is a measurement, never an estimate.

### Step 3 - Hold the internal context

```yaml
module: gbp-local-seo-intent
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Location": null
  "What It Does": null
  "Current State": null
  "Proof": null
  "Engagement": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One verified profile with the most specific accurate primary
category, up to secondary categories that are genuinely true, a service list in the words
customers use, the business description written plainly with the service area named, and
opening hours including special hours. Then the two things that actually move it: a weekly
post, and one new review a week, replied to. Photographs of the real premises, added
monthly. Every field mirrored onto Bing Places and Apple Business Connect, and the intent
map written down so the same terms are used on the website.

**Why this one:** The profile is the strongest asset a local business owns, and completeness
beats cleverness. A completely filled profile with a weekly post and steady reviews
outperforms a clever one that is left alone for a year. And the intent map is what stops the
website, the profile and the directories using three different words for the same service.

**Workflow:** Address type confirmed → Primary category chosen as the most specific true
one → Secondary categories added → Services listed in customer words → Description written
and services named → Photos added of the real premises → Bing and Apple mirrored → Weekly
post scheduled → Review request process running → Replies written within the week →
Intent map shared with the website and the directories

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Row ID,Row Type,GBP Element,Value,Primary Keyword,Supporting Keywords,Search Intent,Landing Page URL,Media Attached,Post Type,Call To Action,Publish Date,Expiry Date,Review Rating,Review Date,Review Reply Status,Reviewer Response,Category Role,Visibility,Action Type,Data Quality Status,Verified,Owner,Review Date Check,Status,Notes
,Profile,Business description,"Example Retail is a home and kitchen goods shop in Example City selling cookware, storage and small appliances, with same-day local delivery across Example City and the surrounding area. Walk in for advice, order online, or call the shop.",example retail example city,"home and kitchen goods shop; small appliance shop",Local intent,https://example.com/,None,None,Visit the shop,2026-09-27,,0.0,2026-09-27,Not applicable,Not applicable,Primary,Public,Set up,Incomplete,false,Unknown,2026-10-27,Draft,"Example row - replace every value before use."
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE gbp_record (
  row_id BIGINT PRIMARY KEY,
  row_type VARCHAR(100) NOT NULL,
  gbp_element VARCHAR(255) NOT NULL,
  value TEXT,
  primary_keyword VARCHAR(255),
  supporting_keywords TEXT,
  search_intent VARCHAR(100) NOT NULL,
  landing_page_url TEXT,
  media_attached VARCHAR(100) NOT NULL,
  post_type VARCHAR(100) NOT NULL,
  call_to_action VARCHAR(100),
  publish_date DATE,
  expiry_date DATE,
  review_rating NUMERIC(2,1),
  review_date DATE,
  review_reply_status VARCHAR(100) NOT NULL,
  reviewer_response TEXT,
  category_role VARCHAR(50) NOT NULL,
  visibility VARCHAR(50) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  data_quality_status VARCHAR(100) NOT NULL,
  verified BOOLEAN NOT NULL,
  owner VARCHAR(255),
  review_date_check DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT gbp_row_type CHECK (row_type IN ('Profile','Service','Category','Attribute','Post','Review','Question','Photo','Product')),
  CONSTRAINT gbp_rating_range CHECK (review_rating IS NULL OR (review_rating >= 1 AND review_rating <= 5)),
  CONSTRAINT gbp_data_quality CHECK (data_quality_status IN ('Complete','Incomplete','Needs Review','Blocked')),
  CONSTRAINT gbp_category_role CHECK (category_role IN ('Primary','Secondary','Not applicable')),
  CONSTRAINT gbp_expiry_after_publish CHECK (expiry_date IS NULL OR publish_date IS NULL OR expiry_date >= publish_date)
);

CREATE INDEX idx_gbp_record_row_type ON gbp_record (row_type);
CREATE INDEX idx_gbp_record_status ON gbp_record (status);
CREATE INDEX idx_gbp_record_reply ON gbp_record (review_reply_status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GBP & Local SEO Intent",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Row ID": { "type": "integer" },
      "Row Type": { "type": "string" },
      "GBP Element": { "type": "string" },
      "Value": { "type": "string" },
      "Primary Keyword": { "type": "string" },
      "Supporting Keywords": { "type": "string" },
      "Search Intent": { "type": "string" },
      "Landing Page URL": { "type": "string", "format": "uri" },
      "Media Attached": { "type": "string" },
      "Post Type": { "type": "string" },
      "Call To Action": { "type": "string" },
      "Publish Date": { "type": "string", "format": "date" },
      "Expiry Date": { "type": "string", "format": "date" },
      "Review Rating": { "type": "number" },
      "Review Date": { "type": "string", "format": "date" },
      "Review Reply Status": { "type": "string" },
      "Reviewer Response": { "type": "string" },
      "Category Role": { "type": "string" },
      "Visibility": { "type": "string" },
      "Action Type": { "type": "string" },
      "Data Quality Status": { "type": "string" },
      "Verified": { "type": "boolean" },
      "Owner": { "type": "string" },
      "Review Date Check": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Row Type",
      "GBP Element",
      "Search Intent",
      "Media Attached",
      "Post Type",
      "Review Reply Status",
      "Category Role",
      "Visibility",
      "Action Type",
      "Data Quality Status",
      "Verified",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Row ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Row Type | Select (add options after import) | Convert to Select, add options: "Profile", "Service", "Category", "Attribute", "Post", "Review", "Question", "Photo", "Product" |
| GBP Element | Text | Leave as Text. The field being set, e.g. "Business description", "Opening hours" |
| Value | Text | Leave as Text. The actual text or value. The longest cell on this table |
| Primary Keyword | Text | Leave as Text. The term this row is meant to answer |
| Supporting Keywords | Title | Use as the database title |
| Search Intent | Select (add options after import) | Convert to Select, add options: "Informational", "Commercial investigation", "Transactional", "Navigational", "Local intent" |
| Landing Page URL | URL | Convert to URL. Every post and service points at a real page on the site |
| Media Attached | Select (add options after import) | Convert to Select, add options: "None", "Photo", "Photo set", "Video" |
| Post Type | Select (add options after import) | Convert to Select, add options: "None", "Update", "Offer", "Event", "Product" |
| Call To Action | Select (add options after import) | Convert to Select, add options: "None", "Learn more", "Call now", "Book", "Get offer", "Sign up", "Shop", "Order" |
| Publish Date | Date | Convert to Date. Blank for a profile field that is not scheduled |
| Expiry Date | Date | Convert to Date. An offer post must have one or it stays up for ever |
| Review Rating | Number | Convert to Number, one decimal place, digits only. Never entered by hand for someone else's review - copied from the profile |
| Review Date | Date | Convert to Date |
| Review Reply Status | Select (add options after import) | Convert to Select, add options: "Not applicable", "Replied", "Reply pending", "Reply overdue" |
| Reviewer Response | Text | Leave as Text. What was actually said, in full |
| Category Role | Select (add options after import) | Convert to Select, add options: "Primary", "Secondary", "Not applicable" |
| Visibility | Select (add options after import) | Convert to Select, add options: "Public", "Public and managed", "Hidden - see Notes" |
| Action Type | Select (add options after import) | Convert to Select, add options: "None", "Set up", "Edit", "Reply", "Request", "Verify", "Mirror", "Suspend", "Escalate" |
| Data Quality Status | Select (add options after import) | Convert to Select, add options: "Complete", "Incomplete", "Needs Review", "Blocked" |
| Verified | Checkbox | Convert to Checkbox. False until verification has actually completed |
| Owner | Text | Leave as Text |
| Review Date Check | Date | Convert to Date. Named "Check" so it cannot be confused with a review's own date |
| Status | Select (add options after import) | Convert to Select, add options: "Planned", "In progress", "Live", "Needs update", "Retired" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Verified` is false until verification completes
and `Review Rating` is 0 only because a review row was never entered - a real rating is
always a measurement the business supplied.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Row ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Row Type | `select` | `VARCHAR(100)` | `string` | Select | `Profile` |
| 3 | GBP Element | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 4 | Value | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 5 | Primary Keyword | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 6 | Supporting Keywords | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 7 | Search Intent | `select` | `VARCHAR(100)` | `string` | Select | `Local intent` |
| 8 | Landing Page URL | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 9 | Media Attached | `select` | `VARCHAR(100)` | `string` | Select | `None` |
| 10 | Post Type | `select` | `VARCHAR(100)` | `string` | Select | `None` |
| 11 | Call To Action | `select` | `VARCHAR(100)` | `string` | Select | `Visit the shop` |
| 12 | Publish Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 13 | Expiry Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 14 | Review Rating | `number` | `NUMERIC(2,1)` | `number` | Number | `0.0` |
| 15 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 16 | Review Reply Status | `select` | `VARCHAR(100)` | `string` | Select | `Not applicable` |
| 17 | Reviewer Response | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 18 | Category Role | `select` | `VARCHAR(50)` | `string` | Select | `Primary` |
| 19 | Visibility | `select` | `VARCHAR(50)` | `string` | Select | `Public` |
| 20 | Action Type | `select` | `VARCHAR(100)` | `string` | Select | `Set up` |
| 21 | Data Quality Status | `select` | `VARCHAR(100)` | `string` | Select | `Incomplete` |
| 22 | Verified | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `false` |
| 23 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 24 | Review Date Check | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 25 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 26 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Row Type** - the discriminator. Nine kinds of thing live in this table and they are
filtered on this column constantly. A review is not a post, and a service is not a profile
field.

```
Profile | Service | Category | Attribute | Post | Review | Question | Photo | Product
```

**Search Intent** - the same four intents as the website, plus local. A local pack
appearance is a `Local intent` result; everything else on the profile supports it.

```
Informational | Commercial investigation | Transactional | Navigational | Local intent
```

**Media Attached** - posts with an image outperform text-only posts consistently.

```
None | Photo | Photo set | Video
```

**Post Type** - `Offer` is the only one that can expire, and an offer without an expiry
stays on the profile for ever.

```
None | Update | Offer | Event | Product
```

**Call To Action** - Google supplies a fixed list. Use one of these, not a custom phrase, so
the button renders.

```
None | Learn more | Call now | Book | Get offer | Sign up | Shop | Order
```

**Review Reply Status** - the field that turns a review into a task. `Reply overdue` is
what makes the cadence visible.

```
Not applicable | Replied | Reply pending | Reply overdue
```

**Category Role** - primary is the single most important setting on the whole profile.

```
Primary | Secondary | Not applicable
```

**Action Type** - what the row exists to make happen.

```
None | Set up | Edit | Reply | Request | Verify | Mirror | Suspend | Escalate
```

**Data Quality Status**

```
Complete | Incomplete | Needs Review | Blocked
```

**Status**

```
Planned | In progress | Live | Needs update | Retired
```

## Relations

None standalone. Worth confirming with the business:

- `Landing Page URL` points at a page in `business-website-setup`. Confirm whether the
  business wants the two joined before it is made live; the URL text is the reliable key
  until they are.
- `Owner` points at the people register in the operational pack, which is not in this
  artifact set. It stays Text with a note naming the intended target.

## Examples

**Prompt**

```
We are not showing up on Google Maps at all. Our competitors in the same street show up
for everything. I made a profile a year ago and gave up when verification asked for a
video of the shopfront.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods.
>
> **Q:** Do customers visit the shop, and what is the exact address as it should print?
> **A:** Yes, one shop. It is in the shopfront.
>
> **Q:** What is the full service list, in the words customers use?
> **A:** Cookware, storage, small appliances, and same-day delivery.
>
> **Q:** Did the verification video ever go in, or is the profile still unverified?
> **A:** Still unverified. That is why we gave up.
>
> **Q:** Is anyone asking customers for reviews at the moment?
> **A:** We put a card on the counter. Nothing has come of it.

**Recommended next step** - offered, not built:

> Finish the verification first - an unverified profile ranks for nothing, so everything
> else is wasted until it is done. Then the most specific true primary category, the
> services in the words customers use, a plain description that names the delivery area,
> and the same data mirrored to Bing Places and Apple Business Connect. Then the two things
> that actually move it: a weekly post, and one new review a week, replied to. The counter
> card needs a URL with a prefilled review shortlink, not a QR code to your homepage.
>
> Workflow: Address type confirmed → Verification completed → Primary category chosen →
> Services listed in customer words → Description written → Photos of the real premises
> added → Bing and Apple mirrored → Weekly post scheduled → Review request process running
> → Replies written within the week → Intent map shared with the website
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- This is a plan and a register. It does not create, claim, verify or edit a profile, and it
  calls no Google APIs.
- It cannot see the current profile, its categories, its ranking, its review count or its
  competitors. Every current-state value must come from the business.
- `Review Rating` and `Review Count` are measurements the business supplies. This skill
  never estimates them and never fills a plausible number.
- Google states the three local ranking factors - relevance, distance and prominence -
  and states that no one can pay for a better local rank. Any weight given to a factor by
  a third party is that third party's estimate, not Google's, and this skill does not
  present one as fact.
- Category lists, attributes and service options change without notice. A category that
  exists today may not next quarter.
- Search volumes, keyword difficulty and competitor positions are not measured here. Those
  need a keyword tool the business has access to.
- Post reach, click-through and conversion data live in the profile's own analytics, and
  the thresholds are Google's own.
- Suspension and reinstatement are decisions Google makes. This skill can identify the
  policy risk in a plan; it cannot decide an outcome.
- Multi-location businesses need a location group, unique profiles, unique descriptions and
  a naming convention. That is a larger build than this table and needs confirming first.
- "Competitors show up for everything" usually means a more complete profile, more reviews
  and closer proximity - not that they did something the business cannot do.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

