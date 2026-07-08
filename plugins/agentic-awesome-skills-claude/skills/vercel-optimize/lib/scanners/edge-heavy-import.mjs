// Flag node-only / heavy imports in edge-runtime files (either a
// middleware basename or an `export const runtime = 'edge'`). These
// either fail at deploy (node: builtins, native bindings) or inflate
// cold-start latency. Line-anchored matches + type-only-import skip
// keep FP low.

const EDGE_RUNTIME_RE = /export\s+const\s+runtime\s*=\s*['"]edge['"]/;
const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE_RE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
const TYPE_IMPORT_RE = /^\s*import\s+type\s+/;

const HEAVY_PATTERNS = [
  /^node:/,
  /^sharp$/,
  /^@aws-sdk\//,
  /^@prisma\/client$/,
  /^prisma$/,
  /^pg$/,
  /^mysql2(?:\/|$)/,
  /^puppeteer(?:-core)?(?:\/|$)/,
  /^playwright(?:-core)?(?:\/|$)/,
  /^bcrypt$/,
  /^jsonwebtoken$/,
  /^canvas$/,
  /^@google-cloud\//,
];

export const metadata = {
  id: 'edge-heavy-import',
  title: 'Heavy / node-only import inside edge-runtime file',
  severity: 'high',
  billingDimension: 'function-duration',
  trafficIndependent: true,
  description:
    'Edge runtime is a constrained sandbox with no node: builtins and a much smaller cold-start budget than Node functions. Heavy SDKs (sharp, @aws-sdk/*, @prisma/client, pg, puppeteer) either fail at deploy or inflate cold-start latency. Move the import to a Node runtime function, or replace with an edge-compatible alternative (e.g., neon-driver instead of pg).',
  fix:
    'Either (a) drop the `export const runtime = \'edge\'` so the route runs on Node (default in 2026), or (b) replace the heavy import with an edge-compatible alternative. For DB: use @neondatabase/serverless or @planetscale/database instead of pg/mysql2. For image: do the work in a Node route handler. For auth signing: use jose (Web Crypto) instead of jsonwebtoken.',
  citations: [
    'https://vercel.com/docs/functions/runtimes/edge-runtime',
    'https://vercel.com/docs/fluid-compute',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', '**/*.test.*', '**/*.spec.*'],
  includeGlobs: ['**/*.{ts,tsx,js,mjs}'],
};

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!isEdgeRuntimeFile(path, content)) continue;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Type-only imports are erased at compile, never reach runtime.
      if (TYPE_IMPORT_RE.test(line)) continue;
      const specifiers = extractSpecifiers(line);
      for (const spec of specifiers) {
        const match = HEAVY_PATTERNS.find((re) => re.test(spec));
        if (!match) continue;
        out.push({
          pattern: metadata.id,
          file: path,
          line: i + 1,
          evidence: `import "${spec}" in edge-runtime file`,
          edgeReason: isMiddleware(path) ? 'middleware (always edge)' : 'export const runtime = "edge"',
          importedModule: spec,
          trafficIndependent: metadata.trafficIndependent,
        });
      }
    }
  }
  return out;
}

function isEdgeRuntimeFile(path, content) {
  return isMiddleware(path) || EDGE_RUNTIME_RE.test(content);
}

function isMiddleware(path) {
  return /(?:^|\/)middleware\.(ts|tsx|js|mjs)$/.test(path);
}

function extractSpecifiers(line) {
  const out = new Set();
  // IMPORT_RE has `gm` flag — reset lastIndex per call.
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(line)) !== null) out.add(m[1]);
  DYNAMIC_IMPORT_RE.lastIndex = 0;
  while ((m = DYNAMIC_IMPORT_RE.exec(line)) !== null) out.add(m[1]);
  REQUIRE_RE.lastIndex = 0;
  while ((m = REQUIRE_RE.exec(line)) !== null) out.add(m[1]);
  return [...out];
}
