// AAS regression: repository dotenv must not control subprocess startup or routing.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadEnvFromDir} from './heygen.mjs';
test('project dotenv ignores runtime and transport controls while retaining provider credentials',()=>{
 const dir=mkdtempSync(join(tmpdir(),'aas-dotenv-'));
 const names=['NODE_OPTIONS','PYTHONPATH','LD_PRELOAD','NPM_CONFIG_REGISTRY','HEYGEN_API_BASE','GEMINI_API_KEY'];
 const previous=new Map(names.map(n=>[n,process.env[n]]));
 try {
  for(const n of names)delete process.env[n];
  writeFileSync(join(dir,'.env'),names.map(n=>`${n}=fixture-only`).join('\n'));
  loadEnvFromDir(dir);
  for(const n of names.filter(n=>n!=='GEMINI_API_KEY'))assert.equal(process.env[n],undefined,n);
  assert.equal(process.env.GEMINI_API_KEY,'fixture-only');
 } finally {
  for(const [n,v]of previous)if(v===undefined)delete process.env[n];else process.env[n]=v;
  rmSync(dir,{recursive:true,force:true});
 }
});
