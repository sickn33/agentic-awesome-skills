// Two checks emitted as `missing-cache-headers`:
//   A. GET handler with no Cache-Control AND no auth signal.
//   B. fetch() with `cache:'no-store'` / `next:{revalidate:0}` outside an
//      auth window (~10 lines above, 5 below).

export const metadata = {
  id: 'missing-cache-headers',
  title: 'Cacheable route or fetch with no caching (Cache-Control absent or no-store)',
  severity: 'medium',
  billingDimension: 'edge-requests',
  trafficIndependent: false,
  description:
    'Two antipatterns: (a) GET handlers without explicit Cache-Control headers serve uncached; (b) fetch() calls with cache:"no-store" or next:{revalidate:0} opt out of caching even on cacheable upstream data. For non-auth routes / fetches, both are leaving cache hits on the floor.',
  fix:
    'For GET handlers: return a Response with Cache-Control: public, s-maxage=<seconds>, stale-while-revalidate=<window>. For fetch(): drop cache:"no-store" (use { next: { revalidate: <seconds> } } in Next.js) so the response is cached by the framework + CDN.',
  citations: [
    'https://vercel.com/docs/caching/cdn-cache',
    'https://vercel.com/docs/caching/cache-control-headers',
    'https://nextjs.org/docs/app/building-your-application/caching',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', '**/*.test.*', '**/*.spec.*'],
  // page/layout included: no-store fetches commonly hide in Server Components.
  includeGlobs: [
    '**/route.{ts,tsx,js,jsx}',
    '**/api/**/*.{ts,tsx,js,jsx}',
    '**/page.{ts,tsx,js,jsx}',
    '**/layout.{ts,tsx,js,jsx}',
  ],
};

// Covers NextAuth, Clerk, JWT, Bearer, plus Next dynamic-render APIs.
// FP on cacheable routes that read a session is acceptable — verifier decides.
const AUTH_RE = /\b(cookies\(\)|headers\(\)|getSession\(|getServerSession\(|currentUser\(|clerkClient|auth\(\)|verifyJWT|verifyToken|jwt\.verify|decode\(|Bearer\s|Authorization|supabase\.auth\.)/i;

const NO_STORE_RE = /cache\s*:\s*['"]no-store['"]/;
const REVALIDATE_ZERO_RE = /next\s*:\s*\{[^}]*revalidate\s*:\s*0\b/;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!isApplicable(path)) continue;

    const hasGetHandler =
      /export\s+(async\s+)?function\s+GET/.test(content)
      || /export\s+const\s+GET\s*=/.test(content);
    if (hasGetHandler) {
      const hasCacheControl =
        /Cache-Control/i.test(content)
        || /CDN-Cache-Control/i.test(content)
        || /export\s+const\s+revalidate\s*=/.test(content);
      if (!hasCacheControl && !AUTH_RE.test(content)) {
        out.push({
          pattern: metadata.id,
          subtype: 'get-handler-no-cache-control',
          file: path,
          line: 1,
          evidence: 'GET handler with no Cache-Control / revalidate / auth signal',
          trafficIndependent: metadata.trafficIndependent,
        });
      }
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const noStoreHit = NO_STORE_RE.test(line);
      const revalidateZeroHit = REVALIDATE_ZERO_RE.test(line);
      if (!noStoreHit && !revalidateZeroHit) continue;
      const start = Math.max(0, i - 10);
      const end = Math.min(lines.length, i + 5);
      const window = lines.slice(start, end).join('\n');
      if (AUTH_RE.test(window)) continue;
      // Mutation verbs legitimately don't cache.
      if (/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(window)) continue;
      out.push({
        pattern: metadata.id,
        subtype: noStoreHit ? 'fetch-no-store' : 'fetch-revalidate-zero',
        file: path,
        line: i + 1,
        evidence: line.trim().slice(0, 200),
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}

function isApplicable(path) {
  return /\/(route|index|page|layout)\.(ts|tsx|js|jsx)$/.test(path) || /\/api\//.test(path);
}
