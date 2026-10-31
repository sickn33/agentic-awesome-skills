'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const receipt=require('../release_candidate_receipt.cjs');
const temp=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'aas-receipt-test-'));
const root=path.join(temp,'source'),state=path.join(temp,'private');fs.mkdirSync(root);fs.mkdirSync(state,{mode:0o700});
let version='test-npm';
const run=(cmd,args,cwd)=>cmd==='npm'?version:cmd==='python3'?'python-yaml':execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try{
 run('git',['init','-b','main'],root);run('git',['config','user.name','Test'],root);run('git',['config','user.email','test@localhost'],root);
 fs.writeFileSync(path.join(root,'fixture'),'base');run('git',['add','.'],root);run('git',['commit','-m','base'],root);
 const source=run('git',['rev-parse','HEAD'],root);
 fs.writeFileSync(path.join(root,'fixture'),'candidate');run('git',['commit','-am','candidate'],root);
 const saved=receipt.save(root,state,source,'1.2.3',run);
 assert.equal(receipt.load(root,state,source,'1.2.3',run).commit,saved.commit);
 assert.throws(()=>receipt.load(root,state,'f'.repeat(40),'1.2.3',run),/stale/);
 assert.throws(()=>receipt.load(root,state,source,'1.2.4',run),/stale/);
 version='different-npm';assert.throws(()=>receipt.load(root,state,source,'1.2.3',run),/toolchain/);version='test-npm';
 const bundle=path.join(state,'candidate.bundle');const original=fs.readFileSync(bundle);fs.appendFileSync(bundle,'tamper');
 assert.throws(()=>receipt.load(root,state,source,'1.2.3',run),/changed/);fs.writeFileSync(bundle,original);
 fs.renameSync(bundle,bundle+'.real');fs.symlinkSync(bundle+'.real',bundle);assert.throws(()=>receipt.load(root,state,source,'1.2.3',run));fs.unlinkSync(bundle);fs.renameSync(bundle+'.real',bundle);
 const file=path.join(state,`evidence.${receipt.ID}.json`),signed=JSON.parse(fs.readFileSync(file));signed.result.version='1.2.4';fs.writeFileSync(file,JSON.stringify(signed));
 assert.throws(()=>receipt.load(root,state,source,'1.2.4',run),/authentication/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('Candidate exact identity, toolchain, bundle integrity, symlink and receipt tampering regressions passed');
