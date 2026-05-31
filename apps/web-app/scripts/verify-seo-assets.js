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
  const skillRoutes = extraRoutes.filter(({ parsed: parsedUrl }) =>
    parsedUrl.pathname.startsWith(skillPrefix),
  );

  assert(
    skillRoutes.length >= effectiveMinSkillUrls,
    `Expected at least ${effectiveMinSkillUrls} skill URLs, got ${skillRoutes.length}.`,
  );

  assert(
    extraRoutes.every(({ parsed: parsedUrl }) => parsedUrl.pathname.startsWith(skillPrefix)),
    'Sitemap contains unsupported non-skill routes.',
  );

  return {
    locations,
    rootPath: rootUrl.pathname,
    normalizedRootPath: normalizedRoot,
    skillUrls: skillRoutes.map(({ raw }) => raw),
  };
}

export function assertSitemap(urlText, { minSkillUrls = 1 } = {}) {
  analyzeSitemap(urlText, { minSkillUrls });
}

export function assertIndexSocialMeta(htmlText) {
  assertMetaContent(htmlText, 'property', 'og:image');
  assertMetaContent(htmlText, 'name', 'twitter:image');
  assertMetaContent(htmlText, 'name', 'twitter:image:alt');
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

export function assertRobots(robotsText) {
  const lines = String(robotsText ?? '').split(/\r?\n/).map((line) => line.trim());
  const allowsRoot = lines.some((line) => line.startsWith('Allow: /'));
  const hasSitemap = lines.some((line) => /^Sitemap:\s*.+\/?sitemap\.xml$/i.test(line));

  assert(allowsRoot, 'robots.txt must allow root crawling.');
  assert(hasSitemap, 'robots.txt must expose sitemap location.');
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
  manifestPath,
  indexPath = 'dist/index.html',
  distDir = 'dist',
  minSkillUrls,
}) {
  const sitemapReport = analyzeSitemap(readFile(sitemapPath), { minSkillUrls });
  assertPrerenderedSkillRoutes(sitemapReport.skillUrls, distDir, sitemapReport.normalizedRootPath);
  assertIndexSocialMeta(readFile(indexPath));
  assertRobots(readFile(robotsPath));
  assertManifest(readFile(manifestPath));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  runVerification(cliArgs);
  console.log('SEO assets verification passed.');
}
