import fs from 'node:fs';
import path from 'node:path';

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
    distDir: 'dist',
    minSkillUrls: String(defaultMinSkillUrls),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--artifacts-dir') {
      const value = argv[i + 1];
      if (value) {
        args.sitemapPath = path.join(value, 'sitemap.xml');
        args.robotsPath = path.join(value, 'robots.txt');
        args.llmsPath = path.join(value, 'llms.txt');
        args.manifestPath = path.join(value, 'site.webmanifest');
        args.indexPath = path.join(value, 'index.html');
        args.distDir = value;
        i += 1;
      }
      continue;
    }

    if (arg === '--dist-dir' && argv[i + 1]) {
      args.distDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--sitemap' && argv[i + 1]) {
      args.sitemapPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--robots' && argv[i + 1]) {
      args.robotsPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--llms' && argv[i + 1]) {
      args.llmsPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--manifest' && argv[i + 1]) {
      args.manifestPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--index' && argv[i + 1]) {
      args.indexPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--min-skill-urls' && argv[i + 1]) {
      args.minSkillUrls = argv[i + 1];
      i += 1;
    }
  }

  return args;
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

function assertMetaContent(htmlText, selectorType, selectorValue) {
  const content = extractMetaContent(htmlText, selectorType, selectorValue);
  assert(Boolean(content), `Missing required meta tag ${selectorType}="${selectorValue}".`);
  assert(content.length > 0, `Meta tag ${selectorType}="${selectorValue}" must have non-empty content.`);
}

export function analyzeSitemap(urlText, { minSkillUrls = 1 } = {}) {
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
  const skillRoutes = extraRoutes.filter(({ parsed: parsedUrl }) =>
    parsedUrl.pathname.startsWith(skillPrefix),
  );
  const unsupportedRoutes = extraRoutes.filter(
    ({ parsed: parsedUrl }) =>
      !parsedUrl.pathname.startsWith(skillPrefix) && !allowedExtraPathVariants.has(parsedUrl.pathname),
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
    pluginUrls: extraRoutes
      .filter(({ parsed: parsedUrl }) => allowedExtraPathVariants.has(parsedUrl.pathname))
      .map(({ raw }) => raw),
  };
}

export function assertSitemap(urlText, { minSkillUrls = 1 } = {}) {
  analyzeSitemap(urlText, { minSkillUrls });
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
  const repoUrl = 'https://github.com/sickn33/antigravity-awesome-skills';
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

export function assertIndexDiscoveryMeta(htmlText) {
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

  assert(combined.includes('1,508+'), 'Home SEO metadata must expose the current 1,508+ skill count.');
  assert(combined.includes('specialized plugins'), 'Home SEO metadata must mention specialized plugins.');
  assert(!combined.includes('prompt templates'), 'Home SEO metadata must not use stale prompt-template positioning.');
  assertJsonLdTypes(htmlText, ['CollectionPage', 'Organization', 'WebSite', 'SoftwareSourceCode', 'FAQPage']);
  assertRepositoryJsonLdSignals(htmlText);
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
    const filePath = path.join(distDir, routePathToDistFile(parsed.pathname, normalizedRootPath));
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for skill route: ${parsed.pathname}. Expected ${filePath}.`,
    );
  }
}

export function assertPrerenderedPluginRoutes(pluginUrls, distDir = 'dist', normalizedRootPath = '') {
  for (const pluginUrl of pluginUrls) {
    const parsed = new URL(pluginUrl);
    const filePath = path.join(distDir, routePathToDistFile(parsed.pathname, normalizedRootPath));
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for plugin route: ${parsed.pathname}. Expected ${filePath}.`,
    );
    assertPluginsDiscoveryMeta(readFile(filePath));
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

export function assertLlms(llmsText) {
  const text = String(llmsText ?? '');
  const requiredSnippets = [
    '# Antigravity Awesome Skills',
    '1,508+',
    'specialized plugins',
    'Claude Code',
    'Codex CLI',
    'https://github.com/sickn33/antigravity-awesome-skills',
    'Canonical source of truth',
  ];

  for (const snippet of requiredSnippets) {
    assert(text.includes(snippet), `llms.txt missing required snippet: ${snippet}`);
  }
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

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

export function runVerification({
  sitemapPath,
  robotsPath,
  llmsPath = 'dist/llms.txt',
  manifestPath,
  indexPath = 'dist/index.html',
  distDir = 'dist',
  minSkillUrls,
}) {
  const sitemapReport = analyzeSitemap(readFile(sitemapPath), { minSkillUrls });
  const indexHtml = readFile(indexPath);
  assertPrerenderedSkillRoutes(sitemapReport.skillUrls, distDir, sitemapReport.normalizedRootPath);
  assertPrerenderedPluginRoutes(sitemapReport.pluginUrls, distDir, sitemapReport.normalizedRootPath);
  assertIndexSocialMeta(indexHtml);
  assertIndexDiscoveryMeta(indexHtml);
  assertRobots(readFile(robotsPath));
  assertLlms(readFile(llmsPath));
  assertManifest(readFile(manifestPath));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  runVerification(cliArgs);
  console.log('SEO assets verification passed.');
}
