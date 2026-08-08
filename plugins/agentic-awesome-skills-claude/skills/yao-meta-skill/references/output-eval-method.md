# Output Eval Method

Output Eval Lab proves whether a skill improves the final user-facing result, not only whether it routes correctly.

## When To Use

Use output evals for production, library, governed, or team-distributed skills. Scaffold skills can start with one smoke case, but production and above should show a positive with-skill vs baseline signal before promotion.

## Case Design

Each case should include:

- a real prompt or task shape
- any required input files
- a baseline output that represents doing the task without the skill
- a with-skill output that represents the skill-guided behavior
- assertions that can be checked without subjective guessing
- optional human review notes for taste, completeness, or judgment

## Assertion Rules

Prefer assertions that catch material quality:

- required deliverable paths
- required sections or contracts
- required boundary or exclusion language
- required evidence paths
- forbidden generic placeholders
- forbidden unsafe actions

Avoid assertions that only reward wording memorization. If a case can pass by parroting one phrase while failing the real job, the assertion is too narrow.

## Score Reading

The first v0 scorecard reports:

- baseline pass rate
- with-skill pass rate
- absolute delta
- failed assertions and failure taxonomy
- execution mode, timing, and token evidence when `reports/output_execution_runs.md` is generated
- blind A/B review pack count
- recommended next fixes

Production promotion should require the with-skill pass rate to beat baseline and should explain every failed assertion.

## Execution Evidence

Run execution evidence after the scorecard:

```bash
python3 scripts/yao.py output-exec
```

By default, this records the current case outputs as `recorded_fixture`. That is useful for reproducibility, but it is not model-executed evidence. To collect real run evidence, pass `--runner-command` with a command or JSON string list. The runner receives a JSON request on stdin and should return JSON with:

- `output`
- optional `execution_kind`: `command` or `model`
- optional `provider` and `model`
- optional `usage.input_tokens`, `usage.output_tokens`, and `usage.total_tokens`

Only runs that return provider/model metadata or `execution_kind: "model"` should count as model-executed. If token usage is absent, the report may estimate tokens, but the estimate must be labeled as estimated.

For local release-gate smoke evidence without external model credentials, use the deterministic runner:

```bash
python3 scripts/yao.py output-exec --runner-command '["python3","scripts/local_output_eval_runner.py"]'
```

This verifies the command-runner contract, timing capture, grading path, and failure handling. It must not be described as provider-backed model evidence.

For provider-backed evidence, use the bundled provider runner with real credentials:

```bash
YAO_OUTPUT_EVAL_MODEL=gpt-4.1-mini \
OPENAI_API_KEY=... \
python3 scripts/yao.py output-exec --provider-runner openai
```

The provider runner calls an OpenAI Responses API compatible endpoint, reads input files relative to `evals/output/`, returns `execution_kind: "model"`, and records observed token usage when the provider returns usage fields. If the API key or model is missing, the runner must fail instead of falling back to fixtures or pretending model evidence exists. Use `--provider-base-url` only for reviewed compatible endpoints; non-default HTTPS hosts require `--allow-custom-base-url`, and plain HTTP is allowed only with `--allow-insecure-localhost` for local test servers.

## Blind A/B Review

Every output eval run should also generate:

- `reports/output_blind_review_pack.md`
- `reports/output_blind_review_pack.json`
- `reports/output_blind_answer_key.json`

The review pack must hide whether Variant A or Variant B came from the baseline or the skill-guided output. The answer key is separate audit evidence and should only be opened after a reviewer has made a judgment.

## Reviewer Adjudication

After blind review, record reviewer choices in `reports/output_review_decisions.json` with `reviewer`, `reviewed_at`, `winner_variant`, optional `confidence`, and a required rubric-based `reason`, then run:

```bash
python3 scripts/adjudicate_output_review.py --write-template
python3 scripts/yao.py output-review
```

The adjudication report writes:

- `reports/output_review_decisions.json`
- `reports/output_review_adjudication.json`
- `reports/output_review_adjudication.md`

When no reviewer decisions exist, the report should say the cases are pending and Review Studio should link to the decisions template. Do not count pending cases as human agreement. Only a real `winner_variant` of `A` or `B` with reviewer metadata and a non-empty `reason` should contribute to agreement rate, disagreement count, and reviewer judgment count.

The adjudication report must preserve blind-review integrity: pending and invalid decisions should show the expected winner as hidden. Only reveal `expected_winner_variant` after a valid reviewer decision with rationale exists for that case.

## Anti-Overfitting

Keep a small public smoke set and a separate holdout set. Rotate real failures into the taxonomy instead of editing only the prompt that failed. Add near-neighbor cases whenever the output looks good but the boundary is still unclear.
