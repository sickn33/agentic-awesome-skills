// Pure async claim verifier. No LLM, no network — fs + grep only.

import { readFile, access, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, isAbsolute, join, normalize } from 'node:path';
import { promisify } from 'node:util';
import { isKnownUrl, sanitizeCitations } from './citations.mjs';
import { findRecContradictions } from './project-facts.mjs';
import { canonicalizeRoute } from './route-normalize.mjs';
import { escapeRegex } from './util.mjs';

const execFileP = promisify(execFile);
const cacheInvalidationFileCache = new Map();

// Bad inputs surface as `unsupported` — never throws.
export async function verifyClaim(claim) {
  if (!claim || typeof claim !== 'object') {
    return { disposition: 'unverifiable', reason: 'claim is not an object' };
  }
  switch (claim.type) {
    case 'file_exists':                  return verifyFileExists(claim);
    case 'pattern_count':                return verifyPatternCount(claim);
    case 'pattern_exists':               return verifyPatternExists(claim);
    case 'pattern_absent':               return verifyPatternAbsent(claim);
    case 'code_snippet':                 return verifyCodeSnippet(claim);
    case 'repo_count':                   return verifyRepoCount(claim);
    case 'citation_in_library':          return verifyCitationInLibrary(claim);
    case 'citation_applies_to_version':  return verifyCitationAppliesToVersion(claim);
    case 'cache_vary_matches_dynamic_inputs': return verifyCacheVaryMatchesDynamicInputs(claim);
    case 'cache_vary_cardinality_safe': return verifyCacheVaryCardinalitySafe(claim);
    case 'next_cached_not_found_causal_support': return verifyNextCachedNotFoundCausalSupport(claim);
    case 'next_stable_cache_api_for_version': return verifyNextStableCacheApiForVersion(claim);
    case 'next_runtime_cache_api_for_version': return verifyNextRuntimeCacheApiForVersion(claim);
    case 'next_cache_components_runtime_cache_preference': return verifyNextCacheComponentsRuntimeCachePreference(claim);
    case 'next_cache_life_single_execution': return verifyNextCacheLifeSingleExecution(claim);
    case 'next_cache_lifetime_freshness_supported': return verifyNextCacheLifetimeFreshnessSupported(claim);
    case 'next_cache_components_route_chain_file': return verifyNextCacheComponentsRouteChainFile(claim);
    case 'next_cache_life_cdn_header_semantics': return verifyNextCacheLifeCdnHeaderSemantics(claim);
    case 'image_response_headers_citation': return verifyImageResponseHeadersCitation(claim);
    case 'next_image_priority_api_for_version': return verifyNextImagePriorityApiForVersion(claim);
    case 'next_cache_components_route_segment_config': return verifyNextCacheComponentsRouteSegmentConfig(claim);
    case 'next_route_revalidate_static_prereq': return verifyNextRouteRevalidateStaticPrereq(claim);
    case 'next_cache_tag_invalidation_supported': return verifyNextCacheTagInvalidationSupported(claim);
    case 'cache_rec_not_error_dominated_or_acknowledged': return verifyCacheRecNotErrorDominatedOrAcknowledged(claim);
    case 'cache_control_header_syntax': return verifyCacheControlHeaderSyntax(claim);
    case 'cache_control_headers_citation': return verifyCacheControlHeadersCitation(claim);
    case 'cache_policy_positive_or_no_ready_rec': return verifyCachePolicyPositiveOrNoReadyRec(claim);
    case 'cache_404_long_ttl_safety': return verifyCache404LongTtlSafety(claim);
    case 'route_error_not_found_status_and_scope': return verifyRouteErrorNotFoundStatusAndScope(claim);
    case 'immutable_dynamic_route_safety': return verifyImmutableDynamicRouteSafety(claim);
    case 'auth_guard_parallelization_safety': return verifyAuthGuardParallelizationSafety(claim);
    case 'parallelization_impact_not_overclaimed': return verifyParallelizationImpactNotOverclaimed(claim);
    case 'parallelization_not_cpu_bound_work': return verifyParallelizationNotCpuBoundWork(claim);
    case 'runtime_error_cause_supported': return verifyRuntimeErrorCauseSupported(claim);
    case 'vercel_ignore_command_project_state': return verifyVercelIgnoreCommandProjectState(claim);
    case 'turbo_build_cache_safety': return verifyTurboBuildCacheSafety(claim);
    case 'does_not_contradict_project_config': return verifyNoProjectConfigContradiction(claim);
    default:
      return { disposition: 'unverifiable', reason: `unknown claim type: ${claim.type}` };
  }
}

// Catches "enable fluid compute" recs that the brief negative-space filter let through.
async function verifyNoProjectConfigContradiction({ rec, projectFacts }) {
  if (!rec) return { disposition: 'unsupported', reason: 'no rec attached to claim' };
  if (!Array.isArray(projectFacts) || projectFacts.length === 0) {
    return { disposition: 'unverifiable', reason: 'no project facts available' };
  }
  const hits = findRecContradictions(rec, projectFacts);
  if (hits.length === 0) {
    return { disposition: 'verified', reason: 'rec does not contradict any already-on project setting' };
  }
  const ids = hits.map((h) => h.id).join(', ');
  return {
    disposition: 'failed',
    reason: `rec contradicts project config: recommends toggling on already-enabled ${ids}`,
  };
}

async function verifyFileExists(claim) {
  const { file } = claim;
  if (!file) return { disposition: 'unsupported', reason: 'file_exists requires file' };
  try {
    await firstAccessiblePath(claim);
    return { disposition: 'verified', reason: `${file} exists` };
  } catch {
    return { disposition: 'failed', reason: `${file} does not exist` };
  }
}

async function verifyPatternCount(claim) {
  const { file, pattern, expected } = claim;
  if (!file || !pattern) return { disposition: 'unsupported', reason: 'pattern_count requires file + pattern' };
  let content;
  try { ({ content } = await readClaimFile(claim)); }
  catch { return { disposition: 'failed', reason: `cannot read ${file}` }; }

  // "42" alone (from `filename:42`) is a line number, not a pattern.
  if (/^\d+$/.test(pattern.trim())) {
    return { disposition: 'unsupported', reason: 'pattern looks like a line number, not a pattern' };
  }

  const re = compilePattern(pattern, 'g');
  const matches = content.match(re) ?? [];
  const actual = matches.length;
  return actual === expected
    ? { disposition: 'verified', actual, expected, reason: 'exact count match' }
    : { disposition: 'failed', actual, expected, reason: `count mismatch: claim=${expected}, actual=${actual}` };
}

async function verifyPatternExists(claim) {
  const { file, pattern } = claim;
  if (!file || !pattern) return { disposition: 'unsupported', reason: 'pattern_exists requires file + pattern' };
  try {
    const { content } = await readClaimFile(claim);
    const found = compilePattern(pattern, '').test(content);
    return { disposition: found ? 'verified' : 'failed', reason: found ? 'pattern present' : 'pattern not found' };
  } catch {
    return { disposition: 'failed', reason: `cannot read ${file}` };
  }
}

async function verifyPatternAbsent(claim) {
  const { file, pattern } = claim;
  if (!file || !pattern) return { disposition: 'unsupported', reason: 'prose-of-absence: claim requires file + pattern to verify' };
  try {
    const { content } = await readClaimFile(claim);
    const found = compilePattern(pattern, '').test(content);
    return { disposition: !found ? 'verified' : 'failed', reason: !found ? 'pattern absent as claimed' : 'pattern present despite claim of absence' };
  } catch {
    return { disposition: 'failed', reason: `cannot read ${file}` };
  }
}

async function verifyCodeSnippet(claim) {
  const { file, snippet, repoRoot = '.' } = claim;
  if (!file || !snippet) return { disposition: 'unsupported', reason: 'code_snippet requires file + snippet' };
  try {
    const { content } = await readClaimFile(claim);
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    if (norm(content).includes(norm(snippet))) {
      return { disposition: 'verified', reason: 'snippet found in cited file' };
    }
    const elsewhere = await snippetFoundElsewhere(repoRoot, snippet, file);
    if (elsewhere) {
      return { disposition: 'unsupported', reason: `snippet exists in ${elsewhere}, not in cited ${file}` };
    }
    return { disposition: 'failed', reason: 'snippet not found in cited file or repo' };
  } catch {
    return { disposition: 'failed', reason: `cannot read ${file}` };
  }
}

async function verifyRepoCount({ pattern, expected, repoRoot = '.' }) {
  if (!pattern || expected == null) return { disposition: 'unsupported', reason: 'repo_count requires pattern + expected' };
  let actual = 0;
  const re = compilePattern(pattern, '');
  for await (const path of walkFiles(repoRoot)) {
    try {
      const content = await readFile(path, 'utf-8');
      if (re.test(content)) actual++;
    } catch {}
  }
  return actual === expected
    ? { disposition: 'verified', actual, expected, reason: 'exact file count match' }
    : { disposition: 'failed', actual, expected, reason: `file count: claim=${expected}, actual=${actual}` };
}

async function verifyCitationInLibrary({ url }) {
  if (!url) return { disposition: 'unsupported', reason: 'citation_in_library requires url' };
  if (/^[\w-]+:[\w-]+$/.test(url)) {
    return { disposition: 'verified', reason: 'skill-rule reference format (allowed)' };
  }
  const known = await isKnownUrl(url);
  return known
    ? { disposition: 'verified', reason: 'URL in curated library' }
    : { disposition: 'failed', reason: 'URL not in curated library — likely hallucination' };
}

async function verifyCitationAppliesToVersion({ url, framework, frameworkVersion }) {
  if (!url || !framework || !frameworkVersion) {
    return { disposition: 'unsupported', reason: 'requires url + framework + frameworkVersion' };
  }
  const fakeRec = { citations: [url] };
  const { rec, strippedVersion, strippedUnknown } = await sanitizeCitations(fakeRec, framework, frameworkVersion);
  if (strippedUnknown.length > 0) {
    return { disposition: 'failed', reason: 'URL not in library' };
  }
  if (strippedVersion.length > 0) {
    return { disposition: 'failed', reason: `URL not applicable to ${framework}@${frameworkVersion}` };
  }
  return rec.citations.length > 0
    ? { disposition: 'verified', reason: `URL applies to ${framework}@${frameworkVersion}` }
    : { disposition: 'unsupported', reason: 'sanitizer stripped all citations for unknown reason' };
}

async function verifyCacheVaryMatchesDynamicInputs({ rec, files, repoRoot = '.', projectRootDirectory = null }) {
  if (!rec || !Array.isArray(files) || files.length === 0) {
    return { disposition: 'unsupported', reason: 'cache_vary_matches_dynamic_inputs requires rec + files' };
  }

  let usesVercelGeo = false;
  for (const file of files) {
    try {
      const { content } = await readClaimFile({ file, repoRoot, projectRootDirectory });
      if (/\bgeolocation\s*\(/.test(content) ||
          /\b\w+\.geo\??\./.test(content) ||
          /['"]x-vercel-ip-(?:country|country-region|city|latitude|longitude|postal-code|timezone)['"]/i.test(content)) {
        usesVercelGeo = true;
        break;
      }
    } catch {}
  }
  if (!usesVercelGeo) {
    return { disposition: 'verified', reason: 'cache rec does not touch Vercel geolocation inputs' };
  }

  const text = [rec.what, rec.why, rec.fix, rec.currentBehavior, rec.desiredBehavior, rec.verify]
    .filter(Boolean)
    .join('\n');
  const hasCoarseGeoVary = hasHeaderValue(text, 'Vary', /(?:^|,\s*)X-Vercel-IP-(?:Country|Country-Region|City)(?:\s*,|$)/i);
  if (hasCoarseGeoVary) {
    return { disposition: 'verified', reason: 'cache rec varies by a coarse Vercel geolocation header for geolocation-dependent output' };
  }
  return {
    disposition: 'failed',
    reason: 'cache rec touches Vercel geolocation but does not vary by a coarse Vercel geolocation header such as X-Vercel-IP-Country, X-Vercel-IP-Country-Region, or X-Vercel-IP-City',
  };
}

async function verifyCacheVaryCardinalitySafe({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_vary_cardinality_safe requires rec' };
  const text = recText(rec);
  const varyValues = extractHeaderValues(text, 'Vary').join(', ');
  if (!varyValues) {
    return { disposition: 'verified', reason: 'no concrete Vary header value detected' };
  }
  if (/\bX-Vercel-IP-(?:Latitude|Longitude|Postal-Code)\b/i.test(varyValues)) {
    return {
      disposition: 'failed',
      reason: 'Vary on X-Vercel-IP-Latitude, X-Vercel-IP-Longitude, or X-Vercel-IP-Postal-Code creates very high-cardinality CDN cache keys; use a coarser geography header when safe, or leave the response uncached',
    };
  }
  return { disposition: 'verified', reason: 'Vary header avoids known high-cardinality geolocation headers' };
}

async function verifyNextCachedNotFoundCausalSupport({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cached_not_found_causal_support requires rec' };
  const text = recText(rec);
  const citations = Array.isArray(rec.citations) ? rec.citations.join('\n') : '';
  const hasSpecificCitation = /nextjs\.org\/docs\/app\/api-reference\/functions\/not-found/i.test(citations) &&
    /nextjs\.org\/docs\/app\/api-reference\/directives\/use-cache/i.test(citations);
  const hasRuntimeStack = /\b(?:stack|logs?|trace)\b[\s\S]{0,120}\b(?:NEXT_|notFound|NEXT_HTTP_ERROR_FALLBACK|Error:)\b/i.test(text);
  if (hasSpecificCitation || hasRuntimeStack) {
    return { disposition: 'verified', reason: 'cached notFound causal claim has Next-specific citation or runtime stack evidence' };
  }
  return {
    disposition: 'failed',
    reason: 'notFound() inside use cache was claimed as a 5xx cause without Next-specific citation or runtime stack evidence',
  };
}

async function verifyNextStableCacheApiForVersion({ rec, framework, frameworkVersion }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_stable_cache_api_for_version requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'stable Next.js 16 cache API requirement does not apply' };
  }
  const text = recText(rec);
  if (/\bunstable_(?:cacheLife|cacheTag)\b/.test(text)) {
    return {
      disposition: 'failed',
      reason: 'Next.js 16 rec uses unstable cache API; use cacheLife/cacheTag from next/cache',
    };
  }
  if (/\brevalidateTag\s*\([^)]*['"`][^'"`]+['"`]\s*\)/.test(text) &&
      !/\brevalidateTag\s*\([^)]*['"`][^'"`]+['"`]\s*,/.test(text)) {
    return {
      disposition: 'failed',
      reason: 'Next.js 16 revalidateTag examples must include the cache-life profile argument',
    };
  }
  return { disposition: 'verified', reason: 'Next.js 16 cache API usage matches stable names' };
}

async function verifyNextRuntimeCacheApiForVersion({ rec, framework, frameworkVersion }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_runtime_cache_api_for_version requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'Next.js 16 Runtime Cache API requirement does not apply' };
  }
  const text = recText(rec);
  const citations = Array.isArray(rec.citations) ? rec.citations.join('\n') : '';
  if (/\bunstable_cache\b/.test(text) &&
      (/\bRuntime Cache\b/i.test(text) || /vercel\.com\/docs\/caching\/runtime-cache/i.test(citations))) {
    return {
      disposition: 'failed',
      reason: 'Next.js 16 Runtime Cache recommendations must use use cache: remote or fetch with force-cache, not unstable_cache',
    };
  }
  return { disposition: 'verified', reason: 'Next.js Runtime Cache API usage matches project version' };
}

async function verifyNextCacheComponentsRuntimeCachePreference({ rec, framework, cacheComponents }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_components_runtime_cache_preference requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  if (cacheComponents !== true) {
    return { disposition: 'verified', reason: 'Cache Components not detected as enabled' };
  }
  const text = recText(rec);
  if (/\buse cache:\s*remote\b/i.test(text)) {
    return { disposition: 'verified', reason: 'recommendation uses framework-native remote cache for Cache Components project' };
  }
  if (/\b(?:fallback|only if|when Cache Components (?:is|are) unavailable|if cacheComponents is false)\b[^.\n]{0,180}\b(?:Runtime Cache|@vercel\/functions|getCache\s*\()/i.test(text)) {
    return { disposition: 'verified', reason: 'Runtime Cache is framed as a fallback, not the primary Cache Components path' };
  }
  return {
    disposition: 'failed',
    reason: 'Next.js Cache Components is enabled; prefer `use cache: remote` before recommending lower-level Runtime Cache APIs',
  };
}

async function verifyNextCacheLifeSingleExecution({ rec, framework, frameworkVersion }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_life_single_execution requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'Next.js 16 cacheLife execution rule does not apply' };
  }
  const text = recText(rec);
  const calls = [...text.matchAll(/\bcacheLife\s*\(/g)].map((m) => m.index ?? -1).filter((i) => i >= 0);
  if (calls.length <= 1) {
    return { disposition: 'verified', reason: 'at most one cacheLife() call appears in the recommendation' };
  }
  for (let i = 0; i < calls.length - 1; i++) {
    const between = text.slice(calls[i], calls[i + 1]);
    if (/\b(?:if|else|switch|case)\b|[?:]/.test(between)) continue;
    return {
      disposition: 'failed',
      reason: 'multiple cacheLife() calls appear on one recommended code path; only one should execute per function invocation',
    };
  }
  return { disposition: 'verified', reason: 'multiple cacheLife() calls appear only in separate control-flow branches' };
}

async function verifyNextCacheLifetimeFreshnessSupported({ rec, files, repoRoot = '.', projectRootDirectory = null }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_lifetime_freshness_supported requires rec' };
  const text = recText(rec);
  if (!/\bcacheLife\s*\(/.test(text)) {
    return { disposition: 'verified', reason: 'no cacheLife() lifetime change detected' };
  }

  const tags = dedupeCacheTags([
    ...extractCacheTags(text),
    ...await extractCacheTagsFromFiles(files, repoRoot, projectRootDirectory),
  ]);
  if (tags.length === 0) {
    if (cacheLifeNeedsContentFreshnessProof(text)) {
      return {
        disposition: 'failed',
        reason: 'cacheLife() lengthens content-derived data without cacheTag/revalidateTag evidence; add invalidation evidence or keep the finding out of the ready-to-apply list',
      };
    }
    return { disposition: 'unverifiable', reason: 'cacheLife() rec has no cacheTag evidence to verify against invalidation' };
  }

  const recTextAsFile = [{ path: '<recommendation>', content: text }];
  const invalidationFiles = [
    ...recTextAsFile,
    ...await readCacheInvalidationFiles(repoRoot, projectRootDirectory),
  ];
  const missing = tags.filter((tag) => !tagHasMatchingInvalidation(tag, invalidationFiles));
  if (missing.length === 0) {
    return { disposition: 'verified', reason: 'cacheLife() freshness change has matching cache tag invalidation evidence' };
  }
  return {
    disposition: 'failed',
    reason: `cacheLife() would lengthen tagged content without matching revalidateTag/updateTag evidence for: ${missing.map((t) => t.label).join(', ')}`,
  };
}

async function verifyNextCacheComponentsRouteChainFile({ rec, framework, frameworkVersion, cacheComponents, signals }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_components_route_chain_file requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'Cache Components route-chain check does not apply' };
  }
  if (cacheComponents !== true) {
    return { disposition: 'verified', reason: 'Cache Components not detected as enabled' };
  }
  const targetRoute = routeFromCandidateRef(rec.candidateRef);
  if (!targetRoute) {
    return { disposition: 'unverifiable', reason: 'Cache Components layout recommendation has no route candidateRef' };
  }
  const routeRows = Array.isArray(signals?.codebase?.routes) ? signals.codebase.routes : [];
  if (routeRows.length === 0) {
    return { disposition: 'unverifiable', reason: 'codebase route map unavailable for layout route-chain check' };
  }
  const layoutFiles = recommendationFilesFromRec(rec)
    .filter((file) => /(^|\/)layout\.(?:tsx?|jsx?)$/.test(String(file)));
  if (layoutFiles.length === 0) {
    return { disposition: 'verified', reason: 'no layout files named in recommendation' };
  }
  const layoutRoutes = routeRows.filter((route) =>
    route?.type === 'layout' &&
    route?.file &&
    layoutFiles.some((file) => pathSuffixMatches(file, route.file))
  );
  if (layoutRoutes.length === 0) {
    return {
      disposition: 'failed',
      reason: 'Cache Components recommendation cites a layout file that is not present in the scanned route map',
    };
  }
  const target = normalizeRouteForLayoutMatch(targetRoute);
  const matchingLayout = layoutRoutes.find((layout) =>
    layoutAppliesToCandidateRoute(layout.routePath, target)
  );
  if (matchingLayout) {
    return {
      disposition: 'verified',
      reason: `layout ${matchingLayout.file} is in the observed route chain for ${targetRoute}`,
    };
  }
  return {
    disposition: 'failed',
    reason: 'Cache Components recommendation cites a layout file outside the observed route chain for this candidate route',
  };
}

async function verifyNextCacheLifeCdnHeaderSemantics({ rec, framework, frameworkVersion }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_life_cdn_header_semantics requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 15) {
    return { disposition: 'verified', reason: 'Cache Components cacheLife semantics do not apply to this Next.js version' };
  }
  return {
    disposition: 'failed',
    reason: 'cacheLife() controls the Cache Components lifetime and defaults to the default profile when omitted; do not claim it emits CDN Cache-Control headers or that missing cacheLife alone makes a route run per request without production header evidence',
  };
}

async function verifyImageResponseHeadersCitation({ rec, framework }) {
  if (!rec) return { disposition: 'unsupported', reason: 'image_response_headers_citation requires rec' };
  if (framework && framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const citations = Array.isArray(rec.citations) ? rec.citations.join('\n') : '';
  if (/nextjs\.org\/docs\/app\/api-reference\/functions\/image-response/i.test(citations)) {
    return { disposition: 'verified', reason: 'ImageResponse header option is backed by the ImageResponse API reference' };
  }
  return {
    disposition: 'failed',
    reason: 'ImageResponse header changes need the ImageResponse API reference citation',
  };
}

async function verifyNextImagePriorityApiForVersion({ rec, framework, frameworkVersion }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_image_priority_api_for_version requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'next/image priority deprecation does not apply before Next.js 16' };
  }
  const text = recText(rec);
  if (/\b(?:preload|fetchPriority|loading\s*=\s*['"`]eager['"`]|loading:\s*['"`]eager['"`])\b/.test(text) &&
      !/<Image\b[^>]*\bpriority(?:\s|=|>)/i.test(text)) {
    return { disposition: 'verified', reason: 'Next.js 16 image preload guidance uses the replacement API' };
  }
  return {
    disposition: 'failed',
    reason: 'Next.js 16 deprecates next/image priority; use preload, fetchPriority, or loading="eager" based on the image loading intent',
  };
}

async function verifyNextCacheComponentsRouteSegmentConfig({ rec, framework, frameworkVersion, cacheComponents }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_components_route_segment_config requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  const major = parseInt(String(frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 16) {
    return { disposition: 'verified', reason: 'Cache Components route segment config restriction does not apply' };
  }
  if (cacheComponents !== true) {
    return { disposition: 'verified', reason: 'Cache Components not detected as enabled' };
  }
  const text = recText(rec);
  if (/\broute segment config options?\b[^.\n]{0,120}\b(?:Route Handlers?|handlers?)\b[^.\n]{0,120}\b(?:no longer apply|do not apply|removed)\b/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'Route Segment Config still has Route Handler options; with Cache Components only dynamic, revalidate, and fetchCache are removed',
    };
  }
  const blocked = [
    /\bdynamicParams\b/.test(text) ? 'dynamicParams' : null,
    /\bfetchCache\b/.test(text) ? 'fetchCache' : null,
    /\bexport\s+const\s+dynamic\b/.test(text) ? 'dynamic' : null,
    /\bexport\s+const\s+revalidate\b/.test(text) ? 'revalidate' : null,
  ].filter(Boolean);
  if (blocked.length === 0) {
    return { disposition: 'verified', reason: 'no removed route segment config option detected' };
  }
  return {
    disposition: 'failed',
    reason: `Next.js ${major} project has Cache Components enabled; route segment config option(s) ${blocked.join(', ')} are removed and must not be recommended`,
  };
}

async function verifyNextRouteRevalidateStaticPrereq({ rec, framework, cacheComponents, repoRoot = '.', projectRootDirectory = null }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_route_revalidate_static_prereq requires rec' };
  if (framework !== 'next') return { disposition: 'verified', reason: 'not a Next.js project' };
  if (cacheComponents === true) {
    return { disposition: 'verified', reason: 'Cache Components route-segment restrictions are handled separately' };
  }
  const files = recommendationFilesFromRec(rec)
    .filter((file) => /(^|\/)app\/.+\/(?:page|layout|template)\.(?:tsx?|jsx?)$/.test(String(file)) ||
      /(^|\/)(?:page|layout|template)\.(?:tsx?|jsx?)$/.test(String(file)));
  if (files.length === 0) {
    return { disposition: 'verified', reason: 'route-level revalidate recommendation does not target a page/layout/template file' };
  }

  const dynamicHits = [];
  for (const file of files) {
    const routeChain = await readNextRouteChainFiles(file, repoRoot, projectRootDirectory);
    if (routeChain.length === 0) {
      return { disposition: 'unverifiable', reason: `could not inspect route chain for ${file}` };
    }
    for (const entry of routeChain) {
      const hit = firstDynamicRouteChainReason(entry.content);
      if (hit) dynamicHits.push(`${entry.relative}:${hit}`);
    }
  }
  if (dynamicHits.length > 0) {
    return {
      disposition: 'failed',
      reason: `route-level revalidate can be defeated by request-time APIs or auth helpers in the route chain (${dynamicHits.slice(0, 3).join(', ')}); prove the route is ISR/static from next build output or move the dynamic read out before recommending revalidate`,
    };
  }
  return { disposition: 'verified', reason: 'no request-time API or common auth helper detected in the recommended route chain' };
}

async function verifyNextCacheTagInvalidationSupported({ rec, repoRoot = '.', projectRootDirectory = null }) {
  if (!rec) return { disposition: 'unsupported', reason: 'next_cache_tag_invalidation_supported requires rec' };
  const tags = extractCacheTags(recText(rec));
  if (tags.length === 0) {
    return { disposition: 'unsupported', reason: 'cache invalidation claim did not include parseable cacheTag() values' };
  }

  let files;
  try {
    files = await readCacheInvalidationFiles(repoRoot, projectRootDirectory);
  } catch {
    return { disposition: 'unverifiable', reason: 'could not scan repo for matching revalidateTag/updateTag calls' };
  }

  const missing = [];
  for (const tag of tags) {
    if (!tagHasMatchingInvalidation(tag, files)) missing.push(tag.label);
  }
  if (missing.length === 0) {
    return { disposition: 'verified', reason: 'every claimed cacheTag has a matching revalidateTag/updateTag path' };
  }
  return {
    disposition: 'failed',
    reason: `cache invalidation was claimed for tag(s) without matching revalidateTag/updateTag evidence: ${missing.join(', ')}`,
  };
}

async function verifyCacheRecNotErrorDominatedOrAcknowledged({ rec, signals }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_rec_not_error_dominated_or_acknowledged requires rec' };
  const route = routeFromCandidateRef(rec.candidateRef);
  if (!route) return { disposition: 'unverifiable', reason: 'cache recommendation has no route candidateRef' };
  const status = functionStatusForRoute(signals, route);
  if (!status || status.total <= 0) {
    return { disposition: 'unverifiable', reason: 'no function status metrics available for cache route' };
  }
  const errorRate = status.errors / status.total;
  if (errorRate <= 0.2) {
    return { disposition: 'verified', reason: `function 5xx rate is not dominant (${formatPct(errorRate)})` };
  }
  const text = recText(rec);
  if (/\b(?:5xx|500|errors?|error-rate|non-error|successful|2xx|after\s+(?:fixing|resolving)\s+errors?)\b/i.test(text)) {
    return { disposition: 'verified', reason: `cache recommendation acknowledges high 5xx share (${formatPct(errorRate)})` };
  }
  return {
    disposition: 'failed',
    reason: `route has high function 5xx share (${formatPct(errorRate)}); cache impact must exclude or acknowledge error traffic`,
  };
}

async function verifyCacheControlHeaderSyntax({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_control_header_syntax requires rec' };
  const values = [
    ...extractHeaderValues(recText(rec), 'Cache-Control'),
    ...extractHeaderValues(recText(rec), 'CDN-Cache-Control'),
    ...extractHeaderValues(recText(rec), 'Vercel-CDN-Cache-Control'),
  ];
  if (values.length === 0) {
    return { disposition: 'unverifiable', reason: 'no parseable Cache-Control header value in recommendation' };
  }
  const invalid = values.find((value) => hasEmptyCacheDirective(value));
  if (invalid) {
    return {
      disposition: 'failed',
      reason: `Cache-Control header contains an empty directive: ${invalid}`,
    };
  }
  return { disposition: 'verified', reason: 'cache header directives are syntactically non-empty' };
}

async function verifyCacheControlHeadersCitation({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_control_headers_citation requires rec' };
  const citations = Array.isArray(rec.citations) ? rec.citations.join('\n') : '';
  if (/vercel\.com\/docs\/caching\/(?:cache-control-headers|cdn-cache)/i.test(citations)) {
    return { disposition: 'verified', reason: 'Cache-Control change is backed by Vercel cache documentation' };
  }
  return {
    disposition: 'failed',
    reason: 'Cache-Control header changes need Vercel cache documentation citation',
  };
}

async function verifyCachePolicyPositiveOrNoReadyRec({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_policy_positive_or_no_ready_rec requires rec' };
  const text = recText(rec);
  const positivePolicy = /\b(?:s-maxage|stale-while-revalidate|CDN-Cache-Control|Vercel-CDN-Cache-Control|Cache-Control:\s*public|next:\s*\{\s*revalidate|revalidate\s*[:=]\s*\d|cacheLife\s*\(|cacheTag\s*\(|['"`]use cache(?::\s*remote)?['"`]|Runtime Cache|getCache\s*\(|force-cache)\b/i.test(text);
  if (positivePolicy) {
    return { disposition: 'verified', reason: 'cache recommendation names a positive cache policy' };
  }
  if (/\b(?:no-store|no-cache|cache:\s*['"`]no-store['"`])\b/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'cache candidates must not ship a no-store-only recommendation; if no-store is correct, report no change instead',
    };
  }
  return {
    disposition: 'failed',
    reason: 'cache candidate recommendation does not name a cache policy; specify CDN headers, framework cache, Runtime Cache, or report no change',
  };
}

async function verifyCache404LongTtlSafety({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'cache_404_long_ttl_safety requires rec' };
  const text = recText(rec);
  if (/\b(?:leave|keep|leaving|keeping)\b[^.\n]{0,120}\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b[^.\n]{0,120}\b(?:uncached|no-store|no-cache|short|separate)\b/i.test(text) ||
      /\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b[^.\n]{0,120}\b(?:uncached|no-store|no-cache|short|separate)\b/i.test(text)) {
    return { disposition: 'verified', reason: 'recommendation keeps 404/not-found caching separate or uncached' };
  }
  if (/\b(?:both|all)\b[^.\n]{0,120}\bResponse\b[^.\n]{0,120}\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b/i.test(text) ||
      /\b(?:add|set|include)\b[^.\n]{0,160}\b(?:Cache-Control|s-maxage|stale-while-revalidate|CDN-Cache-Control|Vercel-CDN-Cache-Control)\b[^.\n]{0,220}\b(?:each|every|all|both|\d+|four)\b[^.\n]{0,120}\bResponse\b[^.\n]{0,160}\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b/i.test(text) ||
      /\b(?:404|not[- ]found|notFound|not found branch|not-found branch)\b[^.\n]{0,160}\b(?:s-maxage|stale-while-revalidate|CDN-Cache-Control|Vercel-CDN-Cache-Control)\b/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'long shared caching for 404/not-found branches needs explicit freshness evidence; leave those branches uncached or short-lived',
    };
  }
  return {
    disposition: 'failed',
    reason: 'cache recommendation mentions a 404/not-found branch without explicitly keeping that branch uncached or short-lived',
  };
}

async function verifyRouteErrorNotFoundStatusAndScope({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'route_error_not_found_status_and_scope requires rec' };
  const text = recText(rec);
  const hasExplicit404 = /\bstatus\s*:\s*404\b/i.test(text);
  if (!hasExplicit404) {
    return {
      disposition: 'failed',
      reason: 'not-found error handling must set an explicit 404 status; a markdown/body-only Response defaults to 200',
    };
  }
  if (routeErrorFixExplicitlyConvertsUnexpectedErrorsToNotFound(text)) {
    return {
      disposition: 'failed',
      reason: 'route-error 404 fixes must not convert unexpected exceptions into not-found responses; classify expected misses and preserve 5xx behavior for unknown errors',
    };
  }
  const classifiesKnownMiss = /\b(?:known|expected|missing|not[- ]found|not found|ENOENT|NoSuchKey|content[- ]miss|file[- ]miss)\b[^.\n]{0,160}\b(?:only|separate|classif|branch|guard|case)\b/i.test(text) ||
    /\b(?:only|separate|classif|branch|guard|case)\b[^.\n]{0,160}\b(?:known|expected|missing|not[- ]found|not found|ENOENT|NoSuchKey|content[- ]miss|file[- ]miss)\b/i.test(text);
  const preservesUnknownErrors = /\b(?:unknown|unexpected|all other|other)\b[^.\n]{0,180}\b(?:rethrow|throw|500|5xx|surface|preserv|remain visible|do not convert)\b/i.test(text) ||
    /\b(?:rethrow|throw|500|5xx|surface|preserv|remain visible|do not convert)\b[^.\n]{0,180}\b(?:unknown|unexpected|all other|other)\b/i.test(text);
  if (classifiesKnownMiss && preservesUnknownErrors) {
    return { disposition: 'verified', reason: 'catch path separates expected misses from unknown errors and sets status 404' };
  }
  if (routeErrorFixBroadlyCatchesNotFound(text)) {
    return {
      disposition: 'failed',
      reason: 'route-error 404 fixes must classify expected misses before returning not-found and must not turn generic catch blocks into 404 responses',
    };
  }
  return {
    disposition: 'failed',
    reason: 'route-error 404 fixes must classify expected misses separately and preserve logging or 5xx behavior for unknown errors',
  };
}

function routeErrorFixExplicitlyConvertsUnexpectedErrorsToNotFound(text) {
  return /\bunexpected\s+exceptions?\b[^.\n]{0,180}\b(?:degrade|convert|return|become|map)\b[^.\n]{0,160}\b(?:404|not[- ]found|not found|notFound)\b/i.test(text) ||
    /\b(?:404|not[- ]found|not found|notFound)\b[^.\n]{0,160}\b(?:for|on)\b[^.\n]{0,80}\b(?:any|all|unexpected|unknown)\b[^.\n]{0,80}\bexceptions?\b/i.test(text) ||
    /\b(?:any|all|unexpected|unknown)\b[^.\n]{0,80}\bexceptions?\b[^.\n]{0,160}\b(?:404|not[- ]found|not found|notFound)\b/i.test(text);
}

function routeErrorFixBroadlyCatchesNotFound(text) {
  return /\b(?:catch|catch\s*\([^)]*\))\b[^.\n]{0,220}\b(?:return|respond|degrade|convert)\b[^.\n]{0,160}\b(?:404|not[- ]found|not found|notFound)\b/i.test(text);
}

async function verifyImmutableDynamicRouteSafety({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'immutable_dynamic_route_safety requires rec' };
  const text = recText(rec);
  if (/\b(?:content[- ]hash(?:ed)?|hashed|fingerprint(?:ed)?|versioned\s+URL|URL\s+changes\s+when\s+bytes\s+change)\b/i.test(text)) {
    return { disposition: 'verified', reason: 'immutable cache header is tied to a byte-versioned URL' };
  }
  if (/\bVercel-CDN-Cache-Control\b/i.test(text) && !/(?:^|[^A-Za-z-])Cache-Control\s*:\s*[^.\n]*\bimmutable\b/i.test(text)) {
    return { disposition: 'verified', reason: 'immutable directive is scoped away from browser Cache-Control' };
  }
  return {
    disposition: 'failed',
    reason: 'immutable browser caching on a dynamic route requires a content-hashed or otherwise byte-versioned URL',
  };
}

async function verifyAuthGuardParallelizationSafety({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'auth_guard_parallelization_safety requires rec' };
  const text = recText(rec);
  if (/\b(?:query|lookup|fetch)\b[^.\n]{0,120}\b(?:constrained|scoped|filtered)\b[^.\n]{0,120}\b(?:email|user|owner|ownership|session|account|tenant|permission|auth)/i.test(text) ||
      /\b(?:preserve|keep|retain)\b[^.\n]{0,120}\b(?:auth|authorization|ownership|permission|access)\s+(?:check|guard|gate)\b[^.\n]{0,120}\b(?:before|ahead of|prior to|sequential|not parallel)/i.test(text)) {
    return { disposition: 'verified', reason: 'parallelization recommendation preserves the auth/ownership guard' };
  }
  if (/\bPromise\.all\s*\([\s\S]{0,500}(?:private|secret|token|registrant|ticket|payment|account|user)\w*[\s\S]{0,500}(?:owns|owner|ownership|authorize|auth|permission|access)\w*/i.test(text) ||
      /\bPromise\.all\s*\([\s\S]{0,500}(?:owns|owner|ownership|authorize|auth|permission|access)\w*[\s\S]{0,500}(?:private|secret|token|registrant|ticket|payment|account|user)\w*/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'parallelization may fetch private data before the ownership/auth check has passed; combine the authorized query or keep the guard sequential',
    };
  }
  return {
    disposition: 'unverifiable',
    reason: 'auth-sensitive parallelization needs explicit evidence that private data is not fetched before authorization',
  };
}

async function verifyParallelizationImpactNotOverclaimed({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'parallelization_impact_not_overclaimed requires rec' };
  const text = recText(rec);
  if (/\b(?:measured|trace|span|profile|instrumented)\b[^.\n]{0,120}\b(?:duration|round[- ]trip|query|helper|await)\b/i.test(text)) {
    return { disposition: 'verified', reason: 'parallelization impact claim cites measured helper/span duration' };
  }
  return {
    disposition: 'failed',
    reason: 'parallelization impact promises a helper/round-trip-sized drop without measured helper or span timing',
  };
}

async function verifyParallelizationNotCpuBoundWork({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'parallelization_not_cpu_bound_work requires rec' };
  const text = recText(rec);
  if (/\b(?:measured|trace|span|profile|instrumented)\b[^.\n]{0,160}\b(?:wait|I\/O|io|network|fetch|database|query|CMS|API)\b/i.test(text)) {
    return { disposition: 'verified', reason: 'parallelization target cites measured wait/I/O time' };
  }
  if (/\b(?:cpu\.p95|CPU p95|cpu p95|CPU-bound|compute-bound|in-process compute|compileMDX|MDX compilation|compilation|render compute)\b/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'parallelization targets CPU/compile work without measured independent wait time; Promise.all is not a safe latency fix for CPU-bound work',
    };
  }
  return { disposition: 'verified', reason: 'parallelization target is not described as CPU-bound work' };
}

async function verifyRuntimeErrorCauseSupported({ rec }) {
  if (!rec) return { disposition: 'unsupported', reason: 'runtime_error_cause_supported requires rec' };
  const text = recText(rec);
  const hasRuntimeStack = /\b(?:stack|logs?|trace)\b[\s\S]{0,220}\b(?:Error:|ENOENT|ETIMEDOUT|ECONNRESET|NEXT_|at\s+[\w./[\]()-]+(?::\d+)?)/i.test(text);
  if (hasRuntimeStack) {
    return { disposition: 'verified', reason: 'runtime error cause is backed by logs or stack evidence' };
  }
  return {
    disposition: 'failed',
    reason: 'runtime error root cause was claimed without runtime logs or stack evidence',
  };
}

async function verifyVercelIgnoreCommandProjectState({ rec, signals }) {
  if (!rec) return { disposition: 'unsupported', reason: 'vercel_ignore_command_project_state requires rec' };
  const project = signals?.project;
  if (!project || typeof project !== 'object') {
    return { disposition: 'unverifiable', reason: 'project configuration unavailable for Ignored Build Step check' };
  }
  const text = recText(rec);
  if (typeof project.commandForIgnoringBuildStep === 'string' && project.commandForIgnoringBuildStep.trim() !== '') {
    return {
      disposition: 'failed',
      reason: 'project already has an Ignored Build Step command configured; do not recommend adding another without evidence the current command is insufficient',
    };
  }
  if (project.enableAffectedProjectsDeployments === true &&
      /\b(?:Ignored Build Step|ignoreCommand|turbo-ignore|skip unaffected|unaffected projects?)\b/i.test(text)) {
    return {
      disposition: 'failed',
      reason: 'project already has Vercel skip-unaffected deployments enabled; do not recommend another build-skipping change without evidence that automatic skipping is unavailable or insufficient',
    };
  }
  return { disposition: 'verified', reason: 'project config does not contradict Ignored Build Step recommendation' };
}

async function verifyTurboBuildCacheSafety({ rec, files, repoRoot = '.', projectRootDirectory = null, framework }) {
  if (!rec) return { disposition: 'unsupported', reason: 'turbo_build_cache_safety requires rec' };
  const candidateFiles = Array.isArray(files) ? files : [];
  const turboFiles = candidateFiles.filter((file) => /(^|\/)turbo\.json$/.test(String(file)));
  if (turboFiles.length === 0) {
    return { disposition: 'unverifiable', reason: 'Turbo build-cache recommendation has no turbo.json file to inspect' };
  }

  const text = recText(rec);
  for (const turboFile of turboFiles) {
    let turbo;
    try {
      const { content } = await readClaimFile({ file: turboFile, repoRoot, projectRootDirectory });
      turbo = parseJsonLike(content);
    } catch {
      return { disposition: 'unverifiable', reason: `cannot parse ${turboFile} for Turbo cache safety` };
    }
    const buildTask = turbo?.tasks?.build ?? turbo?.pipeline?.build ?? null;
    const outputs = Array.isArray(buildTask?.outputs) ? buildTask.outputs.map(String) : [];
    const pkgFile = siblingPackageJson(turboFile);
    const pkg = await readOptionalJsonFile({ file: pkgFile, repoRoot, projectRootDirectory });
    const buildScript = typeof pkg?.scripts?.build === 'string' ? pkg.scripts.build : '';
    const hasNext = framework === 'next' || Boolean(pkg?.dependencies?.next || pkg?.devDependencies?.next);

    if (buildScriptHasMigrationSideEffect(buildScript) && !recSeparatesTurboBuildSideEffects(text)) {
      return {
        disposition: 'failed',
        reason: 'Turbo build caching is unsafe for this build task because the package build script runs migrations or other side effects; split those steps before caching the build output',
      };
    }

    if (hasNext && outputs.length > 0 && !outputs.some((output) => /\.next(?:\/|\*\*)/.test(output))) {
      return {
        disposition: 'failed',
        reason: 'Turbo build cache outputs do not include Next.js build output (`.next/**`); fix the output contract before enabling build caching',
      };
    }
  }

  return { disposition: 'verified', reason: 'Turbo build cache recommendation does not conflict with local build scripts or outputs' };
}

function siblingPackageJson(file) {
  return join(dirname(String(file)), 'package.json');
}

async function readOptionalJsonFile(claim) {
  try {
    const { content } = await readClaimFile(claim);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function parseJsonLike(content) {
  return JSON.parse(
    String(content)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/,\s*([}\]])/g, '$1')
  );
}

function buildScriptHasMigrationSideEffect(script) {
  return /\b(?:payload\s+migrate|prisma\s+migrate|knex\s+migrate|sequelize\s+db:migrate|db:migrate|migrate(?::|\s|$)|migration)\b/i.test(String(script));
}

function recSeparatesTurboBuildSideEffects(text) {
  return /\b(?:split|separate|move|keep)\b[^.\n]{0,180}\b(?:migrations?|side effects?|payload migrate|prisma migrate)\b[^.\n]{0,180}\b(?:outside|before|uncached|separate)\b/i.test(text) ||
    /\b(?:cache|enable caching for)\b[^.\n]{0,120}\b(?:buildonly|pure build|next build)\b[^.\n]{0,180}\b(?:not|without|after separating)\b[^.\n]{0,120}\b(?:migrations?|side effects?)\b/i.test(text);
}

function recText(rec) {
  return [rec?.what, rec?.why, rec?.fix, rec?.currentBehavior, rec?.desiredBehavior, rec?.verify]
    .filter(Boolean)
    .join('\n');
}

function extractHeaderValues(text, header) {
  const escaped = escapeRegExp(header);
  const values = [];
  const quotedKey = new RegExp(`['"\`]${escaped}['"\`]\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`, 'gi');
  for (const m of text.matchAll(quotedKey)) values.push(m[1].trim());
  const bareKey = new RegExp(`\\b${escaped}\\b\\s*:\\s*['"\`]?([^'"\`\\n]+)['"\`]?`, 'gi');
  for (const m of text.matchAll(bareKey)) values.push(cleanHeaderValue(m[1]));
  return Array.from(new Set(values.filter(Boolean)));
}

function hasHeaderValue(text, header, valuePattern) {
  return extractHeaderValues(text, header).some((value) => valuePattern.test(value));
}

function cleanHeaderValue(value) {
  return String(value)
    .replace(/[).;]+$/g, '')
    .replace(/\s+and\s+.*$/i, '')
    .trim();
}

function hasEmptyCacheDirective(value) {
  return String(value).split(',').some((part) => part.trim() === '');
}

function extractCacheTags(text) {
  const tags = [];
  const callRe = /\bcacheTag\s*\(([^)]*)\)/gs;
  for (const call of text.matchAll(callRe)) {
    const args = call[1] ?? '';
    for (const m of args.matchAll(/['"]([^'"]+)['"]/g)) {
      tags.push({ kind: 'exact', value: m[1], label: m[1] });
    }
    for (const m of args.matchAll(/`([^`]+)`/g)) {
      const raw = m[1];
      const prefix = raw.split('${')[0];
      if (raw.includes('${') && prefix) {
        tags.push({ kind: 'prefix', value: prefix, label: raw });
      } else if (!raw.includes('${')) {
        tags.push({ kind: 'exact', value: raw, label: raw });
      }
    }
  }
  const seen = new Set();
  return tags.filter((tag) => {
    const key = `${tag.kind}\u0000${tag.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function extractCacheTagsFromFiles(files, repoRoot, projectRootDirectory) {
  const out = [];
  if (!Array.isArray(files)) return out;
  for (const file of files) {
    try {
      const { content } = await readClaimFile({ file, repoRoot, projectRootDirectory });
      out.push(...extractCacheTags(content));
    } catch {}
  }
  return out;
}

function dedupeCacheTags(tags) {
  const seen = new Set();
  return tags.filter((tag) => {
    const key = `${tag.kind}\u0000${tag.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readCacheInvalidationFiles(repoRoot, projectRootDirectory) {
  const cacheKey = `${normalize(repoRoot || '.')}\u0000${normalizeProjectRootDirectory(projectRootDirectory) ?? ''}`;
  if (cacheInvalidationFileCache.has(cacheKey)) return cacheInvalidationFileCache.get(cacheKey);
  const baseRoot = normalize(repoRoot || '.');
  const projectRoot = normalizeProjectRootDirectory(projectRootDirectory);
  const root = projectRoot ? join(baseRoot, projectRoot) : baseRoot;
  try {
    await access(root);
  } catch {
    cacheInvalidationFileCache.set(cacheKey, []);
    return [];
  }
  const rgFiles = await rgRelevantFiles(root);
  if (Array.isArray(rgFiles)) {
    const files = [];
    for (const path of rgFiles.slice(0, 500)) {
      try {
        files.push({ path, content: await readFile(path, 'utf-8') });
      } catch {}
    }
    cacheInvalidationFileCache.set(cacheKey, files);
    return files;
  }
  const files = [];
  for await (const path of walkFiles(root)) {
    try {
      const content = await readFile(path, 'utf-8');
      if (!/\b(?:revalidateTag|updateTag)\s*\(|\btags\s*:/.test(content)) continue;
      files.push({ path, content });
    } catch {}
  }
  cacheInvalidationFileCache.set(cacheKey, files);
  return files;
}

async function rgRelevantFiles(root) {
  try {
    const { stdout } = await execFileP('rg', [
      '-l',
      '--glob', '!node_modules/**',
      '--glob', '!.next/**',
      '--glob', '!.vercel/**',
      '--glob', '!.turbo/**',
      '--glob', '!dist/**',
      '--glob', '!build/**',
      '--glob', '!coverage/**',
      '--glob', '!content/**',
      '--glob', '!fixtures/**',
      '--glob', '!migrations/**',
      '--glob', '!public/**',
      '--glob', '*.{ts,tsx,js,jsx,mjs,cjs}',
      String.raw`\b(?:revalidateTag|updateTag)\s*\(|\btags\s*:`,
      root,
    ], { maxBuffer: 10 * 1024 * 1024 });
    return stdout.split(/\r?\n/).filter(Boolean);
  } catch (err) {
    if (err?.code === 1) return [];
    return null;
  }
}

function tagHasMatchingInvalidation(tag, files) {
  return files.some(({ content }) => {
    if (hasLiteralInvalidation(content, tag)) return true;
    return hasConfigDrivenInvalidation(content, tag, files);
  });
}

function hasLiteralInvalidation(content, tag) {
  if (tag.kind === 'exact') {
    const escaped = escapeRegExp(tag.value);
    return new RegExp(`\\b(?:revalidateTag|updateTag)\\s*\\(\\s*['"\`]${escaped}['"\`]`).test(content);
  }
  const escaped = escapeRegExp(tag.value);
  return new RegExp(`\\b(?:revalidateTag|updateTag)\\s*\\(\\s*\`?${escaped}`).test(content);
}

function hasConfigDrivenInvalidation(content, tag, files) {
  if (!/\brevalidateTag\s*\(\s*\w+/.test(content)) return false;
  return files.some((file) => configContainsTag(file.content, tag));
}

function configContainsTag(content, tag) {
  if (tag.kind === 'exact') {
    const escaped = escapeRegExp(tag.value);
    return new RegExp(`\\btags\\s*:\\s*\\[[^\\]]*['"\`]${escaped}['"\`]`, 's').test(content);
  }
  const escaped = escapeRegExp(tag.value);
  return new RegExp(`\\btags\\s*:\\s*\\[[^\\]]*\`?${escaped}`, 's').test(content);
}

function routeFromCandidateRef(ref) {
  if (typeof ref !== 'string') return null;
  const idx = ref.indexOf(':');
  if (idx < 0) return null;
  const route = ref.slice(idx + 1);
  return route && route !== '<account>' && !route.startsWith('<account>#') ? route : null;
}

function functionStatusForRoute(signals, route) {
  const rows = signals?.metrics?.fnStatusByRoute?.rows;
  if (!Array.isArray(rows)) return null;
  const target = canonicalizeRoute(route);
  let total = 0;
  let errors = 0;
  for (const row of rows) {
    const rowRoute = row?.route ?? row?.path;
    if (!rowRoute || canonicalizeRoute(rowRoute) !== target) continue;
    const value = numberValue(row?.value);
    if (value == null) continue;
    total += value;
    if (/^5/.test(String(row?.http_status ?? ''))) errors += value;
  }
  return total > 0 ? { total, errors } : null;
}

function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function cacheLifeNeedsContentFreshnessProof(text) {
  return /\bcacheLife\s*\(\s*['"`](?:hours|days|weeks|max)['"`]\s*\)/i.test(text) &&
    /\b(?:CMS|Contentful|Payload|Sanity|WordPress|docs?|guides?|navigation|nav|content|article|blog|OpenAPI|metadata|get[A-Z][\w]*(?:By|For|From)?\w*)\b/.test(text);
}

function recommendationFilesFromRec(rec) {
  return Array.from(new Set([
    ...asArray(rec?.affectedFiles),
    ...asArray(rec?.findingRefs).map((ref) => String(ref).match(/^(.+?):\d+$/)?.[1]).filter(Boolean),
  ]));
}

async function readNextRouteChainFiles(file, repoRoot, projectRootDirectory) {
  const normalized = normalizeProjectRootDirectory(file);
  if (!normalized) return [];
  const appIdx = normalized.split('/').lastIndexOf('app');
  if (appIdx === -1) {
    try {
      const { path, content } = await readClaimFile({ file, repoRoot, projectRootDirectory });
      return [{ path, relative: normalized, content }];
    } catch {
      return [];
    }
  }

  const parts = normalized.split('/');
  const appParts = parts.slice(0, appIdx + 1);
  const routeDirs = parts.slice(appIdx + 1, -1);
  const candidates = new Set([normalized]);
  for (let depth = 0; depth <= routeDirs.length; depth++) {
    const dir = [...appParts, ...routeDirs.slice(0, depth)].join('/');
    for (const base of ['layout', 'template']) {
      for (const ext of ['tsx', 'ts', 'jsx', 'js']) candidates.add(`${dir}/${base}.${ext}`);
    }
  }

  const out = [];
  for (const candidate of candidates) {
    try {
      const { path, content } = await readClaimFile({ file: candidate, repoRoot, projectRootDirectory });
      out.push({ path, relative: candidate, content });
    } catch {}
  }
  return out;
}

function firstDynamicRouteChainReason(content) {
  const text = String(content ?? '');
  const direct = text.match(/\b(cookies|headers|draftMode|connection)\s*\(/);
  if (direct) return `${direct[1]}()`;
  const helper = text.match(/\b(withAuth|getServerSession|auth|currentUser)\s*\(/);
  if (helper) return `${helper[1]}()`;
  if (/from\s+['"]next\/headers['"]/.test(text)) return 'next/headers import';
  return null;
}

function pathSuffixMatches(candidateFile, routeFile) {
  const candidate = normalizeProjectRootDirectory(candidateFile);
  const route = normalizeProjectRootDirectory(routeFile);
  if (!candidate || !route) return false;
  return candidate === route || candidate.endsWith(`/${route}`) || route.endsWith(`/${candidate}`);
}

function normalizeRouteForLayoutMatch(route) {
  const normalized = canonicalizeRoute(String(route ?? ''));
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function layoutAppliesToCandidateRoute(layoutPath, targetRoute) {
  if (typeof layoutPath !== 'string' || typeof targetRoute !== 'string') return false;
  const layout = normalizeRouteForLayoutMatch(layoutPath);
  const target = normalizeRouteForLayoutMatch(targetRoute);
  if (layout === '/') return true;

  let layoutTokens = layout.split('/').filter(Boolean);
  const targetTokens = target.split('/').filter(Boolean);
  if (layoutTokens.length > targetTokens.length && isDynamicPlaceholder(layoutTokens[0])) {
    layoutTokens = layoutTokens.slice(1);
  } else if (layoutTokens.length > 0 &&
      targetTokens.length > 0 &&
      isDynamicPlaceholder(layoutTokens[0]) &&
      layoutTokens[1] === targetTokens[0]) {
    layoutTokens = layoutTokens.slice(1);
  }
  if (layoutTokens.length === 0) return true;
  if (layoutTokens.length > targetTokens.length) return false;

  let literalMatches = 0;
  for (let i = 0; i < layoutTokens.length; i++) {
    const layoutToken = layoutTokens[i];
    const targetToken = targetTokens[i];
    if (isCatchAllPlaceholder(layoutToken)) return literalMatches > 0;
    if (layoutToken === targetToken) {
      literalMatches += 1;
      continue;
    }
    if (isDynamicPlaceholder(layoutToken)) continue;
    return false;
  }
  return literalMatches > 0;
}

function isDynamicPlaceholder(segment) {
  return /^\[(?:\.{3})?.+\]$/.test(String(segment ?? ''));
}

function isCatchAllPlaceholder(segment) {
  return /^\[\[?\.{3}.+\]?\]$/.test(String(segment ?? ''));
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(pattern, flags) {
  return new RegExp(escapeRegex(String(pattern ?? '')), flags);
}

async function readClaimFile(claim) {
  const path = await firstAccessiblePath(claim);
  return { path, content: await readFile(path, 'utf-8') };
}

async function firstAccessiblePath({ repoRoot = '.', file, projectRootDirectory = null }) {
  let lastErr;
  for (const p of repoPaths(repoRoot, file, projectRootDirectory)) {
    try {
      await access(p);
      return p;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error(`cannot access ${file}`);
}

function repoPaths(repoRoot, file, projectRootDirectory = null) {
  if (!file) return [];
  if (isAbsolute(file)) return [file];
  const out = [join(repoRoot, file)];
  const projectRoot = normalizeProjectRootDirectory(projectRootDirectory);
  const normalizedFile = normalizeProjectRootDirectory(file);
  if (projectRoot && normalizedFile && !normalizedFile.startsWith(`${projectRoot}/`)) {
    out.push(join(repoRoot, projectRoot, file));
  }
  return Array.from(new Set(out.map((p) => normalize(p))));
}

function normalizeProjectRootDirectory(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
}

async function* walkFiles(root, skip = new Set([
  'node_modules',
  '.next',
  '.vercel',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
  'content',
  'fixtures',
  'migrations',
  'public',
])) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const path = join(root, e.name);
    if (e.isDirectory()) {
      if (skip.has(e.name)) continue;
      yield* walkFiles(path, skip);
      continue;
    }
    if (!e.isFile()) continue;
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(e.name)) continue;
    yield path;
  }
}

async function snippetFoundElsewhere(root, snippet, exceptFile) {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const target = norm(snippet);
  if (target.length < 20) return null;
  for await (const path of walkFiles(root)) {
    if (path.endsWith(exceptFile)) continue;
    try {
      const content = await readFile(path, 'utf-8');
      if (norm(content).includes(target)) return path;
    } catch {}
  }
  return null;
}
