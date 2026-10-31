'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {prepareWebCopy,executeCheckAsync}=require('./maintenance_validate.cjs');
function verifyWeb(root) {
 const {runCommand}=require('./release_workflow.js');
 runCommand('npm',['--prefix','apps/web-app','audit','--audit-level=high'],root);
 runCommand('npm',['--prefix','apps/web-app','run','verify:seo','--','--require-hosted-url'],root);
}
async function validate(root, dependencies={}) {
 const head=dependencies.head || execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const previousCache=process.env.AAS_WEB_CACHE_DIR;
 if(!previousCache)process.env.AAS_WEB_CACHE_DIR=path.join(root,'.turbo','cache');
 let copy;
 const run=dependencies.run || executeCheckAsync;
 const started=Date.now();
 try {
  copy=(dependencies.prepare || prepareWebCopy)(root,head);
  const results=await Promise.allSettled([run(root,'test',{}),(async()=>{const result=await run(copy.root,'web',{});if(result.exitCode===0)(dependencies.verifyWeb || verifyWeb)(copy.root);return result;})()]);
  if(results.some(r=>r.status!=='fulfilled'||r.value.exitCode!==0)) throw Error('Required candidate checks failed: '+JSON.stringify(results));
  (dependencies.collect || (()=>{
   for(const name of ['dist','coverage']) {
    const dest=path.join(root,'apps/web-app',name);
    fs.rmSync(dest,{recursive:true,force:true});
    fs.cpSync(path.join(copy.root,'apps/web-app',name),dest,{recursive:true,dereference:false});
   }
  }))();
  return {passed:true,head,elapsedMs:Date.now()-started,results:results.map(r=>r.value)};
 }finally{copy?.cleanup();if(previousCache===undefined)delete process.env.AAS_WEB_CACHE_DIR;else process.env.AAS_WEB_CACHE_DIR=previousCache;}
}
module.exports={validate,verifyWeb};
if(require.main===module)validate(process.cwd()).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
