// Extract mechanically-verifiable claims from a rec without parsing LLM prose. High precision, not recall.

export function extractClaims(rec, ctx = {}) {
  const claims = [];
  const repoRoot = ctx.repoRoot;
  const projectRootDirectory = normalizeProjectRootDirectory(ctx.projectRootDirectory);
  const framework = ctx.framework;
  const frameworkVersion = ctx.version;
  const cacheComponents = ctx.cacheComponents;
  const signals = ctx.signals;
  const projectFacts = Array.isArray(ctx.projectFacts) ? ctx.projectFacts : [];

  // One synthetic claim asserts rec doesn't contradict any already-on project fact (Fluid, in-function concurrency, …).
  if (projectFacts.length > 0) {
    claims.push({
      type: 'does_not_contradict_project_config',
      rec,
      projectFacts,
      sourceField: 'projectFacts',
    });
  }

  for (const cite of asArray(rec.citations)) {
    // Skill-rule refs are filtered upstream — skip version check.
    if (/^[\w-]+:[\w-]+$/.test(cite)) {
      claims.push({ type: 'citation_in_library', url: cite, sourceField: 'citations' });
      continue;
    }
    claims.push({ type: 'citation_in_library', url: cite, sourceField: 'citations' });
    if (framework && frameworkVersion) {
      claims.push({
        type: 'citation_applies_to_version',
        url: cite,
        framework,
        frameworkVersion,
        sourceField: 'citations',
      });
    }
  }

  for (const f of asArray(rec.affectedFiles)) {
    claims.push({ type: 'file_exists', file: f, repoRoot, projectRootDirectory, sourceField: 'affectedFiles' });
  }

  // findingRefs lack a pattern, so we only check file existence.
  for (const ref of asArray(rec.findingRefs)) {
    const m = String(ref).match(/^(.+?):\d+$/);
    if (m && !claims.some((c) => c.type === 'file_exists' && c.file === m[1])) {
      claims.push({ type: 'file_exists', file: m[1], repoRoot, projectRootDirectory, sourceField: 'findingRefs' });
    }
  }

  const cacheFiles = cacheRecommendationFiles(rec);
  if (isCacheCandidate(rec)) {
    claims.push({
      type: 'cache_policy_positive_or_no_ready_rec',
      rec,
      sourceField: 'cache-policy',
    });
  }
  if (cacheFiles.length > 0) {
    claims.push({
      type: 'cache_vary_matches_dynamic_inputs',
      rec,
      files: cacheFiles,
      repoRoot,
      projectRootDirectory,
      sourceField: 'cache-safety',
    });
    if (mentionsVaryHeader(rec)) {
      claims.push({
        type: 'cache_vary_cardinality_safe',
        rec,
        sourceField: 'cache-vary-cardinality',
      });
    }
    claims.push({
      type: 'cache_rec_not_error_dominated_or_acknowledged',
      rec,
      signals,
      sourceField: 'cache-error-safety',
    });
    claims.push({
      type: 'cache_control_header_syntax',
      rec,
      sourceField: 'cache-header-syntax',
    });
    claims.push({
      type: 'cache_control_headers_citation',
      rec,
      sourceField: 'cache-header-citation',
    });
    if (mentionsCachedNotFoundOr404(rec)) {
      claims.push({
        type: 'cache_404_long_ttl_safety',
        rec,
        sourceField: 'cache-404-safety',
      });
    }
  }

  if (mentionsNextCachedNotFound(rec)) {
    claims.push({
      type: 'next_cached_not_found_causal_support',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-cache-not-found',
    });
  }

  if (mentionsNextStableCacheApi(rec)) {
    claims.push({
      type: 'next_stable_cache_api_for_version',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-cache-api-version',
    });
  }

  if (mentionsNext16RuntimeCacheApiMismatch(rec)) {
    claims.push({
      type: 'next_runtime_cache_api_for_version',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-runtime-cache-api-version',
    });
  }

  if (mentionsRuntimeCacheWhenCacheComponents(rec)) {
    claims.push({
      type: 'next_cache_components_runtime_cache_preference',
      rec,
      framework,
      frameworkVersion,
      cacheComponents,
      sourceField: 'next-cache-components-runtime-cache-preference',
    });
  }

  if (mentionsMultipleCacheLifeCalls(rec)) {
    claims.push({
      type: 'next_cache_life_single_execution',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-cache-life-single-execution',
    });
  }

  if (mentionsCacheLifetimeChange(rec)) {
    claims.push({
      type: 'next_cache_lifetime_freshness_supported',
      rec,
      files: recommendationFiles(rec),
      repoRoot,
      projectRootDirectory,
      sourceField: 'next-cache-lifetime-freshness',
    });
  }

  if (mentionsNextCacheComponentsStaticShellTarget(rec)) {
    claims.push({
      type: 'next_cache_components_route_chain_file',
      rec,
      framework,
      frameworkVersion,
      cacheComponents,
      signals,
      sourceField: 'next-cache-components-route-chain',
    });
  }

  if (mentionsCacheLifeCdnHeaderClaim(rec)) {
    claims.push({
      type: 'next_cache_life_cdn_header_semantics',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-cache-life-cdn-header-semantics',
    });
  }

  if (mentionsImageResponseHeaders(rec)) {
    claims.push({
      type: 'image_response_headers_citation',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'image-response-headers',
    });
  }

  if (mentionsNextImagePriorityRecommendation(rec)) {
    claims.push({
      type: 'next_image_priority_api_for_version',
      rec,
      framework,
      frameworkVersion,
      sourceField: 'next-image-priority-api',
    });
  }

  if (mentionsNextCacheComponentsRouteSegmentConfig(rec)) {
    claims.push({
      type: 'next_cache_components_route_segment_config',
      rec,
      framework,
      frameworkVersion,
      cacheComponents,
      sourceField: 'next-route-segment-config',
    });
  }

  if (mentionsRouteLevelRevalidate(rec)) {
    claims.push({
      type: 'next_route_revalidate_static_prereq',
      rec,
      framework,
      frameworkVersion,
      cacheComponents,
      repoRoot,
      projectRootDirectory,
      sourceField: 'next-route-revalidate-static-prereq',
    });
  }

  if (mentionsExistingCacheTagInvalidation(rec)) {
    claims.push({
      type: 'next_cache_tag_invalidation_supported',
      rec,
      repoRoot,
      projectRootDirectory,
      sourceField: 'next-cache-tag-invalidation',
    });
  }

  if (mentionsUnsafeImmutableDynamicRoute(rec)) {
    claims.push({
      type: 'immutable_dynamic_route_safety',
      rec,
      sourceField: 'immutable-dynamic-route',
    });
  }

  if (mentionsAuthSensitiveParallelization(rec)) {
    claims.push({
      type: 'auth_guard_parallelization_safety',
      rec,
      sourceField: 'auth-parallelization',
    });
  }

  if (mentionsParallelizationImpactOverclaim(rec)) {
    claims.push({
      type: 'parallelization_impact_not_overclaimed',
      rec,
      sourceField: 'parallelization-impact',
    });
  }

  if (mentionsCpuBoundParallelization(rec)) {
    claims.push({
      type: 'parallelization_not_cpu_bound_work',
      rec,
      sourceField: 'parallelization-cpu-bound',
    });
  }

  if (mentionsRuntimeErrorCause(rec)) {
    claims.push({
      type: 'runtime_error_cause_supported',
      rec,
      sourceField: 'runtime-error-cause',
    });
  }

  if (mentionsCatchToNotFound(rec)) {
    claims.push({
      type: 'route_error_not_found_status_and_scope',
      rec,
      sourceField: 'route-error-catch-safety',
    });
  }

  if (mentionsIgnoredBuildStepRecommendation(rec)) {
    claims.push({
      type: 'vercel_ignore_command_project_state',
      rec,
      signals,
      sourceField: 'ignored-build-step-state',
    });
  }

  if (mentionsTurboBuildCacheRecommendation(rec)) {
    claims.push({
      type: 'turbo_build_cache_safety',
      rec,
      files: recommendationFiles(rec),
      repoRoot,
      projectRootDirectory,
      framework,
      sourceField: 'turbo-build-cache-safety',
    });
  }

  for (const c of asArray(rec.verifiableClaims)) {
    if (c && typeof c === 'object' && typeof c.type === 'string') {
      claims.push({
        ...c,
        repoRoot: c.repoRoot ?? repoRoot,
        projectRootDirectory: c.projectRootDirectory ?? projectRootDirectory,
        sourceField: 'verifiableClaims',
      });
    }
  }

  return claims;
}

function normalizeProjectRootDirectory(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
}

function cacheRecommendationFiles(rec) {
  if (!recommendsSharedCache(rec)) return [];
  return recommendationFiles(rec);
}

function isCacheCandidate(rec) {
  return /^(?:uncached_route|cache_header_gap):/.test(String(rec?.candidateRef ?? ''));
}

function recommendationFiles(rec) {
  const files = [
    ...asArray(rec.affectedFiles),
    ...asArray(rec.findingRefs)
      .map((ref) => String(ref).match(/^(.+?):\d+$/)?.[1])
      .filter(Boolean),
  ];
  return Array.from(new Set(files));
}

function recommendsSharedCache(rec) {
  const haystack = [
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.desiredBehavior,
    rec?.verify,
  ].filter(Boolean).join('\n');
  return /\b(?:s-maxage|CDN-Cache-Control|Vercel-CDN-Cache-Control|Cache-Control)\b/i.test(haystack);
}

function mentionsVaryHeader(rec) {
  return /\bVary\b/i.test(recText(rec));
}

function mentionsNextCachedNotFound(rec) {
  const haystack = recText(rec);
  return /\bnotFound\b/.test(haystack) &&
    /['"`]use cache['"`]|\buse cache\b/i.test(haystack) &&
    /\b(?:500|5xx|error rate|errors?)\b/i.test(haystack);
}

function mentionsNextStableCacheApi(rec) {
  const haystack = recText(rec);
  return /\bunstable_(?:cacheLife|cacheTag)\b/.test(haystack) ||
    /\brevalidateTag\s*\([^)]*['"`][^'"`]+['"`]\s*\)/.test(haystack);
}

function mentionsNext16RuntimeCacheApiMismatch(rec) {
  const haystack = recText(rec);
  const citations = asArray(rec?.citations).join('\n');
  return /\bunstable_cache\b/.test(haystack) &&
    (/\bRuntime Cache\b/i.test(haystack) || /vercel\.com\/docs\/caching\/runtime-cache/i.test(citations));
}

function mentionsRuntimeCacheWhenCacheComponents(rec) {
  const haystack = recText(rec);
  const citations = asArray(rec?.citations).join('\n');
  return /\b(?:Runtime Cache|@vercel\/functions|getCache\s*\(|setCache\s*\()\b/i.test(haystack) ||
    /vercel\.com\/docs\/caching\/runtime-cache/i.test(citations);
}

function mentionsMultipleCacheLifeCalls(rec) {
  const haystack = recText(rec);
  const matches = haystack.match(/\bcacheLife\s*\(/g) ?? [];
  return matches.length > 1;
}

function mentionsCacheLifetimeChange(rec) {
  return /\bcacheLife\s*\(/.test(recText(rec));
}

function mentionsCacheLifeCdnHeaderClaim(rec) {
  const haystack = recText(rec);
  if (!/\bcacheLife\b/.test(haystack)) return false;
  return /\bcacheLife\b[^.\n]{0,240}\b(?:Cache-Control|s-maxage|CDN|edge cache|cache breakdown|x-vercel-cache|HIT|MISS|function (?:still )?runs per request|every request invokes the function)\b/i.test(haystack) ||
    /\b(?:Cache-Control|s-maxage|CDN|edge cache|cache breakdown|x-vercel-cache|HIT|MISS|function (?:still )?runs per request|every request invokes the function)\b[^.\n]{0,240}\bcacheLife\b/i.test(haystack) ||
    /\b(?:no|never|without|missing)\s+cacheLife\b[^.\n]{0,240}\b(?:no|not|never|0%|every|per request|function)\b[^.\n]{0,120}\b(?:cache|cached|hit|runs?|invoke)/i.test(haystack);
}

function mentionsNextCacheComponentsStaticShellTarget(rec) {
  const haystack = recText(rec);
  if (!/\b(?:cacheComponents|Cache Components|cacheLife|cacheTag|['"`]use cache['"`]|use cache|static shell|pre[- ]?render|prerender)\b/i.test(haystack)) {
    return false;
  }
  const files = [
    ...asArray(rec?.affectedFiles),
    ...asArray(rec?.findingRefs).map((ref) => String(ref).match(/^(.+?):\d+$/)?.[1]).filter(Boolean),
  ];
  return files.some((file) => /(^|\/)layout\.(?:tsx?|jsx?)$/.test(String(file)));
}

function mentionsImageResponseHeaders(rec) {
  const haystack = recText(rec);
  return /\bImageResponse\b/.test(haystack) &&
    /\bheaders?\b[\s\S]{0,200}\b(?:Cache-Control|s-maxage|CDN|response)\b|\b(?:Cache-Control|s-maxage|CDN)\b[\s\S]{0,200}\bheaders?\b/i.test(haystack);
}

function mentionsNextImagePriorityRecommendation(rec) {
  const haystack = recText(rec);
  if (!/\b(?:next\/image|<Image\b|Image component|image)\b/i.test(haystack)) return false;
  if (!/\bpriority\b/i.test(haystack)) return false;
  if (/\b(?:deprecated|replace|remove|avoid)\b[^.\n]{0,120}\bpriority\b/i.test(haystack) ||
      /\bpriority\b[^.\n]{0,120}\b(?:deprecated|replace|remove|avoid)\b/i.test(haystack)) {
    return false;
  }
  return /\b(?:set|add|use|enable|mark|make|turn on|with)\b[^.\n]{0,120}\bpriority\b/i.test(haystack) ||
    /<Image\b[^>]*\bpriority(?:\s|=|>)/i.test(haystack);
}

function mentionsNextCacheComponentsRouteSegmentConfig(rec) {
  const haystack = recText(rec);
  return /\b(?:export\s+const\s+)?(?:dynamicParams|fetchCache)\s*=/.test(haystack) ||
    /\bexport\s+const\s+(?:dynamic|revalidate)\b/.test(haystack) ||
    /\b(?:set|add|configure|use)\s+[^.\n]{0,80}\b(?:dynamicParams|fetchCache)\b/i.test(haystack) ||
    /\broute segment config options?\b[^.\n]{0,120}\b(?:Route Handlers?|handlers?)\b[^.\n]{0,120}\b(?:no longer apply|do not apply|removed)\b/i.test(haystack) ||
    /\b(?:revalidate|dynamic|fetchCache)\b[^.\n]{0,80}\broute segment (?:config|export)\b/i.test(haystack);
}

function mentionsRouteLevelRevalidate(rec) {
  const haystack = recText(rec);
  return /\bexport\s+const\s+revalidate\b/.test(haystack) ||
    /\broute[- ]level\s+revalidate\b/i.test(haystack) ||
    /\brevalidate\s*(?:=|:)\s*\d+\b[^.\n]{0,120}\b(?:page|layout|route segment|segment export)\b/i.test(haystack);
}

function mentionsExistingCacheTagInvalidation(rec) {
  const haystack = recText(rec);
  if (!/\bcacheTag\s*\(/.test(haystack)) return false;
  if (!/\b(?:revalidateTag|updateTag|invalidate|invalidation|revalidation|webhook|CMS|content-sync|content sync|publish|deploy)\b/i.test(haystack)) {
    return false;
  }
  return /\b(?:existing|current|already|keep|keeps|preserve|preserves|continue|continues|maintain|maintains|via)\b[\s\S]{0,180}\b(?:revalidateTag|updateTag|invalidate|invalidation|revalidation|event-driven|webhook|CMS|content-sync|content sync|publish|deploy|tags?)\b/i.test(haystack) ||
    /\b(?:invalidation|revalidation)\s+is\s+already\b/i.test(haystack) ||
    /\balready\s+event-driven\b/i.test(haystack);
}

function mentionsUnsafeImmutableDynamicRoute(rec) {
  const haystack = recText(rec);
  if (!/\bimmutable\b/i.test(haystack)) return false;
  const files = [
    ...asArray(rec?.affectedFiles),
    ...asArray(rec?.findingRefs).map((ref) => String(ref).match(/^(.+?):\d+$/)?.[1]).filter(Boolean),
  ];
  const routeHandler = files.some((file) => /(?:^|\/)route\.[cm]?[jt]sx?$/.test(String(file)));
  const apiRoute = /^cache_header_gap:\/api\//.test(String(rec?.candidateRef ?? ''));
  return routeHandler || apiRoute;
}

function mentionsAuthSensitiveParallelization(rec) {
  const haystack = recText(rec);
  if (!/\b(?:parallelize|Promise\.all|run concurrently|start .* early)\b/i.test(haystack)) return false;
  if (!/\b(?:auth|authorize|authorization|ownership|owns|owner|private|session|permission|access)\b/i.test(haystack)) return false;
  return /\b(?:private|secret|token|registrant|account|user|ticket|payment|session)\w*\b/i.test(haystack);
}

function mentionsParallelizationImpactOverclaim(rec) {
  const haystack = recText(rec);
  if (!/\b(?:parallelize|Promise\.all|run concurrently|start .* early)\b/i.test(haystack)) return false;
  return /\b(?:drop|drops|reduce|reduces|reduction|save|saves|shave|shaves)\b[^.\n]{0,200}\b(?:roughly|approximately|about|around|equal\s+to)?\s*(?:the\s+)?(?:duration\s+of\s+[A-Za-z_$][\w$]*\s*\(\s*\)|min\s*\([^)]*duration[^)]*\)|one\s+[\w-]+\s+round[- ]trip|one\s+await|one\s+network\s+call|one\s+database\s+query)/i.test(haystack);
}

function mentionsCpuBoundParallelization(rec) {
  const haystack = recText(rec);
  if (!/\b(?:parallelize|Promise\.all|run concurrently|start .* early)\b/i.test(haystack)) return false;
  return /\b(?:cpu\.p95|CPU p95|cpu p95|CPU-bound|compute-bound|in-process compute|compileMDX|MDX compilation|compilation|render compute)\b/i.test(haystack);
}

function mentionsCachedNotFoundOr404(rec) {
  const haystack = recText(rec);
  if (!/\b(?:s-maxage|CDN-Cache-Control|Vercel-CDN-Cache-Control|Cache-Control)\b/i.test(haystack)) return false;
  return /\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b/i.test(haystack);
}

function mentionsRuntimeErrorCause(rec) {
  if (!/^route_errors:/.test(String(rec?.candidateRef ?? ''))) return false;
  const haystack = recText(rec);
  return /\b(?:ENOENT|ETIMEDOUT|ECONNRESET|outputFileTracing|missing\s+(?:file|mdx|module)|no\s+(?:matching|corresponding)\s+(?:file|mdx|post)|does\s+not\s+exist|signature\s+of|root cause|caused by|unhandled\s+exceptions?|uncaught(?:-exception)?|throws?|bubbles?\s+to\s+the\s+runtime|reads?\s+[^.]{0,80}(?:filePath|filesystem|file system|disk)|readFile)\b/i.test(haystack);
}

function mentionsCatchToNotFound(rec) {
  if (!/^route_errors:/.test(String(rec?.candidateRef ?? ''))) return false;
  const haystack = recText(rec);
  return /\bcatch\b/i.test(haystack) &&
    /\b(?:404|not[- ]found|not found|notFound)\b/i.test(haystack);
}

function mentionsIgnoredBuildStepRecommendation(rec) {
  const haystack = recText(rec);
  return /\b(?:Ignored Build Step|ignoreCommand|turbo-ignore|skip unaffected|unaffected projects?)\b/i.test(haystack) &&
    /\b(?:add|set|configure|enable|use|introduce|wire|adopt|turn on)\b[^.\n]{0,180}\b(?:Ignored Build Step|ignoreCommand|turbo-ignore|skip unaffected|unaffected projects?)\b/i.test(haystack);
}

function mentionsTurboBuildCacheRecommendation(rec) {
  const haystack = recText(rec);
  if (!/\b(?:Turbo|Turborepo|turbo\.json|tasks\.build|build cache|build caching)\b/i.test(haystack)) return false;
  return /\b(?:enable|re-enable|restore|turn on|set|remove)\b[^.\n]{0,220}\b(?:cache\s*:\s*false|tasks\.build\.cache|build cache|build caching|Turbo cache|Turborepo cache)\b/i.test(haystack) ||
    /\b(?:cache\s*:\s*false|tasks\.build\.cache|build cache|build caching|Turbo cache|Turborepo cache)\b[^.\n]{0,220}\b(?:enable|re-enable|restore|turn on|set|remove)\b/i.test(haystack);
}

function recText(rec) {
  return [
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.currentBehavior,
    rec?.desiredBehavior,
    rec?.verify,
  ].filter(Boolean).join('\n');
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export function summarizeClaimResults(results) {
  const counts = { verified: 0, failed: 0, unsupported: 0, unverifiable: 0 };
  for (const r of results) {
    if (r?.disposition && counts[r.disposition] !== undefined) counts[r.disposition]++;
  }
  const verifiable = counts.verified + counts.failed;
  const passRate = verifiable > 0 ? counts.verified / verifiable : 1;
  return { ...counts, verifiable, passRate, total: results.length };
}
