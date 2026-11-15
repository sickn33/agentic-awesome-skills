# KPI dashboard verification

## Inputs

Decision, audience, reporting grain, source tables, metric owner and period definitions.

## Procedure

1. Define each metric's numerator, denominator, exclusions, unit and freshness. Keep cohort size independent from later activity and aggregate spend before joining to customers.
2. Build a small reconciliation table with hand-calculated results, zero denominators, duplicate events and cohorts older than twelve months.
3. Connect every card and chart to the selected date range. Distinguish missing data from zero; show whether higher or lower is better and verify drill-down totals.

## Worked example

A cohort has ten customers and four return in month thirteen. Retention is 40% at month 13, not 100% at month 1. Keep that fixture alongside the query.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Example dashboards use synthetic data. A visually correct dashboard is not proof that its financial or attribution definitions are valid.
