# Adoption Guide

How an agent team installs UX3 Product Design Harness, and what "installed"
means for a repository.

The goal is not more process. The goal is fewer polished artifacts built on
weak assumptions.

## 1. Install

| Step | Action |
|---|---|
| 1 | Clone or vendor this repository. It is prompts, schemas, and agent definitions; there is no runtime service to deploy. |
| 2 | Confirm the copy is intact: `python3 -m venv .venv`, then `.venv/bin/python -m pip install -r requirements-dev.txt`, `.venv/bin/python -m unittest discover -s tests`, `.venv/bin/python scripts/validate.py`, and `.venv/bin/python scripts/check_review.py examples/quick-gate-review.json`. |
| 3 | Install with `npx skills add cis2042/ux3-product-design-harness -g -y`, or copy `skills/product-design-harness/SKILL.md` together with its `resources/` directory into the agent configuration. |
| 4 | Wire `prompts/start-review.md` from a full clone, or `resources/prompts/start-review.md` from an installed skill, as the entry prompt for every product review. It selects Quick Gate, Standard Gate, or UX3 Council. |
| 5 | Register the reviewer agents from `agents/registry.json` in a full clone, or `resources/agents/registry.json` from an installed skill. Each entry names its instruction file, input schema, and output schema, so any agent runtime can load them. |
| 6 | Validate every review output with `scripts/check_review.py` in a full clone, or `resources/scripts/check_review.py` from an installed skill, and reject anything invalid. JSON Schema checks shape and conditional branches; `check_review.py` also enforces worst-verdict, weakest-flow, and headline-tier semantics. |

## 2. Continuous Validation In CI

- Add a CI job that validates stored review results with `scripts/check_review.py`
  before anyone acts on them.
- Reuse this repository's workflow as a template:
  `.github/workflows/validate.yml` runs the test suite plus
  `scripts/validate.py` on every push and pull request.
- Use the golden examples as fixtures: `examples/quick-gate-review.json`,
  `examples/standard-gate-review.json`, `examples/ux3-council-review.json`.
- Record human decisions with `schemas/human-decision.schema.json` so every
  review links to an accountable decision record and back, with reversal
  conditions.

## 3. First Integration: Standard Gate On One Feature

Do not roll the harness out everywhere at once. Run one real feature through
Standard Gate:

1. Pick one upcoming feature.
2. Fill `templates/product-brief.md`.
3. Run `prompts/gate-review.md` in Standard Gate mode.
4. Validate the result with `scripts/check_review.py`.
5. Record the human decision in `templates/decision-log.md` (machine form:
   `schemas/human-decision.schema.json`).
6. If the verdict is `continue`, create `templates/context-pack.md` and hand
   it to execution.

Then widen: Quick Gate before small reversible changes, UX3 Council for
high-uncertainty or expensive decisions.

## 4. Live Coding Adoption

Live coding teams should use `docs/LIVE-CODING.md` as the operating guide.
The shortest safe path is:

| Step | Action |
|---|---|
| 1 | Select the working language and keep identifiers in English. |
| 2 | Convert the request into a product brief before coding. |
| 3 | Run the smallest responsible review mode. |
| 4 | Validate the review with `scripts/check_review.py`. |
| 5 | If the verdict is `continue`, create and validate a context pack. |
| 6 | Implement only inside the context-pack execution boundary. |
| 7 | If scope, data, risk, or affected people change, pause and run review again. |
| 8 | Classify post-build feedback as evidence for the next iteration. |

Use the golden chain as the first fixture:
`examples/live-coding-product-brief.json`,
`examples/live-coding-review.json`, and
`examples/live-coding-context-pack.json`.

## 5. What "Installed" Means

A repository has installed the harness when all of the following are true:

| Check | Evidence |
|---|---|
| Entry prompt wired | Agent configuration references `resources/prompts/start-review.md`, directly or via the installed skill. |
| Outputs validated | Every review result is validated with `scripts/check_review.py` before it is acted on. |
| CI rejects invalid results | A CI job fails on invalid review results, including semantic weakest-flow and headline-tier mismatches. |
| Decisions traceable | Human decisions are recorded against `schemas/human-decision.schema.json` with the review id, an accountable owner, and reversal conditions. |
| Context packs gated | Context packs are created only after a `continue` verdict. |
| Live coding bounded | Coding begins only from a validated `schemas/context-pack.schema.json` artifact. |

## 6. Team Ritual

| Moment | Harness action |
|---|---|
| Before writing requirements | Fill product brief. |
| Before prototype or build | Run gate review. |
| Before launch | Run uncertainty review. |
| After learning | Update decision log and evidence ledger. |
| Before scaling | Run UX3 Council. |

## 7. Common Anti-Patterns

| Anti-pattern | Correction |
|---|---|
| Building because it is easy. | Run Business Flow and Evidence Flow. |
| Treating a quote as proof. | Separate quote, behavior, log, and counter-signal. |
| Averaging reviewer verdicts. | Let the weakest flow control the next step. |
| Skipping human judgment. | Route taste, risk, strategy, ethics, and meaning to humans. |
| Creating broad context packs. | Narrow scope and add stop conditions. |
| Treating live-coding prompts as approval. | Require a valid review and context pack before implementation. |

## 8. For Product Designers And PMs

You adopt this harness by instructing your agent, not by learning the
contracts. Paste the repository URL to your agent and ask it to review a
product decision; the agent installs the harness, runs the review, and
returns one of three verdicts: `continue`, `verify`, or `stop_reframe`.
Your job is to supply the decision, the evidence you actually have, and
the human judgment calls the agent routes back to you. You never run the
scripts, write JSON, or read schemas by hand - if an integration step on
this page looks technical, it is your agent's job, not yours.
