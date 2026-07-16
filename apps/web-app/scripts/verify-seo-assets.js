import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import sanitizeFilename from 'sanitize-filename';
import { getSeoLandingPaths } from './generate-sitemap.js';

const APP_ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT_DIR = path.resolve(APP_ROOT_DIR, '..', '..');
const REPOSITORY_URL = 'https://github.com/sickn33/agentic-awesome-skills';
const PACKAGE_URL = 'https://www.npmjs.com/package/agentic-awesome-skills';
const EXPECTED_HOSTED_CATALOG_ROOT = 'https://sickn33.github.io/agentic-awesome-skills/';

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

function assertPlainFileInsideRoot(filePath, rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedFile = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolvedFile);
  assert(
    relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative),
    `File must remain inside verification root: ${filePath}`,
  );
  const candidateAnchors = [REPO_ROOT_DIR, APP_ROOT_DIR, process.cwd(), os.tmpdir(), '/tmp']
    .map((candidate) => path.resolve(candidate))
    .filter((candidate, index, anchors) => anchors.indexOf(candidate) === index && fs.existsSync(candidate))
    .filter((candidate) => {
      const candidateRelative = path.relative(candidate, resolvedRoot);
      return !candidateRelative.startsWith(`..${path.sep}`) && candidateRelative !== '..' && !path.isAbsolute(candidateRelative);
    })
    .sort((left, right) => right.length - left.length);
  assert(candidateAnchors.length > 0, `Verification root is outside trusted filesystem anchors: ${resolvedRoot}`);
  const trustedAnchor = candidateAnchors[0];
  let current = trustedAnchor;
  const rootRelative = path.relative(trustedAnchor, resolvedRoot);
  for (const segment of rootRelative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    assert(!stat.isSymbolicLink(), `Verification path must not contain symlinks: ${current}`);
  }
  const rootStat = fs.lstatSync(resolvedRoot);
  assert(rootStat.isDirectory() && !rootStat.isSymbolicLink(), `Verification root must be a plain directory: ${resolvedRoot}`);
  current = resolvedRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    assert(!stat.isSymbolicLink(), `Verification path must not contain symlinks: ${current}`);
  }
  const fileStat = fs.lstatSync(resolvedFile);
  assert(fileStat.isFile() && !fileStat.isSymbolicLink(), `Verification input must be a plain file: ${resolvedFile}`);
  const physicalRoot = fs.realpathSync(resolvedRoot);
  const physicalFile = fs.realpathSync(resolvedFile);
  const physicalRelative = path.relative(physicalRoot, physicalFile);
  assert(
    physicalRelative && !physicalRelative.startsWith(`..${path.sep}`) && physicalRelative !== '..' && !path.isAbsolute(physicalRelative),
    `Verification input escaped its physical root: ${resolvedFile}`,
  );
  return resolvedFile;
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
    180,
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
  const document = new JSDOM(String(htmlText ?? '')).window.document;
  const match = [...document.querySelectorAll('meta')].find(
    (element) => element.getAttribute(selectorType) === selectorValue,
  );
  return match?.getAttribute('content')?.trim();
}

function extractCanonicalHrefs(htmlText) {
  const document = new JSDOM(String(htmlText ?? '')).window.document;
  return [...document.querySelectorAll('link')]
    .filter((element) => (element.getAttribute('rel') || '').split(/\s+/).some((token) => token.toLowerCase() === 'canonical'))
    .map((element) => element.getAttribute('href')?.trim());
}

function extractExactMetaContents(htmlText, selectorType, selectorValue) {
  const document = new JSDOM(String(htmlText ?? '')).window.document;
  return [...document.querySelectorAll('meta')]
    .filter((element) => element.getAttribute(selectorType) === selectorValue)
    .map((element) => element.getAttribute('content')?.trim());
}

function extractTitle(htmlText) {
  return new JSDOM(String(htmlText ?? '')).window.document.title.trim();
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
    assert(url.pathname.endsWith('/'), `Sitemap indexable route must end with a trailing slash: ${location}`);
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
  if (requireHostedUrl) {
    assert(rootCandidate.raw === EXPECTED_HOSTED_CATALOG_ROOT, `Hosted sitemap root must equal ${EXPECTED_HOSTED_CATALOG_ROOT}`);
  }
  const normalizedRoot = rootUrl.pathname === '/' ? '' : rootUrl.pathname.replace(/\/+$/, '');
  const rootPrefix = normalizedRoot ? `${normalizedRoot}/` : '/';
  for (const { raw, parsed: parsedUrl } of parsed) {
    assert(parsedUrl.origin === rootUrl.origin, `Sitemap URL must share the homepage origin ${rootUrl.origin}: ${raw}`);
    assert(
      parsedUrl.pathname === rootUrl.pathname || parsedUrl.pathname === normalizedRoot || parsedUrl.pathname.startsWith(rootPrefix),
      `Sitemap URL must remain inside the homepage root ${rootUrl.pathname}: ${raw}`,
    );
    assert(!parsedUrl.username && !parsedUrl.password && !parsedUrl.search && !parsedUrl.hash, `Sitemap URL must not contain credentials, query, or fragment: ${raw}`);
  }
  const skillPrefix = `${normalizedRoot}/skill/`;
  const rootPathVariants = new Set([
    rootUrl.pathname,
    rootUrl.pathname.endsWith('/') ? rootUrl.pathname.slice(0, -1) : `${rootUrl.pathname}/`,
  ]);

  const isRoot = ({ parsed: parsedUrl }) => rootPathVariants.has(parsedUrl.pathname);
  const extraRoutes = parsed.filter(({ parsed: parsedUrl }) => !isRoot({ parsed: parsedUrl }));
  const pluginPathVariants = new Set([
    `${normalizedRoot}/plugins`,
    `${normalizedRoot}/plugins/`,
  ]);
  const workbenchPathVariants = new Set([
    `${normalizedRoot}/workbench`,
    `${normalizedRoot}/workbench/`,
  ]);
  const allowedExtraPathVariants = new Set([...pluginPathVariants, ...workbenchPathVariants]);
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
    rootUrl: rootCandidate.raw,
    rootPath: rootUrl.pathname,
    normalizedRootPath: normalizedRoot,
    skillUrls: skillRoutes.map(({ raw }) => raw),
    topicUrls: topicRoutes.map(({ raw }) => raw),
    pluginUrls: extraRoutes
      .filter(({ parsed: parsedUrl }) => pluginPathVariants.has(parsedUrl.pathname))
      .map(({ raw }) => raw),
    workbenchUrls: extraRoutes
      .filter(({ parsed: parsedUrl }) => workbenchPathVariants.has(parsedUrl.pathname))
      .map(({ raw }) => raw),
  };
}

export function assertSitemap(urlText, { minSkillUrls = 1, requireHostedUrl = false } = {}) {
  analyzeSitemap(urlText, { minSkillUrls, requireHostedUrl });
}

function extractJsonLdEntries(htmlText) {
  const entries = [];
  const document = new JSDOM(String(htmlText ?? '')).window.document;
  const scripts = [...document.querySelectorAll('script')].filter(
    (element) => (element.getAttribute('type') || '').trim().toLowerCase() === 'application/ld+json',
  );

  for (const script of scripts) {
    const text = script.textContent?.trim();
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

function hasSchemaType(value, schemaType) {
  const declaredTypes = Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']];
  return declaredTypes.some((declaredType) =>
    declaredType === schemaType ||
    declaredType === `schema:${schemaType}` ||
    declaredType === `https://schema.org/${schemaType}` ||
    declaredType === `http://schema.org/${schemaType}`,
  );
}

function collectSchemaNodes(value, schemaType, output = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSchemaNodes(entry, schemaType, output));
    return output;
  }
  if (!value || typeof value !== 'object') {
    return output;
  }
  if (hasSchemaType(value, schemaType)) {
    output.push(value);
  }
  Object.values(value).forEach((entry) => collectSchemaNodes(entry, schemaType, output));
  return output;
}

function assertJsonLdTypes(htmlText, requiredTypes) {
  const entries = extractJsonLdEntries(htmlText);

  for (const requiredType of requiredTypes) {
    assert(entries.some((entry) => hasSchemaType(entry, requiredType)), `JSON-LD missing required @type: ${requiredType}`);
  }
}

function assertRepositoryJsonLdSignals(htmlText) {
  const entries = extractJsonLdEntries(htmlText);
  const sourceCode = entries.find((entry) => hasSchemaType(entry, 'SoftwareSourceCode'));
  const organization = entries.find((entry) => hasSchemaType(entry, 'Organization'));
  const collectionPage = entries.find((entry) => hasSchemaType(entry, 'CollectionPage'));

  assert(sourceCode?.url === REPOSITORY_URL, 'SoftwareSourceCode JSON-LD must use the GitHub repository as its URL.');
  assert(sourceCode?.codeRepository === REPOSITORY_URL, 'SoftwareSourceCode JSON-LD must expose the GitHub repository.');
  assert(
    typeof sourceCode?.mainEntityOfPage === 'string' && sourceCode.mainEntityOfPage.length > 0,
    'SoftwareSourceCode JSON-LD must link back to the hosted catalog page with mainEntityOfPage.',
  );
  assert(organization?.url === REPOSITORY_URL, 'Organization JSON-LD must use the GitHub repository as its URL.');
  assert(collectionPage?.sameAs === REPOSITORY_URL, 'CollectionPage JSON-LD must link the hosted catalog to the GitHub repository.');
}

function buildIdentityContext(rootUrl, normalizedRootPath) {
  const root = new URL(rootUrl);
  const rootPath = normalizedRootPath ? `${normalizedRootPath.replace(/\/+$/, '')}/` : '/';
  const catalogRootUrl = new URL(rootPath, root.origin).href;
  const catalogBaseUrl = catalogRootUrl.replace(/\/$/, '');
  return {
    catalogBaseUrl,
    catalogRootUrl,
    origin: root.origin,
    socialImageUrl: `${catalogBaseUrl}/social-card.png`,
  };
}

function assertCurrentIdentityUrl(value, fieldName, identityContext) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_err) {
    throw new Error(`JSON-LD ${fieldName} must contain a valid URL: ${value}`);
  }

  if (parsed.hostname === 'github.com' && parsed.pathname.startsWith('/sickn33/')) {
    assert(
      value === REPOSITORY_URL || value.startsWith(`${REPOSITORY_URL}/`) || value.startsWith(`${REPOSITORY_URL}#`),
      `JSON-LD ${fieldName} must not use a legacy first-party GitHub repository: ${value}`,
    );
  }

  if (parsed.hostname.endsWith('.github.io')) {
    const catalogPath = new URL(identityContext.catalogRootUrl).pathname.replace(/\/$/, '');
    assert(
      parsed.origin === identityContext.origin &&
        (parsed.pathname === catalogPath || parsed.pathname.startsWith(`${catalogPath}/`)),
      `JSON-LD ${fieldName} must not use a legacy first-party Pages catalog URL: ${value}`,
    );
  }

  if (parsed.hostname === 'npmjs.com' || parsed.hostname === 'www.npmjs.com') {
    assert(
      value === PACKAGE_URL,
      `JSON-LD ${fieldName} must not use a legacy first-party package URL: ${value}`,
    );
  }
}

function assertJsonLdIdentityUrls(htmlText, identityContext, routeUrl) {
  const entries = extractJsonLdEntries(htmlText);
  const identityFields = new Set(['@id', 'codeRepository', 'item', 'mainEntityOfPage', 'sameAs', 'target', 'url']);

  function inspect(value, fieldName = '') {
    if (Array.isArray(value)) {
      value.forEach((entry) => inspect(entry, fieldName));
      return;
    }
    if (!value || typeof value !== 'object') {
      if (identityFields.has(fieldName)) {
        assertCurrentIdentityUrl(value, fieldName, identityContext);
      }
      return;
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      inspect(nestedValue, key);
    }
  }

  entries.forEach((entry) => inspect(entry));

  const routePath = new URL(routeUrl).pathname;
  const rootPath = new URL(identityContext.catalogRootUrl).pathname;
  const relativeRoutePath = routePath.slice(rootPath.length).replace(/^\/+/, '');
  const requiresRichProjectIdentity = routePath === rootPath || relativeRoutePath.startsWith('topics/') || relativeRoutePath === 'workbench/';
  const requiresProjectOrganization = requiresRichProjectIdentity || relativeRoutePath === 'plugins/';
  const organizations = entries.filter((entry) => hasSchemaType(entry, 'Organization'));
  if (requiresProjectOrganization) {
    assert(organizations.length === 1, `${routeUrl} must expose exactly one project Organization.`);
  }
  const organizationNodes = collectSchemaNodes(entries, 'Organization');
  const allowedOrganizationIdentities = new Set([
    'https://x.com/AASkills_',
    PACKAGE_URL,
    identityContext.catalogRootUrl,
  ]);
  for (const organization of organizationNodes) {
    if (organization.url === undefined && organization['@id'] === undefined) {
      continue;
    }
    assert(organization.url === REPOSITORY_URL, 'Project Organization JSON-LD must use the current repository URL.');
    assert(organization['@id'] === `${REPOSITORY_URL}#organization`, 'Project Organization JSON-LD must use the current repository @id.');
    if (organization.sameAs !== undefined) {
      const sameAs = Array.isArray(organization.sameAs) ? organization.sameAs : [organization.sameAs];
      assert(
        new Set(sameAs).size === sameAs.length && sameAs.every((value) => allowedOrganizationIdentities.has(value)),
        'Project Organization JSON-LD sameAs may contain only exact current project identities.',
      );
    }
    if (requiresRichProjectIdentity && organizations.includes(organization)) {
      const sameAs = Array.isArray(organization.sameAs) ? organization.sameAs : [organization.sameAs].filter(Boolean);
      assert(
        sameAs.length === allowedOrganizationIdentities.size &&
          [...allowedOrganizationIdentities].every((value) => sameAs.includes(value)),
        'Project Organization JSON-LD must expose exactly the current social, npm package, and catalog identities.',
      );
    }
  }

  const sourceCodeEntries = entries.filter((entry) => hasSchemaType(entry, 'SoftwareSourceCode'));
  if (requiresRichProjectIdentity) {
    assert(sourceCodeEntries.length === 1, `${routeUrl} must expose exactly one project SoftwareSourceCode entity.`);
  }
  const expectedSourceIdentities = [...new Set([routeUrl, identityContext.catalogRootUrl, PACKAGE_URL])];
  for (const sourceCode of collectSchemaNodes(entries, 'SoftwareSourceCode')) {
    assert(sourceCode.url === REPOSITORY_URL, 'SoftwareSourceCode JSON-LD must use the current repository URL.');
    assert(sourceCode.codeRepository === REPOSITORY_URL, 'SoftwareSourceCode JSON-LD must use the current codeRepository URL.');
    if (sourceCode['@id'] !== undefined) {
      assert(
        sourceCode['@id'] === REPOSITORY_URL || sourceCode['@id'].startsWith(`${REPOSITORY_URL}#`),
        'SoftwareSourceCode JSON-LD @id must remain on the exact current repository identity.',
      );
    }
    assert(sourceCode.mainEntityOfPage === routeUrl, 'SoftwareSourceCode JSON-LD must bind mainEntityOfPage to the exact sitemap route.');
    const sameAs = Array.isArray(sourceCode.sameAs) ? sourceCode.sameAs : [];
    assert(
      sameAs.length === expectedSourceIdentities.length &&
        new Set(sameAs).size === sameAs.length &&
        expectedSourceIdentities.every((value) => sameAs.includes(value)),
      'SoftwareSourceCode JSON-LD sameAs must contain exactly the current route, catalog root, and npm package identities.',
    );
  }

  const topLevelWebSites = entries.filter((entry) => hasSchemaType(entry, 'WebSite'));
  if (requiresRichProjectIdentity) {
    assert(topLevelWebSites.length === 1, `${routeUrl} must expose exactly one top-level project WebSite entity.`);
  }
  for (const webSite of collectSchemaNodes(entries, 'WebSite')) {
    assert(webSite.url === identityContext.catalogBaseUrl, 'WebSite JSON-LD must use the exact current catalog base URL.');
    if (webSite['@id'] !== undefined) {
      assert(
        webSite['@id'] === identityContext.catalogBaseUrl || webSite['@id'].startsWith(`${identityContext.catalogBaseUrl}#`),
        'WebSite JSON-LD @id must remain on the exact current catalog identity.',
      );
    }
    if (webSite.sameAs !== undefined) {
      assert(webSite.sameAs === REPOSITORY_URL, 'WebSite JSON-LD sameAs must use the exact current repository URL.');
    }
    if (webSite.potentialAction !== undefined) {
      assert(webSite.potentialAction?.['@type'] === 'SearchAction', 'WebSite JSON-LD potentialAction must be a SearchAction.');
      assert(
        webSite.potentialAction?.target === `${identityContext.catalogBaseUrl}/?q={search_term_string}`,
        'WebSite JSON-LD SearchAction target must remain under the exact current catalog root.',
      );
    }
  }
  if (requiresRichProjectIdentity) {
    assert(topLevelWebSites[0].sameAs === REPOSITORY_URL, 'Top-level WebSite JSON-LD must use the exact current repository identity.');
    assert(
      topLevelWebSites[0].potentialAction?.target === `${identityContext.catalogBaseUrl}/?q={search_term_string}`,
      'Top-level WebSite JSON-LD must expose the exact current catalog SearchAction.',
    );
  }
}

function assertPrimaryRouteJsonLdIdentity(htmlText, routeUrl) {
  const entries = extractJsonLdEntries(htmlText);
  const applications = entries.filter((entry) => hasSchemaType(entry, 'SoftwareApplication'));
  const pageEntities = entries.filter((entry) =>
    entry && (hasSchemaType(entry, 'CollectionPage') || hasSchemaType(entry, 'WebPage')) && entry.url !== undefined,
  );
  assert(applications.length || pageEntities.length, `${routeUrl} must expose a primary route JSON-LD entity.`);
  if (applications.length) {
    assert(applications.length === 1, `${routeUrl} must expose exactly one SoftwareApplication route entity.`);
    assert(applications[0]['@id'] === routeUrl, `${routeUrl} SoftwareApplication @id must equal the sitemap route.`);
  }
  for (const primary of [...applications, ...pageEntities]) {
    assert(primary.url === routeUrl, `${routeUrl} primary JSON-LD url must equal the sitemap route.`);
    if (primary.mainEntityOfPage !== undefined) {
      const mainEntityUrl = typeof primary.mainEntityOfPage === 'string'
        ? primary.mainEntityOfPage
        : primary.mainEntityOfPage?.['@id'];
      assert(mainEntityUrl === routeUrl, `${routeUrl} primary JSON-LD mainEntityOfPage must equal the sitemap route.`);
    }
  }
}

function assertExactMetaContent(htmlText, selectorType, selectorValue, expectedValue, routeUrl) {
  const values = extractExactMetaContents(htmlText, selectorType, selectorValue);
  assert(
    values.length === 1,
    `${routeUrl} must expose exactly one ${selectorType}="${selectorValue}" tag; got ${values.length}.`,
  );
  const actualValue = values[0];
  assert(
    actualValue === expectedValue,
    `${routeUrl} must set ${selectorType}="${selectorValue}" to exactly ${expectedValue}; got ${actualValue || 'missing'}.`,
  );
}

export function assertPrerenderedRouteIdentities(routeUrls, distDir = 'dist', normalizedRootPath = '', rootUrl = '') {
  assert(routeUrls.length > 0, 'Cannot verify route identities without sitemap URLs.');
  assert(typeof rootUrl === 'string' && rootUrl, 'Route identity verification requires the explicit sitemap root URL.');
  const identityContext = buildIdentityContext(rootUrl, normalizedRootPath);
  const expectedRootPath = new URL(identityContext.catalogRootUrl).pathname;

  for (const routeUrl of routeUrls) {
    const parsed = new URL(routeUrl);
    assert(parsed.pathname.endsWith('/'), `Indexable route must end with a trailing slash: ${routeUrl}`);
    assert(
      parsed.origin === identityContext.origin &&
        (parsed.pathname === expectedRootPath || parsed.pathname.startsWith(expectedRootPath)),
      `Sitemap route must remain within the explicit current catalog root: ${routeUrl}`,
    );
    const filePath = safeUserPath(routePathToDistFile(parsed.pathname, normalizedRootPath), distDir);
    assert(fs.existsSync(filePath), `Missing prerendered page for sitemap route: ${parsed.pathname}. Expected ${filePath}.`);
    const html = readFile(filePath, distDir);
    const canonicalHrefs = extractCanonicalHrefs(html);
    assert(canonicalHrefs.length === 1, `${routeUrl} must expose exactly one rel="canonical" link; got ${canonicalHrefs.length}.`);
    const canonical = canonicalHrefs[0];
    assert(
      canonical === routeUrl,
      `${routeUrl} must set rel="canonical" to exactly ${routeUrl}; got ${canonical || 'missing'}.`,
    );
    assertExactMetaContent(html, 'property', 'og:url', routeUrl, routeUrl);
    assertExactMetaContent(html, 'property', 'og:image', identityContext.socialImageUrl, routeUrl);
    assertExactMetaContent(html, 'name', 'twitter:image', identityContext.socialImageUrl, routeUrl);
    assertPrimaryRouteJsonLdIdentity(html, routeUrl);
    assertJsonLdIdentityUrls(html, identityContext, routeUrl);
  }
}

export function assertIndexSocialMeta(htmlText) {
  assertMetaContent(htmlText, 'property', 'og:image');
  assertMetaContent(htmlText, 'name', 'twitter:image');
  assertMetaContent(htmlText, 'name', 'twitter:image:alt');
}

export function assertWebmasterVerificationMeta(htmlText) {
  const bingVerificationToken = extractMetaContent(htmlText, 'name', 'msvalidate.01');
  assert(
    bingVerificationToken === 'CAC904EB0D2DD1B22B5F2BC540CAD654',
    'Index HTML must expose the current Bing Webmaster Tools verification token.',
  );
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
  const trimmedRoute = normalizedRoot && normalizedPath === normalizedRoot
    ? '/'
    : normalizedRoot && normalizedPath.startsWith(`${normalizedRoot}/`)
      ? normalizedPath.slice(normalizedRoot.length) || '/'
      : normalizedPath;
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

export function assertPrerenderedWorkbenchRoutes(workbenchUrls, distDir = 'dist', normalizedRootPath = '') {
  for (const workbenchUrl of workbenchUrls) {
    const parsed = new URL(workbenchUrl);
    const filePath = safeUserPath(routePathToDistFile(parsed.pathname, normalizedRootPath), distDir);
    assert(
      fs.existsSync(filePath),
      `Missing prerendered page for workbench route: ${parsed.pathname}. Expected ${filePath}.`,
    );
    const html = readFile(filePath, distDir);
    assert(extractTitle(html).includes('Skill Workbench'), 'Workbench prerender must expose its exact product title.');
    assert(extractMetaContent(html, 'name', 'description')?.includes('exact host-aware set'), 'Workbench prerender must describe exact composition.');
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

export function assertRobots(robotsText, { expectedSitemapUrl = '' } = {}) {
  const lines = String(robotsText ?? '').split(/\r?\n/).map((line) => line.trim());
  const allowsRoot = lines.some((line) => line.startsWith('Allow: /'));
  const sitemapUrls = lines
    .map((line) => line.match(/^Sitemap:\s*(\S+)\s*$/i)?.[1])
    .filter(Boolean);
  const allowsAiSearchCrawlers = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'].every((crawler) =>
    lines.some((line) => line === `User-agent: ${crawler}`),
  );

  assert(allowsRoot, 'robots.txt must allow root crawling.');
  assert(sitemapUrls.length > 0, 'robots.txt must expose sitemap location.');
  if (expectedSitemapUrl) {
    assert(sitemapUrls.length === 1, 'robots.txt must expose exactly one sitemap location.');
    assert(
      sitemapUrls[0] === expectedSitemapUrl,
      `robots.txt must point to the current sitemap exactly: ${expectedSitemapUrl}; got ${sitemapUrls[0]}.`,
    );
  }
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
    'https://sickn33.github.io/agentic-awesome-skills/workbench',
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
  const safePath = safeUserPath(filePath, baseDir);
  return fs.readFileSync(assertPlainFileInsideRoot(safePath, baseDir), 'utf-8');
}

function readBinaryFile(filePath, baseDir = process.cwd()) {
  const safePath = safeUserPath(filePath, baseDir);
  return fs.readFileSync(assertPlainFileInsideRoot(safePath, baseDir));
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
  assertPrerenderedWorkbenchRoutes(sitemapReport.workbenchUrls, distDir, sitemapReport.normalizedRootPath);
  assertPrerenderedTopicRoutes(sitemapReport.topicUrls, distDir, sitemapReport.normalizedRootPath);
  assertPrerenderedRouteIdentities(
    sitemapReport.locations,
    distDir,
    sitemapReport.normalizedRootPath,
    sitemapReport.rootUrl,
  );
  assertIndexSocialMeta(indexHtml);
  assertIndexDiscoveryMeta(indexHtml, { expectedSkillCountLabel, requireHostedUrl });
  assertWebmasterVerificationMeta(indexHtml);
  const sourceIndexHtml = readFile(sourceIndexPath);
  assertStaticIndexShell(sourceIndexHtml, { expectedSkillCountLabel, requireHostedUrl });
  assertWebmasterVerificationMeta(sourceIndexHtml);
  assertSocialCard(readBinaryFile(socialImagePath), { expectedSkillCountLabel });
  assertRobots(readFile(robotsPath), {
    expectedSitemapUrl: new URL('sitemap.xml', sitemapReport.rootUrl).href,
  });
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
