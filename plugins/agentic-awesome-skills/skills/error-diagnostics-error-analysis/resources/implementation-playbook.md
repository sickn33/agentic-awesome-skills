# Error Analysis and Resolution Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Error Detection and Classification

### Error Taxonomy

Classify errors into these categories to inform your debugging strategy:

**By Severity:**
- **Critical**: System down, data loss, security breach, complete service unavailability
- **High**: Major feature broken, significant user impact, data corruption risk
- **Medium**: Partial feature degradation, workarounds available, performance issues
- **Low**: Minor bugs, cosmetic issues, edge cases with minimal impact

**By Type:**
- **Runtime Errors**: Exceptions, crashes, segmentation faults, null pointer dereferences
- **Logic Errors**: Incorrect behavior, wrong calculations, invalid state transitions
- **Integration Errors**: API failures, network timeouts, external service issues
- **Performance Errors**: Memory leaks, CPU spikes, slow queries, resource exhaustion
- **Configuration Errors**: Missing environment variables, invalid settings, version mismatches
- **Security Errors**: Authentication failures, authorization violations, injection attempts

**By Observability:**
- **Deterministic**: Consistently reproducible with known inputs
- **Intermittent**: Occurs sporadically, often timing or race condition related
- **Environmental**: Only happens in specific environments or configurations
- **Load-dependent**: Appears under high traffic or resource pressure

### Error Detection Strategy

Implement multi-layered error detection:

1. **Application-Level Instrumentation**: Use error tracking SDKs (Sentry, DataDog Error Tracking, Rollbar) to automatically capture unhandled exceptions with full context
2. **Health Check Endpoints**: Monitor `/health` and `/ready` endpoints to detect service degradation before user impact
3. **Synthetic Monitoring**: Run automated tests against production to catch issues proactively
4. **Real User Monitoring (RUM)**: Track actual user experience and frontend errors
5. **Log Pattern Analysis**: Use SIEM tools to identify error spikes and anomalous patterns
6. **APM Thresholds**: Alert on error rate increases, latency spikes, or throughput drops

### Error Aggregation and Pattern Recognition

Group related errors to identify systemic issues:

- **Fingerprinting**: Group errors by stack trace similarity, error type, and affected code path
- **Trend Analysis**: Track error frequency over time to detect regressions or emerging issues
- **Correlation Analysis**: Link errors to deployments, configuration changes, or external events
- **User Impact Scoring**: Prioritize based on number of affected users and sessions
- **Geographic/Temporal Patterns**: Identify region-specific or time-based error clusters

## Root Cause Analysis Techniques

### Systematic Investigation Process

Follow this structured approach for each error:

1. **Reproduce the Error**: Create minimal reproduction steps. If intermittent, identify triggering conditions
2. **Isolate the Failure Point**: Narrow down the exact line of code or component where failure originates
3. **Analyze the Call Chain**: Trace backwards from the error to understand how the system reached the failed state
4. **Inspect Variable State**: Examine values at the point of failure and preceding steps
5. **Review Recent Changes**: Check git history for recent modifications to affected code paths
6. **Test Hypotheses**: Form theories about the cause and validate with targeted experiments

### The Five Whys Technique

Ask "why" repeatedly to drill down to root causes:

```
Error: Database connection timeout after 30s

Why? The database connection pool was exhausted
Why? All connections were held by long-running queries
Why? A new feature introduced N+1 query patterns
Why? The ORM lazy-loading wasn't properly configured
Why? Code review didn't catch the performance regression
```

Root cause: Insufficient code review process for database query patterns.

### Distributed Systems Debugging

For errors in microservices and distributed systems:

- **Trace the Request Path**: Use correlation IDs to follow requests across service boundaries
- **Check Service Dependencies**: Identify which upstream/downstream services are involved
- **Analyze Cascading Failures**: Determine if this is a symptom of a different service's failure
- **Review Circuit Breaker State**: Check if protective mechanisms are triggered
- **Examine Message Queues**: Look for backpressure, dead letters, or processing delays
- **Timeline Reconstruction**: Build a timeline of events across all services using distributed tracing

## Stack Trace Analysis

### Interpreting Stack Traces

Extract maximum information from stack traces:

**Key Elements:**
- **Error Type**: What kind of exception/error occurred
- **Error Message**: Contextual information about the failure
- **Origin Point**: The deepest frame where the error was thrown
- **Call Chain**: The sequence of function calls leading to the error
- **Framework vs Application Code**: Distinguish between library and your code
- **Async Boundaries**: Identify where asynchronous operations break the trace

**Analysis Strategy:**
1. Start at the top of the stack (origin of error)
2. Identify the first frame in your application code (not framework/library)
3. Examine that frame's context: input parameters, local variables, state
4. Trace backwards through calling functions to understand how invalid state was created
5. Look for patterns: is this in a loop? Inside a callback? After an async operation?

### Stack Trace Enrichment

Modern error tracking tools provide enhanced stack traces:

- **Source Code Context**: View surrounding lines of code for each frame
- **Local Variable Values**: Inspect variable state at each frame (with Sentry's debug mode)
- **Breadcrumbs**: See the sequence of events leading to the error
- **Release Tracking**: Link errors to specific deployments and commits
- **Source Maps**: For minified JavaScript, map back to original source
- **Inline Comments**: Annotate stack frames with contextual information

### Common Stack Trace Patterns

**Pattern: Null Pointer Exception Deep in Framework Code**
```
NullPointerException
  at java.util.HashMap.hash(HashMap.java:339)
  at java.util.HashMap.get(HashMap.java:556)
  at com.myapp.service.UserService.findUser(UserService.java:45)
```
Root Cause: Application passed null to framework code. Focus on UserService.java:45.

**Pattern: Timeout After Long Wait**
```
TimeoutException: Operation timed out after 30000ms
  at okhttp3.internal.http2.Http2Stream.waitForIo
  at com.myapp.api.PaymentClient.processPayment(PaymentClient.java:89)
```
Root Cause: External service slow/unresponsive. Need retry logic and circuit breaker.

**Pattern: Race Condition in Concurrent Code**
```
ConcurrentModificationException
  at java.util.ArrayList$Itr.checkForComodification
  at com.myapp.processor.BatchProcessor.process(BatchProcessor.java:112)
```
Root Cause: Collection modified while being iterated. Need thread-safe data structures or synchronization.

## Log Aggregation and Pattern Matching

### Structured Logging Implementation

Implement JSON-based structured logging for machine-readable logs:

**Standard Log Schema:**
```json
{
  "timestamp": "2025-10-11T14:23:45.123Z",
  "level": "ERROR",
  "correlation_id": "req-7f3b2a1c-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service": "payment-service",
  "environment": "production",
  "host": "pod-payment-7d4f8b9c-xk2l9",
  "version": "v2.3.1",
  "error": {
    "type": "PaymentProcessingException",
    "message": "Failed to charge card: Insufficient funds",
    "stack_trace": "...",
    "fingerprint": "payment-insufficient-funds"
  },
  "user": {
    "id": "user-12345",
    "ip": "203.0.113.42",
    "session_id": "sess-abc123"
  },
  "request": {
    "method": "POST",
    "path": "/api/v1/payments/charge",
    "duration_ms": 2547,
    "status_code": 402
  },
  "context": {
    "payment_method": "credit_card",
    "amount": 149.99,
    "currency": "USD",
    "merchant_id": "merchant-789"
  }
}
```

**Key Fields to Always Include:**
- `timestamp`: ISO 8601 format in UTC
- `level`: ERROR, WARN, INFO, DEBUG, TRACE
- `correlation_id`: Unique ID for the entire request chain
- `trace_id` and `span_id`: OpenTelemetry identifiers for distributed tracing
- `service`: Which microservice generated this log
- `environment`: dev, staging, production
- `error.fingerprint`: Stable identifier for grouping similar errors

### Correlation ID Pattern

Implement correlation IDs to track requests across distributed systems:

**Node.js/Express Middleware:**
```javascript
const { v4: uuidv4 } = require('uuid');
const asyncLocalStorage = require('async-local-storage');

// Middleware to generate/propagate correlation ID
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Store in async context for access in nested calls
  asyncLocalStorage.run(new Map(), () => {
    asyncLocalStorage.set('correlationId', correlationId);
    next();
  });
}

// Propagate to downstream services
function makeApiCall(url, data) {
  const correlationId = asyncLocalStorage.get('correlationId');
  return axios.post(url, data, {
    headers: {
      'x-correlation-id': correlationId,
      'x-source-service': 'api-gateway'
    }
  });
}

// Include in all log statements
function log(level, message, context = {}) {
  const correlationId = asyncLocalStorage.get('correlationId');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    message,
    ...context
  }));
}
```

**Python/Flask Implementation:**
```python
import uuid
import logging
from flask import request, g
import json

class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = g.get('correlation_id', 'N/A')
        return True

@app.before_request
def setup_correlation_id():
    correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
    g.correlation_id = correlation_id

@app.after_request
def add_correlation_header(response):
    response.headers['X-Correlation-ID'] = g.correlation_id
    return response

# Structured logging with correlation ID
logging.basicConfig(
    format='%(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)
logger.addFilter(CorrelationIdFilter())

def log_structured(level, message, **context):
    log_entry = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'level': level,
        'correlation_id': g.correlation_id,
        'service': 'payment-service',
        'message': message,
        **context
    }
    logger.log(getattr(logging, level), json.dumps(log_entry))
```

### Log Aggregation Architecture

**Centralized Logging Pipeline:**
1. **Application**: Outputs structured JSON logs to stdout/stderr
2. **Log Shipper**: Fluentd/Fluent Bit/Vector collects logs from containers
3. **Log Aggregator**: Elasticsearch/Loki/DataDog receives and indexes logs
4. **Visualization**: Kibana/Grafana/DataDog UI for querying and dashboards
5. **Alerting**: Trigger alerts on error patterns and thresholds

**Log Query Examples (Elasticsearch DSL):**
```json
// Find all errors for a specific correlation ID
{
  "query": {
    "bool": {
      "must": [
        { "match": { "correlation_id": "req-7f3b2a1c-4d5e-6f7g" }},
        { "term": { "level": "ERROR" }}
      ]
    }
  },
  "sort": [{ "timestamp": "asc" }]
}

// Find error rate spike in last hour
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "ERROR" }},
        { "range": { "timestamp": { "gte": "now-1h" }}}
      ]
    }
  },
  "aggs": {
    "errors_per_minute": {
      "date_histogram": {
        "field": "timestamp",
        "fixed_interval": "1m"
      }
    }
  }
}

// Group errors by fingerprint to find most common issues
{
  "query": {
    "term": { "level": "ERROR" }
  },
  "aggs": {
    "error_types": {
      "terms": {
        "field": "error.fingerprint",
        "size": 10
      },
      "aggs": {
        "affected_users": {
          "cardinality": { "field": "user.id" }
        }
      }
    }
  }
}
```

### Pattern Detection and Anomaly Recognition

Use log analysis to identify patterns:

- **Error Rate Spikes**: Compare current error rate to historical baseline (e.g., >3 standard deviations)
- **New Error Types**: Alert when previously unseen error fingerprints appear
- **Cascading Failures**: Detect when errors in one service trigger errors in dependent services
- **User Impact Patterns**: Identify which users/segments are disproportionately affected
- **Geographic Patterns**: Spot region-specific issues (e.g., CDN problems, data center outages)
- **Temporal Patterns**: Find time-based issues (e.g., batch jobs, scheduled tasks, time zone bugs)

## Debugging Workflow

### Interactive Debugging

For deterministic errors in development:

**Debugger Setup:**
1. Set breakpoint before the error occurs
2. Step through code execution line by line
3. Inspect variable values and object state
4. Evaluate expressions in the debug console
5. Watch for unexpected state changes
6. Modify variables to test hypotheses

**Modern Debugging Tools:**
- **VS Code Debugger**: Integrated debugging for JavaScript, Python, Go, Java, C++
- **Chrome DevTools**: Frontend debugging with network, performance, and memory profiling
- **pdb/ipdb (Python)**: Interactive debugger with post-mortem analysis
- **dlv (Go)**: Delve debugger for Go programs
- **lldb (C/C++)**: Low-level debugger with reverse debugging capabilities

### Production Debugging

For errors in production environments where debuggers aren't available:

**Safe Production Debugging Techniques:**

1. **Enhanced Logging**: Add strategic log statements around suspected failure points
2. **Feature Flags**: Enable verbose logging for specific users/requests
3. **Sampling**: Log detailed context for a percentage of requests
4. **APM Transaction Traces**: Use DataDog APM or New Relic to see detailed transaction flows
5. **Distributed Tracing**: Leverage OpenTelemetry traces to understand cross-service interactions
6. **Profiling**: Use continuous profilers (DataDog Profiler, Pyroscope) to identify hot spots
7. **Heap Dumps**: Capture memory snapshots for analysis of memory leaks
8. **Traffic Mirroring**: Replay production traffic in staging for safe investigation

**Remote Debugging (Use Cautiously):**
- Attach debugger to running process only in non-critical services
- Use read-only breakpoints that don't pause execution
- Time-box debugging sessions strictly
- Always have rollback plan ready

### Memory and Performance Debugging

**Memory Leak Detection:**
```javascript
// Node.js heap snapshot comparison
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot(filename) {
  const snapshot = v8.writeHeapSnapshot(filename);
  console.log(`Heap snapshot written to ${snapshot}`);
}

// Take snapshots at intervals
takeHeapSnapshot('heap-before.heapsnapshot');
// ... run operations that might leak ...
takeHeapSnapshot('heap-after.heapsnapshot');

// Analyze in Chrome DevTools Memory profiler
// Look for objects with increasing retained size
```

**Performance Profiling:**
```python
# Python profiling with cProfile
import cProfile
import pstats
from pstats import SortKey

def profile_function():
    profiler = cProfile.Profile()
    profiler.enable()

    # Your code here
    process_large_dataset()

    profiler.disable()

    stats = pstats.Stats(profiler)
    stats.sort_stats(SortKey.CUMULATIVE)
    stats.print_stats(20)  # Top 20 time-consuming functions
```

## Error Prevention Strategies

### Input Validation and Type Safety

**Defensive Programming:**
```typescript
// TypeScript: Leverage type system for compile-time safety
interface PaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
}

function processPayment(request: PaymentRequest): PaymentResult {
  // Runtime validation for external inputs
  if (request.amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  if (!['USD', 'EUR', 'GBP'].includes(request.currency)) {
    throw new ValidationError('Unsupported currency');
  }

  // Use Zod or Yup for complex validation
  const schema = z.object({
    amount: z.number().positive().max(1000000),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    customerId: z.string().uuid(),
    paymentMethodId: z.string().min(1)
  });

  const validated = schema.parse(request);

  // Now safe to process
  return chargeCustomer(validated);
}
```

**Python Type Hints and Validation:**
```python
from typing import Optional
from pydantic import BaseModel, validator, Field
from decimal import Decimal

class PaymentRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, le=1000000)
    currency: str
    customer_id: str
    payment_method_id: str

    @validator('currency')
    def validate_currency(cls, v):
        if v not in ['USD', 'EUR', 'GBP']:
            raise ValueError('Unsupported currency')
        return v

    @validator('customer_id', 'payment_method_id')
    def validate_ids(cls, v):
        if not v or len(v) < 1:
            raise ValueError('ID cannot be empty')
        return v

def process_payment(request: PaymentRequest) -> PaymentResult:
    # Pydantic validates automatically on instantiation
    # Type hints provide IDE support and static analysis
    return charge_customer(request)
```

### Error Boundaries and Graceful Degradation

**React Error Boundaries:**
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });

    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Circuit Breaker Pattern:**
```python
from datetime import datetime, timedelta
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60, success_threshold=2):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError("Circuit breaker is OPEN")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def _should_attempt_reset(self):
        return (datetime.now() - self.last_failure_time) > timedelta(seconds=self.timeout)

# Usage
payment_circuit = CircuitBreaker(failure_threshold=5, timeout=60)

def process_payment_with_circuit_breaker(payment_data):
    try:
        result = payment_circuit.call(external_payment_api.charge, payment_data)
        return result
    except CircuitBreakerOpenError:
        # Graceful degradation: queue for later processing
        payment_queue.enqueue(payment_data)
        return {"status": "queued", "message": "Payment will be processed shortly"}
```

### Retry Logic with Exponential Backoff

```typescript
// TypeScript retry implementation
interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableErrors?: string[];
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    exponentialBase: 2
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (options.retryableErrors &&
          !options.retryableErrors.includes(error.name)) {
        throw error; // Don't retry non-retryable errors
      }

      if (attempt < options.maxAttempts - 1) {
        const delay = Math.min(
          options.baseDelayMs * Math.pow(options.exponentialBase, attempt),
          options.maxDelayMs
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const actualDelay = delay + jitter;

        console.log(`Attempt ${attempt + 1} failed, retrying in ${actualDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    }
  }

  throw lastError!;
}

// Usage
const result = await retryWithBackoff(
  () => fetch('https://api.example.com/data'),
  {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2,
    retryableErrors: ['NetworkError', 'TimeoutError']
  }
);
```

## Monitoring and Alerting Integration

### Modern Observability Stack (2025)

**Recommended Architecture:**
- **Metrics**: Prometheus + Grafana or DataDog
- **Logs**: Elasticsearch/Loki + Fluentd or DataDog Logs
- **Traces**: OpenTelemetry + Jaeger/Tempo or DataDog APM
- **Errors**: Sentry or DataDog Error Tracking
- **Frontend**: Sentry Browser SDK or DataDog RUM
- **Synthetics**: DataDog Synthetics or Checkly

### Sentry Integration

**Node.js/Express Setup:**
```javascript
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,

  integrations: [
    new ProfilingIntegration(),
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],

  beforeSend(event, hint) {
    // Scrub sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      region: process.env.AWS_REGION,
      instance_id: process.env.INSTANCE_ID
    };

    return event;
  }
});

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Routes here...

// Error handler (must be last)
app.use(Sentry.Handlers.errorHandler());

// Manual error capture with context
function processOrder(orderId) {
  try {
    const order = getOrder(orderId);
    chargeCustomer(order);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        operation: 'process_order',
        order_id: orderId
      },
      contexts: {
        order: {
          id: orderId,
          status: order?.status,
          amount: order?.amount
        }
      },
      user: {
        id: order?.customerId
      }
    });
    throw error;
  }
}
```

### DataDog APM Integration

**Python/Flask Setup:**
```python
from ddtrace import patch_all, tracer
from ddtrace.contrib.flask import TraceMiddleware
import logging

# Auto-instrument common libraries
patch_all()

app = Flask(__name__)

# Initialize tracing
TraceMiddleware(app, tracer, service='payment-service')

# Custom span for detailed tracing
@app.route('/api/v1/payments/charge', methods=['POST'])
def charge_payment():
    with tracer.trace('payment.charge', service='payment-service') as span:
        payment_data = request.json

        # Add custom tags
        span.set_tag('payment.amount', payment_data['amount'])
        span.set_tag('payment.currency', payment_data['currency'])
        span.set_tag('customer.id', payment_data['customer_id'])

        try:
            result = payment_processor.charge(payment_data)
            span.set_tag('payment.status', 'success')
            return jsonify(result), 200
        except InsufficientFundsError as e:
            span.set_tag('payment.status', 'insufficient_funds')
            span.set_tag('error', True)
            return jsonify({'error': 'Insufficient funds'}), 402
        except Exception as e:
            span.set_tag('payment.status', 'error')
            span.set_tag('error', True)
            span.set_tag('error.message', str(e))
            raise
```

### OpenTelemetry Implementation

**Go Service with OpenTelemetry:**
```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("payment-service"),
            semconv.ServiceVersionKey.String("v2.3.1"),
            attribute.String("environment", "production"),
        )),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

func processPayment(ctx context.Context, paymentReq PaymentRequest) error {
    tracer := otel.Tracer("payment-service")
    ctx, span := tracer.Start(ctx, "processPayment")
    defer span.End()

    // Add attributes
    span.SetAttributes(
        attribute.Float64("payment.amount", paymentReq.Amount),
        attribute.String("payment.currency", paymentReq.Currency),
        attribute.String("customer.id", paymentReq.CustomerID),
    )

    // Call downstream service
    err := chargeCard(ctx, paymentReq)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    span.SetStatus(codes.Ok, "Payment processed successfully")
    return nil
}

func chargeCard(ctx context.Context, paymentReq PaymentRequest) error {
    tracer := otel.Tracer("payment-service")
    ctx, span := tracer.Start(ctx, "chargeCard")
    defer span.End()

    // Simulate external API call
    result, err := paymentGateway.Charge(ctx, paymentReq)
    if err != nil {
        return fmt.Errorf("payment gateway error: %w", err)
    }

    span.SetAttributes(
        attribute.String("transaction.id", result.TransactionID),
        attribute.String("gateway.response_code", result.ResponseCode),
    )

    return nil
}
```

### Alert Configuration

**Intelligent Alerting Strategy:**

```yaml
# DataDog Monitor Configuration
monitors:
  - name: "High Error Rate - Payment Service"
    type: metric
    query: "avg(last_5m):sum:trace.express.request.errors{service:payment-service} / sum:trace.express.request.hits{service:payment-service} > 0.05"
    message: |
      Payment service error rate is {{value}}% (threshold: 5%)

      This may indicate:
      - Payment gateway issues
      - Database connectivity problems
      - Invalid payment data

      Runbook: https://wiki.company.com/runbooks/payment-errors

      @slack-payments-oncall @pagerduty-payments

    tags:
      - service:payment-service
      - severity:high

    options:
      notify_no_data: true
      no_data_timeframe: 10
      escalation_message: "Error rate still elevated after 10 minutes"

  - name: "New Error Type Detected"
    type: log
    query: "logs(\"level:ERROR service:payment-service\").rollup(\"count\").by(\"error.fingerprint\").last(\"5m\") > 0"
    message: |
      New error type detected in payment service: {{error.fingerprint}}

      First occurrence: {{timestamp}}
      Affected users: {{user_count}}

      @slack-engineering

    options:
      enable_logs_sample: true

  - name: "Payment Service - P95 Latency High"
    type: metric
    query: "avg(last_10m):p95:trace.express.request.duration{service:payment-service} > 2000"
    message: |
      Payment service P95 latency is {{value}}ms (threshold: 2000ms)

      Check:
      - Database query performance
      - External API response times
      - Resource constraints (CPU/memory)

      Dashboard: https://app.datadoghq.com/dashboard/payment-service

      @slack-payments-team
```

## Production Incident Response

### Incident Response Workflow

**Phase 1: Detection and Triage (0-5 minutes)**
1. Acknowledge the alert/incident
2. Check incident severity and user impact
3. Assign incident commander
4. Create incident channel (#incident-2025-10-11-payment-errors)
5. Update status page if customer-facing

**Phase 2: Investigation (5-30 minutes)**
1. Gather observability data:
   - Error rates from Sentry/DataDog
   - Traces showing failed requests
   - Logs around the incident start time
   - Metrics showing resource usage, latency, throughput
2. Correlate with recent changes:
   - Recent deployments (check CI/CD pipeline)
   - Configuration changes
   - Infrastructure changes
   - External dependencies status
3. Form initial hypothesis about root cause
4. Document findings in incident log

**Phase 3: Mitigation (Immediate)**
1. Implement immediate fix based on hypothesis:
   - Rollback recent deployment
   - Scale up resources
   - Disable problematic feature (feature flag)
   - Failover to backup system
   - Apply hotfix
2. Verify mitigation worked (error rate decreases)
3. Monitor for 15-30 minutes to ensure stability

**Phase 4: Recovery and Validation**
1. Verify all systems operational
2. Check data consistency
3. Process queued/failed requests
4. Update status page: incident resolved
5. Notify stakeholders

**Phase 5: Post-Incident Review**
1. Schedule postmortem within 48 hours
2. Create detailed timeline of events
3. Identify root cause (may differ from initial hypothesis)
4. Document contributing factors
5. Create action items for:
   - Preventing similar incidents
   - Improving detection time
   - Improving mitigation time
   - Improving communication

### Incident Investigation Tools

**Query Patterns for Common Incidents:**

```
# Find all errors for a specific time window (Elasticsearch)
GET /logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "ERROR" }},
        { "term": { "service": "payment-service" }},
        { "range": { "timestamp": {
          "gte": "2025-10-11T14:00:00Z",
          "lte": "2025-10-11T14:30:00Z"
        }}}
      ]
    }
  },
  "sort": [{ "timestamp": "asc" }],
  "size": 1000
}

# Find correlation between errors and deployments (DataDog)
# Use deployment tracking to overlay deployment markers on error graphs
# Query: sum:trace.express.request.errors{service:payment-service} by {version}

# Identify affected users (Sentry)
# Navigate to issue → User Impact tab
# Shows: total users affected, new vs returning, geographic distribution

# Trace specific failed request (OpenTelemetry/Jaeger)
# Search by trace_id or correlation_id
# Visualize full request path across services
# Identify which service/span failed
```

### Communication Templates

**Initial Incident Notification:**
```
🚨 INCIDENT: Payment Processing Errors

Severity: High
Status: Investigating
Started: 2025-10-11 14:23 UTC
Incident Commander: @jane.smith

Symptoms:
- Payment processing error rate: 15% (normal: <1%)
- Affected users: ~500 in last 10 minutes
- Error: "Database connection timeout"

Actions Taken:
- Investigating database connection pool
- Checking recent deployments
- Monitoring error rate

Updates: Will provide update every 15 minutes
Status Page: https://status.company.com/incident/abc123
```

**Mitigation Notification:**
```
✅ INCIDENT UPDATE: Mitigation Applied

Severity: High → Medium
Status: Mitigated
Duration: 27 minutes

Root Cause: Database connection pool exhausted due to long-running queries
introduced in v2.3.1 deployment at 14:00 UTC

Mitigation: Rolled back to v2.3.0

Current Status:
- Error rate: 0.5% (back to normal)
- All systems operational
- Processing backlog of queued payments

Next Steps:
- Monitor for 30 minutes
- Fix query performance issue
- Deploy fixed version with testing
- Schedule postmortem
```

## Error Analysis Deliverables

For each error analysis, provide:

1. **Error Summary**: What happened, when, impact scope
2. **Root Cause**: The fundamental reason the error occurred
3. **Evidence**: Stack traces, logs, metrics supporting the diagnosis
4. **Immediate Fix**: Code changes to resolve the issue
5. **Testing Strategy**: How to verify the fix works
6. **Preventive Measures**: How to prevent similar errors in the future
7. **Monitoring Recommendations**: What to monitor/alert on going forward
8. **Runbook**: Step-by-step guide for handling similar incidents

Prioritize actionable recommendations that improve system reliability and reduce MTTR (Mean Time To Resolution) for future incidents.
