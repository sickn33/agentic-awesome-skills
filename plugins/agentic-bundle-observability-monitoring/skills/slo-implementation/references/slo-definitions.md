# Defining an SLI and SLO

## Inputs

Record the journey, eligible event population, good-event definition, target fraction, reporting window and owner.

## Procedure and verification

Use good events divided by total eligible events for a request-based SLI. Define how client errors, retries and dependency timeouts count. Distinguish no traffic from missing telemetry. Keep service and tenant scopes consistent. Validate against a known request sample and capture the query with its data source.

## Limitations

A percentile and a fraction of requests under a threshold are different measures. Avoid silently substituting one. A request success fraction does not establish durability or a contractual SLA.
