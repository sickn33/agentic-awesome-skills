# derive-tests: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Map each flows-doc journey to the end-to-end spec that exercises it.

- `2026-11-14`, an evals product: all member-action tests mocked the session module. Its coverage map repeatedly named signed-in browser flows as uncovered, while 77 diff-review rounds and nine development deploys proceeded. No test exercised the identity provider's sign-in; an unwritten suite appeared in no review diff.

## Default to deterministic unit, integration and applicable end-to-end suites without a stated gate.

- `2026-11-14`, the owner made end-to-end tests of each stage's changed journeys the default after an evals product built for two weeks without browser tests. Smaller gates remain the owner's choice, recorded in the product plan.
