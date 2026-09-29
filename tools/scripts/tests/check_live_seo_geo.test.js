const assert = require('node:assert');
const { assertLiveSeoDocuments } = require('../check-live-seo-geo');

const expected = { countLabel: '1,987+', releaseLabel: 'V15.3.0', pluginCount: 21 };
const description = 'Open-source AI coding skills for Codex, Claude Code, Cursor, and more. Explore 1,987+ playbooks and AAS Core catalog search, selection, and plan preview.';
const documents = {
  home: `Agentic Awesome Skills | Agent-first skill catalog and AAS Core <meta name="description" content="${description}"> SoftwareSourceCode FAQ specialized plugin`,
  plugins: 'AAS Specialized Plugins | 21 AI coding workflow packs specialized plugin packs numberOfItems',
  sitemap: 'https://aaskills.tech/plugins',
  llms: 'https://aaskills.tech/plugins Current release: V15.3.0. 1,987+',
  robots: 'User-agent: GPTBot User-agent: OAI-SearchBot User-agent: ClaudeBot User-agent: PerplexityBot',
};

assert.doesNotThrow(() => assertLiveSeoDocuments(documents, expected));
assert.throws(
  () => assertLiveSeoDocuments({
    ...documents,
    home: 'Agentic Awesome Skills GitHub | 1,987+ AI coding skills SoftwareSourceCode FAQ specialized plugin',
  }, expected),
  /home title/,
);
assert.throws(
  () => assertLiveSeoDocuments({
    ...documents,
    home: documents.home.replace(description, `${description} Add more words beyond the supported meta description length.`),
  }, expected),
  /no more than 160/,
);
assert.throws(
  () => assertLiveSeoDocuments({ ...documents, home: `${documents.home} prompt templates` }, expected),
  /stale snippet/,
);

console.log('live SEO/GEO contract tests passed');

assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '15 AI') }, expected), /21 AI coding workflow packs/);
assert.doesNotThrow(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '22 AI') }, { ...expected, pluginCount: 22 }));
