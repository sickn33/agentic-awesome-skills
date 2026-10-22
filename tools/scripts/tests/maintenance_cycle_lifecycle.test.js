const assert = require('node:assert/strict');
const {main} = require('../maintenance_cycle.cjs');
const sha = 'a'.repeat(40);
let saved, pending = false, trusted = true, rerun = false, newRun = false, collected = false, alignment = false, writes = 0, incomplete = false, validation = "success";
const store = {readBatch: () => saved && structuredClone(saved), writeBatch: (_, state) => {saved=structuredClone(state);}};
const dependencies = {
  openStore: () => store, readVersion: () => '19.11.0', run: () => '',
  batch: {
    parsePrList: require('../merge_batch.cjs').parsePrList,
    readRepositorySlug: () => 'sickn33/agentic-awesome-skills',
    ensureTrustedMain: () => {if (!trusted) throw Error('Not clean current main'); return sha;},
    assertEffectiveMainProtection: () => {}, assertFullSha: require('../merge_batch.cjs').assertFullSha,
  },
  gh: args => {
    const endpoint = args.at(-1);
    if(alignment && args.includes('--method')) {writes++;if(incomplete)return null;throw Error('ECONNRESET');}
    if(alignment && endpoint.endsWith('/pulls/1')) return {state:'open',base:{ref:'main'},head:{sha}};
    if (endpoint.endsWith('/pulls/1')) return {number:1, state:'closed', merged:true, base:{ref:'main',repo:{full_name:'sickn33/agentic-awesome-skills'}}, head:{sha}, merge_commit_sha:sha};
    if (endpoint.includes('/jobs?')) {collected=true;return [{jobs:[{name:"main-validation-and-sync",status:"completed",conclusion:"success",steps:[{name:"Validate protected source diff with ephemeral snapshots",conclusion:validation}]}]}];}
    const rows=[{workflow_runs:['ci.yml','codeql.yml'].map((name,i)=>({id:i+1+(newRun&&collected?10:0),path:'.github/workflows/'+name,head_sha:sha,head_branch:'main',event:'push',status:pending?'in_progress':'completed',conclusion:pending?null:'success'}))}];
    if(/\/runs\/\d+$/.test(endpoint)) return {...rows[0].workflow_runs.find(r=>r.id===Number(endpoint.split('/').at(-1))), ...(rerun?{run_attempt:2}: {})};
    return rows;
  },
};
(async () => {
  const oldLog=console.log, oldExit=process.exitCode;
  console.log=()=>{};
  try {
    trusted=false;
    await assert.rejects(main(['start','--state-dir','/unused','--prs','1'],dependencies),/Not clean/);
    assert.equal(saved,undefined,'do not start from an untrusted source head');
    trusted=true;
    await main(['start','--state-dir','/unused','--prs','1'],dependencies);
    const start=saved.startedAt;
    await main(['verify','--state-dir','/unused'],dependencies);
    assert.ok(saved.completedAt); assert.equal(saved.attempts.at(-1).success,true);
    rerun=true;
    await main(['verify','--state-dir','/unused'],dependencies);
    assert.equal(saved.completedAt,undefined,'a concurrently restarted workflow invalidates completion');
    assert.equal(saved.attempts.at(-1).failureCode,'CI_WAIT_TIMEOUT');
    rerun=false;
    newRun=true;collected=false;
    await main(['verify','--state-dir','/unused'],dependencies);
    assert.equal(saved.completedAt,undefined,'a newer workflow run cannot be ignored');
    assert.equal(saved.attempts.at(-1).success,false);
    newRun=false;
    pending=true;
    await main(['verify','--state-dir','/unused'],dependencies);
    assert.equal(process.exitCode,1);
    assert.equal(saved.completedAt,undefined,'a failed recheck cannot retain the prior completion');
    assert.equal(saved.elapsedMs,undefined);
    assert.equal(saved.measurement,undefined);
    assert.equal(saved.startedAt,start,'never reset the original timer');
    assert.equal(saved.attempts[0].success,true,'retain historical proof');
    assert.equal(saved.attempts[1].success,false);
    pending=false;
    for(const outcome of [undefined,'skipped','failure']) {
      validation=outcome;
      await main(['verify','--state-dir','/unused'],dependencies);
      assert.equal(saved.completedAt,undefined,'green workflow without executed source validation cannot complete maintenance');
      assert.equal(saved.attempts.at(-1).success,false);
    }
    validation='success';
    alignment=true;
    await main(['align','--state-dir','/unused','--prs','1','--expected-head',sha],dependencies);
    assert.equal(saved.attempts.at(-1).failureCode,'WRITE_UNCERTAIN');
    assert.equal(writes,1,'lost branch-update response must not trigger another write');
    incomplete=true;
    await main(['align','--state-dir','/unused','--prs','1','--expected-head',sha],dependencies);
    assert.equal(saved.attempts.at(-1).failureCode,'WRITE_UNCERTAIN');
    assert.equal(writes,2,'incomplete response must not trigger a retry');
    assert.equal(saved.completedAt,undefined);
    await assert.rejects(main(['start','--state-dir','/unused','--prs','1'],dependencies),/already exists/);
  } finally {console.log=oldLog;process.exitCode=oldExit;}
})().catch(error=>{console.error(error);process.exitCode=1;});
