---
name: azure-monitor-opentelemetry-ts
description: "Auto-instrument Node.js applications with distributed tracing, metrics, and logs."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure Monitor OpenTelemetry SDK for TypeScript

Auto-instrument Node.js applications with distributed tracing, metrics, and logs.

## Installation

```bash
# Distro (recommended - auto-instrumentation)
npm install @azure/monitor-opentelemetry

# Low-level exporters (custom OpenTelemetry setup)
npm install @azure/monitor-opentelemetry-exporter

# Custom logs ingestion
npm install @azure/monitor-ingestion
```

## Environment Variables

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
```

## Quick Start (Auto-Instrumentation)

**IMPORTANT:** Call `useAzureMonitor()` BEFORE importing other modules.

```typescript
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  }
});

// Now import your application
import express from "express";
const app = express();
```

## ESM Support (Node.js 18.19+)

```bash
node --import @azure/monitor-opentelemetry/loader ./dist/index.js
```

**package.json:**
```json
{
  "scripts": {
    "start": "node --import @azure/monitor-opentelemetry/loader ./dist/index.js"
  }
}
```

## Full Configuration

```typescript
import { useAzureMonitor, AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";
import { resourceFromAttributes } from "@opentelemetry/resources";

const options: AzureMonitorOpenTelemetryOptions = {
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    storageDirectory: "/path/to/offline/storage",
    disableOfflineStorage: false
  },
  
  // Sampling
  samplingRatio: 1.0,  // 0-1, percentage of traces
  
  // Features
  enableLiveMetrics: true,
  enableStandardMetrics: true,
  enablePerformanceCounters: true,
  
  // Instrumentation libraries
  instrumentationOptions: {
    azureSdk: { enabled: true },
    http: { enabled: true },
    mongoDb: { enabled: true },
    mySql: { enabled: true },
    postgreSql: { enabled: true },
    redis: { enabled: true },
    bunyan: { enabled: false },
    winston: { enabled: false }
  },
  
  // Custom resource
  resource: resourceFromAttributes({ "service.name": "my-service" })
};

useAzureMonitor(options);
```

## Custom Traces

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-tracer");

const span = tracer.startSpan("doWork");
try {
  span.setAttribute("component", "worker");
  span.setAttribute("operation.id", "42");
  span.addEvent("processing started");
  
  // Your work here
  
} catch (error) {
  span.recordException(error as Error);
  span.setStatus({ code: 2, message: (error as Error).message });
} finally {
  span.end();
}
```

## Custom Metrics

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("my-meter");

// Counter
const counter = meter.createCounter("requests_total");
counter.add(1, { route: "/api/users", method: "GET" });

// Histogram
const histogram = meter.createHistogram("request_duration_ms");
histogram.record(150, { route: "/api/users" });

// Observable Gauge
const gauge = meter.createObservableGauge("active_connections");
gauge.addCallback((result) => {
  result.observe(getActiveConnections(), { pool: "main" });
});
```

## Manual Exporter Setup

### Trace Exporter

```typescript
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

const exporter = new AzureMonitorTraceExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

const provider = new NodeTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)]
});

provider.register();
```

### Metric Exporter

```typescript
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { PeriodicExportingMetricReader, MeterProvider } from "@opentelemetry/sdk-metrics";
import { metrics } from "@opentelemetry/api";

const exporter = new AzureMonitorMetricExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

const meterProvider = new MeterProvider({
  readers: [new PeriodicExportingMetricReader({ exporter })]
});

metrics.setGlobalMeterProvider(meterProvider);
```

### Log Exporter

```typescript
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";

const exporter = new AzureMonitorLogExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(exporter));

logs.setGlobalLoggerProvider(loggerProvider);
```

## Custom Logs Ingestion

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { LogsIngestionClient, isAggregateLogsUploadError } from "@azure/monitor-ingestion";

const endpoint = "https://<dce>.ingest.monitor.azure.com";
const ruleId = "<data-collection-rule-id>";
const streamName = "Custom-MyTable_CL";

const client = new LogsIngestionClient(endpoint, new DefaultAzureCredential());

const logs = [
  {
    Time: new Date().toISOString(),
    Computer: "Server1",
    Message: "Application started",
    Level: "Information"
  }
];

try {
  await client.upload(ruleId, streamName, logs);
} catch (error) {
  if (isAggregateLogsUploadError(error)) {
    for (const uploadError of error.errors) {
      console.error("Failed logs:", uploadError.failedLogs);
    }
  }
}
```

## Custom Span Processor

```typescript
import { SpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { Span, Context, SpanKind, TraceFlags } from "@opentelemetry/api";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

class FilteringSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> { return Promise.resolve(); }
  shutdown(): Promise<void> { return Promise.resolve(); }
  onStart(span: Span, context: Context): void {}
  
  onEnd(span: ReadableSpan): void {
    // Add custom attributes
    span.attributes["CustomDimension"] = "value";
    
    // Filter out internal spans
    if (span.kind === SpanKind.INTERNAL) {
      span.spanContext().traceFlags = TraceFlags.NONE;
    }
  }
}

useAzureMonitor({
  spanProcessors: [new FilteringSpanProcessor()]
});
```

## Sampling

```typescript
import { ApplicationInsightsSampler } from "@azure/monitor-opentelemetry-exporter";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Sample 75% of traces
const sampler = new ApplicationInsightsSampler(0.75);

const provider = new NodeTracerProvider({ sampler });
```

## Shutdown

```typescript
import { useAzureMonitor, shutdownAzureMonitor } from "@azure/monitor-opentelemetry";

useAzureMonitor();

// On application shutdown
process.on("SIGTERM", async () => {
  await shutdownAzureMonitor();
  process.exit(0);
});
```

## Key Types

```typescript
import {
  useAzureMonitor,
  shutdownAzureMonitor,
  AzureMonitorOpenTelemetryOptions,
  InstrumentationOptions
} from "@azure/monitor-opentelemetry";

import {
  AzureMonitorTraceExporter,
  AzureMonitorMetricExporter,
  AzureMonitorLogExporter,
  ApplicationInsightsSampler,
  AzureMonitorExporterOptions
} from "@azure/monitor-opentelemetry-exporter";

import {
  LogsIngestionClient,
  isAggregateLogsUploadError
} from "@azure/monitor-ingestion";
```

## Best Practices

1. **Call useAzureMonitor() first** - Before importing other modules
2. **Use ESM loader for ESM projects** - `--import @azure/monitor-opentelemetry/loader`
3. **Enable offline storage** - For reliable telemetry in disconnected scenarios
4. **Set sampling ratio** - For high-traffic applications
5. **Add custom dimensions** - Use span processors for enrichment
6. **Graceful shutdown** - Call `shutdownAzureMonitor()` to flush telemetry

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
