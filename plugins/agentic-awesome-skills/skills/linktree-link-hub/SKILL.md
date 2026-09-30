---
name: linktree-link-hub
description: 'Link-in-bio register: label, destination URL, link type, priority order, audience, click tracking, UTM source, schedule, click count and status. Use for link hub tracking.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, brand, linktree, link-in-bio, social, tracking, utm, call-to-action, qr, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Link-in-Bio Hub

**What it is:** the single page every social bio points to, with every destination the business wants a customer to reach, ordered, tracked and changeable without touching a profile bio.

## Overview

Works out the smallest useful link hub for the business in front of it, then builds it only
when asked. The default output is a short recommendation, not a page. The link map - CSV,
SQL DDL, JSON Schema, Notion mapping - is produced on request, from one field list so the
four cannot drift apart.

Layer: Layer 3: Acquire. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a link hub exists because a social bio allows
one link and a business needs six. That means the hub is the only page where the order and
the destination are a business decision, which makes it the one place to be deliberate. It
is also the cheapest tracked landing page the business will ever own, because the click
lands on its own domain rather than a third party's.

## When to Use This Skill

- linktree, link in bio, link hub, bio page
- "we only get one link in our Instagram bio"
- a QR code for a leaflet, a van, a reception desk, a conference stand
- one URL for WhatsApp, email signature, QR code and leaflet
- tracking which channel a click came from
- "our socials send people nowhere useful"

Do not use it for: the social account setup itself (`social-media-setup`), the website's
page structure (`business-website-setup`), or a full campaign landing page with its own
form and tracking - that is a website page.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "build" / "we need" -> artifacts wanted; go to Step 2.
- "we have one already" -> something exists; capture the current links, then Step 2.
- "which links should we even have" / "review" -> a decision question, not a build.
- "our clicks are not converting" / "fix" -> capture the numbers, then Step 2.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what is the one thing someone should do after
> they land on the page?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the link list.

- **Action** - What is the single most valuable thing - call, book, buy, book a demo, read
  the menu, order on WhatsApp? / Is there a second and third priority behind it?
- **Destinations** - Which destinations exist today - website, WhatsApp, phone, menu, form,
  social profiles, document, review page? / Which are essential on day one and which can
  wait?
- **Channels** - Which platforms will the hub serve? / Is the page also going on print -
  leaflet, business card, vehicle, QR code? / Is a custom subdomain needed?
- **Tracking** - Does the business want to know which channel sent the click? / Is there an
  analytics tool already, or would this be the first? / Any consent or privacy constraint?
- **Ownership** - Who can add or remove a link, and how quickly can they? / Is there a
  seasonal link - a festival offer, a hiring push - that needs to go up and come down?

Never invent an answer. Handles, URLs, phone numbers, offer names, dates and click counts
the user has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: linktree-link-hub
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Action": null
  "Destinations": null
  "Channels": null
  "Tracking": null
  "Ownership": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One page on the business's own domain, six links maximum, with
one clear primary action at the top and every other link below it. Each link carries a UTM
source so the channel is visible in analytics, each link has an owner and a review date,
and any seasonal link gets a start and end date so it comes down on its own. Print gets a
QR code to the same URL, not a different one.

**Why this one:** Six links is the ceiling for a link hub - below that, the page works; above
it, the primary action stops being obvious. Owning the domain means the page cannot be
switched off by a third party, the QR code cannot break, and the clicks land somewhere the
business controls.

**Workflow:** Primary action chosen → Destination list agreed → Hosted on own domain with a
short URL → Links ordered, primary first → UTM source set per channel → QR code generated for
print → Analytics and consent checked → Page published → Clicks reviewed and links reordered

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
Link ID,Link Label,Destination URL,Link Type,Priority Order,Audience,Track Clicks,UTM Source,Enabled On,Thumbnail,Opens In,Schedule,Review Date,Click Count,Status,Notes
,Book a free 15-minute call,https://example.com/book,Conversion action,1,Prospective customer,true,social-bio,"LinkedIn bio, Facebook bio, WhatsApp status, print QR",None,Same tab,Always on,2026-10-27,0,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE link_hub_link (
  link_id BIGINT PRIMARY KEY,
  link_label VARCHAR(255) NOT NULL,
  destination_url TEXT NOT NULL,
  link_type VARCHAR(100) NOT NULL,
  priority_order INTEGER NOT NULL,
  audience VARCHAR(100) NOT NULL,
  track_clicks BOOLEAN NOT NULL,
  utm_source VARCHAR(255),
  enabled_on VARCHAR(255) NOT NULL,
  thumbnail VARCHAR(255),
  opens_in VARCHAR(20) NOT NULL,
  schedule VARCHAR(50) NOT NULL,
  review_date DATE,
  click_count INTEGER,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT link_hub_priority_positive CHECK (priority_order > 0),
  CONSTRAINT link_hub_clicks_non_negative CHECK (click_count IS NULL OR click_count >= 0),
  CONSTRAINT link_hub_opens_in CHECK (opens_in IN ('Same tab','New tab','App','Direct action'))
);

CREATE INDEX idx_link_hub_status ON link_hub_link (status);
CREATE INDEX idx_link_hub_priority ON link_hub_link (priority_order);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Link-in-Bio Hub",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Link ID": { "type": "integer" },
      "Link Label": { "type": "string" },
      "Destination URL": { "type": "string", "format": "uri" },
      "Link Type": { "type": "string" },
      "Priority Order": { "type": "integer" },
      "Audience": { "type": "string" },
      "Track Clicks": { "type": "boolean" },
      "UTM Source": { "type": "string" },
      "Enabled On": { "type": "string" },
      "Thumbnail": { "type": "string" },
      "Opens In": { "type": "string" },
      "Schedule": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Click Count": { "type": "integer" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Link Label",
      "Destination URL",
      "Link Type",
      "Priority Order",
      "Audience",
      "Track Clicks",
      "Enabled On",
      "Opens In",
      "Schedule",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Link ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Link Label | Text | Leave as Text. What the person sees. A verb phrase beats a noun |
| Destination URL | URL | Convert to URL. No tracking parameters - they live in the UTM columns |
| Link Type | Select (add options after import) | Convert to Select, add options: "Conversion action", "Contact", "WhatsApp", "Phone", "Menu or price list", "Document", "Social profile", "Review request", "Booking", "Map", "Newsletter signup", "Seasonal offer" |
| Priority Order | Number | Convert to Number, digits only. 1 is the top link and must be the primary action |
| Audience | Select (add options after import) | Convert to Select, add options: "Prospective customer", "Existing customer", "Partner", "Job candidate", "Press", "Public" |
| Track Clicks | Checkbox | Convert to Checkbox. Off only where the platform cannot support UTM parameters |
| UTM Source | Text | Leave as Text. The channel name, not the whole URL |
| Enabled On | Text | Leave as Text. Which bios, cards and leaflets carry this link |
| Thumbnail | Text | Leave as Text. Filename or asset reference, not a pasted image |
| Opens In | Select (add options after import) | Convert to Select, add options: "Same tab", "New tab", "App", "Direct action" |
| Schedule | Select (add options after import) | Convert to Select, add options: "Always on", "Start and end date", "Manual toggle" |
| Review Date | Date | Convert to Date. The next date this link is checked |
| Click Count | Number | Convert to Number, digits only. Leave blank until measured - never seed it with a guess |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Live", "Paused", "Retired" |
| Notes | Title | Use as the database title |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Click Count` is `0` in the example and blank in
the field reference - a click count is a measurement, never an estimate.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Link ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Link Label | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 3 | Destination URL | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 4 | Link Type | `select` | `VARCHAR(100)` | `string` | Select | `Conversion action` |
| 5 | Priority Order | `number` | `INTEGER` | `integer` | Number | `1` |
| 6 | Audience | `select` | `VARCHAR(100)` | `string` | Select | `Prospective customer` |
| 7 | Track Clicks | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 8 | UTM Source | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 9 | Enabled On | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 10 | Thumbnail | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 11 | Opens In | `select` | `VARCHAR(20)` | `string` | Select | `Same tab` |
| 12 | Schedule | `select` | `VARCHAR(50)` | `string` | Select | `Always on` |
| 13 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 14 | Click Count | `number` | `INTEGER` | `integer` | Number | `0` |
| 15 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 16 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Link Type** - a starting set. `Conversion action` is the one that must be `Priority Order`
1. Everything else is supporting.

```
Conversion action | Contact | WhatsApp | Phone | Menu or price list | Document | Social profile | Review request | Booking | Map | Newsletter signup | Seasonal offer
```

**Audience** - a starting set. A link that serves two audiences should be two links.

```
Prospective customer | Existing customer | Partner | Job candidate | Press | Public
```

**Opens In** - `Direct action` means the link fires an app or a dialler rather than
navigating, and it behaves differently on every platform. Test it.

```
Same tab | New tab | App | Direct action
```

**Schedule** - three values, because a seasonal link with no end date stays up forever.

```
Always on | Start and end date | Manual toggle
```

**Status**

```
Draft | Live | Paused | Retired
```

## Relations

None. This table is standalone. Where the destination is a page on the business website,
`Destination URL` holds the path and the join to the page map in `business-website-setup`
is on that path text, not a database relation across packs.

## Examples

**Prompt**

```
We have a Linktree with eleven links on it and nobody clicks any of them. Our Instagram
bio points to it and our visiting cards point to the website homepage.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what is the one thing someone should do after
> they land on the page?
> **A:** Example Retail. Book a table, or order on WhatsApp.
>
> **Q:** Which platforms does the page have to serve?
> **A:** Instagram, WhatsApp status, and the visiting cards.
>
> **Q:** Do you want to know which channel a click came from?
> **A:** That would be useful, yes.
>
> **Q:** Is there a seasonal link - a festival offer, a hiring push - that needs to go up
> and come down?
> **A:** A Diwali offer in October.
>
> **Q:** Who can add or remove a link?
> **A:** The founder.

**Recommended next step** - offered, not built:

> One page on your own domain with six links, not eleven. Book a table at the top, WhatsApp
> second, then the menu, the location, and two social profiles. The October offer gets a
> start and end date so it comes down by itself. Each link carries a UTM source so the cards
> and the Instagram bio are visible separately in analytics, and the same URL goes on the
> cards as a QR code.
>
> Workflow: Primary action chosen → Destination list agreed → Hosted on own domain →
> Links ordered, primary first → UTM source set per channel → QR code generated for print →
> Page published → Clicks reviewed and links reordered
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Six links, maximum. The failure mode of a link hub is that everything is equally
  important, so nothing is.
- Put the primary action first and make it visually the primary action. A customer booking
  should not have to choose between three equal buttons.
- Host it on the business's own domain. A third-party hub can be renamed, shut down,
  de-indexed, or start charging, and the QR code on 500 printed cards then points at
  nothing.
- One URL everywhere - bio, card, leaflet, QR code, email signature. Then the click counts
  add up instead of fragmenting across four destinations.
- Use UTM parameters per channel so the source is readable in analytics. Keep them in the
  UTM columns, not baked into `Destination URL`.
- Give every seasonal link an end date. The most common link-hub failure is a Diwali offer
  still live in December.
- Test every direct-action link - `tel:`, WhatsApp, maps - on a real phone, not in a
  browser preview. A QR code that does not scan from a leaflet is worse than no QR code.
- Print at a size that scans. A QR code below about 2cm on a business card will not scan
  on a phone held at an angle.
- Put the page in the website's analytics, and make sure it does not slow the site - the
  hub should be a fast page on the same domain, not a script from a platform.
- Review the click counts monthly and reorder by what actually gets clicked, not by what
  was assumed.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real link.

## Limitations

- This is a link map. It does not build the page, and it cannot publish or host anything.
- It does not create QR codes. It records where the code is used, so the same URL is
  confirmed across print.
- Click counts are entered by the business from its own analytics. This skill does not
  fetch them and must never estimate them.
- UTM conventions vary by platform, and some platforms strip parameters on redirect. The
  tracking plan needs checking per channel, not once.
- Consent: a link hub that collects nothing needs no cookie banner, but adding a form,
  a newsletter signup or analytics that sets cookies changes that answer. Confirm with the
  business.
- Analytics tools differ in what they capture without consent, and some regions require
  consent before non-essential storage.
- Custom subdomains and vanity URLs are a hosting and DNS task, not a design task.
- A/B testing the link order is a legitimate next step and is not modelled here.
- Print, outdoor and broadcast usage need the same discipline, and none of it is covered.

## Security & Safety Notes

- Never invent a URL, a phone number, a handle, an offer, a date or a click count.
  `Unknown` and blank are correct.
- Never paste a live customer list or a real recipient address into this table.
- A shortened or vanity URL on a printed card is a permanent commitment. A mistyped short
  link sends customers somewhere else for years; check the destination before printing.
- Review links and destination URLs for open-redirect behaviour, and never build a hub that
  forwards to a parameter-controlled destination.
- Do not put a tracking pixel or a fingerprinting script on the hub. It is a public page
  and it will be crawled.
- If the hub collects an email address, a lawful basis, a privacy notice and a retention
  rule apply. Flag it; refer it to `data-privacy-controls`.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** eleven links on the hub and nobody clicks any of them.
  **Solution:** that is the ceiling, not the content. Cut to six, order them, and make one
  of them obviously primary.
- **Problem:** the QR code on the cards does not scan.
  **Solution:** size, contrast and quiet zone. Below about 2cm on a card it will not
  reliably scan.
- **Problem:** a seasonal offer is still live three months after it ended.
  **Solution:** `Schedule` = `Start and end date`, with the date in the row, not in
  someone's head.
- **Problem:** the same business has four different destination URLs - one in the bio, one
  on the card, one in the email signature, one in the leaflet.
  **Solution:** one URL everywhere. Then the click data is worth having.
- **Problem:** analytics is installed and the page became slow.
  **Solution:** a script-heavy hub page costs more in lost clicks than the tracking is
  worth. Keep it a fast page on the same domain.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @brand-growth-system-builder - routes to this skill and the other 12 brand and growth modules.
- @business-website-setup - where most of the destinations actually live, and the page map
  they must match.
- @social-media-setup - the bios that point here, and the channel-specific link limits.
- @brand-kit-print-collateral - the card, leaflet and folder that carry the QR code.
- @business-email-template - the email signature that carries the same URL.
- @gbp-local-seo-intent - the booking and call actions, which are the highest-value links.
- @seo-directory-backlinks - link hubs are also low-authority citation sites; that list
  names them.
- `data-privacy-controls` (operational pack) - lawful basis if the hub ever collects data.

## Reusable Prompt

```
I want one link-in-bio page that every social bio, card, QR code and email signature
points to, with the links tracked and a seasonal link that comes down on its own date.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a URL, a phone number or a click count. Then recommend the smallest link
set that fits on our own domain, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
