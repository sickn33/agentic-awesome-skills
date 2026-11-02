// AAS regression tests: local synthetic videos only; no Figma or provider access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./verify-motion.mjs', import.meta.url));
test('motion gate compares valid samples and rejects invalid/empty comparisons', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aas-motion-test-'));
  try {
    const video = join(dir, 'fixture.mp4');
    const made = spawnSync('ffmpeg', ['-v','error','-y','-f','lavfi','-i','testsrc2=size=64x64:rate=10:duration=0.8','-c:v','libx264','-pix_fmt','yuv420p',video], {encoding:'utf8'});
    assert.equal(made.status, 0, made.stderr);
    const run = (extra) => spawnSync(process.execPath, [script,'--reference',video,'--render',video,...extra], {encoding:'utf8',timeout:15000});
    const good = run(['--interval','0.2']);
    assert.equal(good.status,0,good.stderr); assert.match(good.stdout,/VERDICT: PASS/);
    const black = join(dir,'static.mp4');
    const madeBlack=spawnSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=black:s=64x64:r=10:d=0.8','-c:v','libx264',black],{encoding:'utf8'});
    assert.equal(madeBlack.status,0,madeBlack.stderr);
    const diverged=spawnSync(process.execPath,[script,'--reference',video,'--render',black,'--min-motion-psnr','40'],{encoding:'utf8',timeout:15000});
    assert.equal(diverged.status,1,diverged.stderr); assert.match(diverged.stdout,/VERDICT: FAIL/);
    for (const args of [['--interval','0'],['--interval','0.00001'],['--interval','-1'],['--interval','NaN'],['--interval','10'],['--min-motion-psnr','NaN']]) {
      const result = run(args); assert.notEqual(result.status,0,JSON.stringify(args)); assert.doesNotMatch(result.stdout,/VERDICT: PASS/);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
