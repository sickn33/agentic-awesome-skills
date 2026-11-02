'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');const yaml=require('yaml');
const load=n=>yaml.parse(fs.readFileSync(`.github/workflows/${n}.yml`,'utf8'));
const preview=load('aas-agent-first-preview');
assert.equal(preview.jobs.functional.needs,'candidate');assert.equal(preview.jobs.contracts.needs,'candidate');
assert.deepEqual(preview.jobs.aggregate.needs,['functional','workbench','contracts']);
const commands=Object.values(preview.jobs).flatMap(j=>j.steps||[]).map(s=>s.run||'').join('\n');
assert.equal((commands.match(/npm run test:aas-v1/g)||[]).length,1);
assert(preview.jobs.contracts.steps.some(s=>s.run?.includes('npm run check:aas-v1-catalog')));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'aas-cache-save-'));
try {
 for(const name of ['ci','pr-metadata'])for(const job of Object.values(load(name).jobs)){
  const step=job.steps?.find(s=>s.id==='cache_save');if(!step)continue;
  const save=job.steps.find(s=>s.uses?.startsWith('actions/cache/save@'));assert.equal(save.if,"success() && steps.cache_save.outputs.changed == 'true'");
  for(const states of [['HIT','HIT'],['MISS','HIT'],['UNKNOWN','HIT']]){
   const receipt=path.join(root,'receipt'),output=path.join(root,'output');fs.writeFileSync(receipt,JSON.stringify({passed:true,tasks:states.map(cache=>({cache}))}));fs.writeFileSync(output,'');
   const result=spawnSync('bash',['-e','-c',step.run],{encoding:'utf8',env:{...process.env,AAS_WEB_CI_RECEIPT:receipt,GITHUB_OUTPUT:output}});
   if(states.includes('UNKNOWN'))assert.notEqual(result.status,0);else {assert.equal(result.status,0,result.stderr);assert.equal(fs.readFileSync(output,'utf8'),`changed=${states.includes('MISS')}\n`);}
  }
 }
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('Real cache-save planner rejects invalid evidence; preview aggregate retains all branches.');
