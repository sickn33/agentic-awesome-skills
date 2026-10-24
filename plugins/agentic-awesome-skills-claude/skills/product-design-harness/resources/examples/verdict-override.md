# Verdict Override Example

The review in `stop-reframe-review.json` returned `stop_reframe`: the
evidence lane found only untraceable founder impressions. The founder
chooses a paper-only prototype using synthetic tickets; product code remains forbidden. This example shows
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
| Scope is recorded, not self-authorized | `authorized_scope` describes paper-only work; product code and customer contact stay banned |
| Limited text conflict detection | exact normalized duplicate entries fail; paraphrases and broader semantic conflicts need human review |
| Time-boxed by contract | `expires_at` is required; a lapsed override fails the checker and the verdict is back in force |
| Voidable by policy | tripwires require an external observer; the checker does not monitor them |
| Renewal is a review | `renewal_requires` names the evidence a fresh review must see; there is no quiet extension |

One honesty note: this example uses a far-future `expires_at` so the
repository's own CI never starts failing on it. A real override should
expire in days or weeks, not decades - the expiry is the point.
