// Prepend `npm i <pkg>` when the fix imports a package missing from
// package.json — otherwise pasted code hits a runtime error.

const IMPORT_RE = /\bimport\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
// Captures package root from `pkg/sub` and `@scope/pkg/sub`.
const PKG_ROOT_RE = /^(@[^/]+\/[^/]+|[^/]+)/;
const NODE_BUILTINS = new Set([
  'fs', 'fs/promises', 'path', 'os', 'crypto', 'http', 'https', 'http2', 'net',
  'dns', 'tls', 'util', 'url', 'stream', 'buffer', 'events', 'process', 'child_process',
  'cluster', 'worker_threads', 'inspector', 'perf_hooks', 'assert', 'console',
  'querystring', 'string_decoder', 'tty', 'vm', 'zlib', 'readline', 'punycode',
  'module', 'timers', 'async_hooks', 'v8', 'test', 'diagnostics_channel',
]);

export const metadata = {
  id: 'undeclared-dep',
  description: 'Prepend `npm i <pkg>` when fix imports a package not in package.json.',
};

export function apply(rec, ctx = {}) {
  const pkg = ctx?.package ?? ctx?.signals?.package ?? null;
  if (!pkg) return {};

  const known = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);

  const text = [rec.fix, rec.currentBehavior, rec.desiredBehavior]
    .filter((s) => typeof s === 'string')
    .join('\n');
  const codeBlocks = extractCodeBlocks(text);
  const importedRoots = new Set();
  for (const block of codeBlocks) {
    for (const m of block.matchAll(IMPORT_RE)) {
      const root = pkgRoot(m[1]);
      if (root) importedRoots.add(root);
    }
    for (const m of block.matchAll(REQUIRE_RE)) {
      const root = pkgRoot(m[1]);
      if (root) importedRoots.add(root);
    }
  }

  const undeclared = [...importedRoots]
    .filter((r) => !r.startsWith('.'))
    .filter((r) => !NODE_BUILTINS.has(r))
    .filter((r) => !r.startsWith('node:'))
    .filter((r) => !known.has(r));

  if (undeclared.length === 0) return {};

  const installLines = undeclared.map((p) => `\`npm i ${p}\``).join(', ');
  const prepend = `**Add dependency first**: ${installLines}\n\n`;
  if (typeof rec.fix === 'string') rec.fix = prepend + rec.fix;
  else rec.fix = prepend.trim();
  return { tags: undeclared.map((p) => `undeclared-dep:${p}`), needsReview: true };
}

function pkgRoot(specifier) {
  if (!specifier) return null;
  if (specifier.startsWith('.')) return specifier;
  const m = specifier.match(PKG_ROOT_RE);
  return m ? m[1] : null;
}

function extractCodeBlocks(text) {
  const out = [];
  const re = /```[\w-]*\n?([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  // Also scan raw text for rare inline imports outside code blocks.
  out.push(text);
  return out;
}
