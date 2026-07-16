const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.resolve(__dirname, '..', 'audit_search_migration_readiness.js');
const { auditMigrationReadiness } = require(scriptPath);

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function fixture({ currentProperties = true, legacyOnly = false, malformed = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-readiness-'));
  const current = 'https://example.github.io/agentic-awesome-skills/';
  const legacy = 'https://example.github.io/antigravity-awesome-skills/';
  fs.mkdirSync(path.join(root, 'apps/web-app/public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apps/web-app/public/sitemap.xml'), `<?xml version="1.0"?><urlset><url><loc>${current}</loc></url><url><loc>${current}plugins/</loc></url></urlset>`);
  writeJson(path.join(root, 'package.json'), { name: 'agentic-awesome-skills', version: '14.2.0' });
  writeJson(path.join(root, 'legacy-package.json'), { name: 'antigravity-awesome-skills', version: '13.13.0', deprecated: 'Moved to agentic-awesome-skills' });
  writeJson(path.join(root, 'redirects.json'), { redirects: [
    { from: legacy, to: current }, { from: `${legacy}plugins/`, to: `${current}plugins/` },
  ] });
  const property = legacyOnly ? legacy : current;
  const snapshot = new Date().toISOString().slice(0, 10);
  if (currentProperties || legacyOnly) {
    for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
      const filePath = path.join(root, '.codex/traffic-snapshots', snapshot, filename);
      if (malformed) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, '{broken');
      } else {
        writeJson(filePath, {
          status: 'success',
          captured_at_utc: `${new Date().toISOString().slice(0, 10)}T12:00:00Z`,
          dashboard_url: filename.startsWith('google')
            ? `https://search.google.com/search-console/performance?resource_id=${encodeURIComponent(property)}`
            : `https://www.bing.com/webmasters/searchperf?siteUrl=${encodeURIComponent(property)}`,
          totals: { clicks: 1, impressions: 10 },
        });
      }
    }
  }
  return { root, current, legacy };
}

function options(root) {
  return {
    repoRoot: root,
    redirectManifestPath: 'redirects.json',
    legacyPackagePath: 'legacy-package.json',
    currentPagesUrl: 'https://example.github.io/agentic-awesome-skills/',
    legacyPagesUrl: 'https://example.github.io/antigravity-awesome-skills/',
    currentPackageName: 'agentic-awesome-skills',
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}

{
  const { root } = fixture();
  const snapshot = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    writeJson(path.join(root, '.codex/traffic-snapshots', snapshot, filename), {
      status: 'success',
      captured_at_utc: `${snapshot}T12:00:00Z`,
      dashboard_url: `https://attacker.example/?next=${encodeURIComponent('https://example.github.io/agentic-awesome-skills/')}`,
      totals: { clicks: 1, impressions: 10 },
    });
  }
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'an unrelated URL containing the current property cannot pass');
  assert(report.failed_checks.includes('google_search_console'));
}

{
  const { root, current, legacy } = fixture();
  const snapshot = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    writeJson(path.join(root, '.codex/traffic-snapshots', snapshot, filename), {
      status: 'success',
      captured_at_utc: `${snapshot}T12:00:00Z`,
      source_property: current,
      dashboard_url: filename.startsWith('google')
        ? `https://search.google.com/search-console/performance?resource_id=${encodeURIComponent(legacy)}`
        : `https://www.bing.com/webmasters/searchperf?siteUrl=${encodeURIComponent(legacy)}`,
      totals: { clicks: 1, impressions: 10 },
    });
  }
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'conflicting observed property signals cannot pass');
  assert.strictEqual(report.checks.google_search_console.rejected_current_evidence[0].property_conflict, true);
}

{
  const { root, current } = fixture();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    writeJson(path.join(root, '.codex/traffic-snapshots', tomorrow, filename), {
      status: 'success',
      captured_at_utc: `${tomorrow}T12:00:00Z`,
      dashboard_url: filename.startsWith('google')
        ? `https://search.google.com/search-console/performance?resource_id=${encodeURIComponent(current)}`
        : `https://www.bing.com/webmasters/searchperf?siteUrl=${encodeURIComponent(current)}`,
      totals: { clicks: 1, impressions: 10 },
    });
  }
  fs.rmSync(path.join(root, '.codex/traffic-snapshots', today), { recursive: true, force: true });
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'evidence after the as-of date cannot pass');
  assert.strictEqual(report.checks.google_search_console.rejected_current_evidence[0].freshness.reason, 'capture is in the future');
}

{
  const { root, current } = fixture();
  const snapshot = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    writeJson(path.join(root, '.codex/traffic-snapshots', snapshot, filename), {
      status: 'success',
      captured_at_utc: `${snapshot}T12:00:00Z`,
      dashboard_url: `https://attacker.example/${filename}?${filename.startsWith('google') ? 'resource_id' : 'siteUrl'}=${encodeURIComponent(current)}`,
      totals: { clicks: 1, impressions: 10 },
    });
  }
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'recognized property params on an attacker host cannot pass');
  assert.strictEqual(report.checks.google_search_console.rejected_current_evidence.length, 0);
}

{
  const { root, current, legacy } = fixture();
  const snapshot = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    const base = filename.startsWith('google')
      ? 'https://search.google.com/search-console/performance'
      : 'https://www.bing.com/webmasters/searchperf';
    writeJson(path.join(root, '.codex/traffic-snapshots', snapshot, filename), {
      status: 'success',
      captured_at_utc: `${snapshot}T12:00:00Z`,
      dashboard_url: `${base}?resource_id=${encodeURIComponent(current)}&siteUrl=${encodeURIComponent(legacy)}`,
      totals: { clicks: 1, impressions: 10 },
    });
  }
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'conflicting recognized dashboard property params cannot pass');
}

{
  const { root } = fixture();
  const snapshot = new Date().toISOString().slice(0, 10);
  for (const filename of ['google-search-console.json', 'bing-webmaster-search-performance.json']) {
    const filePath = path.join(root, '.codex/traffic-snapshots', snapshot, filename);
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    payload.totals = { clicks: 0.5, impressions: 1.25 };
    writeJson(filePath, payload);
  }
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'fractional count metrics cannot satisfy evidence completeness');
}

{
  const { root } = fixture();
  const redirects = JSON.parse(fs.readFileSync(path.join(root, 'redirects.json'), 'utf8'));
  redirects.redirects.push(redirects.redirects[0]);
  writeJson(path.join(root, 'redirects.json'), redirects);
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready', 'duplicate redirects violate exact-once coverage');
  assert.strictEqual(report.checks.redirect_manifest_coverage.duplicates.length, 1);
}

{
  const { root } = fixture();
  fs.writeFileSync(path.join(root, 'apps/web-app/public/sitemap.xml'), '<?xml version="1.0"?><urlset><url><loc>https://evil.example/not-the-project/</loc></url></urlset>');
  writeJson(path.join(root, 'package.json'), { name: 'unrelated-package', version: '1.0.0' });
  const report = auditMigrationReadiness({ ...options(root), currentPagesUrl: undefined, legacyPagesUrl: undefined, currentPackageName: undefined });
  assert.strictEqual(report.status, 'not_ready', 'defaults stay anchored to the real AAS identities');
  assert(report.failed_checks.includes('current_sitemap_identity'));
  assert(report.failed_checks.includes('npm_identities'));
}

{
  const { root } = fixture();
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'ready');
  assert.deepStrictEqual(report.failed_checks, []);
  assert.strictEqual(report.checks.redirect_manifest_coverage.covered, 2);
}

{
  const { root } = fixture({ currentProperties: false });
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready');
  assert(report.failed_checks.includes('google_search_console'));
  assert(report.failed_checks.includes('bing_webmaster'));
}

{
  const { root } = fixture({ currentProperties: false, legacyOnly: true });
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready');
  assert.strictEqual(report.checks.google_search_console.legacy_evidence.length, 1);
  assert.strictEqual(report.checks.google_search_console.current_evidence.length, 0);
}

{
  const { root } = fixture({ malformed: true });
  const report = auditMigrationReadiness(options(root));
  assert.strictEqual(report.status, 'not_ready');
  assert(report.errors.some((error) => error.includes('google-search-console.json')));
}

{
  const { root } = fixture();
  const output = path.join(root, 'out.json');
  const command = [
    scriptPath,
    '--repo-root', root,
    '--redirect-manifest', 'redirects.json',
    '--legacy-package', 'legacy-package.json',
    '--current-pages-url', 'https://example.github.io/agentic-awesome-skills/',
    '--legacy-pages-url', 'https://example.github.io/antigravity-awesome-skills/',
    '--current-package-name', 'agentic-awesome-skills',
    '--as-of', new Date().toISOString().slice(0, 10),
    '--output', output,
  ];
  const first = spawnSync(process.execPath, command, { encoding: 'utf8' });
  const firstFile = fs.readFileSync(output, 'utf8');
  const second = spawnSync(process.execPath, command, { encoding: 'utf8' });
  assert.strictEqual(first.status, 0, first.stderr);
  assert.strictEqual(second.status, 0, second.stderr);
  assert.strictEqual(fs.readFileSync(output, 'utf8'), firstFile);
}

console.log('audit_search_migration_readiness tests passed');
