# Decision Rules

UX3 decision rules are operational constraints for product judgment. They tell a reviewer when a rule activates, what to inspect, what evidence can change the decision, what counter-signal can invalidate the claim, what remains human-owned, when to stop, and what bounded output must be emitted.

The canonical machine source is `knowledge/rules.json`. This document paraphrases the same kernel for human readers.

## Rule Contract

Every rule answers the same questions:

| Field | Meaning |
|---|---|
| Trigger | The observable condition that activates the rule. |
| Must inspect | The inputs, actors, risks, or evidence the reviewer must examine. |
| Must do | Required review behavior. |
| Must not do | Behavior that makes the review invalid or misleading. |
| Evidence required | The decision-changing proof needed for the rule. |
| Counter-signal | What could weaken, invalidate, or reframe the claim. |
| Human boundary | What remains owned by a named person. |
| Stop condition | The condition that blocks, downgrades, or reframes execution. |
| Output requirement | The bounded machine-readable result the reviewer must emit. |

## Rule Families

| Rule ID | Family | Operational test |
|---|---|---|
| ux3.rule.actor_boundary | Actor boundary | Separate operator, beneficiary, affected person, machine actor, buyer, issuer, and accountable owner before deciding. |
| ux3.rule.problem_hypothesis | Problem hypothesis | Treat requests as hypotheses until situation, workaround, cost, and falsification criteria are known. |
| ux3.rule.behavior_subjective_separation | Behavior and subjective experience | Keep observed behavior and stated experience as separate signals. |
| ux3.rule.disconfirm_first | Disconfirm first | Present material counter-evidence before support. |
| ux3.rule.evidence_separation | Evidence separation | Keep source, signal, interpretation, counter-signal, and decision impact distinct. |
| ux3.rule.evidence_sized_action | Evidence-sized action | Limit the next action by evidence tier, risk, reversibility, and recovery capacity. |
| ux3.rule.minimum_authority | Minimum authority | Give automated actors only the authority needed for the current proof step. |
| ux3.rule.high_risk_action_bundle | High-risk action bundle | External or irreversible actions need owner, approval, limit, trace, failure handling, and recovery path. |
| ux3.rule.minimum_validated_proof | Minimum Validated Proof | Test the riskiest assumption, not the smallest feature list. |
| ux3.rule.feedback_classification | Feedback classification | Classify feedback as evidence, noise, incident, or drift before changing direction. |
| ux3.rule.false_product_market_fit | False product-market fit | Rank repeated use, workflow dependence, payment, and reputation-bearing referral above praise or novelty. |
| ux3.rule.whole_ownership_cost | Whole ownership cost | Include support, trust, measurement, maintenance, confusion, governance, and opportunity cost. |
| ux3.rule.depth_accumulation | Depth accumulation | Identify durable depth from domain terms, edge cases, failure history, workflow rules, evaluations, and expert judgment. |
| ux3.rule.failure_to_rule_learning | Failure-to-rule learning | Turn repeated failure into a case, test, evaluation, rule, or explicit accepted risk. |
| ux3.rule.human_judgment | Human judgment | Record taste, ethics, meaning, strategy, risk appetite, and final responsibility as accountable human input. |
| ux3.rule.mental_model_alignment | Mental model alignment | Test whether target actors can predict material behavior, consequence, data or authority use, and intervention. |
| ux3.rule.human_factors_load | Human factors load | Review human, task, tool, and environment together; expose state and preserve recovery under real cognitive load. |
| ux3.rule.research_validity | Research validity | Match method to uncertainty and keep attitude, behavior, simulation, qualitative meaning, and quantitative frequency distinct. |
| ux3.rule.value_market_path | Value-to-market path | Connect target-actor value to a credible buyer, exchange, channel, willingness signal, and pre-fit retention hypothesis. PMF claims stay with `ux3.rule.false_product_market_fit`. |
| ux3.rule.human_agent_interaction | Human-agent interaction | Make intent, plan, status, action, approval, interruption, correction, logs, handoff, and recovery inspectable. |
| ux3.rule.motivation_ethics | Motivation ethics | Prevent retention, personalization, rewards, scarcity, or social pressure from overriding autonomy, consent, or exit. |

## Source Curriculum Boundary

Operationalization is narrower than the source curriculum. A rule card does
not claim to replace a chapter, method, case, or teaching sequence. It extracts
only the judgment that an agent must be able to trigger, test, challenge, stop,
and emit in a bounded form.

Every newly distilled rule cites its source as `UX3 chapter X-Y` inside
`knowledge/rules.json`; `knowledge/source-chapters.json` resolves those chapter
IDs through a checked-in source manifest and checksum. The chapter remains the
human teaching source; the rule is the machine-operable projection. Agent-era controls such as minimum
authority, deterministic verdict reduction, and machine-readable handoff may be
new extensions rather than claims copied from the original curriculum.

When multiple rules trigger, outputs compose rather than overwrite one another.
`ux3.rule.value_market_path` covers the pre-fit value, buyer, channel, and
learning path; `ux3.rule.false_product_market_fit` remains canonical for fit or
traction claims. `ux3.rule.human_agent_interaction` covers interaction
visibility and control surfaces; permission, approval records, authority, trace,
rollback, and the operational `recovery_path` remain canonical in
`authority_boundary` and `high_risk_action_bundle`, referenced by ID. The
interaction contract records only the user-visible `recovery_surface`.

`ux3.rule.research_validity` owns method fitness, sample, context, and
limitations. It references canonical evidence receipts plus behavior,
subjective, counter-signal, and decision-impact records instead of duplicating
their contents.

## Strength

| Strength | Meaning |
|---|---|
| Required | Violating the rule makes the review invalid or blocks execution. |
| Conditional | Required when the observable trigger is true. |
| Advisory | Improves judgment but needs human interpretation. |

Quick reviews should still obey required rules. Standard and Council reviews activate more conditional rules when risk, uncertainty, external action, sensitive data, stakeholder conflict, or low reversibility appears.

## Human Boundary

Rules do not remove human judgment. They make it explicit.

Human taste remains an accountable input, never an evidence score. A person may raise the proof bar, accept bounded risk, or choose a strategic direction, but the review must record the owner, rationale, bounded action, and reversal condition.
