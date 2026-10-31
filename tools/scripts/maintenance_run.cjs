'use strict';
const {schedule} = require('./maintenance_schedule.cjs');

// A bounded driver, not a second merge authority. Every action goes through
// maintenance_cycle/merge_batch, which revalidates live protection and identity.
async function drive(options, dependencies) {
  const deadline = Date.now() + options.seconds * 1000;
  const attempted = new Set(), aligned = new Set(), steps = [];
  let initialContract;
  const sleep = dependencies.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (let index = 0; index < options.maxSteps && Date.now() < deadline; index++) {
    const {state, pulls, contract} = await dependencies.snapshot();
    initialContract ??= contract;
    if (contract !== initialContract) return {status:'attention-required', reason:'The protected evaluator changed; restart from the adopted current-base instructions.', steps};
    const last = state.attempts?.at(-1);
    if (last?.failureCode === 'WRITE_UNCERTAIN' || last?.results?.some(r => r.failureCode === 'WRITE_UNCERTAIN')) {
      return {status:'blocked', reason:'Inspect the uncertain write through explicit fresh intake before resuming.', steps};
    }
    const plan = schedule(state, pulls);
    for (const item of plan.pending) {
      // A newly supplied actual review may resolve the earlier missing-review
      // outcome; it cannot waive drafts, conflicts, policy or failed checks.
      const latest = [...(state.attempts || [])].reverse().flatMap(a => a.results || []).find(r => (r.prNumber || r.pr) === item.pr);
      if (item.action === 'repair' && latest?.failureCode === 'REVIEW_REQUIRED'
          && (options.reviewedHeads || []).includes(item.head)
          && !pulls.find(p => p.number === item.pr)?.draft
          && pulls.find(p => p.number === item.pr)?.mergeable_state !== 'dirty') item.action = 'intake';
    }
    const available = plan.pending.filter(item => {
      if (item.action === 'repair') return false;
      if (item.action === 'align' && (!options.allowAlign || aligned.has(item.pr))) return false;
      return !attempted.has(`${item.pr}:${item.head}:${item.action}`);
    });
    if (!plan.pending.length) {
      const result = await dependencies.execute('verify');
      steps.push({action:'verify', result});
      if (result.success) return {status:'complete', steps};
      if (result.failureCode !== 'CI_WAIT_TIMEOUT') return {status:'blocked', steps};
      await sleep(Math.min(30_000, Math.max(0, deadline - Date.now())));
      continue;
    }
    let item, waiting = false;
    for (const candidate of available) {
      if (candidate.action === 'merge' && dependencies.checks) {
        const checks = await dependencies.checks(candidate);
        if (checks.some(c => c.state === 'failed')) {
          attempted.add(`${candidate.pr}:${candidate.head}:merge`);
          steps.push({pr:candidate.pr,head:candidate.head,action:'checks',result:{success:false,failureCode:'CI_FAILED',checks}});
          continue;
        }
        if (checks.some(c => c.state !== 'success')) { waiting = true; continue; }
      }
      item = candidate; break;
    }
    if (!item && waiting) {
      await sleep(Math.min(30_000, Math.max(0, deadline - Date.now())));
      continue;
    }
    if (!item) return {status:'attention-required', pending:plan.pending, steps};
    const action = item.action === 'merge' ? 'merge' : item.action === 'align' ? 'align' : 'intake';
    attempted.add(`${item.pr}:${item.head}:${item.action}`);
    if (action === 'align') aligned.add(item.pr);
    // The observed full SHA is always passed to the one-shot alignment endpoint.
    const result = await dependencies.execute(action, item);
    steps.push({pr:item.pr, head:item.head, action, result});
    const failures = [result, ...(result.results || [])].filter(r => r.success === false || r.status === 'blocked');
    if (failures.some(r => ['WRITE_UNCERTAIN','STATE_LOCKED','AUTH_REQUIRED','RATE_LIMITED','INVALID_RESPONSE','NETWORK_UNAVAILABLE'].includes(r.failureCode))) {
      return {status:'blocked', steps};
    }
    // No repeat of a failed merge, alignment or unchanged intake in this run.
    // Other PRs remain available; a fresh invocation always re-reads live state.
  }
  return {status:'budget-exhausted', steps};
}
module.exports = {drive};
