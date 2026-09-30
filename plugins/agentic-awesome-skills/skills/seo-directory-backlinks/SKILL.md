---
name: seo-directory-backlinks
description: 'Directory and backlink register: platform, domain, target URL, follow attribute, authority and spam scores, approval and NAP-match status. Use for SEO citation tracking.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, seo, backlinks, citations, directories, local-seo, nap-consistency, link-building, spam, digital-pr, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# SEO Directories & Backlinks

**What it is:** the off-site citation and link plan - which directory or platform the
business belongs on, whether the listing is real and consistent, what the link is worth,
and which submissions to refuse.

## Overview

Works out the smallest useful citation plan for the business in front of it, then builds
it only when asked. The default output is a short recommendation, not a submission list.
The citation tracker - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request,
from one field list so the four cannot drift apart.

Layer: Layer 3: Acquire. Fits: Growth stage. Table code: n/a.

**The rule this table exists to enforce:** a directory is a *citation*, and a citation is
only correct if it matches. `NAP Match` is therefore a control field with three values,
not a note, and a citation whose NAP does not match is a defect to fix rather than a
backlink to keep. Alongside it, `Approval Days` and `Link Type` are recorded because a
listing that was never approved and a nofollow link are two different facts, and a tracker
that cannot distinguish them reports success it did not get.

**The second rule:** the highest-value links are almost never directories. Chamber of
commerce, council directory, trade association, an industry blog and one genuine local
press mention beat two hundred generic submissions. `Tier` exists so the plan spends its
effort at the top.

## When to Use This Skill

- where to list my business, business directories, citations
- backlinks, link building, off-page SEO
- NAP consistency, citation building, local citations
- "why is a competitor ranking and we are not"
- Industry and vertical directories for a specific sector
- refusing or auditing a list of "free high DA" submissions
- link profile, referring domains, anchor text, lost links

Do not use it for: the website's own structure (`business-website-setup`), the map profile
(`gbp-local-seo-intent`), paid advertising, or content marketing and guest posting, which
are editorial decisions rather than directory submissions.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "where should we list" / "set up" / "build" -> artifacts wanted; go to Step 2.
- "review this list someone sent us" -> an audit of a supplied list; go to Step 2 and then
  the vetting step.
- "our rankings dropped" / "fix" -> something was done; capture what, then Step 2.
- "audit" / "check" -> a check, not a build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the directory list.

- **Business** - Industry and sector, in the words a customer would use? / One location or
  several? / Customers visit, or is it service-area?
- **Current** - Is the business already listed anywhere? / How many listings roughly? / Who
  created them, and is there an account the business still controls?
- **Goal** - What is the aim - more calls, more enquiries, more site traffic, or visibility
  in one specific market? / Is there a market or a country in scope?
- **Capacity** - How much time is there to spend on this per month? / Is anyone paid to do
  it, or is it the founder on a Sunday?
- **Risk** - Has anyone offered paid placement, a "dofollow network" or a reciprocal-link
  deal? / Has the site ever received a manual action or an algorithmic drop?

Never invent an answer. Domains, DR or DA scores, spam scores, approval times, listing
URLs, referring domain counts and rankings the user has not supplied or measured are
`Unknown`. A DA score is a third-party estimate, and it is never invented here.

### Step 3 - Hold the internal context

```yaml
module: seo-directory-backlinks
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Business": null
  "Current": null
  "Goal": null
  "Capacity": null
  "Risk": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Fifteen to twenty real listings, not two hundred. Tier 0 the two
map platforms the business is eligible for, Tier 1 the high-authority review platforms and
the professional profile that fit the sector, then the genuinely local sources - chamber of
commerce, council directory, trade association, one industry blog, and one local press
angle. Everything submitted in one sitting, from one canonical NAP block, and re-checked
quarterly. Two or three vertical directories, no link networks.

**Why this one:** Fifteen real listings are a citation set Google can read and customers can
use. Two hundred junk listings are a footprint across domains Google has publicly actioned,
and a small local business cannot afford that risk for a marginal gain. The genuinely local
links are also the ones competitors skip, so the effort goes further there than on a
national directory.

**Workflow:** Canonical NAP block written once → Tier 0 platforms claimed → Tier 1 review
and professional profiles completed → Local chamber, council and trade association joined
→ Two or three vertical directories chosen by relevance → Tracking row created for each
with a review date → Quarterly re-check scheduled → Referring domains and anchor text
reviewed once a quarter → Anything with a mismatched NAP corrected or removed

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
Citation ID,Platform Name,Domain,Tier,Category,Directory Type,Target URL,Link Type,Follow Attribute,Domain Authority,Domain Rating,Spam Score,Listing Status,Submitted Date,Approved Date,Approval Days,NAP Match,Referral Traffic,Review Date,Owner,Status,Notes
,Example Chamber of Commerce,examplechamber.org,Tier 1,Local chamber of commerce,Member directory,https://example.com/,Homepage,Nofollow,Unknown,Unknown,Unknown,Approved,2026-09-27,2026-10-02,5,Match,Unknown,2026-12-27,Unknown,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE seo_citation (
  citation_id BIGINT PRIMARY KEY,
  platform_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  tier VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  directory_type VARCHAR(100) NOT NULL,
  target_url TEXT,
  link_type VARCHAR(50) NOT NULL,
  follow_attribute VARCHAR(50) NOT NULL,
  domain_authority VARCHAR(50),
  domain_rating VARCHAR(50),
  spam_score VARCHAR(50),
  listing_status VARCHAR(50) NOT NULL,
  submitted_date DATE,
  approved_date DATE,
  approval_days INTEGER,
  nap_match VARCHAR(50) NOT NULL,
  referral_traffic VARCHAR(50),
  review_date DATE,
  owner VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT seo_citation_tier CHECK (tier IN ('Tier 0','Tier 1','Tier 2','Tier 3','Tier 4','Tier 5','Tier 6','Tier 7','Refused')),
  CONSTRAINT seo_citation_link_type CHECK (link_type IN ('Dofollow','Nofollow','Redirect','JavaScript','No link','Unknown')),
  CONSTRAINT seo_citation_nap_match CHECK (nap_match IN ('Match','Mismatch','Unknown','Not applicable')),
  CONSTRAINT seo_citation_listing_status CHECK (listing_status IN ('Not started','Submitted','Pending review','Approved','Rejected','Removed','Superseded')),
  CONSTRAINT seo_citation_approval_days CHECK (approval_days IS NULL OR approval_days >= 0),
  CONSTRAINT seo_citation_approved_after_submitted CHECK (approved_date IS NULL OR submitted_date IS NULL OR approved_date >= submitted_date)
);

CREATE INDEX idx_seo_citation_status ON seo_citation (status);
CREATE INDEX idx_seo_citation_tier ON seo_citation (tier);
CREATE INDEX idx_seo_citation_nap ON seo_citation (nap_match);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SEO Directories & Backlinks",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Citation ID": { "type": "integer" },
      "Platform Name": { "type": "string" },
      "Domain": { "type": "string" },
      "Tier": { "type": "string" },
      "Category": { "type": "string" },
      "Directory Type": { "type": "string" },
      "Target URL": { "type": "string", "format": "uri" },
      "Link Type": { "type": "string" },
      "Follow Attribute": { "type": "string" },
      "Domain Authority": { "type": "string" },
      "Domain Rating": { "type": "string" },
      "Spam Score": { "type": "string" },
      "Listing Status": { "type": "string" },
      "Submitted Date": { "type": "string", "format": "date" },
      "Approved Date": { "type": "string", "format": "date" },
      "Approval Days": { "type": "integer" },
      "NAP Match": { "type": "string" },
      "Referral Traffic": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Owner": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Platform Name",
      "Tier",
      "Category",
      "Directory Type",
      "Link Type",
      "Follow Attribute",
      "Listing Status",
      "NAP Match",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Citation ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Platform Name | Title | Use as the database title |
| Domain | Text | Leave as Text. The directory's own domain, not the business's |
| Tier | Select (add options after import) | Convert to Select, add options: "Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5", "Tier 6", "Tier 7", "Refused" |
| Category | Text | Leave as Text. Sector or vertical, in customer words |
| Directory Type | Select (add options after import) | Convert to Select, add options: "Map platform", "Review platform", "Professional profile", "Company profile", "Local body", "Government register", "Industry directory", "Niche directory", "Document sharing", "Bookmarking", "Q&A and forum", "Classifieds", "Link hub", "News service", "Guest post", "Paid placement", "Link network" |
| Target URL | URL | Convert to URL. The exact page that carries the link, not just the domain |
| Link Type | Select (add options after import) | Convert to Select, add options: "Dofollow", "Nofollow", "Redirect", "JavaScript", "No link", "Unknown" |
| Follow Attribute | Select (add options after import) | Convert to Select, add options: "Follow", "Nofollow", "Sponsored", "UGC", "Unknown" |
| Domain Authority | Text | Leave as Text. Record the value and the tool and the date in Notes. Never invent it |
| Domain Rating | Text | Leave as Text. Same rule. DR and DA are different third-party estimates, not interchangeable |
| Spam Score | Text | Leave as Text. Percentage as the tool reports it, with the tool named in Notes |
| Listing Status | Select (add options after import) | Convert to Select, add options: "Not started", "Submitted", "Pending review", "Approved", "Rejected", "Removed", "Superseded" |
| Submitted Date | Date | Convert to Date |
| Approved Date | Date | Convert to Date |
| Approval Days | Number | Convert to Number, digits only. Derived from the two dates above, entered to keep the control visible |
| NAP Match | Select (add options after import) | Convert to Select, add options: "Match", "Mismatch", "Unknown", "Not applicable" |
| Referral Traffic | Text | Leave as Text. "Unknown" until measured in analytics. Never estimate it |
| Review Date | Date | Convert to Date. The next quarterly check |
| Owner | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Planned", "In progress", "Live", "Needs Review", "Retired" |
| Notes | Text | Leave as Text. The vetting note - what the directory is, and why it is or is not worth it |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Every third-party metric is `Unknown` because
this skill cannot measure it and must never estimate it.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Citation ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Platform Name | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 3 | Domain | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 4 | Tier | `select` | `VARCHAR(50)` | `string` | Select | `Tier 1` |
| 5 | Category | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 6 | Directory Type | `select` | `VARCHAR(100)` | `string` | Select | `Member directory` |
| 7 | Target URL | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 8 | Link Type | `select` | `VARCHAR(50)` | `string` | Select | `Nofollow` |
| 9 | Follow Attribute | `select` | `VARCHAR(50)` | `string` | Select | `Nofollow` |
| 10 | Domain Authority | `text` | `VARCHAR(50)` | `string` | Text | `Unknown` |
| 11 | Domain Rating | `text` | `VARCHAR(50)` | `string` | Text | `Unknown` |
| 12 | Spam Score | `text` | `VARCHAR(50)` | `string` | Text | `Unknown` |
| 13 | Listing Status | `select` | `VARCHAR(50)` | `string` | Select | `Approved` |
| 14 | Submitted Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 15 | Approved Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 16 | Approval Days | `number` | `INTEGER` | `integer` | Number | `5` |
| 17 | NAP Match | `select` | `VARCHAR(50)` | `string` | Select | `Match` |
| 18 | Referral Traffic | `text` | `VARCHAR(50)` | `string` | Text | `Unknown` |
| 19 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 20 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 21 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 22 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Tier** - the value that decides where the effort goes. `Refused` is a first-class tier,
because recording a platform the business deliberately rejected is how it stays rejected.
Full tier contents: `../../references/backlink-directory-master-list.md`.

```
Tier 0 | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 | Refused
```

**Directory Type** - a starting set, and the column that catches a link network. Anything
`Link network` is a `Refused` row.

```
Map platform | Review platform | Professional profile | Company profile | Local body | Government register | Industry directory | Niche directory | Document sharing | Bookmarking | Q&A and forum | Classifieds | Link hub | News service | Guest post | Paid placement | Link network
```

**Link Type** vs **Follow Attribute** - two columns, not one, because a redirect carries no
rel attribute at all. Collapsing them loses the distinction between "no link" and "a
noindexed link".

```
Link Type:      Dofollow | Nofollow | Redirect | JavaScript | No link | Unknown
Follow Attribute: Follow | Nofollow | Sponsored | UGC | Unknown
```

**Listing Status** - `Superseded` is for the case where a business moved location or
renamed and the old listing still exists somewhere. It is a real and common state.

```
Not started | Submitted | Pending review | Approved | Rejected | Removed | Superseded
```

**NAP Match** - the control. `Mismatch` means fix or remove; it never means "leave it, the
link is still a link".

```
Match | Mismatch | Unknown | Not applicable
```

**Status**

```
Planned | In progress | Live | Needs Review | Retired
```

## Relations

Two natural links, both worth confirming before making them live:

- `Target URL` points at a page in `business-website-setup`. The URL text is the reliable
  key across packs; confirm whether the business wants a live join.
- `Owner` points at the people register in the operational pack, which is not in this
  artifact set. It stays Text with a note naming the intended target.

## Examples

**Prompt**

```
Someone sent us a list of 165 free high-DA directories. Some of them want a keyword field
and ask for a reciprocal link. Should we do them all?
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods in Example City.
>
> **Q:** Are you already listed anywhere - how many places roughly?
> **A:** Google, and maybe four or five others from years ago. Nobody checks them.
>
> **Q:** What is the aim - more calls, more site traffic, or visibility somewhere specific?
> **A:** More calls from people nearby.
>
> **Q:** How much time is there per month for this?
> **A:** Maybe an hour, on a Sunday.
>
> **Q:** Has anyone offered paid placement or a "dofollow network"?
> **A:** Yes, an email about a monthly plan. It was not cheap.

**Recommended next step** - offered, not built:

> Not the 165. Skip anything asking for a reciprocal link, a keyword field or payment, and
> record them as `Refused` so they stay refused. Do about fifteen real ones instead: Google
> and Bing and Apple Maps, the two review platforms your sector actually uses, the chamber
> of commerce and the council directory, the trade association, two vertical directories
> that a kitchen-shop customer would search, and one local press angle. One canonical NAP
> block, pasted everywhere, re-checked quarterly. That is the highest-value fifteen
> available, and an hour a month is enough to keep them.
>
> Workflow: Canonical NAP block written once → Tier 0 platforms claimed → Tier 1 review and
> professional profiles completed → Local chamber, council and trade association joined →
> Vertical directories chosen by relevance → Tracking row created for each with a review
> date → Quarterly re-check scheduled
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Relevance beats authority. A listing in the trade's own directory is worth more than a
  higher-authority general one, because it is the directory the customer searches.
- Write the canonical NAP once, as plain text, and paste it. Never retype it, never
  "improve" it, never reformat the address per platform's suggestion.
- Vet before submitting: check the domain's authority and referring domains, check whether
  its competitors are listed for real, and check whether approval is instant. Instant
  approval means no review, and no review means no value.
- Refuse a reciprocal-link requirement. That is a link scheme, and it is explicitly against
  Google's link spam policies.
- Refuse any platform that asks for a keyword in the business name. It violates Google's
  business name policy and can cost the profile, not just the listing.
- Fifteen good listings beat two hundred poor ones, and the poor ones carry risk. This is
  the whole argument of this module.
- Do the genuinely local ones: chamber of commerce, council or city directory, trade
  association, local award or scheme. They are free or cheap, competitors skip them, and
  they are the links a local business actually needs.
- Record the tool, the value and the date next to every DR, DA and spam score. Those
  numbers change, and a number without a date is not evidence.
- `NAP Match` is checked by eye against the canonical block, not trusted. Directories
  silently reformat, truncate or re-capitalise addresses.
- One target URL per listing, pointing at the most relevant page - not the homepage
  everywhere.
- Never buy a link or a placement that is really a link. A sponsored or paid placement must
  be marked as such; an unmarked one is a violation whichever way the money moved.
- Never fabricate a listing. A false address, a false phone number or a fake business
  description on a directory is a false statement to that platform and can be removed and
  reported.
- Review the referring domains and anchor text once a quarter. If every new link uses the
  same anchor text, that pattern is a problem, not a strategy.
- Re-check the top ten listings quarterly. Directories decay, get re-categorised and get
  deleted silently.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real citation.

## Limitations

- This is a tracker. It does not submit anything, create any account, or build any link.
- It does not measure authority. `Domain Authority`, `Domain Rating` and `Spam Score` are
  third-party estimates from named tools, they change over time, and DA and DR are not the
  same metric. This skill never produces them and never presents one as a fact.
- It has no access to the business's Search Console, a link index, a rank tracker or its
  analytics, so it cannot see the actual link profile or the referral traffic.
- It cannot judge a directory's quality definitively. The four checks narrow the field;
  the final judgement is the business's.
- Referral traffic and ranking effects are measured after the fact, over months, and are
  confounded by everything else changing at the same time. This skill must not attribute
  a movement in rank to a listing.
- Paid placements, guest posts, PR and content marketing are editorial and commercial
  decisions that need a budget, a brief and a human. They are recorded here, not advised on.
- Countries differ in which directories matter. The list in the reference file is
  international; the business's own market has to be confirmed before it is used.
- Competitor link analysis, disavow files and manual-action appeals are specialist work and
  not modelled here.
- A link network's downside is a manual action or a demotion that may surface months later
  and cannot be predicted. This skill can identify the risk; only the business can accept
  it.

## Security & Safety Notes

- Never invent a domain, a listing URL, a DR, a DA, a spam score, an approval time, a
  referral figure or a ranking position. `Unknown` and blank are correct.
- Directory submissions place the business's NAP, phone and sometimes a logo into a
  third-party system the business does not control. Confirm with the owner before
  publishing personal contact details widely.
- Never submit a listing to a platform the business has not decided to be listed on.
  Creating a profile that is then abandoned is worse than not having one, because it is a
  listing with stale information.
- Never provide a false address, a virtual address, a false phone number or a fabricated
  business description to a directory. It is a false statement, it is removable, and it can
  be reported.
- Do not put login credentials, an account password or a two-factor code into this table or
  into a shared document. A directory account is a real account with a real login.
- Purchased links may breach both a search engine's policies and, in some jurisdictions, a
  contract. Flag it once, clearly, and leave the decision with the business.
- Business directories processing personal data are subject to data-protection law. The
  business is the controller for the data it publishes, and it should know which platforms
  it has published an address and phone number to.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.

