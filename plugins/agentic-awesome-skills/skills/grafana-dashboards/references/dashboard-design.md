# Dashboard design review

## Inputs

Name the operational question, service filter, datasource and expected units for each panel.

## Procedure and verification

Place impact and trend first, then diagnostic detail. Keep ratios on the same population and time range. Include descriptions, refresh time and a no-data state. Test a known incident, zero traffic, an empty variable selection and multiple service selections. Compare a hand-calculated fixture to the displayed value.

## Limitations

Dashboard JSON depends on the Grafana version. Export from the installed instance and test import in a staging folder; panel colors and labels alone do not establish an alert policy.
