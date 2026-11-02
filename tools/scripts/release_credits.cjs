'use strict';
const {execFileSync}=require('node:child_process');
function validateCredits(root,notes,run=(cmd,args)=>execFileSync(cmd,args,{cwd:root,encoding:'utf8',timeout:120000}).trim()) {
 const base=run('git',['describe','--tags','--abbrev=0','HEAD']);
 const ids=[...new Set([...run('git',['log',`${base}..HEAD`,'--first-parent','--format=%s']).matchAll(/\(#(\d+)\)/g)].map(m=>m[1]))];
 if(ids.length>100)throw Error('Credit batch exceeds bounded review limit');
 const contributors=[];
 for(const id of ids){
  const p=JSON.parse(run('gh',['api',`repos/sickn33/agentic-awesome-skills/pulls/${id}`]));
  if(!p.merged_at||!p.user?.login)throw Error(`Missing merged PR provenance #${id}`);
  const login=p.user.login;if(login==='sickn33'||login.endsWith('[bot]'))continue;
  if(!new RegExp(`@${login}(?![A-Za-z0-9-])`).test(notes)||!new RegExp(`https://github[.]com/sickn33/agentic-awesome-skills/pull/${id}(?![0-9])`).test(notes))throw Error(`Release credits missing @${login} and PR link #${id}`);
  contributors.push({pr:Number(id),login});
 }
 return {base,contributors};
}
module.exports={validateCredits};
