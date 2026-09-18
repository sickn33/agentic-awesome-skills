# SLO implementation playbook

## Inputs

User journey, eligible event population, success threshold, observation window and responsible service owner.

## Procedure

1. Define good and total events together, including timeout and no-traffic behavior. Choose a target from user needs and observed baseline.
2. Compute bad fraction, budget and burn rate from the same population. Create every recording rule referenced by alerts and check labels align.
3. Test healthy, exhausted, missing-data and zero-traffic cases with known counts. Review paging thresholds, runbook and recovery behavior before enabling notifications.

## Worked example

For 100,000 eligible requests at a 99.9% target, the budget is 100 bad requests. Fifty observed failures consume half the budget.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Request-based budgets cannot be converted directly into downtime minutes under variable traffic. Example thresholds are not service commitments.
