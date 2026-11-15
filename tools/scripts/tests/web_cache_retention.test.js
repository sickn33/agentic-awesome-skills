'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compactCache } = require('../web_ci.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-cache-retention-'));
try {
  const hashes = Array.from({length: 20}, (_,i) => i.toString(16).padStart(16, '0'));
  for (const hash of hashes) for (const ext of ['json', 'tar.zst']) fs.writeFileSync(path.join(root, `${hash}.${ext}`), hash);
  fs.writeFileSync(path.join(root, 'unrelated'), 'keep');
  const result = compactCache(root, hashes.slice(0, 2)); assert.equal(result.entries, 16);
  for (const hash of hashes.slice(0,2)) assert.equal(fs.readFileSync(path.join(root, hash+'.tar.zst'),'utf8'),hash);
  assert.equal(fs.readFileSync(path.join(root,'unrelated'),'utf8'),'keep');
  assert.throws(()=>compactCache(root,['../escape']),/Invalid/);
  fs.symlinkSync('/tmp',path.join(root,'f'.repeat(16)+'.json'));
  assert.throws(()=>compactCache(root,hashes.slice(0,2)),/Unsafe/);
  console.log('Bounded cache preserves current hashes and unrelated files, rejects unsafe entries.');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
