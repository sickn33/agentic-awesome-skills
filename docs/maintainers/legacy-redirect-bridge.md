# Legacy Redirect Bridge

The compatibility site at `https://sickn33.github.io/antigravity-awesome-skills/` is published from the separate `sickn33/sickn33.github.io` repository. It preserves old indexed URLs while the canonical site lives at `https://sickn33.github.io/agentic-awesome-skills/`.

## Managed deployment surface

Only these paths belong to the redirect generator:

- `.nojekyll`
- `redirect-manifest.json`
- `antigravity-awesome-skills/**`

The target repository's `README.md` and `.github/**` automation are deliberately outside that managed set.

Generate a fresh bridge from the current catalog:

```bash
npm run pages:redirect-bridge -- --output /new/output/directory
```

The generator keeps the curated sitemap route count locked while deriving the skill count from `skills_index.json`. It also preserves the legacy Google verification file and the Bing verification meta tag on the legacy root page.

Manifest schema version `3` records source-repository provenance, redirect coverage, and webmaster-verification evidence for automation consumers.

Verify a checked-out target repository byte-for-byte:

```bash
npm run pages:redirect-verify -- --deployment-root /path/to/sickn33.github.io
```

Add a bounded live probe after deployment:

```bash
npm run pages:redirect-verify -- \
  --deployment-root /path/to/sickn33.github.io \
  --live-root https://sickn33.github.io/ \
  --live-mode sample
```

Use `--live-mode all` for a complete route-pair audit.

## Publication contract

The target repository owns the scheduled synchronization workflow. It checks out this repository at `main`, regenerates only the managed deployment surface, opens a fixed-branch PR when drift exists, dispatches the exact-head verifier, and merges only after the protected check succeeds. The same run explicitly requests and verifies the legacy Pages build so automation is not dependent on GitHub events suppressed for `GITHUB_TOKEN`-authored changes.

Target `main` must remain protected with strict `legacy-bridge-verify`, administrator enforcement, pull requests required, and force pushes/deletions disabled.
