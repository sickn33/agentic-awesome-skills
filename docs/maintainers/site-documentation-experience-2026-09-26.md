# Documentation experience verification

This record covers the hosted documentation changes based on source commit
`14efe6251a97ec582d0224224b45ea3615bfcf3f`. No skill content, package version,
release tag, or npm publication changes are part of this work.

## Behavior and source identity

The 27 guide bodies load as individual chunks. Full-text search loads them on
demand, requires all query terms, and shows matching excerpts with React-escaped
highlighting. Rejected loads are evicted from the cache so retry can recover.
Late responses cannot replace the current guide after navigation.

Code copying uses the rendered block's text content, preserving whitespace and
excluding the toolbar. Clipboard rejection presents an explicit manual-copy
fallback. The scrollable code container is keyboard-focusable.

Dates come from each Markdown file's Git history. Source links pin the build's
full commit; edit links intentionally target `main`. Builds require a Git
checkout with guide history, as provided by the Pages workflow. The dates do not
claim that documentation changed on every deployment.

The overview distinguishes user guides, contributor documentation, maintainer
procedures, CLI/MCP reference, and troubleshooting. Contributor and maintainer
destinations are labeled as GitHub documentation; these are not new hosted guides.

## Repeatable checks

From the repository root:

```sh
npm run validate
npm run validate:references
npm run security:docs
npm test
npm run app:test
```

Web checks, also from the repository root:

```sh
npm --prefix apps/web-app run lint
VITE_BASE_PATH=/ SEO_SITE_URL=https://aaskills.tech npm --prefix apps/web-app run build
NODE_OPTIONS=--max-old-space-size=4096 SEO_SITE_URL=https://aaskills.tech npm --prefix apps/web-app run verify:seo
npm --prefix apps/web-app run verify:docs
```

The complete repository suite passed (130 test files; optional network tests
are separate). Skill validation passed for 2,472 skills. Reference and
documentation-security checks passed.
The complete web suite passed with 253 tests across 36 files, followed by lint,
typecheck, the production build, documentation verification, and SEO verification.
All 18 distinct external HTTP(S) URLs in the source guide Markdown returned HTTP
200 to a read-only HEAD probe; this is a point-in-time availability check.

`verify:docs` is part of the build. It rejects missing source targets (including
images), unknown anchors, missing prerendered routes, missing source headings
in static HTML, duplicate IDs, malformed article identity, missing breadcrumb
metadata, missing local rendered/social images, and social cards that are not
1200×630 PNGs. It does not execute documentation commands or certify third-party
websites.

Run a complete build before checking prerendered output: the existing prerender
script takes the freshly built empty-root HTML as its template, rather than an
already prerendered homepage.

## Accessibility review

Audit method: Chromium production preview, axe-core 4.10.3 with WCAG 2 A/AA,
2.1 AA, and 2.2 AA rule tags, plus keyboard and responsive checks.

Findings addressed:

| Finding | Criterion | Change |
| --- | --- | --- |
| Blue text on light backgrounds below 4.5:1 | 1.4.3 | Darker blue text within the same documentation palette; dark theme preserved |
| Inline links distinguished only by color | 1.4.1 | Underlined article links |
| Nested code scrolling not keyboard-focusable | 2.1.1 | Scroll on the focusable preformatted container |
| Light-theme code tokens below 4.5:1 | 1.4.3 | Darker built-in/type and keyword token colors |
| Repeated documentation navigation | 2.4.1 | Visible-on-focus skip link and focusable content target |
| Route changes leaving focus on removed content | 2.4.3 | Focus content after an initiated guide navigation finishes |
| Fragment-only links resolving to the homepage through the HTML base | 2.4.4 | Include the current guide path in outline, skip, and Markdown fragment links |

Automated accessibility checks cannot establish complete WCAG conformance.
Native screen-reader testing and testing with disabled users are not represented
by axe scans or browser accessibility-tree inspection.

Final automated sweep: 56 page/viewport combinations (all 28 documentation
routes at 1280×900 in light mode and 320×800 in dark mode) reported no axe
violations, no incomplete axe checks, and no page-level horizontal overflow.
Keyboard activation of the mobile documentation menu, body-only search for
`clipboard`, highlighted result selection, automatic menu closure, and focus
transfer to `docs-content` were verified in Chromium. The mobile screenshot
was inspected visually.
Desktop browser checks also confirmed byte-exact clipboard content, active
`next-steps` outline state after following its link, preservation of the guide
route, skip-link focus, and the guide-specific social-image URL.

## Social image maintenance

The source template is
[`docs-social-card.html`](../../apps/web-app/scripts/docs-social-card.html).
Serve the web app locally, open the template with `?guide=getting-started`,
`?guide=aas-core`, or `?guide=faq`, use a 1200×630 viewport, await font and image
decoding, and capture PNG output in `apps/web-app/public/social/docs/`.
The template uses the site's Outfit font, official AAS wordmark, and dark palette.
The explicit guide list in `src/data/docs-social.json` is shared by rendering and
SEO verification; unknown or stale image URLs do not pass the identity verifier.

## Mintlify integration

The base commit's failed `Mintlify Deployment` check originates from the
`mintlify` GitHub App. The repository's only ordinary webhook is Snyk, not
Mintlify, and was not changed. Listing app installations with the available
GitHub token returned HTTP 403 requiring a GitHub-App-authorized token.

Removing the repository from the Mintlify installation therefore requires an
account owner with access to the app's installation settings. No required
branch-protection checks or unrelated webhooks were removed to hide this result.
