"use strict";
// Failure handling is deliberately conservative: retries are only for reads.
const ACTIONS = {
  SUBMISSION_INCOMPLETE: "Ask the author to complete the three evidence sections with truthful scoped results; fix the PR body and resume. No content repair or paid test is required merely to fill the form.",
  DRAFT_PR: "Keep draft feedback open; the author must mark the PR ready before a protected merge.",
  PR_NOT_OPEN: 'Refresh PR state and exclude closed PRs from preparation. For a merged PR, resume merge to verify ancestry without another write; do not repeat its content review.',
  REVIEW_REQUIRED: 'Review this exact full head and complete changed bundle/code, then supply --reviewed-head. This does not waive any required checks or protection.',
  POLICY_BLOCKED: 'Repair the source or use a separately reviewed protected-base policy change; an attestation alone cannot authorize this contributor change.',
  NETWORK_UNAVAILABLE: 'Resume after connectivity recovers; refresh PR identity, protection and checks. Do not repeat a write whose outcome is unknown.',
  AUTH_REQUIRED: 'Restore GitHub authentication/permissions, then resume with fresh evidence.',
  RATE_LIMITED: 'Wait for the GitHub rate-limit reset, then resume; do not poll or repeat writes.',
  CI_FAILED: 'Inspect the exact failed run and repair its cause; never automatically rerun or waive required checks.',
  CI_WAIT_TIMEOUT: 'Inspect current PR and CI state once, then resume only with fresh evidence.',
  WRITE_UNCERTAIN: 'Read the current PR and merge ancestry before any further write; never blindly repeat the merge/update request.',
  PR_CHANGED: 'Re-intake the current base/head and review changed content; old-head evidence cannot authorize this head.',
  STATE_LOCKED: 'Wait for the active process. After a crash, verify it has stopped before removing its lock; never steal a live lock.',
  INVALID_RESPONSE: 'Stop and fetch fresh valid evidence; malformed data cannot authorize a merge.',
  UNKNOWN_STOP: 'Inspect the exact failure once and repair its cause before repeating this stage.',
};
function failure(code, message) { return Object.assign(new Error(message), {failureCode:code}); }
function describeFailure(error) {
  const message=String(error?.message || error);
  let code=error?.failureCode;
  if(!code) {
    if(/rate limit|HTTP 429/i.test(message)) code='RATE_LIMITED';
    else if(/HTTP (401|403)|authentication|not logged into/i.test(message)) code='AUTH_REQUIRED';
    else if(/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|HTTP (502|503|504)|TLS handshake timeout|connection reset|error connecting to|network is unreachable/i.test(message+' '+(error?.code||''))) code='NETWORK_UNAVAILABLE';
    else code='UNKNOWN_STOP';
  }
  return {failureCode:code,nextAction:ACTIONS[code] || ACTIONS.UNKNOWN_STOP};
}
function readWithRetry(read, dependencies={}) {
  const sleep=dependencies.sleep || (ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms));
  for(let attempt=0;attempt<3;attempt++) {
    try{return read();} catch(error) {
      if(describeFailure(error).failureCode!=='NETWORK_UNAVAILABLE' || attempt===2) throw error;
      sleep([1000,3000][attempt]);
    }
  }
}
module.exports={failure,describeFailure,readWithRetry};
