# Sponsors page

The `/sponsors/` page recognizes the five OSS programs confirmed by the project
maintainer on 2026-11-01. Program descriptions are deliberately general: public
program limits do not establish the credits, duration or entitlements granted
to AAS. No cash sponsorship amounts or security certifications are claimed.

## Content and official sources

The copy lives in `apps/web-app/src/data/informationPages.json`. The sponsor
renderer uses that same copy as the existing sitemap and HTML prerender pipeline.
Financial Sponsors comes first, with community support links and no unconfirmed financial sponsor names. Infrastructure & Tooling Supporters follows with Codex, Vercel, Snyk, Atlas Cloud and BrowserStack.
Keep the five identities in `Sponsors.tsx` aligned with those five sections.

- [Codex for Open Source](https://developers.openai.com/community/codex-for-oss):
  OpenAI mark extracted from the official page header SVG.
- [Vercel Open Source Program](https://vercel.com/open-source-program):
  exact 240 × 24 PNG supplied by the maintainer, displaying the 2026 OSS badge.
- [Snyk for Open Source](https://snyk.io/open-source/):
  [official white wordmark](https://res.cloudinary.com/snyk/image/upload/snyk-mktg-brandui/brand-logos/wordmark-dark.svg),
  referenced by the official site's stylesheet.
- [Atlas Cloud OSS program](https://www.atlascloud.ai/oss-program) and
  [program documentation](https://www.atlascloud.ai/docs/oss-program):
  official wordmark extracted from the [homepage](https://www.atlascloud.ai/) header SVG.
- [BrowserStack OSS program](https://www.browserstack.com/open-source):
  [official full-color logo](https://bstackprod.kinsta.cloud/wp-content/themes/browserstack/img/bstack-logo-global.svg)
  referenced by the program page.

Assets are served locally from `apps/web-app/public/sponsors/`; no logo service
or remote image tracking is needed. For the inline OpenAI and Atlas marks,
`currentColor` is explicitly set to white for standalone SVG rendering on the
existing black site. Path geometry and proportions are preserved. Marks remain
the property of their respective owners; this acknowledgement does not claim
ownership or relicense their trademarks.

## Design and review

The maintainer approved English copy, existing Outfit typography, black/cyan
palette and equal sponsor treatment. Taste direction: `type-only-statement`,
seed `808682281`; the short heading and sponsor rows follow that composition.
The existing site navigation takes precedence over the direction's standalone
landing-page chrome. No stock photography, fabricated product screenshots,
animated logos or invented sponsor tiers were added.

Unslop by Damir Sokolovsky (https://heydamir.design/unslop), CC BY 4.0, informed
the spacing, color, copy and typography review. Stageshow's craft and brand-mark
references informed optical logo sizing and preservation of real artwork. This
is an acknowledgement page, not a faux product UI, so no kit/demo or rehearsal
animation was shipped.

Taste's automated marketing-page heuristics also flag the shared header/footer
rules, existing mobile menu shadow, absence of photography and absence of
scroll animation. These are documented exceptions to preserve the approved
site design and restrained sponsor presentation, not claimed passing checks.
The mobile menu is an actual floating control. Visual review covers desktop,
tablet and mobile; the page does not add photo/video or movement quotas merely
to satisfy those generic heuristics.

`/sponsors/` is a new route with no historical counterpart. It is excluded from
the legacy bridge's curated route inventory while retaining the existing count
lock and rejection of unexpected routes.

## Search and answer-engine follow-up

On 2026-11-01, Google Search Console reported the existing sitemap successful,
last read the same day. Bing Webmaster Tools reported short descriptions on
13 documentation URLs. The generic title-based descriptions were replaced with
individual summaries for all 27 guides and the documentation index. React and
prerendered HTML use the same descriptions for search/social metadata and
WebPage/TechArticle structured data. The historical v8.2.0 walkthrough remains
explicitly historical.

The editorial portions of `public/llms.txt` now lead with the reusable skill
library, distinguish the companion AAS Core preview, and link the catalog,
directory, documentation, trust page and sponsors page. Generated count/version
fields and existing Core limitations remain intact. Existing FAQ visibility,
unknown-route noindex/404 handling and canonical route rules are preserved.

Search-console crawl counts lag deployment and are not evidence of ranking
recovery. Indexing requests, if submitted after deployment, do not guarantee
indexing or immediate clearance of Bing recommendations.
