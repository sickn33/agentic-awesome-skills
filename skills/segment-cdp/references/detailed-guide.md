# Segment CDP integration guide

## Scope and prerequisites

These are independent integration sketches, not a bundled Next.js/Node/Worker application. Pin AnalyticsBrowser/Analytics Node and framework versions and verify their actual APIs. Configure only user-approved Segment sources, regions and destinations; account changes, customer-data transfer, paid calls and agent delegation need applicable authority. Browser write keys are intentionally public ingestion identifiers, not proof of user identity; server/private credentials must remain secret.

Define an event contract before wiring calls: stable event name, unit of observation, allowed properties/types/size, server-derived identity, timestamp and deduplication key. TypeScript interfaces are not runtime validation or a tracking-plan import format. Protocols availability/enforcement and device/cloud destination behavior depend on actual configuration; a conceptual YAML schema does not enable blocking.

## Browser integration

Initialize AnalyticsBrowser only in an authorized client boundary after the required purpose/consent decision. Do not call AnalyticsBrowser.load at universal module import merely because a caller later checks consent; SDKs/destinations can initialize storage or auto-collect. Route hooks using usePathname/useSearchParams belong in a client component with framework-required Suspense handling, not a server root layout or Pages Router _app unchanged.

```typescript
// Conceptual adapter: supply initialized consent-permitted client and validated data.
function recordPlanSelected(analytics: ApprovedBrowserClient, plan: Plan) {
  return analytics.track('Plan Selected', { plan_name: plan, source: 'pricing' });
}
```

ApprovedBrowserClient and Plan are application types, not Segment exports. Do not send raw location.href, query strings, page titles, names/emails or free-text fields by default; route labels and minimized enums avoid common token/PII leaks. Reject/catch provider failures without logging event bodies and keep product actions independent from optional tracking.

## Identity and logout

Use stable first-party nonsecret user IDs, scoped appropriately for the actual identity model. identify can associate anonymous history in supported destinations/identity products; it is not a universal irreversible merge rule. alias is destination-specific and can create unwanted merges; use it only with documented migration requirements and verified ownership, not an email-to-ID heuristic.

On logout/shared-device changes, apply the pinned SDK reset behavior and destination-specific identity cleanup; a Segment reset is not deletion from downstream systems. group associates an organization in supported destinations, not a tenant-authorization boundary. Do not set created_at to the current time on every login; use the actual account creation timestamp if necessary and permitted.

## Server-side events and webhooks

Use server-side events for authoritative business facts. Derive account/tenant from verified application state; client_reference_id or arbitrary webhook metadata alone is not ownership proof. A server event can include userId without an earlier identify call; identify is not mandatory for every track event.

For a Stripe webhook, verify the signature against the untouched raw body before JSON processing, reject malformed/expired signatures, enforce the allowed account/livemode and atomically deduplicate event IDs. Persist a durable inbox/outbox or queue before acknowledging; retries and partial failures must not duplicate revenue. The former req.json-only handler was not a signature-verified implementation. Do not copy it into production.

Use the payment's actual status and currency minor-unit exponent; amount_total/100 is not correct for every currency. A checkout completion need not equal a settled payment. total_spent cannot be set to the last purchase amount; compute cumulative spend from authoritative reconciled state. Do not use untrusted x-forwarded-for as verified customer IP.

Analytics Node batches in memory: enqueue success is not durable delivery, SIGTERM is not guaranteed in serverless, and flushing cannot ensure destination processing. Use closeAndFlush only as supported by the pinned version and runtime; handle failures/time budgets. Do not process.exit0 after a failed flush as if delivery succeeded.

## Destination routing

Default deny sensitive events to unapproved destinations and use exact configured integration names/IDs. Lowercase custom keys such as mixpanel are not automatically the provider's integration option. Per-call integrations controls are routing hints, not a privacy firewall, lawful basis or guarantee that the source never ingests data. Source-level filters, destination setup, consent, retention and actual observed delivery must agree. Device-mode SDKs may emit independently of server-side Protocols blocking.

Example conceptual options:

```typescript
const routing = { integrations: { All: false, 'APPROVED_EXACT_DESTINATION_NAME': true } };
// Replace the placeholder only after verifying this source/destination contract.
```

## HTTP ingestion transport

The HTTP API documents32KB per normal event/request,500KB per batch and a batch-event count limit; verify the current official limits and keep a conservative byte budget. Count UTF-8 encoded full JSON bytes, not JavaScript string length or only property values. Every event needs the appropriate identity and type-specific fields. Batch group events need groupId; do not cast incompatible payloads to any.

```typescript
// Transport fragment, not a public unauthenticated ingestion endpoint.
// Caller supplies server-validated, authorized and size-bounded payloads.
async function postSegment(
  endpoint: '/track' | '/identify' | '/page' | '/group' | '/batch',
  payload: Record<string, unknown>,
  writeKey: string,
  approvedApiBase: string,
): Promise<void> {
  const body = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(body).byteLength;
  const ceiling = endpoint === '/batch' ? 490_000 : 31_000;
  if (!writeKey || bytes > ceiling) throw new Error('Invalid analytics request');
  // approvedApiBase is static trusted configuration for the approved region.
  // A batch caller must separately validate each event's encoded size/count/schema.
  const response = await fetch(`${approvedApiBase}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(writeKey + ':')}`, 'Content-Type': 'application/json' },
    body, signal: AbortSignal.timeout(5000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Analytics ingestion status ${response.status}`);
  // Do not print response text/event bodies;2xx is not proof of destination delivery.
}
```

Choose bounded retries for transport failures/429/transient5xx with Retry-After, exponential jitter, a total deadline and stable messageId across attempts. Avoid retries for invalid payloads/unauthorized requests and account for ambiguous delivery; deduplication windows are not unlimited exactly-once guarantees. A raw public Worker accepting userId/action/data would enable identity spoofing and event/cost spam; authenticate, allowlist schemas, apply quotas and derive identities server-side before this transport.

## Validation

Use synthetic fixtures: consent denied means no SDK or destination side effect; logout/new login cannot inherit the prior user's events; unauthorized IDs/fields and oversized UTF-8 payloads are rejected before network; duplicate webhook/retry yields one business event; empty batch/missing groupId and partial downstream failures stay visible. Verify receipt in the configured source and destination separately without exporting customer data.

Report what ran, exact package/configuration versions, delivery/retention boundaries and unresolved controls. This document has not executed SDK, webhook, Worker or destination tests. Privacy requirements are context-specific; do not present a universal GDPR legal determination from the presence of one consent boolean.

## References

- [Segment HTTP API](https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/)
- [Stripe webhook verification implementation](https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts)

Related specialist roles are optional responsibilities, not installed tools or automatic delegation authority.
