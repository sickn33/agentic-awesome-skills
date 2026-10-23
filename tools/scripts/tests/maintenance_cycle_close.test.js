const assert=require('node:assert/strict');
const {main}=require('../maintenance_cycle.cjs');
const sha='a'.repeat(40),repo='sickn33/agentic-awesome-skills';
let saved={repository:repo,prs:[1],attempts:[]}, writes=[], uncertain=false, changed=false, malformed=false;
const store={readBatch:()=>structuredClone(saved),writeBatch:(_,s)=>{saved=structuredClone(s);}};
const deps={openStore:()=>store,gh:args=>{
 const endpoint=args.find(s=>s.startsWith('repos/'));
 if(args.includes('POST')){writes.push('comment');if(uncertain)throw Error('lost response');return malformed ? {} : {id:1,body:args.at(-1).slice(5),user:{login:'sickn33'},created_at:'2026-10-22T12:00:00Z'};}
 if(args.includes('PATCH')){writes.push('close');return {state:'closed'};}
 if(args.at(-1)==='user')return {login:'sickn33'};
 return {number:1,state:'open',head:{sha:changed&&writes.length?'b'.repeat(40):sha},base:{ref:'main'}};
}};
(async()=>{
 const log=console.log,exit=process.exitCode;console.log=()=>{};
 try {
  const args=['close','--state-dir','/unused','--prs','1','--expected-head',sha,'--reason','Superseded by a complete reviewed owner consolidation #123.'];
  await main(args,deps);assert.deepEqual(writes,['comment','close']);assert.equal(saved.attempts.at(-1).success,true);
  writes=[];uncertain=true;await main(args,deps);assert.deepEqual(writes,['comment']);assert.equal(saved.attempts.at(-1).failureCode,'WRITE_UNCERTAIN');
  writes=[];uncertain=false;malformed=true;await main(args,deps);assert.deepEqual(writes,['comment']);assert.equal(saved.attempts.at(-1).failureCode,'WRITE_UNCERTAIN');
  writes=[];malformed=false;changed=true;await main(args,deps);assert.deepEqual(writes,['comment']);assert.equal(saved.attempts.at(-1).success,false);
  writes=[];await main(args.map(a=>a==='1'?'2':a),deps).then(()=>assert.fail('scope shrink'),e=>assert.match(e.message,/outside/));assert.deepEqual(writes,[]);
 }finally{console.log=log;process.exitCode=exit;}
})().catch(e=>{console.error(e);process.exitCode=1;});
