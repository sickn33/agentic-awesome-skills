'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {finalize}=require('../release_finalize.cjs');
const directory=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'aas-finalize-test-'));fs.chmodSync(directory,0o700);
let count=0,dispatch=0;const sha='a'.repeat(40);
function run(a){
 if(a[0]==='api'&&a[1].includes('/actions/runs/')){const repo=a[1].split('/').slice(1,3).join('/');const n=Number(a[1].split('/').at(-1));return JSON.stringify({status:'completed',conclusion:'success',head_sha:sha,event:'workflow_dispatch',repository:{full_name:repo},path:'.github/workflows/'+['pages.yml','legacy-redirect-sync.yml','legacy-redirect-sync.yml','release-final-verification.yml'][n-1]});}
 if(a[0]==='api')return JSON.stringify(a[1].includes('/releases/')?{draft:false,tag_name:'v1.2.3'}:{object:{sha}});
 if(a[0]==='workflow'){dispatch++;count++;return '';}
 if(a[1]==='list')return JSON.stringify(count?[{databaseId:count,headSha:sha}]:[]);
 if(a[1]==='view')return JSON.stringify({status:'completed',conclusion:'success',headSha:sha,event:'workflow_dispatch'});
 throw Error('Unexpected invocation '+JSON.stringify(a));
}
try{
 const original=finalize(process.cwd(),'1.2.3',directory,{run});assert.equal(original.complete,true);assert.equal(dispatch,4);
 const resumed=finalize(process.cwd(),'1.2.3',directory,{run});assert.equal(resumed.complete,true);assert.equal(dispatch,4,'resume must not dispatch again');
 assert.deepEqual(resumed.stages.map(s=>s.finishedAt),original.stages.map(s=>s.finishedAt),'resume must preserve measured completion timestamps');
 const unlock=require('../../lib/maintenance-state').openStore(directory,process.cwd()).acquireLock('finalize');
 try{assert.throws(()=>finalize(process.cwd(),'1.2.3',directory,{run}),/locked/i);}finally{unlock();}
 const {record}=require('../maintenance_activity.cjs');record(process.cwd(),directory,'start','review');
 assert.throws(()=>record(process.cwd(),directory,'start','review'),/Unpaired/);record(process.cwd(),directory,'end','review');
 const stored=require('../../lib/maintenance-state').openStore(directory,process.cwd());const stale=stored.readBatch('finalize-1.2.3');stale.stages[3].finishedAt='2000-01-01T00:00:00Z';stored.writeBatch('finalize-1.2.3',stale);
 assert.throws(()=>finalize(process.cwd(),'1.2.3',directory,{run}),/expired/);assert.equal(dispatch,4);assert.equal(stored.readBatch('finalize-1.2.3').complete,false);
 const other=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'aas-finalize-uncertain-'));fs.chmodSync(other,0o700);
 try {const uncertain=a=>a[0]==='workflow'?(()=>{throw Error('transport unknown')})():run(a);
 assert.throws(()=>finalize(process.cwd(),'1.2.3',other,{run:uncertain}),/transport/);
 assert.throws(()=>finalize(process.cwd(),'1.2.3',other,{run}),/Uncertain/);
 }finally{fs.rmSync(other,{recursive:true,force:true});}
}finally{fs.rmSync(directory,{recursive:true,force:true});}
console.log('Exact-run continuation, idempotence, activity pairing and unknown-write stop passed');
