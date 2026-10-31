'use strict';
const {execFileSync} = require('node:child_process');
function doctor(root, dependencies = {}) {
  const run = dependencies.run || ((command,args) => {
    const invocation=require('./release_workflow.js').resolveCommandInvocation(command,args);
    return execFileSync(invocation.command,invocation.args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024}).trim();
  });
  const checks = [];
  for (const [name,command,args] of [
    ['node',process.execPath,['--version']], ['npm','npm',['--version']],
    ['python-yaml',process.env.ANTIGRAVITY_PYTHON || 'python3',['-c','import yaml; print(yaml.__version__)']],
    ['github-auth','gh',['api','user','--jq','.login']],
    ['full-history','git',['rev-parse','--is-shallow-repository']],
    // Exercise exactly the history traversal used by contributor generation.
    ['credit-history','git',['log','HEAD','--diff-filter=A','--format=%H','--name-only','--','skills/']],
  ]) {
    try {
      const value=run(command,args);
      if(name==='full-history' && value!=='false') throw Error('Full history required; fetch --unshallow before continuing');
      checks.push({name,status:'passed',observed:name==='credit-history'?'history traversable':value});
    } catch(error) {checks.push({name,status:'blocked',observed:String(error.message).slice(0,1200)});}
  }
  const result={passed:checks.every(c=>c.status==='passed'),checks};
  if(!result.passed) { const error=new Error('Maintenance environment is not ready: '+JSON.stringify(result)); error.report=result; throw error; }
  return result;
}
module.exports={doctor};
if(require.main===module) {try {console.log(JSON.stringify(doctor(process.cwd()),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
