'use strict';
// Scheduling advice only; never reviews content, updates a branch or merges.
function schedule(state,pulls) {
 const latest=new Map();
 for(const attempt of state.attempts || [])for(const result of attempt.results || [])latest.set(result.prNumber || result.pr || result.number,result);
 const pending=pulls.filter(p=>p.state==='open');
 const items=pending.map(pr=>{
  const result=latest.get(pr.number);
  let action='intake',reason='Inspect current content and required checks';
  if(pr.draft){action='repair';reason='Draft: finish corrections before expensive checks';}
  else if(pr.mergeable_state==='dirty'){action='repair';reason='Resolve conflicts before validation';}
  else if(result?.headSha===pr.head.sha && result.status==='blocked'){action='repair';reason=result.reason || result.nextAction;}
  else if(pr.mergeable_state==='behind'){action='align';reason='Align this PR only when selected next; then refresh evidence';}
  else if(result?.headSha===pr.head.sha && result.reviewAttested){action='merge';reason='Resume sole protected merge authority; recheck exact head and current checks';}
  return {pr:pr.number,head:pr.head.sha,action,reason};
 });
 const rank={merge:0,intake:1,align:2,repair:3};
 items.sort((a,b)=>rank[a.action]-rank[b.action]||state.prs.indexOf(a.pr)-state.prs.indexOf(b.pr));
 return {advisory:true,next:items[0] || {action:'verify',reason:'All PRs resolved; verify exact main CI/CodeQL'},pending:items,
  continueIndependentWork:items.some(i=>i.action!=='repair'),
  rules:['Complete repairs and dependency ordering before full validation.','Align only the selected next PR; a base change invalidates merge evidence.','Include release notes in the final planned source PR when a release is authorized.','A blocked PR does not stop independent authorized work.','Never automatically retry an uncertain write or attest semantic review.']};
}
module.exports={schedule};
