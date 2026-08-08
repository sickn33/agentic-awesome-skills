// Auth routes carry user state and must not be cached at CDN edge.

export const AUTH_ROUTE_REGEX =
  /(login|logout|auth|account|dashboard|checkout|cart|profile|session|me)(?:\/|$)/i;

export function isAuthRoute(route) {
  return AUTH_ROUTE_REGEX.test(String(route ?? ''));
}

// Non-cache candidates pass through — errors/slowness on auth routes still warrant investigation.
export function applyAuthDisqualifier(candidate) {
  const cacheKinds = new Set(['uncached_route', 'cache_header_gap']);
  if (!cacheKinds.has(candidate.kind)) return candidate;
  if (!candidate.route) return candidate;
  if (isAuthRoute(candidate.route)) {
    return {
      ...candidate,
      disqualified: true,
      disqualifyReason: 'auth-like route — should not be cached at edge',
    };
  }
  return candidate;
}
