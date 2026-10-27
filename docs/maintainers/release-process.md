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
