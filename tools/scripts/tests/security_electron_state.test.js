const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawnSync}=require('node:child_process');
const file=path.resolve(__dirname,'../../../skills/electron-drive-skill/scripts/lib.mjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'aas-electron-state-'));
try {
 const root=fs.realpathSync(temporary);
 const state=path.join(root,'state');fs.mkdirSync(state,{mode:0o700});
 if(process.platform==='win32') {
  const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const script="$ErrorActionPreference='Stop'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=Get-Acl -LiteralPath $env:AAS_TEST_STATE_PATH; $acl.SetAccessRuleProtection($true,$false); $acl.SetOwner($sid); $rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.SetAccessRule($rule); Set-Acl -LiteralPath $env:AAS_TEST_STATE_PATH -AclObject $acl";
  const acl=spawnSync(powershell,['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',timeout:10000,env:{...process.env,AAS_TEST_STATE_PATH:state}});
  assert.equal(acl.status,0,acl.stderr);
 }
 const shared=path.join(root,'shared');fs.mkdirSync(shared,{mode:0o777});fs.chmodSync(shared,0o777);
 const link=path.join(root,'link');fs.symlinkSync(state,link,process.platform==='win32'?'junction':'dir');
 const probe=`const m=await import(${JSON.stringify(pathToFileURL(file).href)}); console.log(m.driveRoot());`;
 const run=target=>spawnSync(process.execPath,['--input-type=module','-e',probe],{encoding:'utf8',timeout:5000,env:{...process.env,DRIVE_ROOT:target,DRIVE_PROJECT_ROOT:root}});
 assert.equal(run(state).status,0);
 if(process.platform!=='win32')assert.notEqual(run(shared).status,0,'Shared state must be rejected');
 assert.notEqual(run(link).status,0,'Symlink state must be rejected');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
