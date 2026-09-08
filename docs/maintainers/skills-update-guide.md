# Skills Update Guide

The local catalog is built from this checkout's canonical `skills/` sources. Regenerating an index does not fetch new upstream skills or publish a website.

## Refresh a local catalog

Use the Node version required by root `package.json` and Python dependencies from `tools/requirements.txt`. Install root dependencies with `npm ci`; install the web dependencies with `npm run app:install`.

On a clean `main` checkout, retrieve accepted source changes with `git pull --ff-only origin main`. Preserve unrelated work before updating. Then run:

```bash
npm run build
npm run app:dev
```

`build` runs the canonical validation and generation chain; `app:dev` prepares the web assets before starting the local catalog. For an index-only refresh, `npm run update:skills` regenerates `skills_index.json`, its compatibility copy, and the public skill manifests. It is not the full bundle/catalog build.

## Windows launcher

`START_APP.bat` checks Node, prepares web dependencies, calls `npm run app:setup`, and starts Vite. It does not fetch Git updates, download skills through PowerShell, or install Python automatically. Prepare the checkout and prerequisites first. Prefer the npm commands above for a reproducible dependency installation.

## Maintainer changes

Review generated differences as evidence; do not include them in an ordinary source PR. Use the protected [canonical-sync workflow](ci-drift-fix.md) after source merge. Updating the local catalog does not update installed skill copies, publish npm, or deploy Pages.
