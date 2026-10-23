# RFC 0001: The Override Protocol

- Status: Proposal (no schema or contract changes yet)
- Scope: how the weakest-flow rule survives the moment it blocks a
  pet feature
- Follow-up: implementation tracked in the checklist at the end

## The Problem

Community feedback on the harness, paraphrased:

> "Weakest flow decides" with no averaging is a bold constraint,
> because most teams will fight that the second it blocks a pet
> feature.

The critique is correct, and it is not about the logic of the rule.
It is about organizational survival. Every hard governance mechanism
(lint gates, review gates, launch checklists) faces the same moment:
the rule is most valuable exactly when it is least popular. If the
only two outcomes at that moment are "the rule blocks the feature"
or "the team disables the rule", the rule eventually loses, because
the second outcome is silent and permanent.

Today the harness has one sentence of defense: a human may override
a recommendation only through `schemas/human-decision.schema.json`,
and an unlogged override does not exist (`docs/CONTRACTS.md`,
`agents/council-facilitator.md`). That is the right instinct, but it
is underspecified in five ways:

1. There is no dedicated override record. `human-decision` covers
   human-owned decision types (taste, risk, strategy, ethics,
   meaning). Overriding a `stop_reframe` verdict to build anyway is
   a different act with different required fields, and forcing it
   through `decision_type` blurs both records.
2. An override can silently rewrite history. Nothing prevents a team
   from treating an overridden review as if it had returned
   `continue`, which corrupts every downstream artifact that reads
   the verdict.
3. Overrides are permanent by default. `reversal_conditions` exist
   but nothing checks them, so an override taken under deadline
   pressure quietly becomes policy.
4. Overrides are invisible in aggregate. One override is judgment;
   ten active overrides are a broken review culture. Nothing counts
   them.
5. Nothing is machine-enforced. All of the above lives in prose, and
   this harness's own stated standard is that prose guarantees are
   not guarantees.

## Design Position

The harness should not try to win the fight against the pet feature.
A judgment layer that can only say "no" gets uninstalled. The design
goal is different:

**The verdict is never negotiable. Execution is.**

A human with authority may always ship the pet feature. What they
may never do is make the harness pretend it agreed. The override
protocol converts "fight the rule" into "sign your name", which is a
fight most pet features lose on their own.

## Proposed Mechanics

### 1. A dedicated verdict-override record

New contract: schemas/verdict-override.schema.json. Required
fields (draft):

| Field | Meaning |
|---|---|
| `override_id` | Stable identifier, referenced by later reviews. |
| `review_id` | The review-result being overridden. |
| `overridden_verdict` | Must equal the review's `combined_verdict`. |
| `acknowledged_weakest_flow` | Must equal the review's `weakest_flow`; the owner restates the gap they are accepting. |
| `authorized_scope` | Execution scope granted despite the verdict; same shape as `execution_boundary`. |
| `accountable_owner` | A named person, not a team. |
| `rationale` | Why shipping anyway is the right call. |
| `expires_at` | Every override is time-boxed. No permanent overrides. |
| `tripwires` | Measurable conditions; any one tripping voids the override immediately. |
| `renewal_requires` | What evidence a renewal review must present. Renewal is a new review, never an edit. |

### 2. The verdict is immutable

An override never modifies the review-result. The review stays
`stop_reframe` in the record; the override is a separate artifact
that authorizes execution despite it. Machine check: any document
that references an overridden review must carry the `override_id`,
and no tool may report the review's verdict as anything other than
what the reviewers returned. The history stays honest even when the
decision does not follow it.

### 3. Overrides expire; reviews do not

`expires_at` is required. When an override lapses, the original
verdict is in force again, and continuing execution requires either
a renewal (a fresh review that must address `renewal_requires`) or a
new override record with a new rationale. Deadline-pressure
decisions therefore decay back to the evidence by default, instead
of hardening into policy.

### 4. The override ledger

New template: templates/override-ledger.md. One row per active
override: owner, overridden verdict, expiry, tripwire status. Two
uses:

- Any new review of a direction with an active override must list
  that override in its inputs (the reviewers see what was accepted
  and why).
- The count of active overrides is itself a review input. A
  threshold (proposed: three active overrides on one product area)
  is a mandatory `verify` on the next review of that area, with the
  ledger as the cited evidence.

### 5. Machine enforcement plan

In keeping with the repo standard that every guarantee is either
machine-checked or explicitly listed as not enforced:

- scripts/check_override.py: validates the record, checks
  `overridden_verdict` and `acknowledged_weakest_flow` against the
  referenced review file, rejects expired records, rejects
  `authorized_scope` entries that appear in the review's
  `must_not_do`.
- Golden example: examples/verdict-override.json plus a walkthrough
  showing a `stop_reframe` review, the override, and the follow-up
  review that cites it.
- Docs: a short "When the harness blocks your pet feature" section
  in `docs/HARNESS.md`, written for the person who is angry at the
  gate, explaining that the exit exists and what it costs.

## What This Does Not Do

- It does not make the harness able to stop a determined owner.
  Nothing can, and claiming otherwise would violate the repo's
  honesty rules.
- It does not soften the weakest-flow rule. Averaging remains
  banned; the verdict computation is untouched.
- It does not add an approval hierarchy. One named owner and one
  signed record is the entire ceremony.

## Implementation Checklist (follow-up PRs)

- [ ] schemas/verdict-override.schema.json with the fields above
- [ ] scripts/check_override.py plus CI wiring
- [ ] examples/verdict-override.json golden pair (record plus
      walkthrough)
- [ ] templates/override-ledger.md
- [ ] `docs/HARNESS.md` section: when the harness blocks your pet
      feature
- [ ] Cross-references from `docs/CONTRACTS.md` and
      `agents/council-facilitator.md` replacing the current
      prose-only override sentences
- [ ] Tests: override record round-trip, expiry rejection, scope
      conflict rejection, ledger-threshold review input
