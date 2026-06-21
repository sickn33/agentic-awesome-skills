# Evals — does the skill actually route to the right answer?

A skill is only as good as an agent's ability to *find and apply* the right entry under a real
problem. These evals test that, in two tiers, against a fixed set of realistic scenarios
([`cases.jsonl`](cases.jsonl)) spanning both halves of the skill (remote-GPU operations on every
platform family + the DL-training-debug layer, including the `convergence-debugging` and
`data-pipeline` files).

## Tier 1 — structural reachability (runnable, no API key)

```bash
python evals/run_evals.py        # exits non-zero if any case regresses
```

For each scenario it asserts the answer is **present, at the documented location, with the
expected entry IDs / keywords intact**: every `expect_files` exists, every `expect_ids` is still a
`### <ID>` header there, every `expect_grep` term is still in the text. This is a **drift guard** —
it catches a renamed/removed entry, a moved section, a deleted file, or a fact rewritten away from
its key term. Run it in CI; it needs nothing but Python 3.

What it does **not** prove: that an agent actually *navigates* there (Tier 2), or that the platform
*facts* are correct on a live box (see Verification status).

## Tier 2 — agentic navigation (the gold standard)

The real test: give a **fresh agent** the skill and one scenario's `prompt`, let it navigate **from
SKILL.md only** (following the documented routing, not blind grep), and check it reaches a correct,
specific answer covering the case's `must_cover` points within ~2 hops. Each case records its last
such run in the `agentic` field; the collected runs are in [`RESULTS.md`](RESULTS.md).

To re-run Tier 2 with any agent/harness: load the skill, paste a case `prompt`, and grade the
answer against `expect_files` / `expect_ids` / `must_cover`. (Anthropic's skill best-practices
recommend ≥3 evals across Haiku/Sonnet/Opus — re-running these cases per model is the way to meet
that bar; results to date were gathered on the development model and are labelled as such.)

## Adding a case

Append one JSON object per line to `cases.jsonl`:

```json
{"id": "kebab-id", "prompt": "the user's situation, verbatim-ish",
 "expect_files": ["references/training/<file>.md"], "expect_ids": ["O7"],
 "expect_grep": ["lr finder"], "must_cover": "the key points a correct answer must hit",
 "agentic": "PASS/FAIL (date): the navigation path observed"}
```

Use `expect_ids` for the training catalogs (they have `### O7 / DP1 / M17 …` headers) and
`expect_grep` for platform profiles (which are section-structured). Then `python evals/run_evals.py`.

## Verification status (important)

These evals test **retrieval and routing inside the skill** — not the truth of the platform facts
on a live instance. Only the AutoDL profile is battle-tested by the author; the other six platform
profiles are researched from official docs + community reports and **not yet live-validated** (see
the repo README's "Verification status" and `references/self-improvement.md` §5). A case passing
here means "the skill leads an agent to *this documented answer*," not "this answer was confirmed on
a rented box."
