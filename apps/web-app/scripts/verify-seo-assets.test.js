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
  assertPrerenderedSkillRoutes,
  assertPrerenderedTopicRoutes,
  assertIndexSocialMeta,
  assertLlms,
  assertRobots,
  assertSitemap,
  assertSocialCard,
  extractSitemapLocations,
} from './verify-seo-assets.js';

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

  it('requires llms.txt discovery signals', () => {
    const llms = `
      # Agentic Awesome Skills
      Current release: V1.2.3.
      1,678+ agentic skills with specialized plugins for Claude Code and Codex CLI.
      https://github.com/sickn33/agentic-awesome-skills
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
        <url><loc>https://owner.github.io/repo/skill/agent-a</loc></url>
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
        <url><loc>https://owner.github.io/repo/plugins</loc></url>
      </urlset>
    `;

    const report = analyzeSitemap(xml, { minSkillUrls: 0 });
    expect(() => assertPrerenderedPluginRoutes(report.pluginUrls, distDir, report.normalizedRootPath)).not.toThrow();
  });

  it('throws when a prerendered skill file is missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');

    const xml = `
      <urlset>
        <url><loc>https://owner.github.io/repo/</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-a</loc></url>
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
