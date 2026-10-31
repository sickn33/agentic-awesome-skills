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
  seen.push(item.pr);const result={success:true,results:[{prNumber:item.pr,headSha:item.head,prepared:true,reviewAttested:false}]};state.attempts.push(result);return result;
 }});
 assert.equal(report.status,'attention-required');assert.deepEqual(seen,[1,2]);
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
