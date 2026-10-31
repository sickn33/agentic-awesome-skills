'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {writeRuntimeAssets}=require('../../lib/aas-v1/cache/runtime');
const records=Array.from({length:12},(_,i)=>({path:`package/file-${i}`,bytes:Buffer.from(String(i))}));
test('private runtime writes are bounded and retain every exact byte',async()=>{
 let active=0,peak=0;const seen=[];
 await writeRuntimeAssets('/private-stage',records,async(file,bytes)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setImmediate(r));seen.push([file,bytes.toString()]);active--;});
 assert.equal(peak,4);assert.equal(active,0);assert.equal(seen.length,12);
 assert.equal(new Set(seen.map(r=>r[0])).size,12);
 for(const [file,bytes] of seen)assert(file.endsWith('file-'+bytes));
});
test('failed writes drain siblings before unpublished staging can be removed',async()=>{
 let active=0,started=0;
 await assert.rejects(writeRuntimeAssets('/private-stage',records,async()=>{
  const index=started++;active++;
  try {await new Promise(r=>setTimeout(r,index===0?1:20));if(index===0)throw Error('disk failure');}
  finally{active--;}
 }),/disk failure/);
 assert.equal(active,0);assert.equal(started,4);
});
