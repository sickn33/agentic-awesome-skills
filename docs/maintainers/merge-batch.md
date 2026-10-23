# Protected merge batches

`merge:batch` is the sole implementation allowed to approve fork runs or merge; the guided `maintenance:cycle merge` delegates to it. Read the [maintenance contract](maintenance-contract.md) before execution.

Review entire `skills/<skill-id>/**` trees, including support files and provenance. A passing Tessl review or exact-head maintainer attestation is required. Safe unprivileged analysis can start before review; owner-sensitive code retains the owner/exact-head gate. The helper does not rewrite PR metadata and does not retry base drift automatically.

The protected reviewed-fork ledger may opt in to exact `skills/<skill-id>/resources/scripts/*.py` files for a complete reviewed tree. These helpers remain inert regular files (`100644`); executable modes, symlinks, arbitrary extensions and other resource paths stay blocked. The general fork policy is unchanged.

```sh
npm run merge:batch -- --prs 123,124 --prepare-only
npm run merge:batch -- --prs 123,124 --state-dir /absolute/private/state --reviewed-head FULL_SHA --reviewer maintainer --review-evidence 'Full bundle inspected'
```

Create the external state directory with mode 0700 first. Receipts bind complete skill trees, policy and dependency context. Authenticated identical-content reuse authorizes only the current full head after fresh required checks. A changed bundle or evaluator invalidates reuse. Journal state never counts as review or a green check. Already merged PRs are verified against protected main; blocked PRs are recorded while independent ones continue.

Source merges defer generated distribution snapshots to the next release PR. Main CI validates temporary generated state without opening a canonical-sync PR.
