---
name: presentation-deck
description: 'Build an evidence-linked slide register after context-first intake. Use when an SME needs a presentation deck, speaker notes, or a structured business story.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, presentation, deck, pitch, slides, storytelling, speaker-notes, data-source, brand-kit, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Presentation Deck

**What it is:** the content of a business presentation - what each slide says, why it is
there, what evidence backs it and what the speaker says while it is on screen.

## Overview

Works out the smallest useful deck for the business in front of it, then builds it only
when asked. The default output is a short recommendation, not a slide register. The slide
register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request, from one
field list so the four cannot drift apart.

Layer: Layer 6: Engage. Fits: Growth stage. Table code: n/a.

**The rule this table exists to enforce:** a slide has one job, and the register names that
job. `Key Message` is a sentence a listener could repeat afterwards, and `Bullets` is at
most three supporting points - a slide with six bullets and no key message is a document
being read out. `Data Source` is required for every slide carrying a number, because a
figure with no source is the single most common way a business loses a room.

**The second rule:** the deck is a derivative of everything else in this pack. The brand
tokens are in `design-theme-guide`, the proof in `gbp-local-seo-intent`, the offer in
`business-website-setup`. A deck built before those exist is a deck of opinions.

## When to Use This Skill

- presentation, deck, slides, pitch, pitch deck
- "we have to present to a bank", "investor deck", "client pitch"
- what should our slides say, story structure, narrative
- sales deck, proposal deck, board update, team briefing
- speaker notes, timing, rehearsal
- turning a report into a presentation

Do not use it for: the printed leave-behind (`brand-kit-print-collateral`), a written
proposal document, a website page, or the brand identity itself
(`design-theme-guide`, `logo-image-design`).

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "make" / "build" / "we have to present" -> artifacts wanted; go to Step 2.
- "review" / "check" / "does this work" -> a check, not a build.
- "help me structure" / "what should I say" -> a decision question; answer, then offer the
  build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** Who is this presentation for, and what do you want them to decide or do
> afterwards?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the slide list.

- **Audience** - Who is in the room - customers, a bank, investors, a board, a partner,
  the team? / What do they already believe about the business? / How many people, and how
  long is the slot?
- **Ask** - What exactly must happen after the presentation - a decision, a signature, a
  payment, an introduction, an internal approval? / What is the one sentence that, if they
  remember nothing else, should they remember?
- **Evidence** - What can be shown - revenue, customers, reviews, photos, a process, a
  team, a track record? / Is any of it confidential? / Where does each number come from?
- **Constraints** - Any template, brand tokens or house format to follow? / Any content
  that must not appear? / Is the presenter comfortable with the numbers, or should those
  be in an appendix?
- **Setup** - Who presents, and is there a second presenter? / Will it be in person, on a
  call, or recorded? / How much rehearsal time is there?

Never invent an answer. Figures, revenue, growth rates, customer names, dates, market
sizes and outcomes the user has not supplied are `Unknown`. A business case with invented
projections is worse than no deck.

### Step 3 - Hold the internal context

```yaml
module: presentation-deck
intent: null            # set up | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Audience": null
  "Ask": null
  "Evidence": null
  "Constraints": null
  "Setup": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Ten slides, one job each, and one slide per answer to the
audience's real question rather than one per topic. The opening earns attention with
something true about the customer, the middle is evidence, and the last two are the ask
and the next step. Anything that would only matter to someone who already agrees goes in an
appendix. Numbers carry a source on the slide.

**Why this one:** Ten slides is what a 15-minute slot actually holds, and a deck that runs
over loses the ask at the end - which is the only part anyone acted on. The reason a
founder's 40-slide deck fails is not length, it is that no single slide changes what the
listener believes.

**Workflow:** Audience and the ask agreed → Ten jobs listed, one per slide → Evidence
mapped to each job → Numbers sourced or removed → Speaker notes written as spoken
sentences → Tokens and layouts applied → Rehearsed to time → Appendix built → One page of
"if they ask about X" prepared for the five hardest questions

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
Slide ID,Slide Number,Section,Slide Title,Key Message,Bullets,Visual,Speaker Notes,Data Source,Duration Minutes,Sensitivity,Audience,Template Layout,Brand Token Applied,Version,Status,Owner,Notes
,1,Open,We started from one customer complaint,"Three customers asked the same thing in one month, and we built the service for it","The same request, three times; What we built; Who it is for",One photograph of the real premises,"This is the only slide that needs to be remembered if the rest is forgotten. Say it in a sentence, then stop talking.",Not applicable,1.5,Public,Bank and prospective partner,Title and single image,color.brand.primary on color.surface.page,1.0,Draft,Unknown,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE deck_slide (
  slide_id BIGINT PRIMARY KEY,
  slide_number INTEGER NOT NULL,
  section VARCHAR(100) NOT NULL,
  slide_title VARCHAR(255) NOT NULL,
  key_message TEXT NOT NULL,
  bullets TEXT,
  visual VARCHAR(255) NOT NULL,
  speaker_notes TEXT,
  data_source VARCHAR(255) NOT NULL,
  duration_minutes NUMERIC(4,1),
  sensitivity VARCHAR(50) NOT NULL,
  audience VARCHAR(100) NOT NULL,
  template_layout VARCHAR(100) NOT NULL,
  brand_token_applied VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  owner VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT deck_slide_number_positive CHECK (slide_number > 0),
  CONSTRAINT deck_slide_duration_non_negative CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

CREATE INDEX idx_deck_slide_status ON deck_slide (status);
CREATE INDEX idx_deck_slide_section ON deck_slide (section);
CREATE UNIQUE INDEX idx_deck_slide_number_version ON deck_slide (slide_number, version);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Presentation Deck",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Slide ID": { "type": "integer" },
      "Slide Number": { "type": "integer" },
      "Section": { "type": "string" },
      "Slide Title": { "type": "string" },
      "Key Message": { "type": "string" },
      "Bullets": { "type": "string" },
      "Visual": { "type": "string" },
      "Speaker Notes": { "type": "string" },
      "Data Source": { "type": "string" },
      "Duration Minutes": { "type": "number" },
      "Sensitivity": { "type": "string" },
      "Audience": { "type": "string" },
      "Template Layout": { "type": "string" },
      "Brand Token Applied": { "type": "string" },
      "Version": { "type": "string" },
      "Status": { "type": "string" },
      "Owner": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Slide Number",
      "Section",
      "Slide Title",
      "Key Message",
      "Visual",
      "Data Source",
      "Sensitivity",
      "Audience",
      "Template Layout",
      "Brand Token Applied",
      "Version",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Slide ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Slide Number | Number | Convert to Number, digits only. Unique per version, not across the deck |
| Section | Select (add options after import) | Convert to Select, add options: "Open", "Problem", "Solution", "Evidence", "Business", "Ask", "Next Step", "Appendix" |
| Slide Title | Text | Leave as Text. The claim the slide makes, not a label like "Overview" |
| Key Message | Text | Leave as Text. One sentence. If the listener repeats only this, the slide worked |
| Bullets | Text | Leave as Text. At most three. Semicolon-separated. Four is too many |
| Visual | Select (add options after import) | Convert to Select, add options: "Photograph", "Chart", "Table", "Diagram", "Screenshot", "Single figure", "Quotation", "None" |
| Speaker Notes | Text | Leave as Text. Written as spoken sentences, not bullet fragments |
| Data Source | Text | Leave as Text. Required for any slide with a number. "Not applicable" is valid only where the slide carries no figure |
| Duration Minutes | Number | Convert to Number, one decimal place. The plan, not a measurement |
| Sensitivity | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Confidential" |
| Audience | Title | Use as the database title |
| Template Layout | Text | Leave as Text. The layout name from the template, so the build is repeatable |
| Brand Token Applied | Text | Leave as Text. The token names used on this slide, from the design theme |
| Version | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Outline", "Draft", "In review", "Approved", "Presented" |
| Owner | Text | Leave as Text. Who presents it and who builds it may be two people |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Data Source` reads `Not applicable` only on a
slide that genuinely carries no figure; on any slide with a number it must name where that
number came from.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Slide ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Slide Number | `number` | `INTEGER` | `integer` | Number | `1` |
| 3 | Section | `select` | `VARCHAR(100)` | `string` | Select | `Open` |
| 4 | Slide Title | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 5 | Key Message | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 6 | Bullets | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 7 | Visual | `select` | `VARCHAR(255)` | `string` | Select | `Photograph` |
| 8 | Speaker Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 9 | Data Source | `text` | `VARCHAR(255)` | `string` | Text | `Not applicable` |
| 10 | Duration Minutes | `number` | `NUMERIC(4,1)` | `number` | Number | `1.5` |
| 11 | Sensitivity | `select` | `VARCHAR(50)` | `string` | Select | `Public` |
| 12 | Audience | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 13 | Template Layout | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 14 | Brand Token Applied | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 15 | Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 16 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 17 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 18 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Section** - the eight sections a ten-slide business deck divides into. `Ask` is not
optional: if the deck has no ask slide, the presentation had no purpose.

```
Open | Problem | Solution | Evidence | Business | Ask | Next Step | Appendix
```

**Visual** - one per slide, and `None` is allowed only for a title or a section break. A
chart that says nothing is decoration; delete it.

```
Photograph | Chart | Table | Diagram | Screenshot | Single figure | Quotation | None
```

**Sensitivity** - `Confidential` slides must not go into a version that is emailed to
everyone, and a redacted public version is a different version, not the same one with a
slide hidden.

```
Public | Internal | Confidential
```

**Status** - `Presented` closes the loop, so the register shows what was actually shown
and when.

```
Outline | Draft | In review | Approved | Presented
```

## Relations

None standalone. `Brand Token Applied` names tokens from `design-theme-guide`; confirm
whether the business wants that joined. `Data Source` may name a table in
`seo-directory-backlinks` or a metric in an analytics tool - a text reference unless the
business confirms a live join.

## The ten-slide structure

The recommended shape. Adapt it, but keep the order of the ask and the next step.

| # | Section | The job | What earns it |
|---:|---|---|---|
| 1 | Open | Earn attention with something true | A real customer, a real problem, a real photograph. Not a logo animation |
| 2 | Problem | State the problem in the audience's words | The problem they have already told the business about, in their phrasing |
| 3 | Solution | What the business does about it, in one sentence | Plain language, no jargon, no product names nobody outside knows |
| 4 | Solution | How it works | A diagram or three steps. The most-underused slide in most decks |
| 5 | Evidence | It works - for a real customer | A photograph, a quotation, a result. Named only with permission |
| 6 | Evidence | It works at scale | The numbers, each with a source. Or "we are early" and say so |
| 7 | Business | How the business works | Prices, capacity, team, area covered, hours |
| 8 | Business | Why this business and not another | The differentiator, stated as a fact rather than a claim |
| 9 | Ask | What is being asked for, and by when | The specific thing - money, a decision, a trial, an introduction - and the date |
| 10 | Next Step | Exactly what happens next, and who does it | A name, an action, a date. The slide that makes the meeting worth having |

Appendix: anything a technically-minded listener may ask about, so it is available and
does not derail the ten.

## Examples

**Prompt**

```
Our bank wants a five-minute presentation on Monday. There is an existing 30-slide
template that has been used for other loans. We have no idea what to put in it.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who is this presentation for, and what do you want them to decide or do
> afterwards?
> **A:** Our bank manager. We want the loan approved.
>
> **Q:** How long is the slot, and how many slides does the template expect?
> **A:** Five minutes. The template has about 20 slides but we can cut.
>
> **Q:** What can you show - revenue, customers, photographs, a process?
> **A:** Two years of revenue, about 400 customers, and a lot of photos of the shop.
>
> **Q:** Is any of it confidential, and is there content that must not appear?
> **A:** The revenue is confidential. No supplier names.
>
> **Q:** Who is presenting, and how much rehearsal time is there?
> **A:** The founder, and we have Sunday.

**Recommended next step** - offered, not built:

> Ten slides on the existing template, not twenty. The first earns attention with the
> 400 customers and a photograph of the shop. Two slides of proof, with the revenue figure
> in the confidential version and removed from the public one. The ask on slide 9 with the
> amount and the date. Slide 10 names who does what by when. Everything a bank might
> interrogate - the accounts, the lease, the loan purpose - goes in the appendix, not the
> ten. Rehearse it Sunday against a timer.
>
> Workflow: Audience and the ask agreed → Ten jobs listed → Evidence mapped to each job →
> Numbers sourced or removed → Speaker notes written → Tokens and layouts applied →
> Rehearsed to time → Appendix built → Hardest questions prepared
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- One job per slide, and the job written as a sentence in `Key Message`. If two jobs
  cannot both fit in that sentence, it is two slides.
- Slides are not documents. Three bullets, and the detail is in the notes or the appendix.
- Every number has a source on the slide. A figure with no source costs credibility with any
  audience worth having.
- Never invent a projection, a market size or a growth rate. A deck with one made-up number
  in it is a deck that loses the room when that number is questioned.
- Write the speaker notes as sentences the presenter would actually say. Bullet fragments
  in the notes field are a script for reading a slide.
- Plan the timing. Ten slides in fifteen minutes means roughly 90 seconds a slide, and the
  ask and next step get a full minute each.
- Prepare the five hardest questions with written answers, and rehearse those, not the
  slides. The questions are where the decision is made.
- Rehearse standing up, out loud, against a timer, at least once. A deck read silently has
  never been rehearsed.
- Use real photographs of the real premises, team and work. It is the fastest way to look
  like a business that exists.
- Two typefaces, one display and one body, at the sizes the token file defines. Nothing on a
  slide should be smaller than the projector can read.
- Build the public and the confidential versions as two versions, and check what leaked
  into which before either is sent.
- Leave a printed leave-behind and a PDF, never the projector file. A deck is a tool for the
  meeting, not the record.
- After the meeting, write down what was asked. The next deck is usually a third of the work.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real slide.

## Limitations

- This is a content plan. It does not build slides, attach a template, or open a deck
  application.
- It has no access to the business's accounts, analytics, CRM or platform, so it cannot
  source a figure. `Data Source` records where a number came from when the business supplies
  it.
- It cannot build a financial projection. Projections require assumptions, a stated basis
  and a qualified person, and none of that can be invented.
- It cannot design the template. Layout names in `Template Layout` are the names in the
  business's existing template, read from it.
- Deck length depends on the slot, not on a rule. Ten is a recommendation for a 15-minute
  business meeting, not a standard.
- Design tools, animation, video and transitions are out of scope.
- The visual balance of a deck cannot be judged from a table. Someone has to look at the
  slides projected.
- Accessibility of a projected deck - colour contrast, minimum type size, a text version
  supplied, captions on any video - is a real obligation in some contexts and cannot be
  verified here.
- Regulatory or sector-specific content rules, and any investor or lending disclosure
  requirements, are jurisdiction specific. Ask what applies; never supply the wording.
- This skill cannot assess how well the presenter will deliver it. Rehearsal is not a
  content task.

## Security & Safety Notes

- Never invent a figure, a customer name, a date, a price, a market size, a projection or
  an outcome. `Unknown` and blank are correct.
- Never paste real financial statements, payroll figures, customer data or bank details
  into this table. A slide plan is not a safe place for them.
- `Sensitivity` is a control, not a label. A `Confidential` slide in a version emailed to
  everyone is a disclosure, and it cannot be undone.
- Customer photographs, names, quotations and logos used as evidence all need written
  permission. An unnamed customer in a photo is identifiable in a small business.
- Never present a financial projection as a fact, and never present a forecast as a
  commitment. Label it as a projection with its assumptions attached.
- Do not put credentials, account numbers, tax identifiers or internal security detail in
  speaker notes. Notes get shared and screens get photographed.
- If the deck contains anything about an employee's performance, pay or conduct, it is a
  confidential personnel matter and it belongs to `code-of-conduct` and a human reviewer,
  never in a pitch deck.
- If a slide touches a claim about a competitor, it must be factual and sourced. Defamation
  exposure is real and it is not worth a slide.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** a 30-slide template became a 28-slide presentation.
  **Solution:** ten jobs, one per slide, and everything else in the appendix. A 28-slide
  deck in a 5-minute slot is a document handed over.
- **Problem:** slide titles read "Overview", "Market", "Solution".
  **Solution:** the title is the claim. "Two years of 40% repeat bookings" beats
  "Business".
- **Problem:** a growth figure on slide 6 with no source.
  **Solution:** source it or remove it. One unsourced number discredits every other number
  in the deck.
- **Problem:** the presenter read the notes word for word.
  **Solution:** notes are what to say, not what to read. Bullets on the slide, sentences in
  the notes, memory in the presenter.
- **Problem:** the ask slide said "We would welcome your support".
  **Solution:** name the amount, the purpose, the date and the next step. A vague ask gets a
  vague answer.
- **Problem:** the confidential revenue slide went into the version emailed to everyone.
  **Solution:** two versions, built separately, and check both before sending.
- **Problem:** the presentation ran five minutes long and the ask was cut.
  **Solution:** plan the timing with the ask protected, and rehearse to a timer. The ask is
  the only part anyone acted on.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.


See the [Related Skills](references/related-skills.md) reference for the full guidance.

