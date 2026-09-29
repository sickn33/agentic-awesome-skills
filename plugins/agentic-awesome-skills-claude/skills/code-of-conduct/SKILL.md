---
name: code-of-conduct
description: 'Build a human-reviewed conduct register after context-first intake. Use when an SME needs policy acknowledgements, complaint handling, and breach follow-up.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, code-of-conduct, policy, ethics, workplace, grievance, disciplinary, acknowledgement, training, compliance, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Professional Code of Conduct

**What it is:** the professional conduct policy the business runs on, and the register that
records who has read it, who has been trained, what was reported, what was investigated,
and what was followed up.

## Overview

Works out the smallest useful conduct policy for the business in front of it, then builds
it only when asked. The default output is a short recommendation, not a policy document. The
acknowledgement and breach register - CSV, SQL DDL, JSON Schema, Notion mapping - is
produced on request, from one field list so the four cannot drift apart.

Layer: Layer 7: Protect. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a code of conduct is not a document, it is a
promise that people can be held to. That requires three separate things kept apart in the
register: that someone was **given** the policy, that they **understood** it, and that a
report is **investigated** and **followed up**. A ticked acknowledgement that only means a
PDF was opened is not a third of anything - it is nothing.

**The second rule, and the one that is not negotiable:** a person is never judged by this
skill. Investigation, findings, sanctions and sign-off are human decisions made under the
business's own procedure and applicable law. The register records that a step happened and
who did it. It never records a conclusion.

## When to Use This Skill

- code of conduct, workplace policy, ethics policy, values and behaviour
- professional standards, expected behaviour, acceptable use
- staff handbook section on conduct
- complaint, grievance, misconduct, breach, warning
- policy acknowledgement, training record, sign-off sheet
- "our staff are not professional", "customers complained about behaviour"
- contractor, supplier and partner conduct expectations

Do not use it for: the disciplinary process itself, which belongs to
`disciplinary-pip-tracker` in the operational pack; a formal legal drafting task; or
investigation, adjudication or any decision about a person.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "write" / "set up" / "we need" -> artifacts wanted; go to Step 2.
- "we have one" / "review" / "is this ok" -> a check, not a build.
- "someone complained" / "what do we do" -> an incident, not a policy question. Answer from
  the business's procedure, escalate to a human, and do not build anything.
- "a breach happened" / "handle" -> a case. This skill does not handle cases.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** How many people work in the business, and does it have any employees at all yet?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the policy.

- **People** - How many employees, and are there contractors, interns or agency staff? /
  Are any in a regulated profession? / Is anyone in a union or covered by a collective
  agreement?
- **Setting** - Office, site, retail floor, remote, or mixed? / Does anyone work with
  children, vulnerable adults, or handle money, medication or data?
- **Rules** - Any existing employee handbook, or HR provider? / Any sector code, licensing
  body or accreditation with its own conduct rules? / Any written disciplinary procedure
  already in place?
- **Law** - Which country are the employees in? / Has anyone advised on what employment law
  requires - notice, right to be accompanied, right to appeal?
- **Practical** - Who receives a complaint, and who is independent enough to investigate?
  / How is a breach recorded today, if at all? / Does the business want the policy to cover
  social media and personal conduct outside work?

Never invent an answer. Employee names, roles, jurisdictions, legal references, union
names, awarding bodies and disciplinary outcomes the user has not supplied are `Unknown`.
This skill never supplies legal text.

### Step 3 - Hold the internal context

```yaml
module: code-of-conduct
intent: null            # set up | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "People": null
  "Setting": null
  "Rules": null
  "Law": null
  "Practical": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** A two-page policy that a person can actually read: the standard
of behaviour in plain terms, what is not acceptable, what to do if they see or experience
it, who to contact, and what happens next. Issued at joining, acknowledged in writing,
reviewed annually, and a short induction session rather than a training module nobody
attends. Complaints go to a named person who is not the person complained about. Keep the
existing disciplinary procedure separate and cross-referenced.

**Why this one:** A short policy that is read and understood is worth more than a long one
that is signed on day one and forgotten. And it only works if the reporting line is real -
a policy that says "report to the manager" with no alternative when the manager is the
subject is not a policy, it is a dead end written into a document.

**Workflow:** Legal basis and existing rules checked → Policy drafted in plain language →
Reporting route and an independent contact named → Issued and acknowledged in writing →
Induction session run → Complaints procedure kept separate and cross-referenced → Register
maintained → Policy reviewed annually and on any change in law or size → Cases handled by a
human under the disciplinary procedure

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
Record ID,Person Reference,Role,Policy Version,Policy Type,Issued Date,Acknowledged Date,Understood,Questions Raised,Training Completed Date,Breach Category,Investigation Status,Action Taken,Follow Up Date,Reviewer,Status,Notes
,EMP-EXAMPLE-001,Example Role,1.0,Code of conduct,2026-09-27,2026-09-27,Yes,None recorded,2026-09-27,Not applicable,Not applicable,None,2026-10-27,Example Reviewer,Done,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE conduct_record (
  record_id BIGINT PRIMARY KEY,
  person_reference VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  policy_version VARCHAR(50) NOT NULL,
  policy_type VARCHAR(100) NOT NULL,
  issued_date DATE,
  acknowledged_date DATE,
  understood BOOLEAN,
  questions_raised TEXT,
  training_completed_date DATE,
  breach_category VARCHAR(100) NOT NULL,
  investigation_status VARCHAR(100) NOT NULL,
  action_taken VARCHAR(100) NOT NULL,
  follow_up_date DATE,
  reviewer VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT conduct_acknowledged_after_issued CHECK (acknowledged_date IS NULL OR issued_date IS NULL OR acknowledged_date >= issued_date),
  CONSTRAINT conduct_investigation_status CHECK (investigation_status IN ('Not applicable','Reported','Under review','Investigation in progress','Closed - no further action','Closed - escalated','Blocked')),
  CONSTRAINT conduct_action_taken CHECK (action_taken IN ('None','Verbal reminder','Written warning','Formal warning','Referred to disciplinary procedure','Retraining','Escalated to external body','Unknown')),
  CONSTRAINT conduct_status CHECK (status IN ('Not started','In progress','Blocked','Done','Cancelled'))
);

CREATE INDEX idx_conduct_record_status ON conduct_record (status);
CREATE INDEX idx_conduct_record_investigation ON conduct_record (investigation_status);
CREATE INDEX idx_conduct_record_follow_up ON conduct_record (follow_up_date);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Professional Code of Conduct",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Record ID": { "type": "integer" },
      "Person Reference": { "type": "string" },
      "Role": { "type": "string" },
      "Policy Version": { "type": "string" },
      "Policy Type": { "type": "string" },
      "Issued Date": { "type": "string", "format": "date" },
      "Acknowledged Date": { "type": "string", "format": "date" },
      "Understood": { "type": "boolean" },
      "Questions Raised": { "type": "string" },
      "Training Completed Date": { "type": "string", "format": "date" },
      "Breach Category": { "type": "string" },
      "Investigation Status": { "type": "string" },
      "Action Taken": { "type": "string" },
      "Follow Up Date": { "type": "string", "format": "date" },
      "Reviewer": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Person Reference",
      "Role",
      "Policy Version",
      "Policy Type",
      "Breach Category",
      "Investigation Status",
      "Action Taken",
      "Reviewer",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Record ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Person Reference | Text | Leave as Text. An employee reference, never a name. This table must be importable without exposing who people are |
| Role | Text | Leave as Text. The role as it appears in the policy's scope section |
| Policy Version | Text | Leave as Text. "1.0" - the version that person actually signed |
| Policy Type | Select (add options after import) | Convert to Select, add options: "Code of Conduct", "Acceptable Use", "Data Protection", "Information Security", "Health and Safety", "Anti-Bribery", "Conflicts of Interest", "Social Media", "Grievance Procedure", "Whistleblowing", "Safeguarding" |
| Issued Date | Date | Convert to Date. When the person was given it |
| Acknowledged Date | Date | Convert to Date. When it came back signed |
| Understood | Checkbox | Convert to Checkbox. Confirmed in a conversation, not inferred from a signature |
| Questions Raised | Text | Leave as Text. What they asked, and the answer. "None recorded" is a valid entry |
| Training Completed Date | Date | Convert to Date. The induction session, not the signature |
| Breach Category | Select (add options after import) | Convert to Select, add options: "Not applicable", "Behaviour towards colleagues", "Behaviour towards customers", "Harassment or bullying", "Discrimination", "Confidentiality breach", "Data protection breach", "Information security breach", "Conflict of interest", "Bribery or fraud", "Health and safety breach", "Substance misuse", "Social media misuse", "Other - state in Notes" |
| Investigation Status | Select (add options after import) | Convert to Select, add options: "Not applicable", "Reported", "Under review", "Investigation in progress", "Closed - no further action", "Closed - escalated", "Blocked" |
| Action Taken | Select (add options after import) | Convert to Select, add options: "None", "Verbal reminder", "Written warning", "Formal warning", "Referred to disciplinary procedure", "Retraining", "Escalated to external body", "Unknown" |
| Follow Up Date | Date | Convert to Date. The next review. Required for any row that is not closed |
| Reviewer | Text | Leave as Text. A named person, not a department. This skill never fills it in |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Title | Use as the database title |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. A person is referenced by employee number, never
by name, so the register can be shared with a reviewer or an auditor without exposing
anyone.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Record ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Person Reference | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 3 | Role | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 4 | Policy Version | `text` | `VARCHAR(50)` | `string` | Text | `1.0` |
| 5 | Policy Type | `select` | `VARCHAR(100)` | `string` | Select | `Code of conduct` |
| 6 | Issued Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 7 | Acknowledged Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 8 | Understood | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 9 | Questions Raised | `long_text` | `TEXT` | `string` | Text | `None recorded` |
| 10 | Training Completed Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 11 | Breach Category | `select` | `VARCHAR(100)` | `string` | Select | `Not applicable` |
| 12 | Investigation Status | `select` | `VARCHAR(100)` | `string` | Select | `Not applicable` |
| 13 | Action Taken | `select` | `VARCHAR(100)` | `string` | Select | `None` |
| 14 | Follow Up Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 15 | Reviewer | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 16 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Done` |
| 17 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Policy Type** - a starting set. Each is a separate document with a separate owner and a
separate legal basis, and a code of conduct that absorbs all of them becomes a document
nobody can apply.

```
Code of Conduct | Acceptable Use | Data Protection | Information Security | Health and Safety | Anti-Bribery | Conflicts of Interest | Social Media | Grievance Procedure | Whistleblowing | Safeguarding
```

**Breach Category** - a starting set, and deliberately a *category* and not a finding. The
register records what kind of thing was reported, never whether it happened. `Not
applicable` is the correct value on every acknowledgement row.

```
Not applicable | Behaviour towards colleagues | Behaviour towards customers | Harassment or bullying | Discrimination | Confidentiality breach | Data protection breach | Information security breach | Conflict of interest | Bribery or fraud | Health and safety breach | Substance misuse | Social media misuse | Other - state in Notes
```

**Investigation Status** - the progress of the human process. Note that every value here is
a *state of the process*, not a conclusion about a person. There is deliberately no value
that means "guilty" or "not guilty"; that is not this table's decision to record.

```
Not applicable | Reported | Under review | Investigation in progress | Closed - no further action | Closed - escalated | Blocked
```

**Action Taken** - a starting set of *categories*, and note that `Referred to disciplinary
procedure` means the decision was handed to another process, not that it happened. This
skill does not impose sanctions.

```
None | Verbal reminder | Written warning | Formal warning | Referred to disciplinary procedure | Retraining | Escalated to external body | Unknown
```

**Status** - the register's own state, and `Blocked` is the honest value whenever the
decision is sitting with a person who has not made it.

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Two natural links, both worth confirming before making them live:

- `Person Reference` and `Role` point at the `people-directory` in the operational pack.
  That database is not in this artifact set, so both stay Text here with a note naming the
  intended target.
- `Action Taken` = `Referred to disciplinary procedure` is the hand-off to
  `disciplinary-pip-tracker` in the operational pack. That is a hand-off between documents,
  not a foreign key.

## Examples

**Prompt**

```
We have four staff now. We have never had a written code of conduct. Last month a
customer complained that one of the team was rude to her, the founder apologised, and
nothing was recorded anywhere.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many people work in the business, and does it have any employees at all yet?
> **A:** Four, all on the payroll. No contractors.
>
> **Q:** Is there anyone in a regulated profession, or a sector code the business must
> follow?
> **A:** No, we are a retailer.
>
> **Q:** Is there an existing employee handbook or HR provider?
> **A:** No handbook. We use an accountant.
>
> **Q:** Which country are the employees in?
> **A:** Example Country.
>
> **Q:** Who would receive a complaint, and who could investigate it if the complaint were
> about that person?
> **A:** The founder. Which is the problem, really.

**Recommended next step** - offered, not built:

> A two-page policy, in plain words, that a person can read in five minutes: the standard,
> what is not acceptable, what to do, and who to contact. And a reporting route that does
> not dead-end at the founder - either a named person outside the business, or an external
> HR adviser the accountant can introduce. Issued at joining, acknowledged in writing,
> covered in a short induction, reviewed annually. The complaint you had last month goes
> into the register as a case and is handled by a person under the disciplinary procedure,
> not by this.
>
> Workflow: Legal basis and existing rules checked → Policy drafted in plain language →
> Reporting route and an independent contact named → Issued and acknowledged in writing →
> Induction session run → Complaints procedure kept separate → Register maintained →
> Policy reviewed annually
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep the policy short enough to be read. Two pages, plain language, no legal phrasing. A
  long code of conduct is signed once and never opened again.
- Separate the documents. Code of conduct, acceptable use, data protection, health and
  safety and the grievance procedure are five documents with five owners and five legal
  bases. Folding them into one means none of them is applied.
- The reporting route must survive its own test: if the complaint is about the named contact,
  where does it go? Write that down before you need it.
- Acknowledge in writing, and record the version. An acknowledgement without a version is
  not evidence of which policy was accepted.
- `Understood` is a conversation, not a signature. Ask the person to describe the standard
  in their own words and record that it happened. That is the only thing that makes the
  register worth anything.
- Run a short induction rather than a module. Fifteen minutes with the policy in front of
  them, at joining, and a date in the register.
- Review the policy annually, and on any change in headcount, sector, or law.
- Record complaints even when nothing is done, especially when nothing is done. "Closed -
  no further action" is a legitimate and important outcome, and it is only legible if it
  was written down at the time.
- `Follow Up Date` on every open case. An investigation with no follow-up date is an
  investigation that was quietly forgotten.
- Never use this table to decide anything about a person. It records process, and process
  is the part that is auditable.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real person.

## Limitations

- This skill does not draft legal text and does not supply any. Employment law, disciplinary
  law, works councils, health and safety duties, safeguarding and anti-bribery obligations
  all vary by jurisdiction, change frequently, and must be confirmed with a qualified
  adviser in the country the business operates in.
- It does not investigate anything, establish what happened, or decide whether a breach
  occurred. Those are human decisions made under the business's own procedure.
- It does not impose a sanction, and it cannot record a finding of guilt or innocence. There
  is deliberately no value in the register for either.
- It does not run the grievance or disciplinary process. That belongs to
  `disciplinary-pip-tracker` and `issue-grievance-tracker` in the operational pack.
- It cannot advise on what to do about a live complaint. A live complaint needs a person, a
  procedure and a timescale, and it needs them now.
- It does not send, chase or escalate anything. No reminders, no email, no notification.
- Records of a disciplinary matter are subject to retention rules and access restriction
  requirements that vary. This table does not model retention or access control; treat
  anything in it as confidential personnel data.
- It cannot assess whether a policy is adequate for a particular sector, a particular
  regulator or a particular country.
- Whistleblowing law in many jurisdictions protects a reporter from dismissal and requires
  a confidential route with an independent recipient. A policy without one is a real
  exposure, and this skill flags that rather than fixing it.
- Aggregate HR metrics drawn from this table can be identifying in a small business. Two
  rows out of four is a fact about two identifiable people.

## Security & Safety Notes

- Never invent a person, an employee reference, a role, a jurisdiction, a legal reference,
  an incident, a finding or a sanction. `Unknown` and blank are correct.
- This table holds personal data about identifiable people: conduct, complaints and
  training records. It belongs in an access-restricted system with a retention policy, not
  in a shared spreadsheet or a group chat.
- Never paste real names, real case details or a real complaint narrative into this table
  while designing the template. Generate it with placeholders and tell the user to delete
  anything they pasted.
- Access to conduct records should be on a need-to-know basis, reviewed on a schedule, and
  logged. That is an access-review task, not a spreadsheet convention.
- A complainant's identity is protected in most jurisdictions. Do not record it in a field
  that a wide audience can see, and do not repeat it in a note.
- Retaliation against a reporter is unlawful in most jurisdictions and is a serious
  liability. If a complaint names a person, the register is a document that will be read
  by a tribunal or a court.
- Health and safety, safeguarding and whistleblowing reports are not routine. Route them
  immediately to the responsible person and the external body where the law requires it -
  this register is not the route, and delay is its own harm.
- Never paste a disciplinary investigation file, a witness statement or a legal
  correspondence into a chat.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.

## Common Pitfalls

See the [bundled common-pitfalls reference](references/common-pitfalls.md) for review guidance.

## Related Skills

- @brand-growth-system-builder - routes to this skill and the other 12 brand and growth modules.
- `policy-acknowledgement` (operational pack) - the acknowledgement mechanism, if the
  business wants a separate tracker from the case register.
- `disciplinary-pip-tracker` (operational pack) - where a referred case is actually handled.
- `issue-grievance-tracker` (operational pack) - the formal complaints route.
- `data-privacy-controls` (operational pack) - the lawful basis for holding this data.
- `legal-compliance-vault` (operational pack) - where the signed policy versions are stored.
- `onboarding-playbook` (operational pack) - where the induction session that produces
  `Training Completed Date` belongs.
- @brand-kit-print-collateral - the employee ID card, and where the policy is posted.
- @presentation-deck - a small part of the deck may be conduct or privacy - never about a
  specific person.
- `people-directory` (operational pack) - holds the person reference this table points at.

## Reusable Prompt

```
I need a professional code of conduct for a small business, plus a register of who has
read it, who has been trained, and what has been reported and followed up.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a person, a role, a legal reference or an outcome, and never draft legal
text. Keep investigation, findings and sign-off with a person under the business's own
procedure. Wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
