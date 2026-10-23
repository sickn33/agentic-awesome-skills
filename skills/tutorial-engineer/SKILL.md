---
name: tutorial-engineer
description: Creates step-by-step tutorials and educational content from code. Transforms complex concepts into progressive learning experiences with hands-on examples.
risk: safe
source: community
date_added: '2026-03-02'
metadata:
  version: '2.0.0'
---

# Tutorial Engineer

Turn a specific codebase or feature into a progressive, hands-on tutorial. Preserve the useful teaching sequence: show a worked example, guide practice, then give an independent challenge.

## When to Use

- Explain code through a tutorial, onboarding exercise, workshop or cookbook recipe.
- Convert a feature into a learning path with measurable outcomes and checkpoints.
- Improve a tutorial whose setup, pacing or examples prevent readers from finishing.

Use reference-documentation workflows for exhaustive API listings and marketing workflows for promotional copy.

## Inputs and Scope

Resolve the topic/source code, audience’s prerequisite knowledge, desired outcome, runtime/version, format and time constraint. Infer available facts from the request; ask only essential unanswered questions. State assumptions. Do not invent exact completion times or performance/retention improvements. Use the project’s actual supported environment, rather than installing the latest release by default.

## Procedure

1. Define an observable objective: “After this tutorial, the reader can build/debug X and verify Y.” Identify what remains outside scope.
2. Inspect the actual source and primary docs. Record versions and permissions. Prepare an isolated local sandbox with synthetic fixtures; explain any install, credential, cloud-cost or cleanup effect before the reader encounters it.
3. Map prerequisites into a sequence. Introduce one new idea at a time; link an optional primer for background. Label architecture diagrams and pseudocode as such.
4. Start with the smallest complete example. Include its filename, imports, run command, expected result and supported versions. Explain non-obvious lines and why the approach works.
5. Add guided practice with a checkpoint after each material change. Specify observable state, not “it should work.” For deliberate errors, mark them clearly and show the exact recovery path.
6. Add an independent challenge with requirements, hints, a solution and success criteria. Keep the answer separate so readers can attempt it first.
7. Verify examples in order from a fresh authorized environment when feasible. Distinguish executed checks from static inspection and untested snippets. Do not claim screenshots, links or code were tested without evidence. A blocked environment is a reported limitation.
8. Close with the demonstrated outcome, unresolved limitations and concrete next steps. Deliver the tutorial artifact when requested; publishing or sending it is a separate authorized action.

## Worked Example

For a beginner learning filtering, use a local file with no dependencies or network access:

```python
# active_users.py — Python 3, synthetic data
users = [{"name": "Ada", "active": True}, {"name": "Bo", "active": False}]
active_names = [user["name"] for user in users if user["active"]]
print(active_names)
```

Run `python3 active_users.py`. Expected output: `['Ada']`.

Explain that the condition retains only active records and the expression selects their names. Guided practice: add an active user named Cy; checkpoint output is `['Ada', 'Cy']`. Challenge: produce the inactive names instead; expected output is `['Bo']`. Edge check: an empty input must produce `[]`. This is an illustrative teaching example; actual execution is not asserted by this document.

## Output Contract

Produce Markdown with:

- Title, observable objectives, audience, prerequisites and an estimated time explicitly labeled as an estimate.
- Setup with versions, filenames, commands and cleanup instructions for the isolated environment.
- Ordered concept → example → practice sections with expected outputs.
- An independent challenge, hints and a separate solution.
- Troubleshooting table mapping error → likely cause → verified recovery.
- Validation evidence (environment, commands, results), untested items and limitations.
- Next steps and primary-source links actually consulted.

Use hierarchical headings, meaningful image alt text and text labels alongside color. Keep code readable; split long examples into named files rather than hiding required lines.

## Teaching Patterns

Use worked examples, practice, feedback, revisiting earlier concepts and familiar analogies as design choices. Their effects depend on the audience and task; do not attach unsupported retention percentages or promise a fixed speed improvement. Time estimates should come from a pilot or be labeled provisional. Avoid presenting fixed “learning styles” as a diagnosis of an individual learner.

## Quality Checks

- Each objective maps to a checkpoint or exercise.
- No required setup appears only halfway through.
- Required examples are complete; fragments and pseudocode are labeled.
- Deliberate errors cannot modify production data, publish content or expose secrets.
- Expected output matches the synthetic fixture and stated version.
- Install and API examples come from current trusted sources; secrets stay outside tutorial files and recordings.
- A novice can follow the sequence without missing concepts. If no audience pilot occurred, state that limitation.

## Limitations

- A tutorial is not exhaustive API reference or evidence of production readiness.
- Static review does not establish runtime correctness, pedagogy outcomes or accessibility conformance.
- Exact tool behavior and setup depend on the user’s environment; report unresolved dependencies and checks honestly.
