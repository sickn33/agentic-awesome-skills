# The proposal artifact

**What it is for:** the evidence, hypotheses, alternatives, recommendation and experiment behind what the product should do next. This HTML page is the one record of why; the brief holds accepted intent, the decision log what was chosen.

**Rules**

- **Every claim has a kind and source** (`SKILL.md` § 3). A claim with no source is labelled as the agent's inference or an assumption.
- **Hypotheses keep their IDs for life.** Observations attach to an ID; a refuted hypothesis stays in the record.
- **One current recommendation.** Rewrite it when evidence changes; history lives in the observation log on the page.
- **Each key screen labels its realistic sample data** and displays its matching job number.

## Page sections, in order

Use these sections inside the self-contained HTML file, with the table shapes below rendered as HTML tables. These are page contents, not a second proposal document.

```text
# Proposal: <the idea, in a line>

Updated <YYYY-MM-DD>. Status: <draft | reviewed by the owner on <date> | accepted on <date>>.

## Research

<What the owner shared and what research found, each claim with kind, source and date read.>

| # | Claim | Kind | Source, date read |
|---|---|---|---|
| E1 | <a competitor charges per seat from $12 a month> | observed | <url>, <date> |
| E2 | <"we start with educators"> | owner preference | the owner, <date> |
| E3 | <educators already pay for a similar tool, so they will pay for this> | agent inference, from E1 and E4 | — |

## Alternatives

<Up to five alternatives people actually use, including substitutes and doing nothing. Keep competitors distinct; give each one's benefit, shortfall and source.>

## Segment

<Who this is for, why this segment, and any comparison scores with their scales.>

## Value proposition and value curve

<The value proposition for the chosen segment, and the value curve against the alternatives, each score with its scale and source.>

## Recommendation

<One direction, or two or three when the choice is real: who it is for, the value proposition, what the first version does and deliberately doesn't do, the trade-off, its rough size in builder hours and what it adds to run. Then the one recommended, and why. Rewritten, never appended to.>

<The first version's parts and the next builds on a labelled 3×3 impact-and-effort grid with a legend, "do first" marked (`SKILL.md` §§ 5–6).>

## Jobs map

<For a published method, follow its sourced steps in the brief.>

| # | Job, in the user's words | Screen | Its one question | Primary action |
|---|---|---|---|---|
| 1 | <answer what people upvoted most> | <the host's room> | <what should I answer next?> | <mark it answered> |

## Key screens

<One high-fidelity screen per key job, with matching job number and realistic sample data labelled. Static or clickable as agreed.>

**The owner's preview:** <each key screen and what to inspect on it, before any plan>.

## Open decisions

<Each question: options, each with its rough size in builder hours and what it adds to run; the recommendation and its reason. Support saved viewer picks where the host can, plus copying choices as text for chat.>

## Hypotheses and experiments

| ID | Hypothesis | Rests on | Status | Last evidence |
|---|---|---|---|---|
| H1 | <solo educators will pay monthly for ranked questions> | E1, E3 | untested | — |

<The weakest consequential assumption's ID and what changes in the recommendation if it is wrong.>

| Tests | Who takes part | What they do | What is observed | The result that changes the recommendation |
|---|---|---|---|---|
| H1 | <ten educators from the waitlist> | <run one session with the first version> | <how many pay after the trial> | <fewer than two pay> |

**Observation log on the page:** <dated, appended observations: what people did, the source and the hypothesis IDs they bear on>.

## The plan

<For a complex change that alters what people see or leaves choices open: the key assumptions first, then high-fidelity screens of the flows that change, then the open choices, picked as `SKILL.md` § 7 says.>

<The builder's plan stays in the repository: phases, files per phase, tests and acceptance criteria. Tests touching production, its users or its data need the owner's go.>
```
