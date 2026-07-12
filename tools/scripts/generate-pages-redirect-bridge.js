#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SITEMAP = path.join(REPO_ROOT, 'apps', 'web-app', 'public', 'sitemap.xml');
const DEFAULT_CURRENT_BASE = 'https://sickn33.github.io/agentic-awesome-skills/';
const DEFAULT_LEGACY_BASE = 'https://sickn33.github.io/antigravity-awesome-skills/';
const DEFAULT_EXPECTED_ROUTES = 46;
const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function xmlEscape(value) {
  return htmlEscape(value);
}

function xmlUnescape(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function canonicalBase(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch (_) {
    throw new Error(`${label} must be an absolute URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`${label} must be a credential-free HTTPS URL without query or fragment`);
  }
  if (!url.pathname.endsWith('/')) throw new Error(`${label} must end with a slash`);
  return url;
}

function parseSitemap(source) {
  const rawLocations = [...source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => xmlUnescape(match[1].trim()));
  if (!rawLocations.length) throw new Error('sitemap contains no <loc> URLs');
  if (new Set(rawLocations).size !== rawLocations.length) throw new Error('sitemap contains duplicate <loc> URLs');
  return rawLocations;
}

function safeRelativeRoute(currentUrl, currentBase) {
  if (currentUrl.protocol !== 'https:' || currentUrl.origin !== currentBase.origin || currentUrl.search || currentUrl.hash) {
    throw new Error(`sitemap URL is outside the current HTTPS identity: ${currentUrl.toString()}`);
  }
  if (!currentUrl.pathname.startsWith(currentBase.pathname) || !currentUrl.pathname.endsWith('/')) {
    throw new Error(`sitemap URL is outside the current base path or lacks a trailing slash: ${currentUrl.toString()}`);
  }
  const relative = currentUrl.pathname.slice(currentBase.pathname.length);
  const segments = relative.split('/').filter(Boolean);
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment)) {
      throw new Error(`sitemap URL contains an unsafe path segment: ${currentUrl.toString()}`);
    }
  }
  return segments.join('/');
}

function outputRelativePath(legacyBase, relativeRoute) {
  const baseSegments = legacyBase.pathname.split('/').filter(Boolean);
  for (const segment of baseSegments) {
    if (segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment)) {
      throw new Error('legacy base contains an unsafe path segment');
    }
  }
  return path.posix.join(...baseSegments, relativeRoute, 'index.html');
}

function redirectHtml(destination) {
  const escaped = htmlEscape(destination);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=${escaped}">
    <link rel="canonical" href="${escaped}">
    <title>Agentic Awesome Skills has moved</title>
  </head>
  <body>
    <main>
      <h1>Agentic Awesome Skills has moved</h1>
      <p>Continue to <a href="${escaped}">${escaped}</a>.</p>
    </main>
  </body>
</html>
`;
}

function legacySitemap(redirects) {
  const entries = redirects.map(({ from }) => `  <url><loc>${xmlEscape(from)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function physicalCandidate(candidate) {
  const suffix = [];
  let cursor = path.resolve(candidate);
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`cannot resolve an existing ancestor for: ${candidate}`);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(fs.realpathSync(cursor), ...suffix);
}

function containsExistingSymlink(parent, candidate) {
  const relative = path.relative(parent, candidate);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  let cursor = parent;
  for (const segment of relative.split(path.sep)) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) return false;
    if (fs.lstatSync(cursor).isSymbolicLink()) return true;
  }
  return false;
}

function assertSafeOutput(outputDirectory, repoRoot) {
  if (fs.existsSync(outputDirectory)) throw new Error(`output path already exists: ${outputDirectory}`);
  const physicalRepoRoot = fs.realpathSync(repoRoot);
  const codexDirectory = path.join(repoRoot, '.codex');
  const codexIsSymlink = fs.existsSync(codexDirectory) && fs.lstatSync(codexDirectory).isSymbolicLink();
  const physicalCodexDirectory = physicalCandidate(codexDirectory);
  const physicalOutput = physicalCandidate(outputDirectory);
  if (isInside(repoRoot, outputDirectory) && !isInside(codexDirectory, outputDirectory)) {
    throw new Error('output inside the repository is allowed only under ignored .codex/');
  }
  if (isInside(repoRoot, outputDirectory) && containsExistingSymlink(repoRoot, path.dirname(outputDirectory))) {
    throw new Error('in-repository output paths may not traverse symlinks');
  }
  if (isInside(physicalRepoRoot, physicalOutput) && (codexIsSymlink || !isInside(physicalCodexDirectory, physicalOutput))) {
    throw new Error('physical output resolves inside the repository but outside ignored .codex/');
  }
}

function writeBridge(stagingDirectory, redirects, manifest, legacyBase) {
  for (const redirect of redirects) {
    const filePath = path.join(stagingDirectory, ...redirect.output_file.split('/'));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, redirectHtml(redirect.to), 'utf8');
  }
  const legacyDirectory = path.join(stagingDirectory, ...legacyBase.pathname.split('/').filter(Boolean));
  fs.mkdirSync(legacyDirectory, { recursive: true });
  fs.writeFileSync(path.join(legacyDirectory, 'sitemap.xml'), legacySitemap(redirects), 'utf8');
  fs.writeFileSync(path.join(stagingDirectory, 'redirect-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(stagingDirectory, '.nojekyll'), '', 'utf8');
}

function generateBridge(options) {
  const repoRoot = path.resolve(options.repoRoot || REPO_ROOT);
  const sitemapPath = path.resolve(options.sitemapPath || DEFAULT_SITEMAP);
  if (!options.outputDirectory) throw new Error('--output is required');
  const outputDirectory = path.resolve(options.outputDirectory);
  const currentBase = canonicalBase(options.currentBase || DEFAULT_CURRENT_BASE, 'current base');
  const legacyBase = canonicalBase(options.legacyBase || DEFAULT_LEGACY_BASE, 'legacy base');
  if (currentBase.toString() === legacyBase.toString()) throw new Error('current and legacy bases must be distinct');
  const expectedRoutes = Number(options.expectedRoutes ?? DEFAULT_EXPECTED_ROUTES);
  if (!Number.isSafeInteger(expectedRoutes) || expectedRoutes <= 0) throw new Error('expected route count must be a positive integer');
  assertSafeOutput(outputDirectory, repoRoot);

  const sitemapSource = fs.readFileSync(sitemapPath, 'utf8');
  const locations = parseSitemap(sitemapSource);
  if (locations.length !== expectedRoutes) {
    throw new Error(`sitemap route count ${locations.length} does not match locked expectation ${expectedRoutes}`);
  }

  const redirects = locations.map((location) => {
    const currentUrl = new URL(location);
    const relativeRoute = safeRelativeRoute(currentUrl, currentBase);
    const from = new URL(relativeRoute ? `${relativeRoute}/` : '', legacyBase).toString();
    const to = currentUrl.toString();
    return {
      from,
      to,
      output_file: outputRelativePath(legacyBase, relativeRoute),
    };
  });
  if (!redirects.some(({ to }) => to === currentBase.toString())) throw new Error('sitemap does not contain the current root route');
  if (new Set(redirects.map(({ from }) => from)).size !== redirects.length) throw new Error('legacy mapping is not one-to-one');
  if (new Set(redirects.map(({ output_file }) => output_file)).size !== redirects.length) throw new Error('multiple routes map to the same output file');
  redirects.sort((left, right) => left.from.localeCompare(right.from));

  const legacySitemapPath = path.posix.join(...legacyBase.pathname.split('/').filter(Boolean), 'sitemap.xml');
  if (redirects.some(({ output_file }) => output_file.startsWith(`${legacySitemapPath}/`))) {
    throw new Error(`generated route collides with reserved legacy sitemap path: ${legacySitemapPath}`);
  }

  const manifest = {
    schema_version: 1,
    deployment_scope: 'separate GitHub Pages user-site subdirectory',
    not_for_current_project_pages: true,
    source_sitemap_sha256: sha256(sitemapSource),
    current_base: currentBase.toString(),
    legacy_base: legacyBase.toString(),
    route_count: redirects.length,
    legacy_sitemap: legacySitemapPath,
    redirects,
  };

  fs.mkdirSync(path.dirname(outputDirectory), { recursive: true });
  let stagingDirectory = null;
  try {
    stagingDirectory = fs.mkdtempSync(path.join(path.dirname(outputDirectory), `.${path.basename(outputDirectory)}.${process.pid}.`));
    writeBridge(stagingDirectory, redirects, manifest, legacyBase);
    fs.renameSync(stagingDirectory, outputDirectory);
  } finally {
    if (stagingDirectory && fs.existsSync(stagingDirectory)) fs.rmSync(stagingDirectory, { recursive: true, force: true });
  }
  return manifest;
}

function parseArgs(argv) {
  const options = {};
  const aliases = {
    '--output': 'outputDirectory',
    '--sitemap': 'sitemapPath',
    '--current-base': 'currentBase',
    '--legacy-base': 'legacyBase',
    '--expected-routes': 'expectedRoutes',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const key = aliases[arg];
    const value = argv[index + 1];
    if (!key || !value || value.startsWith('--')) throw new Error(`unknown option or missing value: ${arg}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node tools/scripts/generate-pages-redirect-bridge.js --output NEW_DIR [--sitemap FILE] [--expected-routes N]\n');
    return;
  }
  const manifest = generateBridge(options);
  process.stdout.write(`Generated ${manifest.route_count} redirect pages in ${path.resolve(options.outputDirectory)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`redirect bridge generation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  generateBridge,
  htmlEscape,
  parseArgs,
  parseSitemap,
  redirectHtml,
};
