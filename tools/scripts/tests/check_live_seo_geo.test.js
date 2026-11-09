const assert = require('node:assert');
const { assertLiveSeoDocuments, assertLiveDiscoveryPages, readExpectedState, fetchDocument } = require('../check-live-seo-geo');

const expected = { countLabel: '1,987+', releaseLabel: 'V15.3.0', pluginCount: 21 };
const description = 'Explore 1,987+ reusable skills for Claude Code, Codex and Cursor. AAS Core records your agent’s catalog selection and previews a plan locally.';
const page = (content) => `<html><body><main><h1>Page</h1>${content}</main></body></html>`;
const packBody = (count) => page(`Install related skills as one pack. Included skills. Using your pack.
  <a href="/docs/plugins/">Install</a><a href="/core/">Catalog</a><a href="/skill/example/">Example</a>
  ${Array.from({length: count}, (_, i) => `<section data-plugin-pack="pack-${i}">Pack ${i}</section>`).join('')}`);
const documents = {
  home: `Agentic Awesome Skills | AI Skills &amp; AAS Core <meta name="description" content="${description}"> SoftwareSourceCode FAQ specialized plugin${page('<a href="/core/">Catalog</a>')}`,
  plugins: 'AAS Specialized Plugins | 21 AI coding workflow packs specialized plugin packs numberOfItems' + packBody(21),
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


assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '15 AI') }, expected), /21 AI coding workflow packs/);
assert.doesNotThrow(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace('21 AI', '22 AI').replace(packBody(21), packBody(22)) }, { ...expected, pluginCount: 22 }));

// The public offer includes all active editorial packs, not only the candidate shortlist.
const editorial = require('../../../data/editorial-bundles.json');
const candidates = require('../../../data/specialized-plugin-candidates.json');
assert.strictEqual(readExpectedState().pluginCount, editorial.bundles.length);
assert.notStrictEqual(readExpectedState().pluginCount, candidates.candidates.length);

assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace(packBody(21), '') }, expected), /initial main content/);
assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace(packBody(21), `<body><script>${packBody(21)}</script><!--${packBody(21)}--></body>`) }, expected), /initial main content/);
assert.throws(() => assertLiveSeoDocuments({ ...documents, plugins: documents.plugins.replace(packBody(21), packBody(20)) }, expected), /every pack/);
const good = (body) => ({ status: 200, body, url: 'https://aaskills.tech/' });
const missing = { status: 404, body: '<meta name="robots" content="noindex, follow">' + page('Page not found'), url: 'https://aaskills.tech/missing/' };
const discovery = {
  workbench: good(page('aas-stack.json aas-selection-evidence.json Imports stay in memory; cannot install, apply, share, or persist <a href="/core/">Catalog</a><a href="/docs/aas-core/">Guide</a>')),
  core: good(page('<a href="/directory/">Directory</a>')),
  directory: good(page('<a href="/skill/example/">Example</a>')),
  skill: good(page('<article class="markdown-body">Actual skill instructions</article>')),
  docs: good(page('Configuration guide')), topic: good(page('Plugin selection guide')), missing, missingSkill: missing,
};
assert.doesNotThrow(() => assertLiveDiscoveryPages(discovery, { countLabel: '1+' }));
assert.throws(() => assertLiveDiscoveryPages({ ...discovery, missing: { ...missing, status: 200 } }, { countLabel: '1+' }), /expected 404/);
assert.throws(() => assertLiveDiscoveryPages({ ...discovery, missing: { ...missing, body: page('Page not found') } }, { countLabel: '1+' }), /noindex/);
assert.throws(() => assertLiveDiscoveryPages(discovery, { countLabel: '2+' }), /Directory links/);
assert.throws(() => assertLiveDiscoveryPages({ ...discovery, skill: good(page('Loading…')) }, { countLabel: '1+' }), /initial instructions/);
assert.throws(() => assertLiveDiscoveryPages({ ...discovery, workbench: good(page('Loading…')) }, { countLabel: '1+' }), /aas-stack.json/);
assert.throws(() => assertLiveDiscoveryPages({}, { countLabel: '1+' }), /Missing discovery response/);

// Exercise real HTTP statuses and bounded redirects locally, without an external service.
(async () => {
  const http = require('node:http');
  const server = http.createServer((request, response) => {
    if (request.url === '/redirect') { response.writeHead(302, { location: '/missing' }); response.end(); }
    else if (request.url === '/loop') { response.writeHead(302, { location: '/loop' }); response.end(); }
    else { response.writeHead(404); response.end('Missing page'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const result = await fetchDocument(`${origin}/redirect`);
    assert.equal(result.status, 404);
    assert.equal(result.body, 'Missing page');
    await assert.rejects(fetchDocument(`${origin}/loop`, 1), /redirect limit/);
    console.log('live SEO/GEO contract tests passed');
  } finally { await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
