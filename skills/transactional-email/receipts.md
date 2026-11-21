# transactional-email: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Apply these mechanics to any provider with an HTTP send API.

- `Undated`: It was learned on a monitoring product that sends alert email (an incident opened, an incident resolved, a test) through Postmark, over its HTTP API with plain `fetch`, from a scheduled sender, named here only by kind.

## The event and its pending message commit together.

- `2026-10-22`, a monitoring product: its incidents table's trigger adds the alert to an outbox. Its writers were the owner of its definer functions and the server's secret key, which could already insert the outbox, so they needed no change and gained no privilege. A restricted writer needs a definer trigger: `references/delivery.md § The outbox`.

## Ask only after the lease has run out.

- `2026-10-22`, a monitoring product's drill against the real API: a message first appeared 4 to 10 seconds after acceptance, then answered found and not found by turns for a few seconds more. An earlier version of the drill asked as soon as the message first appeared, got "not found" on the next call, and sent a second copy.

## There is no exactly-once. Name what remains.

- `Undated`: Neither was seen in the product this came from, but its own notes say both can happen. The two cases were a provider accepting a request beyond the lease or idempotency key's lifetime, and a search not settled when asked.

## Mail scanners open links.

- `2026-10-22`, a monitoring product: a review found the one-click route acting on a `POST` without RFC 8058's body; it now refuses one.

## One provider server (or account, or project) and token per environment.

- `2026-10-24`, a monitoring product gave production its own Postmark server and token at go-live.

## Development sends every email to the provider's discard address, and production refuses that setting.

- `2026-10-23`, a monitoring product's backlog: nothing refused its redirect in a production build or the production sender's deploy, and its pre-go-live box for it was still unchecked a day later.

## Verify the sender domain in the provider before the first send.

- `2026-10-24`, a monitoring product's infrastructure pass listed its monitoring-only DMARC among the defaults to tighten.

## Drill the provider's real API before production, using only discard addresses.

- `2026-10-22`, a monitoring product's drill found the search's flicker this way.

## Run production's own drill before customers rely on it.

- `2026-10-24`, the same product listed "production's alert path never drilled" as a top risk: the first real incident would otherwise be the first test of delivery.
