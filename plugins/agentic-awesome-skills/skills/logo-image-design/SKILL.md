---
name: logo-image-design
description: 'Brand asset register: asset type, format, dimensions and aspect ratio, colour mode, background variant, clear space, approved and prohibited uses, rights owner and licence. Use for brand control.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, brand, logo, mark, imagery, photography, stock, icon, trademark, licence, rights, brand-guidelines, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Logo & Image Design

**What it is:** the mark and the image library - every logo variant, photograph, icon and graphic the business is allowed to use, with the rights attached to it.

## Overview

Works out the smallest useful asset set for the business in front of it, then builds it only
when asked. The default output is a short recommendation, not a folder of files. The asset
register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request, from one
field list so the four cannot drift apart.

Layer: Layer 2: Brand & Design. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a logo is not a picture, and a picture is not
free to use. `Asset Type` separates the mark from the imagery, and `Licence`,
`Rights Owner` and `Trademark Status` exist because the expensive failure in branding is
not an ugly logo - it is a mark that was already registered, or a stock photo whose
licence expired, discovered two years later. Every asset carries its rights on the same row
as the file.

## When to Use This Skill

- logo, brand mark, wordmark, monogram, symbol, favicon
- lockups, horizontal and stacked versions, one-colour version
- photography library, product photos, team photos, office shots
- icons, illustrations, graphics, patterns
- "we need brand guidelines"
- "can we use this image we found"
- "is this logo already taken"

Do not use it for: the colour and type system underneath the mark (`design-theme-guide`),
the printed items the mark goes on (`brand-kit-print-collateral`), or stock-footage sourcing
for ads.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "design" / "make" / "we need" -> artifacts wanted; go to Step 2.
- "we already have one" -> something exists; capture what is in use, then Step 2.
- "review" / "check" / "audit" / "is this ok" -> a check, not a build.
- "can we use this" -> a rights question; answer it from what they show, no build.
- "fix" / "refresh" -> capture the current mark and its problem, then Step 2.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the asset set.

- **Identity** - Exact spelling of the name, and any tagline? / What the business does, in
  one line? / Any name change coming, or a trading name separate from the registered one?
- **Current state** - Is there a logo today, and who made it? / Where is it used - sign,
  vehicle, invoices, app, uniform? / Does the file still exist in an editable format?
- **Rights** - Does the business already own any marks or registered names? / Any prior
  designer whose rights were not transferred in writing? / Who signs off the final mark?
- **Imagery** - Do the products or the premises need photographing? / Who is in the photos?
  Any consent needed? / Is there a real premises to shoot, or is stock acceptable?
- **Delivery** - Which formats and where are they needed - web, print, embroidery, social?
  / Does anything need to work at very small size?

Never invent an answer. Names, designer credits, licence terms, trademark numbers and
consent statuses the user has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: logo-image-design
intent: null            # design | refresh | review | import | fix
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Identity": null
  "Current State": null
  "Rights": null
  "Imagery": null
  "Delivery": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** A trademark search first, then one primary mark with three
required variants - full colour, one colour, and a small-size or favicon version - plus a
clear-space rule and a minimum size, recorded once and reused everywhere. Alongside it, a
photography rule: real premises and real people, shot on a phone, in a fixed set of
framings, with the consent record kept next to the images.

**Why this one:** The variants are what stop the business from stretching a logo. One mark
that has a defined small-size version does not need four more that nobody approved. And the
search comes first because a mark that is already registered cannot be re-designed, only
re-named.

**Workflow:** Name and mark searched → Direction chosen → Master mark drawn → Required
variants derived → Clear space and minimum size set → Digital and print masters exported →
Imagery shot or licensed → Consent and licence recorded per asset → Register approved and
versioned

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
Asset ID,Asset Name,Asset Type,Format,Dimensions,Aspect Ratio,Colour Mode,Background Variant,Minimum Size,Clear Space,Placement,Usage Approved,Usage Not Approved,Source,Rights Owner,Licence,Trademark Status,Version,Status,Notes
,Example Retail primary mark,Logo,SVG and PNG,512x512 and 2400x1200,1:1 and 2:1,CMYK and RGB,Light and dark,24 px digital,Mark height on all sides,Lockup left of text,"Website, social avatar, invoice header","Dark backgrounds, embroidery under 25 mm",Unsplash internal shoot,Example Retail,Example Retainers (transfer in writing),Not searched,1.0,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE brand_asset (
  asset_id BIGINT PRIMARY KEY,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL,
  format VARCHAR(100) NOT NULL,
  dimensions VARCHAR(100),
  aspect_ratio VARCHAR(50),
  colour_mode VARCHAR(100) NOT NULL,
  background_variant VARCHAR(100) NOT NULL,
  minimum_size VARCHAR(50),
  clear_space VARCHAR(255),
  placement TEXT,
  usage_approved TEXT,
  usage_not_approved TEXT,
  source VARCHAR(255),
  rights_owner VARCHAR(255),
  licence VARCHAR(255),
  trademark_status VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT asset_trademark_status CHECK (trademark_status IN ('Not searched','Searched - clear','Application filed','Registered','Conflicting mark found','Unknown')),
  CONSTRAINT asset_status CHECK (status IN ('Draft','In review','Approved','Retired'))
);

CREATE INDEX idx_brand_asset_status ON brand_asset (status);
CREATE INDEX idx_brand_asset_type ON brand_asset (asset_type);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Logo & Image Design",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Asset ID": { "type": "integer" },
      "Asset Name": { "type": "string" },
      "Asset Type": { "type": "string" },
      "Format": { "type": "string" },
      "Dimensions": { "type": "string" },
      "Aspect Ratio": { "type": "string" },
      "Colour Mode": { "type": "string" },
      "Background Variant": { "type": "string" },
      "Minimum Size": { "type": "string" },
      "Clear Space": { "type": "string" },
      "Placement": { "type": "string" },
      "Usage Approved": { "type": "string" },
      "Usage Not Approved": { "type": "string" },
      "Source": { "type": "string" },
      "Rights Owner": { "type": "string" },
      "Licence": { "type": "string" },
      "Trademark Status": { "type": "string" },
      "Version": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Asset Name",
      "Asset Type",
      "Format",
      "Colour Mode",
      "Background Variant",
      "Trademark Status",
      "Version",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Asset ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Asset Name | Title | Use as the database title |
| Asset Type | Select (add options after import) | Convert to Select, add options: "Logo", "Logo Variant", "Icon", "Illustration", "Photograph", "Product Image", "Pattern", "Graphic", "Video Still", "Document Cover" |
| Format | Select (add options after import) | Convert to Select, add options: "SVG", "EPS", "PNG", "JPG", "WebP", "PDF", "AI", "MP4" |
| Dimensions | Text | Leave as Text. Record the pixel or mm size, and the print resolution separately in Notes |
| Aspect Ratio | Text | Leave as Text |
| Colour Mode | Select (add options after import) | Convert to Select, add options: "RGB", "CMYK", "Greyscale", "One colour", "Duotone" |
| Background Variant | Select (add options after import) | Convert to Select, add options: "Light", "Dark", "Transparent", "Coloured", "Photographic" |
| Minimum Size | Text | Leave as Text. The smallest size at which the mark still reads |
| Clear Space | Text | Leave as Text. Expressed in mark units, e.g. "mark height on all sides" |
| Placement | Text | Leave as Text |
| Usage Approved | Text | Leave as Text |
| Usage Not Approved | Text | Leave as Text. The misuse list |
| Source | Text | Leave as Text. Where the file or the licence came from |
| Rights Owner | Text | Leave as Text. Not the designer - the copyright holder |
| Licence | Text | Leave as Text. Name it: Unsplash licence, OFL, CC BY 4.0, owned outright |
| Trademark Status | Select (add options after import) | Convert to Select, add options: "Not searched", "Searched - clear", "Application filed", "Registered", "Conflicting mark found", "Unknown" |
| Version | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In review", "Approved", "Retired" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Rights fields the user has not confirmed are
`Unknown` or `Not searched` - never assumed clear.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Asset ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Asset Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Retail primary mark` |
| 3 | Asset Type | `select` | `VARCHAR(100)` | `string` | Select | `Logo` |
| 4 | Format | `select` | `VARCHAR(100)` | `string` | Select | `SVG and PNG` |
| 5 | Dimensions | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 6 | Aspect Ratio | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 7 | Colour Mode | `select` | `VARCHAR(100)` | `string` | Select | `CMYK and RGB` |
| 8 | Background Variant | `select` | `VARCHAR(100)` | `string` | Select | `Light and dark` |
| 9 | Minimum Size | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 10 | Clear Space | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 11 | Placement | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 12 | Usage Approved | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 13 | Usage Not Approved | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 14 | Source | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 15 | Rights Owner | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 16 | Licence | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 17 | Trademark Status | `select` | `VARCHAR(100)` | `string` | Select | `Not searched` |
| 18 | Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 19 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 20 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Asset Type** - a starting set. `Photograph` and `Product Image` are separated because a
product image is repeatable and needs a consistent framing, while a photograph of a
premises is one-off.

```
Logo | Logo Variant | Icon | Illustration | Photograph | Product Image | Pattern | Graphic | Video Still | Document Cover
```

**Format**

```
SVG | EPS | PNG | JPG | WebP | PDF | AI | MP4
```

**Colour Mode**

```
RGB | CMYK | Greyscale | One colour | Duotone
```

**Background Variant** - tells the designer which version of the mark to reach for.

```
Light | Dark | Transparent | Coloured | Photographic
```

**Trademark Status** - `Unknown` and `Not searched` are different: the first means nobody
knows, the second means nobody looked. Both are honest answers.

```
Not searched | Searched - clear | Application filed | Registered | Conflicting mark found | Unknown
```

**Status**

```
Draft | In review | Approved | Retired
```

## Relations

None. This table is standalone. Photo consent records, if the business keeps them
separately, are referenced from `Notes` by their document number - confirm with the
business before making that a live relation.

## Examples

**Prompt**

```
We have a logo someone made in Canva about three years ago. We cannot find the file, it
is on the shopfront, and we are now printing visiting cards.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods.
>
> **Q:** Where is the current logo used - sign, vehicle, invoices, anything else?
> **A:** Shopfront and the invoices.
>
> **Q:** Has anyone checked whether the name is already registered as a trademark?
> **A:** No.
>
> **Q:** Do the cards need to match the shopfront, or can the mark change?
> **A:** It can change, but the sign cannot - that is expensive.

**Recommended next step** - offered, not built:

> One mark, derived to work on the sign and on a 55x90mm card, with a trademark search run
> before any drawing starts. Then three variants - full colour, one colour, and a small
> size version for a favicon - with clear space and a minimum size written down once, and
> the whole set in an asset register so nobody stretches it again.
>
> Workflow: Name and mark searched → Direction chosen → Master mark drawn → Required
> variants derived → Clear space and minimum size set → Digital and print masters exported →
> Register approved and versioned
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Run the trademark search before designing. USPTO, EUIPO, IP India or the national IP
  office; WIPO's Global Brand Database covers several at once. It is free.
- A mark needs three variants, not one: full colour, single colour, and a simplified
  version for small sizes. Anything more is a decision to defer.
- Set clear space in a unit of the mark itself, so it scales. "One cap-height on all sides"
  survives a resize; "5mm" does not.
- Set a minimum size and record it. Below that, the small-size variant is used instead of
  the master.
- Keep an editable master. The Canva-file problem is the normal outcome, not the exception.
- Rights in writing. If a designer made it, the transfer of copyright must be a document,
  not an email thread. In many countries copyright does not transfer by implication.
- Photograph the real premises and the real people. Stock beats nothing, but it never beats
  the actual shopfront, and a phone photo with good light is a legitimate brand image.
- Get written consent for any identifiable person, and keep the consent record next to the
  image reference. A face on a website is a data-protection question as well as a
  permissions one.
- Export SVG as the master for anything that scales, PNG at 1x/2x/3x for the web, and CMYK
  for print. Never upscale a raster logo.
- Keep a one-page "logo misuse" sheet next to the files. Most of what looks like a bad
  logo is a stretched, rotated or recoloured one.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real asset.

## Limitations

- This skill produces a register and a specification. It does not draw, and it cannot
  attach a vector file.
- A trademark search is a screening step, not a legal opinion, and it is not a
  registration. `Trademark Status` records what stage the business is at.
- It cannot confirm a stock licence. `Licence` records what the business says the licence
  is; verifying the photographer's actual terms is the business's action.
- Vector artwork for embroidery, laser engraving and small-format print has constraints
  (minimum stroke width, no gradients, few colours) that this table does not model.
- "Does this logo look good" is not a question this skill answers. It answers whether the
  mark is being used within its own rules.
- The register tracks files. It is not a DAM, and it does not store the binaries.
- Rebranding cost, rollout sequencing and internal re-training are out of scope.
- Legal review of the final mark before launch is still required.

## Security & Safety Notes

- Never invent a designer credit, a licence name, a trademark number or a registration
  status. `Unknown` and `Not searched` are correct answers.
- Never assert that a name is available to trademark. Say that a search has not been run.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes an existing brand guideline or an unreleased product, note that it
  stays in the conversation and should be deleted if it is confidential.
- Personal data on a photograph - faces, name badges, plates, screens - is a data
  protection question. Flag it; do not decide it.
- A person's likeness used commercially can need a release. Treat consent as a required
  field, not a nice-to-have.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** a logo was designed before the name was checked, and the name is taken.
  **Solution:** the mark is redone. A search is cheaper than a rebrand and takes a day.
- **Problem:** the mark is stretched on a banner and blurred on a business card.
  **Solution:** that is a missing clear-space and minimum-size rule. Both are columns here.
- **Problem:** the same logo exists in six files with six different blues.
  **Solution:** version the asset, and make `Status` = `Approved` the only one that ships.
- **Problem:** a stock photo was used and the licence was for personal use only.
  **Solution:** `Licence` is a required column, and "personal use only" is not a licence
  for a business website.
- **Problem:** the register has assets but no owner and no review date, so it is never
  updated.
  **Solution:** `Last Reviewed` and `Status` are what make it a register and not a list.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @brand-growth-system-builder - routes to this skill and the other 12 brand and growth modules.
- @design-theme-guide - the colour and type tokens this module's assets must use.
- @brand-kit-print-collateral - where the mark gets onto letterhead, cards and folders.
- @free-design-resources - icon sets, illustration libraries, stock photography, and the
  trademark search databases.
- @gbp-local-seo-intent - the profile photos and the store-front shots, which are the
  highest-value images the business owns.
- @presentation-deck - the mark on slides, and the misuse rules that apply there too.
- @social-media-setup - per-platform avatar and cover crops of the same master.

## Reusable Prompt

```
I need a logo and an image library for my business - the mark, its variants, and the
photography and icons we are allowed to use.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a designer credit, a licence or a trademark status. Then recommend the
smallest asset set that fits, including a trademark search before any drawing, and wait
for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
