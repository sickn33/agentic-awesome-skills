---
name: applicationinsights-web-ts
description: "Instrument browser/web apps with the Application Insights JavaScript SDK (@microsoft/applicationinsights-web)."
risk: critical
source: https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts
source_repo: microsoft/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/microsoft/skills/blob/main/LICENSE
---

# Application Insights JavaScript SDK (Web) for TypeScript
## When to Use

Use this skill when you need instrument browser/web apps with the Application Insights JavaScript SDK (@microsoft/applicationinsights-web). Use for Real User Monitoring (RUM) — page views, clicks, AJAX/fetch dependencies, exceptions, custom events, and browser-side GenAI agent traces with explicitly verified backend correlation.


Real User Monitoring (RUM) for browser apps with `@microsoft/applicationinsights-web`. Auto-collects page views, AJAX/fetch dependencies, unhandled exceptions, and (with the Click Analytics plugin) clicks. Supports custom events, metrics, and **GenAI agent traces** that follow OpenTelemetry GenAI semantic conventions and correlate to backend spans via W3C Trace Context.

> **Distinct from `azure-monitor-opentelemetry-ts`**, which is for Node.js server apps. This skill is for **browser/web** code (and React Native).

## Before Implementation

Search `microsoft-docs` MCP for current API patterns:

- Query: "Application Insights JavaScript SDK setup"
- Query: "Application Insights JavaScript SDK configuration"
- Query: "Application Insights JavaScript framework extensions React Angular"
- Verify package version: `npm view @microsoft/applicationinsights-web version`

## Packages

| Package | Purpose |
| --- | --- |
| `@microsoft/applicationinsights-web` | Core RUM SDK (page views, AJAX, exceptions). |
| `@microsoft/applicationinsights-clickanalytics-js` | Auto-collect click telemetry. |
| `@microsoft/applicationinsights-react-js` | React plugin (router instrumentation, hooks, HOC, ErrorBoundary). |
| `@microsoft/applicationinsights-react-native` | React Native plugin (native crashes, sessions). |
| `@microsoft/applicationinsights-angularplugin-js` | Angular plugin (router events, ErrorHandler). |
| `@microsoft/applicationinsights-debugplugin-js` | Dev-only telemetry inspector. |
| `@microsoft/applicationinsights-perfmarkmeasure-js` | User Timing (`performance.mark/measure`) integration. |

## Installation

```bash
npm i --save @microsoft/applicationinsights-web
# Optional plugins (install only what you use):
npm i --save @microsoft/applicationinsights-clickanalytics-js
npm i --save @microsoft/applicationinsights-react-js @microsoft/applicationinsights-react-native @microsoft/applicationinsights-angularplugin-js
```

Typings ship with the package — no separate `@types/...` install needed.

## Connection String

The browser SDK requires a connection string at init time. **It ships in plaintext to clients** — Microsoft Entra ID auth is not supported for browser telemetry. Use a separate App Insights resource with local auth enabled for browser RUM if you need to isolate it from backend telemetry.

```bash
# Vite / CRA / Next.js — expose to client via the public env prefix
VITE_APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=https://...;LiveEndpoint=https://..."
NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=..."
```

## Quick Start (npm)

```typescript
import { ApplicationInsights, DistributedTracingModes } from "@microsoft/applicationinsights-web";

export const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true,        // SPA route changes -> page views
    enableCorsCorrelation: false, // opt in only for approved backend origins          // propagate Request-Id / traceparent to cross-origin AJAX
    enableRequestHeaderTracking: false, // avoid collecting credentials/PII
    enableResponseHeaderTracking: false,
    distributedTracingMode: DistributedTracingModes.W3C, // import the enum; do not infer names from numeric literals
    autoTrackPageVisitTime: true,
    disableFetchTracking: false,          // fetch() is auto-instrumented by default
    excludeRequestFromAutoTrackingPatterns: [/livemetrics\.azure\.com/i]
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView();
```

Call `loadAppInsights()` exactly once, as early as possible (before user interactions you want tracked). Then `trackPageView()` for the initial load — when `enableAutoRouteTracking` is on, subsequent route changes are automatic.

## Quick Start (SDK Loader Script)

Recommended when you want auto-updating SDK and zero build pipeline. Paste this as the **first** `<script>` in `<head>`:

```text
Retrieve and review the complete loader snippet from the official SDK setup page.
The prior queue-shim placeholder was not an implementation and must not be pasted as working code.
```

Loader-only API (queued until SDK loads): `trackEvent`, `trackPageView`, `trackException`, `trackTrace`, `trackDependencyData`, `trackMetric`, `trackPageViewPerformance`, `startTrackPage`, `stopTrackPage`, `startTrackEvent`, `stopTrackEvent`, `addTelemetryInitializer`, `setAuthenticatedUserContext`, `clearAuthenticatedUserContext`, `flush`.

## Core Tracking APIs

```typescript
// Page views (SPAs that disable enableAutoRouteTracking)
appInsights.trackPageView({ name: "Checkout", uri: "/checkout", properties: { cartSize: 3 } });

// Custom events (user actions, business events)
appInsights.trackEvent({ name: "PurchaseCompleted" }, { orderId: "ord_123", amountUsd: 49.95 });

// Exceptions (caught errors)
try {
  await pay(order);
} catch (err) {
  appInsights.trackException({ exception: err as Error, severityLevel: 3, properties: { orderId: order.id } });
}

// Traces (logs, severity 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Critical)
appInsights.trackTrace({ message: "Cart hydrated from local storage", severityLevel: 1 });

// Custom metrics (numeric)
appInsights.trackMetric({ name: "checkout.duration_ms", average: 1234 });

// Dependencies (manually-tracked outbound calls — fetch/XHR are auto-tracked)
appInsights.trackDependencyData({
  id: crypto.randomUUID(),
  name: "GET /api/orders",
  duration: 87, success: true, responseCode: 200,
  data: "https://api.example.com/api/orders", target: "api.example.com", type: "Fetch"
});

// User identity (set ONCE per authenticated session — values are PII; do not pass emails)
appInsights.setAuthenticatedUserContext("user-id-123", "tenant-456", /*storeInCookie*/ false);
appInsights.clearAuthenticatedUserContext(); // on logout

// Force send before unload
appInsights.flush();
```

## Telemetry Initializers (enrichment & filtering)

Run for every envelope before send. Return `false` to drop.

```typescript
import type { ITelemetryItem } from "@microsoft/applicationinsights-web";

appInsights.addTelemetryInitializer((item: ITelemetryItem) => {
  item.tags ??= {};
  item.tags["ai.cloud.role"] = "web-shop";
  item.tags["ai.cloud.roleInstance"] = window.location.hostname;
  item.data ??= {};
  item.data["app.version"] = import.meta.env.VITE_APP_VERSION;
  item.data["app.build"] = import.meta.env.VITE_BUILD_SHA;

  // Drop noisy health-check page views
  if (item.baseType === "PageviewData" && item.baseData?.uri?.endsWith("/healthz")) return false;

  // Scrub query-string secrets
  if (item.baseData?.uri) {
    item.baseData.uri = (() => { const u = new URL(item.baseData.uri, location.origin); u.search = ""; u.hash = ""; return u.toString(); })();
  }
});
```

## Click Analytics

```typescript
import { ClickAnalyticsPlugin } from "@microsoft/applicationinsights-clickanalytics-js";

const clickPlugin = new ClickAnalyticsPlugin();
const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    extensions: [clickPlugin],
    extensionConfig: {
      [clickPlugin.identifier]: {
        autoCapture: false, // enable only after approved data-tag allowlisting
        dataTags: { useDefaultContentNameOrId: true, customDataPrefix: "data-ai-" },
        urlCollectHash: false,
        behaviorValidator: (b: string) => /^[a-z0-9_]+$/.test(b) ? b : ""
      }
    }
  }
});
appInsights.loadAppInsights();
```

Mark elements with `data-ai-*` attributes; clicks are emitted as Custom Events with parent-content metadata.

## SPA Route Tracking

- **Built-in:** set `enableAutoRouteTracking: true`. Hooks `history.pushState/replaceState` and `popstate`.
- **React Router:** use `@microsoft/applicationinsights-react-js` `withAITracking` HOC (see [references/framework-extensions.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/framework-extensions.md)).
- **Manual:** call `appInsights.trackPageView({ name, uri })` in your router's `useEffect` on route change. Disable `enableAutoRouteTracking` to avoid double counting.

## Distributed Tracing (correlate to backend)

Set the named `DistributedTracingModes.W3C` (or deliberately select `AI_AND_W3C`). The SDK adds `traceparent` (and legacy `Request-Id`) to outbound `fetch`/`XHR`. Backends instrumented with **OpenTelemetry** (e.g. `@azure/monitor-opentelemetry`) auto-link to the browser's operation_Id.

For approved cross-origin calls, enable correlation with an origin/domain allowlist. The server allows the calling origin via Access-Control-Allow-Origin and permits the required trace request headers; exposed response headers are a separate configuration.

## GenAI Agent Traces (OTel semantic conventions)

When the browser invokes an AI agent (function-calling, tool-use, model calls direct from the client), emit App Insights **Dependency** telemetry whose attributes follow the OpenTelemetry **GenAI semantic conventions** so they are queryable alongside backend agent spans in App Insights / Log Analytics.

**Set the opt-in env first** so backend instrumentations agree on the same schema version:

```bash
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
```

### Required attribute keys (use the OTel names verbatim)

| Span / op | Required attributes |
| --- | --- |
| `invoke_agent {agent.name}` | `gen_ai.operation.name=invoke_agent`, `gen_ai.provider.name`, `gen_ai.agent.name`, `gen_ai.agent.id` (when known) |
| `create_agent {agent.name}` | `gen_ai.operation.name=create_agent`, `gen_ai.provider.name`, `gen_ai.agent.name`, `gen_ai.request.model` |
| `chat {model}` | `gen_ai.operation.name=chat`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` |
| `execute_tool {tool.name}` | `gen_ai.operation.name=execute_tool`, `gen_ai.tool.name`, `gen_ai.tool.type` (`function` \| `extension` \| `datastore`), `gen_ai.tool.call.id` |

`gen_ai.provider.name` well-known values: `openai`, `azure.ai.openai`, `azure.ai.inference`, `anthropic`, `aws.bedrock`, `gcp.gemini`, `gcp.vertex_ai`, `cohere`, `mistral_ai`, `groq`, `deepseek`, `perplexity`, `x_ai`, `ibm.watsonx.ai`.

> **Sensitive content opt-in.** `gen_ai.system_instructions`, `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.tool.call.arguments`, `gen_ai.tool.call.result` are **Opt-In** by default. Gate them behind a runtime flag and avoid them in production unless you have approved data handling.

### Pattern: invoke_agent + nested tool/model spans

```typescript
import { ApplicationInsights, SeverityLevel } from "@microsoft/applicationinsights-web";

type GenAiAttrs = Record<string, string | number | boolean | undefined>;

function startGenAiSpan(name: string, attrs: GenAiAttrs) {
  const id = crypto.randomUUID();
  const start = performance.now();
  const baseProps: GenAiAttrs = { "gen_ai.span.id": id, ...attrs };
  return {
    end(success: boolean, extra: GenAiAttrs = {}, error?: Error) {
      const duration = Math.round(performance.now() - start);
      const properties = { ...baseProps, ...extra };
      appInsights.trackDependencyData({
        id, name, duration, success,
        responseCode: error ? 500 : 200,
        type: "GenAI", // illustrative dependency category, not an OTel Span implementation
        target: String(attrs["gen_ai.provider.name"] ?? "genai"),
        properties: properties as Record<string, string>
      });
      if (error) {
        appInsights.trackException({
          exception: error,
          severityLevel: SeverityLevel.Error,
          properties: { ...properties, "error.type": error.name } as Record<string, string>
        });
      }
    }
  };
}

// Agent invocation
const agentSpan = startGenAiSpan("invoke_agent ResearchAssistant", {
  "gen_ai.operation.name": "invoke_agent",
  "gen_ai.provider.name": "azure.ai.openai",
  "gen_ai.agent.name": "ResearchAssistant",
  "gen_ai.agent.id": "asst_5j66UpCpwteGg4YSxUnt7lPY",
  "gen_ai.request.model": "gpt-4o-mini",
  "server.address": "myresource.openai.azure.com"
});

try {
  // Nested chat completion span
  const chat = startGenAiSpan("chat gpt-4o-mini", {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "azure.ai.openai",
    "gen_ai.request.model": "gpt-4o-mini"
  });
  const res = await callAzureOpenAi(/* ... */);
  chat.end(true, {
    "gen_ai.response.model": res.model,
    "gen_ai.response.id": res.id,
    "gen_ai.response.finish_reasons": JSON.stringify(res.choices.map(c => c.finish_reason)),
    "gen_ai.usage.input_tokens": res.usage.prompt_tokens,
    "gen_ai.usage.output_tokens": res.usage.completion_tokens,
    "gen_ai.output.type": "text"
  });

  // Nested tool execution span
  const tool = startGenAiSpan("execute_tool getWeather", {
    "gen_ai.operation.name": "execute_tool",
    "gen_ai.tool.name": "getWeather",
    "gen_ai.tool.type": "function",
    "gen_ai.tool.call.id": "call_abc123"
  });
  const toolResult = await runGetWeather({ location: "SF" });
  tool.end(true);

  agentSpan.end(true, {
    "gen_ai.usage.input_tokens": res.usage.prompt_tokens,
    "gen_ai.usage.output_tokens": res.usage.completion_tokens
  });
} catch (err) {
  agentSpan.end(false, { "error.type": (err as Error).name }, err as Error);
}
```

When correctly configured for an approved origin, the browser SDK can attach `traceparent` to outbound `fetch` (when `distributedTracingMode: DistributedTracingModes.W3C`), but these synthetic Dependency records do not themselves create a correctly nested W3C span context; verify trace and parent IDs end-to-end.

For the full attribute reference, well-known values, and content-capture guidance, see [references/agent-traces.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/agent-traces.md).

### KQL: query GenAI traces in App Insights

```kusto
dependencies
| where type == "GenAI"
| extend op   = tostring(customDimensions["gen_ai.operation.name"]),
         agent = tostring(customDimensions["gen_ai.agent.name"]),
         model = tostring(customDimensions["gen_ai.request.model"]),
         tin   = toint(customDimensions["gen_ai.usage.input_tokens"]),
         tout  = toint(customDimensions["gen_ai.usage.output_tokens"])
| summarize calls=count(), p95_ms=percentile(duration, 95),
            avg_in=avg(tin), avg_out=avg(tout) by op, agent, model, bin(timestamp, 5m)
```

## React (TypeScript)

See [references/framework-extensions.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/framework-extensions.md) for full React, React Native, Angular, Next.js, and Vite recipes.

```typescript
import { ApplicationInsights, DistributedTracingModes } from "@microsoft/applicationinsights-web";
import { ReactPlugin, withAITracking } from "@microsoft/applicationinsights-react-js";
import { createBrowserHistory } from "history";

const reactPlugin = new ReactPlugin();
const browserHistory = createBrowserHistory();

export const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    extensions: [reactPlugin],
    extensionConfig: { [reactPlugin.identifier]: { history: browserHistory } }
  }
});
appInsights.loadAppInsights();

export const TrackedCheckout = withAITracking(reactPlugin, Checkout, "Checkout");
```

## React Native

```typescript
import { ApplicationInsights, DistributedTracingModes } from "@microsoft/applicationinsights-web";
import { ReactNativePlugin } from "@microsoft/applicationinsights-react-native";

const rnPlugin = new ReactNativePlugin();
const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.EXPO_PUBLIC_APPINSIGHTS_CONNECTION_STRING,
    extensions: [rnPlugin],
    disableFetchTracking: false
  }
});
appInsights.loadAppInsights();
```

## Performance — Web Vitals

Auto-collected: page-load timings via `PerformanceTiming` / `PerformanceNavigationTiming`. To add Core Web Vitals:

```typescript
import { onCLS, onLCP, onINP, type Metric } from "web-vitals";

function send(m: Metric) {
  appInsights.trackMetric(
    { name: `web_vitals.${m.name.toLowerCase()}`, average: m.value },
    { rating: m.rating, navigationType: m.navigationType, id: m.id }
  );
}
onCLS(send); onLCP(send); onINP(send);
```

## Cookies & Privacy

```typescript
new ApplicationInsights({ config: {
  connectionString,
  disableCookiesUsage: true,
  cookieCfg: { enabled: false } // explicit cookieCfg takes precedence; do not enable here
}});
```

To honor consent dynamically:

```typescript
appInsights.getCookieMgr().setEnabled(userGaveConsent);
appInsights.config.disableTelemetry = !userGaveConsent;
```

## Sampling

Server-side ingestion sampling (recommended) is configured on the App Insights resource. SDK-side sampling reduces network use:

```typescript
new ApplicationInsights({ config: { connectionString, samplingPercentage: 50 } });
```

Per-type sampling via telemetry initializer: drop with `return false` based on `item.baseType`.

## Offline / Send-on-Unload

The SDK uses `sendBeacon` (default `onunloadDisableBeacon: false`) to flush on `pagehide` / `unload`. For SPAs, also call `appInsights.flush()` before destructive transitions (logout, hard reload).

## Common Pitfalls

1. **Do not initialize twice.** Re-importing the module under different bundles produces duplicate page views. Use a single shared module export.
2. **Initialize before first user input** to avoid losing early clicks/exceptions.
3. **Connection string is public** — never reuse the same App Insights resource for backend secrets.
4. **`enableAutoRouteTracking` + manual `trackPageView`** = duplicates. Pick one.
5. **CORS distributed tracing** requires the API to allow `Request-Id`, `Request-Context`, `traceparent`, `tracestate` request headers and expose `Request-Context` response header.
6. **GenAI sensitive content** (`gen_ai.input.messages` etc.) is Opt-In — never log without an explicit runtime flag and approved data handling.
7. **Agent token usage is on `chat` spans, not `invoke_agent`** — copy aggregated usage to the parent agent span only if you know it.
8. **React StrictMode** double-invokes effects in dev — guard `loadAppInsights()` with a module-level singleton.

## Bundle Size

The full web SDK is ~110 KB minified (~36 KB gzipped). For aggressive budgets, use the **Loader Script** path so the SDK loads asynchronously off the critical path, or tree-shake unused plugins.

## Key Types

```typescript
import {
  ApplicationInsights,
  SeverityLevel,
  DistributedTracingModes,
  type IConfiguration,
  type IConfig,
  type ITelemetryItem,
  type ITelemetryPlugin,
  type ICustomProperties,
  type IPageViewTelemetry,
  type IEventTelemetry,
  type IExceptionTelemetry,
  type ITraceTelemetry,
  type IMetricTelemetry,
  type IDependencyTelemetry
} from "@microsoft/applicationinsights-web";
```

## Best Practices

1. **One singleton instance** exported from a single module.
2. **Initialize early** in the app entrypoint, before router setup.
3. **Use telemetry initializers** to attach `app.version`, `tenantId`, and to scrub PII / query-string secrets.
4. **Set `distributedTracingMode: DistributedTracingModes.W3C`** and ensure your APIs accept/expose W3C trace context headers.
5. **For GenAI**, follow OTel `gen_ai.*` attribute names verbatim — they are queryable across browser and backend telemetry uniformly.
6. **Gate sensitive content capture** (`gen_ai.input.messages` / `gen_ai.output.messages`) behind a build-time or runtime opt-in.
7. **Flush on logout / sensitive navigation** so in-flight telemetry isn't dropped.

## References

- [references/agent-traces.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/agent-traces.md) — Full OTel GenAI semconv distilled (agent / model / tool spans, attributes, content capture).
- [references/framework-extensions.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/framework-extensions.md) — React, React Native, Angular, Next.js, Vite recipes.
- [references/configuration.md](https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-typescript/skills/applicationinsights-web-ts/references/configuration.md) — Full `IConfiguration` reference and tuning guide.
- Microsoft Learn: <https://learn.microsoft.com/azure/azure-monitor/app/javascript-sdk>
- ApplicationInsights-JS source: <https://github.com/microsoft/ApplicationInsights-JS>
- OTel GenAI semantic conventions: <https://opentelemetry.io/docs/specs/semconv/gen-ai/>

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.

## Privacy and implementation limits

Delay initialization/collection until required consent or another approved basis is established; disabling cookies alone does not disable telemetry. Start with telemetry disabled and cookies off rather than briefly collecting before a later toggle. URL query removal is only one field: apply an explicit allowlist to page names, dependency URLs, headers, click metadata, exception messages and custom properties before capture, without assuming an initializer catches every sensitive field. Consent withdrawal must stop further transmission and handle queued data under policy; flushing is not guaranteed delivery or deletion. Browser connection strings are public ingestion configuration, not model/API secrets. Route model calls through an authorized backend; do not place provider credentials in public env variables. Synthetic GenAI Dependency records, random UUIDs and customDimensions do not implement OTel span parenting or guarantee backend correlation; examples need proper context propagation, failure-finalization and schema/version tests. The detailed reference links are upstream remote files, not bundled local guides. Verify actual enum/API/config support in the pinned SDK; byte-size estimates and model/provider tables are version dependent.
