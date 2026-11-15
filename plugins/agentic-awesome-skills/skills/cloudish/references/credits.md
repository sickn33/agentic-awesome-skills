# Cloudish credits

Everything to do with credits: which key to use, what to do when one runs
out, claiming, and moving credits between keys. Every call
authenticates with `Authorization: Bearer $CLOUDISH_API_KEY`, same as
SKILL.md.

## Which key to use

Keep each project's key with that project, and reuse it instead of minting
a new one (minting is SKILL.md section 0).

A key per project folder keeps each project on its own balance, so one
running out never stops another, and its alias tells a human which project a
key, a claim link or a `402` is about. Related projects can instead share
one key, or hang under one as child keys (below), so their costs are funded
and capped from a single balance.

The requested alias is best-effort: lowercase letters, digits and hyphens
(anything else is normalized), and if it's taken you get a close variant
such as `todo-app-otter`. Always use the `apiKey.alias` that comes back.

## Checking a balance

```bash
curl https://cloudish.ai/api/v1/credits -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "balance": 4.2, "granted": 5, "spent": 0.8, "quota": null, "spentToday": 0.3 }
```

`GET /api/v1/credits/transactions` lists every grant, transfer and usage
charge behind that number.

A key never goes below zero. Usage is charged only up to the balance the
key holds, and whatever runs past it is never owed, so credits added after
a key runs out all land: a key at `0` that adds 10 credits has 10.

## When a key runs out

A request billed to an out-of-credit key returns `402` with the alias of
the key that ran out:

```json
{ "error": "This API key is out of credits — ...", "alias": "todo-app", "docs": "https://cloudish.ai/credits.md" }
```

The alias names the key that pays for the request — the project owner's,
whoever calls it — so match it against each project's saved alias to know
which project's key needs credits. Then, from that folder, mint a claim link
for that key yourself and hand your human the URL itself — never the
command to mint one — naming the alias so they know which project it's for:

```bash
curl https://cloudish.ai/api/v1/credits/claim -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "url": "https://..." }
# -> tell your human: "This adds credits to todo-app (this folder's key): https://..."
```

The link is single-use and expires 30 minutes after it's minted, so mint it
right when you hand it over and say that it expires; if your human comes
back later or the page says it expired, mint a new one. Where
the credits come from — a purchase, or a balance your human already holds
elsewhere — is handled on that page; you never need any key other than this
folder's own, so don't ask your human for one.

A `402` saying a daily usage quota was reached is different: the key still
has credits but hit its rolling 24-hour quota, and recovers on its own as
that window moves.

## Moving credits between keys

Any key can send part of its balance to another key by alias, no admin
needed — authenticate as the sending key:

```bash
curl -X POST https://cloudish.ai/api/v1/credits/transfer \
  -H "Authorization: Bearer $SENDING_API_KEY" -H "content-type: application/json" \
  -d '{"to": "todo-app", "amount": 5}'
# -> { "ok": true, "balance": <sender's remaining balance>, "reference": "<ledger id>" }
```

Funding keys under yours (below) is yours to do: it's how you delegate work
without handing out your own key.

## Keys under a key

Minting a key *with* a key makes it a child of that key — same account, no
free grant of its own. Hand one to a sub-agent or a container instead of
your own key, and fund it by transfer; a `receive` limit (below) caps what
it can get:

```bash
curl -X POST https://cloudish.ai/api/v1/keys -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -H "content-type: application/json" -d '{"alias": "todo-app-worker"}'
# -> { "apiKey": { "alias": "todo-app-worker", "parent": "todo-app", ... }, "key": "cld_..." }
```

A key or any key above it can delete it (`DELETE /api/v1/keys/{alias}`):
it and everything under it stop working, and their balances move to its
parent. Root keys (no parent) can't be deleted.

A key above another can cap what crosses that key's boundary — received
from anywhere outside it, including its parent, or sent outside it — in any
rolling window, in seconds. A key can never set its own limits:

```bash
curl -X PUT https://cloudish.ai/api/v1/keys/todo-app-worker/limits -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -H "content-type: application/json" \
  -d '{"limits": [{"direction": "receive", "windowSeconds": 3600, "max": 5}]}'
```

Transfers between keys of one account don't count against the account's own
limits, only those it set on the keys involved. A transfer, purchase or claim
over a limit answers `429` with `code: "limit_exceeded"`, the key whose
limit it was, the window, and what's left. `GET /api/v1/credits/flow` shows
what your key received and sent in the last hour, day and 30 days, and what
it may still receive or send outside its account.
