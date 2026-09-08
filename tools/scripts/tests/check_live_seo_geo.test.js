const assert = require('node:assert');
const { assertLiveSeoDocuments } = require('../check-live-seo-geo');

const expected = { countLabel: '1,987+', releaseLabel: 'V15.3.0', pluginCount: 21 };
const documents = {
  home: 'AAS Core Preview | Agent-first stacks backed by 1,987+ skills SoftwareSourceCode FAQPage specialized plugins',
  plugins: 'AAS Specialized Plugins | 21 AI coding workflow packs specialized plugin packs numberOfItems',
  sitemap: 'https://sickn33.github.io/agentic-awesome-skills/plugins',
  llms: 'https://sickn33.github.io/agentic-awesome-skills/plugins Current release: V15.3.0. 1,987+',
  robots: 'User-agent: GPTBot User-agent: OAI-SearchBot User-agent: ClaudeBot User-agent: PerplexityBot',
};

assert.doesNotThrow(() => assertLiveSeoDocuments(documents, expected));
assert.throws(
  () => assertLiveSeoDocuments({
    ...documents,
    home: 'Agentic Awesome Skills GitHub | 1,987+ AI coding skills SoftwareSourceCode FAQPage specialized plugins',
  }, expected),
  /AAS Core Preview/,
);
assert.throws(
  () => assertLiveSeoDocuments({ ...documents, home: `${documents.home} prompt templates` }, expected),
  /stale snippet/,
);

console.log('live SEO/GEO contract tests passed');

assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '15 AI') }, expected), /21 AI coding workflow packs/);
assert.doesNotThrow(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '22 AI') }, { ...expected, pluginCount: 22 }));
