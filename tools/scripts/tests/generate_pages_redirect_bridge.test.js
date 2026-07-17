const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.resolve(__dirname, '..', 'generate-pages-redirect-bridge.js');
const { generateBridge } = require(scriptPath);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-bridge-'));
const sitemapPath = path.join(fixtureRoot, 'sitemap.xml');
const skillsIndexPath = path.join(fixtureRoot, 'skills_index.json');
const googleVerificationPath = path.join(fixtureRoot, 'google5815fd8827d2319c.html');
const googleVerificationBody = 'google-site-verification: google5815fd8827d2319c.html';
const current = 'https://example.github.io/agentic-awesome-skills/';
const legacy = 'https://example.github.io/antigravity-awesome-skills/';

function sitemap(locations) {
  return `<?xml version="1.0"?><urlset>${locations.map((location) => `<url><loc>${location}</loc></url>`).join('')}</urlset>`;
}

function writeSkills(filePath, ids) {
  fs.writeFileSync(filePath, `${JSON.stringify(ids.map((id) => ({ id })), null, 2)}\n`, 'utf8');
}

function bridgeOptions(outputDirectory, overrides = {}) {
  return {
    repoRoot: fixtureRoot,
    sitemapPath,
    skillsIndexPath,
    googleVerificationPath,
    outputDirectory,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
    expectedSkills: 2,
    ...overrides,
  };
}

function readTree(root) {
  const result = {};
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      else result[path.relative(root, filePath)] = fs.readFileSync(filePath, 'utf8');
    }
  }
  visit(root);
  return result;
}

try {
  const locations = [current, `${current}plugins/`, `${current}topics/github-ai-skills-repository/`, `${current}skill/brainstorming/`];
  fs.writeFileSync(sitemapPath, sitemap(locations), 'utf8');
  writeSkills(skillsIndexPath, ['brainstorming', 'catalog-only']);
  fs.writeFileSync(googleVerificationPath, googleVerificationBody, 'utf8');

  const outputOne = path.join(fixtureRoot, '.codex', 'bridge-one');
  const manifest = generateBridge(bridgeOptions(outputOne));
  assert.strictEqual(manifest.schema_version, 2);
  assert.strictEqual(manifest.source_sitemap_route_count, 4);
  assert.strictEqual(manifest.current_skill_route_count, 2);
  assert.strictEqual(manifest.route_count, 5);
  assert.strictEqual(manifest.legacy_sitemap_route_count, 4);
  assert.strictEqual(manifest.webmaster_verification.google.legacy_file, 'antigravity-awesome-skills/google5815fd8827d2319c.html');
  assert.strictEqual(manifest.webmaster_verification.bing.meta_name, 'msvalidate.01');
  assert.strictEqual(manifest.webmaster_verification.bing.token, 'CAC904EB0D2DD1B22B5F2BC540CAD654');
  assert.strictEqual(manifest.redirects.length, 5);
  assert.strictEqual(new Set(manifest.redirects.map((redirect) => redirect.from)).size, 5);
  assert.strictEqual(new Set(manifest.redirects.map((redirect) => redirect.output_file)).size, 5);

  for (const relative of [
    'antigravity-awesome-skills/index.html',
    'antigravity-awesome-skills/plugins/index.html',
    'antigravity-awesome-skills/topics/github-ai-skills-repository/index.html',
    'antigravity-awesome-skills/skill/brainstorming/index.html',
    'antigravity-awesome-skills/skill/catalog-only/index.html',
  ]) {
    assert(fs.existsSync(path.join(outputOne, relative)), `missing generated route: ${relative}`);
  }
  assert(!fs.existsSync(path.join(outputOne, 'antigravity-awesome-skills/skill/removed-skill/index.html')));
  assert(!manifest.redirects.some(({ from }) => from === `${legacy}skill/removed-skill/`));

  const legacyRootHtml = fs.readFileSync(path.join(outputOne, 'antigravity-awesome-skills/index.html'), 'utf8');
  assert.strictEqual((legacyRootHtml.match(/name="msvalidate\.01"/g) || []).length, 1);
  assert.match(legacyRootHtml, /name="msvalidate\.01" content="CAC904EB0D2DD1B22B5F2BC540CAD654"/);
  assert(
    legacyRootHtml.indexOf('name="msvalidate.01"') < legacyRootHtml.indexOf('http-equiv="refresh"'),
    'Bing verification must appear before the redirect refresh',
  );

  const pluginHtml = fs.readFileSync(path.join(outputOne, 'antigravity-awesome-skills/plugins/index.html'), 'utf8');
  assert.match(pluginHtml, /http-equiv="refresh" content="0; url=https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/"/);
  assert.match(pluginHtml, /rel="canonical" href="https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/"/);
  assert.match(pluginHtml, /<a href="https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/">/);
  assert(!pluginHtml.includes('msvalidate.01'), 'Bing verification belongs only on the legacy root');
  const copiedGoogleVerification = fs.readFileSync(
    path.join(outputOne, 'antigravity-awesome-skills/google5815fd8827d2319c.html'),
    'utf8',
  );
  assert.strictEqual(copiedGoogleVerification, googleVerificationBody, 'Google verification must be copied byte-for-byte');
  const legacySitemapSource = fs.readFileSync(path.join(outputOne, 'antigravity-awesome-skills/sitemap.xml'), 'utf8');
  assert.strictEqual((legacySitemapSource.match(/<loc>/g) || []).length, 4, 'legacy sitemap stays on the curated source sitemap');
  assert(!legacySitemapSource.includes('/skill/catalog-only/'), 'catalog-only redirects must not expand crawler discovery');

  const outputTwo = path.join(fixtureRoot, '.codex', 'bridge-two');
  generateBridge(bridgeOptions(outputTwo));
  assert.deepStrictEqual(readTree(outputTwo), readTree(outputOne), 'identical input produces byte-identical output');

  assert.throws(() => generateBridge(bridgeOptions(outputOne)), /output path already exists/);

  const foreignSitemap = path.join(fixtureRoot, 'foreign.xml');
  fs.writeFileSync(foreignSitemap, sitemap([current, 'https://attacker.example/skill/escape/']), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'foreign'), {
    sitemapPath: foreignSitemap,
    expectedRoutes: 2,
  })), /outside the current HTTPS identity/);

  const duplicateSitemap = path.join(fixtureRoot, 'duplicate.xml');
  fs.writeFileSync(duplicateSitemap, sitemap([current, current]), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'duplicate'), {
    sitemapPath: duplicateSitemap,
    expectedRoutes: 2,
  })), /duplicate/);

  const normalizedDuplicateSitemap = path.join(fixtureRoot, 'normalized-duplicate.xml');
  fs.writeFileSync(normalizedDuplicateSitemap, sitemap([current, 'https://EXAMPLE.github.io:443/agentic-awesome-skills/']), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'normalized-duplicate'), {
    sitemapPath: normalizedDuplicateSitemap,
    expectedRoutes: 2,
  })), /duplicate URLs after normalization/);

  const doubleEncodedSitemap = path.join(fixtureRoot, 'double-encoded.xml');
  fs.writeFileSync(doubleEncodedSitemap, sitemap([current, `${current}skill/&amp;lt;escape/`]), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'double-encoded'), {
    sitemapPath: doubleEncodedSitemap,
    expectedRoutes: 2,
  })), /unsafe path segment/, 'XML entities must be decoded exactly once');

  const orphanSitemap = path.join(fixtureRoot, 'orphan.xml');
  fs.writeFileSync(orphanSitemap, sitemap([current, `${current}skill/removed-skill/`]), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'orphan'), {
    sitemapPath: orphanSitemap,
    expectedRoutes: 2,
  })), /absent from the current skills index/);

  for (const [name, entries, pattern] of [
    ['duplicate-skills', [{ id: 'brainstorming' }, { id: 'brainstorming' }], /duplicate ids/],
    ['unsafe-skills', [{ id: 'brainstorming' }, { id: '../escape' }], /unsafe or missing id/],
    ['missing-skills', [{ id: 'brainstorming' }, {}], /unsafe or missing id/],
    ['dot-skill', [{ id: 'brainstorming' }, { id: '.' }], /unsafe or missing id/],
    ['dot-dot-skill', [{ id: 'brainstorming' }, { id: '..' }], /unsafe or missing id/],
  ]) {
    const invalidSkillsIndex = path.join(fixtureRoot, `${name}.json`);
    fs.writeFileSync(invalidSkillsIndex, JSON.stringify(entries), 'utf8');
    assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', name), {
      skillsIndexPath: invalidSkillsIndex,
    })), pattern);
  }
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'skill-count'), {
    expectedSkills: 3,
  })), /skills index count 2 does not match locked expectation 3/);

  const dynamicSkillCountOutput = path.join(fixtureRoot, '.codex', 'dynamic-skill-count');
  const dynamicSkillCountManifest = generateBridge(bridgeOptions(dynamicSkillCountOutput, { expectedSkills: null }));
  assert.strictEqual(dynamicSkillCountManifest.current_skill_route_count, 2, 'omitting the skill-count lock follows the current index');

  const invalidGoogleVerification = path.join(fixtureRoot, 'invalid-google.html');
  fs.writeFileSync(invalidGoogleVerification, 'stale verification token', 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'invalid-google'), {
    googleVerificationPath: invalidGoogleVerification,
  })), /Google verification file must contain exactly/);

  const collidingSitemap = path.join(fixtureRoot, 'google-collision.xml');
  fs.writeFileSync(collidingSitemap, sitemap([current, `${current}google5815fd8827d2319c.html/`]), 'utf8');
  assert.throws(() => generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'google-collision'), {
    sitemapPath: collidingSitemap,
    expectedRoutes: 2,
  })), /reserved Google verification path/);

  const trackedOutput = path.join(fixtureRoot, 'apps', 'web-app', 'public', 'bridge');
  assert.throws(() => generateBridge(bridgeOptions(trackedOutput)), /only under ignored \.codex/);

  const symlinkRepo = path.join(fixtureRoot, 'symlink-repo');
  const trackedPublic = path.join(symlinkRepo, 'apps', 'web-app', 'public');
  fs.mkdirSync(trackedPublic, { recursive: true });
  const symlinkSitemap = path.join(symlinkRepo, 'sitemap.xml');
  fs.writeFileSync(symlinkSitemap, sitemap(locations), 'utf8');
  fs.symlinkSync(trackedPublic, path.join(symlinkRepo, '.codex'));
  const symlinkOptions = {
    repoRoot: symlinkRepo,
    sitemapPath: symlinkSitemap,
    skillsIndexPath,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
    expectedSkills: 2,
  };
  assert.throws(() => generateBridge({
    ...symlinkOptions,
    outputDirectory: path.join(symlinkRepo, '.codex', 'bridge'),
  }), /symlink|physical output/);
  assert(!fs.existsSync(path.join(trackedPublic, 'bridge')), 'a .codex symlink cannot redirect writes into tracked public files');

  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-outside-'));
  try {
    fs.symlinkSync(trackedPublic, path.join(outsideRoot, 'linked-public'));
    assert.throws(() => generateBridge({
      ...symlinkOptions,
      outputDirectory: path.join(outsideRoot, 'linked-public', 'bridge'),
    }), /physical output resolves inside the repository/);
    assert(!fs.existsSync(path.join(trackedPublic, 'bridge')));
  } finally {
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }

  const sentinelDirectory = path.join(path.dirname(outputOne), `.${path.basename(outputOne)}.${process.pid}.sentinel`);
  fs.mkdirSync(sentinelDirectory);
  fs.writeFileSync(path.join(sentinelDirectory, 'KEEP'), 'owned by another process', 'utf8');
  generateBridge(bridgeOptions(path.join(fixtureRoot, '.codex', 'bridge-three')));
  assert.strictEqual(fs.readFileSync(path.join(sentinelDirectory, 'KEEP'), 'utf8'), 'owned by another process');

  const cliOutput = path.join(fixtureRoot, '.codex', 'cli');
  const cli = spawnSync(process.execPath, [
    scriptPath,
    '--sitemap', sitemapPath,
    '--skills-index', skillsIndexPath,
    '--google-verification', googleVerificationPath,
    '--output', cliOutput,
    '--current-base', current,
    '--legacy-base', legacy,
    '--expected-routes', '4',
    '--expected-skills', '2',
  ], { encoding: 'utf8' });
  assert.strictEqual(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /Generated 5 redirect pages/);

  const missingOutput = spawnSync(process.execPath, [scriptPath, '--sitemap', sitemapPath], { encoding: 'utf8' });
  assert.strictEqual(missingOutput.status, 1);
  assert.match(missingOutput.stderr, /--output is required/);

  const productionOutputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-production-'));
  try {
    const productionOutput = path.join(productionOutputRoot, 'bridge');
    const productionManifest = generateBridge({ outputDirectory: productionOutput });
    const productionSkills = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'skills_index.json'), 'utf8'));
    assert.strictEqual(productionManifest.source_sitemap_route_count, 187);
    assert.strictEqual(productionManifest.current_skill_route_count, productionSkills.length);
    assert.strictEqual(productionManifest.route_count, productionSkills.length + 7);
    assert.strictEqual(productionManifest.legacy_sitemap_route_count, 187);
    const expectedSkillUrls = new Set(productionSkills.map(({ id }) => `https://sickn33.github.io/agentic-awesome-skills/skill/${id}/`));
    const actualSkillUrls = new Set(productionManifest.redirects.map(({ to }) => to).filter((url) => url.includes('/skill/')));
    assert.deepStrictEqual(actualSkillUrls, expectedSkillUrls, 'production bridge must cover exactly every current skill id');
    assert(!productionManifest.redirects.some(({ to }) => to.endsWith('/skill/goldrush-api/')));
    assert(!productionManifest.redirects.some(({ to }) => to.endsWith('/skill/merge-batch-e2e-test/')));
    const productionLegacySitemap = fs.readFileSync(path.join(productionOutput, 'antigravity-awesome-skills/sitemap.xml'), 'utf8');
    assert.strictEqual((productionLegacySitemap.match(/<loc>/g) || []).length, 187);
    assert.strictEqual(
      fs.readFileSync(path.join(productionOutput, 'antigravity-awesome-skills/google5815fd8827d2319c.html'), 'utf8'),
      fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'apps/web-app/public/google5815fd8827d2319c.html'), 'utf8'),
    );
    const productionRootHtml = fs.readFileSync(path.join(productionOutput, 'antigravity-awesome-skills/index.html'), 'utf8');
    assert.match(productionRootHtml, /name="msvalidate\.01" content="CAC904EB0D2DD1B22B5F2BC540CAD654"/);
  } finally {
    fs.rmSync(productionOutputRoot, { recursive: true, force: true });
  }

  console.log('generate_pages_redirect_bridge tests passed');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
