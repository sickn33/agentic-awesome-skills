const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
(async () => {
 const scripts = path.resolve(__dirname, '../../../skills/competitor-analysis/scripts');
 const util = await import(path.join(scripts,'md_utils.mjs'));
 const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'competitor-review-')));
 try {
  assert.equal(util.checkedPath(temp),temp);
  assert.throws(()=>util.insidePath(temp,'../escape'));
  fs.symlinkSync(temp,path.join(temp,'link'));
  assert.throws(()=>util.insidePath(temp,'link','output.html'));
  assert.throws(()=>util.parseFrontmatter('---\nname: one\nname: two\n---\n'));
  assert.throws(()=>util.parseFrontmatter('---\nconstructor: bad\n---\n'));
  assert.equal(util.parseFrontmatter('---\nname: "A: \\"quoted\\""\n---\n'.replaceAll('\\\\','\\')).name,'A: "quoted"');
  for(const u of ['file:///etc/passwd','http://127.0.0.1','http://user:pass@example.com','http://intranet.local']) assert.throws(()=>util.publicURL(u));
  fs.writeFileSync(path.join(temp,'rival.md'),'---\ncompetitor_name: Rival\nwebsite: https://example.com\ntagline: =1+1\n---\n\n## Product\n'+ 'A factual synthetic product description. '.repeat(3));
  fs.writeFileSync(path.join(temp,'matrix.json'),JSON.stringify({features:[{name:'Secret moat'}],integrations:[],userCompany:{name:'Acme',features:{'Secret moat':true}},competitors:{rival:{features:{}}}}));
  const run = spawnSync(process.execPath,[path.join(scripts,'compile_report.mjs'),temp],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.match(fs.readFileSync(path.join(temp,'matrix.html'),'utf8'),/Not verified/);
  assert.doesNotMatch(fs.readFileSync(path.join(temp,'index.html'),'utf8'),/<span class="who">only you/);
  assert.match(fs.readFileSync(path.join(temp,'results.csv'),'utf8'),/'=1\+1/);
  fs.unlinkSync(path.join(temp,'index.html'));fs.symlinkSync(path.join(temp,'rival.md'),path.join(temp,'index.html'));
  const bad = spawnSync(process.execPath,[path.join(scripts,'compile_report.mjs'),temp],{encoding:'utf8'});
  assert.notEqual(bad.status,0); assert.match(bad.stderr,/Symlink/);
 } finally { fs.rmSync(temp,{recursive:true,force:true}); }
 console.log('competitor-analysis offline evidence/path regressions passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
