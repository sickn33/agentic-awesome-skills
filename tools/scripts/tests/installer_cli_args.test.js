const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const packageVersion = require('../../../package.json').version;

const installerPath = path.resolve(__dirname, '..', '..', 'bin', 'install.js');
const installer = require(installerPath);

assert.throws(() => installer.parseArgs(['--path']), /requires a value/i);
assert.throws(() => installer.parseArgs(['--path', '--codex']), /requires a value/i);
assert.throws(() => installer.parseArgs(['--unknown']), /unknown option/i);
assert.throws(() => installer.parseArgs(['status']), /unknown option or command/i);

const release = installer.parseArgs(['--release', '14.0.0']);
assert.strictEqual(release.versionArg, '14.0.0');
assert.strictEqual(release.versionInfo, false);

const exactPreview = installer.parseArgs([
  '--codex',
  '--skills',
  'frontend-design,game-development/2d-games',
  '--dry-run',
]);
assert.strictEqual(exactPreview.skillsArg, 'frontend-design,game-development/2d-games');
assert.strictEqual(exactPreview.dryRun, true);
assert.strictEqual(installer.parseArgs(['--all', '--dry-run']).installAll, true);
assert.strictEqual(installer.parseArgs(['audit', '--skills', 'frontend-design']).auditOnly, true);
assert.deepStrictEqual(
  installer.parseExactSkillArg(exactPreview.skillsArg),
  ['frontend-design', 'game-development/2d-games'],
);
assert.throws(
  () => installer.parseExactSkillArg('frontend-design,,backend-dev-guidelines'),
  /non-empty exact skill/i,
);

const version = spawnSync(process.execPath, [installerPath, '--version'], { encoding: 'utf8' });
assert.strictEqual(version.status, 0, version.stderr);
assert.strictEqual(version.stdout.trim(), packageVersion);
assert.doesNotMatch(version.stdout, /Cloning repository/i);

const invalid = spawnSync(process.execPath, [installerPath, '--unknown'], { encoding: 'utf8' });
assert.notStrictEqual(invalid.status, 0);
assert.match(invalid.stderr, /unknown option/i);

assert.throws(
  () => installer.assertExplicitInstallSelection(
    installer.parseArgs(['--all', '--skills', 'frontend-design']),
    installer.buildInstallSelectors({}),
    ['frontend-design'],
  ),
  /--all cannot be combined/i,
);
assert.throws(
  () => installer.assertExplicitInstallSelection(
    installer.parseArgs(['audit']),
    installer.buildInstallSelectors({}),
    [],
  ),
  /audit command requires --skills/i,
);

const antigravityTarget = [{ name: 'Antigravity', path: '/tmp/.agents/skills' }];
assert.throws(
  () => installer.assertAntigravityInstallSelection(
    installer.parseArgs(['--antigravity']),
    antigravityTarget,
    installer.buildInstallSelectors({}),
    [],
  ),
  /installation stopped before cloning or changing files/i,
);
assert.doesNotThrow(() => installer.assertAntigravityInstallSelection(
  installer.parseArgs(['--antigravity', '--skills', 'frontend-design']),
  antigravityTarget,
  installer.buildInstallSelectors({}),
  ['frontend-design'],
));
assert.doesNotThrow(() => installer.assertAntigravityInstallSelection(
  installer.parseArgs(['--antigravity', '--category', 'development']),
  antigravityTarget,
  installer.buildInstallSelectors({ categoryArg: 'development' }),
  [],
));
assert.doesNotThrow(() => installer.assertAntigravityInstallSelection(
  installer.parseArgs(['--antigravity', '--all']),
  antigravityTarget,
  installer.buildInstallSelectors({}),
  [],
));
assert.doesNotThrow(() => installer.assertAntigravityInstallSelection(
  installer.parseArgs(['--codex']),
  [{ name: 'Codex CLI', path: '/tmp/.codex/skills' }],
  installer.buildInstallSelectors({}),
  [],
));

const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-antigravity-block-'));
try {
  for (const args of [[], ['--antigravity']]) {
    const blocked = spawnSync(process.execPath, [installerPath, ...args], {
      encoding: 'utf8',
      env: { ...process.env, HOME: isolatedHome },
    });
    assert.strictEqual(blocked.status, 1);
    assert.match(blocked.stderr, /context.*crash loop/i);
    assert.match(blocked.stderr, /AAS Core MCP/i);
    assert.match(blocked.stderr, /docs\/users\/aas-core\.md/i);
    assert.match(blocked.stderr, /--antigravity --skills skill-id-1,skill-id-2 --dry-run/i);
    assert.match(blocked.stderr, /--antigravity --all/i);
    assert.match(blocked.stderr, /windows-truncation-recovery\.md/i);
    assert.doesNotMatch(`${blocked.stdout}\n${blocked.stderr}`, /Cloning repository/i);
  }
  assert.strictEqual(fs.existsSync(path.join(isolatedHome, '.agents')), false);
} finally {
  fs.rmSync(isolatedHome, { recursive: true, force: true });
}
