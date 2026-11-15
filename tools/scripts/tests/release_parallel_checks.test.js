const assert=require('node:assert/strict');
const {validate}=require('../release_parallel_checks.cjs');
(async()=>{
 let active=0,finished=0,cleaned=false,collected=false;
 const deps={verifyWeb:root=>assert.equal(root,'/isolated'),head:'a'.repeat(40),prepare:()=>({root:'/isolated',cleanup:()=>{assert.equal(finished,2);cleaned=true;}}),run:async(root,check)=>{active++;await new Promise(r=>setTimeout(r,10));assert.equal(active,2);finished++;return {check,exitCode:check==='test'?1:0};},collect:()=>{collected=true;}};
 await assert.rejects(()=>validate('/root',deps),/checks failed/);assert(cleaned);assert(!collected,'failed branches must not publish outputs');
 finished=0;active=0;deps.run=async(root,check)=>{finished++;return {check,exitCode:0};};
 assert.equal((await validate('/root',deps)).passed,true);assert(collected);
 const cache=process.env.AAS_WEB_CACHE_DIR;
 await assert.rejects(()=>validate('/root',{head:'a'.repeat(40),prepare:()=>{throw Error('setup failure');}}),/setup failure/);
 assert.equal(process.env.AAS_WEB_CACHE_DIR,cache,'setup failure restores environment');
 deps.verifyWeb=()=>{throw Error('SEO or audit failure');};collected=false;finished=0;
 await assert.rejects(()=>validate('/root',deps),/checks failed/);assert(!collected,'web audit failure blocks artifacts');
 console.log('Parallel release checks drain failures and gate artifact collection');
})().catch(e=>{console.error(e);process.exitCode=1;});
