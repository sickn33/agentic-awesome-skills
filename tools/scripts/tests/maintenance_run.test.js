'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {drive}=require('../maintenance_run.cjs');
const options={maxSteps:20,seconds:60,allowAlign:false};
const pr=n=>({number:n,state:'open',head:{sha:String(n).repeat(40)},mergeable_state:'clean'});
test('driver delegates intake, reviewed merge and final verification exactly once',async()=>{
 const state={prs:[1,2],attempts:[]},pulls=[pr(1),pr(2)],seen=[];
 const report=await drive(options,{snapshot:()=>({state,pulls}),execute:async(action,item)=>{
  seen.push([action,item?.pr]);
  const result={success:true};
  if(action==='intake')result.results=[{prNumber:item.pr,headSha:item.head,reviewAttested:true,prepared:true}];
  if(action==='merge')pulls.find(p=>p.number===item.pr).state='closed';
  state.attempts.push(result);return result;
 }});
 assert.equal(report.status,'complete');
 assert.deepEqual(seen,[['intake',1],['merge',1],['intake',2],['merge',2],['verify',undefined]]);
});
test('missing semantic review stops unchanged intake but permits independent work',async()=>{
 const state={prs:[1,2],attempts:[]},pulls=[pr(1),pr(2)],seen=[];
 const report=await drive(options,{snapshot:()=>({state,pulls}),execute:async(action,item)=>{
  seen.push([action,item.pr]);const result=action==='intake'?{success:true,results:[{prNumber:item.pr,headSha:item.head,prepared:true,reviewAttested:false}]}:{success:false,results:[{prNumber:item.pr,headSha:item.head,status:'blocked',failureCode:'REVIEW_REQUIRED'}]};state.attempts.push(result);return result;
 }});
 assert.equal(report.status,'attention-required');assert.deepEqual(seen,[['intake',1],['merge',1],['intake',2],['merge',2]]);
});
test('pending checks do not starve another ready reviewed PR',async()=>{
 const pulls=[pr(1),pr(2)],state={prs:[1,2],attempts:[{results:pulls.map(p=>({prNumber:p.number,headSha:p.head.sha,prepared:true}))}]};
 let merged;
 const report=await drive({...options,maxSteps:1},{snapshot:()=>({state,pulls}),checks:item=>[{state:item.pr===1?'pending':'success'}],execute:async(action,item)=>{assert.equal(action,'merge');merged=item.pr;return {success:true};}});
 assert.equal(merged,2);assert.equal(report.status,'budget-exhausted');
});
test('unknown write stops independent actions and cannot be retried by resume',async()=>{
 const state={prs:[1,2],attempts:[]},pulls=[pr(1),pr(2)];let count=0;
 const dependencies={snapshot:()=>({state,pulls}),execute:async()=>{count++;const result={success:false,failureCode:'WRITE_UNCERTAIN'};state.attempts.push(result);return result;}};
 assert.equal((await drive(options,dependencies)).status,'blocked');
 assert.equal((await drive(options,dependencies)).status,'blocked');assert.equal(count,1);
});
test('alignment is explicit, bound to observed head and at most once per PR per run',async()=>{
 const state={prs:[1],attempts:[]},pulls=[{...pr(1),mergeable_state:'behind'}];let count=0;
 const deps={snapshot:()=>({state,pulls}),execute:async(action,item)=>{count++;assert.equal(action,'align');assert.equal(item.head,'1'.repeat(40));return {success:true};}};
 assert.equal((await drive(options,deps)).status,'attention-required');assert.equal(count,0);
 assert.equal((await drive({...options,allowAlign:true},deps)).status,'attention-required');assert.equal(count,1);
});
test('pending exact-main CI can be observed again, failed CI cannot',async()=>{
 let count=0;
 const deps={snapshot:()=>({state:{prs:[],attempts:[]},pulls:[]}),sleep:async()=>{},execute:async()=>++count===1?{success:false,failureCode:'CI_WAIT_TIMEOUT'}:{success:true}};
 assert.equal((await drive(options,deps)).status,'complete');assert.equal(count,2);
 count=0;deps.execute=async()=>{count++;return {success:false,failureCode:'CI_FAILED'};};
 assert.equal((await drive(options,deps)).status,'blocked');assert.equal(count,1);
});
test('adopted evaluator changes stop the old process before another action',async()=>{
 let count=0;
 const report=await drive(options,{snapshot:()=>({state:{prs:[],attempts:[]},pulls:[],contract:String(count)}),sleep:async()=>{},execute:async()=>{count++;return {success:false,failureCode:'CI_WAIT_TIMEOUT'};}});
 assert.equal(report.status,'attention-required');assert.equal(count,1);
});
test('real cycle entry owns one lock, invalidates stale completion and preserves scope',async()=>{
 const {main}=require('../maintenance_cycle.cjs');
 const saved={cycle:{repository:'sickn33/agentic-awesome-skills',prs:[1],attempts:[],completedAt:'old'}};
 let locked=false,acquired=0;
 const store={readBatch:key=>structuredClone(saved[key]),writeBatch:(key,value)=>{saved[key]=structuredClone(value);},acquireLock:()=>{assert(!locked);locked=true;acquired++;return()=>{locked=false;};}};
 const originalLog=console.log,originalExit=process.exitCode;
 try {
  console.log=()=>{};
  const result=await main(['run','--state-dir','/fixture'],{openStore:()=>store,run:()=> 'contract',batch:{assertEffectiveMainProtection:()=>{}},gh:()=>({...pr(1),draft:true})});
  assert.equal(result.status,'attention-required');assert.equal(saved.cycle.completedAt,undefined);
  assert.deepEqual(saved.cycle.prs,[1]);assert.equal(acquired,1);assert(!locked);
 }finally{console.log=originalLog;process.exitCode=originalExit;}
});

test('fork approval wait delegates once to the sole gate instead of waiting for nonexistent checks',async()=>{
 const pulls=[pr(1)],state={prs:[1],attempts:[{results:[{prNumber:1,headSha:pr(1).head.sha,prepared:true}]}]},seen=[];
 const report=await drive(options,{snapshot:()=>({state,pulls}),checks:()=>[{state:'missing'}],approvalPending:item=>{assert.equal(item.head,pr(1).head.sha);return true;},sleep:()=>assert.fail('must not wait before approval'),execute:async(action,item)=>{
  seen.push(action);if(action==='merge'){assert.equal(item.pr,1);pulls[0].state='closed';}return {success:true};
 }});
 assert.equal(report.status,'complete');assert.deepEqual(seen,['merge','verify']);
});
test('ready PR precedes a fork waiting on workflow approval',async()=>{
 const pulls=[pr(1),pr(2)],state={prs:[1,2],attempts:[{results:pulls.map(p=>({prNumber:p.number,headSha:p.head.sha,prepared:true}))}]};
 let merged;
 await drive({...options,maxSteps:1},{snapshot:()=>({state,pulls}),checks:item=>[{state:item.pr===1?'missing':'success'}],approvalPending:()=>true,execute:async(action,item)=>{assert.equal(action,'merge');merged=item.pr;return {success:true};}});
 assert.equal(merged,2);
});
test('approval hints cannot bypass failed checks or retry an uncertain gate write',async()=>{
 const pulls=[pr(1)],state={prs:[1],attempts:[{results:[{prNumber:1,headSha:pr(1).head.sha,prepared:true}]}]};let invoked=0;
 const deps={snapshot:()=>({state,pulls}),checks:()=>[{state:'failed'}],approvalPending:()=>assert.fail('failed checks stop first'),execute:()=>assert.fail('failed checks cannot delegate')};
 assert.equal((await drive(options,deps)).status,'attention-required');
 deps.checks=()=>[{state:'missing'}];deps.approvalPending=()=>true;deps.execute=async()=>{invoked++;const result={success:false,results:[{status:'blocked',failureCode:'WRITE_UNCERTAIN'}]};state.attempts.push(result);return result;};
 assert.equal((await drive(options,deps)).status,'blocked');assert.equal((await drive(options,deps)).status,'blocked');assert.equal(invoked,1);
});
test('ordinary pending CI without approval requirement remains a read-only wait',async()=>{
 const pulls=[pr(1)],state={prs:[1],attempts:[{results:[{prNumber:1,headSha:pr(1).head.sha,prepared:true}]}]};let waits=0;
 const report=await drive({...options,maxSteps:2},{snapshot:()=>({state,pulls}),checks:()=>[{state:'pending'}],approvalPending:()=>false,sleep:async()=>{waits++;},execute:()=>assert.fail('must not delegate ordinary pending CI')});
 assert.equal(report.status,'budget-exhausted');assert.equal(waits,2);
});
test('real cycle wiring binds approval hints to the captured head and pull_request event',async()=>{
 const {main}=require('../maintenance_cycle.cjs'),batch=require('../merge_batch.cjs');
 const originalLog=console.log,originalExit=process.exitCode;
 try {
  console.log=()=>{};
  for(const valid of [true,false]) {
   const pull=pr(1),saved={cycle:{repository:'sickn33/agentic-awesome-skills',prs:[1],attempts:[{results:[{prNumber:1,headSha:pull.head.sha,prepared:true}]}]}};
   let merges=0,reads=0;
   const store={readBatch:k=>structuredClone(saved[k]),writeBatch:(k,v)=>{saved[k]=structuredClone(v);},acquireLock:()=>()=>{}};
   const runs=valid?[{head_sha:pull.head.sha,event:'pull_request',conclusion:'action_required'}]:[
    {head_sha:'a'.repeat(40),event:'pull_request',conclusion:'action_required'},
    {head_sha:pull.head.sha,event:'push',conclusion:'action_required'},
    {head_sha:pull.head.sha,event:'pull_request',conclusion:'failure'}];
   await main(['run','--state-dir','/fixture','--seconds','1','--max-steps','1'],{openStore:()=>store,run:()=> 'contract',gh:()=>pull,batch:{...batch,
    assertEffectiveMainProtection:()=>{},listCheckRuns:()=>[],
    listActionRequiredRuns:(_root,repo,head)=>{reads++;assert.equal(repo,'sickn33/agentic-awesome-skills');assert.equal(head,pull.head.sha);return runs;},
    runBatch:async(_root,prs,opts)=>{merges++;assert.deepEqual(prs,[1]);assert.equal(opts.prepareOnly,false);assert.equal(opts.dryRun,false);return [{prNumber:1,merged:true,status:'merged'}];},
   }});
   assert.equal(reads,1);assert.equal(merges,valid?1:0);
  }
 } finally {console.log=originalLog;process.exitCode=originalExit;}
});
