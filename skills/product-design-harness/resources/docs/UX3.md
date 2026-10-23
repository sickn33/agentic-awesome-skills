# UX3 Model

UX3 is the product decision model behind Product Design Harness. Its canonical
machine kernel is `knowledge/ontology.json` and `knowledge/rules.json`; this
document is the human-readable projection.

The original UX3 curriculum is the knowledge source, not a file to copy into
the kernel. It teaches methods, examples, professional judgment, and the
reasoning behind the model. A decision rule distills only the part an agent can
apply as an observable trigger, evidence requirement, counter-signal, human
boundary, stop condition, and bounded output. Chapter-level sources remain in
`knowledge/rules.json` so the projection is traceable without pretending that
one rule represents a whole chapter.

![UX3 model](../assets/ux3-model.svg)

It has three connected dimensions:

| Dimension | Question |
|---|---|
| User Flow | Who is the target population, who is affected, and under what conditions should the product create an outcome? |
| Evidence Flow | What source, signal, interpretation, counter-signal, and decision impact support the next step? |
| Business Flow | Who creates value, receives value, pays, decides, operates, or absorbs risk? |

The center is not a fourth flow and not a score. It is the UX3 Decision
Kernel: a deterministic reduction process that turns three lane reviews into
one canonical verdict and execution boundary.

## User Flow

User Flow identifies the future target population for the product and the
conditions under which the product should create an outcome.

It includes:

- primary users;
- secondary users;
- machine or agent operators;
- beneficiaries who do not operate the product;
- people affected by a product decision;
- excluded or underserved groups.

The reviewer determines who the product is for, what those actors are trying
to accomplish, what they currently do, and what cost, friction, risk, or loss
of control they experience. A simulated walkthrough can expose assumptions,
but it is not validation until compared with quotes, observed behavior, logs,
and business consequence.

## Evidence Flow

Evidence Flow is the product's sensing, learning, and calibration system. It
helps machines and humans understand why a decision is justified and what must
be learned next.

Evidence can be internal, external, behavioral, subjective, or evaluative.
Evidence informs decisions; taste and judgment are separately recorded as a
human decision input.

| Source | Examples | Risk |
|---|---|---|
| Internal evidence | Usage logs, support tickets, retention, sales notes, search queries, interviews. | Can overfit to current customers. |
| External evidence | Market reports, public reviews, competitor behavior, community posts, benchmark data. | Can be generic or detached from the product. |
| Direct learning | Prototype test, workflow observation, willingness test, concierge test. | Can be small but highly relevant. |

Evidence Flow keeps these layers separate:

| Layer | Meaning |
|---|---|
| Source | Where the signal came from. |
| Signal | What was observed. |
| Interpretation | What the reviewer thinks it means. |
| Counter-signal | What weakens or contradicts the interpretation. |
| Decision impact | What changes because of it. |

Human taste and judgment are separately recorded as accountable input when a
decision depends on ethics, meaning, strategy, risk appetite, brand feel, or
final responsibility. They are not an evidence source and are not converted
into an evidence score.

## Business Flow

Business Flow represents the company, project owner, issuer, or organization
that creates, distributes, and remains accountable for the product.

It also includes customers and buyers, employees and operators, partners and
channels, investors and funders, platforms and infrastructure providers,
regulators, and communities or groups that absorb product externalities.

Business Flow asks who creates value, who receives value, who pays, who bears
cost and risk, who has decision authority, and whether the exchange can remain
viable and legitimate. It should infer the model from user value, workflow fit,
and evidence rather than starting from monetization mechanics.

## Intersections

UX3 is strongest at the intersections.

![UX3 intersections](../assets/intersections.svg)

### User Flow + Evidence Flow = Situated Understanding

Situated Understanding asks:

| Question | Meaning |
|---|---|
| What did users say or feel? | Subjective opinion is useful when its context and intensity are captured. |
| What did users actually do? | Behavior shows whether the opinion changes action. |
| What workaround already exists? | Workarounds reveal urgency and cost. |
| What interaction did the reviewer simulate? | Simulation exposes assumptions. |
| What still needs stronger evidence? | Quotes, behavior, logs, and payment signals must not be mixed into one undifferentiated claim. |

### Evidence Flow + Business Flow = Viable Learning

Viable Learning asks:

| Question | Meaning |
|---|---|
| What signal supports value? | Evidence must connect to business consequence. |
| What cost is hidden? | Build cost is not ownership cost. |
| What signal predicts retention? | Adoption is not enough. |
| What would make the model fail? | Business assumptions need failure criteria. |

### User Flow + Business Flow = Sustainable Value Exchange

Sustainable Value Exchange asks:

| Question | Meaning |
|---|---|
| What does the user gain? | The product must create clear value. |
| What does the user give up? | Time, money, data, attention, trust, workflow change. |
| What does the business capture? | Revenue, retention, distribution, trust, or depth. |
| Is the exchange fair? | Growth that damages trust is not durable. |

### UX3 Decision Kernel

The kernel does not average lane scores or invent a fourth opinion. It applies
the same four operations to every submitted review:

| Step | Operation | Result |
|---|---|---|
| Validate | Reject malformed contracts, missing evidence references, and contradictory fields. | Three valid lane verdicts. |
| Reduce | Select the worst verdict; break ties by evidence tier, then fixed lane priority: evidence, then user, then business. This is the order enforced by `scripts/check_review.py`. | One weakest flow. |
| Gate | Compare uncertainty, risk, and reversibility. Route taste, strategy, ethics, meaning, and risk appetite to the Human Judgment Gate. | A bounded proof step or accountable human decision. |
| Emit | Produce `schemas/review-result.schema.json`. | Verdict, next action, execution boundary, and stop conditions. |

The output is `continue`, `verify`, or `stop_reframe`. The weakest flow
controls the next action. A named-person decision may raise the proof bar or
reverse a recommendation only through an accountable decision record with
reversal conditions.

## Learning Loop

Every product decision should preserve this chain:

```text
signal -> interpretation -> counter-signal -> decision impact
       -> human judgment -> bounded action -> observed outcome
       -> evidence update or rule update
```

Signals do not decide by themselves. Human taste does not become a data score.
The next action is bounded by evidence, risk, reversibility, and accountability.
