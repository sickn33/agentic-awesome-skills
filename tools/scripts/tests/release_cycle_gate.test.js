const assert=require('node:assert/strict');
const gate=require('../release_cycle_gate.cjs');
const sha='a'.repeat(40), repo='sickn33/agentic-awesome-skills';
const pr={number:1,state:'closed',merged:false,base:{ref:'main',repo:{full_name:repo}},head:{sha},closed_at:'2026-10-22T12:00:00Z'};
const comment={user:{login:'sickn33',type:'User'},body:`${gate.MARKER}${sha} -->\nSuperseded by the reviewed owner consolidation #123.`,created_at:'2026-10-22T11:00:00Z',updated_at:'2026-10-22T11:00:00Z'};
assert.doesNotThrow(()=>gate.resolvedPull(pr,[comment],()=>{}));
for(const comments of [[],[{...comment,body:'<!-- nested <!-- prefix -->'+comment.body}],[{...comment,updated_at:'2026-10-22T13:00:00Z'}],[{...comment,user:{login:'contributor'}}],[{...comment,body:'Unbound reason that cannot authorize closure'}],[{...comment,created_at:'2026-10-22T13:00:00Z'}],[{...comment,body:`${gate.MARKER}${'b'.repeat(40)} -->\nWrong head rationale with enough text.`}]]) assert.throws(()=>gate.resolvedPull(pr,comments,()=>{}),/rationale/);
assert.throws(()=>gate.resolvedPull({...pr,state:'open'},[comment],()=>{}),/still open/);
assert.throws(()=>gate.resolvedPull({...pr,merged:true,merge_commit_sha:sha},[],()=>{throw Error('not ancestor');}),/not ancestor/);
const proof={schemaVersion:1,repository:repo,version:'20.0.0',main:sha,prs:[1],pulls:[{number:1,head:sha,merge:null,closedAt:pr.closed_at}],completedAt:'2026-10-22T12:01:00Z'};
let open=false, failed=false, skipped=false;
const deps={ancestor:()=>{},gh:args=>{
 const url=args.at(-1);
 if(url.endsWith('/pulls/1'))return {...pr,state:open?'open':'closed'};
 if(url.includes('/comments'))return [[comment]];
 if(url.includes('/jobs?'))return [{jobs:[{name:'main-validation-and-sync',conclusion:'success',steps:[{name:'Validate protected source diff with ephemeral snapshots',conclusion:skipped?'skipped':'success'}]}]}];
 return [{workflow_runs:['ci.yml','codeql.yml'].map((name,i)=>({id:i+1,path:'.github/workflows/'+name,head_sha:sha,head_branch:'main',event:'push',status:'completed',conclusion:failed?'failure':'success'}))}];
}};
assert.doesNotThrow(()=>gate.validateProof(proof,'20.0.0',deps));
for(const invalid of [null,{...proof,completedAt:null},{...proof,prs:[1,1]},{...proof,repository:'other/repo'}])assert.throws(()=>gate.validateProof(invalid,'20.0.0',deps));
assert.throws(()=>gate.validateProof(proof,'20.1.0',deps));
open=true;assert.throws(()=>gate.validateProof(proof,'20.0.0',deps),/still open/);open=false;
failed=true;assert.throws(()=>gate.validateProof(proof,'20.0.0',deps),/failed/);failed=false;
skipped=true;assert.throws(()=>gate.validateProof(proof,'20.0.0',deps),/source validation/);
const fs=require('node:fs');
const workflow=fs.readFileSync(require.resolve('../release_workflow.js'),'utf8');
assert.ok(workflow.indexOf('cycleGate.prepareProof')<workflow.indexOf('["switch", "-c", releaseBranch]'));
assert.ok(workflow.indexOf("verifyFile(projectRoot, version)")<workflow.indexOf('["tag", tagName]'));
assert.throws(()=>gate.prepareProof('/unused','20.0.0'),/requires --state-dir/);
console.log('Release cycle gate rejects incomplete, reopened, undocumented, stale and failed evidence');
const os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const directory=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'aas-release-cycle-test-'));
try {
 fs.chmodSync(directory,0o700);
 const store=require('../../lib/maintenance-state').openStore(directory,root);
 assert.throws(()=>gate.prepareProof(root,'20.0.0',directory),/has not passed/);
 for(const state of [
  {completedAt:proof.completedAt,attempts:[{stage:'verify',success:false}]},
  {completedAt:proof.completedAt,attempts:[{stage:'align',success:true}]},
  {completedAt:proof.completedAt,repository:repo,scope:'source-maintenance-no-release',attempts:[{stage:'verify',success:true,result:{main:sha}}],prs:[1]},
 ]) {
  store.writeBatch('cycle',state);
  assert.throws(()=>gate.prepareProof(root,'20.0.0',directory),/has not passed|Main changed/);
 }
} finally {fs.rmSync(directory,{recursive:true,force:true});}
