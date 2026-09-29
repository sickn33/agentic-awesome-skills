#!/usr/bin/env node

const https = require('node:https');
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
    pluginCount: JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/specialized-plugin-candidates.json'), 'utf8')).candidates.length,
  };
}

function fetchText(url, redirectsRemaining = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const status = response.statusCode || 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          if (redirectsRemaining <= 0) {
            reject(new Error(`GET ${url} exceeded redirect limit`));
            response.resume();
            return;
          }

          const redirectedUrl = new URL(location, url).toString();
          response.resume();
          fetchText(redirectedUrl, redirectsRemaining - 1).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          reject(new Error(`GET ${url} returned HTTP ${status}`));
          response.resume();
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
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
  assertIncludes(home, 'Agentic Awesome Skills | Agent-first skill catalog and AAS Core', 'home title');
  const description = home.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  if (!description) {
    throw new Error('home description meta tag is missing');
  }
  assertIncludes(description, `Explore ${expected.countLabel} playbooks`, 'home description');
  if (description.length > 160) {
    throw new Error(`home description is ${description.length} characters; expected no more than 160`);
  }
  assertIncludes(home, 'SoftwareSourceCode', 'home JSON-LD');
  assertIncludes(home, expected.countLabel, 'home');
  assertNotIncludes(home, 'prompt templates', 'home');

  assertIncludes(plugins, `AAS Specialized Plugins | ${expected.pluginCount.toLocaleString('en-US')} AI coding workflow packs`, 'plugins');
  assertIncludes(plugins, 'specialized plugin packs', 'plugins');
  assertIncludes(plugins, 'numberOfItems', 'plugins JSON-LD');

  assertIncludes(sitemap, `${baseUrl}/plugins`, 'sitemap');
  assertIncludes(llms, `${baseUrl}/plugins`, 'llms.txt');
  assertIncludes(llms, `Current release: ${expected.releaseLabel}.`, 'llms.txt');
  assertIncludes(llms, expected.countLabel, 'llms.txt');
  assertIncludes(robots, 'User-agent: GPTBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: OAI-SearchBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: ClaudeBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: PerplexityBot', 'robots.txt');
}

async function main() {
  const expected = readExpectedState();
  const [home, plugins, sitemap, llms, robots] = await Promise.all([
    fetchText(`${baseUrl}/`),
    fetchText(`${baseUrl}/plugins`),
    fetchText(`${baseUrl}/sitemap.xml`),
    fetchText(`${baseUrl}/llms.txt`),
    fetchText(`${baseUrl}/robots.txt`),
  ]);

  assertLiveSeoDocuments({ home, plugins, sitemap, llms, robots }, expected);

  console.log(`Live SEO/GEO check passed for ${baseUrl}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { assertLiveSeoDocuments, readExpectedState };
