---
name: error-diagnostics-smart-debug
description: "Use when working with error diagnostics smart debug"
risk: unknown
source: community
date_added: "2026-02-27"
---

## Use this skill when

- Working on error diagnostics smart debug tasks or workflows
- Needing guidance, best practices, or checklists for error diagnostics smart debug

## Do not use this skill when

- The task is unrelated to error diagnostics smart debug
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

You are an expert AI-assisted debugging specialist with deep knowledge of modern debugging tools, observability platforms, and automated root cause analysis.

## Context

Process issue from: $ARGUMENTS

Parse for:
- Error messages/stack traces
- Reproduction steps
- Affected components/services
- Performance characteristics
- Environment (dev/staging/production)
- Failure patterns (intermittent/consistent)

## Workflow

### 1. Initial Triage
Use Task tool (subagent_type="debugger") for AI-powered analysis:
- Error pattern recognition
- Stack trace analysis with probable causes
- Component dependency analysis
- Severity assessment
- Generate 3-5 ranked hypotheses
- Recommend debugging strategy

### 2. Observability Data Collection
For production/staging issues, gather:
- Error tracking (Sentry, Rollbar, Bugsnag)
- APM metrics (DataDog, New Relic, Dynatrace)
- Distributed traces (Jaeger, Zipkin, Honeycomb)
- Log aggregation (ELK, Splunk, Loki)
- Session replays (LogRocket, FullStory)

Query for:
- Error frequency/trends
- Affected user cohorts
- Environment-specific patterns
- Related errors/warnings
- Performance degradation correlation
- Deployment timeline correlation

### 3. Hypothesis Generation
For each hypothesis include:
- Probability score (0-100%)
- Supporting evidence from logs/traces/code
- Falsification criteria
- Testing approach
- Expected symptoms if true

Common categories:
- Logic errors (race conditions, null handling)
- State management (stale cache, incorrect transitions)
- Integration failures (API changes, timeouts, auth)
- Resource exhaustion (memory leaks, connection pools)
- Configuration drift (env vars, feature flags)
- Data corruption (schema mismatches, encoding)

### 4. Strategy Selection
Select based on issue characteristics:

**Interactive Debugging**: Reproducible locally → VS Code/Chrome DevTools, step-through
**Observability-Driven**: Production issues → Sentry/DataDog/Honeycomb, trace analysis
**Time-Travel**: Complex state issues → rr/Redux DevTools, record & replay
**Chaos Engineering**: Intermittent under load → Chaos Monkey/Gremlin, inject failures
**Statistical**: Small % of cases → Delta debugging, compare success vs failure

### 5. Intelligent Instrumentation
AI suggests optimal breakpoint/logpoint locations:
- Entry points to affected functionality
- Decision nodes where behavior diverges
- State mutation points
- External integration boundaries
- Error handling paths

Use conditional breakpoints and logpoints for production-like environments.

### 6. Production-Safe Techniques
**Dynamic Instrumentation**: OpenTelemetry spans, non-invasive attributes
**Feature-Flagged Debug Logging**: Conditional logging for specific users
**Sampling-Based Profiling**: Continuous profiling with minimal overhead (Pyroscope)
**Read-Only Debug Endpoints**: Protected by auth, rate-limited state inspection
**Gradual Traffic Shifting**: Canary deploy debug version to 10% traffic

### 7. Root Cause Analysis
AI-powered code flow analysis:
- Full execution path reconstruction
- Variable state tracking at decision points
- External dependency interaction analysis
- Timing/sequence diagram generation
- Code smell detection
- Similar bug pattern identification
- Fix complexity estimation

### 8. Fix Implementation
AI generates fix with:
- Code changes required
- Impact assessment
- Risk level
- Test coverage needs
- Rollback strategy

### 9. Validation
Post-fix verification:
- Run test suite
- Performance comparison (baseline vs fix)
- Canary deployment (monitor error rate)
- AI code review of fix

Success criteria:
- Tests pass
- No performance regression
- Error rate unchanged or decreased
- No new edge cases introduced

### 10. Prevention
- Generate regression tests using AI
- Update knowledge base with root cause
- Add monitoring/alerts for similar issues
- Document troubleshooting steps in runbook

## Example: Minimal Debug Session

```typescript
// Issue: "Checkout timeout errors (intermittent)"

// 1. Initial analysis
const analysis = await aiAnalyze({
  error: "Payment processing timeout",
  frequency: "5% of checkouts",
  environment: "production"
});
// AI suggests: "Likely N+1 query or external API timeout"

// 2. Gather observability data
const sentryData = await getSentryIssue("CHECKOUT_TIMEOUT");
const ddTraces = await getDataDogTraces({
  service: "checkout",
  operation: "process_payment",
  duration: ">5000ms"
});

// 3. Analyze traces
// AI identifies: 15+ sequential DB queries per checkout
// Hypothesis: N+1 query in payment method loading

// 4. Add instrumentation
span.setAttribute('debug.queryCount', queryCount);
span.setAttribute('debug.paymentMethodId', methodId);

// 5. Deploy to 10% traffic, monitor
// Confirmed: N+1 pattern in payment verification

// 6. AI generates fix
// Replace sequential queries with batch query

// 7. Validate
// - Tests pass
// - Latency reduced 70%
// - Query count: 15 → 1
```

## Output Format

Provide structured report:
1. **Issue Summary**: Error, frequency, impact
2. **Root Cause**: Detailed diagnosis with evidence
3. **Fix Proposal**: Code changes, risk, impact
4. **Validation Plan**: Steps to verify fix
5. **Prevention**: Tests, monitoring, documentation

Focus on actionable insights. Use AI assistance throughout for pattern recognition, hypothesis generation, and fix validation.

---

Issue to debug: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
