---
name: design-theme-guide
description: 'Design-token register: colour, typography, spacing and radius tokens with light and dark values, contrast ratio and WCAG level. Use for design system documentation.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, brand, design-system, design-tokens, theme, colour, typography, spacing, wcag, accessibility, contrast, css, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Design Theme Guide

**What it is:** the documented value set a business designs against - colour, type, space, radius, motion - with every colour pair contrast-tested and written down.

## Overview

Works out the smallest useful theme for the business in front of it, then builds it only
when asked. The default output is a short recommendation, not a token file. The token
register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request, from one
field list so the four cannot drift apart.

Layer: Layer 2: Brand & Design. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a theme is a set of *values*, not a set of
screens. If a colour, size or spacing value is not a row in the register, it is not part of
the system, and anything using it is a one-off. `Value` alone is the single source; the
light and dark variants and the type metrics exist on the same row because they are the
same token, and a token split across rows drifts within a month.

## When to Use This Skill

- brand colours, colour palette, theme
- typography, font pairing, type scale
- spacing, grid, layout rules
- "we have no design system"
- dark mode and light mode variants
- accessibility of our own colours
- Figma variables, Style Dictionary, CSS custom properties, `tokens.json`

Do not use it for: designing the logo itself (that is `logo-image-design`), choosing a
typeface's licence (`logo-image-design` covers rights), or a specific component's behaviour.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "build" / "create" -> the user wants the token set; go to Step 2.
- "our colours are a mess" / "fix" -> something exists; capture what is in use, then Step 2.
- "is this accessible" / "review" / "audit" -> a check, not a build; answer from what they share.
- "how do we ..." -> advice question; answer directly and offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the token set.

- **Identity** - Business name and what it does? / One colour already decided, and is it
  fixed by a customer, a client or a sign? / Any existing logo, colours or documents?
- **Surface** - Website only, or print and social as well? / Dark mode needed? / Any CMS
  or design tool already in use (Figma, Shopify, WordPress, custom)?
- **Type** - Any typeface already chosen, licensed or not? / Long documents or short
  marketing copy? / Any script other than Latin?
- **Access** - Is there a public-sector, EU-market or accessibility obligation? / Has
  anyone reported low contrast or readability before?
- **Governance** - Who decides a colour change? / Does the theme need to be handed to an
  external developer or agency?

Never invent an answer. Hex codes, brand colours, font names and typeface licences the user
has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: design-theme-guide
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Identity": null
  "Surface": null
  "Type": null
  "Access": null
  "Governance": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One token register with a brand colour as the single source for
accents, a neutral ramp for everything else, one display face and one body face at a fixed
type scale, a 4 or 8 point spacing unit, and light and dark variants. Every colour pair
that carries text gets a measured ratio and a WCAG level in the row itself, so the
accessibility of the theme is auditable rather than remembered.

**Why this one:** A theme that exists as values is the only thing that makes the website,
the deck, the letterhead and the social posts look like one business. Screens cannot do
that, and a theme with no contrast measurement is a theme that fails the first time
someone chooses a pastel.

**Workflow:** Seed colour chosen → Neutral ramp derived → Semantic colour roles assigned →
Every text pair contrast-measured → Typeface pair set and type scale fixed → Spacing unit
and radius set → Light and dark variants recorded → Register approved and versioned →
Components built from tokens only

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
Token ID,Token Name,Token Group,Token Type,Value,Unit,Light Mode Value,Dark Mode Value,Contrast Ratio,Contrast Against,WCAG Level,Font Family,Font Size,Font Weight,Line Height,Letter Spacing,Usage Rule,Do Not Use For,Source Reference,Version,Status,Approved By,Last Reviewed,Notes
TOK-EXAMPLE-001,color.brand.primary,Brand,Color,#1F4FD8,hex,#1F4FD8,#8FB4FF,7.02,color.surface.page,AA,,,,,,Primary action and brand accent,Body text on white surface,WCAG 2.2 SC 1.4.3,1.0,Draft,Unknown,2026-09-27,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use `id BIGINT PRIMARY KEY`
-- or the engine's auto-increment equivalent and keep the rest portable.
CREATE TABLE design_token (
  token_id BIGINT PRIMARY KEY,
  token_name VARCHAR(255) NOT NULL,
  token_group VARCHAR(100) NOT NULL,
  token_type VARCHAR(100) NOT NULL,
  value VARCHAR(255),
  unit VARCHAR(50),
  light_mode_value VARCHAR(255),
  dark_mode_value VARCHAR(255),
  contrast_ratio NUMERIC(5,2),
  contrast_against VARCHAR(255),
  wcag_level VARCHAR(50) NOT NULL,
  font_family VARCHAR(255),
  font_size VARCHAR(50),
  font_weight VARCHAR(50),
  line_height VARCHAR(50),
  letter_spacing VARCHAR(50),
  usage_rule TEXT,
  do_not_use_for TEXT,
  source_reference VARCHAR(255),
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  approved_by VARCHAR(255),
  last_reviewed DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT token_ratio_range CHECK (contrast_ratio IS NULL OR (contrast_ratio >= 1 AND contrast_ratio <= 21)),
  CONSTRAINT token_wcag_level CHECK (wcag_level IN ('AA','AAA','Fail - do not ship','Not applicable'))
);

CREATE INDEX idx_design_token_status ON design_token (status);
CREATE INDEX idx_design_token_type ON design_token (token_type);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Design Theme Guide",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Token ID": { "type": "integer" },
      "Token Name": { "type": "string" },
      "Token Group": { "type": "string" },
      "Token Type": { "type": "string" },
      "Value": { "type": "string" },
      "Unit": { "type": "string" },
      "Light Mode Value": { "type": "string" },
      "Dark Mode Value": { "type": "string" },
      "Contrast Ratio": { "type": "number" },
      "Contrast Against": { "type": "string" },
      "WCAG Level": { "type": "string" },
      "Font Family": { "type": "string" },
      "Font Size": { "type": "string" },
      "Font Weight": { "type": "string" },
      "Line Height": { "type": "string" },
      "Letter Spacing": { "type": "string" },
      "Usage Rule": { "type": "string" },
      "Do Not Use For": { "type": "string" },
      "Source Reference": { "type": "string" },
      "Version": { "type": "string" },
      "Status": { "type": "string" },
      "Approved By": { "type": "string" },
      "Last Reviewed": { "type": "string", "format": "date" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Token Name",
      "Token Group",
      "Token Type",
      "WCAG Level",
      "Version",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Token ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Token Name | Text | Leave as Text. This is the join key - keep it identical everywhere |
| Token Group | Select (add options after import) | Convert to Select, add options: "Brand", "Semantic", "Neutral", "Typography", "Layout", "Component" |
| Token Type | Select (add options after import) | Convert to Select, add options: "Color", "Typography", "Spacing", "Radius", "Shadow", "Border", "Motion", "Breakpoint", "Z-Index" |
| Value | Text | Leave as Text. Hex, px, rem, ms, unitless - it goes in the next column too |
| Unit | Title | Use as the database title |
| Light Mode Value | Text | Leave as Text |
| Dark Mode Value | Text | Leave as Text |
| Contrast Ratio | Number | Convert to Number, 2 decimal places, no unit |
| Contrast Against | Text | Leave as Text. Name the token, not a colour name |
| WCAG Level | Select (add options after import) | Convert to Select, add options: "AA", "AAA", "Fail - do not ship", "Not applicable" |
| Font Family | Text | Leave as Text |
| Font Size | Text | Leave as Text. Keep the unit inside the value, e.g. "16px" |
| Font Weight | Text | Leave as Text. Name the weight, e.g. "Semibold" |
| Line Height | Text | Leave as Text. Unitless multiplier |
| Letter Spacing | Text | Leave as Text |
| Usage Rule | Text | Leave as Text. One sentence. When to use it |
| Do Not Use For | Text | Leave as Text. The misuse list is the most-read column on this table |
| Source Reference | Text | Leave as Text. Link the spec, the checker or the standard clause |
| Version | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In review", "Approved", "Deprecated" |
| Approved By | Text | Leave as Text |
| Last Reviewed | Date | Convert to Date |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Anything measured gets a ratio; anything not
measured is `Not applicable`, never a guess.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Token ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Token Name | `text` | `VARCHAR(255)` | `string` | Text | `color.brand.primary` |
| 3 | Token Group | `select` | `VARCHAR(100)` | `string` | Select | `Brand` |
| 4 | Token Type | `select` | `VARCHAR(100)` | `string` | Select | `Color` |
| 5 | Value | `text` | `VARCHAR(255)` | `string` | Text | `#1F4FD8` |
| 6 | Unit | `select` | `VARCHAR(50)` | `string` | Text | `hex` |
| 7 | Light Mode Value | `text` | `VARCHAR(255)` | `string` | Text | `#1F4FD8` |
| 8 | Dark Mode Value | `text` | `VARCHAR(255)` | `string` | Text | `#8FB4FF` |
| 9 | Contrast Ratio | `number` | `NUMERIC(5,2)` | `number` | Number | `7.02` |
| 10 | Contrast Against | `text` | `VARCHAR(255)` | `string` | Text | `color.surface.page` |
| 11 | WCAG Level | `select` | `VARCHAR(50)` | `string` | Select | `AA` |
| 12 | Font Family | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 13 | Font Size | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 14 | Font Weight | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 15 | Line Height | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 16 | Letter Spacing | `text` | `VARCHAR(50)` | `string` | Text | *(blank)* |
| 17 | Usage Rule | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 18 | Do Not Use For | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 19 | Source Reference | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 20 | Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 21 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 22 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 23 | Last Reviewed | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 24 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Token Group**

```
Brand | Semantic | Neutral | Typography | Layout | Component
```

**Token Type**

```
Color | Typography | Spacing | Radius | Shadow | Border | Motion | Breakpoint | Z-Index
```

**Unit**

```
hex | px | rem | em | ms | s | unitless | count
```

**WCAG Level** - the four legal values. `Fail - do not ship` exists so a failing pair is
recorded and visible, not quietly deleted.

```
AA | AAA | Fail - do not ship | Not applicable
```

**Status**

```
Draft | In review | Approved | Deprecated
```

## Relations

None. This table is standalone. Where a colour is measured, `Contrast Against` names
another token in **the same table by `Token Name`** - that is a lookup on a text field, not
a database relation, and it resolves in SQL as a self-join:

```sql
SELECT a.token_name, a.value, b.value, a.contrast_ratio
FROM design_token a
JOIN design_token b ON a.contrast_against = b.token_name
WHERE a.token_type = 'Color' AND a.status = 'Approved';
```

## Examples

**Prompt**

```
We picked a blue from a logo two years ago and nobody knows which one it is. It looks
fine on the laptop but the founder says people struggle on the website.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods in Example City.
>
> **Q:** Is the blue fixed by anything - a shop sign, a customer, a printed material?
> **A:** It is on the shopfront and on the invoices.
>
> **Q:** Any existing logo, documents or website colours to match?
> **A:** A logo from 2022, and a PDF price list.
>
> **Q:** Website only, or print and social as well?
> **A:** All three.
>
> **Q:** Who decides a colour change?
> **A:** The founder.

**Recommended next step** - offered, not built:

> One token register with that blue as `color.brand.primary`, a neutral ramp derived from
> it, a light and a dark variant, the type scale, a spacing unit, and a measured contrast
> ratio on every pair that carries text - the blue on white is the pair most likely to
> fail.
>
> Workflow: Seed colour confirmed from the sign → Neutral ramp derived → Semantic roles
> assigned → Every text pair contrast-measured → Type scale fixed → Spacing unit set →
> Register approved and versioned
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Measure every text pair. 4.5:1 for body, 3:1 for large text and UI components, per WCAG
  2.2 AA. Record the number next to the colour, with the checker named in `Source Reference`.
- Derive the neutral ramp from the brand colour by adjusting lightness and chroma, not by
  eye. Eleven steps, from surface to ink, is enough for most businesses.
- Assign colour *roles*, not colours to pages. `color.semantic.success` is a role; a green
  hex used in a footer is a one-off that will fight the next person.
- Two typefaces. A display face and a body face. Three is a costume.
- One spacing unit, 4px or 8px. Every margin and padding is a multiple of it.
- Keep `Do Not Use For` filled in. It is the column that prevents the theme from drifting
  back into randomness.
- Export the approved rows to a real token file - JSON in the W3C Design Tokens format, via
  Style Dictionary - so the website, the Figma file and the deck read the same source.
- Derive all four artifacts from the field list in this file, never by hand.
- Use `relation` for anything that points at another table, `text` only for free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real token.

## Limitations

- This is a register of values. It does not draw the screens, and it does not implement
  components.
- It cannot pick a brand colour for the business. That is a decision, and the skill asks
  what is already fixed rather than proposing one.
- Contrast ratios here are calculated from hex values, which is correct for flat colour and
  wrong for a photo, a gradient, a translucent overlay or text on an image. Text over an
  image needs a scrim, and a scrim is a token.
- It does not check a licensed typeface's terms, and it does not embed or host a font.
  Web-font licences differ from print licences and both must be checked before use.
- A token register does not become a design system until components reference tokens
  rather than literals. That enforcement step is manual.
- Dark mode is a second set of values, not an inversion. Every token needs a real
  dark-mode value, tested for its own contrast.
- A theme cannot be audited for accessibility as a whole by a table. Automated tools catch
  roughly a third of issues; keyboard and screen-reader testing is still manual.
- No token pipeline, Figma variable sync or build step is generated. The register is the
  source of truth; wiring it up is a developer task.
- Accessibility conformance is a legal question in some markets. This table records
  measurements; it does not certify compliance.

## Security & Safety Notes

- Never invent a hex code, a font name, a licence or a measured ratio. `Unknown` until
  supplied or measured.
- Never record a ratio the skill did not calculate, and never round a failing ratio up to
  a passing one.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes an internal design system or an unreleased product's palette, note
  that the pasted content stays in the conversation and should be removed if it is
  confidential.
- Typeface and stock-image licences are the user's responsibility to verify. Flag it, do
  not assume it.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the theme exists as a Figma file with no values written down.
  **Solution:** that is a mockup, not a theme. Every value becomes a row first.
- **Problem:** a colour pair fails contrast and was quietly replaced with a near-miss.
  **Solution:** record the failing pair as `Fail - do not ship`. The failure is the finding.
- **Problem:** text over a photograph looks fine in the design and is unreadable in
  production.
  **Solution:** a scrim token with its own measured ratio, or a solid plate behind the text.
- **Problem:** six months later there are five blues.
  **Solution:** `Status` = `Deprecated` and a new row. Never edit an approved value in
  place - bump the version.
- **Problem:** dark mode was made by inverting the light palette.
  **Solution:** author each dark value and measure each pair again.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @brand-growth-system-builder - routes to this skill and the other 12 brand and growth modules.
- @logo-image-design - the mark and the image library that sit on top of these tokens.
- @brand-kit-print-collateral - letterhead, cards and folders rendered from the same tokens.
- @presentation-deck - slide layouts constrained to the type scale and colour roles.
- @business-email-template - email needs its own type scale; web tokens do not survive
  every mail client.
- @free-design-resources - the open systems, token formats and contrast checkers used here.
- @social-media-setup - per-platform safe areas and the platform's own colour constraints.
- `website-setup` (if present) / `business-website-setup` - where these tokens get built.

## Reusable Prompt

```
I want a design theme for my business - brand colours, a type scale, spacing and
light/dark variants, with contrast measured properly.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a hex code, a font or a ratio. Then recommend the smallest token set that
fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
