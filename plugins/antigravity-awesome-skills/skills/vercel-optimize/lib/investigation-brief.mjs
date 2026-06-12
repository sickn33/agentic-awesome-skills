// Sub-agent investigation brief — the entire prompt the sub-agent sees.
// Constraints: target ≤ 12 KB per brief; deterministic (same input → byte-identical output, modulo generatedAt).

import { isAbsolute, join, normalize, relative } from 'node:path';
import { loadLibrary, matchesFrameworkVersion } from './citations.mjs';
import { deriveProjectFacts } from './project-facts.mjs';
import { renderSupportTopics } from './support-topics.mjs';

const NON_LAYOUT_FILE_CAP = 12;
const LAYOUT_FILE_CAP = 3;

// Playbook is a tilt, not a requirement.
export function inferPlaybook(signals) {
  const deps = signals?.stack?.deps ?? {};
  const codebaseStack = signals?.codebase?.stack ?? {};
  const routes = signals?.codebase?.routes ?? [];
  const routePaths = routes.map((r) => r.routePath ?? '');
  const services = Array.isArray(signals?.usage?.services) ? signals.usage.services : [];

  const has = (name) => Boolean(deps[name]);
  const hasPrefix = (prefix) => Object.keys(deps).some((k) => k === prefix || k.startsWith(prefix));
  const anyRouteMatches = (re) => routePaths.some((p) => re.test(p));
  const usageHas = (re, minBilled = 0) =>
    services.some((s) => re.test(String(s?.name ?? '')) && Number(s?.billedCost ?? s?.cost ?? 0) > minBilled);

  // AI app first — billing shape (AI Gateway > Sandbox > Function Duration) overrides
  // the ecommerce/saas tilt when both apply (an "AI shopping assistant" lives in ai-application's
  // priority patterns, not the cart-checkout ones).
  const aiDep =
    has('@vercel/sandbox')
    || has('@vercel/ai-gateway')
    || has('ai')
    || has('openai')
    || has('@anthropic-ai/sdk')
    || hasPrefix('@ai-sdk/');
  const aiUsage = usageHas(/^AI Gateway$/i) || usageHas(/^Sandbox/i);
  if (aiDep || aiUsage) {
    return 'ai-application';
  }
  if (has('stripe') || has('@stripe/stripe-js') || has('react-stripe-js') ||
      anyRouteMatches(/^\/(cart|checkout|products?)\b/i)) {
    return 'ecommerce';
  }
  if (has('next-auth') || has('@clerk/nextjs') || has('@workos-inc/authkit-nextjs') ||
      anyRouteMatches(/^\/(admin|dashboard|settings|account|billing)\b/i)) {
    return 'saas';
  }
  if (routes.length > 0 && routes.every((r) => /^\/api\//.test(r.routePath ?? ''))) {
    return 'api-service';
  }
  if (codebaseStack.hasAppRouter || codebaseStack.hasPagesRouter) {
    if (anyRouteMatches(/^\/(blog|docs|posts?|articles?|guides?)\b/i)) return 'content-site';
    if (anyRouteMatches(/^\/\(?marketing\)?\b/i)) return 'marketing';
  }
  return null;
}

// SvelteKit/Nuxt/Astro have framework-shaped advice that doesn't fit the Next.js-flavored profile playbooks — both can ship together.
export function inferFrameworkPlaybook(signals) {
  const stack = signals?.stack ?? signals?.codebase?.stack ?? {};
  switch (stack.framework) {
    case 'sveltekit': return 'sveltekit';
    default: return null;
  }
}

// Empty result = no source files; investigate via evidence only (legitimate for platform_* candidates).
// Workspace imports expand one level deep — keeps brief small. A thin shell page.tsx delegates work; bottleneck usually lives in workspace files.
export function resolveFiles(candidate, signals) {
  const route = candidate.route;
  const routes = signals?.codebase?.routes ?? [];
  if (Array.isArray(candidate.files) && candidate.files.length > 0) {
    return capBriefFiles(candidate.files, route ? closestAncestorLayoutFiles(route, routes) : [], routes);
  }
  if (!route) return [];
  const nonLayoutRoutes = routes.filter((r) => r.type !== 'layout');
  const layoutFiles = closestAncestorLayoutFiles(route, routes);
  let matched = nonLayoutRoutes.filter((r) => r.routePath === route);
  if (matched.length === 0) {
    // Fuzzy: prefer max literal-segment matches so `/event/[code]/teaser` beats `/event/[code]/[location]` when candidate is `/event/[*]/teaser`.
    const scored = nonLayoutRoutes
      .map((r) => ({ r, score: routePathMatchScore(r.routePath, route) }))
      .filter((x) => x.score > 0);
    if (scored.length === 0) return capBriefFiles([], layoutFiles, routes);
    const top = Math.max(...scored.map((s) => s.score));
    matched = scored.filter((s) => s.score === top).map((s) => s.r);
  }
  const direct = matched.map((r) => r.file).filter(Boolean);
  const workspaceImports = matched
    .flatMap((r) => Array.isArray(r.workspaceImports) ? r.workspaceImports : [])
    .filter(Boolean);
  return capBriefFiles(uniq([...direct, ...workspaceImports]), layoutFiles, routes);
}

// literal-segment match × 10, dynamic × 1, pure equality = sentinel that always wins.
export function routePathMatchScore(routePath, metricPath) {
  if (typeof routePath !== 'string' || typeof metricPath !== 'string') return 0;
  if (routePath === metricPath) return 1000 + routePath.split('/').filter(Boolean).length;
  const rTokens = routePath.split('/').filter(Boolean);
  const mTokens = metricPath.split('/').filter(Boolean);
  let ri = 0, mi = 0, literals = 0, dynamicMatches = 0;
  while (ri < rTokens.length && mi < mTokens.length) {
    const r = rTokens[ri];
    const m = mTokens[mi];
    if (isCatchAllPlaceholder(r)) return 1 + literals * 10 + dynamicMatches;
    if (r === m) { literals++; ri++; mi++; continue; }
    // Route patterns may match concrete metric paths, and route/metric dynamic
    // placeholders may match each other. A metric-side placeholder must not
    // match a static route literal: that would let `/docs/[...slug]` traffic
    // attach to an unrelated static scanner route like `/docs/llms.txt`.
    if (isDynamicPlaceholder(r) && !isCatchAllPlaceholder(m)) { dynamicMatches++; ri++; mi++; continue; }
    return 0;
  }
  if (ri === rTokens.length - 1 && /^\[\[\.\.\..+\]\]$/.test(rTokens[ri]) && mi === mTokens.length) {
    return 1 + literals * 10 + dynamicMatches;
  }
  if (ri !== rTokens.length || mi !== mTokens.length) {
    return trailingSingleDynamicPartialScore(rTokens, mTokens, ri, mi, literals, dynamicMatches);
  }
  return 1 + literals * 10 + dynamicMatches;
}

export function routePathsMatch(routePath, metricPath) {
  return routePathMatchScore(routePath, metricPath) > 0;
}

function isDynamicPlaceholder(token) {
  return /^\[.*\]$/.test(token);
}
function isSingleDynamicPlaceholder(token) {
  return /^\[[^[.\].][^\]]*\]$/.test(token);
}
function isCatchAllPlaceholder(token) {
  return /^\[(?:\[\.\.\..+\]|\.\.\..+)\]$/.test(token) || /^\[\.\.\..+\]$/.test(token) || /^\[\[\.\.\..+\]\]$/.test(token);
}

function trailingSingleDynamicPartialScore(rTokens, mTokens, ri, mi, literals, dynamicMatches) {
  const rRemaining = rTokens.length - ri;
  const mRemaining = mTokens.length - mi;
  if (Math.abs(rRemaining - mRemaining) !== 1) return 0;
  if (rRemaining !== 0 && mRemaining !== 0) return 0;
  const lastRouteToken = rTokens[ri - 1];
  const lastMetricToken = mTokens[mi - 1];
  if (!isSingleDynamicPlaceholder(lastRouteToken) && !isSingleDynamicPlaceholder(lastMetricToken)) return 0;
  return literals * 10 + dynamicMatches;
}

function uniq(xs) { return Array.from(new Set(xs)); }

function briefRoots(signals) {
  const codebase = signals?.codebase ?? {};
  const appRoot = typeof codebase.rootDir === 'string' && codebase.rootDir.length > 0
    ? normalize(codebase.rootDir)
    : null;
  const repoRoot = typeof codebase.monorepoRoot === 'string' && codebase.monorepoRoot.length > 0
    ? normalize(codebase.monorepoRoot)
    : appRoot;
  return { appRoot, repoRoot };
}

function absoluteBriefPath(file, roots) {
  if (typeof file !== 'string' || file.length === 0) return null;
  if (isAbsolute(file)) return normalize(file);
  const base = isRepoRelativePath(file) ? roots.repoRoot : roots.appRoot;
  return base ? normalize(join(base, file)) : null;
}

function repoRelativeBriefPath(file, roots) {
  if (typeof file !== 'string' || file.length === 0) return null;
  const normalized = normalize(file);
  if (isRepoRelativePath(normalized)) return normalized;
  const abs = absoluteBriefPath(file, roots);
  if (!abs || !roots.repoRoot) return normalized;
  const rel = normalize(relative(roots.repoRoot, abs));
  return rel.startsWith('..') ? normalized : rel;
}

function isRepoRelativePath(file) {
  return /^(apps|packages)\//.test(file);
}

function capBriefFiles(nonLayoutCandidates, layoutCandidates, routes) {
  const knownLayoutFiles = new Set(routes.filter((r) => r.type === 'layout').map((r) => r.file).filter(Boolean));
  const nonLayout = [];
  const layouts = [];
  for (const f of uniq(nonLayoutCandidates)) {
    if (knownLayoutFiles.has(f) || isLayoutPath(f)) layouts.push(f);
    else nonLayout.push(f);
  }
  for (const f of layoutCandidates) layouts.push(f);
  return [
    ...uniq(nonLayout).slice(0, NON_LAYOUT_FILE_CAP),
    ...uniq(layouts).slice(0, LAYOUT_FILE_CAP),
  ];
}

function closestAncestorLayoutFiles(route, routes) {
  if (!route) return [];
  return routes
    .filter((r) => r.type === 'layout' && r.file && layoutAppliesToRoute(r.routePath, route))
    .sort((a, b) =>
      routeDepth(b.routePath) - routeDepth(a.routePath)
      || a.file.localeCompare(b.file)
    )
    .map((r) => r.file);
}

function layoutAppliesToRoute(layoutPath, routePath) {
  if (typeof layoutPath !== 'string' || typeof routePath !== 'string') return false;
  if (layoutPath === '/') return true;
  const layoutTokens = layoutPath.split('/').filter(Boolean);
  const routeTokens = routePath.split('/').filter(Boolean);
  if (layoutTokens.length > routeTokens.length) return false;
  for (let i = 0; i < layoutTokens.length; i++) {
    const l = layoutTokens[i];
    const r = routeTokens[i];
    if (isCatchAllPlaceholder(l)) return true;
    if (l === r) continue;
    if (isDynamicPlaceholder(l) || isDynamicPlaceholder(r)) continue;
    return false;
  }
  return true;
}

function routeDepth(routePath) {
  return String(routePath ?? '').split('/').filter(Boolean).length;
}

function isLayoutPath(file) {
  return /(^|\/)(?:\+layout(?:\.server)?|layout)\.(?:svelte|tsx?|jsx?)$/.test(String(file ?? ''));
}

// Tells the sub-agent which signals are missing so it doesn't conflate "no data" with "no bottleneck."
export function summarizeDeepDiveFailures(deepDive) {
  if (!deepDive || typeof deepDive !== 'object') return null;
  const entries = Object.entries(deepDive);
  if (entries.length === 0) return null;
  const failures = entries.filter(([, v]) => isFailureEntry(v));
  if (failures.length === 0) return null;
  // Surface when ≥50% failed OR ≥3 distinct signals failed.
  if (failures.length / entries.length < 0.5 && failures.length < 3) return null;
  const failedIds = failures.map(([k]) => k).slice(0, 6).join(', ');
  const codes = uniq(failures.map(([, v]) => v?.code ?? v?.error ?? 'unknown')).slice(0, 3).join(' / ');
  return `${failures.length} of ${entries.length} deep-dive signals failed (${failedIds}${failures.length > 6 ? ', …' : ''}) — error: ${codes}.`;
}

function isFailureEntry(v) {
  if (!v || typeof v !== 'object') return false;
  if (v.ok === false) return true;
  if (typeof v.code === 'string' && v.code !== 'OK') return true;
  if (typeof v.error === 'string' && v.error.length > 0) return true;
  return false;
}

export async function citationSubset(candidateKind, framework, version) {
  const lib = await loadLibrary();
  const versionOk = (entry) =>
    entry.applicableFrameworks.includes('*') ||
    entry.applicableFrameworks.some((p) => matchesFrameworkVersion(p, framework, version));
  const kindOk = (entry) => {
    const at = Array.isArray(entry.appliesTo) ? entry.appliesTo : [];
    return at.length === 0 || at.includes(candidateKind);
  };
  return {
    urls: lib.urls.filter((e) => versionOk(e) && kindOk(e)),
    ruleSkillRefs: lib.ruleSkillRefs.filter((r) => versionOk(r) && kindOk(r)),
  };
}

// Per-kind hints tell the investigator which comparison to draw first.
export const KIND_INTERPRETATION_HINTS = {
  slow_route: [
    'Compare `cpu.p95` vs `latency.p95`. If cpu << latency, the bottleneck is wall-clock / external IO / awaits — look for sequential awaits, slow DB queries, slow external APIs. If cpu ≈ latency, look for in-process compute (rendering, JSON serialization, crypto).',
    'Compare `ttfb.p95` vs `latency.p95`. If ttfb ≈ latency, response generation finishes near the end — streaming or `after()` may shift perceived latency.',
    'For streaming, SSE, resumable chat, or other intentionally long-lived routes, do not treat high wall-clock duration alone as a bug. Recommend a change only when evidence shows avoidable pre-first-byte work, high active CPU, duplicate invocations, or post-response work that can move out of the user-visible path.',
    'Inspect `perDeployment`: a 2x step between deployments points to a regression introduced in the newer deployment. Frame the rec as "regression introduced in <deployment_id>" rather than a generic perf claim.',
    'Inspect `startTypeSplit.cold` share. >5% cold means cold starts contribute meaningfully — Fluid Compute or warmer keep-alive is on the table.',
    'Inspect `statusDistribution`. A non-trivial 3xx/4xx slice may be inflating p95 because redirects/auth bounces still count as invocations.',
    'Inspect `cacheBreakdown`. If the route uses Next.js `dynamic = \'error\'` (or otherwise static) but the breakdown shows substantial MISS/BYPASS counts, the latency lives on the cache-miss path — investigate the origin fetch / ISR revalidation cost, NOT in-handler compute. `bandwidthByCache` tells you the byte cost of those misses.',
  ],
  uncached_route: [
    '`cacheBreakdown` tells you what fraction is BYPASS vs HIT vs MISS. BYPASS without explicit `Cache-Control` directives in the response is the canonical fix.',
    '`methodDistribution`: GET-only routes are cacheable; POST/PUT/DELETE are not. If the route is GET-heavy but BYPASSing, the cache headers are missing or wrong.',
    '`botShare` (bandwidth by bot_category): if bots dominate uncached bandwidth, the right rec may be Bot Protection rather than route caching.',
    '`bandwidthByCache`: pair with cacheBreakdown to confirm the dollar/bandwidth impact of moving uncached → cached.',
    'A ready cache recommendation must name a positive cache policy. If the right answer is `no-store`, emit no recommendation / observation instead of a cache fix.',
  ],
  cold_start: [
    '`startTypeSplit`: cold vs hot vs prewarmed. Fluid Compute meaningfully helps when cold > 5%.',
    '`coldVsWarmLatencyP95`: how much SLOWER is cold than warm. If 5x+, cold starts are amplifying tail latency, not just adding fixed overhead.',
    '`coldByDeployment`: if cold-start cluster around the newest deployment, the slowdown is a regression — check imports, init code, framework upgrade.',
  ],
  route_errors: [
    '`errorStatusPattern`: distinguishes 500 (app crash) vs 502/503 (gateway/upstream timeout) vs 504 (downstream timeout).',
    '`errorCodes`: a non-empty error_code dimension narrows to a specific failure class (e.g., FUNCTION_INVOCATION_TIMEOUT).',
    '`errorsByDeployment`: a deployment-localized spike points to a regression.',
  ],
  external_api_slow: [
    '`latency.p95` vs `latency.p99`: spreads point to flaky upstream; narrow gap points to slow-by-design.',
    '`callersByRoute` (`origin_route` dim): which of OUR routes call this upstream — that\'s where the rec should land.',
    '`transferBytes`: large payloads suggest caching or partial-response opportunities at our edge.',
  ],
  isr_overrevalidation: [
    '`writePattern` (write_units by cache_result) — STALE writes vs HIT writes. STALE-write means the revalidate ran on every stale request.',
    '`readPattern` (read_units by cache_result) — HIT vs MISS. Low MISS means cache fills are not the issue.',
    'If writes / reads > 0.5, the revalidate cadence is too aggressive; lengthen `revalidate` or switch to on-demand `revalidateTag`.',
  ],
  cwv_poor: [
    '`lcp`/`inp`/`cls` percentiles. p75 > Web Vitals "Good" threshold is the bar.',
    'LCP > 2500ms → server response or critical image. INP > 200ms → long tasks / heavy JS on interaction. CLS > 0.1 → layout shift, usually images/ads/fonts.',
  ],
  middleware_heavy: [
    '`topMiddlewarePaths`: paths that hit middleware most. If non-asset paths dominate, the matcher is too broad — narrow to the request shapes that actually need middleware.',
  ],
  platform_fluid_compute: [
    'Cross-check the broad-pass `fnStartTypeByRoute` for cold-rate concentration. If a few routes carry most cold starts, frame the rec around those routes rather than fleet-wide.',
  ],
  platform_bot_protection: [
    '`wafRuleFirings`: which managed rules are already firing (challenge/block). If `bot_filter` is already challenging but you still see significant bot bandwidth, BotID adds a verified-human signal that lets the WAF do its job.',
  ],
};

export function buildBrief({
  candidate,
  candidateIndex,
  candidateGroup,
  files,
  signals,
  citations,
  playbookId,
  playbookBody,
  frameworkPlaybookId,
  frameworkPlaybookBody,
  supportTopics = [],
  generatedAt,
}) {
  const stack = signals?.stack ?? signals?.codebase?.stack ?? {};
  const framework = stack.framework ?? 'unknown';
  const version = stack.frameworkVersion ?? 'unknown';
  const kind = candidate.kind;
  const routeOrHost = candidate.route ?? candidate.hostname ?? null;
  const interp = KIND_INTERPRETATION_HINTS[kind] ?? [];
  const candidateRef = candidate.candidateRef ?? `${kind}:${routeOrHost ?? '<account>'}`;
  const roots = briefRoots(signals);

  const lines = [];
  lines.push(`# Investigation brief — ${kind}${routeOrHost ? ` — ${routeOrHost}` : ''}`);
  lines.push('');
  lines.push('You are a Vercel-optimize investigation sub-agent. Your job is to investigate ONE evidence-backed candidate and emit ONE recommendation JSON. Stay narrow. Stay grounded. Do NOT widen the search.');
  lines.push('');
  lines.push(`Brief id: \`${candidateGroup}#${candidateIndex}\` · candidateRef: \`${candidateRef}\``);
  if (generatedAt) lines.push(`Generated: ${generatedAt}`);
  lines.push('');

  lines.push('## Candidate');
  lines.push('');
  lines.push(`- **Kind:** \`${kind}\``);
  lines.push(`- **Scope:** ${candidate.scope ?? 'route'}`);
  if (routeOrHost) lines.push(`- **Target:** \`${routeOrHost}\``);
  if (roots.repoRoot) lines.push(`- **Repo root:** \`${roots.repoRoot}\``);
  if (roots.appRoot) lines.push(`- **App root:** \`${roots.appRoot}\``);
  if (candidate.o11ySignal) lines.push(`- **o11y signal at gate-time:** \`${candidate.o11ySignal}\``);
  lines.push(`- **Confidence:** ${candidate.confidence ?? 'n/a'}`);
  lines.push(`- **Priority:** ${candidate.priority ?? 'n/a'}`);
  if (candidate.disqualified) {
    lines.push(`- **⚠ Disqualifier present:** ${candidate.disqualifyReason ?? 'disqualified'}`);
  }
  lines.push('');
  lines.push(`**Gate question (the hypothesis you're verifying):** ${candidate.question ?? '(no question)'}`);
  lines.push('');
  if (Array.isArray(files) && files.length > 0) {
    lines.push('**Files you may read (read ONLY these — open each one directly, NOT a repo-wide grep):**');
    lines.push(`_Capped at ${NON_LAYOUT_FILE_CAP} non-layout files + up to ${LAYOUT_FILE_CAP} layouts._`);
    // Tag route vs workspace-import — workspace files are usually where the bottleneck lives.
    const routes = signals?.codebase?.routes ?? [];
    const routeScores = routes.filter((r) => r.type !== 'layout').map((r) => ({
      r,
      score: routePathMatchScore(r.routePath, routeOrHost),
    })).filter((x) => x.score > 0);
    const topScore = routeScores.length > 0 ? Math.max(...routeScores.map((x) => x.score)) : 0;
    const routeFiles = new Set(
      routeScores.filter((x) => x.score === topScore).map((x) => x.r.file).filter(Boolean)
    );
    const layoutFiles = new Set(closestAncestorLayoutFiles(routeOrHost, routes));
    const workspaceImportFiles = [];
    for (const f of files) {
      const tag = layoutFiles.has(f) || isLayoutPath(f)
        ? '(layout)'
        : routeFiles.has(f) ? '(route)' : '(workspace import)';
      if (tag === '(workspace import)') workspaceImportFiles.push(f);
      const repoRel = repoRelativeBriefPath(f, roots) ?? f;
      const abs = absoluteBriefPath(f, roots);
      const sourceSuffix = repoRel !== f ? ` (scan path: \`${f}\`)` : '';
      const absSuffix = abs && abs !== repoRel ? ` — open \`${abs}\`` : '';
      lines.push(`- \`${repoRel}\` ${tag}${sourceSuffix}${absSuffix}`);
    }
    if ([...routeFiles].length > 0 && workspaceImportFiles.length > 0) {
      lines.push('');
      lines.push('_The route file is often a thin shell that re-exports from a workspace package. If the route file has no awaits / heavy imports / data fetching of its own, the bottleneck almost certainly lives in one of the (workspace import) files above — read those._');
    }
  } else {
    lines.push('**Files:** none mapped to this candidate. Either the gate is account-scope (platform_*) or the scanner could not resolve a route→file mapping (legitimate data gap). Work from the deep-dive evidence alone.');
  }
  lines.push('');

  lines.push('## Stack context');
  lines.push('');
  lines.push(`- **Framework:** \`${framework}@${version}\``);
  if (stack.hasAppRouter) lines.push('- **Router:** App Router');
  if (stack.hasPagesRouter) lines.push('- **Router:** Pages Router');
  if (stack.orm && stack.orm !== 'none') lines.push(`- **ORM:** ${stack.orm}`);
  if (stack.isMonorepo) lines.push('- **Monorepo:** yes (watch for cross-package effects)');
  lines.push('');

  // Negative-space filter: sub-agent must not recommend toggling on something already on.
  const projectFacts = deriveProjectFacts(signals);
  if (projectFacts.length > 0) {
    lines.push('## Project config (already on — do NOT recommend toggling)');
    lines.push('');
    lines.push('These settings are already enabled on the project. A recommendation that says "enable X" or "turn on X" for any of these is wrong and will be rejected by the verifier. Treat them as the starting state for your investigation.');
    lines.push('');
    for (const f of projectFacts) lines.push(`- ${f.briefLine}`);
    lines.push('');
  }

  lines.push('## Deep-dive evidence (already collected — do NOT re-query)');
  lines.push('');
  const deepDive = candidate?.evidence?.deepDive ?? {};
  const failureNotice = summarizeDeepDiveFailures(deepDive);
  if (failureNotice) {
    lines.push(`> ⚠ **Deep-dive partly incomplete.** ${failureNotice}`);
    lines.push('>');
    lines.push(`> The base evidence below is still valid — \`o11ySignal=${candidate.o11ySignal ?? '(unset)'}\` came directly from the gate's broad-pass query and is unaffected. Investigate against that signal and any deep-dive keys that DID populate. Do not conflate "missing data" with "no bottleneck": if the data didn't come back, abstain on the missing dimensions, not on the candidate as a whole.`);
    lines.push('');
  }
  lines.push('Treat these as ground truth. Cite the specific paths and values verbatim in `why` and `verify`. Numeric values are rounded to 4 decimal places.');
  lines.push('');
  lines.push('**Units legend** — all duration/timing fields below are in **milliseconds** (`latency.*`, `ttfb.*`, `cpu.p95`, `memory.*`). All `value` fields under `startTypeSplit` / `statusDistribution` / `methodDistribution` / `cacheBreakdown` are **invocation counts**. `botShare` / `bandwidthByCache` values are **bytes**. `perDeployment.value` is **p95 latency in ms** for that deployment.');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(deepDive, null, 2));
  lines.push('```');
  lines.push('');
  if (interp.length > 0) {
    lines.push('**How to read the evidence for this candidate kind:**');
    lines.push('');
    for (const h of interp) lines.push(`- ${h}`);
    lines.push('');
  }

  const cachePolicyHints = cachePolicyGuidance(kind, stack);
  if (cachePolicyHints.length > 0) {
    lines.push('## Cache-policy decision');
    lines.push('');
    lines.push('Pick the narrowest cache mechanism that matches the source. Do not default to `no-store`; if data is unsafe to cache, abstain or emit a no-change observation.');
    lines.push('');
    for (const h of cachePolicyHints) lines.push(`- ${h}`);
    lines.push('');
  }

  lines.push(...renderSupportTopics(supportTopics));
  if (supportTopics.length > 0) lines.push('');

  lines.push('## Citation library (USE ONLY THESE)');
  lines.push('');
  lines.push(`You may cite ONLY these URLs and skill-rule references. They are filtered for \`${framework}@${version}\` and the candidate kind \`${kind}\`. Any other URL will be stripped by the \`unknown-citation\` sanitizer; any URL whose version range doesn't cover \`${framework}@${version}\` will be stripped by \`version-mismatch\`.`);
  lines.push('');
  lines.push('### URLs');
  if (citations.urls.length === 0) {
    lines.push('_(no URLs match this kind + version — investigate, but the rec may fail `missing-citation`; consider abstaining)_');
  } else {
    for (const e of citations.urls) {
      lines.push(`- \`${e.url}\` — ${e.topic}`);
    }
  }
  lines.push('');
  lines.push('### Skill-rule references');
  if (citations.ruleSkillRefs.length === 0) {
    lines.push('_(none applicable)_');
  } else {
    for (const r of citations.ruleSkillRefs) {
      lines.push(`- \`${r.skill}:${r.rule}\` — ${r.topic}`);
    }
  }
  lines.push('');

  if (playbookId && playbookBody) {
    lines.push(`## Playbook hint (\`${playbookId}\`)`);
    lines.push('');
    lines.push(playbookBody.trim());
    lines.push('');
    lines.push('_Use the playbook to tilt phrasing and pattern priority. NEVER invent a claim because the playbook mentions a pattern — only emit it if the evidence supports it._');
    lines.push('');
  }
  if (frameworkPlaybookId && frameworkPlaybookBody) {
    lines.push(`## Framework-specific playbook (\`${frameworkPlaybookId}\`)`);
    lines.push('');
    lines.push(frameworkPlaybookBody.trim());
    lines.push('');
    lines.push(`_Framework-shaped advice for ${framework}. Same rule: evidence-grounded only._`);
    lines.push('');
  }

  lines.push('## Two valid outcomes');
  lines.push('');
  lines.push('Your job is to answer the gate question above. There are exactly two valid outcomes:');
  lines.push('');
  lines.push('**A. Emit a recommendation** (schema below) — ONLY when you found a verifiable file:line cause that the deep-dive evidence supports.');
  lines.push('');
  lines.push('**B. Abstain** — when the gate\'s hypothesis does not survive contact with the source. Emit:');
  lines.push('```json');
  lines.push(`{"abstain": true, "candidateRef": "${candidateRef}", "reason": "<one-sentence explanation grounded in what you found vs what the gate assumed>"}`);
  lines.push('```');
  lines.push('Abstaining is the RIGHT call when evidence is ambiguous, when the bottleneck isn\'t in the resolved files, or when the gate\'s hypothesis was wrong (e.g. an "uncached_route" candidate where the route is mostly POST traffic and uncacheable by protocol). Abstention is preferred over a speculative rec. The orchestrator surfaces abstentions in the trust section of the final report.');
  lines.push('');
  lines.push('**B1. Abstain with an observation** — when you find something real while abstaining (e.g., perDeployment regression, error-rate spike, infrastructure config gap) that the customer should know about but isn\'t a perf rec in the gate\'s framing. Emit:');
  lines.push('```json');
  lines.push(`{
  "abstain": true,
  "candidateRef": "${candidateRef}",
  "reason": "<why you abstained from a perf rec>",
  "observation": {
    "summary": "<one-line headline — what you noticed>",
    "evidence": "<the deep-dive datum or file:line that backs it>",
    "suggestedAction": "<what the customer should do next>",
    "kind": "regression | error_storm | config_gap | upstream_dependency | other"
  }
}`);
  lines.push('```');
  lines.push('Use `observation` ONLY when the finding is grounded in specific evidence the gate already gave you. Do NOT invent observations to fill the slot. The renderer surfaces these in a separate "Observations from investigation" section.');
  lines.push('');

  lines.push('## Investigation protocol');
  lines.push('');
  lines.push('1. **Read ONLY the files listed under "Files you may read".** Do NOT `grep -r` the repo. If you find yourself wanting to widen the search, stop and re-read the gate question. If it doesn\'t constrain the search, abstain.');
  lines.push('2. Read each file, then run targeted `grep` / `ast-grep` inside it to count patterns. Verify line numbers exactly.');
  lines.push('3. Follow imports within the chain only when relevant to the gate question (one level deep max).');
  lines.push('4. Stop after 5 files exhausted, or when you have a verified root cause.');
  lines.push('5. Drop findings that fail mechanical verification (file missing, pattern not present, etc.).');
  lines.push('6. **Zero-finding case:** if you read the named file(s) and find no mechanism that matches the gate question, abstain (Outcome B). Do NOT invent a rec to fill the slot.');
  lines.push('7. **Evidence-contradicts-source case:** if the deep-dive shows a real signal (e.g. high p95) but the source looks fine (no awaits, no heavy imports, small render), the bottleneck is upstream (DB, external API, or in code not shown). Abstain with reason "evidence and source diverge."');
  lines.push('');

  lines.push('## Pre-emit self-check');
  lines.push('');
  lines.push('Before emitting a recommendation (Outcome A), verify ALL of:');
  lines.push('- Every file in `affectedFiles` appears in "Files you may read" as a repo-relative path. If a line shows `(scan path: ...)`, do not use the scan path in JSON.');
  lines.push('- `why` quotes at least one specific `file:line` AND at least one deep-dive datum (e.g. `ttfb.p95=576ms`).');
  lines.push('- Every citation appears in the library above. No invented URLs.');
  lines.push('- `currentBehavior` snippet appears in the actual file (not a paraphrase).');
  lines.push('- No `$N` dollar literals in any customer-facing field.');
  lines.push('');
  lines.push('If ANY of these fails, fix the rec OR switch to Outcome B (abstain).');
  lines.push('');

  lines.push('## Required output (one JSON object, no prose around it)');
  lines.push('');
  lines.push('```json');
  lines.push(`{
  "what": "...",                  // 1 line, verb-first, scope-explicit. NO "$N" literals.
  "why": "...",                   // 1-2 sentences. MUST cite ≥1 file:line AND ≥1 deep-dive datum (e.g. "ttfb.p95=576ms while cpu.p95=117ms").
  "fix": "...",                   // step-by-step. Reference the specific files.
  "bucket": "performance",        // "cost" | "performance" | "reliability"
  "effort": "medium",             // "low" | "medium" | "high"
  "affectedFiles": ["..."],       // repo-relative paths from the Files list above
  "currentBehavior": "\`\`\`ts\\n...current snippet...\\n\`\`\`",
  "desiredBehavior": "\`\`\`ts\\n...target snippet...\\n\`\`\`",
  "verify": "Re-run \`vercel metrics ...\` and watch the named metric.",
  "citations": ["<url-from-library>", "skill:rule"],
  "candidateRef": "${candidateRef}",
  "findingRefs": ["src/.../file.ts:42"],
  "impactTier": "high",           // "high" | "medium" | "low"
  "billingDimension": "function-duration"   // see references/recommendations.md schema
}`);
  lines.push('```');
  lines.push('');

  lines.push('## Critical rules');
  lines.push('');
  lines.push('Ordered by priority — top is most important.');
  lines.push('');
  lines.push('1. **`why` must cite a specific `file:line` AND a specific deep-dive datum.** Both. Not one or the other. This is THE quality gate — recs without both will be dropped by the verifier.');
  lines.push(`2. **No invented citations.** Only URLs and refs from the library above. The \`unknown-citation\` sanitizer strips anything else.`);
  lines.push(`3. **No version-mismatched features.** This project is \`${framework}@${version}\` — do not recommend APIs unavailable in that version. The version-aware library above is your filter.`);
  lines.push(`4. **No \`$N\` dollar literals** in customer-facing fields. Use magnitude phrases ("hundreds of dollars per month at current traffic"). The \`$-strip\` sanitizer strips them, but emitting them is wasted output.`);
  lines.push('5. **Stay within scope.** Do not investigate other routes or fleet-wide patterns; that is the orchestrator\'s job. If this candidate doesn\'t yield a finding, abstain (Outcome B above).');
  lines.push('6. **Vercel voice.** Sharp teammate, clear, competent, no fluff. Lead with observed metrics and the user action. Avoid marketing language (`leverage`, `streamline`, `powerful`), filler adverbs (`just`, `simply`, `actually`), hedged starts (`Consider`, `You may want to`), rhetorical reframes, and arrows in prose. Do not expose internal terms like `sub-agent`, `abstention`, `passRate`, or `quality score`. Product names: `Observability Plus`, `Vercel Functions`, `fluid compute` mid-sentence, `BotID`, `AI Gateway`, `AI SDK`, `Edge Config`, `Routing Middleware`, `Web Analytics`. Explain `function invocations` and `95th percentile`; do not use `inv` or `p95` in customer output. See `references/voice.md`.');
  lines.push('');

  return lines.join('\n');
}

function cachePolicyGuidance(kind, stack = {}) {
  if (!['uncached_route', 'cache_header_gap'].includes(kind)) return [];
  const framework = stack.framework ?? 'unknown';
  const cacheComponents = stack.cacheComponents === true;
  const hints = [
    'Whole public GET response: recommend `Cache-Control` / `CDN-Cache-Control` with `s-maxage` and `stale-while-revalidate`; name the TTL/freshness window and required `Vary` headers. Avoid high-cardinality `Vary` headers such as `X-Vercel-IP-Latitude` or `X-Vercel-IP-Longitude`; use coarser geography only when the product can tolerate it.',
    'Fallback, 404, auth, preview, webhook, mutation, and per-user branches: keep them uncached or short-lived while caching only the safe success branch.',
  ];
  if (framework === 'next') {
    if (cacheComponents) {
      hints.push('Next.js with Cache Components: for reusable data inside the render path, prefer `use cache` / `use cache: remote` plus `cacheLife()` and `cacheTag()` when invalidation evidence exists.');
    } else {
      hints.push('Next.js data fetch path: use `fetch(..., { next: { revalidate: seconds } })` or route-level `revalidate` only when it matches the project version and route semantics. Before recommending route-level `export const revalidate`, inspect the page/layout route chain for `cookies()`, `headers()`, `draftMode()`, `connection()`, and auth helpers; if any parent layout is request-time dynamic, require `next build` or manifest proof that the route is still ISR/static, otherwise abstain.');
    }
  }
  hints.push('Reusable server data where whole-response CDN caching is unsafe: recommend Runtime Cache only when the same result is reused across requests and the freshness/invalidation story is explicit.');
  return hints;
}
