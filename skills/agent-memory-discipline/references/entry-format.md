# Memory entry format

Reference for Step 3 and Step 4 of the skill. Use fields when the backend has them; otherwise write the same information into the text of the entry.

## A new entry

| Part | What to write | Example |
|---|---|---|
| What | One sentence, the decision or observation | Project uses pnpm, not npm. |
| Why | The reason, briefly | Lockfile conflict between npm and pnpm. |
| When | The date it became true | 2026-08-11 |
| Source | Where it came from | Stated by the user in the session |
| Scope | Where it applies | All packages in this repository |

As a single line:

```text
Project uses pnpm, not npm. Stated by the user on 2026-08-11 after a lockfile conflict. Applies to all packages in this repo.
```

## Closing an entry that stopped being true

Do not delete it. Add an end date and a pointer to what replaced it, then write the new entry alongside.

```text
[closed 2026-06-30, replaced by "State management uses Zustand"] State management uses Redux. Decided in the January architecture review.
State management uses Zustand. Migrated in June after the bundle size review. Applies to all new components.
```

## Evidence and policy

Mark which kind an entry is, so a single observation is not read later as a rule.

```text
[evidence] The integration suite failed twice against staging on 2026-08-19.
[policy] Integration tests use a local container; staging is off limits. Confirmed by the user on 2026-08-20.
```
