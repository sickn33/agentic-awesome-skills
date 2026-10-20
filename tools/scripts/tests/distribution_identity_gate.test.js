const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');
const {createManifest}=require('../../lib/distribution-artifact');
const root=path.resolve(__dirname,'../../..');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'aas-identity-gate-'));
try {
 const payload=path.join(work,'payload/package');fs.mkdirSync(payload,{recursive:true});
 const artifacts=path.join(work,'artifacts');fs.mkdirSync(artifacts);fs.writeFileSync(path.join(artifacts,'site.tar'),'site fixture');
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const version=require('../../../package.json').version;
 const env={...process.env,GITHUB_REPOSITORY:'sickn33/agentic-awesome-skills'};
 const cli=mode=>spawnSync(process.execPath,['tools/scripts/distribution_manifest.cjs',mode,artifacts,'123','1'],{cwd:root,env,encoding:'utf8'});
 function tar(gitHead) {
  fs.writeFileSync(path.join(payload,'package.json'),JSON.stringify({name:'agentic-awesome-skills',version,...(gitHead===undefined?{}:{gitHead})}));
  execFileSync('tar',['-czf',path.join(artifacts,'package.tgz'),'-C',path.dirname(payload),'package']);
 }
 tar(commit);assert.equal(cli('create').status,0);assert.equal(cli('verify').status,0);
 const provenance=JSON.parse(fs.readFileSync(path.join(artifacts,'distribution.json')));
 for(const value of [undefined,null,'','short','f'.repeat(40)]) {
  tar(value);
  // Recompute valid digests: rejection must concern embedded identity, not bytes.
  fs.writeFileSync(path.join(artifacts,'distribution.json'),JSON.stringify(createManifest(artifacts,provenance)));
  const rejected=cli('verify');assert.notEqual(rejected.status,0,'a digest-valid candidate with missing/wrong gitHead must fail');assert.match(rejected.stderr,/gitHead/);
  fs.unlinkSync(path.join(artifacts,'distribution.json'));
  assert.notEqual(cli('create').status,0,'cannot seal a candidate without release identity');
 }
 console.log('Actual candidate CLI rejects missing/wrong embedded identity even with valid artifact digests');
} finally {fs.rmSync(work,{recursive:true,force:true});}
