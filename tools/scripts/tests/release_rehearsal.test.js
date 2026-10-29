'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { rehearse } = require('../release_rehearsal.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-rehearsal-boundary-'));
const source = path.join(root, 'source'), state = path.join(root, 'state');
fs.mkdirSync(source); fs.mkdirSync(state, {mode:0o700});
fs.writeFileSync(path.join(state, 'batch.cycle.json'), '{}', {mode:0o600});
const git = args => execFileSync('git', args, {cwd:source,encoding:'utf8'}).trim();
git(['init','-b','main']);git(['config','user.name','Test']);git(['config','user.email','test@localhost']);
fs.writeFileSync(path.join(source,'fixture'),'source');git(['add','.']);git(['commit','-m','fixture']);
const before=git(['rev-parse','HEAD']);
fs.writeFileSync(path.join(state,'batch.cycle.json'), JSON.stringify({attempts:[{result:{main:before}}]}));
const gate={prepareProof:()=>({main:before})};
let prepared=false, clonePath;
const run = (cmd,args,cwd,options={}) => {
 if(cmd==='npm') { assert.deepEqual(args,['ci','--ignore-scripts','--no-audit','--no-fund']);return ''; }
 assert(!args.includes('push') && !args.includes('tag'));
 return execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
};
try {
 rehearse(source,'1.2.3',state,{run,gate,prepare:(clone,version,copiedState,options)=>{
  clonePath=clone;prepared=true;
  assert.equal(version,'1.2.3');assert.deepEqual(options,{localOnly:true,cycleProof:{main:before}});
  assert.notEqual(copiedState,state);assert.equal(JSON.parse(fs.readFileSync(path.join(copiedState,'batch.cycle.json'),'utf8')).attempts[0].result.main,before);
  assert.equal(run('git',['remote'],clone),'');
  fs.writeFileSync(path.join(clone,'fixture'),'candidate');
  return {commit:before};
 }});
 assert(prepared);assert(!fs.existsSync(clonePath));assert.equal(git(['rev-parse','HEAD']),before);
 assert.equal(fs.readFileSync(path.join(source,'fixture'),'utf8'),'source');
 assert.throws(()=>rehearse(source,'1.2.3',state,{run,gate,prepare:()=>{throw Error('candidate failed');}}),/candidate failed/);
 fs.writeFileSync(path.join(source,'fixture'),'dirty');
 assert.throws(()=>rehearse(source,'1.2.3',state,{run,gate,prepare:()=>assert.fail('dirty source accepted')}),/clean committed/);
 assert.throws(()=>rehearse(source,'1.2.3','relative'),/Usage/);
} finally {fs.rmSync(root,{recursive:true,force:true});}
console.log('Rehearsal clone, local-only boundary, source preservation and failure cleanup passed');
