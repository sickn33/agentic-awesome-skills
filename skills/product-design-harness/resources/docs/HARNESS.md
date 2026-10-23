# Product Design Harness Manual

![Harness sequence](../assets/harness-sequence.svg)

## 1. Definition

Product Design Harness is a repeatable decision system for product work.

It runs before execution.

Execution can mean design, code, prototype, launch, growth, automation, or investment. The harness asks whether the work deserves to happen, what evidence is required, and what constraints must shape the next step.

## 2. Why It Exists

Modern teams can produce product artifacts quickly:

- briefs
- prototypes
- screens
- code
- dashboards
- launch plans
- experiments
- summaries

Speed creates a new risk.

A weak assumption can become a polished artifact before anyone has proven the problem is real.

Product Design Harness slows down the wrong things and accelerates the right things.

| Accelerate | Slow down |
|---|---|
| Learning from real behavior. | Building from vague assumptions. |
| Explicit trade-offs. | False certainty. |
| Small proof steps. | Large unvalidated builds. |
| Reversible experiments. | Irreversible high-risk actions. |
| Clear handoffs. | Ambiguous requests. |

## 3. UX3 Model

### 3.1 User Flow

User Flow checks whether the actor, problem, situation, and affected people are real.

It can simulate the user's path through the product, but simulation is not validation.

Use the walkthrough to find assumptions. Use quotes, behavior, context, and consequences to validate them.

Required questions:

| Question | Why it matters |
|---|---|
| Who directly operates the product? | Avoids vague "users". |
| Who benefits from the outcome? | Operator and beneficiary can differ. |
| Who is affected without operating it? | Surfaces hidden risk. |
| Who is excluded? | Prevents accessibility and market blind spots. |
| What current workaround exists? | Workarounds connect stated pain to real cost. |
| What would prove the problem is not real? | Prevents confirmation-only reviews. |

### 3.2 Evidence Flow

Evidence Flow checks whether the team has proof strong enough for the next decision.

Evidence may come from internal sources, external sources, or direct user learning.

The harness must keep source, signal, interpretation, counter-signal, and
decision separate.

Required questions:

| Question | Why it matters |
|---|---|
| What is data, and what is interpretation? | Keeps raw signals separate from narrative. |
| What decision does each metric change? | Rejects vanity metrics. |
| What would stop or reframe this work? | Makes failure useful. |
| What must be measured before scaling? | Prevents blind expansion. |
| What logs or traces are needed? | Makes decisions reviewable. |
| What repeated failure should become a rule? | Turns mistakes into harness improvements. |
| Which evidence is internal and which is external? | Prevents treating market research and product telemetry as the same kind of proof. |

### 3.3 Business Flow

Business Flow checks whether the direction is worth sustaining.

Business Flow starts from the user side: value, switching behavior, urgency, trust, and willingness to return.

The business model should be inferred from the user's workflow, not imposed on top of it.

Required questions:

| Question | Why it matters |
|---|---|
| What value is created? | Useful work still needs a value argument. |
| Who pays, adopts, returns, or recommends? | Separates curiosity from pull. |
| What does this cost to maintain? | Build cost is not total cost. |
| What channel can distribute it? | Products need routes to adoption. |
| What makes users return? | Novelty is not retention. |
| What becomes hard to copy? | Generic features do not defend a product. |

### 3.4 UX3 Intersections

UX3 is not a set of independent checklists.

It is a set of intersections.

| Intersection | Name | Review question |
|---|---|---|
| User Flow + Business Flow | Sustainable Value Exchange | What value does the user receive, and what value can the product capture? |
| User Flow + Evidence Flow | Situated Understanding | What do people say, feel, and do, and how strong is each signal? |
| Evidence Flow + Business Flow | Viable Learning | What evidence shows this can become sustainable value? |
| User Flow + Evidence Flow + Business Flow | UX3 Decision Kernel | Which canonical verdict and execution boundary follow from the three lane results? |

## 4. Stages

Use stage to choose the right evidence bar.

| Stage | Main question | Required proof |
|---|---|---|
| Idea | Is the problem real and specific? | Actor, situation, frequency, cost, workaround. |
| Prototype | What behavior should be observed? | One riskiest assumption and a focused test. |
| Launch | Is there enough pull and reliability? | Repeated use, adoption, willingness, recovery path. |
| Scale | Can this compound safely? | Retention, cost, governance, distribution, defensibility. |

For multi-review work, use `OPERATING-PROTOCOL.md`.

UX3 adds six gates: Stage, User Flow, Evidence Flow, Business Flow, Council, and Human Judgment.

It should be used when the decision requires external evidence, multiple reviewers, claim analysis, uncertainty review, or human-owned trade-offs.

## 5. Verdicts

![Decision gate](../assets/decision-gate.svg)

| Verdict | Meaning | Required behavior |
|---|---|---|
| Continue | Evidence and risk are sufficient for the next step. | Proceed with explicit scope, non-goals, and acceptance criteria. |
| Verify | Direction may be valid but evidence is incomplete. | Run the smallest validation step before expanding work. |
| Stop/Reframe | Core problem, evidence, risk, or viability fails. | Stop execution or redefine the problem. |

Do not turn Verify or Stop/Reframe into a build plan.

## 6. Evidence Tiers

Evidence tier limits the size of the next action. Confidence cannot upgrade a
weak tier.

| Tier | Examples | Use |
|---|---|---|
| t0 | No traceable signal. | Reframe or define research. |
| t1 | Opinions, quotes, generic trends, internal preference. | Generate hypotheses only. |
| t2 | Contextual interviews, support patterns, observed workarounds, small tests. | Run a focused reversible prototype. |
| t3 | Repeated behavior, payment, retention, referral, adoption, logs. | Consider bounded launch or expansion. |
| t4 | Durable retention, workflow dependency, sustainable economics, governance proof. | Consider scale. |

## 7. Trade-Off Logic

Product decisions are trade-offs, not isolated scores.

| If this is high | And this is low | Default verdict |
|---|---|---|
| User pain | Evidence strength | Verify |
| User pain | Business value | Verify or Reframe |
| Business value | User clarity | Stop/Reframe |
| Build speed | Evidence quality | Verify |
| Automation power | Human control | Stop/Reframe |
| Growth potential | Trust design | Verify |
| Revenue potential | Access fairness | Verify |
| Strategic value | Reversibility | Human judgment required |

## 8. Human Judgment Gate

Taste is not decoration.

Taste is the human ability to judge fit, restraint, coherence, trust, and meaning.

Run the Human Judgment Gate when taste, risk appetite, strategy, ethics,
meaning, vulnerable users, brand, or irreversible action is involved.

| Taste dimension | Review question |
|---|---|
| Coherence | Does the product feel like one clear idea? |
| Restraint | Did the team avoid building everything it could build? |
| Trust | Does the product reveal enough to be believed? |
| Dignity | Does it respect users and affected people? |
| Timing | Is this the right moment to ask the user to act? |
| Meaning | Is the work worth existing beyond short-term output? |

Taste is one part of Human Judgment Gate, not a seventh mechanical score.

The gate can raise the proof bar or stop a mechanical continue verdict. If no
accountable owner responds, the work pauses; it never defaults to execution.

### When The Harness Blocks Your Pet Feature

Sooner or later a verdict blocks something the team loves. The exit exists,
and here is what it costs. Anyone with authority may execute despite a
`verify` or `stop_reframe` verdict by signing a verdict override
(schemas/verdict-override.schema.json): one named owner, the weakest flow
restated in their own record, an explicit scope, an expiry, and tripwires
that void it. The review itself is never edited - the harness will not
pretend it agreed. When the override lapses, the original verdict is in
force again; renewal is a fresh review with new evidence, never an
extension. Active overrides accumulate in templates/override-ledger.md,
and three on one product area force a `verify` on the next review. In
short: the feature can ship, but it ships with your name on it.

## 9. Council Process

For council work:

1. Run Claim Analyst.
2. Retrieve only missing evidence.
3. Fork User, Evidence, and Business reviewers in parallel.
4. Wait for all three independent reviews.
5. Run one challenge round per lane.
6. Run Uncertainty Reviewer.
7. Run Council Facilitator.
8. Route accountable decisions to Human Judgment Gate.

The facilitator must:

- list disagreements
- identify the weakest flow
- name the trade-off
- call out the human-owned decision
- produce the next smallest action

The council must complete the challenge round before converging.

The goal is not agreement.

The goal is to expose the weakest claim and the trade-off that humans must own.

## 10. Stop Conditions

Stop or downgrade when:

- the user is undefined
- the problem cannot be tested
- evidence has only unweighted opinion or simulation
- the requested work starts with output before proof
- the product hides powerful actions behind friendly wording
- the team cannot name who is affected
- there is no failure condition
- there is no reason to return
- the value depends only on being easy to build
- the next action creates irreversible risk without human review

## 11. Handoff To Execution

If the verdict is Continue, create a context pack before execution.

The context pack must include:

| Field | Purpose |
|---|---|
| Goal | What outcome matters. |
| Stage | Current maturity. |
| Scope | What to do now. |
| Non-goals | What not to do. |
| Assumptions | What remains unproven. |
| User rules | Actor, mental model, affected people, accessibility. |
| Evidence rules | Measurements, logs, failure criteria. |
| Business rules | Value, cost, retention, distribution. |
| Acceptance criteria | What done means. |
| Stop conditions | When execution must return to human judgment. |

## 12. Harness Improvement Loop

Every review should improve the harness.

| Event | Convert into |
|---|---|
| Repeated confusion | Principle or glossary entry. |
| Bad decision | Stop condition. |
| Weak handoff | Template field. |
| Misleading metric | Evidence rule. |
| Failed prototype | Test case. |
| Hidden stakeholder | User Flow rule. |
| Scope creep | Trade-off rule. |
| Trust incident | Human Judgment Gate rule. |

The harness should become harder to misuse over time.
