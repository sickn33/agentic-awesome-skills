---
name: business-email-template
description: 'Business email template register: trigger, sender and recipient type, subject pattern, body structure, personalisation tokens and send checks. Use for repeatable outbound email.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, email, templates, spf, dkim, dmarc, deliverability, spam, accessibility, plain-text, mjml, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Business Email Templates

**What it is:** the repeatable emails a business actually sends - enquiry reply, quote, invoice, payment reminder, onboarding, complaint, review request, newsletter - with the sendable copy, the authentication records and the accessibility and spam checks each one needs.

## Overview

Works out the smallest useful template set for the business in front of it, then builds it
only when asked. The default output is a short recommendation, not a set of email files.
The template register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request,
from one field list so the four cannot drift apart.

Layer: Layer 6: Engage. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a template is not the HTML. A template is the
envelope - who it is from, who it is to, what triggers it, what subject pattern it uses, and
whether the domain is allowed to send it - plus the body. `Sender Role` and `Trigger`
exist because most "our email looks unprofessional" complaints are a missing trigger and a
missing signature, not a missing design. And every template needs a plain-text version,
which is a separate field here rather than an afterthought inside the HTML.

## When to Use This Skill

- email templates, email signatures blocks for body copy, cold outreach
- enquiry reply, quotation, invoice email, payment reminder
- welcome email, onboarding, delivery notification
- complaint response, review request, newsletter, offer
- "our emails go to spam", SPF, DKIM, DMARC, deliverability
- email tone and structure standards
- "make our emails look professional"

Do not use it for: the printed signature block on letterhead and cards
(`brand-kit-print-collateral`), the mailbox and account register
(`company-email-accounts` in the operational pack), or marketing campaign automation.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "build" / "we need" -> artifacts wanted; go to Step 2.
- "ours look bad" / "fix" -> something exists; capture what is sent today, then Step 2.
- "they go to spam" / "review" / "audit" -> a deliverability check, not a build.
- "how do I write ..." -> advice question; answer directly, offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the template list.

- **Volume** - How many emails a day, and who reads them - one person or a team? / Are
  they sent from a Gmail/Outlook account, a proper domain mailbox, or a platform?
- **Categories** - Which of enquiry, quote, invoice, reminder, welcome, complaint, review
  request, newsletter actually happen? / Which are sent today, in any form?
- **Authentication** - Does the business send from its own domain? / Have SPF, DKIM and
  DMARC been set up? / Is anything sent through a third-party tool?
- **Constraints** - Any legal or regulatory wording that must appear - unsubscribe,
  sender identity, VAT or GST particulars, a claims address? / Any language the business
  must not use?
- **Tone** - Formal or plain-spoken? / Who signs, by title or by name? / Any sector that
  has a required service standard?

Never invent an answer. Domain names, SPF records, DKIM selectors, unsubscribe periods,
legal wording, senders, volumes and metrics the user has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: business-email-template
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Volume": null
  "Categories": null
  "Authentication": null
  "Constraints": null
  "Tone": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with the four that are sent every week and carry the most
risk - enquiry reply, quote, invoice with payment terms, and payment reminder - plus one
plain-text alternative for each. Put the signature block in a single place so it is edited
once. Confirm SPF, DKIM and DMARC before anything is sent from the domain, because no
template quality survives an unauthenticated domain.

**Why this one:** Those four are where money and reputation move. The enquiry reply wins
the customer, the quote and the invoice set the commercial terms, and the reminder is the
one that recovers cash. A newsletter is a marketing decision that needs consent and a list,
so it is not in the first set.

**Workflow:** Categories confirmed from what is actually sent → Shared structure agreed
(subject, greeting, body, action, signature) → Four templates drafted → Plain-text
alternative written for each → SPF, DKIM and DMARC confirmed → Tested in a real client →
Spam score checked → Accessibility pass on contrast and text size → Register approved and
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
Template ID,Template Name,Template Type,Trigger,Sender Role,Recipient Type,Subject Line Pattern,Preview Text,Body Structure,Tone,Call To Action,Required Fields,Personalisation Tokens,Signature Block,Unsubscribe Required,Spam Risk Notes,Test Status,Mobile Checked,Accessibility Checked,Version,Status,Notes
,Example Retail enquiry reply,Transactional,Website form or phone enquiry received,Sales or front desk,Prospective customer,{Service} enquiry - {Business Name},{Service} enquiry received today,Thanks - confirmation - what happens next - one clear action - signature,Plain and direct,Reply with two times or call the desk,{First Name}, {Service}, {Business Name},Yes - signature block only,"All-caps subject, unsubstituted tokens, low text-to-image ratio",Not tested,Not checked,Not checked,1.0,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE email_template (
  template_id BIGINT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL,
  trigger TEXT NOT NULL,
  sender_role VARCHAR(100) NOT NULL,
  recipient_type VARCHAR(100) NOT NULL,
  subject_line_pattern VARCHAR(255) NOT NULL,
  preview_text VARCHAR(255),
  body_structure TEXT,
  tone VARCHAR(100) NOT NULL,
  call_to_action TEXT,
  required_fields TEXT,
  personalisation_tokens TEXT,
  signature_block VARCHAR(100) NOT NULL,
  unsubscribe_required BOOLEAN NOT NULL,
  spam_risk_notes TEXT,
  test_status VARCHAR(100) NOT NULL,
  mobile_checked BOOLEAN NOT NULL,
  accessibility_checked BOOLEAN NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT email_template_type CHECK (template_type IN ('Transactional','Marketing','Notification','Personal','System')),
  CONSTRAINT email_template_test_status CHECK (test_status IN ('Not tested','Tested - internal','Tested - real client','Tested - seed list','Failed - see Notes'))
);

CREATE INDEX idx_email_template_status ON email_template (status);
CREATE INDEX idx_email_template_type ON email_template (template_type);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Business Email Templates",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Template ID": { "type": "integer" },
      "Template Name": { "type": "string" },
      "Template Type": { "type": "string" },
      "Trigger": { "type": "string" },
      "Sender Role": { "type": "string" },
      "Recipient Type": { "type": "string" },
      "Subject Line Pattern": { "type": "string" },
      "Preview Text": { "type": "string" },
      "Body Structure": { "type": "string" },
      "Tone": { "type": "string" },
      "Call To Action": { "type": "string" },
      "Required Fields": { "type": "string" },
      "Personalisation Tokens": { "type": "string" },
      "Signature Block": { "type": "string" },
      "Unsubscribe Required": { "type": "boolean" },
      "Spam Risk Notes": { "type": "string" },
      "Test Status": { "type": "string" },
      "Mobile Checked": { "type": "boolean" },
      "Accessibility Checked": { "type": "boolean" },
      "Version": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Template Name",
      "Template Type",
      "Trigger",
      "Sender Role",
      "Recipient Type",
      "Subject Line Pattern",
      "Tone",
      "Signature Block",
      "Unsubscribe Required",
      "Test Status",
      "Mobile Checked",
      "Accessibility Checked",
      "Version",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Template ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Template Name | Title | Use as the database title |
| Template Type | Select (add options after import) | Convert to Select, add options: "Transactional", "Marketing", "Notification", "Personal", "System" |
| Trigger | Text | Leave as Text. The event that causes the send. A template with no trigger is a template nobody sends |
| Sender Role | Select (add options after import) | Convert to Select, add options: "Sales", "Front Desk", "Accounts", "Support", "Owner", "Marketing", "System" |
| Recipient Type | Select (add options after import) | Convert to Select, add options: "Prospective Customer", "Existing Customer", "Prospect", "Supplier", "Employee", "Regulator", "Public" |
| Subject Line Pattern | Text | Leave as Text. Use braces for the variable part, e.g. "{Service} enquiry - {Business Name}" |
| Preview Text | Text | Leave as Text. The line after the subject in the inbox. Never repeat the subject |
| Body Structure | Text | Leave as Text. Five lines, in order |
| Tone | Select (add options after import) | Convert to Select, add options: "Plain and direct", "Formal", "Warm", "Technical", "Apologetic" |
| Call To Action | Text | Leave as Text. One action per email |
| Required Fields | Text | Leave as Text. What the sender must fill in |
| Personalisation Tokens | Text | Leave as Text. The token names only, in braces. An unsubstituted token is a spam trigger |
| Signature Block | Select (add options after import) | Convert to Select, add options: "Yes - signature block only", "Yes - signature block and contact details", "No" |
| Unsubscribe Required | Checkbox | Convert to Checkbox. Marketing always; transactional usually not |
| Spam Risk Notes | Text | Leave as Text |
| Test Status | Select (add options after import) | Convert to Select, add options: "Not tested", "Tested - internal", "Tested - real client", "Tested - seed list", "Failed - see Notes" |
| Mobile Checked | Checkbox | Convert to Checkbox. Most email is read on a phone first |
| Accessibility Checked | Checkbox | Convert to Checkbox. Contrast, text size, and a text-only alternative |
| Version | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In review", "Approved", "Retired" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Unsubscribe Required` and the two checkboxes
are booleans - no `Yes`/`No` strings in a boolean cell.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Template ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Template Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Retail enquiry reply` |
| 3 | Template Type | `select` | `VARCHAR(100)` | `string` | Select | `Transactional` |
| 4 | Trigger | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 5 | Sender Role | `select` | `VARCHAR(100)` | `string` | Select | `Sales or front desk` |
| 6 | Recipient Type | `select` | `VARCHAR(100)` | `string` | Select | `Prospective customer` |
| 7 | Subject Line Pattern | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 8 | Preview Text | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 9 | Body Structure | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 10 | Tone | `select` | `VARCHAR(100)` | `string` | Select | `Plain and direct` |
| 11 | Call To Action | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 12 | Required Fields | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 13 | Personalisation Tokens | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 14 | Signature Block | `select` | `VARCHAR(100)` | `string` | Select | `Yes - signature block only` |
| 15 | Unsubscribe Required | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 16 | Spam Risk Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 17 | Test Status | `select` | `VARCHAR(100)` | `string` | Select | `Not tested` |
| 18 | Mobile Checked | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `false` |
| 19 | Accessibility Checked | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `false` |
| 20 | Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 21 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 22 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Template Type** - the four that matter legally and technically. Marketing and
transactional are separated because they have different consent and unsubscribe rules.

```
Transactional | Marketing | Notification | Personal | System
```

**Sender Role** - a starting set. The role is what stops three people writing the same
email three different ways.

```
Sales | Front Desk | Accounts | Support | Owner | Marketing | System
```

**Recipient Type** - a starting set.

```
Prospective Customer | Existing Customer | Prospect | Supplier | Employee | Regulator | Public
```

**Tone** - a starting set. Tone is a decision the business makes once, not per sender.

```
Plain and direct | Formal | Warm | Technical | Apologetic
```

**Signature Block** - three values, because "no signature" is a legitimate choice for a
system email and a wrong one for anything a human reads.

```
Yes - signature block only | Yes - signature block and contact details | No
```

**Test Status** - `Tested - real client` is the only status that means proven. Sending a
first campaign to real customers is not a test.

```
Not tested | Tested - internal | Tested - real client | Tested - seed list | Failed - see Notes
```

**Status**

```
Draft | In review | Approved | Retired
```

## Relations

None standalone. `Sender Role` names the role that appears in the signature block; where
the business keeps a people register with roles, confirm that database exists in the same
build before treating it as a relation. Otherwise it is Text with a note naming the
intended target.

## Examples

**Prompt**

```
Our quotes go out as freeform email from a Gmail address, everyone signs differently, and
last month our invoice emails started going to spam.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods in Example City.
>
> **Q:** Do you send from your own domain address, or a Gmail or similar account?
> **A:** Two Gmail addresses and one on the domain, but nobody knows which.
>
> **Q:** Have SPF, DKIM and DMARC been set up for the domain?
> **A:** No idea. We only have the website.
>
> **Q:** Which emails actually go out every week - enquiry reply, quote, invoice, reminder?
> **A:** Enquiry, quote and invoice. We chase invoices by phone.
>
> **Q:** Any wording that has to appear - company registration, tax details, an address for
> complaints?
> **A:** The tax details are on the invoice already.

**Recommended next step** - offered, not built:

> Three templates - enquiry reply, quote, invoice with payment terms - plus a phone-logged
> payment reminder template, each with a plain-text alternative. One shared five-part
> structure and one signature block, edited in a single place. And before any of them go
> out: SPF, DKIM and DMARC on the domain, because an unauthenticated domain sends straight
> to spam whatever the template looks like.
>
> Workflow: Categories confirmed from what is actually sent → Shared structure agreed →
> Templates drafted → Plain-text alternative written for each → SPF, DKIM and DMARC
> confirmed → Tested in a real client → Spam score checked → Accessibility pass → Register
> approved
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Write a plain-text alternative for every template. It is what gets read when HTML is
  blocked, it is what the spam filter weighs, and it is a legal expectation in some
  jurisdictions.
- The subject pattern is the single highest-leverage line. Put the service or the reference
  number in it, keep it under about 60 characters, and never use all caps or repeated
  punctuation.
- Preview text must not repeat the subject. It is a second chance at the same words.
- One action per email. Two calls to action means neither happens.
- Personalise at the top, not throughout. Three substituted tokens is polite; twelve is a
  spam filter trigger.
- Keep the plain and the branded version in the same register row, not as two templates.
  They are the same email.
- Confirm SPF, DKIM and DMARC before sending from the domain, on day one. Check the live
  record with Google's Admin Toolbox and MXToolbox rather than trusting the setup screen.
- Check the spam score on a real draft. Mail Tester is free and names the exact trigger.
- Check on a phone first. Most business email is read on a phone before a desktop.
- Keep the signature block in one place, centrally managed, so a role change is a one-line
  edit rather than 400 stale signatures in inboxes.
- Put the full postal address in the signature or the footer, and keep it readable in
  plain text. Unsubscribe, where it applies, must be a working link and not a tiny grey one.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real template.

## Limitations

- This is a register of templates and their envelope. It does not contain the HTML, and it
  cannot render or send a message.
- It cannot set up SPF, DKIM or DMARC. Those are DNS records on the domain, and this skill
  records that they must exist; it does not create them.
- Deliverability depends on the sending domain's reputation, the sending IP, the list
  quality and the receiving provider. A perfect template on a domain with a bad reputation
  still lands in spam.
- It does not measure a spam score, and it does not run a client render test. Both are
  named in `Test Status` and left for the business to do.
- "Do not use" wording, sector tone requirements and regulatory language are jurisdiction
  specific. This skill asks what applies and never supplies legal text.
- Marketing email additionally needs a lawful basis for the list, a consent record, an
  unsubscribe and a preference centre. None of that is modelled here.
- Accessibility in email is genuinely hard: images may be blocked, colour may be lost, and
  screen reader behaviour varies by client. This table records that a check was done; it
  does not certify conformance.
- Bounce and complaint handling, list hygiene and sunset policy are out of scope.
- Dark mode in email clients is inconsistent and cannot be reliably themed.

## Security & Safety Notes

- Never invent a domain, a DNS record, a DKIM selector, a legal disclaimer, a tax
  registration number or a sender identity. `Unknown` and blank are correct.
- Authentication records are security configuration. Do not publish SPF, DKIM or DMARC
  values into a shared document; they are not secrets, but they are configuration that
  should be changed by the domain owner and verified after the change.
- Never paste a real customer list, a real address book or a live newsletter export into
  this table. A recipient list is personal data.
- Do not paste real email bodies containing customer personal data. Generate the template
  with placeholder tokens.
- Marketing consent and unsubscribe are legal obligations, not preferences. Flag them, and
  refer the lawful basis to the business's data-protection position.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- Phishing awareness: if the business reports suspicious email, that is a security
  incident, not a template question. Route it to the security owner.

## Common Pitfalls

See the [bundled common-pitfalls reference](references/common-pitfalls.md) for review and troubleshooting guidance.

## Related Skills

- `brand-growth-system-builder` - routes to this skill and the other 12 brand and growth modules.
- `brand-kit-print-collateral` - the printed signature block on letterhead and cards; the
  email signature must match it.
- @design-theme-guide - the colour and type tokens; email needs its own type scale because
  web tokens do not survive every mail client.
- @social-media-setup - message discipline is shared; the platforms are not.
- `invoices-billing` (operational pack) - the invoice data this template sends.
- `company-email-accounts` (operational pack) - the mailbox register behind the senders.
- `data-privacy-controls` (operational pack) - the lawful basis for any recipient list.
- @free-design-resources - Litmus, Mail Tester, MXToolbox, MJML and the rest.

## Reusable Prompt

```
I want a set of business email templates - enquiry reply, quote, invoice, reminder - with
a consistent structure and signature, and we also have deliverability problems.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a domain, a DNS record or legal wording. Then recommend the smallest template
set that fits, and confirm authentication before anything is sent. Wait for me to ask
before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
