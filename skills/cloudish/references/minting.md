# Mint tokens: a key on first deploy, not at start

An advanced option, for an orchestrator that starts many agents which may
never deploy anything. Normally an agent gets a key and keeps it. A **mint
token** is the other way round: the agent starts with a token that cannot
spend, read or deploy anything, and trades it for a real child key only when
it actually needs to deploy.

```text
orchestrator key  --POST /mint-tokens-->  mnt_...  (handed to the agent)
agent             --POST /keys--------->  cld_...  (on first deploy)
```

The token is issued by a key and can do exactly one thing: mint a child of
that key. It is not a key, cannot be used on any other endpoint, and never
appears in a claim link. If an agent never deploys, nothing was minted and
nothing was spent.

An **alias is not a credential.** Never send `{"parent": "some-alias"}` to
`POST /api/v1/keys` expecting it to attach the key: aliases are public (they
appear in project paths, `402` messages and claim errors), so anyone could
mint into anyone's account. Only the token, or a real key, authenticates.

## Issue a token

Called by the key that will own the children (or the key under which an
existing account hangs), with `Authorization: Bearer $CLOUDISH_API_KEY`:

```bash
curl -X POST https://cloudish.ai/api/v1/mint-tokens \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"label": "job-abc", "aliasPrefix": "job-abc", "maxChildren": 20,
       "expiresInMinutes": 720, "childCredits": 1,
       "childLimits": [{"direction": "send", "windowSeconds": 86400, "max": 5}],
       "childDailyQuota": 2}'
# -> { "token": "mnt_do_...", "mintToken": { "id": 1, "active": true, ... } }
```

`token` is shown once; Cloudish stores only its hash. Every field is
optional; `expiresInMinutes` defaults to a day.

| field | bounds the agent |
|---|---|
| `maxChildren` | how many keys the token may mint (1 to 1000; unlimited if omitted) |
| `expiresInMinutes` | when it stops working (default 1440, at most 43200 — 30 days) |
| `aliasPrefix` | names children `prefix-requested`; naming only, never authentication |
| `childCredits` | credits moved from the issuer's balance to each child as it is minted (0 if omitted — the child then starts empty) |
| `childLimits` | credit-flow limits copied onto every child, like `PUT /api/v1/keys/{alias}/limits` |
| `childDailyQuota` | a daily spend ceiling stamped on every child, which the child cannot raise or remove |

A child has its own balance — it does not draw on the account's directly —
so set `childCredits` to at least what a deploy costs, or fund the child
later with `POST /api/v1/credits/transfer`. Include a `send` limit and a
daily quota too: a child key can transfer credits out of the account
([credits.md](credits.md)), and limits on credit movement do not cap
usage by themselves.

## Give it to the agent

Put the token in the agent's environment, never in a URL, a query string, a
log or the build context:

```bash
CLOUDISH_MINT_TOKEN=mnt_do_...
CLOUDISH_PARENT_ALIAS=job-abc     # optional; for the agent's own logs only
```

On the first call that needs a key:

```bash
curl -X POST https://cloudish.ai/api/v1/keys \
  -H "Authorization: Bearer $CLOUDISH_MINT_TOKEN" -H "content-type: application/json" \
  -d '{"alias": "todo-app", "agent": "claude-code"}'
# -> { "key": "cld_do_...", "apiKey": { "alias": "job-abc-todo-app", "parent": "job-abc", ... } }
```

The result is an ordinary child key: same account, no free grant, funded
with `childCredits` from the issuer if the token sets any. Use it exactly
like a key from [SKILL.md](../SKILL.md) for the rest of the run. There is
no claim step — a child already belongs to the account, so `claimUrl` is
null.

An agent that starts with a mint token and then calls another agent can
give the child its own key (or another mint token issued under it). Each
level can only tighten the daily quota, never loosen it.

## What a leaked token can and cannot do

If the token leaks, whoever has it can mint children of that one key, no
more than `maxChildren`, until it expires or is revoked — and each mint
can move up to `childCredits` from the issuer's balance into a child the
attacker then controls. It cannot read existing projects, deploy to them,
change the account or use any endpoint other than `POST /api/v1/keys`.
Bound the damage with low `childCredits` and `maxChildren`, a short
`expiresInMinutes`, the child limits, and revocation.

Revoke it (the issuing key or a key above it):

```bash
curl -X DELETE https://cloudish.ai/api/v1/mint-tokens/1 -H "Authorization: Bearer $CLOUDISH_API_KEY"
```

`GET https://cloudish.ai/api/v1/mint-tokens` lists the tokens issued by that key and
everything below it. Revoking stops new mints; children already minted are
kept and keep running (delete those individually if they should go).

## When not to use one

If the orchestrator can just mint a child key before starting each agent,
that is simpler: the agent starts with a key it can use immediately. A mint
token is worth it only when agents are started in bulk, before it is known
which of them will deploy, and the extra provisioning call per agent is the
thing to avoid. A claim link is unrelated: it attaches an anonymously
minted key to a human's account, while a mint token attaches a child to an
account with no human involved.
