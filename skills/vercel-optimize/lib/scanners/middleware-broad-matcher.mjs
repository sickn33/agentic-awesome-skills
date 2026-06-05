export const metadata = {
  id: 'middleware-broad-matcher',
  title: 'Middleware matcher missing or too broad',
  severity: 'high',
  billingDimension: 'edge-requests',
  trafficIndependent: true,
  description:
    'middleware.ts without a config.matcher (or matcher: ["/(.*)"]) runs on every request including _next/static, _next/image, favicon.ico, and image asset fetches. Edge-request cost scales accordingly.',
  fix:
    'Scope the matcher to actual application paths. Example: matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]',
  citations: [
    'https://nextjs.org/docs/app/building-your-application/routing/middleware',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**'],
  includeGlobs: ['middleware.{ts,js,mjs}', 'src/middleware.{ts,js,mjs}'],
};

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!isApplicable(path)) continue;

    const exportsMiddleware = /export\s+(default\s+)?(async\s+)?function\s+middleware/.test(content)
      || /export\s+const\s+middleware\s*=/.test(content);
    if (!exportsMiddleware) continue;

    const configBlock = content.match(/export\s+const\s+config\s*=\s*\{([\s\S]*?)\}/);
    const matcherStr = configBlock && configBlock[1].match(/matcher\s*:\s*([^,}]+)/);

    let problem = null;
    if (!configBlock || !matcherStr) {
      problem = 'no config.matcher (runs on every request)';
    } else {
      const m = matcherStr[1];
      if (/['"`]\s*\/\s*['"`]/.test(m) || /['"`]\/\(\.\*\)['"`]/.test(m)) {
        problem = 'matcher = "/" or "/(.*)" (still covers everything)';
      }
    }

    if (problem) {
      out.push({
        pattern: metadata.id,
        file: path,
        line: 1,
        evidence: problem,
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}

function isApplicable(path) {
  return /(^|\/)middleware\.(ts|js|mjs)$/.test(path);
}
