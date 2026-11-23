# start-here: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Fetch first, because a checkout behind its remote describes the past.

- `2026-10-28`, a session read a product's docs from a checkout six days behind and reported its DNS provider as not set up, days after it had been.

## A test touching production, its users or its data runs only with your go.

- `2026-09-14`, a live Q&A product: asked for a per-IP rate limit, the plan's test section said the host's limits exist only on the host and couldn't be tested locally. The owner ran the plan with a test there, last: it sent requests from the tester's own address until the host refused one with HTTP 429, which blocks only that address for a minute, then checked that pages still loaded. Both limits were confirmed that way.

## Try visible phases after their checks; owner absence does not block coding.

- `2026-10-22`, a monitoring product: its review came back clean overnight; ten minutes of its owner using a preview that morning found six problems no review had, and each fix went back through review.

- `2026-11-16`, owner: phase previews follow the checks, while owner absence should not block the next phase. Early previews remain available when requested.

## The agent recommends stopping to use the product once it does its key job.

- `2026-11-19`: see `app-lifecycle`'s receipt of the same rule. The owner: "So maybe it's not about reviews, but also analyzing requirements and ordering requirements, which go to which phase and when you suggest me to stop and test it with the users early".
