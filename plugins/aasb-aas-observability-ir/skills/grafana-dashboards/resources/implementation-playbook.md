# Grafana dashboard implementation

## Inputs

Installed Grafana version, datasource UID, metric names/labels, viewer role and the operational question.

## Procedure

1. Inspect real series and their units before drafting panels. Choose a service filter and time window; keep numerator and denominator populations identical.
2. Build one representative panel in the target Grafana version and export its supported schema. Keep secrets out of exported JSON and use stable datasource references.
3. Validate normal traffic, no traffic, missing data and a known incident. Check variables, units, thresholds and query cost, then import into a staging folder and inspect the rendered result.

## Worked example

For an API error panel, compare a known 5-error/100-request sample with the displayed 5%. An empty source must show no data, not healthy zero.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Legacy graph and embedded-alert JSON is not universally importable. Generate schema from the installed version and configure alert rules through its supported interface.
