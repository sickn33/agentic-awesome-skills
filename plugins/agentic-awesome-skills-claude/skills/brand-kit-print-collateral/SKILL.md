---
name: brand-kit-print-collateral
description: 'Print collateral spec: item, finished and trim size, bleed, colour mode, stock and GSM, finish, safe margin, print method, quantity and unit cost. Use for cards and letterhead.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, brand-kit, letterhead, visiting-card, business-card, employee-card, id-card, print, bleed, cmyk, stationery, folder, invoice, email-signature, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Brand Kit & Print Collateral

**What it is:** the printed identity set - letterhead, visiting card, employee ID card, folder, invoice, quotation and the email signature block - specified to the point where any printer can produce it.

## Overview

Works out the smallest useful collateral set for the business in front of it, then builds it
only when asked. The default output is a short recommendation, not a set of layout files.
The collateral register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on
request, from one field list so the four cannot drift apart.

Layer: Layer 2: Brand & Design. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** the finished size and the trim size are
different things, and a designer who forgets the difference pays for the reprint. The
finished size is what gets cut; the trim size is finished size plus bleed on every edge.
The table keeps them in separate columns for exactly that reason, and the same logic
separates colour mode, stock weight and finish - three decisions a printer asks about
before a job starts, and three that cannot be changed after it starts.

## When to Use This Skill

- letterhead, visiting card, business card, ID card, employee card, name badge
- compliment slip, folder, envelope, invoice, quotation, statement
- email signature block
- "our print looks wrong"
- prepress, bleed, CMYK, crop marks, stock weight, lamination
- brand guidelines for anything that gets printed

Do not use it for: the digital design system (`design-theme-guide`), the mark itself
(`logo-image-design`), or the email body templates - the signature block is in scope here,
the body is `business-email-template`.

Do not use it before an approved mark exists. Collateral built with no approved logo is a
rewrite later; route to `logo-image-design` first and note the dependency.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "design" / "make" / "we need" -> artifacts wanted; go to Step 2.
- "we already print these" -> something exists; capture it, then Step 2.
- "print came out wrong" / "fix" -> a prepress or specification problem; capture what went
  wrong, then Step 2.
- "review" / "check" -> a check, not a build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the item list or the specification.

- **Identity** - Exact business name, address and phone as they must print? / Logo file
  available in an editable or vector format? / Anything already printed that must match?
- **Items** - Which items are needed - letterhead, card, employee card, folder, invoice,
  envelope? / Which need to be two-sided? / Is the employee card for access control, or
  purely for identity?
- **Volume** - How many of each, now and over the year? / Who prints it - a local printer,
  a national one, or an online print service?
- **Specification** - Any stock or finish already decided? / Does it need to be writable -
  pen, pencil, thermal printer? / Any wet or outdoor exposure?
- **Employee card detail** - What goes on it - photo, name, role, department, phone, or a
  barcode? / What is the data-protection position on employee photos and role data?

Never invent an answer. Names, addresses, phone numbers, quantities, stock weights, printer
names, prices and barcode schemes the user has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: brand-kit-print-collateral
intent: null            # design | fix | review | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Identity": null
  "Items": null
  "Volume": null
  "Specification": null
  "Employee Card Detail": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Four items that between them cover almost every business - A4
letterhead, a 55x90mm visiting card, an 85.54mm employee card in the same family, and a
single-page email signature. Each specified with trim, bleed, colour mode, stock and
finish stated once, plus a PDF proof and a print-ready export with crop marks. Build the
envelope and folder only when someone asks for them.

**Why this one:** These four are the items a business actually runs out of. Folder and
envelope are a second print run, not a first one, and they can inherit the letterhead's
specification without being redesigned. A signature block costs nothing and appears in
every email the business ever sends, which makes it the highest-leverage item on the list.

**Workflow:** Items and sizes fixed → Mark and tokens applied → Copy block written once →
Layout and hierarchy set → Stock and finish chosen → Bleed and crop marks set → PDF proof
approved → Print-ready export with marks → Proof checked on press → Master archived

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
Item ID,Item Name,Item Type,Finished Size,Trim Size,Bleed,Colour Mode,Stock,Paper Weight GSM,Finish,Sides,Corner Radius,Safe Margin,Front Elements,Back Elements,Spot Colour,Print Method,Quantity,Cost Per Unit,Supplier,Version,Status,Notes
,Example Retail letterhead,Letterhead,A4,216x303 mm,3 mm,CMYK,Uncoated,120,Uncoated,One side,0,12 mm,"Logo top left, NAP block bottom left, contact strip bottom right",Reverse: repeat mark and the short URL only,None - build to process black only,Digital litho,250,0.00,Unknown,1.0,Draft,"Example row - replace every value before use."
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE print_collateral (
  item_id BIGINT PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(100) NOT NULL,
  finished_size VARCHAR(50) NOT NULL,
  trim_size VARCHAR(50) NOT NULL,
  bleed VARCHAR(50) NOT NULL,
  colour_mode VARCHAR(100) NOT NULL,
  stock VARCHAR(100) NOT NULL,
  paper_weight_gsm INTEGER,
  finish VARCHAR(100) NOT NULL,
  sides VARCHAR(20) NOT NULL,
  corner_radius VARCHAR(50),
  safe_margin VARCHAR(50),
  front_elements TEXT,
  back_elements TEXT,
  spot_colour VARCHAR(255),
  print_method VARCHAR(100),
  quantity INTEGER,
  cost_per_unit NUMERIC(14,2),
  supplier VARCHAR(255),
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT collateral_bleed CHECK (bleed IN ('3 mm','5 mm','None','Other - state in Notes')),
  CONSTRAINT collateral_sides CHECK (sides IN ('One side','Two sides','Two sides - different front and back')),
  CONSTRAINT collateral_cost_non_negative CHECK (cost_per_unit IS NULL OR cost_per_unit >= 0)
);

CREATE INDEX idx_print_collateral_status ON print_collateral (status);
CREATE INDEX idx_print_collateral_type ON print_collateral (item_type);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Brand Kit & Print Collateral",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Item ID": { "type": "integer" },
      "Item Name": { "type": "string" },
      "Item Type": { "type": "string" },
      "Finished Size": { "type": "string" },
      "Trim Size": { "type": "string" },
      "Bleed": { "type": "string" },
      "Colour Mode": { "type": "string" },
      "Stock": { "type": "string" },
      "Paper Weight GSM": { "type": "integer" },
      "Finish": { "type": "string" },
      "Sides": { "type": "string" },
      "Corner Radius": { "type": "string" },
      "Safe Margin": { "type": "string" },
      "Front Elements": { "type": "string" },
      "Back Elements": { "type": "string" },
      "Spot Colour": { "type": "string" },
      "Print Method": { "type": "string" },
      "Quantity": { "type": "integer" },
      "Cost Per Unit": { "type": "number" },
      "Supplier": { "type": "string" },
      "Version": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Item Name",
      "Item Type",
      "Finished Size",
      "Trim Size",
      "Bleed",
      "Colour Mode",
      "Stock",
      "Finish",
      "Sides",
      "Version",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Item ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Item Name | Title | Use as the database title |
| Item Type | Select (add options after import) | Convert to Select, add options: "Letterhead", "Visiting Card", "Employee Card", "Envelope", "Folder", "Invoice", "Quotation", "Statement", "Compliment Slip", "Email Signature", "Presentation Document" |
| Finished Size | Text | Leave as Text. The cut size. mm for print, px for screen-only items |
| Trim Size | Text | Leave as Text. Finished size plus bleed. State the arithmetic in Notes |
| Bleed | Select (add options after import) | Convert to Select, add options: "3 mm", "5 mm", "None", "Other - state in Notes" |
| Colour Mode | Select (add options after import) | Convert to Select, add options: "CMYK", "RGB", "Greyscale", "CMYK plus spot", "Process black only" |
| Stock | Text | Leave as Text. "120gsm uncoated" and "350gsm silk" are two different answers |
| Paper Weight GSM | Number | Convert to Number, no unit. The cell holds digits only |
| Finish | Select (add options after import) | Convert to Select, add options: "Uncoated", "Matt lamination", "Gloss lamination", "Soft touch lamination", "Spot UV", "Foil", "Round corner", "Die cut", "Perforation" |
| Sides | Select (add options after import) | Convert to Select, add options: "One side", "Two sides", "Two sides - different front and back" |
| Corner Radius | Text | Leave as Text. "0" for square. Round corners need a die, which is a cost |
| Safe Margin | Text | Leave as Text. Keep content inside this; the trim tolerance eats the rest |
| Front Elements | Text | Leave as Text |
| Back Elements | Text | Leave as Text |
| Spot Colour | Text | Leave as Text. Name the ink and the Pantone or CMYK build. "None" is a valid entry |
| Print Method | Text | Leave as Text. "Digital litho" and "offset" cost differently at different runs |
| Quantity | Number | Convert to Number, digits only |
| Cost Per Unit | Number (format: currency) | Convert to Number, set format to Currency. No symbol in the cell |
| Supplier | Text | Leave as Text |
| Version | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In review", "Proof approved", "Sent to printer", "Printed", "Archived" |
| Notes | Text | Leave as Text. Print the printer's own instructions here |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money is `currency` with no symbol. Stock,
finish and quantity stay `Unknown` or blank until the business supplies them - never a
plausible guess.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Item ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Item Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Retail letterhead` |
| 3 | Item Type | `select` | `VARCHAR(100)` | `string` | Select | `Letterhead` |
| 4 | Finished Size | `text` | `VARCHAR(50)` | `string` | Text | `A4` |
| 5 | Trim Size | `text` | `VARCHAR(50)` | `string` | Text | `216x303 mm` |
| 6 | Bleed | `select` | `VARCHAR(50)` | `string` | Select | `3 mm` |
| 7 | Colour Mode | `select` | `VARCHAR(100)` | `string` | Select | `CMYK` |
| 8 | Stock | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 9 | Paper Weight GSM | `number` | `INTEGER` | `integer` | Number | *(blank)* |
| 10 | Finish | `select` | `VARCHAR(100)` | `string` | Select | `Uncoated` |
| 11 | Sides | `select` | `VARCHAR(20)` | `string` | Select | `One side` |
| 12 | Corner Radius | `text` | `VARCHAR(50)` | `string` | Text | `0` |
| 13 | Safe Margin | `text` | `VARCHAR(50)` | `string` | Text | `12 mm` |
| 14 | Front Elements | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 15 | Back Elements | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 16 | Spot Colour | `text` | `VARCHAR(255)` | `string` | Text | `None` |
| 17 | Print Method | `text` | `VARCHAR(100)` | `string` | Text | `Digital litho` |
| 18 | Quantity | `number` | `INTEGER` | `integer` | Number | `250` |
| 19 | Cost Per Unit | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `0.00` |
| 20 | Supplier | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 21 | Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 22 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 23 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Item Type** - a starting set. Add the country's own statutory items (a UK VAT
invoice wording, an Indian GST invoice) when the business tells you they apply.

```
Letterhead | Visiting Card | Employee Card | Envelope | Folder | Invoice | Quotation | Statement | Compliment Slip | Email Signature | Presentation Document
```

**Bleed** - the three values that matter. 3 mm is the common default; anything that runs
off an edge needs it, and anything that does not run off an edge does not.

```
3 mm | 5 mm | None | Other - state in Notes
```

**Colour Mode** - `Process black only` is the cheapest, most reliable option for a
letterhead and it looks better than a bad CMYK build of a logo.

```
CMYK | RGB | Greyscale | CMYK plus spot | Process black only
```

**Finish** - each one is a different price and a different minimum run. Round corners and
die cuts need a physical tool, so a re-run after a text change is not free.

```
Uncoated | Matt lamination | Gloss lamination | Soft touch lamination | Spot UV | Foil | Round corner | Die cut | Perforation
```

**Sides** - three values, not two, because a folded sheet with a different back is a
different item from a two-sided flat one.

```
One side | Two sides | Two sides - different front and back
```

**Status** - the print cycle, in order. `Proof approved` is the gate; nothing goes to press
before it.

```
Draft | In review | Proof approved | Sent to printer | Printed | Archived
```

## Relations

None standalone. Two natural links worth confirming with the business before making them
live relations:

- `Supplier` points at a vendor database if one exists in the same build. Otherwise it is
  Text with a note naming the intended target.
- The employee card's role and department fields point at the `people-directory` in the
  operational pack. That database is not in this artifact set, so `Front Elements` stays
  text here and names the fields it draws from.

## Examples

**Prompt**

```
We want to redo our letterhead and get visiting cards made. Last time the cards came out
with a white edge around the logo and the letterhead was a different blue to the website.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods in Example City.
>
> **Q:** Is there an approved logo file in an editable or vector format?
> **A:** We have a PNG, and the original Canva file.
>
> **Q:** Which items do you need - letterhead, cards, employee cards, envelopes, folder?
> **A:** Letterhead and visiting cards for now. Employee cards later.
>
> **Q:** How many of each, and who is printing them?
> **A:** 500 cards. There is a printer on our street the founder used before.
>
> **Q:** Do the cards need to be writable?
> **A:** Yes, people write on them.

**Recommended next step** - offered, not built:

> Letterhead and visiting card, both built from the same tokens as the website so the blue
> cannot drift again. Cards at 55x90mm on 350gsm uncoated with a round corner and matt
> lamination, letterhead on 120gsm uncoated. Both at 3mm bleed, and the logo supplied as
> vector rather than a stretched PNG - that is the white edge. Add the employee card and
> envelope in the same family when the second run happens.
>
> Workflow: Items and sizes fixed → Mark and tokens applied → Copy block written once →
> Layout and hierarchy set → Stock and finish chosen → Bleed and crop marks set → PDF proof
> approved → Print-ready export with marks → Proof checked on press → Master archived
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Never hand a printer a raster logo. Ask for SVG or EPS, or redraw the mark. A stretched
  PNG is the single most common cause of a soft edge on a printed card.
- Write the copy block once. The address, phone, email and web line are identical on the
  letterhead, the card, the invoice and the signature - typed from the canonical NAP block,
  never retyped.
- Build text as process black wherever possible. A four-colour CMYK build of a one-colour
  logo costs more and usually looks worse.
- Always proof on press for a first run. Optical margin alignment means the block can sit
  0.3mm high, and on a letterhead that is visible on every page.
- Keep a 3mm bleed on anything that touches an edge, and keep live content at least 5mm
  inside the trim - trim tolerance eats the margin.
- Ask the printer for the ICC profile of the press and soft-proof from it. Do not send an
  untagged CMYK file and hope.
- Choose writable stock for cards people will write on, and a smaller card for people who
  will not.
- Treat the email signature as collateral, not as an afterthought. It is the one item that
  appears in every message forever.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real item.

## Limitations

- This is a specification register. It does not lay out the artwork, and it cannot attach
  a press-ready PDF.
- It cannot check a printer's actual capability, minimum run, price or lead time. Those go
  in `Supplier` and `Cost Per Unit` when the business supplies them.
- Barcode, RFID and access-control encoding on an employee card is out of scope. If the
  card is a credential and not an ID badge, that is a different product with a different
  supplier.
- Employee photo and role data on an ID card is a data-protection question. This table
  records that the fields exist; it does not decide the lawful basis.
- It does not model envelopes, window envelopes or carrier-specific dielines.
- Special finishes have minimum runs and plate costs that vary by printer and are not
  modelled here.
- Round corners and die cuts are a one-time tool charge; changing the shape later means a
  new charge. This is a commercial fact, not a design preference.
- Print colour cannot be guaranteed to match a screen. Nothing in this table promises a
  match, and a proof is the only check.

## Security & Safety Notes

- Never invent a business name, address, phone number, quantity, supplier, price, stock
  weight or barcode value. `Unknown` and blank are correct.
- Employee card data is personal data. A photo, a role, a department and an employee
  number on a card are all personal data in most jurisdictions. Do not paste a real
  employee roster into this table.
- Employee photos and role data need a lawful basis and an access policy. Flag it, and
  refer it to the data-protection position - `data-privacy-controls` in the operational
  pack.
- Lost cards are a security event, not an admin task. A card register should be able to
  record a revoke-and-replace.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- Barcode and QR payloads must never contain a national identifier or anything that should
  not be publicly readable from the card.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** finished size and trim size are the same value.
  **Solution:** trim is finished plus bleed on all four edges. The white edge on a printed
  card is almost always a missing bleed or a white background that was not removed.
- **Problem:** the logo arrives as a stretched PNG from a Canva file.
  **Solution:** ask for the vector, or redraw. A raster logo at card size is visible as
  softness on every one of 500 cards.
- **Problem:** the letterhead blue does not match the website.
  **Solution:** the copy is a screen value in CMYK. Use a CMYK build of the brand colour,
  and accept that exact match is impossible; a proof settles it.
- **Problem:** content sits 3mm from the trim on a folded item.
  **Solution:** fold eats the margin. Keep live content 5mm inside, and never run a fold
  through text.
- **Problem:** stock weight was never chosen and the printer defaulted it.
  **Solution:** `Stock` and `Paper Weight GSM` are not optional. State them.
- **Problem:** spot UV or foil was added "to match the brand", at 100 units.
  **Solution:** plate and tool costs make small runs of special finish uneconomic. It is a
  quantity decision, and it belongs to the business.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- `brand-growth-system-builder` - routes to this skill and the other 12 brand and growth modules.
- @logo-image-design - the master mark and the vector files this module needs. Run first.
- @design-theme-guide - the colour and type tokens every item here must use.
- `business-email-template` - the email body; the signature block stays in this module.
- @free-design-resources - stock photography, fonts, print services and mockups.
- @presentation-deck - the printed leave-behind version of the deck.
- @code-of-conduct - what the employee card shows, and where the conduct rules are posted.
- `asset-it-management` (operational pack) - the issued card, lanyard and laptop as assets.

## Reusable Prompt

```
I want a printed brand kit - letterhead, visiting cards, employee cards, and an email
signature - specified so any printer can produce it.
Ask me one short question at a time, and only about what I have not already told you.
Never invent an address, quantity, price or supplier. Then recommend the smallest item
set that fits, with the logo as a dependency, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
