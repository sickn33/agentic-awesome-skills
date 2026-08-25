# Adaptive learning design

Use this reference for a course, onboarding path, curriculum, or any explanation
the learner will revisit across sessions. A course is not a playlist. It is a
stateful teaching system that changes what comes next based on demonstrated
understanding.

## Start with the learner contract

Write `learning/LEARNER.md` before outlining lessons:

```markdown
# Learner contract: <topic>

## Purpose
<The concrete work, decision, or life outcome this learning should enable.>

## Finish line
- <An observable capability the learner can demonstrate>
- <Another observable capability>

## Starting point
- <Relevant prior knowledge, with whether it is claimed or demonstrated>

## Constraints
- <Time, accessibility, tools, budget, language, or delivery constraints>

## Exclusions
- <Adjacent material intentionally deferred>
```

Keep this shorter than a page. Prefer an observable capability over “understand
X.” If the user already supplied enough context, synthesize it without adding
an approval gate. Ask only when a missing answer would materially change the
course.

## Maintain four kinds of learning state

Store the state under `learning/`:

- `LEARNER.md`: purpose, finish line, starting point, constraints, exclusions,
  and teaching preferences.
- `GLOSSARY.md`: the course’s canonical terms and short definitions.
- `RESOURCES.md`: a curated, annotated ledger of primary and authoritative
  sources, including known evidence gaps.
- `records/NNNN-<slug>.md`: durable changes in the learner model.

A learning record is not a session log. Write one only when evidence changes
what should be taught next:

- The learner demonstrated a non-trivial capability.
- A claimed prerequisite was confirmed or disproved.
- A misconception was identified and corrected.
- The purpose or finish line changed.

Each record contains the observation, the evidence, and the consequence for
future lessons. Supersede a stale record rather than deleting history.

Do not treat content exposure, video completion, or a correct guess as mastery.

## Track mastery as evidence, not a percentage

For each objective, use one of these states:

| State | Meaning | Suitable evidence |
|---|---|---|
| `unseen` | Not introduced | None |
| `introduced` | Learner encountered the model | Viewing or reading only |
| `practiced` | Learner used it with support | Guided task with feedback |
| `demonstrated` | Learner applied it independently | Transfer task or explanation |
| `needs-review` | Retrieval weakened or a misconception resurfaced | Failed delayed check |

Progress percentages may be shown for navigation, but lesson selection must use
objective state, prerequisites, misconceptions, and the learner’s purpose.

## Design one lesson around one useful win

Keep the core lesson within working-memory limits. A lesson may contain several
scenes, but it should make one capability measurably stronger.

Use this sequence when it fits:

1. **Retrieve.** Ask for a brief recall or prediction before revealing the
   answer.
2. **Orient.** Tie the lesson to the learner’s purpose and prior model.
3. **Explain.** Build one causal or procedural mental model.
4. **Demonstrate.** Work through a concrete example while narrating decisions.
5. **Practice.** Give the learner a small task with immediate, specific
   feedback.
6. **Transfer.** Change the surface details and require independent use.
7. **Consolidate.** Compress the model, name the next dependency, and schedule
   retrieval.

Knowledge acquisition should be clear and low-friction. Practice should be
effortful enough to reveal understanding. Do not manufacture difficulty through
trick wording, decorative interaction, or ambiguous choices.

## Use checks diagnostically

Every check declares:

- The objective it measures.
- The expected reasoning, not only the answer.
- Evidence IDs supporting the answer.
- Feedback for the correct answer and each plausible misconception.
- Whether it measures recall, application, discrimination, or transfer.
- The mastery-state transition it can justify.

Keep multiple-choice options parallel in grammar, length, and visual treatment.
Avoid clues caused by one answer being more detailed than the others.

End each module with application or synthesis. Revisit important objectives
after a delay and interleave related skills when that improves discrimination.

## Reuse teaching components

Store reusable lesson components under `assets/`: course typography, diagram
tokens, quiz widgets, simulators, code walkers, equation builders, and feedback
patterns. Read the existing asset ledger before creating a new component.

Reuse should create a coherent learning environment, not identical lessons.
Keep entity colors and interaction meanings stable while varying the visual
framing needed by each concept.

## Adapt the next lesson

Before generating or refreshing a lesson:

1. Read the learner contract and active learning records.
2. Identify prerequisite objectives and their current evidence state.
3. Choose the smallest next capability that advances the finish line.
4. Prefer a retrieval activity when prior learning is due for review.
5. Record newly demonstrated capabilities only after the learner provides
   evidence.

For a static public course with no individual learner history, ship an explicit
default path plus optional prerequisite checks and remediation branches. Do not
pretend that anonymous completion data proves mastery.
