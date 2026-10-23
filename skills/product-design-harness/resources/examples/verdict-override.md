# Verdict Override Example

The review in `stop-reframe-review.json` returned `stop_reframe`: the
evidence lane found only untraceable founder impressions. The founder
decides to build a scoped internal prototype anyway. This example shows
what that decision looks like when it is done honestly.

Machine-checkable version: `verdict-override.json`. Validate it with:

```
python scripts/check_override.py examples/verdict-override.json \
  examples/stop-reframe-review.json
```

Key mechanics on display:

| Mechanic | Where |
|---|---|
| The verdict is untouched | the review file still says `stop_reframe`; the override is a separate artifact |
| The owner restates the gap | `acknowledged_weakest_flow` must match the review's `weakest_flow` |
| Scope is granted, not assumed | `authorized_scope` allows an internal prototype; customer contact stays banned |
| No scope laundering | a `may_do` entry that repeats the review's `must_not_do` fails the checker |
| Time-boxed by contract | `expires_at` is required; a lapsed override fails the checker and the verdict is back in force |
| Voidable | any tripwire firing voids the authorization immediately |
| Renewal is a review | `renewal_requires` names the evidence a fresh review must see; there is no quiet extension |

One honesty note: this example uses a far-future `expires_at` so the
repository's own CI never starts failing on it. A real override should
expire in days or weeks, not decades - the expiry is the point.
