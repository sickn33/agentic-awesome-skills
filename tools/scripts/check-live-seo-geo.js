#!/usr/bin/env node

const https = require('node:https');

const DEFAULT_BASE_URL = 'https://sickn33.github.io/antigravity-awesome-skills';
const baseUrl = (process.env.SEO_LIVE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

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

async function main() {
  const [home, plugins, sitemap, llms, robots] = await Promise.all([
    fetchText(`${baseUrl}/`),
    fetchText(`${baseUrl}/plugins`),
    fetchText(`${baseUrl}/sitemap.xml`),
    fetchText(`${baseUrl}/llms.txt`),
    fetchText(`${baseUrl}/robots.txt`),
  ]);

  assertIncludes(home, 'Antigravity Awesome Skills | 1,508+ AI coding skills and plugins', 'home');
  assertIncludes(home, 'SoftwareSourceCode', 'home JSON-LD');
  assertIncludes(home, 'FAQPage', 'home JSON-LD');
  assertIncludes(home, 'specialized plugins', 'home');
  assertNotIncludes(home, 'prompt templates', 'home');

  assertIncludes(plugins, 'AAS Specialized Plugins | 15 AI coding workflow packs', 'plugins');
  assertIncludes(plugins, 'specialized plugin packs', 'plugins');
  assertIncludes(plugins, 'numberOfItems', 'plugins JSON-LD');

  assertIncludes(sitemap, `${baseUrl}/plugins`, 'sitemap');
  assertIncludes(llms, `${baseUrl}/plugins`, 'llms.txt');
  assertIncludes(robots, 'User-agent: GPTBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: OAI-SearchBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: ClaudeBot', 'robots.txt');
  assertIncludes(robots, 'User-agent: PerplexityBot', 'robots.txt');

  console.log(`Live SEO/GEO check passed for ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
