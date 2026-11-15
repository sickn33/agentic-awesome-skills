#!/usr/bin/env node

const https = require('node:https');
const http = require('node:http');
const { assertPageContent, assertPluginsContent, assertWorkbenchContent } = require('./seo-content');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BASE_URL = 'https://aaskills.tech';
const baseUrl = (process.env.SEO_LIVE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
const repoRoot = path.resolve(__dirname, '..', '..');

function readExpectedState() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const skills = JSON.parse(fs.readFileSync(path.join(repoRoot, 'skills_index.json'), 'utf8'));
  if (!Array.isArray(skills)) {
    throw new Error('skills_index.json must contain an array');
  }
  return {
    countLabel: `${skills.length.toLocaleString('en-US')}+`,
    releaseLabel: `V${pkg.version}`,
    pluginCount: JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/editorial-bundles.json'), 'utf8')).bundles.length,
  };
}

function fetchDocument(url, redirectsRemaining = 5) {
  return new Promise((resolve, reject) => {
    const protocol = new URL(url).protocol;
    if (!['http:', 'https:'].includes(protocol)) return reject(new Error(`Unsupported protocol: ${protocol}`));
    const request = (protocol === 'https:' ? https : http).get(url, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        if (redirectsRemaining <= 0) return reject(new Error(`GET ${url} exceeded redirect limit`));
        fetchDocument(new URL(location, url).toString(), redirectsRemaining - 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) request.destroy(new Error(`GET ${url} exceeds response size limit`));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8'), url }));
    });
    request.setTimeout(15000, () => request.destroy(new Error(`GET ${url} timed out`)));
    request.on('error', reject);
  });
}

async function fetchText(url) {
  const response = await fetchDocument(url);
  assertStatus(response, 200);
  return response.body;
}

function assertStatus(response, expected) {
  if (response.status !== expected) throw new Error(`GET ${response.url} returned HTTP ${response.status}; expected ${expected}`);
}

function assertIncludes(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`${label} missing expected snippet: ${snippet}`);
  }
}

function assertNotIncludes(text, snippet, label) {
  if (text.includes(snippet)) {
    throw new Error(`${label} contains stale snippet: ${snippet}`);
  }
}

function assertLiveSeoDocuments({ home, plugins, sitemap, llms, robots }, expected) {
  assertIncludes(home, 'Agentic Awesome Skills | AI Skills &amp; AAS Core', 'home title');
  const description = home.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  if (!description) {
    throw new Error('home description meta tag is missing');
  }
  assertIncludes(description, `Explore ${expected.countLabel} reusable skills`, 'home description');
  if (description.length > 160) {
    throw new Error(`home description is ${description.length} characters; expected no more than 160`);
  }
  assertIncludes(home, 'SoftwareSourceCode', 'home JSON-LD');
  assertIncludes(home, expected.countLabel, 'home');
  assertNotIncludes(home, 'prompt templates', 'home');

  assertIncludes(plugins, `AAS Specialized Plugins | ${expected.pluginCount.toLocaleString('en-US')} AI coding workflow packs`, 'plugins');
  assertIncludes(plugins, 'specialized plugin packs', 'plugins');
  assertIncludes(plugins, 'numberOfItems', 'plugins JSON-LD');

  assertPageContent(home, 'Home', { baseUrl, linkPaths: ['/core/'] });
  assertPluginsContent(plugins, { pluginCount: expected.pluginCount, baseUrl });

  assertIncludes(sitemap, `${baseUrl}/plugins`, 'sitemap');
  assertIncludes(llms, `${baseUrl}/plugins`, 'llms.txt');
  assertIncludes(llms, `Current release: ${expected.releaseLabel}.`, 'llms.txt');
  assertIncludes(llms, expected.countLabel, 'llms.txt');
  assertIncludes(robots, 'User-agent: GPTBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: OAI-SearchBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: ClaudeBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: PerplexityBot', 'robots.txt');
}

const DISCOVERY_ROUTES = {
  workbench: '/workbench/', core: '/core/', directory: '/directory/',
  skill: '/skill/backend-architect/', docs: '/docs/aas-core/',
  topic: '/topics/antigravity-plugins/',
  missing: '/__aas_seo_missing_page__/', missingSkill: '/skill/__aas_seo_missing_skill__/',
};

function assertLiveDiscoveryPages(pages, expected) {
  for (const [label, response] of Object.entries(pages)) {
    assertStatus(response, label.startsWith('missing') ? 404 : 200);
    if (label.startsWith('missing')) {
      if (!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(response.body)) {
        throw new Error(`${label} must retain noindex`);
      }
      assertPageContent(response.body, label, { baseUrl, requiredText: ['Page not found'] });
    } else assertPageContent(response.body, label, { baseUrl });
  }
  // Missing samples must fail too, rather than reducing coverage silently.
  for (const label of Object.keys(DISCOVERY_ROUTES)) if (!pages[label]) throw new Error(`Missing discovery response: ${label}`);
  assertWorkbenchContent(pages.workbench.body, { baseUrl });
  assertPageContent(pages.core.body, 'Core', { baseUrl, linkPaths: ['/directory/'] });
  const directory = assertPageContent(pages.directory.body, 'Directory', { baseUrl });
  const skillPaths = new Set(directory.links.filter((link) => link.origin === new URL(baseUrl).origin && link.pathname.includes('/skill/')).map((link) => link.pathname));
  const expectedCount = Number(expected.countLabel.replace(/[^0-9]/g, ''));
  if (skillPaths.size !== expectedCount) throw new Error(`Directory links ${skillPaths.size} skills; expected ${expectedCount}`);
  if (!/<article\b[^>]*class=["'][^"']*markdown-body[^"']*["'][^>]*>[\s\S]+<\/article>/.test(pages.skill.body)) {
    throw new Error('Skill page must include initial instructions');
  }
}

async function main() {
  const expected = readExpectedState();
  const [home, plugins, sitemap, llms, robots] = await Promise.all([
    fetchText(`${baseUrl}/`), fetchText(`${baseUrl}/plugins/`),
    fetchText(`${baseUrl}/sitemap.xml`), fetchText(`${baseUrl}/llms.txt`), fetchText(`${baseUrl}/robots.txt`),
  ]);
  assertLiveSeoDocuments({ home, plugins, sitemap, llms, robots }, expected);
  const pages = {};
  // Keep public probes bounded; 404 status is inspected, not discarded as a fetch failure.
  const entries = Object.entries(DISCOVERY_ROUTES);
  for (let index = 0; index < entries.length; index += 3) {
    await Promise.all(entries.slice(index, index + 3).map(async ([key, route]) => { pages[key] = await fetchDocument(`${baseUrl}${route}`); }));
  }
  assertLiveDiscoveryPages(pages, expected);
  console.log(`Live SEO/GEO check passed for ${baseUrl}: initial content, directory, skill instructions and real 404 responses verified.`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { assertLiveSeoDocuments, assertLiveDiscoveryPages, readExpectedState, fetchDocument };
