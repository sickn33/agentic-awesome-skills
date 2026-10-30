# Component validation

Machine-readable classification is in `tools/config/maintenance-policy.json`; the [maintenance contract](maintenance-contract.md) specifies authority and full release verification.

| Profile | Work |
| --- | --- |
| editorial | Documentation consistency/references and docs security |
| catalog | Global schema, warning budget, source credits, ephemeral indexes, references, catalog integrity, docs security |
| runtime | Catalog checks plus runtime, installer and packaging tests |
| web | Catalog checks plus web coverage/build |
| distribution | Exact prepared snapshot, schema/references/security/plugin/bundle/catalog integrity; full product validation on immutable candidate |
| full | Global checks, complete script tests and web coverage/build |

Unknown, mixed, operational skill, executable/link/mode, policy, workflow, generator or shared-dependency changes are full. A complete ordered receipt must contain every planned successful check. PR workflow required names remain unchanged; no path-filtered required workflow is introduced.

Use `npm run pr:preflight -- --base origin/main --head HEAD` from a committed source head. The helper validates a clean isolated copy. Direct `maintenance:validate` execution rejects a dirty checkout or different HEAD. Generated previews are temporary development state; tracked distribution snapshots may intentionally lag source main.

Measure whole cycles separately from individual command timings. See the maintenance contract for controls, raw timestamp evidence and manual intervention accounting.

## CI execution efficiency

The existing required job names and component plans are unchanged. CI opts into
`maintenance:validate --parallel`: only a full plan's final `npm run test` and
web coverage/build overlap, on the same runner. The complete script suite remains
unsharded. Every prerequisite, including preview generation and catalog checks,
must pass before either branch starts. The web branch uses a disposable clone of
the exact head with the already-generated preview bytes and separate dependencies;
Git history is retained for prerender timestamps. Both branches must finish and
pass, and the receipt retains plan order regardless of completion order. Preparation
or child-process failures fail closed; the clone is removed after both finish.
Other profiles and the default local invocation keep sequential behavior.

Full-history CI checkouts use `filter: blob:none`, retaining commits/trees and
fetching historical file contents on demand. Required diff, evidence, trusted-base
and Git-date checks still run; history is not truncated. The one-file artifact
verifier retains its existing sparse shallow checkout. No remote task cache,
paid service, extra runner matrix or cached validation result is enabled. Measure
whole workflow duration separately from the recorded component execution time.

The full suite also exercises freshly generated web data. New first-party plugin
information pages have no legacy routes: the bridge excludes their exact four
paths while retaining the 188-route curated lock and rejecting unknown additions.
