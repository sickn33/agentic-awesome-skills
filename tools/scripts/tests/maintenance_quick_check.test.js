'use strict';
const assert = require('node:assert/strict');
const { plan } = require('../maintenance_quick_check.cjs');
assert.equal(plan(['skills/example/SKILL.md']).length, 0);
assert.equal(plan(['README.md', 'tools/scripts/sync_repo_metadata.py']).length, 1);
assert(plan(['apps/web-app/src/components/CatalogNavigation.tsx'])[0][1].includes('src/pages/__tests__/Landing.test.tsx'));
assert.equal(plan(['.github/workflows/ci.yml']).length, 2);
assert.equal(plan(['README.md; touch /tmp/unsafe']).length, 0);
console.log('Quick checks are scoped, deduplicated and do not replace full validation.');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-quick-check-'));
try {
  const git = args => execFileSync('git', args, {cwd:tmp,encoding:'utf8'}).trim();
  git(['init','-q']);git(['config','user.email','fixture@example.invalid']);git(['config','user.name','Fixture']);
  fs.mkdirSync(path.join(tmp,'tools/scripts'),{recursive:true});
  fs.writeFileSync(path.join(tmp,'tools/scripts/run-python.js'),"require('fs').writeFileSync('called','yes');process.exit(3)");
  fs.writeFileSync(path.join(tmp,'README.md'),'before');git(['add','.']);git(['commit','-qm','base']);const base=git(['rev-parse','HEAD']);
  fs.writeFileSync(path.join(tmp,'README.md'),'after');git(['add','.']);git(['commit','-qm','head']);const head=git(['rev-parse','HEAD']);
  const run=()=>spawnSync(process.execPath,[path.resolve(__dirname,'../maintenance_quick_check.cjs'),'--base',base,'--head',head],{cwd:tmp,encoding:'utf8'});
  const failed=run();assert.notEqual(failed.status,0);assert.match(failed.stderr,/First failing/);assert.equal(fs.readFileSync(path.join(tmp,'called'),'utf8'),'yes');
  fs.unlinkSync(path.join(tmp,'called'));fs.writeFileSync(path.join(tmp,'README.md'),'dirty');assert.match(run().stderr,/Commit source/);assert(!fs.existsSync(path.join(tmp,'called')));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
