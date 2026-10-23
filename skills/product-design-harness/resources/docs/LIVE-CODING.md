# Live Coding Workflow

Use this workflow when a builder wants a coding agent to implement product work
inside a reviewed boundary.

The rule is simple: review first, code second. A `continue` verdict plus a
valid context pack records the permitted review scope; actual implementation still requires the user's trusted authorization.
`verify` authorizes only the proof step. `stop_reframe` blocks coding.

## Golden Chain

| Artifact | Role |
|---|---|
| `examples/live-coding-product-brief.json` | Product brief with actors, evidence, assumptions, and execution boundary. |
| `examples/live-coding-review.json` | Canonical review result with `continue` verdict. |
| `examples/live-coding-context-pack.json` | Implementation handoff allowed by the review. |

### Installed Skill Validation

For an installed skill, run from its `resources` directory. For repository
contributors, run the same commands from the repository root. All relative
example, schema, and script paths below use that working directory.

Prepare the Python environment once:

```text
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
```

Validate the review and context pack together before coding:

```text
.venv/bin/python scripts/check_review.py examples/live-coding-review.json --context-pack examples/live-coding-context-pack.json
```

This joint check validates the review, context-pack schema, and copied handoff
fields. A review-only check does not validate a context pack.

### Repository Development Checks

The complete source repository also contains `tests` and `scripts/validate.py`.
These development checks run from the repository root; they are not installed
skill commands and are not required to validate an implementation handoff.

```text
.venv/bin/python -m unittest discover -s tests
.venv/bin/python scripts/validate.py
```

## Copyable Prompts

### 1. Select Working Language

```text
Use Product Design Harness for this session.

Set session_config to:
{
  "working_language": "<en|it|zh-TW|zh-CN|ja|ko|es|fr|de|pt>",
  "canonical_identifiers": "en",
  "fallback_language": "en"
}

Keep JSON property names, enum values, rule IDs, schema IDs, file paths,
evidence IDs, and verdicts in English. Use the selected working language only
for human-readable explanations and free-text fields.
```

### 2. Pre-Code Review

```text
Before coding, convert this request into a Product Design Harness product brief.

Use schema_version 2.1. Include actor_boundary, including
actor_boundary.target_population, product organization, stakeholder effects,
unresolved assumptions, human judgment boundaries,
evidence receipts, and this exact execution_boundary:

may_do: implement the approved bounded change
must_not_do: expand scope or execute external irreversible actions
must_ask: new stakeholder, data, risk, or scope appears

Then run the smallest responsible review mode. Return only a review result
valid through scripts/check_review.py against schemas/review-result.schema.json.
Do not produce an
implementation plan unless the verdict is continue.
```

### 3. Validate Review Output

```text
Validate the review before using it.

Run:
.venv/bin/python scripts/check_review.py <path-to-review-result.json>

If validation fails, fix the review artifact. Do not code from an invalid
review. If the verdict is verify, run only the proof step. If the verdict is
stop_reframe, return the reframed product question.
```

### 4. Context-Pack Handoff

```text
The review verdict is continue. Create a context pack valid against
schemas/context-pack.schema.json.

The context pack must copy the review_id, session_config, actor_boundary,
product_organization, stakeholder_effects, unresolved_assumptions,
human_judgment_boundary, evidence IDs, stop conditions, human approval gates,
and exact execution_boundary from the review.

Set context-pack scope to an exact copy of the approved
review.execution_boundary.may_do list. Do not summarize or expand it.

Run the joint handoff check:
.venv/bin/python scripts/check_review.py <path-to-review-result.json> --context-pack <path-to-context-pack.json>

Implementation may begin only after the joint handoff check passes. Implement
only the approved may_do actions. Do not expand scope.
```

### 5. Scope Change

```text
Pause implementation and return to Product Design Harness review.

Reason: a new stakeholder, data, risk, or scope appeared.

Summarize:
- what changed
- who is newly affected
- what evidence supports the change
- which boundary item was crossed
- whether the current context pack should continue, verify, or stop_reframe

Do not continue coding until a new valid review and context pack authorize the
changed scope.
```

### 6. Post-Build Feedback Classification

```text
Classify post-build feedback for the next Product Design Harness iteration.

For each signal, separate:
- raw artifact or source
- signal type: quote, observed behavior, product log, support pattern,
  workflow trace, market signal, policy, or derived
- interpretation
- decision impact
- counter-signal
- evidence tier
- unresolved assumption changed by the signal

Return updated evidence receipts. Do not change the product direction unless
the evidence changes the review boundary.
```

## Live-Coding Rules

| Situation | Action |
|---|---|
| `continue` and valid context pack | Code only inside the context-pack scope. |
| `verify` | Run only the proof step; do not build the feature. |
| `stop_reframe` | Stop coding and return the reframed product question. |
| Boundary changes | Pause and run a new review. |
| New post-build evidence | Classify it before deciding the next iteration. |

The implementation agent may decide technical details inside the context pack.
It may not decide whether the product direction, stakeholder boundary, evidence
bar, or human judgment boundary changed.
