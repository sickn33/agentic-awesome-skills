#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SITEMAP = path.join(REPO_ROOT, 'apps', 'web-app', 'public', 'sitemap.xml');
const DEFAULT_SKILLS_INDEX = path.join(REPO_ROOT, 'skills_index.json');
const DEFAULT_CURRENT_BASE = 'https://sickn33.github.io/agentic-awesome-skills/';
const DEFAULT_LEGACY_BASE = 'https://sickn33.github.io/antigravity-awesome-skills/';
const DEFAULT_EXPECTED_ROUTES = 187;
const DEFAULT_EXPECTED_SKILLS = 1965;
const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;

function isSafeSegment(value) {
  return typeof value === 'string' && value !== '.' && value !== '..' && SAFE_SEGMENT.test(value);
}

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
  const entities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) => entities[entity]);
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

function parseSkillIds(source) {
  let payload;
  try {
    payload = JSON.parse(source);
  } catch (error) {
    throw new Error(`skills index is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(payload) || !payload.length) throw new Error('skills index must be a non-empty array');
  const ids = payload.map((entry, index) => {
    const id = entry && entry.id;
    if (!id || !isSafeSegment(id)) {
      throw new Error(`skills index entry ${index} has an unsafe or missing id`);
    }
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error('skills index contains duplicate ids');
  return ids;
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
    if (!isSafeSegment(segment)) {
      throw new Error(`sitemap URL contains an unsafe path segment: ${currentUrl.toString()}`);
    }
  }
  return segments.join('/');
}

function outputRelativePath(legacyBase, relativeRoute) {
  const baseSegments = legacyBase.pathname.split('/').filter(Boolean);
  for (const segment of baseSegments) {
    if (!isSafeSegment(segment)) {
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

function writeBridge(stagingDirectory, redirects, sitemapRedirects, manifest, legacyBase) {
  for (const redirect of redirects) {
    const filePath = path.join(stagingDirectory, ...redirect.output_file.split('/'));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, redirectHtml(redirect.to), 'utf8');
  }
  const legacyDirectory = path.join(stagingDirectory, ...legacyBase.pathname.split('/').filter(Boolean));
  fs.mkdirSync(legacyDirectory, { recursive: true });
  fs.writeFileSync(path.join(legacyDirectory, 'sitemap.xml'), legacySitemap(sitemapRedirects), 'utf8');
  fs.writeFileSync(path.join(stagingDirectory, 'redirect-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(stagingDirectory, '.nojekyll'), '', 'utf8');
}

function generateBridge(options) {
  const repoRoot = path.resolve(options.repoRoot || REPO_ROOT);
  const sitemapPath = path.resolve(options.sitemapPath || DEFAULT_SITEMAP);
  const skillsIndexPath = path.resolve(options.skillsIndexPath || DEFAULT_SKILLS_INDEX);
  if (!options.outputDirectory) throw new Error('--output is required');
  const outputDirectory = path.resolve(options.outputDirectory);
  const currentBase = canonicalBase(options.currentBase || DEFAULT_CURRENT_BASE, 'current base');
  const legacyBase = canonicalBase(options.legacyBase || DEFAULT_LEGACY_BASE, 'legacy base');
  if (currentBase.toString() === legacyBase.toString()) throw new Error('current and legacy bases must be distinct');
  const expectedRoutes = Number(options.expectedRoutes ?? DEFAULT_EXPECTED_ROUTES);
  if (!Number.isSafeInteger(expectedRoutes) || expectedRoutes <= 0) throw new Error('expected route count must be a positive integer');
  const expectedSkills = Number(options.expectedSkills ?? DEFAULT_EXPECTED_SKILLS);
  if (!Number.isSafeInteger(expectedSkills) || expectedSkills <= 0) throw new Error('expected skill count must be a positive integer');
  assertSafeOutput(outputDirectory, repoRoot);

  const sitemapSource = fs.readFileSync(sitemapPath, 'utf8');
  const skillsIndexSource = fs.readFileSync(skillsIndexPath, 'utf8');
  const locations = parseSitemap(sitemapSource);
  const skillIds = parseSkillIds(skillsIndexSource);
  if (locations.length !== expectedRoutes) {
    throw new Error(`sitemap route count ${locations.length} does not match locked expectation ${expectedRoutes}`);
  }
  if (skillIds.length !== expectedSkills) {
    throw new Error(`skills index count ${skillIds.length} does not match locked expectation ${expectedSkills}`);
  }

  const skillIdSet = new Set(skillIds);
  const sitemapRoutes = locations.map((location) => {
    const currentUrl = new URL(location);
    const relativeRoute = safeRelativeRoute(currentUrl, currentBase);
    const segments = relativeRoute.split('/');
    if (segments[0] === 'skill' && (segments.length !== 2 || !skillIdSet.has(segments[1]))) {
      throw new Error(`sitemap skill route is absent from the current skills index: ${currentUrl.toString()}`);
    }
    return { currentUrl, relativeRoute };
  });
  const normalisedSitemapUrls = sitemapRoutes.map(({ currentUrl }) => currentUrl.toString());
  if (new Set(normalisedSitemapUrls).size !== normalisedSitemapUrls.length) {
    throw new Error('sitemap contains duplicate URLs after normalization');
  }
  const allRoutes = new Map(sitemapRoutes.map(({ currentUrl, relativeRoute }) => [currentUrl.toString(), { currentUrl, relativeRoute }]));
  for (const id of skillIds) {
    const currentUrl = new URL(`skill/${id}/`, currentBase);
    allRoutes.set(currentUrl.toString(), { currentUrl, relativeRoute: `skill/${id}` });
  }

  const toRedirect = ({ currentUrl, relativeRoute }) => {
    const from = new URL(relativeRoute ? `${relativeRoute}/` : '', legacyBase).toString();
    const to = currentUrl.toString();
    return {
      from,
      to,
      output_file: outputRelativePath(legacyBase, relativeRoute),
    };
  };
  const redirects = [...allRoutes.values()].map(toRedirect);
  const sitemapRedirects = sitemapRoutes.map(toRedirect).sort((left, right) => left.from.localeCompare(right.from));
  if (!redirects.some(({ to }) => to === currentBase.toString())) throw new Error('sitemap does not contain the current root route');
  if (new Set(redirects.map(({ from }) => from)).size !== redirects.length) throw new Error('legacy mapping is not one-to-one');
  if (new Set(redirects.map(({ output_file }) => output_file)).size !== redirects.length) throw new Error('multiple routes map to the same output file');
  redirects.sort((left, right) => left.from.localeCompare(right.from));

  const legacySitemapPath = path.posix.join(...legacyBase.pathname.split('/').filter(Boolean), 'sitemap.xml');
  if (redirects.some(({ output_file }) => output_file.startsWith(`${legacySitemapPath}/`))) {
    throw new Error(`generated route collides with reserved legacy sitemap path: ${legacySitemapPath}`);
  }

  const manifest = {
    schema_version: 2,
    deployment_scope: 'separate GitHub Pages user-site subdirectory',
    not_for_current_project_pages: true,
    source_sitemap_sha256: sha256(sitemapSource),
    source_skills_index_sha256: sha256(skillsIndexSource),
    current_base: currentBase.toString(),
    legacy_base: legacyBase.toString(),
    source_sitemap_route_count: locations.length,
    current_skill_route_count: skillIds.length,
    route_count: redirects.length,
    legacy_sitemap_route_count: sitemapRedirects.length,
    legacy_sitemap_policy: 'curated current sitemap routes only',
    legacy_sitemap: legacySitemapPath,
    redirects,
  };

  fs.mkdirSync(path.dirname(outputDirectory), { recursive: true });
  let stagingDirectory = null;
  try {
    stagingDirectory = fs.mkdtempSync(path.join(path.dirname(outputDirectory), `.${path.basename(outputDirectory)}.${process.pid}.`));
    writeBridge(stagingDirectory, redirects, sitemapRedirects, manifest, legacyBase);
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
    '--skills-index': 'skillsIndexPath',
    '--current-base': 'currentBase',
    '--legacy-base': 'legacyBase',
    '--expected-routes': 'expectedRoutes',
    '--expected-skills': 'expectedSkills',
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
    process.stdout.write('Usage: node tools/scripts/generate-pages-redirect-bridge.js --output NEW_DIR [--sitemap FILE] [--skills-index FILE] [--expected-routes N] [--expected-skills N]\n');
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
  parseSkillIds,
  parseSitemap,
  redirectHtml,
};
