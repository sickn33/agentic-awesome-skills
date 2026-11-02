'use strict';
const {execFileSync}=require('node:child_process');
const {openStore}=require('../lib/maintenance-state');
const SOURCE='sickn33/agentic-awesome-skills',LEGACY='sickn33/sickn33.github.io';
function finalize(root,version,directory,dependencies={}) {
 if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version||''))throw Error('Valid existing published version required');
 const run=dependencies.run||((args)=>execFileSync('gh',args,{cwd:root,encoding:'utf8',timeout:3600000,maxBuffer:16*1024**2}).trim());
 const json=args=>JSON.parse(run(args));
 const release=json(['api',`repos/${SOURCE}/releases/tags/v${version}`]);
 if(release.draft||release.tag_name!==`v${version}`)throw Error('Published release required; finalization never tags or publishes');
 const store=openStore(directory,root),unlock=store.acquireLock('finalize');
 try {
 const id=`finalize-${version}`,state=store.readBatch(id)||{version,startedAt:new Date().toISOString(),stages:[]};
 const save=()=>store.writeBatch(id,state);
 state.complete=false;save();
 const previousFinal=state.stages[3];
 if(previousFinal?.status==='passed') {
  const age=Date.now()-Date.parse(previousFinal.finishedAt);
  if(!Number.isFinite(age)||age<0||age>15*60*1000)throw Error('Final live proof expired; start a fresh private finalization state for a new complete public audit');
 }
 const stages=[{repo:SOURCE,workflow:'pages.yml',ref:`v${version}`,inputs:['deployment_target=release']},{repo:LEGACY,workflow:'legacy-redirect-sync.yml',ref:'main',inputs:['live_mode=all']},{repo:LEGACY,workflow:'legacy-redirect-sync.yml',ref:'main',inputs:['live_mode=all']},{repo:SOURCE,workflow:'release-final-verification.yml',ref:'main',inputs:[`version=${version}`]}];
 for(let index=0;index<stages.length;index++) {
  const stage=stages[index];let record=state.stages[index];
  if(record?.status==='dispatching')throw Error('Uncertain workflow dispatch: reconcile live run identity before resuming; never repeat write');
  if(record?.status==='failed')throw Error('Failed workflow requires diagnosis; no automatic rerun');
  if(!record){
   const before=json(['run','list','--repo',stage.repo,'--workflow',stage.workflow,'--event','workflow_dispatch','--limit','100','--json','databaseId']).map(r=>r.databaseId);
   const branch=stage.ref.startsWith('v')?`tags/${stage.ref}`:`heads/${stage.ref}`;
   let target=json(['api',`repos/${stage.repo}/git/ref/${branch}`]).object;
   for(let depth=0;target.type==='tag'&&depth<5;depth++)target=json(['api',`repos/${stage.repo}/git/tags/${target.sha}`]).object;
   if(target.type==='tag'||!/^[a-f0-9]{40}$/.test(target.sha||''))throw Error('Cannot resolve exact workflow commit');
   const expected=target.sha;
   record={...stage,expected,before,status:'dispatching',startedAt:new Date().toISOString()};state.stages.push(record);save();
   run(['workflow','run',stage.workflow,'--repo',stage.repo,'--ref',stage.ref,...stage.inputs.flatMap(i=>['-f',i])]);
   // Dispatch identity is reconciled read-only. Ambiguity is never resolved by guessing.
   const deadline=Date.now()+60000;let matches=[];
   do {matches=json(['run','list','--repo',stage.repo,'--workflow',stage.workflow,'--event','workflow_dispatch','--limit','100','--json','databaseId,headSha']).filter(r=>!before.includes(r.databaseId)&&r.headSha===expected);if(matches.length)break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);} while(Date.now()<deadline);
   if(matches.length!==1)throw Error('Cannot uniquely bind dispatched run; reconcile before resume');
   record.run=matches[0].databaseId;record.status='running';save();
  }
  // Revalidate successful records too; a rerun or changed conclusion invalidates completion.
  let proof=json(['api',`repos/${stage.repo}/actions/runs/${record.run}`]);
  if(proof.status!=='completed'){run(['run','watch',String(record.run),'--repo',stage.repo,'--exit-status']);proof=json(['api',`repos/${stage.repo}/actions/runs/${record.run}`]);}
  if(proof.head_sha!==record.expected||proof.repository?.full_name!==stage.repo||proof.path?.split('@')[0]!==`.github/workflows/${stage.workflow}`||proof.event!=='workflow_dispatch'||proof.conclusion!=='success'){record.status='failed';save();throw Error('Exact dispatched workflow failed or identity changed');}
  record.status='passed';record.finishedAt ??= new Date().toISOString();record.lastVerifiedAt=new Date().toISOString();record.proof=proof;save();
 }
 state.complete=true;state.finishedAt=new Date().toISOString();save();return state;
 } finally {unlock();}
}
module.exports={finalize};
if(require.main===module){const [version,directory]=process.argv.slice(2);try{console.log(JSON.stringify(finalize(process.cwd(),version,directory),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
