# Verification

How claims in recommendations are mechanically verified, and when the recommender re-runs after a low pass rate.

## Table of contents

- [Why mechanical verification](#why-mechanical-verification)
- [Claim types](#claim-types)
- [Dispositions](#dispositions)
- [Re-gen trigger and accept criteria](#re-gen-trigger-and-accept-criteria)
- [Verifier implementation](#verifier-implementation)

## Why mechanical verification

The recommender is an LLM. LLMs hallucinate counts, miscount file occurrences, and confuse code snippets between similar-looking files. Mechanical verification — grep + filesystem reads + JSON checks against `signals.json` and `references/docs-library.json` — catches these failures before the customer sees them.

The contract: every numeric claim, file reference, code snippet, citation URL, and contradiction-with-other-claims is verified. The LLM is not asked to judge whether its own output is correct.

## Claim types

The verifier extracts claims from `why`, `fix`, `currentBehavior`, `desiredBehavior`, and `verify` fields. Each matched claim runs through one of these handlers:

| # | Claim type | Pattern in rec | Verification |
|---|---|---|---|
| 1 | `pattern_count` | "N fetch() calls in file X" | grep/ast-grep in X, exact count match |
| 2 | `pattern_exists` | "uses JSON.parse(JSON.stringify())" | grep, boolean |
| 3 | `pattern_absent` | "no Cache-Control header" | grep, verify absence (with guards — see below) |
| 4 | `file_exists` | "app/not-found.tsx exists" | fs.access |
| 5 | `finding_count` | "2 unoptimized images" | finding count vs `verifiedFindings.json` |
| 6 | `contradiction` | Claim A vs Claim B | Substring conflict check |
| 7 | `code_snippet` | Code fence labeled "Before:" | substring search in cited file |
| 8 | `arithmetic` | "20% of 100K = 20K" | math check |
| 9 | `repo_count` | "11 unstable_cache usages across 8 files" | grep repo, count distinct files |
| 10 | `cited_count_literal` | "60+ icons in packages/ui/src/icons" | glob directory, count by extension |
| 11 | `citation_in_library` | Any URL in `citations[]` | URL ∈ `references/docs-library.json` |
| 12 | `citation_applies_to_version` | Any URL in `citations[]` | URL's `applicableFrameworks` matches `signals.json.stack.framework@frameworkVersion` |
| 13 | `cache_vary_matches_dynamic_inputs` | CDN cache rec touches route files that read Vercel geolocation | Fails unless the rec varies by a coarse Vercel geolocation header such as `X-Vercel-IP-Country`, `X-Vercel-IP-Country-Region`, or `X-Vercel-IP-City` |
| 13a | `cache_vary_cardinality_safe` | CDN cache rec sets `Vary` on request-specific geography | Fails on high-cardinality `X-Vercel-IP-Latitude` / `X-Vercel-IP-Longitude` / `X-Vercel-IP-Postal-Code` |
| 14 | `next_cached_not_found_causal_support` | Rec claims `notFound()` inside `'use cache'` caused 5xx | Fails unless backed by Next-specific docs or runtime stack evidence |
| 15 | `next_stable_cache_api_for_version` | Next.js 16 cache rec includes code examples | Fails on `unstable_cacheLife` / `unstable_cacheTag` or one-arg `revalidateTag()` |
| 16 | `next_cache_components_runtime_cache_preference` | Next.js rec uses Runtime Cache APIs while `cacheComponents=true` | Fails unless `use cache: remote` is used or Runtime Cache is framed as a fallback |
| 17 | `next_cache_components_route_segment_config` | Next.js 16 rec suggests removed route segment config while `cacheComponents=true` | Fails on `dynamicParams`, `dynamic`, `revalidate`, or `fetchCache` recommendations |
| 17a | `next_route_revalidate_static_prereq` | Rec suggests route-level `export const revalidate` for a Next.js page/layout route | Fails when the route chain contains request-time APIs or common auth helpers that can force dynamic rendering |
| 18 | `next_cache_lifetime_freshness_supported` | Rec lengthens a tagged Cache Components lifetime with `cacheLife()` | Fails unless every affected `cacheTag()` has matching `revalidateTag()` / `updateTag()` evidence |
| 19 | `next_cache_life_cdn_header_semantics` | Rec claims `cacheLife()` emits CDN/Cache-Control headers or that missing `cacheLife()` alone makes a route run per request | Fails unless rewritten to the documented Cache Components lifetime behavior or backed by production header evidence |
| 20 | `next_cache_tag_invalidation_supported` | Cache-lifetime rec claims existing tag invalidation | Fails unless every claimed `cacheTag()` has matching `revalidateTag()` / `updateTag()` evidence |
| 21 | `cache_rec_not_error_dominated_or_acknowledged` | CDN cache rec targets a route with function 5xx metrics | Fails unless the rec excludes or acknowledges error traffic |
| 22 | `cache_control_header_syntax` | CDN cache rec includes `Cache-Control`, `CDN-Cache-Control`, or `Vercel-CDN-Cache-Control` values | Fails on empty directives such as a trailing comma |
| 23 | `cache_policy_positive_or_no_ready_rec` | Cache candidate emits a ready recommendation | Fails unless it names a positive cache policy; no-store-only belongs in no-change/observation output |
| 24 | `cache_404_long_ttl_safety` | CDN cache rec mentions a 404 or not-found branch | Fails unless the rec keeps the 404/not-found branch uncached, short-lived, or explicitly separate |
| 25 | `immutable_dynamic_route_safety` | Dynamic route rec uses browser `immutable` caching | Fails unless the URL is byte-versioned or the directive is scoped to Vercel's CDN |
| 26 | `auth_guard_parallelization_safety` | Parallelization rec touches private/auth/ownership data | Fails if private data can be fetched before the auth or ownership guard |
| 27 | `parallelization_impact_not_overclaimed` | Parallelization rec promises a helper-sized latency drop | Fails unless helper/span timing was measured |
| 28 | `parallelization_not_cpu_bound_work` | Parallelization rec targets CPU or compile work | Fails unless measured wait/I/O time proves there is independent work to overlap |
| 29 | `runtime_error_cause_supported` | Route-error rec names a runtime exception/root cause | Fails unless runtime logs or stack evidence support the cause |
| 30 | `turbo_build_cache_safety` | Rec enables Turbo build caching | Fails when the package build script has migration side effects or Turbo outputs omit framework build output |

Verifier guards:

- **`snippet_in_wrong_file`**: code snippet found, but in a different file from the cited path → disposition `unsupported` (don't fail the rec; the LLM was close, but the source file claim is wrong).
- **`line-number-as-count`**: "filename:42" matched against a `pattern_count` claim → skip; this is a line-number, not a count.
- **`prose-of-absence`**: "no cache headers" without an explicit grep confirmation → `unsupported`; absence claims require evidence.
- **`pattern_count` for abstracted DB calls**: `db.method()` in a file with DB imports + await helpers but literal count 0 → `unsupported` (import-chain resolution is out of scope).

## Dispositions

Each verified claim resolves to one of four states:

| Disposition | Meaning | Counted toward `passRate`? |
|---|---|---|
| `verified` | Claim matches reality | yes (counts as pass) |
| `failed` | Claim contradicts reality | yes (counts as fail) |
| `unsupported` | Claim can't be checked mechanically (see guards above) | no |
| `unverifiable` | Out of scope (e.g., external API behavior, runtime-only) | no |

`passRate = verified / (verified + failed)`. Unsupported and unverifiable don't count either way.

## Re-gen trigger and accept criteria

After verification:

| Condition | Action |
|---|---|
| `passRate < 0.8 AND verifiableClaimCount >= 2` | Re-run Step 3.3 (the recommender) with `topFailures` injected as feedback |
| Project-config contradiction, cache-safety failure, or framework-semantic failure | Hard re-run. The customer report holds back the original rec until re-gen fixes it or abstains |
| `passRate >= 0.8` OR `verifiableClaimCount < 2` | Accept the run, proceed to Step 4 |

_(Floor lowered 5 → 2 in May 2026 audit: a rec with 1/1 failed claim is just as broken as 1/5, and the old floor let many small recs escape re-gen entirely.)_

Re-gen accept criteria:

- `regenPassRate >= originalPassRate` AND
- Rec count not gutted (regen doesn't drop more than 50% of recs) AND
- Findings still cited (no rec orphaning)

If re-gen makes things worse, keep the original output unless the trigger was hard safety (`project_config_contradiction`, `cache_vary_safety`, or `semantic_safety`). Hard-safety failures must not ship to the customer report.

## Verifier implementation

`scripts/verify-and-regen.mjs` invokes `lib/extract-claims.mjs` and `lib/verify-claim.mjs` in-process for each verifiable claim. Pure functions, no network, no LLM — deterministic.

For `citation_in_library` and `citation_applies_to_version`, the script uses `lib/citations.mjs`'s `isKnownUrl()` and `sanitizeCitations()` helpers (already tested). For everything else, it shells out to grep + ast-grep via execFile.
