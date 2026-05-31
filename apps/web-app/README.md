# Antigravity Web App

This app is the static catalog and skill browser for `antigravity-awesome-skills`. It ships the generated registry, renders searchable skill detail pages, and publishes the public site to GitHub Pages.

## What This App Does

- Loads the generated skill catalog and related metadata from tracked assets in `public/`.
- Renders home, category, bundle, and skill detail routes for the published library.
- Adds SEO metadata, sitemap-backed URLs, and static asset resolution for GitHub Pages.
- Supports a local-only "refresh skills" developer flow through the Vite dev server plugin.
- Treats save/star interactions as browser-local UX, even when optional read-only Supabase counts are configured.

## Architecture

- `src/pages/` contains top-level route screens such as `Home.tsx` and `SkillDetail.tsx`.
- `src/context/` holds catalog loading and shared app state.
- `src/hooks/` contains feature-specific client hooks such as star state and filters.
- `src/utils/` contains URL, SEO, and content helpers.
- `public/` contains generated catalog artifacts copied from the repo root as part of maintainer sync flows.

The app intentionally assumes a static hosting model in production. Anything that depends on `/api/*` is development-only unless it is backed by a real serverless or backend implementation.

The hosted Pages build should be understood as a public catalog, not a control plane:

- `Sync Skills` is a maintainer/development affordance and must stay hidden unless `VITE_ENABLE_SKILLS_SYNC=true`.
- save/star interactions are local-only unless the project gains a real backend write contract with abuse controls and deployment support.

## Development

From the repo root:

```bash
npm run app:install
npm run app:test:coverage
npm run app:dev
```

Or directly from this directory:

```bash
npm ci
npm run dev
```

Useful root-level commands:

```bash
npm run app:build
npm run sync:web-assets
```

## Environment Variables

The app reads configuration from `.env` files in `apps/web-app/`.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: optional read access for read-only community save counts.
- `VITE_ENABLE_SKILLS_SYNC=true`: explicitly exposes the local maintainer-only sync button during development.
- `VITE_SYNC_SKILLS_TOKEN`: local development token accepted by the Vite refresh plugin.
- `SEO_SITE_URL`: optional override for sitemap and prerendered canonical URL generation when testing non-default hosts.
- `WEBSITE_BASE_URL`: optional sitemap-only fallback used when `SEO_SITE_URL` is not set.

Saving a skill is intentionally browser-local for now. The UI should not imply a shared write path until the project has a real backend contract for persistence, abuse controls, and deployment.

## Deploy Model

Production deploys use GitHub Pages and publish the built `dist/` output from this app. That means:

- production is static
- Vite `configureServer` hooks are not available in production
- any refresh or sync endpoint exposed by a dev plugin must be hidden or replaced by a real backend before being treated as a public feature

Maintainers should treat `public/skills.json.backup`, `public/sitemap.xml`, and other generated assets as derived artifacts synced from the repo root during release and hygiene workflows.

## Catalog Data Flow

The high-level maintainer flow is:

1. update skill sources under `skills/`
2. regenerate canonical registry artifacts from the repo root
3. sync tracked web assets into `apps/web-app/public/`
4. build this app for Pages

`npm run sync:repo-state` and `npm run sync:release-state` are the safest entrypoints because they keep the root catalog and the web assets aligned.

## Testing

From the repo root:

```bash
npm run app:test:coverage
cd apps/web-app && npm run test
cd apps/web-app && npm run test:coverage
npm run test
```

The repo-level test suite also contains workflow and documentation guardrails outside `src/`, so changes to this app can fail tests in `tools/scripts/tests/` even when the React code itself is untouched.

`main`/release CI also runs `npm run app:test:coverage`, so coverage thresholds are part of the real shipping contract for this app rather than an optional local extra.

## Troubleshooting

- If the app shows stale catalog data, run `npm run sync:web-assets` from the repo root and rebuild.
- If a feature works in `npm run app:dev` but not on GitHub Pages, check whether it depends on a dev-only Vite plugin or non-static runtime behavior.
- If canonical URLs or asset links look wrong, inspect the shared path/base URL helpers before patching individual pages.
