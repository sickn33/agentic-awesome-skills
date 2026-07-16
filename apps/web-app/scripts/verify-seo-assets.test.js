import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertManifest,
  assertIndexDiscoveryMeta,
  assertStaticIndexShell,
  assertPluginsDiscoveryMeta,
  analyzeSitemap,
  assertPrerenderedPluginRoutes,
  assertPrerenderedRouteIdentities,
  assertPrerenderedSkillRoutes,
  assertPrerenderedTopicRoutes,
  assertPrerenderedWorkbenchRoutes,
  assertIndexSocialMeta,
  assertLlms,
  assertRobots,
  assertSitemap,
  assertSocialCard,
  extractSitemapLocations,
} from './verify-seo-assets.js';

const FIXTURE_ROOT_URL = 'https://owner.github.io/repo/';
const FIXTURE_SOCIAL_IMAGE_URL = 'https://owner.github.io/repo/social-card.png';
const PACKAGE_URL = 'https://www.npmjs.com/package/agentic-awesome-skills';

function buildRouteIdentityHtml({
  routeUrl,
  canonicalUrl = routeUrl,
  ogUrl = routeUrl,
  socialImageUrl = FIXTURE_SOCIAL_IMAGE_URL,
  jsonLd = [],
} = {}) {
  return `<html><head>
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head></html>`;
}

function writeRouteIdentityFixture(distDir, routeUrl, html) {
  const routePath = new URL(routeUrl).pathname.replace(/^\/repo\/?/, '');
  const filePath = path.join(distDir, routePath || '.', 'index.html');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html);
}

function currentIdentityJsonLd(routeUrl) {
  const entries = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: routeUrl,
      mainEntityOfPage: routeUrl,
    },
  ];
  const relativeRoute = new URL(routeUrl).pathname.replace(new URL(FIXTURE_ROOT_URL).pathname, '');
  if (routeUrl === FIXTURE_ROOT_URL || relativeRoute.startsWith('topics/')) {
    const sourceCode = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      url: 'https://github.com/sickn33/agentic-awesome-skills',
      codeRepository: 'https://github.com/sickn33/agentic-awesome-skills',
      mainEntityOfPage: routeUrl,
      sameAs: [...new Set([routeUrl, FIXTURE_ROOT_URL, 'https://www.npmjs.com/package/agentic-awesome-skills'])],
    };
    entries.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://github.com/sickn33/agentic-awesome-skills#organization',
      name: 'Agentic Awesome Skills',
      url: 'https://github.com/sickn33/agentic-awesome-skills',
      sameAs: [
        'https://x.com/AASkills_',
        'https://www.npmjs.com/package/agentic-awesome-skills',
        FIXTURE_ROOT_URL,
      ],
    }, {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: FIXTURE_ROOT_URL.replace(/\/$/, ''),
      sameAs: 'https://github.com/sickn33/agentic-awesome-skills',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${FIXTURE_ROOT_URL.replace(/\/$/, '')}/?q={search_term_string}`,
      },
    }, sourceCode);
  } else if (relativeRoute === 'plugins/') {
    entries.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://github.com/sickn33/agentic-awesome-skills#organization',
      name: 'Agentic Awesome Skills',
      url: 'https://github.com/sickn33/agentic-awesome-skills',
    });
  }
  return entries;
}

describe('seo assets verification helpers', () => {
  it('extracts sitemap location values in declaration order', () => {
    const xml = `
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/skill/agent-a</loc></url>
      </urlset>
    `;

    const locs = extractSitemapLocations(xml);

    expect(locs).toEqual([
      'https://example.com/',
      'https://example.com/skill/agent-a',
    ]);
  });

  it('validates a canonical sitemap with base path and enough top skills', () => {
    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/plugins/</loc></url>
        <url><loc>https://owner.github.io/repo/topics/antigravity-cli-skills/</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-a/</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-b/</loc></url>
      </urlset>
    `;

    expect(() => assertSitemap(xml, { minSkillUrls: 2 })).not.toThrow();
  });

  it('rejects sitemap routes that switch away from the homepage origin', () => {
    const xml = `
      <urlset>
        <url><loc>${FIXTURE_ROOT_URL}</loc></url>
        <url><loc>https://evil.example/repo/skill/agent-a/</loc></url>
      </urlset>
    `;

    expect(() => analyzeSitemap(xml)).toThrow('share the homepage origin');
  });

  it('uses the explicit sitemap root when the homepage is not the first route', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routes = [`${FIXTURE_ROOT_URL}skill/agent-a/`, FIXTURE_ROOT_URL];
    const report = analyzeSitemap(`<urlset>${routes.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
    for (const routeUrl of routes) {
      writeRouteIdentityFixture(
        distDir,
        routeUrl,
        buildRouteIdentityHtml({ routeUrl, jsonLd: currentIdentityJsonLd(routeUrl) }),
      );
    }

    expect(report.rootUrl).toBe(FIXTURE_ROOT_URL);
    expect(() => assertPrerenderedRouteIdentities(routes, distDir, '/repo', report.rootUrl)).not.toThrow();
  });

  it('throws when sitemap has duplicated URLs', () => {
    const xml = `
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/</loc></url>
      </urlset>
    `;

    expect(() => assertSitemap(xml)).toThrow('duplicated');
  });

  it('throws when hosted sitemap verification sees localhost URLs', () => {
    const xml = `
      <urlset>
        <url><loc>http://localhost/repo/</loc></url>
        <url><loc>http://localhost/repo/skill/agent-a</loc></url>
      </urlset>
    `;

    expect(() => assertSitemap(xml, { requireHostedUrl: true })).toThrow('localhost');
  });

  it('rejects a self-consistent legacy hosted catalog root', () => {
    const legacyRoot = 'https://sickn33.github.io/legacy-catalog/';
    const xml = `<urlset>
      <url><loc>${legacyRoot}</loc></url>
      <url><loc>${legacyRoot}skill/agent-a/</loc></url>
    </urlset>`;

    expect(() => assertSitemap(xml, { requireHostedUrl: true })).toThrow('Hosted sitemap root');
  });

  it('rejects slashless sitemap routes', () => {
    const xml = `<urlset>
      <url><loc>${FIXTURE_ROOT_URL}</loc></url>
      <url><loc>${FIXTURE_ROOT_URL}skill/agent-a</loc></url>
    </urlset>`;

    expect(() => assertSitemap(xml)).toThrow('trailing slash');
  });

  it('requires robots directives', () => {
    const robots = `
      User-agent: *
      Allow: /
      User-agent: GPTBot
      Allow: /
      User-agent: OAI-SearchBot
      Allow: /
      User-agent: ClaudeBot
      Allow: /
      User-agent: PerplexityBot
      Allow: /
      Sitemap: https://example.com/sitemap.xml
    `;

    expect(() => assertRobots(robots)).not.toThrow();
  });

  it('requires robots.txt to point exactly to the current sitemap', () => {
    const robots = `
      User-agent: *
      Allow: /
      User-agent: GPTBot
      User-agent: OAI-SearchBot
      User-agent: ClaudeBot
      User-agent: PerplexityBot
      Sitemap: https://owner.github.io/legacy-repo/sitemap.xml
    `;

    expect(() => assertRobots(robots, { expectedSitemapUrl: `${FIXTURE_ROOT_URL}sitemap.xml` })).toThrow(
      'current sitemap exactly',
    );
  });

  it('requires exact canonical and og:url values for every sitemap route', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        canonicalUrl: `${FIXTURE_ROOT_URL}skill/legacy-agent-a/`,
        jsonLd: currentIdentityJsonLd(routeUrl),
      }),
    );
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('rel="canonical"');

    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        ogUrl: `${FIXTURE_ROOT_URL}skill/legacy-agent-a/`,
        jsonLd: currentIdentityJsonLd(routeUrl),
      }),
    );
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('og:url');
  });

  it('requires exact current social-card URLs for og and Twitter images', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        socialImageUrl: `${FIXTURE_ROOT_URL}social-card-legacy.png`,
        jsonLd: currentIdentityJsonLd(routeUrl),
      }),
    );

    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('og:image');
  });

  it('rejects legacy repository and catalog URLs only in JSON-LD identity fields', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        jsonLd: [
          ...currentIdentityJsonLd(routeUrl),
          { '@type': 'Thing', url: 'https://github.com/sickn33/legacy-awesome-skills' },
        ],
      }),
    );
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('legacy first-party GitHub');

    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        jsonLd: [
          ...currentIdentityJsonLd(routeUrl),
          { '@type': 'Thing', url: 'https://owner.github.io/legacy-repo/' },
        ],
      }),
    );
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('legacy first-party Pages');
  });

  it('requires the primary route JSON-LD identity to equal the sitemap route', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    const wrongRoute = `${FIXTURE_ROOT_URL}skill/wrong/`;
    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({
        routeUrl,
        jsonLd: [{
          '@type': 'SoftwareApplication',
          '@id': wrongRoute,
          url: wrongRoute,
          mainEntityOfPage: wrongRoute,
        }],
      }),
    );

    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'SoftwareApplication @id',
    );
  });

  it('rejects duplicate SoftwareApplication route identities', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    const application = {
      '@type': 'SoftwareApplication',
      '@id': routeUrl,
      url: routeUrl,
      mainEntityOfPage: routeUrl,
    };
    writeRouteIdentityFixture(
      distDir,
      routeUrl,
      buildRouteIdentityHtml({ routeUrl, jsonLd: [application, { ...application }] }),
    );

    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'exactly one SoftwareApplication',
    );
  });

  it('rejects a wrong-owner repository and a missing npm identity', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = FIXTURE_ROOT_URL;
    const wrongRepository = currentIdentityJsonLd(routeUrl).map((entry) =>
      entry['@type'] === 'SoftwareSourceCode'
        ? { ...entry, url: 'https://github.com/other-owner/agentic-awesome-skills', codeRepository: 'https://github.com/other-owner/agentic-awesome-skills' }
        : entry,
    );
    writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd: wrongRepository }));
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'current repository URL',
    );

    const missingPackage = currentIdentityJsonLd(routeUrl).map((entry) => {
      if (!['Organization', 'SoftwareSourceCode'].includes(entry['@type'])) return entry;
      return { ...entry, sameAs: (entry.sameAs || []).filter((value) => value !== PACKAGE_URL) };
    });
    writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd: missingPackage }));
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'exactly the current social, npm package, and catalog identities',
    );
  });

  it('rejects drifted WebSite and nested SoftwareSourceCode identities', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}topics/antigravity-cli-skills/`;
    const wrongWebSite = currentIdentityJsonLd(routeUrl).map((entry) =>
      entry['@type'] === 'WebSite'
        ? { ...entry, url: `${FIXTURE_ROOT_URL}topics/wrong/`, sameAs: 'https://github.com/other-owner/legacy-agentic-awesome-skills' }
        : entry,
    );
    writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd: wrongWebSite }));
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'WebSite JSON-LD must use the exact current catalog base URL',
    );

    const nestedWrongSource = {
      '@type': 'SoftwareSourceCode',
      url: 'https://github.com/other-owner/legacy-agentic-awesome-skills',
      codeRepository: 'https://github.com/other-owner/legacy-agentic-awesome-skills',
      mainEntityOfPage: `${FIXTURE_ROOT_URL}topics/wrong/`,
      sameAs: [FIXTURE_ROOT_URL, 'https://www.npmjs.com/package/agentic-awesome-skills'],
    };
    const wrongNestedIdentity = currentIdentityJsonLd(routeUrl).map((entry) =>
      entry['@type'] === 'WebPage' ? { ...entry, about: nestedWrongSource } : entry,
    );
    writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd: wrongNestedIdentity }));
    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
      'current repository URL',
    );
  });

  it('rejects extra or nested wrong-owner schema identity fields', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}topics/antigravity-cli-skills/`;
    const otherRepository = 'https://github.com/other-owner/legacy-agentic-awesome-skills';
    const cases = [
      currentIdentityJsonLd(routeUrl).map((entry) => entry['@type'] === 'Organization'
        ? { ...entry, sameAs: [...entry.sameAs, otherRepository] }
        : entry),
      currentIdentityJsonLd(routeUrl).map((entry) => entry['@type'] === 'WebPage'
        ? {
          ...entry,
          author: {
            '@type': 'Organization',
            '@id': 'https://github.com/sickn33/agentic-awesome-skills#organization',
            url: 'https://github.com/sickn33/agentic-awesome-skills',
            sameAs: [otherRepository],
          },
        }
        : entry),
      currentIdentityJsonLd(routeUrl).map((entry) => entry['@type'] === 'SoftwareSourceCode'
        ? { ...entry, '@id': `${otherRepository}#source` }
        : entry),
      currentIdentityJsonLd(routeUrl).map((entry) => entry['@type'] === 'WebSite'
        ? { ...entry, '@id': `${otherRepository}#website` }
        : entry),
    ];
    const expectedMessages = [
      'sameAs may contain only exact current project identities',
      'sameAs may contain only exact current project identities',
      'SoftwareSourceCode JSON-LD @id',
      'WebSite JSON-LD @id',
    ];
    cases.forEach((jsonLd, index) => {
      writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd }));
      expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
        expectedMessages[index],
      );
    });
  });

  it('rejects wrong-owner project nodes declared with expanded Schema.org type IRIs', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}topics/antigravity-cli-skills/`;
    const otherRepository = 'https://github.com/other-owner/legacy-agentic-awesome-skills';
    const expandedNodes = [
      {
        '@type': 'https://schema.org/Organization',
        '@id': `${otherRepository}#organization`,
        url: otherRepository,
        sameAs: [otherRepository],
      },
      {
        '@type': 'http://schema.org/SoftwareSourceCode',
        '@id': `${otherRepository}#source`,
        url: otherRepository,
        codeRepository: otherRepository,
        mainEntityOfPage: `${FIXTURE_ROOT_URL}topics/wrong/`,
        sameAs: [otherRepository],
      },
      {
        '@type': 'schema:WebSite',
        '@id': `${otherRepository}#website`,
        url: `${FIXTURE_ROOT_URL}topics/wrong/`,
        sameAs: otherRepository,
      },
    ];
    const expectedMessages = [
      'current repository URL',
      'current repository URL',
      'exact current catalog base URL',
    ];
    expandedNodes.forEach((about, index) => {
      const jsonLd = currentIdentityJsonLd(routeUrl).map((entry) =>
        entry['@type'] === 'WebPage' ? { ...entry, about } : entry,
      );
      writeRouteIdentityFixture(distDir, routeUrl, buildRouteIdentityHtml({ routeUrl, jsonLd }));
      expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
        expectedMessages[index],
      );
    });
  });

  it('rejects prerendered route files reached through a symlink', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const externalRouteDir = path.join(tmpDir, 'external-route');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    fs.mkdirSync(path.join(distDir, 'skill'), { recursive: true });
    fs.mkdirSync(externalRouteDir, { recursive: true });
    fs.writeFileSync(
      path.join(externalRouteDir, 'index.html'),
      buildRouteIdentityHtml({ routeUrl, jsonLd: currentIdentityJsonLd(routeUrl) }),
    );
    try {
      fs.symlinkSync(externalRouteDir, path.join(distDir, 'skill', 'agent-a'), 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) return;
      throw error;
    }

    expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow('symlinks');
  });

  it('rejects a verification root beneath a symlinked ancestor', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const physicalParent = path.join(tmpDir, 'physical');
    const logicalParent = path.join(tmpDir, 'logical');
    const physicalDist = path.join(physicalParent, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    writeRouteIdentityFixture(
      physicalDist,
      routeUrl,
      buildRouteIdentityHtml({ routeUrl, jsonLd: currentIdentityJsonLd(routeUrl) }),
    );
    try {
      fs.symlinkSync(physicalParent, logicalParent, 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) return;
      throw error;
    }

    expect(() => assertPrerenderedRouteIdentities(
      [routeUrl],
      path.join(logicalParent, 'dist'),
      '/repo',
      FIXTURE_ROOT_URL,
    )).toThrow('symlinks');
  });

  it('rejects duplicate canonical and route identity meta tags', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    const baseHtml = buildRouteIdentityHtml({ routeUrl, jsonLd: currentIdentityJsonLd(routeUrl) });
    const cases = [
      ['<link rel="canonical" href="https://legacy.example/">', 'exactly one rel="canonical"'],
      ['<meta property="og:url" content="https://legacy.example/">', 'exactly one property="og:url"'],
      ['<meta property="og:image" content="https://legacy.example/social.png">', 'exactly one property="og:image"'],
      ['<meta name="twitter:image" content="https://legacy.example/social.png">', 'exactly one name="twitter:image"'],
    ];
    for (const [duplicateTag, expectedMessage] of cases) {
      writeRouteIdentityFixture(distDir, routeUrl, baseHtml.replace('</head>', `${duplicateTag}</head>`));
      expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(expectedMessage);
    }
  });

  it('rejects duplicate identity tags with browser-valid alternate attribute syntax', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    const baseHtml = buildRouteIdentityHtml({ routeUrl, jsonLd: currentIdentityJsonLd(routeUrl) });
    const cases = [
      ['<link rel=canonical href=https://legacy.example/>', 'exactly one rel="canonical"'],
      ['<link rel="Canonical" href="https://legacy.example/">', 'exactly one rel="canonical"'],
      ['<meta property=og:url content=https://legacy.example/>', 'exactly one property="og:url"'],
      ['<meta name = "twitter:image" content = "https://legacy.example/social.png">', 'exactly one name="twitter:image"'],
    ];
    for (const [duplicateTag, expectedMessage] of cases) {
      writeRouteIdentityFixture(distDir, routeUrl, baseHtml.replace('</head>', `${duplicateTag}</head>`));
      expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(expectedMessage);
    }
  });

  it('detects duplicate primary JSON-LD with unquoted or spaced type attributes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeUrl = `${FIXTURE_ROOT_URL}skill/agent-a/`;
    const application = {
      '@type': 'SoftwareApplication',
      '@id': routeUrl,
      url: routeUrl,
      mainEntityOfPage: routeUrl,
    };
    const alternateScripts = [
      `<script type=application/ld+json>${JSON.stringify(application)}</script>`,
      `<script type = "application/ld+json">${JSON.stringify(application)}</script>`,
    ];
    for (const alternateScript of alternateScripts) {
      const baseHtml = buildRouteIdentityHtml({ routeUrl, jsonLd: [application] });
      writeRouteIdentityFixture(distDir, routeUrl, baseHtml.replace('</head>', `${alternateScript}</head>`));
      expect(() => assertPrerenderedRouteIdentities([routeUrl], distDir, '/repo', FIXTURE_ROOT_URL)).toThrow(
        'exactly one SoftwareApplication',
      );
    }
  });

  it('accepts exact current identities for all generated sitemap routes without policing provenance text', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routes = [FIXTURE_ROOT_URL, `${FIXTURE_ROOT_URL}skill/agent-a/`];
    for (const routeUrl of routes) {
      writeRouteIdentityFixture(
        distDir,
        routeUrl,
        buildRouteIdentityHtml({
          routeUrl,
          jsonLd: [
            ...currentIdentityJsonLd(routeUrl),
            {
              '@type': 'WebPage',
              description: 'Compatibility note: migrated from https://owner.github.io/legacy-repo/.',
            },
          ],
        }),
      );
    }

    expect(() => assertPrerenderedRouteIdentities(routes, distDir, '/repo', FIXTURE_ROOT_URL)).not.toThrow();
  });

  it('requires llms.txt discovery signals', () => {
    const llms = `
      # Agentic Awesome Skills
      Current release: V1.2.3.
      1,678+ agentic skills with specialized plugins for Claude Code and Codex CLI.
      https://github.com/sickn33/agentic-awesome-skills
      https://sickn33.github.io/agentic-awesome-skills/workbench
      Canonical source of truth: the GitHub repository is the primary project URL.
    `;

    expect(() => assertLlms(llms, { expectedReleaseLabel: 'V1.2.3' })).not.toThrow();
  });

  it('rejects stale llms.txt release labels', () => {
    const llms = `
      # Agentic Awesome Skills
      Current release: V1.2.2.
      1,678+ agentic skills with specialized plugins for Claude Code and Codex CLI.
      https://github.com/sickn33/agentic-awesome-skills
      https://sickn33.github.io/agentic-awesome-skills/workbench
      Canonical source of truth: the GitHub repository is the primary project URL.
    `;

    expect(() => assertLlms(llms, { expectedReleaseLabel: 'V1.2.3' })).toThrow('current release');
  });

  it('requires social image tags in rendered index html', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/social-card.png" />
          <meta name="twitter:image" content="https://example.com/social-card.png" />
          <meta name="twitter:image:alt" content="Catalog social preview" />
        </head>
      </html>
    `;

    expect(() => assertIndexSocialMeta(html)).not.toThrow();
  });

  it('requires current discovery copy in rendered index html', () => {
    const html = `
      <html>
        <head>
          <title>Agentic Awesome Skills GitHub | 1,678+ AI coding skills</title>
          <meta name="description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta property="og:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta property="og:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta name="twitter:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta name="twitter:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <script type="application/ld+json">
            [
              {"@context":"https://schema.org","@type":"CollectionPage","sameAs":"https://github.com/sickn33/agentic-awesome-skills"},
              {"@context":"https://schema.org","@type":"Organization","url":"https://github.com/sickn33/agentic-awesome-skills"},
              {"@context":"https://schema.org","@type":"WebSite"},
              {"@context":"https://schema.org","@type":"SoftwareSourceCode","url":"https://github.com/sickn33/agentic-awesome-skills","codeRepository":"https://github.com/sickn33/agentic-awesome-skills","mainEntityOfPage":"https://owner.github.io/repo/"},
              {"@context":"https://schema.org","@type":"FAQPage"}
            ]
          </script>
        </head>
      </html>
    `;

    expect(() => assertIndexDiscoveryMeta(html)).not.toThrow();
  });

  it('rejects stale count labels in rendered index JSON-LD', () => {
    const html = `
      <html>
        <head>
          <title>Agentic Awesome Skills GitHub | 1,678+ AI coding skills</title>
          <meta name="description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta property="og:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta property="og:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta name="twitter:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta name="twitter:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <script type="application/ld+json">
            [
              {"@context":"https://schema.org","@type":"CollectionPage","sameAs":"https://github.com/sickn33/agentic-awesome-skills"},
              {"@context":"https://schema.org","@type":"Organization","url":"https://github.com/sickn33/agentic-awesome-skills"},
              {"@context":"https://schema.org","@type":"WebSite"},
              {"@context":"https://schema.org","@type":"SoftwareSourceCode","url":"https://github.com/sickn33/agentic-awesome-skills","codeRepository":"https://github.com/sickn33/agentic-awesome-skills","mainEntityOfPage":"https://owner.github.io/repo/"},
              {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"acceptedAnswer":{"text":"Old 1,700+ catalog copy"}}]}
            ]
          </script>
        </head>
      </html>
    `;

    expect(() => assertIndexDiscoveryMeta(html)).toThrow('stale skill count');
  });

  it('requires current discovery copy in the source index shell', () => {
    const html = `
      <html>
        <head>
          <title>Agentic Awesome Skills GitHub | 1,678+ AI coding skills</title>
          <meta name="description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta property="og:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta property="og:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta name="twitter:title" content="Agentic Awesome Skills GitHub | 1,678+ AI coding skills" />
          <meta name="twitter:description" content="Explore the GitHub library of 1,678+ installable agentic skills, specialized plugins, bundles, and workflows." />
        </head>
      </html>
    `;

    expect(() => assertStaticIndexShell(html)).not.toThrow();
  });

  it('requires current discovery copy in the social card', () => {
    const svg = `
      <svg>
        <title>Agentic Awesome Skills social card</title>
        <desc>Social preview with 1,678 plus agentic skills.</desc>
        <text>1,678+ Agentic Skills</text>
      </svg>
    `;

    expect(() => assertSocialCard(svg)).not.toThrow();
  });

  it('accepts a 1200x630 PNG social card', () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(1200, 16);
    png.writeUInt32BE(630, 20);

    expect(() => assertSocialCard(png)).not.toThrow();
  });

  it('rejects stale social card count labels', () => {
    const svg = `
      <svg>
        <title>Agentic Awesome Skills social card</title>
        <text>1,700+ Agentic Skills</text>
      </svg>
    `;

    expect(() => assertSocialCard(svg)).toThrow('Social card');
  });

  it('requires plugin landing discovery copy in rendered plugin html', () => {
    const html = `
      <html>
        <head>
          <title>AAS Specialized Plugins | 15 AI coding workflow packs</title>
          <meta name="description" content="Compare 15 specialized plugin packs for web apps and security." />
          <meta property="og:title" content="AAS Specialized Plugins | AI coding workflow packs" />
          <script type="application/ld+json">
            [
              {"@context":"https://schema.org","@type":"CollectionPage"},
              {"@context":"https://schema.org","@type":"Organization"}
            ]
          </script>
        </head>
      </html>
    `;

    expect(() => assertPluginsDiscoveryMeta(html)).not.toThrow();
  });

  it('validates prerendered topic route files when present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeFile = path.join(distDir, 'topics', 'antigravity-cli-skills', 'index.html');
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(
      routeFile,
      '<html><head><title>Antigravity CLI Skills | Installable AI agent playbooks</title><meta name="description" content="Install Antigravity CLI skills from the GitHub repository." /><meta property="og:title" content="Antigravity CLI Skills" /><script type="application/ld+json">[{"@context":"https://schema.org","@type":"WebPage"},{"@context":"https://schema.org","@type":"BreadcrumbList"},{"@context":"https://schema.org","@type":"Organization"},{"@context":"https://schema.org","@type":"WebSite"},{"@context":"https://schema.org","@type":"SoftwareSourceCode"}]</script></head><body><div id="root"><main data-prerender-fallback="true"><a href="https://owner.github.io/repo/topics/github-ai-skills-repository/">A GitHub repository for installable AI agent skills</a></main></div></body></html>',
    );

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/topics/antigravity-cli-skills/</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml, { minSkillUrls: 0 });
    expect(() => assertPrerenderedTopicRoutes(report.topicUrls, distDir, report.normalizedRootPath)).not.toThrow();
  });

  it('validates prerendered skill route files when present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeFile = path.join(distDir, 'skill', 'agent-a', 'index.html');
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(
      routeFile,
      '<html><body><div id="root"><main data-prerender-fallback="true"><a href="https://owner.github.io/repo/topics/antigravity-cli-skills">Antigravity CLI skills for agentic coding workflows</a></main></div></body></html>',
    );

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-a/</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml);
    expect(() => assertPrerenderedSkillRoutes(report.skillUrls, distDir, report.normalizedRootPath)).not.toThrow();
  });

  it('validates prerendered plugin route files when present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeFile = path.join(distDir, 'plugins', 'index.html');
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(
      routeFile,
      '<html><head><title>AAS Specialized Plugins | 15 AI coding workflow packs</title><meta name="description" content="Compare 15 specialized plugin packs." /><meta property="og:title" content="AAS Specialized Plugins | AI coding workflow packs" /><script type="application/ld+json">[{"@context":"https://schema.org","@type":"CollectionPage"},{"@context":"https://schema.org","@type":"Organization"}]</script></head></html>',
    );

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/plugins/</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml, { minSkillUrls: 0 });
    expect(() => assertPrerenderedPluginRoutes(report.pluginUrls, distDir, report.normalizedRootPath)).not.toThrow();
  });

  it('validates the prerendered workbench route and its exact-composition promise', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeFile = path.join(distDir, 'workbench', 'index.html');
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(
      routeFile,
      '<html><head><title>Skill Workbench | Compose an exact agent stack</title><meta name="description" content="Filter, inspect, and install an exact host-aware set of skills." /></head></html>',
    );

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/workbench/</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml, { minSkillUrls: 0 });
    expect(report.workbenchUrls).toEqual(['https://owner.github.io/repo/workbench/']);
    expect(() => assertPrerenderedWorkbenchRoutes(
      report.workbenchUrls,
      distDir,
      report.normalizedRootPath,
    )).not.toThrow();
  });

  it('throws when a prerendered skill file is missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-a/</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml);
    expect(() => assertPrerenderedSkillRoutes(report.skillUrls, distDir, report.normalizedRootPath)).toThrow(
      'Missing prerendered page for skill route',
    );
  });

  it('rejects missing social image tags', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/social-card.png" />
          <meta name="twitter:image:alt" content="Catalog social preview" />
        </head>
      </html>
    `;

    expect(() => assertIndexSocialMeta(html)).toThrow('twitter:image');
  });

  it('requires manifest identity and theme fields', () => {
    const manifest = JSON.stringify(
      {
        name: 'Antigravity',
        short_name: 'AG',
        theme_color: '#112233',
        description: 'desc',
        icons: [{ src: 'icon.svg' }],
      },
      null,
      2,
    );

    expect(() => assertManifest(manifest)).not.toThrow();
  });
});
