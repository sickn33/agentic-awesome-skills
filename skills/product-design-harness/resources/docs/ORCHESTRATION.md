# Agent Orchestration

Run a single-pass three-lane review for small reversible work. Run a council
when the direction needs external evidence, claim analysis, disagreement, or
human judgment. Every mode reviews all three lanes; modes differ in depth,
not in lane coverage.

Before any review, load `schemas/session-config.schema.json`,
`knowledge/ontology.json`, triggered entries from `knowledge/rules.json`, and
`prompts/start-review.md` in that order. Use `working_language` for prose and
English canonical identifiers for schemas, Flow IDs, and rule IDs.

## Mode Selection

| Situation | Action |
|---|---|
| Small reversible change with bounded impact. | Quick Gate. |
| New feature, workflow, or experiment. | Standard Gate. |
| High uncertainty, high cost, low reversibility, or affected stakeholders. | UX3 Council. |
| Existing continue result with a valid context pack. | Handoff: reuse the context pack; no new review. |

Reversibility lowers mode, not the review requirement.

## Evidence Retrieval Contract

External tools provide evidence, not verdicts.

1. Send schemas/evidence-request.schema.json.
2. Retrieve only the evidence needed for named claims.
3. Require schemas/evidence-response.schema.json.
4. Reject receipts without provenance, freshness, counter-signal, or raw
   artifact location.
5. Let the Evidence Flow Reviewer interpret decision impact.

This contract applies to internal connectors, external search, product data,
documents, logs, tickets, and workflow traces.

## Council Fork And Join

1. Intake the product direction and identify stage.
2. Run Claim Analyst and create the claim dependency graph.
3. Retrieve missing evidence through the evidence contract.
4. Fork User, Evidence, and Business reviewers in parallel.
5. Wait for all three independent reviews.

Two execution paths, either is compliant:

- Parallel dispatch: if the runtime has a task or subagent tool, dispatch
  the three lane reviewers concurrently. Assemble each reviewer's input as
  the product brief plus claim analysis plus the relevant knowledge rules,
  and collect each reviewer's output as one reviewer-verdict JSON object.
- Single-context rotation (fallback): one agent plays each reviewer in
  sequence. Blind-round discipline still applies: write each lane's
  complete reviewer-verdict JSON before reading the next lane's brief,
  and never revise an earlier lane after seeing a later one.

Unanimous-continue red flag: if all three independent lane reviews return
continue in a council-tier decision, treat agreement as a signal to probe,
not to relax. Run prompts/red-team.md before synthesis and attach its valid
schemas/red-team-review.schema.json output as council_input.red_team_review.
The output must name the challenged claims, evidence receipts, five failure
modes, disconfirming tests, and a stop condition. A red-team finding can require
verify without another independent vote: record the affected final lane as
verify, including the counter-case and missing proof, before reducing the final
lane verdicts. Keep the original independent and challenge receipts unchanged.
The combined verdict still equals the most severe final lane verdict; changing
only that headline is invalid.
6. Run one challenge round per lane.
7. Run Uncertainty Reviewer on evidence tier, risk, reversibility, and freshness.
8. Run Council Facilitator.
9. Route accountable decisions to Human Judgment Gate.
10. Create a context pack only after continue.

The facilitator must not synthesize before the join barrier.

Product organization, issuer, stakeholder effects, and accountable owner are
required before handoff. Taste remains human-owned and is recorded through
Human Judgment Gate, not scored by reviewers.

## Challenge Round

Each reviewer returns schemas/reviewer-verdict.schema.json with:

- review_round set to challenge
- objection_to
- counter_evidence
- position_change

No objection is acceptable only when the reviewer records the counter-evidence
search that failed to change the conclusion.

## Idea Generation

Idea generation creates alternatives, not execution.

| Step | Rule |
|---|---|
| Generate | Produce directions that differ in user mechanism, evidence need, or business logic. |
| Separate | Reject cosmetic variants of the same direction. |
| Decompose | Run claim analysis for each viable direction. |
| Stress-test | Search for counter-signals and dependency failures. |
| Select | Choose the direction with the best confidence-to-cost ratio. |

Semantic distance is a diagnostic, not a target score. Useful divergence means
the options would fail for different reasons.

## Trade-Off Defaults

| Trade-off | Protect by default |
|---|---|
| Speed vs confidence | Confidence when risk is high. |
| Automation vs control | Human override and accountability. |
| Growth vs trust | Trust. |
| Revenue vs access | Fairness and long-term value. |
| Novelty vs comprehension | User mental model. |
| Scope vs learning | The smallest proof step. |

## Output Discipline

The council returns one canonical result:

- continue with a context pack
- verify with one proof step
- stop_reframe with a better product question

Use schemas/review-result.schema.json.

verify authorizes only the exact proof_step and never general coding.
continue plus a valid context pack authorizes implementation.
Every result must state `may_do`, `must_not_do`, and `must_ask`.
Post-build feedback is routed through ux3.rule.feedback_classification before
it changes scope, priority, or rules.
