'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {prepareWebCopy,executeCheckAsync}=require('./maintenance_validate.cjs');
async function validate(root, dependencies={}) {
 const head=dependencies.head || execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const previousCache=process.env.AAS_WEB_CACHE_DIR;
 if(!previousCache)process.env.AAS_WEB_CACHE_DIR=path.join(root,'.turbo','cache');
 const copy=(dependencies.prepare || prepareWebCopy)(root,head);
 const run=dependencies.run || executeCheckAsync;
 const started=Date.now();
 try {
  const results=await Promise.allSettled([run(root,'test',{}),run(copy.root,'web',{})]);
  if(results.some(r=>r.status!=='fulfilled'||r.value.exitCode!==0)) throw Error('Required candidate checks failed: '+JSON.stringify(results));
  (dependencies.collect || (()=>{
   for(const name of ['dist','coverage']) {
    const dest=path.join(root,'apps/web-app',name);
    fs.rmSync(dest,{recursive:true,force:true});
    fs.cpSync(path.join(copy.root,'apps/web-app',name),dest,{recursive:true,dereference:false});
   }
  }))();
  return {passed:true,head,elapsedMs:Date.now()-started,results:results.map(r=>r.value)};
 }finally{copy.cleanup();if(previousCache===undefined)delete process.env.AAS_WEB_CACHE_DIR;else process.env.AAS_WEB_CACHE_DIR=previousCache;}
}
module.exports={validate};
if(require.main===module)validate(process.cwd()).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
