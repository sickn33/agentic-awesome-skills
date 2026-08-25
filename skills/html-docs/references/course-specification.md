# Course specification and production map

Use this reference before authoring a multi-lesson course or a large
document-video project. The specification captures decisions; the production
map turns them into independently verifiable teaching slices.

## Write the course specification

Create `COURSE-SPEC.md` from the conversation, source snapshot, learner contract,
and codebase or site context. Do not repeat questions the user has already
answered.

```markdown
# Course specification: <title>

## Learning problem
<What the learner cannot reliably do today and why it matters.>

## Learner and finish line
<Audience, starting point, purpose, and observable final capabilities.>

## Learner journeys
1. As a <learner>, I want to <practice or understand>, so I can <real outcome>.

## Teaching decisions
- <Sequence, mental models, examples, terminology, remediation, pacing>

## Artifact decisions
- <What belongs in pages, videos, interactives, references, and assessments>

## Evidence and uncertainty
- <Source boundaries, disputed claims, assumptions, and evidence gaps>

## Assessment decisions
- <How each final capability will be demonstrated through external behavior>

## Accessibility and delivery
- <Captions, keyboard, contrast, reduced motion, language, device constraints>

## Exclusions
- <Explicitly deferred topics or editor capabilities>

## Open decisions
- <Only questions whose answers can change the design>
```

Keep implementation details at the level of stable interfaces and behavior.
Avoid volatile file paths and speculative code. When a prototype resolves a
decision more precisely than prose, preserve only the decision-bearing part and
link the prototype.

## Choose the highest useful validation seams

Define a small set of observable seams:

- Source evidence becomes a correctly qualified claim.
- A lesson objective becomes an explanatory page/video and a diagnostic check.
- Final audio becomes the shared word, cue, caption, scene, and chapter clock.
- A learner response becomes specific feedback and a justified mastery update.
- A changed source marks only dependent lessons stale.
- A private project becomes a playable course preview.

Prefer these end-to-end seams over tests of internal prompt phrasing or
implementation details.

## Slice production vertically

Create one file per slice in `production/`, numbered in dependency order:

```markdown
# 01 — <slice title>

## Learner-visible result
<A complete behavior or lesson the learner can use and the producer can review.>

## Depends on
<Earlier slice titles, or “Nothing”.>

## Acceptance
- [ ] <Evidence-grounded, externally verifiable criterion>
- [ ] <Page/video/check/player criterion>

## Source scope
<Evidence IDs and source dependencies used by this slice.>
```

A normal slice cuts through the full production path: evidence, lesson model,
page, visual explanation, narration, synchronization, checks, and audit. It
must be demoable on its own and small enough for one focused agent session.
Avoid horizontal tickets such as “write every script” or “render every video.”

Use an expand–migrate–contract sequence only for a wide mechanical format
change that cannot remain valid one vertical slice at a time.

## Represent dependencies explicitly

Every slice and lesson lists what blocks it. The ready frontier is the set whose
dependencies have passed. Build from the frontier rather than following a
large unchecked list.

Use names in human-facing reports; IDs remain machine references. A dependency
exists only when its result is genuinely required.

## Map uncertainty without pretending it is resolved

For a course too large or uncertain to specify in one pass, add a decision map
to `COURSE-SPEC.md`:

- **Destination:** the observable state that ends planning.
- **Decisions made:** one-line conclusions linked to their evidence or
  prototype.
- **Open decisions:** precise questions that can be answered now.
- **Unresolved territory:** in-scope areas that are still too vague to phrase
  as decisions.
- **Exclusions:** work outside the destination.

Resolve research questions with primary sources. Resolve behavior or visual
questions with the cheapest useful prototype. Promote unresolved territory to
a decision only when the question becomes precise. Stop planning when the
remaining work is execution.

## Course-production gate

Before building:

- The learner contract has an observable finish line.
- The course specification resolves artifact and assessment roles.
- Every lesson is a vertical teaching slice with explicit dependencies.
- Every planned claim has evidence or is marked as an unresolved gap.
- Each final capability has an external demonstration.
- The first frontier lesson is independently buildable and reviewable.

After building, compare the implementation with both axes:

1. **Craft:** source accuracy, teaching clarity, visual explanation, narration,
   synchronization, accessibility, and deterministic playback.
2. **Specification:** learner journeys, finish line, exclusions, artifact
   decisions, and acceptance criteria.

Passing craft checks does not excuse building the wrong course. Matching the
specification does not excuse a weak learning experience.
