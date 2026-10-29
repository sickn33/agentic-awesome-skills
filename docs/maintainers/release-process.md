# Release process

Read the [maintenance contract](maintenance-contract.md) for provenance, candidate validation and the full-release-alignment gate.

1. From clean current main, prepare truthful changelog notes and run `npm run release:prepare -- X.Y.Z --state-dir /absolute/private/cycle`. The release PR alone refreshes distribution snapshots, Codex/Claude plugin mirrors, bundles, metadata and credits. Preparation packs the final staged tree and runs the complete `npm run test` suite against that exact candidate before committing or pushing.
2. Review and merge the release PR through `merge:batch`. Exactly one owner-authored merged release PR must identify the version.
3. Check out the immutable merged release commit and run `npm run release:publish -- X.Y.Z`. Main may advance; the candidate must remain in protected-main ancestry and match its sealed tree. The publisher creates the tag to trigger the immutable candidate.
4. `distribution-candidate.yml` validates and builds once, then tests the packed product on Linux/Windows with Node 22/24. After that succeeds, `release:publish` dispatches `publish-npm.yml` for the exact tag and commit. npm publishes the tested tarball with explicit `latest` or `next` and verifies the registry version, `gitHead` and integrity before it succeeds; it does not rebuild.
5. `release:publish` creates the GitHub Release only after npm publication succeeds. A failed or mismatched npm publication leaves the tag and candidate as build evidence while the GitHub Release remains absent. Recheck every live Dependabot, code-scanning and secret-scanning alert before publication; a green candidate does not override a newly discovered security blocker.
6. Dispatch Pages at the same tag with `deployment_target=release`. It verifies candidate provenance/digests and deploys the same site bytes.
7. Complete the mandatory full-release-alignment gate with `release:verify`, including fresh npm install/integrity, CI/CodeQL, live canonical site and legacy bridge. A public artifact mismatch or stale public surface keeps the public release incomplete.

Report personal environment alignment separately. Pin authorized existing MCP host entries to the exact runtime version and distinguish a standalone handshake from an actual running-client reload.

For compatible catalog-only changes, dispatch `catalog-distribution.yml` on protected main with a unique revision. Verify published `catalog-release.json`, archive SRI and live descriptor. This path does not bump/publish runtime npm. Legacy runtime releases retain embedded catalogs; explicit independent revisions require the compatible runtime described in the descriptor.

## Full local release rehearsal

Before a publication attempt, use `npm run release:rehearse -- X.Y.Z --state-dir /absolute/private/completed-cycle` from a clean committed checkout descended from the main verified by that cycle (topic rehearsal is allowed, production preparation still requires exact verified main). It clones the committed source into a disposable directory, copies cycle state privately, removes the clone remote, and executes the same cycle admission, version/metadata generation, bounded convergence, snapshot sealing, packed-candidate script tests, web coverage/build and final clean-tree verification as preparation. It never pushes, opens a release PR, tags, publishes npm or deploys. The source checkout and original cycle state remain unchanged; temporary candidates are discarded on success and failure. GitHub reads and normal dependency installation remain necessary; no paid review service is invoked. A rehearsal receipt is diagnostic, not merge or publication authority. Main/head/body/CI drift still requires fresh cycle verification; do not loop the same failure.

The final sealed commit must be the commit tested by preparation. Do not amend it after tests. Convergence preserves the initial candidate committer timestamp because Docs lastmod derives from Git commit dates, and fails closed after the bounded settling passes. Cycle verification records the same normalized resolved-PR records consumed by release admission. A closed non-merged PR never records GitHub's synthetic merge SHA as a real merge.

If another release is active, implement and validate this tooling on a separate topic branch; do not merge it, update installed maintainer skills, or edit that release's state while its owner is working. Adopt through the protected source path after that work finishes, then synchronize the installed skill from the adopted source.
