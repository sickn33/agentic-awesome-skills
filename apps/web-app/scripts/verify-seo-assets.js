import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sanitizeFilename from 'sanitize-filename';
import { getSeoLandingPaths } from './generate-sitemap.js';

const APP_ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT_DIR = path.resolve(APP_ROOT_DIR, '..', '..');

function safeUserPath(pathValue, baseDir = process.cwd()) {
  const basePath = path.resolve(baseDir);
  const resolvedPath = path.resolve(basePath, String(pathValue ?? ''));
  const relativePath = path.relative(basePath, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path escapes allowed directory: ${pathValue}`);
  }
  const sanitizedSegments = [];
  for (const segment of relativePath.split(path.sep).filter(Boolean)) {
    const sanitizedSegment = sanitizeFilename(segment);
    if (sanitizedSegment !== segment || !sanitizedSegment) {
      throw new Error(`Unsafe path segment: ${segment}`);
    }
    sanitizedSegments.push(sanitizedSegment);
  }
  return path.resolve(basePath, ...sanitizedSegments);
}

export function extractSitemapLocations(xmlText) {
  const raw = String(xmlText ?? '');
  const matches = raw.matchAll(/<loc>(.*?)<\/loc>/g);
  return [...matches].map((match) => match[1].trim()).filter(Boolean);
}

function parseCount(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseCliArgs(argv) {
  const defaultMinSkillUrls = parseCount(
    process.env.PRERENDER_VERIFY_MIN_SKILL_URLS || process.env.PRERENDER_TOP_SKILL_COUNT || process.env.TOP_SKILL_COUNT,
    40,
  );
  const args = {
    sitemapPath: 'dist/sitemap.xml',
    robotsPath: 'dist/robots.txt',
    llmsPath: 'dist/llms.txt',
    manifestPath: 'dist/site.webmanifest',
    indexPath: 'dist/index.html',
    sourceIndexPath: 'index.html',
    socialImagePath: 'dist/social-card.png',
    distDir: 'dist',
    minSkillUrls: String(defaultMinSkillUrls),
    requireHostedUrl: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--artifacts-dir') {
      const value = argv[i + 1];
      if (value) {
        const artifactsDir = safeUserPath(value);
        args.sitemapPath = path.join(artifactsDir, 'sitemap.xml');
        args.robotsPath = path.join(artifactsDir, 'robots.txt');
        args.llmsPath = path.join(artifactsDir, 'llms.txt');
        args.manifestPath = path.join(artifactsDir, 'site.webmanifest');
        args.indexPath = path.join(artifactsDir, 'index.html');
        args.socialImagePath = path.join(artifactsDir, 'social-card.png');
        args.distDir = artifactsDir;
        i += 1;
      }
      continue;
    }

    if (arg === '--dist-dir' && argv[i + 1]) {
      args.distDir = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--sitemap' && argv[i + 1]) {
      args.sitemapPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--robots' && argv[i + 1]) {
      args.robotsPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--llms' && argv[i + 1]) {
      args.llmsPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--manifest' && argv[i + 1]) {
      args.manifestPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--index' && argv[i + 1]) {
      args.indexPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--source-index' && argv[i + 1]) {
      args.sourceIndexPath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--social-image' && argv[i + 1]) {
      args.socialImagePath = safeUserPath(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--min-skill-urls' && argv[i + 1]) {
      args.minSkillUrls = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--require-hosted-url') {
      args.requireHostedUrl = true;
    }
  }

  return args;
}

function getPackageReleaseLabel() {
  const raw = readFile(path.join(REPO_ROOT_DIR, 'package.json'), REPO_ROOT_DIR);
  const pkg = JSON.parse(raw);
  assert(typeof pkg.version === 'string' && pkg.version.trim(), 'Root package.json must define version.');
  return `V${pkg.version.trim()}`;
}

function extractMetaContent(htmlText, selectorType, selectorValue) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*${selectorType}=["']${selectorValue}["'][^>]*\\scontent=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const match = htmlText.match(pattern);
  return match?.[1]?.trim();
}

function extractTitle(htmlText) {
  const match = String(htmlText ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || '';
}

function extractSkillCountLabels(text) {
  return [...new Set(String(text ?? '').match(/\b\d{1,3}(?:,\d{3})\+/g) || [])];
}

function assertOnlyExpectedSkillCountLabel(text, expectedSkillCountLabel, label) {
  const staleLabels = extractSkillCountLabels(text).filter((countLabel) => countLabel !== expectedSkillCountLabel);
  assert(
    staleLabels.length === 0,
    `${label} contains stale skill count label(s): ${staleLabels.join(', ')}`,
  );
}

function assertNoLocalhostUrl(text, label) {
  assert(!/https?:\/\/localhost\b/i.test(String(text ?? '')), `${label} must not contain localhost URLs.`);
}

function assertMetaContent(htmlText, selectorType, selectorValue) {
  const content = extractMetaContent(htmlText, selectorType, selectorValue);
  assert(Boolean(content), `Missing required meta tag ${selectorType}="${selectorValue}".`);
  assert(content.length > 0, `Meta tag ${selectorType}="${selectorValue}" must have non-empty content.`);
}

export function analyzeSitemap(urlText, { minSkillUrls = 1, requireHostedUrl = false } = {}) {
  const locations = extractSitemapLocations(urlText);
  const normalizedMinSkillUrls = Number.parseInt(String(minSkillUrls), 10);
  const effectiveMinSkillUrls = Number.isFinite(normalizedMinSkillUrls)
    ? Math.max(normalizedMinSkillUrls, 0)
    : 1;

  assert(locations.length > 0, 'Sitemap contains no <loc> entries.');
  assert(new Set(locations).size === locations.length, 'Sitemap contains duplicated <loc> values.');

  const parsed = locations.map((location) => {
    let url;
    try {
      url = new URL(location);
    } catch (_err) {
      throw new Error(`Sitemap contains invalid URL: ${location}`);
    }

    assert(
      url.protocol === 'https:' || url.protocol === 'http:',
      `Sitemap URL must use http(s): ${location}`,
    );
    if (requireHostedUrl) {
      assert(url.hostname !== 'localhost', `Sitemap URL must not use localhost: ${location}`);
    }
    return { raw: location, parsed: url };
  });

  const paths = parsed.map(({ parsed }) => parsed.pathname);
  const segmentCounts = paths.map((pathname) => {
    const normalized = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
    return normalized ? normalized.split('/').filter(Boolean).length : 0;
  });
  const minSegments = Math.min(...segmentCounts);
  const rootCandidate = parsed.find(
    ({ parsed: parsedUrl }, index) =>
      (segmentCounts[index] === minSegments && !parsedUrl.pathname.includes('/skill/')) || parsedUrl.pathname === '/',
  );
  assert(Boolean(rootCandidate), 'Sitemap does not expose a homepage candidate URL.');

  const rootUrl = new URL(rootCandidate.raw);
  const normalizedRoot = rootUrl.pathname === '/' ? '' : rootUrl.pathname.replace(/\/+$/, '');
  const skillPrefix = `${normalizedRoot}/skill/`;
  const rootPathVariants = new Set([
    rootUrl.pathname,
    rootUrl.pathname.endsWith('/') ? rootUrl.pathname.slice(0, -1) : `${rootUrl.pathname}/`,
  ]);

  const isRoot = ({ parsed: parsedUrl }) => rootPathVariants.has(parsedUrl.pathname);
  const extraRoutes = parsed.filter(({ parsed: parsedUrl }) => !isRoot({ parsed: parsedUrl }));
  const allowedExtraPathVariants = new Set([
    `${normalizedRoot}/plugins`,
    `${normalizedRoot}/plugins/`,
  ]);
  const topicPathVariants = new Set(
    getSeoLandingPaths().flatMap((topicPath) => [
      `${normalizedRoot}${topicPath}`,
      `${normalizedRoot}${topicPath}/`,
    ]),
  );
  const skillRoutes = extraRoutes.filter(({ parsed: parsedUrl }) =>
    parsedUrl.pathname.startsWith(skillPrefix),
  );
  const topicRoutes = extraRoutes.filter(({ parsed: parsedUrl }) =>
    topicPathVariants.has(parsedUrl.pathname),
  );
  const unsupportedRoutes = extraRoutes.filter(
    ({ parsed: parsedUrl }) =>
      !parsedUrl.pathname.startsWith(skillPrefix) &&
      !allowedExtraPathVariants.has(parsedUrl.pathname) &&
      !topicPathVariants.has(parsedUrl.pathname),
  );

  assert(
    skillRoutes.length >= effectiveMinSkillUrls,
    `Expected at least ${effectiveMinSkillUrls} skill URLs, got ${skillRoutes.length}.`,
  );

  assert(
    unsupportedRoutes.length === 0,
    'Sitemap contains unsupported non-skill routes.',
  );

  return {
    locations,
    rootPath: rootUrl.pathname,
    normalizedRootPath: normalizedRoot,
    skillUrls: skillRoutes.map(({ raw }) => raw),
    topicUrls: topicRoutes.map(({ raw }) => raw),
    pluginUrls: extraRoutes
      .filter(({ parsed: parsedUrl }) => allowedExtraPathVariants.has(parsedUrl.pathname))
      .map(({ raw }) => raw),
  };
}

export function assertSitemap(urlText, { minSkillUrls = 1, requireHostedUrl = false } = {}) {
  analyzeSitemap(urlText, { minSkillUrls, requireHostedUrl });
}

function extractJsonLdEntries(htmlText) {
  const raw = String(htmlText ?? '');
  const matches = raw.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const entries = [];

  for (const match of matches) {
    const text = match[1]?.trim();
    if (!text) {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_err) {
      throw new Error('JSON-LD script contains invalid JSON.');
    }

    if (Array.isArray(parsed)) {
      entries.push(...parsed);
    } else {
      entries.push(parsed);
    }
  }

  return entries;
}

function assertJsonLdTypes(htmlText, requiredTypes) {
  const entries = extractJsonLdEntries(htmlText);
  const types = new Set(entries.map((entry) => entry?.['@type']).filter(Boolean));

  for (const requiredType of requiredTypes) {
    assert(types.has(requiredType), `JSON-LD missing required @type: ${requiredType}`);
  }
}

function assertRepositoryJsonLdSignals(htmlText) {
  const entries = extractJsonLdEntries(htmlText);
  const repoUrl = 'https://github.com/sickn33/agentic-awesome-skills';
  const sourceCode = entries.find((entry) => entry?.['@type'] === 'SoftwareSourceCode');
  const organization = entries.find((entry) => entry?.['@type'] === 'Organization');
  const collectionPage = entries.find((entry) => entry?.['@type'] === 'CollectionPage');

  assert(sourceCode?.url === repoUrl, 'SoftwareSourceCode JSON-LD must use the GitHub repository as its URL.');
  assert(sourceCode?.codeRepository === repoUrl, 'SoftwareSourceCode JSON-LD must expose the GitHub repository.');
  assert(
    typeof sourceCode?.mainEntityOfPage === 'string' && sourceCode.mainEntityOfPage.length > 0,
    'SoftwareSourceCode JSON-LD must link back to the hosted catalog page with mainEntityOfPage.',
  );
  assert(organization?.url === repoUrl, 'Organization JSON-LD must use the GitHub repository as its URL.');
  assert(collectionPage?.sameAs === repoUrl, 'CollectionPage JSON-LD must link the hosted catalog to the GitHub repository.');
}

export function assertIndexSocialMeta(htmlText) {
  assertMetaContent(htmlText, 'property', 'og:image');
  assertMetaContent(htmlText, 'name', 'twitter:image');
  assertMetaContent(htmlText, 'name', 'twitter:image:alt');
}

function readSkillCountLabel(distDir) {
  try {
    const skills = JSON.parse(readFile(path.join(distDir, 'skills.json'), distDir));
    if (Array.isArray(skills) && skills.length > 0) {
      return `${skills.length.toLocaleString('en-US')}+`;
    }
  } catch (_err) {
    // Fall back to the explicit baseline when a fixture omits generated skill data.
  }

  return '1,678+';
}

export function assertIndexDiscoveryMeta(htmlText, { expectedSkillCountLabel = '1,678+', requireHostedUrl = false } = {}) {
  const title = extractTitle(htmlText);
  const description = extractMetaContent(htmlText, 'name', 'description') || '';
  const ogTitle = extractMetaContent(htmlText, 'property', 'og:title') || '';
  const ogDescription = extractMetaContent(htmlText, 'property', 'og:description') || '';
  const twitterTitle = extractMetaContent(htmlText, 'name', 'twitter:title') || '';
  const twitterDescription = extractMetaContent(htmlText, 'name', 'twitter:description') || '';
  const combined = [
    title,
    description,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
  ].join(' ');

  assert(
    combined.includes(expectedSkillCountLabel),
    `Home SEO metadata must expose the current ${expectedSkillCountLabel} skill count.`,
  );
  assert(combined.includes('GitHub library'), 'Home SEO metadata must mention the GitHub library.');
  assert(combined.includes('specialized plugins'), 'Home SEO metadata must mention specialized plugins.');
  assert(!combined.includes('prompt templates'), 'Home SEO metadata must not use stale prompt-template positioning.');
  assertOnlyExpectedSkillCountLabel(combined, expectedSkillCountLabel, 'Home SEO metadata');
  const jsonLdText = JSON.stringify(extractJsonLdEntries(htmlText));
  assertOnlyExpectedSkillCountLabel(jsonLdText, expectedSkillCountLabel, 'Home JSON-LD');
  if (requireHostedUrl) {
    assertNoLocalhostUrl(combined, 'Home SEO metadata');
    assertNoLocalhostUrl(jsonLdText, 'Home JSON-LD');
  }
  assertJsonLdTypes(htmlText, ['CollectionPage', 'Organization', 'WebSite', 'SoftwareSourceCode', 'FAQPage']);
  assertRepositoryJsonLdSignals(htmlText);
}

export function assertStaticIndexShell(htmlText, { expectedSkillCountLabel = '1,678+', requireHostedUrl = false } = {}) {
  const title = extractTitle(htmlText);
  const description = extractMetaContent(htmlText, 'name', 'description') || '';
  const ogTitle = extractMetaContent(htmlText, 'property', 'og:title') || '';
  const ogDescription = extractMetaContent(htmlText, 'property', 'og:description') || '';
  const twitterTitle = extractMetaContent(htmlText, 'name', 'twitter:title') || '';
  const twitterDescription = extractMetaContent(htmlText, 'name', 'twitter:description') || '';
  const combined = [title, description, ogTitle, ogDescription, twitterTitle, twitterDescription].join(' ');

  assert(
    combined.includes(expectedSkillCountLabel),
    `Source index shell must expose the current ${expectedSkillCountLabel} skill count.`,
  );
  assert(combined.includes('GitHub library'), 'Source index shell must mention the GitHub library.');
  assert(combined.includes('specialized plugins'), 'Source index shell must mention specialized plugins.');
  assertOnlyExpectedSkillCountLabel(combined, expectedSkillCountLabel, 'Source index shell');
  if (requireHostedUrl) {
    assertNoLocalhostUrl(combined, 'Source index shell');
  }
}

function readPngDimensions(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(Buffer.isBuffer(buffer) && buffer.subarray(0, 8).equals(signature), 'Social card PNG must have a valid PNG signature.');
  assert(buffer.subarray(12, 16).toString('ascii') === 'IHDR', 'Social card PNG must expose an IHDR chunk.');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function assertSocialCard(cardData, { expectedSkillCountLabel = '1,678+' } = {}) {
  if (Buffer.isBuffer(cardData) && cardData.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    const { width, height } = readPngDimensions(cardData);
    assert(width === 1200 && height === 630, `Social card PNG must be 1200x630, got ${width}x${height}.`);
    return;
  }

  const text = String(cardData ?? '');
  const countWords = expectedSkillCountLabel.replace(/\+$/, ' plus');
  assert(
    text.includes(expectedSkillCountLabel) || text.includes(countWords),
    `Social card must expose the current ${expectedSkillCountLabel} skill count.`,
  );
  assert(text.includes('Agentic Awesome Skills'), 'Social card must identify Agentic Awesome Skills.');
  assertOnlyExpectedSkillCountLabel(text, expectedSkillCountLabel, 'Social card');
}

export function assertPluginsDiscoveryMeta(htmlText) {
  const title = extractTitle(htmlText);
  const description = extractMetaContent(htmlText, 'name', 'description') || '';
  const ogTitle = extractMetaContent(htmlText, 'property', 'og:title') || '';
  const combined = [title, description, ogTitle].join(' ');

  assert(combined.includes('AAS Specialized Plugins'), 'Plugins page SEO metadata must expose the plugin landing title.');
  assert(combined.includes('specialized plugin packs'), 'Plugins page SEO metadata must mention specialized plugin packs.');
  assertJsonLdTypes(htmlText, ['CollectionPage', 'Organization']);
}

export function assertTopicDiscoveryMeta(htmlText) {
  const title = extractTitle(htmlText);
  const description = extractMetaContent(htmlText, 'name', 'description') || '';
  const ogTitle = extractMetaContent(htmlText, 'property', 'og:title') || '';
  const combined = [title, description, ogTitle].join(' ');

  assert(combined.includes('Antigravity') || combined.includes('GitHub'), 'Topic page SEO metadata must expose a relevant discovery title.');
  assert(
    combined.includes('skills') || combined.includes('Skills') || combined.includes('plugins') || combined.includes('Plugins'),
    'Topic page SEO metadata must mention skills or plugins.',
  );
  assertJsonLdTypes(htmlText, ['WebPage', 'BreadcrumbList', 'Organization', 'WebSite', 'SoftwareSourceCode']);
}

function assertStaticRelatedTopicLinks(htmlText, routeType) {
  const html = String(htmlText ?? '');
  assert(
    html.includes('data-prerender-fallback="true"'),
    `${routeType} prerendered page must expose a static fallback body.`,
  );
  assert(
    /<a\s+href=["'][^"']*\/topics\/[^"']+["'][^>]*>[^<]+<\/a>/i.test(html),
    `${routeType} prerendered page must include static related topic links.`,
  );
}

function routePathToDistFile(routePath, normalizedRootPath) {
  const normalizedPath = (routePath || '/').replace(/\/+$/, '') || '/';
  const normalizedRoot = normalizedRootPath === '/' ? '' : String(normalizedRootPath || '').replace(/\/+$/, '');
  const withLeadingRoot = normalizedRoot ? `${normalizedRoot}/` : '';
  const trimmedRoute = normalizedPath.startsWith(withLeadingRoot) ? normalizedPath.slice(withLeadingRoot.length) || '/' : normalizedPath;
  const withoutLeadingSlash = trimmedRoute === '/' ? '' : trimmedRoute.replace(/^\//, '');
  const routeAsFilePath = withoutLeadingSlash ? `${withoutLeadingSlash}/index.html` : 'index.html';
  return routeAsFilePath;
}

export function assertPrerenderedSkillRoutes(skillUrls, distDir = 'dist', normalizedRootPath = '') {
  for (const skillUrl of skillUrls) {
    const parsed = new URL(skillUrl);
    const filePath = safeUserPath(routePathToDistFile(parsed.pathname, normalizedRootPath), distDir);
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for skill route: ${parsed.pathname}. Expected ${filePath}.`,
    );
    assertStaticRelatedTopicLinks(readFile(filePath, distDir), 'Skill');
  }
}

export function assertPrerenderedPluginRoutes(pluginUrls, distDir = 'dist', normalizedRootPath = '') {
  for (const pluginUrl of pluginUrls) {
    const parsed = new URL(pluginUrl);
    const filePath = safeUserPath(routePathToDistFile(parsed.pathname, normalizedRootPath), distDir);
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for plugin route: ${parsed.pathname}. Expected ${filePath}.`,
    );
    assertPluginsDiscoveryMeta(readFile(filePath, distDir));
  }
}

export function assertPrerenderedTopicRoutes(topicUrls, distDir = 'dist', normalizedRootPath = '') {
  for (const topicUrl of topicUrls) {
    const parsed = new URL(topicUrl);
    const filePath = safeUserPath(routePathToDistFile(parsed.pathname, normalizedRootPath), distDir);
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for topic route: ${parsed.pathname}. Expected ${filePath}.`,
    );
    const html = readFile(filePath, distDir);
    assertTopicDiscoveryMeta(html);
    assertStaticRelatedTopicLinks(html, 'Topic');
  }
}

export function assertRobots(robotsText) {
  const lines = String(robotsText ?? '').split(/\r?\n/).map((line) => line.trim());
  const allowsRoot = lines.some((line) => line.startsWith('Allow: /'));
  const hasSitemap = lines.some((line) => /^Sitemap:\s*.+\/?sitemap\.xml$/i.test(line));
  const allowsAiSearchCrawlers = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'].every((crawler) =>
    lines.some((line) => line === `User-agent: ${crawler}`),
  );

  assert(allowsRoot, 'robots.txt must allow root crawling.');
  assert(hasSitemap, 'robots.txt must expose sitemap location.');
  assert(allowsAiSearchCrawlers, 'robots.txt must explicitly expose AI search crawler directives.');
}

export function assertLlms(llmsText, { expectedSkillCountLabel = '1,678+', expectedReleaseLabel = '' } = {}) {
  const text = String(llmsText ?? '');
  const requiredSnippets = [
    '# Agentic Awesome Skills',
    expectedSkillCountLabel,
    'specialized plugins',
    'Claude Code',
    'Codex CLI',
    'https://github.com/sickn33/agentic-awesome-skills',
    'Canonical source of truth',
  ];

  for (const snippet of requiredSnippets) {
    assert(text.includes(snippet), `llms.txt missing required snippet: ${snippet}`);
  }
  if (expectedReleaseLabel) {
    assert(text.includes(`Current release: ${expectedReleaseLabel}.`), `llms.txt missing current release: ${expectedReleaseLabel}`);
  }
  assertOnlyExpectedSkillCountLabel(text, expectedSkillCountLabel, 'llms.txt');
}

export function assertManifest(manifestText) {
  const manifest = JSON.parse(String(manifestText ?? ''));

  const requiredKeys = ['name', 'short_name', 'theme_color', 'description'];
  for (const key of requiredKeys) {
    assert(typeof manifest[key] === 'string' && manifest[key].trim(), `Manifest missing required key: ${key}`);
  }

  assert(Array.isArray(manifest.icons), 'Manifest must define an icons array.');
  assert(manifest.icons.length > 0, 'Manifest icons array must not be empty.');
}

function readFile(filePath, baseDir = process.cwd()) {
  return fs.readFileSync(safeUserPath(filePath, baseDir), 'utf-8');
}

export function runVerification({
  sitemapPath,
  robotsPath,
  llmsPath = 'dist/llms.txt',
  manifestPath,
  indexPath = 'dist/index.html',
  sourceIndexPath = 'index.html',
  socialImagePath = 'dist/social-card.png',
  distDir = 'dist',
  minSkillUrls,
  requireHostedUrl = false,
}) {
  sitemapPath = safeUserPath(sitemapPath);
  robotsPath = safeUserPath(robotsPath);
  llmsPath = safeUserPath(llmsPath);
  manifestPath = safeUserPath(manifestPath);
  indexPath = safeUserPath(indexPath);
  sourceIndexPath = safeUserPath(sourceIndexPath);
  socialImagePath = safeUserPath(socialImagePath);
  distDir = safeUserPath(distDir);

  const expectedReleaseLabel = getPackageReleaseLabel();
  const sitemapText = readFile(sitemapPath);
  const sitemapReport = analyzeSitemap(sitemapText, { minSkillUrls, requireHostedUrl });
  const indexHtml = readFile(indexPath);
  const expectedSkillCountLabel = readSkillCountLabel(distDir);
  assertPrerenderedSkillRoutes(sitemapReport.skillUrls, distDir, sitemapReport.normalizedRootPath);
  assertPrerenderedPluginRoutes(sitemapReport.pluginUrls, distDir, sitemapReport.normalizedRootPath);
  assertPrerenderedTopicRoutes(sitemapReport.topicUrls, distDir, sitemapReport.normalizedRootPath);
  assertIndexSocialMeta(indexHtml);
  assertIndexDiscoveryMeta(indexHtml, { expectedSkillCountLabel, requireHostedUrl });
  assertStaticIndexShell(readFile(sourceIndexPath), { expectedSkillCountLabel, requireHostedUrl });
  assertSocialCard(fs.readFileSync(socialImagePath), { expectedSkillCountLabel });
  assertRobots(readFile(robotsPath));
  assertLlms(readFile(llmsPath), { expectedSkillCountLabel, expectedReleaseLabel });
  assertManifest(readFile(manifestPath));
  if (requireHostedUrl) {
    assertNoLocalhostUrl(sitemapText, 'Sitemap');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  runVerification(cliArgs);
  console.log('SEO assets verification passed.');
}
