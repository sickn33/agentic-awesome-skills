# DevOps failure investigation

## Inputs

Affected service and environment, impact window, recent changes, authorized read access and recovery owner.

## Procedure

1. Capture the failing symptom and a healthy comparison. Read bounded logs, metrics, deployment identity and dependency status without dumping environment variables.
2. Write competing hypotheses and choose the cheapest discriminating observation. Preserve timestamps and exact filters so another engineer can reproduce the evidence.
3. Prepare a bounded mitigation with rollback and abort conditions. Apply only within authorized operational scope, then verify the original user journey and dependent services.

## Worked example

After a rollout, requests time out while CPU stays normal. Compare connection-pool occupancy and downstream latency across old and new instances before proposing scaling.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Correlation with a deployment is not proof of cause. Avoid broad restarts, destructive cleanup and fault injection during diagnosis.
