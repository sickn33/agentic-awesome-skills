# Recommendations

How recommendations are shaped, written, sanitized, and graded.

## Table of contents

- [Schema](#schema)
- [Writing rules](#writing-rules)
- [The 12 sanitizers](#the-12-sanitizers)
- [Envelope-unwrap recovery](#envelope-unwrap-recovery)
- [Grading rubric](#grading-rubric)
- [Next.js version awareness](#nextjs-version-awareness)

## Schema

Every recommendation is a JSON object matching this TypeScript shape:

```ts
interface Recommendation {
  // Customer-facing
  what: string;              // 1 line, lead with impact. Max 80 chars when feasible.
  why: string;               // 1-2 sentences. Root cause. Cites codebase findings + counts.
  fix: string;               // Step-by-step. Includes before/after code fences. Specific enough to implement.
  bucket: 'cost' | 'performance' | 'reliability';
  effort: 'low' | 'medium' | 'high';
  affectedFiles: string[];   // Verified file paths, from candidate.files
  currentBehavior: string;   // What the code does now (with snippet)
  desiredBehavior: string;   // Target state (with snippet)
  risk?: string;             // Optional: e.g., "Removing force-dynamic may serve stale data on /admin"
  verify: string;            // How to confirm the fix worked. e.g., "Re-run `vercel metrics …` and watch p95"

  // Impact (computed from impact-magnitude.mjs in Step 4)
  impactLabel: {
    performance?: string;    // PRECISE: "Reduce /api/products p95 from 850ms toward ~250-400ms"
    costMagnitude?: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';
    costPhrase?: string;     // "hundreds of dollars per month at current traffic"
    billingDimension?: string;
    fractionReduced?: number;
  };
  impactTier: 'high' | 'medium' | 'low';
  billingDimension?: 'edge-requests' | 'function-duration' | 'image-optimization' | 'isr-reads' | 'isr-writes' | 'bandwidth' | 'data-cache-reads' | 'cron-invocations' | string;

  // Grounding
  citations: string[];       // From references/docs-library.json allow-list. Required: ≥1 entry.
  candidateRef?: string;     // The gate candidate this rec traces to (e.g., "uncached_route:/api/products")
  findingRefs?: string[];    // File:line markers from verifiedFindings.json
  appliesAlsoTo?: Array<{     // Added by dedup when matching recs collapse into one customer-facing item.
    candidateRef?: string;
    affectedFiles?: string[];
    o11ySignal?: string;
    what?: string;
  }>;
  corroborationCount?: number; // Number of matching verified recs folded into this item, including itself.

  // Verifier output (computed in Step 3.6)
  verification?: {
    passRate: number;
    failed: Array<{ type: string; text: string; reason: string }>;
  };

  // Sanitizer audit trail (computed in Step 3.4)
  sanitizerTrail?: string[]; // ["$-strip:2", "version-mismatch:next@15+:1", ...]
  needsReview?: boolean;     // Set when a sanitizer caught a hazard

  // Grading (Step 3.5)
  quality: {
    specificity: number;     // 0-1
    actionability: number;
    grounding: number;
    evidence: number;
    overall: number;
    grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  };
}
```

## Writing rules

The recommender prompt explicitly tells the agent to follow these rules. Sanitizers enforce them after generation.

**Voice and tone** are governed by [`references/voice.md`](./voice.md). Read it before writing recommendation prose; it keeps reports direct, metric-grounded, and free of internal process terms.

### Lead with impact

The `what` field opens with the verb + the change, not the framing. Compare:

- ❌ "Consider enabling caching on the /api/products route" (filler before substance)
- ✅ "Add Cache-Control with s-maxage to /api/products" (verb-first, scope-explicit)

### Cite codebase findings with line numbers

The `why` must reference a verified finding from `verifiedFindings.json`:

- ❌ "The route is uncached" (could apply anywhere)
- ✅ "src/app/api/products/route.ts:22 returns Response without Cache-Control; observability shows 0% cache hit on 1.2M invocations/mo"

### No $ literals in customer fields

The user-mandated rule. `what`/`why`/`fix`/`impact`/`currentBehavior`/`desiredBehavior` must not contain `$N` money literals. Use magnitude framing from `impact-magnitude.mjs`.

- ❌ "Save $340/mo by adding s-maxage"
- ✅ "Hundreds of dollars per month at current traffic"
- ✅ (precise performance) "Move 1.2M monthly invocations to the CDN; expect p95 to drop from 850ms toward ~50ms on cache hits"

The `$-strip` sanitizer enforces this at output time, but the prompt should also instruct the LLM not to emit dollar literals in the first place.

### Before/after code fences required

`currentBehavior` shows the offending snippet. `desiredBehavior` shows the target. Language-tagged code fences. Keep both under ~20 lines.

### Cite at least one URL from the library

`citations[]` must contain at least one entry from `references/docs-library.json`. The `missing-citation` sanitizer drops uncited recs. The `unknown-citation` and `version-mismatch` sanitizers strip invalid citations.

### Match the user's framework version

Don't recommend `'use cache'` (Next 15+) to a Next 13 user. The recommender prompt receives only the citation subset valid for the user's stack — but the LLM can still hallucinate. The `version-mismatch` sanitizer catches stragglers.

## The 12 sanitizers

Each sanitizer records its action in `rec.sanitizerTrail` when it mutates a field. Tag format: `tag:detail`. Tags are lexically stable — downstream consumers grep them.

| # | Sanitizer | Trigger | Action | Trail tag |
|---|---|---|---|---|
| 1 | `$-strip` | Money-literal regex in customer field | Replace with "the billed cost" | `$-strip:N` |
| 2 | `vercel-directive-strip` | `stale-if-error` / `proxy-revalidate` in cache-control | Strip directive (Vercel CDN doesn't honor) | `vercel-directive-strip:directive` |
| 3 | `rate-limit` | Concurrency × delay > known provider rate limit | Prepend caveat, set needsReview | `rate-limit:provider:prescribed/limit` |
| 4 | `pre-release` | Fix enables `-rc`/`-beta`/`-canary` feature | Append "requires pre-release version" caveat | `pre-release:pkg@version` |
| 5 | `middleware-conflict` | Rec targets route covered by middleware matcher | Append "Middleware {matcher} may intercept" caveat | `middleware-conflict:matcher` |
| 6 | `undeclared-dep` | Fix imports a package not in package.json | Prepend "Add dependency first: npm i {pkg}" | `undeclared-dep:pkg` |
| 7 | `count-correct` | Cited count > verified count, ground-truth known | Rewrite to "~N" with verified count | `count-correct:token:cited→actual` |
| 8 | `count-strip` | Cited count > verified count, no ground truth | Rewrite to "a number of" | `count-strip:token` |
| 9 | `rendering-mode-mislabel` | Rec blames ISR/SSR on a static page | Append warning, set needsReview | `rendering-mode-mislabel` |
| 10 | `unknown-citation` | URL not in `references/docs-library.json` | Strip URL, set needsReview if all stripped | `unknown-citation:url` |
| 11 | `version-mismatch` | URL's `applicableFrameworks` doesn't match stack | Strip URL, set needsReview if all stripped | `version-mismatch:url` |
| 12 | `missing-citation` | `citations.length === 0` after other sanitizers | DROP rec entirely | (rec not emitted; counted at end) |

The sanitizer order matters: dollar-strip runs first (cheap, deterministic), then content sanitizers, then citation sanitizers last. This guarantees citation count is computed against the final state.

The `recordSanitizer(rec, tag)` helper is the single entry point — sanitizers MUST call it before mutating fields. Otherwise the audit trail rots.

### Provider rate limits

Used by sanitizer #3. These provider limits are public contract values:

| Provider | Limit | Doc URL |
|---|---|---|
| Notion | 3 rps | https://developers.notion.com/reference/request-limits |
| OpenAI | 30 rps | https://platform.openai.com/docs/guides/rate-limits |
| Stripe | 100 rps | https://docs.stripe.com/rate-limits |
| Anthropic | 10 rps | https://docs.anthropic.com/en/api/rate-limits |

Tiers/plans differ; these are first-tier defaults. The sanitizer prepends a caveat if the rec prescribes higher concurrency.

## Envelope-unwrap recovery

Not a sanitizer — a recovery step. LLMs occasionally wrap their JSON output in an envelope:

```json
{ "data": { "recommendations": [...] } }
{ "result": { "recommendations": [...] } }
{ "insights": { "recommendations": [...] } }
```

`attemptManualRecovery` peels one wrapping layer before schema validation. Increments `hygieneCounters.envelopeUnwraps`. Logs the unwrap to the run log.

This is the only "creative" parsing the skill does. Anything else that fails schema validation is rejected.

## Grading rubric

Each rec is scored on four axes, 0-1 each. Average → grade:

| Axis | What it measures | Strong (1.0) signal |
|---|---|---|
| Specificity | Concrete files, line numbers, code snippets | Triple-backtick code fence OR inline code ≥10 chars + verified file path |
| Actionability | Clear "do this then that" steps | Numbered steps; verbs present in each step; no "consider"/"might" |
| Grounding | Claims trace to findings or metric data | `sourceIndex` matches a finding OR rec has affectedFiles + code fences (presumed evidence) |
| Evidence | Numeric, observed claims | Count words (errors, queries, invocations) + units (% / ms / s / K / M) |

Grade thresholds:
- `Excellent` ≥ 0.85
- `Good` 0.70 – 0.85
- `Fair` 0.55 – 0.70
- `Poor` < 0.55 → dropped at quality floor in Step 4

## Next.js version awareness

The recommender's citation library is filtered by `signals.json.stack.framework@frameworkVersion`. The agent should still self-check the version when picking which APIs to recommend:

| Feature | Available | Notes |
|---|---|---|
| App Router | Next ≥ 13.0 | Default since 14 |
| `generateStaticParams` | Next ≥ 13.0 | Replaces getStaticPaths for App Router |
| Fetch `next: { revalidate }` | Next ≥ 13.0 | Note: default fetch caching flipped in Next 15 |
| `unstable_cache` | Next 14-15 | Replaced by 'use cache' in 16 |
| `'use cache'` directive | Next ≥ 15.0 | Persistent cache primitive |
| `cacheLife()`, `cacheTag()` | Next ≥ 15.0 | Pairs with 'use cache' |
| `after()` | Next ≥ 15.0 | Non-blocking post-response work |
| Partial Prerendering | Next ≥ 15.0 | Stable target later — verify per release |
| `revalidateTag` / `revalidatePath` | Next ≥ 13.4 | Tag-based on-demand invalidation |
| `cookies()` / `headers()` async | Next ≥ 15.0 | Async pattern in 15+ |

The skill's curated citation library encodes these constraints via `applicableFrameworks`. If a contributor adds a new Next.js feature URL, they MUST set the right semver range in `references/docs-library.json`.
