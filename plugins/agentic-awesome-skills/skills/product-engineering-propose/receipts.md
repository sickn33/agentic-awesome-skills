# propose: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## When the product implements a published method, write its steps before the use cases.

- `2026-11-03`, an evals product's accepted proposal, brief and UX replan all began with production traces although the method starts earlier; the owner's article had been read only to check quotes, never compared with the plan.

## Gather what people say when the owner wants it.

- `2026-11-01`, an evals product's market research: these rules made its quotes usable, and had to be written into the brief because no skill held them.

## Handle standalone market research here without building a proposal.

- `2026-11-01`, an evals product: such a request took four skills composed by hand, in an order none of them stated.

## Weigh each part of the first version by what people will see against what it costs.

- `2026-11-03`, an evals product spent ten review rounds on hard logic before it had a landing; the owner: "Seeing app with all those elements that costs a little is wow. Debugging hard logic for hours isn't."

## Map jobs before drawing one high-fidelity screen per key job.

- `2026-11-07`, a static discovery page: a cold reader valued the jobs map most; matching numbers connected its rows to screens.

## Apply the `ui-design` skill.

- `2026-11-03`, an evals product's artifact imitated its kit and invented borderless buttons; the owner caught those and misaligned chips.

## Charts follow `dataviz`'s rules in any agent.

- `2026-11-07`, a static discovery page: a scatter was unreadable; a labelled 3×3 grid with a legend read clearly.

## Fresh eyes before the owner: a fresh session reads the page first.

- `2026-11-07`, a static discovery page: screenshots alone exposed a reversed label, a band contradicting its chart title and screens disconnected from jobs.

## Ask these questions only here and keep decisions with the owner.

- `2026-09`, a live Q&A product: the agent asked "what if there is a single user and no moderator?", and the answer, moderated by default with a switch to turn it off, went into the build prompt.

## Build one self-contained HTML page with research, decisions and key screens.

- `2026-10-16` to `2026-10-21`, a monitoring product. Competitor and market research over three days led to a first-version spec the owner reviewed (`2026-10-18`), then a prototype of every screen on simulated data, then the build. A pre-order test was dropped for a narrower first version that works. No tickets anywhere: the reviewed artifact was the unit of work.

## Agree on static or clickable screens and build no separate prototype.

- `2026-11-07`, the author dropped the separate prototype: "building an app like the first version that works is like what? A few hours." Screens "perhaps with some dynamic elements, perhaps clickable" in one artifact with the research and the decisions are enough, and the plan for a complex change grows the same page.

## Show rough builder-hour size and lasting obligations beside every option.

- `2026-11-16`, a live Q&A product: plan options omitted their size. The build then added about 1,500 TypeScript lines, 800 SQL lines and 2,250 test lines. Owner: "that’s too complex". Documents moved to an existing accounting tool while the product kept its page. Asked whether options should show rough sizes, the owner answered "Yes".

## For a new product, optimize the time to learn, not completeness.

- `2026-11-19`, owner: "Overall, with new products we want to optimize time to learn rather than making the product perfect. Still we want to have a product that will convince the first users enough to stay and possibly upgrade. But we don't get there by implementing 50 feature." Said after a seven-stage build of an agent product spent nine review rounds on one stage before anyone used it.

## Mark every requirement by its evidence: seen in use, asked for by a named person, or assumed.

- `2026-11-19`, an agent product (an editor extension, a desktop app and a web relay): a release approval was specified to end up right after every restart, deletion and failed load of its conversation, for a feature nobody outside the build had used. One sentence would have served a first version: restarting a release chat asks for the approval again. The owner, on another new product that validated every automated judge against human labels before real use: "did we really need validated evaluators at this point?"

## A product charges its first real users unless the owner makes it free.

- `2026-11-19`, owner, asked when first users can upgrade: "Plus real billing from the beginning. 100% free products are an exception". Until then `app-lifecycle` let billing wait until the product was worth it, with no price on a public page, so a first version learned whether people stayed and never whether they paid.
