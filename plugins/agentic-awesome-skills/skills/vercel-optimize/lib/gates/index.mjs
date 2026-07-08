import * as uncachedRoute from './uncached-route.mjs';
import * as slowRoute from './slow-route.mjs';
import * as routeErrors from './route-errors.mjs';
import * as coldStart from './cold-start.mjs';
import * as isrOverrevalidation from './isr-overrevalidation.mjs';
import * as cwvPoor from './cwv-poor.mjs';
import * as platformFluidCompute from './platform-fluid-compute.mjs';
import * as platformBotProtection from './platform-bot-protection.mjs';
import * as middlewareHeavy from './middleware-heavy.mjs';
import * as externalApiSlow from './external-api-slow.mjs';
import * as scannerDriven from './scanner-driven.mjs';
import * as observabilityEventsAttribution from './observability-events-attribution.mjs';
import * as usageSpikeTriage from './usage-spike-triage.mjs';
import * as buildMinutesFanout from './build-minutes-fanout.mjs';
import * as regionMisconfig from './region-misconfig.mjs';

// Intentionally NOT registered:
//   - `oversized_memory`: Fluid Compute floor is 2GB; per-route memory right-sizing isn't a customer lever.
//   - `deploy_regression`: overlaps Vercel Agent Investigations; `vercel inspect` 404s across teams. slow_route deep-dive already carries per-deployment p95 trend.
export const gates = [
  uncachedRoute,
  slowRoute,
  routeErrors,
  coldStart,
  isrOverrevalidation,
  cwvPoor,
  externalApiSlow,
  scannerDriven,
  // Account-scoped last so platform-scoped sort doesn't dilute code-scoped priority ordering during budget application.
  platformFluidCompute,
  platformBotProtection,
  middlewareHeavy,
  observabilityEventsAttribution,
  usageSpikeTriage,
  buildMinutesFanout,
  regionMisconfig,
];

// Overridable via `--max-candidates N` or `VERCEL_OPTIMIZE_MAX_CANDIDATES` (accepts `all`).
// `MAX_CODE_CANDIDATES` is a back-compat alias for tests importing the old name.
export const DEFAULT_MAX_CODE_CANDIDATES = 6;
export const MAX_CODE_CANDIDATES = DEFAULT_MAX_CODE_CANDIDATES;

// Bump on any threshold change so report + iteration baselines can detect gate-logic drift.
export const GATE_VERSION = '1.8.0';
