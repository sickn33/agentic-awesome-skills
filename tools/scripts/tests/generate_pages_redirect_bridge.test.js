const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.resolve(__dirname, '..', 'generate-pages-redirect-bridge.js');
const { generateBridge } = require(scriptPath);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-bridge-'));
const sitemapPath = path.join(fixtureRoot, 'sitemap.xml');
const current = 'https://example.github.io/agentic-awesome-skills/';
const legacy = 'https://example.github.io/antigravity-awesome-skills/';

function sitemap(locations) {
  return `<?xml version="1.0"?><urlset>${locations.map((location) => `<url><loc>${location}</loc></url>`).join('')}</urlset>`;
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
  const outputOne = path.join(fixtureRoot, '.codex', 'bridge-one');
  const manifest = generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath,
    outputDirectory: outputOne,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  });
  assert.strictEqual(manifest.route_count, 4);
  assert.strictEqual(manifest.redirects.length, 4);
  assert.strictEqual(new Set(manifest.redirects.map((redirect) => redirect.from)).size, 4);
  assert.strictEqual(new Set(manifest.redirects.map((redirect) => redirect.output_file)).size, 4);

  for (const relative of [
    'antigravity-awesome-skills/index.html',
    'antigravity-awesome-skills/plugins/index.html',
    'antigravity-awesome-skills/topics/github-ai-skills-repository/index.html',
    'antigravity-awesome-skills/skill/brainstorming/index.html',
  ]) {
    assert(fs.existsSync(path.join(outputOne, relative)), `missing generated route: ${relative}`);
  }
  const pluginHtml = fs.readFileSync(path.join(outputOne, 'antigravity-awesome-skills/plugins/index.html'), 'utf8');
  assert.match(pluginHtml, /http-equiv="refresh" content="0; url=https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/"/);
  assert.match(pluginHtml, /rel="canonical" href="https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/"/);
  assert.match(pluginHtml, /<a href="https:\/\/example\.github\.io\/agentic-awesome-skills\/plugins\/">/);
  assert.strictEqual((fs.readFileSync(path.join(outputOne, 'antigravity-awesome-skills/sitemap.xml'), 'utf8').match(/<loc>/g) || []).length, 4);

  const outputTwo = path.join(fixtureRoot, '.codex', 'bridge-two');
  generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath,
    outputDirectory: outputTwo,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  });
  assert.deepStrictEqual(readTree(outputTwo), readTree(outputOne), 'identical input produces byte-identical output');

  assert.throws(() => generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath,
    outputDirectory: outputOne,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  }), /output path already exists/);

  const foreignSitemap = path.join(fixtureRoot, 'foreign.xml');
  fs.writeFileSync(foreignSitemap, sitemap([current, 'https://attacker.example/skill/escape/']), 'utf8');
  assert.throws(() => generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath: foreignSitemap,
    outputDirectory: path.join(fixtureRoot, '.codex', 'foreign'),
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 2,
  }), /outside the current HTTPS identity/);

  const duplicateSitemap = path.join(fixtureRoot, 'duplicate.xml');
  fs.writeFileSync(duplicateSitemap, sitemap([current, current]), 'utf8');
  assert.throws(() => generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath: duplicateSitemap,
    outputDirectory: path.join(fixtureRoot, '.codex', 'duplicate'),
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 2,
  }), /duplicate/);

  const doubleEncodedSitemap = path.join(fixtureRoot, 'double-encoded.xml');
  fs.writeFileSync(doubleEncodedSitemap, sitemap([current, `${current}skill/&amp;lt;escape/`]), 'utf8');
  assert.throws(() => generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath: doubleEncodedSitemap,
    outputDirectory: path.join(fixtureRoot, '.codex', 'double-encoded'),
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 2,
  }), /unsafe path segment/, 'XML entities must be decoded exactly once');

  const trackedOutput = path.join(fixtureRoot, 'apps', 'web-app', 'public', 'bridge');
  assert.throws(() => generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath,
    outputDirectory: trackedOutput,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  }), /only under ignored \.codex/);

  const symlinkRepo = path.join(fixtureRoot, 'symlink-repo');
  const trackedPublic = path.join(symlinkRepo, 'apps', 'web-app', 'public');
  fs.mkdirSync(trackedPublic, { recursive: true });
  const symlinkSitemap = path.join(symlinkRepo, 'sitemap.xml');
  fs.writeFileSync(symlinkSitemap, sitemap(locations), 'utf8');
  fs.symlinkSync(trackedPublic, path.join(symlinkRepo, '.codex'));
  assert.throws(() => generateBridge({
    repoRoot: symlinkRepo,
    sitemapPath: symlinkSitemap,
    outputDirectory: path.join(symlinkRepo, '.codex', 'bridge'),
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  }), /symlink|physical output/);
  assert(!fs.existsSync(path.join(trackedPublic, 'bridge')), 'a .codex symlink cannot redirect writes into tracked public files');

  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-outside-'));
  try {
    fs.symlinkSync(trackedPublic, path.join(outsideRoot, 'linked-public'));
    assert.throws(() => generateBridge({
      repoRoot: symlinkRepo,
      sitemapPath: symlinkSitemap,
      outputDirectory: path.join(outsideRoot, 'linked-public', 'bridge'),
      currentBase: current,
      legacyBase: legacy,
      expectedRoutes: 4,
    }), /physical output resolves inside the repository/);
    assert(!fs.existsSync(path.join(trackedPublic, 'bridge')));
  } finally {
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }

  const sentinelDirectory = path.join(path.dirname(outputOne), `.${path.basename(outputOne)}.${process.pid}.sentinel`);
  fs.mkdirSync(sentinelDirectory);
  fs.writeFileSync(path.join(sentinelDirectory, 'KEEP'), 'owned by another process', 'utf8');
  const outputThree = path.join(fixtureRoot, '.codex', 'bridge-three');
  generateBridge({
    repoRoot: fixtureRoot,
    sitemapPath,
    outputDirectory: outputThree,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 4,
  });
  assert.strictEqual(fs.readFileSync(path.join(sentinelDirectory, 'KEEP'), 'utf8'), 'owned by another process');

  const cliOutput = path.join(fixtureRoot, '.codex', 'cli');
  const cli = spawnSync(process.execPath, [
    scriptPath,
    '--sitemap', sitemapPath,
    '--output', cliOutput,
    '--current-base', current,
    '--legacy-base', legacy,
    '--expected-routes', '4',
  ], { encoding: 'utf8' });
  assert.strictEqual(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /Generated 4 redirect pages/);

  const missingOutput = spawnSync(process.execPath, [scriptPath, '--sitemap', sitemapPath], { encoding: 'utf8' });
  assert.strictEqual(missingOutput.status, 1);
  assert.match(missingOutput.stderr, /--output is required/);

  console.log('generate_pages_redirect_bridge tests passed');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
