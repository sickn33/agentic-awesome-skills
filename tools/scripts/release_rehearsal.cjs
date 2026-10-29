'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCommand, prepareRelease } = require('./release_workflow');

// This is an actual candidate build in a disposable clone, not a command plan.
// All cycle/protection checks remain in the shared production preparation path.
function rehearse(source, version, stateDir, dependencies = {}) {
  if (!version || !stateDir || !path.isAbsolute(stateDir))
    throw Error('Usage: npm run release:rehearse -- X.Y.Z --state-dir /absolute/private/completed-cycle');
  const run = dependencies.run || runCommand;
  const prepare = dependencies.prepare || prepareRelease;
  const status = run('git', ['status', '--porcelain'], source, { capture: true });
  if (status) throw Error('Rehearsal requires a clean committed source checkout');
  const head = run('git', ['rev-parse', 'HEAD'], source, { capture: true });
  const temporary = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'aas-release-rehearsal-'));
  const clone = path.join(temporary, 'source');
  try {
    run('git', ['clone', '--no-hardlinks', '--no-checkout', '--', source, clone], temporary);
    run('git', ['checkout', '-B', 'main', head], clone);
    run('git', ['config', 'user.name', 'AAS local rehearsal'], clone);
    run('git', ['config', 'user.email', 'rehearsal@localhost'], clone);
    // Remove push destinations before running any candidate-controlled script.
    run('git', ['remote', 'remove', 'origin'], clone);
    const privateState = path.join(temporary, 'state');
    fs.mkdirSync(privateState, { mode: 0o700 });
    const fd = fs.openSync(path.join(stateDir, 'batch.cycle.json'), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024 || (stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) throw Error('Unsafe cycle state');
      fs.writeFileSync(path.join(privateState, 'batch.cycle.json'), fs.readFileSync(fd), { mode: 0o600 });
    } finally { fs.closeSync(fd); }
    run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], clone);
    const state = JSON.parse(fs.readFileSync(path.join(privateState, 'batch.cycle.json'), 'utf8'));
    const verifiedMain = state.attempts?.at(-1)?.result?.main;
    if (!/^[a-f0-9]{40}$/.test(verifiedMain || '')) throw Error('Missing completed cycle main');
    run('git', ['merge-base', '--is-ancestor', verifiedMain, head], clone);
    run('git', ['checkout', '-B', 'main', verifiedMain], clone);
    const cycleProof = (dependencies.gate || require('./release_cycle_gate.cjs')).prepareProof(clone, version, privateState);
    run('git', ['checkout', '-B', 'main', head], clone);
    const result = prepare(clone, version, privateState, { localOnly: true, cycleProof });
    if (run('git', ['remote'], clone, { capture: true })) throw Error('Rehearsal created a remote');
    if (run('git', ['rev-parse', 'HEAD'], source, { capture: true }) !== head ||
        run('git', ['status', '--porcelain'], source, { capture: true }))
      throw Error('Source checkout changed during rehearsal');
    console.log(JSON.stringify({ rehearsal: true, publicationAuthority: false,
      sourceCommit: head, ...result, platform: process.platform, arch: process.arch }, null, 2));
    return result;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
module.exports = { rehearse };
