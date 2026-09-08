# Error analysis implementation playbook

Use the current application, its installed dependencies and approved observability
sources. This is a diagnostic procedure with local examples, not an installed APM stack
or a production incident command system. Previous mixed-version vendor snippets have
been replaced by explicit integration requirements.

## Establish the symptom and its scope

Record timestamp/window/timezone, release revision, route or job, expected behavior,
observed behavior and affected population. Distinguish rate from count and partial
telemetry from complete request totals. Choose a severity from actual user impact,
not the exception class alone. Note missing data and clock skew.

Create a timeline linking observations to their source. An error spike after a deploy
is a hypothesis about causality, not proof. A timeout may come from a pool, lock, network,
upstream delay or cancellation. A ConcurrentModificationException can happen in one
thread; it does not by itself prove a cross-thread race. HashMap supports a null key,
so do not diagnose a null-key prohibition from an invented HashMap stack trace.

## Narrow one hypothesis

1. Reproduce with the smallest synthetic input in the authorized environment.
2. Follow the failing call path and inspect current code, including adapters and retries.
3. Compare a passing input or prior known-good revision. Preserve existing dirty work.
4. Change one controlled variable and rerun the relevant check.
5. Record what the experiment rules out and what remains unknown.

Five-whys can organize questions, but the fifth answer is not automatically a root
cause. Distinguish the technical trigger from process contributors. Prefer concrete
source locations and actual counts over generic claims about insufficient review.

## Collect useful diagnostics without collecting everything

Use allowlisted event fields such as time, service/revision, operation, bounded error
class, duration and synthetic request correlation. Request bodies, tokens, session
identifiers, customer IDs, payment details, local variables and full exceptions can
contain private data. Inspect only what is needed, with the existing access/retention
policy; redact before sharing. A small blacklist of header names is not sufficient.

For correlation, generate an ID at the trusted boundary or validate an incoming ID's
format/length. Do not let caller-controlled context overwrite trusted log fields.
Use the runtime's supported async context mechanism and test concurrent requests.
Structured logs do not automatically mean safe logs or correct tenant isolation.

## Local timing example

This standard-library helper measures a synchronous operation using a monotonic clock.
It returns only a status, duration and exception type; it does not log arguments or the
exception message. `record` is an application-owned sink. Test that sink independently.
A failing sink must not convert a successful operation into a business retry.

```python
import time

def observe_call(operation, record):
    started = time.monotonic()
    event = {"status": "ok"}
    try:
        return operation()
    except Exception as error:
        event = {"status": "error", "error_type": type(error).__name__}
        raise
    finally:
        event["duration_seconds"] = time.monotonic() - started
        try:
            record(event)
        except Exception:
            # The application's telemetry health channel should report sink failures.
            # Do not replay the original business operation because logging failed.
            pass
```

This helper does not provide trace propagation, durable logs, async cancellation
handling or a production error policy. It is a bounded example of separating the
business result from telemetry delivery, not a recommendation to ignore sink failures.

## Retry and circuit-breaker requirements

Use the established client/library rather than a handwritten universal retry wrapper.
Define retryable transport/status failures, total deadline, attempt limit, jitter and
Retry-After handling. `fetch()` does not reject merely because HTTP returned 500; inspect
status explicitly. Do not retry authentication, validation or other permanent failures.
For writes, require a stable application operation ID and provider idempotency contract;
a timeout can occur after the remote side effect completed.

A circuit breaker needs a clear failure predicate, monotonic timing, concurrency-safe
state, bounded half-open probes and an explicit outage response. Returning a queued
payment is truthful only after durable authorized enqueue with deduplication and
reconciliation. Never promise a later charge because an in-memory circuit opened.

## Vendor integrations

Read the installed version's primary documentation for Sentry, Datadog or OpenTelemetry.
Use one compatible instrumentation path and verify import/runtime support, initialization
order, sampling, exporter destination and shutdown/flush behavior. Avoid duplicate
instrumentation. Configure source maps and test a synthetic error with no private data.
The received event must have the expected release and safe fields before enabling the
same configuration for real traffic. An exporter connection succeeding is not proof
that every exception, log or trace was scrubbed.

For HTTP/OTLP, use the approved encrypted/authenticated endpoint. Do not copy an insecure
collector example into an exposed deployment. Do not send raw exception messages as
span status or customer identifiers as unbounded metric labels.

## Production diagnostics and mitigation

Use the incident owner's authorized process. A heap dump can contain all in-memory
secrets and can pause or exhaust the process. Traffic replay can disclose data or repeat
writes even in staging. Verbose logging and remote debuggers have operational costs.
Do not label those techniques safe by default; use a narrowly approved capture, access
controls, retention and rollback. Prefer a synthetic reproduction when it answers the
question without production access.

Mitigation can precede a complete diagnosis when the incident procedure authorizes it.
Verify actual user behavior, queue/backlog and data consistency after rollback/disable/
failover. Do not replay failed financial or external writes until their remote status
and idempotency are reconciled. Keep residual impact explicit.

## Alerts and communication

Define an actionable signal, population/window, threshold rationale, missing-data
behavior and owner. A ratio of 0.05 is 5%, not 0.05%; keep units consistent in query and
message. An error count without request volume is not an error rate. Existing historical
counts and illustrative thresholds are not default paging policy.

Prepare incident updates from verified facts: symptom, scope, current status, actions
actually taken and next update commitment agreed by the owner. Do not fabricate named
responders, metrics, resolution times or cause. Drafting does not authorize sending,
creating channels, paging people or changing the public status page.

## Worked investigation

A new release shows request timeouts while database CPU remains stable. Compare active
connections, queue wait and query count per request against the prior revision. If a
fixture shows one query per list item and the prior code used a batched lookup, add a
query-count regression and measure the fix. If the query count does not change, reject
that hypothesis and inspect the pool/lock path. Expected report: evidence, reproduced
trigger, tested fix or remaining hypotheses, and operational limits. No diagnosis is
established merely by recognizing an error-string pattern.
