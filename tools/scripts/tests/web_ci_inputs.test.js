'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'aas-web-inputs-'));
const write=(file,text)=>{fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),text);};
try {
 fs.copyFileSync(path.join(root,'turbo.json'),path.join(dir,'turbo.json'));
 const pkg={name:'aas-cache-input-fixture',version:'1.0.0',private:true,packageManager:require(path.join(root,'package.json')).packageManager,scripts:{'app:ci:test':'echo test','app:ci:compile':'echo compile'}};
 write('package.json',JSON.stringify(pkg));write('package-lock.json',JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,packages:{'':{name:pkg.name,version:pkg.version}}}));
 write('.gitignore','.turbo/\n');
 const files=['docs/maintainers/maintenance-contract.md','docs/users/usage.md','docs/examples/workflows/mcp-contract/plan.json','docs/contributors/content-aliases.json','apps/web-app/src/demo.ts','apps/web-app/src/demo.test.ts','tools/lib/aas-v1/ontology.v1.json','data/catalog.json'];
 for(const file of files)write(file,'original\n');
 const git=args=>execFileSync('git',args,{cwd:dir,stdio:'pipe'});
 git(['init']);git(['add','.']);
 const env={...process.env,TURBO_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'};
 for(const name of Object.keys(env))if(/^TURBO_/i.test(name)&&name!=='TURBO_TELEMETRY_DISABLED')delete env[name];
 const hashes=()=>Object.fromEntries(JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/turbo/bin/turbo'),'run','app:ci:test','app:ci:compile','--dry=json','--cache=local:rw','--env-mode=strict','--framework-inference=false'],{cwd:dir,encoding:'utf8',env,timeout:30000})).tasks.map(t=>[t.taskId,t.hash]));
 const before=hashes();
 for(const file of files) {
  write(file,'changed\n');const after=hashes();write(file,'original\n');
  for(const task of Object.keys(before)) {
   const unaffected=file.startsWith('docs/maintainers/')||(file.endsWith('.test.ts')&&task==='app:ci:compile');
   if(unaffected)assert.equal(after[task],before[task],`${file} unnecessarily invalidated ${task}`);
   else assert.notEqual(after[task],before[task],`${file} must invalidate ${task}`);
  }
 }
 console.log('Actual pinned Turbo hashes preserve all web imports and exclude unrelated maintainer prose');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
