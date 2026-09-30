---
name: free-design-resources
description: 'Design resource register: resource and provider, licence type, commercial-use and attribution rules, export format, lock-in risk, free tier limit and accessibility notes. Use for tool vetting.'
category: design
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, design-tools, free-licences, fonts, icons, images, templates, accessibility, cost, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Free Design Resources

**What it is:** the register of free design tools, fonts, icons, images and templates the
business uses, and what each one actually permits.

## Overview

Works out the smallest set of free tools that covers what the business is trying to make,
then builds it only when asked. The default output is a short recommendation, not a
licence review. The resource clearance and adoption register - CSV, SQL, JSON Schema, Notion
mapping - is produced on request, from one field list so the four cannot drift apart.

Layer: Layer 1: Foundation. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** "free" is not a licence term, so `Licence Type`
and `Commercial Use Allowed` are the fields that matter, and the full map in
`../../references/free-design-resource-map.md` is the evidence base for them. A free tool is safe
to use and unsafe to depend on when it cannot export, when it holds the only copy of the
work, or when its terms forbid the one thing the business needs - commercial use, logo
use, print, or client work. `Export Format` and `Vendor Lock-In Risk` exist to catch
exactly that.

**The second rule:** accessibility and licence are checked at the same time. A font under
14px, a grey-on-grey pair from a template, or an icon set used without its licence
attribution are both defects, and both are cheap to avoid at the point of selection.

## When to Use This Skill

- free design tools, free alternatives, "what can we use for nothing"
- free fonts, free icons, free images, free templates, stock photography
- licensing, licence terms, commercial use, attribution, redistribution
- "can we use this", "is this free to use", "is this allowed for a client"
- tool consolidation, cancelling a subscription, reducing design spend
- design accessibility, contrast checking, free colour palette tools
- brand kit on a zero budget, open source design system

Do not use it for: building the design system itself (`design-theme-guide`), the artwork
(`logo-image-design`), or a legal opinion on a licence agreement.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "what can we use" / "find" / "we need" -> artifacts wanted; go to Step 2.
- "is this allowed" / "can I use this" -> a licence question, answer it before anything
  else.
- "review" / "audit" / "we are paying too much" -> a review, not a build.
- "we already picked a tool" -> a clearance check on one item; go straight to Step 4.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What are you trying to make, and is it for the business itself or for a client?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the shortlist.

- **What is being made** - Logo, brand kit, website, social posts, documents, print, video,
  or a product interface? / Print, screen, or both - and for print, which sizes and which
  process?
- **Who is it for** - The business's own marketing, or work delivered to a client? / Is the
  business itself a registered company, and in which country? / Will anything be sold, or is
  it internal only?
- **Budget reality** - Is zero a hard constraint, or is a small one-off payment acceptable
  to remove a problem? / Is there a card on file for anything that has a free tier?
- **Constraints** - Anyone on the team with specific skills, or accessibility needs? / Any
  existing tool the business has already paid for and should use? / Any file formats the
  client or printer requires?
- **Risk** - Does anything need to be editable by a non-designer in two years? / Is there any
  chance of reselling the output, or licensing it on?

Never invent an answer. Licence terms, prices, feature lists, export formats and
attribution requirements are **not** invented here - they are read from the provider's own
current terms and recorded with the source and the date it was read. Anything not verified
is `Unverified`, which is a different value from `No`.

### Step 3 - Hold the internal context

```yaml
module: free-design-resources
intent: null            # set up | review | report | import
areas:
  "What is being made": null
  "Who is it for": null
  "Budget reality": null
  "Constraints": null
  "Risk": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One tool per job, chosen so the work leaves in an open format and
the business keeps a copy it controls. Type from a genuinely open font, icons from a set
with an explicit MIT or CC licence, images from a source that allows commercial use without
a per-image fee, and one layout tool the business can use without a designer. Verify the
licence at the point of selection, not at the point of publication, and record where the
terms were read and when. Budget the small paid exceptions: a logo should not be assembled
from a free icon, and a stock photo of a real person's face needs the right release.

**Why this one:** Most free-tool regret is not the price, it is the lock-in - a logo that
only exists inside a browser tab, an editable file that the tool can no longer open, a font
that turns out to forbid the commercial use the business needed. Checking the export and the
licence once, in the register, is ten minutes that removes a class of problems permanently.

**Workflow:** What is being made and for whom established → One tool per job, open formats
only → Licence, export and attribution checked against the provider's own terms →
Accessibility checked at selection → Register written with source and verification date →
Free tier limits recorded → Re-checked at renewal and when the business changes scale →
Paid exception approved deliberately, not by default

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
Resource ID,Resource Name,Category,Provider,Venue,Licence Type,Commercial Use Allowed,Attribution Required,Export Format,Vendor Lock-In Risk,Cost Today,Free Tier Limit,Best For,Accessibility Notes,Verification Source,Verified On,Status,Notes
,Example Open Source Font,Font,Example Foundry,Self-hosted,Open Font License,Yes,Yes,Open source files,None,0,None,Body text on screen at 16px or larger,Check the licence file shipped with the font and keep a copy,Provider licence page,2026-09-27,Approved,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE design_resource (
  resource_id BIGINT PRIMARY KEY,
  resource_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  venue VARCHAR(50) NOT NULL,
  licence_type VARCHAR(100) NOT NULL,
  commercial_use_allowed VARCHAR(10) NOT NULL,
  attribution_required VARCHAR(10) NOT NULL,
  export_format VARCHAR(255) NOT NULL,
  vendor_lock_in_risk VARCHAR(50) NOT NULL,
  cost_today NUMERIC(10,2),
  free_tier_limit VARCHAR(255) NOT NULL,
  best_for VARCHAR(255) NOT NULL,
  accessibility_notes TEXT,
  verification_source VARCHAR(255) NOT NULL,
  verified_on DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT design_resource_commercial_use CHECK (commercial_use_allowed IN ('Yes','No','Unverified')),
  CONSTRAINT design_resource_attribution CHECK (attribution_required IN ('Yes','No','Unverified')),
  CONSTRAINT design_resource_status CHECK (status IN ('Candidate','Approved','In use','Blocked','Sunset')),
  CONSTRAINT design_resource_cost_non_negative CHECK (cost_today IS NULL OR cost_today >= 0),
  CONSTRAINT design_resource_verified_after_issue CHECK (verified_on IS NULL OR verified_on >= DATE '2000-01-01')
);

CREATE INDEX idx_design_resource_status ON design_resource (status);
CREATE INDEX idx_design_resource_category ON design_resource (category);
CREATE INDEX idx_design_resource_verified ON design_resource (verified_on);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Free Design Resource Register",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Resource ID": { "type": "integer" },
      "Resource Name": { "type": "string" },
      "Category": { "type": "string" },
      "Provider": { "type": "string" },
      "Venue": { "type": "string" },
      "Licence Type": { "type": "string" },
      "Commercial Use Allowed": { "type": "string" },
      "Attribution Required": { "type": "string" },
      "Export Format": { "type": "string" },
      "Vendor Lock-In Risk": { "type": "string" },
      "Cost Today": { "type": "number" },
      "Free Tier Limit": { "type": "string" },
      "Best For": { "type": "string" },
      "Accessibility Notes": { "type": "string" },
      "Verification Source": { "type": "string" },
      "Verified On": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Resource Name",
      "Category",
      "Provider",
      "Venue",
      "Licence Type",
      "Commercial Use Allowed",
      "Attribution Required",
      "Export Format",
      "Vendor Lock-In Risk",
      "Free Tier Limit",
      "Best For",
      "Verification Source",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Resource ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Resource Name | Text | Leave as Text. The name as the provider calls it, so it can be found again |
| Category | Select (add options after import) | Convert to Select, add options: "Font", "Icon set", "Photography", "Illustration", "Template", "Layout or design tool", "Colour tool", "Video or audio", "Code library", "Learning resource" |
| Provider | Text | Leave as Text. Who publishes it, and who the business would contact |
| Venue | Select (add options after import) | Convert to Select, add options: "Open source", "Self-hosted", "Free plan", "Free trial", "Freemium", "One-off purchase", "Public domain" |
| Licence Type | Text | Leave as Text. The actual licence, named: "SIL Open Font License", "MIT", "CC BY 4.0", "CC0", "Provider terms". Never write "free" here |
| Commercial Use Allowed | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Unverified". "Unverified" is the honest default and must not be changed to "Yes" on assumption |
| Attribution Required | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Unverified". Where "Yes", record the exact wording required in Notes so it can be reproduced |
| Export Format | Text | Leave as Text. What the business can take with it. Blank or "none" is a finding about lock-in, not a data gap |
| Vendor Lock-In Risk | Select (add options after import) | Convert to Select, add options: "None", "Low", "Medium", "High". "High" means the only copy of the work lives inside the tool |
| Cost Today | Number | Convert to Number, two decimal places, in the business's own currency. The price at the verification date, not a promise |
| Free Tier Limit | Text | Leave as Text. The specific limit: exports per month, storage, seats, resolution, watermarks. This is what a free tier actually restricts |
| Best For | Text | Leave as Text. The one job this is the right tool for. A tool that is "good for everything" is not chosen |
| Accessibility Notes | Text | Leave as Text. Contrast, type size, alt text support, keyboard access - whatever is known. Record "Unverified" rather than a guess |
| Verification Source | Text | Leave as Text. The exact page the terms were read from. A licence claimed from memory is not a licence |
| Verified On | Date | Convert to Date. When the terms were read. Provider terms change without notice, so this date is the evidence |
| Status | Select (add options after import) | Convert to Select, add options: "Candidate", "Approved", "In use", "Blocked", "Sunset" |
| Notes | Title | Use as the database title |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Verification Source` and `Verified On` are
required, not optional: a licence that has not been read from the provider's own terms is
`Unverified`, and `Unverified` is a state this register is designed to surface rather than
hide.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Resource ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | (blank) |
| 2 | Resource Name | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 3 | Category | `select` | `VARCHAR(50)` | `string` | Select | Font |
| 4 | Provider | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 5 | Venue | `select` | `VARCHAR(50)` | `string` | Select | Open source |
| 6 | Licence Type | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 7 | Commercial Use Allowed | `select` | `VARCHAR(10)` | `string` | Select | Yes |
| 8 | Attribution Required | `select` | `VARCHAR(10)` | `string` | Select | Yes |
| 9 | Export Format | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 10 | Vendor Lock-In Risk | `select` | `VARCHAR(50)` | `string` | Select | None |
| 11 | Cost Today | `number` | `NUMERIC(10,2)` | `number` | Number | 0 |
| 12 | Free Tier Limit | `text` | `VARCHAR(255)` | `string` | Text | None |
| 13 | Best For | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 14 | Accessibility Notes | `long_text` | `TEXT` | `string` | Text | Unverified |
| 15 | Verification Source | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 16 | Verified On | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 17 | Status | `select` | `VARCHAR(50)` | `string` | Select | Approved |
| 18 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Category** - a starting set, chosen so the register separates *things you own* from *tools
you rent*. Fonts, icons and code libraries are owned and self-hosted; a layout tool is
neither.

```
Font | Icon set | Photography | Illustration | Template | Layout or design tool | Colour tool | Video or audio | Code library | Learning resource
```

**Venue** - how the business gets it. This is the field that predicts the lock-in, because
a self-hosted or open-source resource is a file the business keeps and a free plan is a
service it rents.

```
Open source | Self-hosted | Free plan | Free trial | Freemium | One-off purchase | Public domain
```

**Commercial Use Allowed** - the whole point of the check. `Unverified` is a legitimate and
frequent value, and it is the reason `Verification Source` and `Verified On` are required.
A tool that says "free" on its pricing page and "non-commercial" in its terms is `No`.

```
Yes | No | Unverified
```

**Attribution Required** - where `Yes`, the exact required wording goes in Notes. "Credit
the artist somewhere" is not a specification; the actual sentence is.

```
Yes | No | Unverified
```

**Vendor Lock-In Risk** - `High` means the only copy of the work lives inside the tool. That
is acceptable for a draft and unacceptable for a logo, a brand kit, or anything a client
will expect to own.

```
None | Low | Medium | High
```

**Status** - the register's own state, and `Blocked` is the correct value for any resource
whose licence is `Unverified` and whose output is about to be published.

```
Candidate | Approved | In use | Blocked | Sunset
```

## Relations

- `Category` = `Font` and `Best For` point at the type roles in `design-theme-guide`; the
  font is chosen for a role, not in isolation.
- `Category` = `Icon set` connects to `logo-image-design` - a logo built from an icon must
  record the icon's licence here and the usage right there.
- `Free Tier Limit` and `Cost Today` reconcile against
  `vendor-supplier-scorecard` and `cloud-cost-variance-tracker` in
  `me-ops-system-builder`, which track what the business actually pays for.
- `Category` = `Template` connects to `business-website-setup` - a template's licence
  governs whether the business may ship the site built with it.

## Examples

**Prompt**

```
We have almost no budget for design. We need a logo, a leaflet, a website and Instagram
posts, and we keep paying for tools we barely use.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What are you trying to make, and is it for the business itself or for a client?
> **A:** All four, for us. We are a small retailer.
>
> **Q:** Print, screen, or both - and for print, which sizes?
> **A:** A5 and A4 leaflets, and screen for the rest.
>
> **Q:** Is zero a hard constraint, or is a small one-off payment acceptable to remove a
> problem?
> **A:** Hard. Zero.
>
> **Q:** Are there existing tools you already pay for and should use?
> **A:** A subscription we do not use, and a stock photo site for about 15 a month.
>
> **Q:** Does anything need to be editable by a non-designer in two years?
> **A:** The leaflet, yes. Nobody here is a designer.

**Recommended next step** - offered, not built:

> One layout tool with a free plan that exports PDF, print-ready, and a font with an open
> licence that also covers the website. For the logo, do not assemble one from a free icon -
> it is not distinctive and the icon's licence may not cover a logo. For photos, move to a
> source with a clear commercial licence and no per-image fee, and check that anyone
> recognisable has a release. The unused subscription is the cheapest saving here. Every
> choice goes in the register with the licence, the export format and the date the terms
> were read.
>
> Workflow: What is being made and for whom established → One tool per job, open formats
> only → Licence, export and attribution checked → Accessibility checked at selection →
> Register written with source and verification date → Free tier limits recorded →
> Re-checked at renewal
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Never write "free" in `Licence Type`. Write the actual licence, named, from the
  provider's own terms.
- `Unverified` is a real answer. Leaving a licence unverified in the register is more
  honest than guessing, and it is the whole reason the register exists.
- Record where the terms were read and when. Provider terms change without notice, and a
  licence from memory is not a licence.
- Prefer self-hosted and open formats for anything the business owns. A logo that exists
  only as a browser tab is a logo the business does not have.
- One tool per job. A tool that is good at everything is a tool that will be abandoned.
- Check the free tier's actual limit, not the headline. Exports per month, watermarks,
  resolution and seat counts are where free plans stop being free.
- Approve the paid exception deliberately. A proper logo, a real font licence for a
  broadcast use, and a photo with a model release are the three places a small business
  should spend money rather than save it.
- Do not build a logo from a free icon or clip-art. Distinctiveness and the licence are two
  different problems and both fail this way.
- Check accessibility at selection, not at the end. Type size, contrast and alt-text support
  are properties of the tool and the asset, and they are far cheaper to choose than to fix.
- Keep the licence file or terms copy with the asset. A `CC BY` asset that lost its
  attribution is a breach, and the requirement lives in `Notes`.
- Re-verify on renewal and when the business changes scale, because a free plan's terms and
  a provider's AI-training clause both change underneath you.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real resource.

## Limitations

- This skill does not grant a licence, and it is not legal advice. Licence interpretation,
  fair dealing, and any dispute about permission belong to a qualified adviser in the
  jurisdiction the business operates in.
- Terms change. Nothing in this table is a guarantee of what a provider permits on any future
  date; only the provider's current terms do, and only as recorded on `Verified On`.
- Free tiers change without notice, including their limits, their AI-training clauses, and
  whether they require an account. Prices and features here are as at the verification date
  and must be re-checked.
- It cannot audit an existing design for licence compliance. It registers what the business
  says it uses; compliance is a separate review, and retro-permission is not something this
  skill can grant.
- It cannot evaluate whether a resource is actually free in practice, only what its terms
  say. A "free" plan that requires a card and silently converts is a billing decision, not
  a licence question.
- It does not create, generate, edit or convert any design asset. It has no image, font or
  layout capability.
- It does not assess artistic quality, brand fit or suitability for a specific audience.
  Those are judgement calls about the business, not facts about a tool.
- Accessibility notes record what is documented. Conformance with WCAG 2.2 AA on a real page
  must be measured on the built artefact, not on the tool's feature list.
- It cannot check model releases, property releases or third-party rights in a photograph
  beyond noting that they are required.
- It does not review the accessibility of an existing document or site, and it cannot
  generate alt text for a specific image here.

## Security & Safety Notes

- Never invent a licence, a price, a feature, an export format or a term. If it was not
  read from the provider's own current terms, it is `Unverified`, and it stays that way.
- Never claim commercial-use permission from a pricing page, a blog post, a tutorial, or
  memory. A licence is the terms document, and `Verification Source` records which one.
- Never record a provider's terms as verified if they were not read. The most damaging row
  in this table is the one that says `Yes` because it felt right.
- Third-party assets carry their own rights. A font, icon or photo the business does not own
  can carry claims from a third party, and a register entry is not a defence.
- Never use a resource whose licence forbids the intended use, and never rely on "fair use"
  or "for educational purposes" as a business justification. Ask instead.
- Attribution is a licence condition, not a courtesy. Where `Attribution Required` is `Yes`,
  the required wording is reproduced in the published work exactly as specified.
- Do not paste credentials, an account identifier or a payment detail into this table. A
  resource register is usually shared more widely than a tool account.
- When a free plan requires an account, treat the business's data handling under those terms
  as a real consideration: what the provider may do with uploaded brand assets, drafts and
  unpublished designs.
- Be careful with AI-assisted design tools. Training data terms, output ownership and the
  right to commercialise output vary and are unsettled in several jurisdictions; verify
  before an output is published or registered as a trade mark.
- Never publish generated or unlicensed output into a live brand without a recorded
  verification. That is the one habit that keeps a free-tools policy from becoming a
  liability.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.

