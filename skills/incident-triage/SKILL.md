---
name: incident-triage
description: "Triage an alert, error report, or outage description into a severity rating, blast radius, and three ordered first actions. Use when asked to triage an incident, classify an alert, or decide if something is an incident."
category: development
risk: none
source: self
source_type: self
date_added: "2026-11-23"
author: nexusfoundry
tags: [incident-response, sre, oncall, triage]
---

# Incident Triage

## Overview

Convert an alert, error report, or user complaint into a triage card: symptom, severity (SEV1–SEV4), blast radius, and the first three actions ordered by time-to-execute. The core discipline is classify-before-fix — scoping an incident before touching it — plus explicit confidence labels and escalation-up-on-uncertainty rules. It also treats missing information as a finding (an observability gap), not a reason to stall.

## When to Use

- The user reports an alert, outage, error spike, or asks "is this an incident?" / "how bad is this?"
- For actually fixing the incident or writing the postmortem, use incident-response or postmortem skills instead; this skill only classifies and prescribes first actions.

## Prerequisites

- A description of the symptom: alert text, error message, metrics snippet, or user report.
- No tools, credentials, or access required. The triage is reasoning-only; CONFIRM/CONTAIN actions are recommendations for the responder, not executed steps.

## How It Works

### 1. Establish the inputs

Extract the observable symptom from the report. If the report describes a suspected cause rather than an observation, record that distinction — triage describes symptoms, not root cause.

### 2. Classify and scope

Produce the triage card:

1. **SYMPTOM** — one sentence: what is observably wrong.
2. **SEVERITY** — SEV1 (user-facing outage, data loss, security breach in progress), SEV2 (degraded service, single-tenant impact, failing job), SEV3 (internal tooling broken, cosmetic, workaround exists), SEV4 (noise/false positive). If uncertain, escalate UP one level — never down.
3. **BLAST RADIUS** — which users/services/data are affected and approximate count.
4. **FIRST THREE ACTIONS** — each executable in <5 minutes: (a) CONFIRM the signal is real and not a flake, (b) CONTAIN the bleeding (rollback, kill switch, rate limit), (c) COMMUNICATE to whoever needs to know now.

State confidence HIGH/MEDIUM/LOW on the severity call, and list what cannot be determined from the report — missing info is itself a finding.

### 3. Verify the result

The output is complete when all four card fields are present, severity has a one-line justification, confidence is stated, and the three actions are ordered and each under 5 minutes of effort.

## Examples

```text
User request: triage this — "checkout API error rate jumped from 0.2% to 18% in the last 10 min, alerts firing"
Inputs: alert description only, no logs
Expected result:
  SYMPTOM: checkout API 5xx rate elevated ~90x baseline
  SEVERITY: SEV2 (degraded service; payments impaired but site up) — confidence MEDIUM
  BLAST RADIUS: all checkout attempts; unknown % of users until CONFIRM
  ACTIONS: (1) CONFIRM — check 5xx vs timeout split and recent deploys; (2) CONTAIN — consider rollback if deploy <30min old; (3) COMMUNICATE — page oncall lead + post status to incident channel
  UNKNOWN: whether data is being corrupted vs merely rejected
```

## Limitations

- Cannot verify the signal is real — CONFIRM is always the first recommended action for a reason.
- Severity judgments from text alone are inherently uncertain; the skill compensates with mandatory confidence labels and escalate-up rules, not certainty.
- Does not perform the fix, the investigation, or the postmortem.

## Safety and side effects

Pure reasoning — no writes, no notifications sent, no systems touched. Recommendations like "page oncall" are text for the human responder. `risk: none`.

## Sources and related skills

Original work by NEXUS (nexusfoundry). Related skills in the same pack: code-review, sql-review.
