'use strict';
// A private authenticated receipt reuses local tests only. Remote protection and
// the independent hosted candidate tests are always required after promotion.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {openStore}=require('../lib/maintenance-state');
const ID=crypto.createHash('sha256').update('aas-local-release-candidate-v1').digest('hex');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function toolchain(run,root) {
 return {environment:Object.fromEntries(["VITE_BASE_PATH","SEO_SITE_URL","TZ","LANG","ENABLE_NETWORK_TESTS","NODE_OPTIONS"].map(k=>[k,process.env[k] || null])),node:process.version,platform:process.platform,arch:process.arch,npm:run('npm',['--version'],root,{capture:true}),python:run(process.env.ANTIGRAVITY_PYTHON || 'python3',['-c','import sys,yaml; print(sys.version); print(yaml.__version__)'],root,{capture:true})};
}
function save(root,directory,source,version,run) {
 const store=openStore(directory,root),unlock=store.acquireLock('candidate');
 try {
  if(store.readEvidence(ID)) throw Error('Candidate already recorded; use a new private directory');
  const commit=run('git',['rev-parse','HEAD'],root,{capture:true});
  const bundle=path.join(directory,'candidate.bundle');
  if(fs.existsSync(bundle)) throw Error('Candidate bundle already exists');
  run('git',['bundle','create',bundle,'HEAD',`^${source}`],root);
  fs.chmodSync(bundle,0o600);
  const receipt={schema:1,source,commit,version,toolchain:toolchain(run,root),bundleSha256:hash(fs.readFileSync(bundle)),testedAt:new Date().toISOString()};
  store.writeEvidence(ID,receipt);
  return receipt;
 } finally {unlock();}
}
function load(root,directory,source,version,run) {
 const store=openStore(directory,root),receipt=store.readEvidence(ID);
 if(!receipt || receipt.schema!==1 || receipt.source!==source || receipt.version!==version || !/^[a-f0-9]{40}$/.test(receipt.commit)) throw Error('Missing or stale candidate receipt');
 if(JSON.stringify(receipt.toolchain)!==JSON.stringify(toolchain(run,root))) throw Error('Candidate toolchain changed; rehearse again');
 const bundle=path.join(directory,'candidate.bundle');
 const fd=fs.openSync(bundle,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 let bytes;
 try {const st=fs.fstatSync(fd);if(!st.isFile()||st.nlink!==1||(st.mode&0o077)||st.size>256*1024*1024)throw Error('Unsafe candidate bundle');bytes=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
 if(hash(bytes)!==receipt.bundleSha256)throw Error('Candidate bundle changed');
 // Import the exact checked bytes, not a path that could be replaced after hashing.
 const os=require('node:os'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'aas-candidate-import-'));
 try {const copy=path.join(temp,'candidate.bundle');fs.writeFileSync(copy,bytes,{mode:0o600});run('git',['bundle','verify',copy],root);run('git',['fetch',copy,'HEAD'],root);}
 finally {fs.rmSync(temp,{recursive:true,force:true});}
 if(run('git',['rev-parse','FETCH_HEAD'],root,{capture:true})!==receipt.commit)throw Error('Candidate commit mismatch');
 run('git',['merge-base','--is-ancestor',source,receipt.commit],root);
 return receipt;
}
module.exports={ID,save,load,toolchain};
