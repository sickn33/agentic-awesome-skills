import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertManifest,
  assertIndexDiscoveryMeta,
  assertPluginsDiscoveryMeta,
  analyzeSitemap,
  assertPrerenderedPluginRoutes,
  assertPrerenderedSkillRoutes,
  assertIndexSocialMeta,
  assertLlms,
  assertRobots,
  assertSitemap,
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
        <url><loc>https://owner.github.io/repo/plugins</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-a</loc></url>
        <url><loc>https://owner.github.io/repo/skill/agent-b</loc></url>
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
      # Antigravity Awesome Skills
      1,508+ agentic skills with specialized plugins for Claude Code and Codex CLI.
      https://github.com/sickn33/antigravity-awesome-skills
      Canonical source of truth: the GitHub repository is the primary project URL.
    `;

    expect(() => assertLlms(llms)).not.toThrow();
  });

  it('requires social image tags in rendered index html', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/social-card.svg" />
          <meta name="twitter:image" content="https://example.com/social-card.svg" />
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
          <title>Antigravity Awesome Skills | 1,508+ AI coding skills and plugins</title>
          <meta name="description" content="Explore 1,508+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta property="og:title" content="Antigravity Awesome Skills | 1,508+ AI coding skills and plugins" />
          <meta property="og:description" content="Explore 1,508+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <meta name="twitter:title" content="Antigravity Awesome Skills | 1,508+ AI coding skills and plugins" />
          <meta name="twitter:description" content="Explore 1,508+ installable agentic skills, specialized plugins, bundles, and workflows." />
          <script type="application/ld+json">
            [
              {"@context":"https://schema.org","@type":"CollectionPage","sameAs":"https://github.com/sickn33/antigravity-awesome-skills"},
              {"@context":"https://schema.org","@type":"Organization","url":"https://github.com/sickn33/antigravity-awesome-skills"},
              {"@context":"https://schema.org","@type":"WebSite"},
              {"@context":"https://schema.org","@type":"SoftwareSourceCode","url":"https://github.com/sickn33/antigravity-awesome-skills","codeRepository":"https://github.com/sickn33/antigravity-awesome-skills","mainEntityOfPage":"https://owner.github.io/repo/"},
              {"@context":"https://schema.org","@type":"FAQPage"}
            ]
          </script>
        </head>
      </html>
    `;

    expect(() => assertIndexDiscoveryMeta(html)).not.toThrow();
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

  it('validates prerendered skill route files when present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'));
    const distDir = path.join(tmpDir, 'dist');
    const routeFile = path.join(distDir, 'skill', 'agent-a', 'index.html');
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(routeFile, '<html></html>');

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
          <meta property="og:image" content="https://example.com/social-card.svg" />
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
