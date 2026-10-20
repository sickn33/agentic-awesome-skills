## Hosted Catalog and Legacy Redirect Bridge

Treat the current catalog and the legacy user-site bridge as one public system:

- Current catalog: `sickn33/agentic-awesome-skills` at `https://aaskills.tech/`.
- Legacy bridge: `sickn33/sickn33.github.io` at `https://sickn33.github.io/antigravity-awesome-skills/`.

For SEO, indexing, Pages, redirect, or infrastructure changes:

1. Change the generator and verifier in the source repository through a protected source PR and `npm run merge:batch`.
2. Keep the legacy deployment managed allowlist exact: `.nojekyll`, `redirect-manifest.json`, and `antigravity-awesome-skills/**`. Reject any unmanaged sync diff or PR file.
3. Preserve Google verification byte-for-byte and the Bing `msvalidate.01` meta on the legacy root. Record both in manifest evidence.
4. Keep skill counts dynamic, but retain intentional curated sitemap locks. Version manifest contract changes and record source provenance.
5. The following protected automation/auto-merge procedure applies only to the legacy repository, never to source PRs in AAS. In the separate `sickn33/sickn33.github.io` repository, let `legacy-redirect-sync.yml` generate or update the fixed automation PR. Bind a fresh verifier run to the exact target head SHA, validate its run identity and managed file set, publish the required status only after that proof, then use protected auto-merge.
6. Recheck source `main` before merge, request the legacy Pages build explicitly after bot-authored merges, and wait for the exact merged commit to be built.
7. Verify locally generated output byte-for-byte, then verify all live legacy/current redirect pairs for a full audit. Retry transient CDN failures with the full audit rather than accepting a partial probe.
8. Prove idempotence with a no-drift sync: no replacement, PR, verification, or merge steps should run; Pages and live probes must still pass.

Keep both repositories on least-privilege Actions defaults (`read`) and require external actions to be pinned to full commit SHAs. When changing these settings or action versions, rerun source CI, CodeQL, Pages, and a legacy no-drift sync before declaring completion.


For independent catalog publication, resolve the published descriptor, workflow provenance, archive integrity and sitemap digest before generating the bridge. Never replace these with the intentionally stale tracked distribution snapshot. The legacy workflow needs its existing repository token as `GH_TOKEN` for read-only provenance queries.
