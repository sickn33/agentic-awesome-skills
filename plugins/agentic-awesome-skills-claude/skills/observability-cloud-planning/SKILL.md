---
name: observability-cloud-planning
description: 'Build a cloud, SLO, and incident-readiness register after intake. Use when an SME needs monitoring scope, alert ownership, cost limits, or service planning.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, observability, monitoring, slo, sli, alerting, cloud-cost, uptime, incident, reliability, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Cloud and Observability Planning

**What it is:** the plan for what the business runs on, what it watches, what wakes
someone up, and what that costs - written before any of it is bought.

## Overview

Works out the smallest monitoring plan that would actually catch this business's worst
failure, then builds it only when asked. The default output is a short recommendation, not
a service register. The register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced
on request, from one field list so the four cannot drift apart.

Layer: Layer 8: Operate. Fits: Growth stage. Table code: n/a.

**The rule this table exists to enforce:** an alert is a human cost, so `Alert Channel` and
`Severity` decide whether a person is woken at 3am. Everything else in this table exists to
make that decision possible: what the service does (`SLI Definition`), what good looks like
(`SLO Target`), what is measured (`Dashboard URL`), what it costs (`Monthly Cost Estimate`),
and - the field most tables leave out - what happens when the alert fires (`Runbook URL`).
An alert with no runbook converts a technical problem into a panicked one.

**The second rule:** `Phase` is the field that keeps this affordable. A ten-service stack
with four signals each, on a plan tier, ordered by what would hurt the business most. A
business with no developer should be running a managed platform and three alerts, not a
stack of collectors.

## When to Use This Skill

- monitoring, observability, alerting, uptime, "we found out from a customer"
- SLI, SLO, error rate, latency, p95, p99
- "what should we watch", "how do we know the site is down"
- incident response, on-call, runbook, postmortem
- cloud cost, what is it costing, what should we turn off
- "which service should we use", VPS, containers, serverless, managed hosting
- incident readiness, status page, downtime prevention

Do not use it for: application code, infrastructure as code, or a deployment pipeline
(`devops-pipeline-designer`, `ci-cd-pipeline-builder` in the engineering pack); a security
architecture review (`security-and-privacy`); or a real incident, which is a live
situation, not a plan.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "plan" / "set up" / "we need" -> artifacts wanted; go to Step 2.
- "the site is down" / "is it down" / "we are down" -> an incident, right now. Confirm the
  user-facing failure first and point at the runbook; do not build anything.
- "what does this cost" / "review" / "audit" -> a review, not a build.
- "should we use" -> a decision question; answer with trade-offs, then offer the register.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What breaks for the business if the site or app is down for one hour, and who
> would notice first - a customer, a member of staff, or an automated system?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the plan.

- **Failure** - What is the business-critical thing - the website, the booking form, the
  till, email, the file uploads? / What is the worst realistic failure - down, slow, wrong
  data, or an email that silently stops arriving? / How long is a customer willing to wait
  before they complain, and how long before they leave?
- **Stack** - What is actually running today - shared hosting, a VPS, a managed platform, a
  SaaS tool, containers? / Who set it up, and is that person still available? / Is there a
  repository, and who can deploy?
- **Traffic** - Roughly how many visitors, orders or jobs a day? / Any seasonal or campaign
  peaks that change it by an order of magnitude? / Are there peak periods where being slow
  is worse than being down?
- **People** - Is there anyone who can be on call, and at what hours? / Does someone already
  use a tool the business pays for? / Who is allowed to restart something at 3am?
- **Data and money** - What must not be lost, and what is the acceptable recovery point? /
  What is the current monthly spend, roughly, and the budget ceiling? / Does anything
  process a payment, personal data, or health data?

Never invent an answer. Traffic numbers, costs, hostnames, provider names, service
identifiers, error rates, uptime figures and recovery times the user has not supplied are
`Unknown`. A monitoring plan built on invented traffic or invented spend is worthless, and
invented SLOs are worse - they create an alert nobody can satisfy.

### Step 3 - Hold the internal context

```yaml
module: observability-cloud-planning
intent: null            # set up | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Failure": null
  "Stack": null
  "Traffic": null
  "People": null
  "Data and money": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with the one thing whose failure stops the business earning -
usually the checkout or the booking form - and watch exactly that from outside the
infrastructure, so the check does not fail with the thing it is checking. Three signals and
no more: is it reachable, is it answering within a target time, and is the thing that
transacts money or data actually succeeding. One alert channel that reaches a human, a
runbook for each alert, and a named owner. Everything else - traces, log aggregation, five
custom dashboards, a status page - goes in a later phase once the first phase has proven
someone reads it.

**Why this one:** The failure mode of observability is not too little monitoring, it is too
much of the wrong. A business that installs fifteen alerts stops reading them within a
week and returns to finding out from customers. And external monitoring matters more than
internal: an uptime check that runs on the same box as the site reports the site is fine
right up to the moment it is not.

**Workflow:** Worst failure named → What must be measured to catch it, from outside →
Baseline measured, not assumed → Three signals defined with targets → Alerts with a channel
and a runbook each → Costs estimated against a ceiling → Owner and review date set →
Runbook rehearsed → Phase 2 only after phase 1 is being read → Quarterly review of alerts
kept, deleted and added

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/notion-manual-import/SKILL.md): it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Service ID,Service Name,Purpose,Criticality,Owner,Environment,Monitored From,SLI Definition,SLO Target,Dashboard URL,Log Source,Alert Channel,Severity,Alert Threshold,Runbook URL,Escalation Path,Monthly Cost Estimate,Data Handled,Deployment Method,Dependencies,Phase,Review Date,Status,Notes
,Example Booking Service,Takes customer bookings and confirms by email,High,Example Owner,Production,External region outside the hosting provider,Uptime of the public booking page,99.5% monthly,Not yet created,Application and web server logs,Email and SMS to on-call,Critical,3 consecutive failed checks or 5 minutes above target,Not yet created,On-call then business owner,Unknown,Payment card details,Managed platform,None,1,2026-10-27,Not started,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE obs_service (
  service_id BIGINT PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  purpose TEXT NOT NULL,
  criticality VARCHAR(50) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  monitored_from VARCHAR(100) NOT NULL,
  sli_definition TEXT NOT NULL,
  slo_target VARCHAR(50) NOT NULL,
  dashboard_url VARCHAR(255),
  log_source VARCHAR(255) NOT NULL,
  alert_channel VARCHAR(255) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  alert_threshold VARCHAR(255) NOT NULL,
  runbook_url VARCHAR(255),
  escalation_path TEXT,
  monthly_cost_estimate NUMERIC(10,2),
  data_handled VARCHAR(255) NOT NULL,
  deployment_method VARCHAR(100) NOT NULL,
  dependencies TEXT,
  phase VARCHAR(50) NOT NULL,
  review_date DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT obs_service_phase CHECK (phase IN ('1 - core','2 - deepen','3 - optional','Sunset')),
  CONSTRAINT obs_service_status CHECK (status IN ('Not started','In progress','Blocked','Done','Cancelled')),
  CONSTRAINT obs_service_severity CHECK (severity IN ('Info','Warning','Critical')),
  CONSTRAINT obs_service_criticality CHECK (criticality IN ('Low','Medium','High','Critical')),
  CONSTRAINT obs_service_cost_non_negative CHECK (monthly_cost_estimate IS NULL OR monthly_cost_estimate >= 0)
);

CREATE INDEX idx_obs_service_status ON obs_service (status);
CREATE INDEX idx_obs_service_phase ON obs_service (phase);
CREATE INDEX idx_obs_service_review ON obs_service (review_date);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Cloud and Observability Plan",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Service ID": { "type": "integer" },
      "Service Name": { "type": "string" },
      "Purpose": { "type": "string" },
      "Criticality": { "type": "string" },
      "Owner": { "type": "string" },
      "Environment": { "type": "string" },
      "Monitored From": { "type": "string" },
      "SLI Definition": { "type": "string" },
      "SLO Target": { "type": "string" },
      "Dashboard URL": { "type": "string" },
      "Log Source": { "type": "string" },
      "Alert Channel": { "type": "string" },
      "Severity": { "type": "string" },
      "Alert Threshold": { "type": "string" },
      "Runbook URL": { "type": "string" },
      "Escalation Path": { "type": "string" },
      "Monthly Cost Estimate": { "type": "number" },
      "Data Handled": { "type": "string" },
      "Deployment Method": { "type": "string" },
      "Dependencies": { "type": "string" },
      "Phase": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Service Name",
      "Purpose",
      "Criticality",
      "Owner",
      "Environment",
      "Monitored From",
      "SLI Definition",
      "SLO Target",
      "Log Source",
      "Alert Channel",
      "Severity",
      "Alert Threshold",
      "Data Handled",
      "Deployment Method",
      "Phase",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Service ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Service Name | Title | Use as the database title |
| Purpose | Text | Leave as Text. What the business loses if this stops. Not a technical description |
| Criticality | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Critical". Critical means the business stops earning |
| Owner | Text | Leave as Text. A named person. A service with no owner is unmonitored in practice |
| Environment | Select (add options after import) | Convert to Select, add options: "Production", "Staging", "Development". Monitoring a staging URL and calling it uptime is a common and expensive mistake |
| Monitored From | Text | Leave as Text. Where the check runs. It must not run on the thing it is checking |
| SLI Definition | Text | Leave as Text. The measurement in plain words - "public booking page answers in under 2 seconds for 95% of requests" |
| SLO Target | Text | Leave as Text. The number and the window, e.g. "99.5% monthly". A target nobody has ever met is a target that gets deleted |
| Dashboard URL | Text | Leave as Text. Blank until a dashboard exists, which is the correct state in phase 1 |
| Log Source | Text | Leave as Text. Where the logs are today, including "none - not collected" |
| Alert Channel | Text | Leave as Text. The specific route: which email, which SMS, which app. "Alerts" is not a channel |
| Severity | Select (add options after import) | Convert to Select, add options: "Info", "Warning", "Critical". Only Critical should page a human outside working hours |
| Alert Threshold | Text | Leave as Text. The condition that fires, written so it is unambiguous and testable |
| Runbook URL | Text | Leave as Text. Blank is a finding, not a formatting gap. An alert with no runbook must not ship |
| Escalation Path | Text | Leave as Text. Who is woken first, then who, then who gives up and calls the host |
| Monthly Cost Estimate | Number | Convert to Number, two decimal places. An estimate against a ceiling, in the business's own currency |
| Data Handled | Select (add options after import) | Convert to Select, add options: "None", "Personal data", "Payment card details", "Health data", "Credentials or secrets", "Business confidential", "Public only". Drives the log retention and access rules |
| Deployment Method | Text | Leave as Text. How a change reaches this service, and by whom |
| Dependencies | Text | Leave as Text. What this needs to work. "None" is a valid and worth recording answer |
| Phase | Select (add options after import) | Convert to Select, add options: "1 - core", "2 - deepen", "3 - optional", "Sunset". The affordability control |
| Review Date | Date | Convert to Date. When the alerts, the target and the cost are re-examined |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Dashboard URL` and `Runbook URL` read `Not yet
created` rather than a plausible-looking link, because a dead or wrong link in a runbook
column is worse than an obvious gap.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Service ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | (blank) |
| 2 | Service Name | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 3 | Purpose | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 4 | Criticality | `select` | `VARCHAR(50)` | `string` | Select | High |
| 5 | Owner | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 6 | Environment | `select` | `VARCHAR(50)` | `string` | Select | Production |
| 7 | Monitored From | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 8 | SLI Definition | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 9 | SLO Target | `text` | `VARCHAR(50)` | `string` | Text | 99.5% monthly |
| 10 | Dashboard URL | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 11 | Log Source | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 12 | Alert Channel | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 13 | Severity | `select` | `VARCHAR(50)` | `string` | Select | Critical |
| 14 | Alert Threshold | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 15 | Runbook URL | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 16 | Escalation Path | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 17 | Monthly Cost Estimate | `number` | `NUMERIC(10,2)` | `number` | Number | Unknown |
| 18 | Data Handled | `select` | `VARCHAR(255)` | `string` | Select | Personal data |
| 19 | Deployment Method | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 20 | Dependencies | `long_text` | `TEXT` | `string` | Text | None |
| 21 | Phase | `select` | `VARCHAR(50)` | `string` | Select | 1 - core |
| 22 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 23 | Status | `select` | `VARCHAR(50)` | `string` | Select | Not started |
| 24 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Criticality** - what the business loses. `Critical` means the business stops earning, not
that the service is technically important. A search index that goes down is `Low`; a
checkout that goes down is `Critical`.

```
Low | Medium | High | Critical
```

**Environment** - and the mistake this prevents: monitoring a staging URL and reporting it
as uptime. Production is the only environment that earns an alert.

```
Production | Staging | Development
```

**Severity** - the difference between a notification and a woken person. Only `Critical`
should reach a human outside working hours, because a `Warning` that pages at 3am trains
the on-call to ignore the channel.

```
Info | Warning | Critical
```

**Data Handled** - this is not documentation, it is an instruction. `Payment card details`,
`Health data` and `Credentials or secrets` change the log retention period, who may read
the logs, and whether the logs may be shipped to a third-party service at all.

```
None | Personal data | Payment card details | Health data | Credentials or secrets | Business confidential | Public only
```

**Phase** - the field that keeps this affordable. Phase 1 is what catches the worst failure
and is read. Nothing enters phase 2 until phase 1 is being read and acted on; a plan that
ships all phases at once is a plan nobody maintains.

```
1 - core | 2 - deepen | 3 - optional | Sunset
```

**Status** - `Blocked` is the honest value whenever something depends on a person, a
contract or a decision that has not happened.

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

- `Dependencies` names other rows in this table. A cycle here is a design smell, not an
  error, and it is worth finding deliberately.
- `Log Source` and `Data Handled` point at the data and access rules in
  `data-privacy-controls` (`me-ops-system-builder`). Confirm the join before making it
  live; a third-party log destination is a data transfer.
- `Runbook URL` points at `runbook-playbook` in the engineering pack. Blank there and blank
  here is the same finding.

## Examples

**Prompt**

```
We run a booking site on a VPS. Last month it was down for a whole Sunday and we only
found out on Monday from a customer. We want to know if it goes down, and we do not know
what we should be paying for all this.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What breaks for the business if the site or app is down for one hour, and who
> would notice first - a customer, a member of staff, or an automated system?
> **A:** The booking form. A customer, obviously.
>
> **Q:** What is actually running today, and who set it up?
> **A:** A VPS with the site on it, set up by an agency we no longer deal with.
>
> **Q:** Roughly how many visitors or bookings a day?
> **A:** Maybe 20 bookings. It is much busier in December.
>
> **Q:** Is there anyone who could be on call, and at what hours?
> **A:** Me, evenings and weekends.
>
> **Q:** What is the current monthly spend, roughly, and the ceiling?
> **A:** Forty a month for the server. I would not want to spend much more than that.

**Recommended next step** - offered, not built:

> One external uptime check on the booking page, run from outside your provider, plus a
> check that a test booking actually completes. That catches the Sunday problem. Two
> alerts, both to your phone: the page unreachable for three checks running, and a test
> booking that fails. No dashboard, no log shipping, no tracing - the site does not earn
> that yet. A one-page runbook for each: what to check, how to restart it, and the agency
> number if it does not come back. December is your peak, so test it properly in November.
> Keep it near 40 a month, or you will pay more for storage than you do for the server.
>
> Workflow: Worst failure named → What must be measured, from outside → Baseline measured
> → Three signals with targets → Alerts with a channel and a runbook each → Costs
> estimated → Owner and review date set → Runbook rehearsed → Phase 2 only if phase 1 is
> being read
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Monitor from outside the thing you are monitoring. A check on the same host as the site
  reports the site healthy right up to the moment it is not.
- Monitor the transaction, not the server. A server can return 200 while the checkout throws
  an exception on every attempt, and no amount of CPU monitoring catches that.
- Measure the baseline before setting the target. An SLO set above what the system has ever
  done is a target that guarantees a permanently firing alert.
- Three signals to start. Reachability, latency, and the business transaction. Resist the
  fourth until the first three are read.
- Only `Critical` pages a human. Everything else is a notification for working hours, or it
  is deleted. Alert fatigue is the normal end state of an unmaintained alerting setup.
- No alert without a runbook. Blank `Runbook URL` is a finding that blocks going live.
- Set the alert threshold in advance and test it. An alert that has never fired is an
  untested assumption.
- Track cost against a ceiling the business named. A plan with no ceiling becomes an
  invoice nobody predicted.
- Name an owner per service. A service with no owner is unmonitored in practice, whatever
  the dashboards say.
- Set a review date and honour it. Every quarter, ask of each alert: did a human act on
  this? If not, delete it.
- Never log secrets, tokens, full card numbers, or unnecessary personal data. `Data
  Handled` exists to make that decision explicit before the logs are shipped anywhere.
- If logs go to a third-party service, that is a data transfer with its own agreement.
  Confirm it rather than assuming it is fine.
- Keep phase 1 small enough to maintain. An unmaintained 40-service plan is worse than a
  maintained three-service one.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real service.

## Limitations

- This is a plan. It does not deploy anything, install an agent, open a dashboard, create an
  alert or read a log.
- It has no access to the business's infrastructure, so it cannot measure a baseline, read a
  metric, or verify an SLO. Every value in this table comes from the user.
- Costs are estimates by definition and depend on region, tier, retention and traffic that
  this skill cannot see. Treat `Monthly Cost Estimate` as a planning figure, never as a
  quote, and never as a provider price list.
- It does not recommend a specific provider on a current price. Provider capabilities,
  pricing and free tiers change; verify against the provider's own current documentation.
- Log volume, cardinality and ingestion cost are the usual cause of an unexpected bill, and
  they cannot be estimated here without real traffic.
- It cannot tell you what is currently running, what is currently alerting, or whether the
  current setup already covers the worst failure. That needs access.
- Uptime, latency and error-rate targets are engineering commitments. They are not
  business promises, and a target that is missed is a trigger for a decision, not a
  contractual breach.
- SLOs do not replace a backup, a restore test, or a disaster recovery plan. A monitored
  service with no tested restore is still a lost database.
- Compliance requirements around logging, retention and personal data are jurisdiction and
  sector specific, and are not modelled here.
- Security monitoring, intrusion detection and access review are out of scope; use
  `security-and-privacy`.
- It cannot judge whether a provider, region or architecture is right. It structures the
  question.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

