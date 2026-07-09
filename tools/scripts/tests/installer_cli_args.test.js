const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const installerPath = path.resolve(__dirname, '..', '..', 'bin', 'install.js');
const installer = require(installerPath);

assert.throws(() => installer.parseArgs(['--path']), /requires a value/i);
assert.throws(() => installer.parseArgs(['--path', '--codex']), /requires a value/i);
assert.throws(() => installer.parseArgs(['--unknown']), /unknown option/i);
assert.throws(() => installer.parseArgs(['status']), /unknown option or command/i);

const release = installer.parseArgs(['--release', '14.0.0']);
assert.strictEqual(release.versionArg, '14.0.0');
assert.strictEqual(release.versionInfo, false);

const version = spawnSync(process.execPath, [installerPath, '--version'], { encoding: 'utf8' });
assert.strictEqual(version.status, 0, version.stderr);
assert.match(version.stdout, /^14\.0\.0\s*$/);
assert.doesNotMatch(version.stdout, /Cloning repository/i);

const invalid = spawnSync(process.execPath, [installerPath, '--unknown'], { encoding: 'utf8' });
assert.notStrictEqual(invalid.status, 0);
assert.match(invalid.stderr, /unknown option/i);
