# AI application

LLM-backed apps, agents, code-sandbox tools, RAG pipelines. Cost shape is dominated by per-token AI Gateway spend and Sandbox active-compute time, not edge requests or function duration. Many AI customers also have a SaaS surface (auth, dashboards), but the cost lever lives upstream of the dashboard.

## Typical billing shape

AI Gateway > Sandbox Active Compute > Function Duration > Function Invocations. Edge Requests usually quiet; ISR rarely applies. Observability Events can climb fast if every tool-call span is captured at full fidelity.

## Priority patterns

1. **Provider failover.** Configure AI Gateway with an active-active fallback chain across providers (OpenAI + Anthropic, or model-family pairs). Critical-path agents must not be single-provider — a 429 from one provider becomes a user-visible outage otherwise. Field example: MELI runs homegrown active-active routing because retry-on-error against a single provider degraded their NLP-on-support flow.
2. **OIDC keyless auth, not explicit API keys.** In production, use the AI Gateway OIDC binding so requests are signed by deployment identity. In local dev, `vercel env run -- <cmd>` rotates OIDC each run. An explicit `AI_GATEWAY_API_KEY` in repo env vars is a regression — it bypasses keyless and creates a long-lived secret.
3. **Sandbox reuse over per-request `Sandbox.create`.** Each fresh sandbox costs at least 1 minute of billed compute (boot + teardown rounded up). When isolation isn't required (single-tenant agents, shared workspaces), pool sandboxes by name (`sandbox.get(name)`) — auto-snapshot on death + auto-resume on next get is the persistence model.
4. **`after()` / `waitUntil()` for tool logging.** Tool-call telemetry, audit writes, and analytics should never block the user response. Use `after()` (Next 15+) or `waitUntil()` from `@vercel/functions` for any write that doesn't affect the streamed response.
5. **Fluid Compute for JIT/process warmth.** Streaming LLM responses benefit from warm processes; the GraphQL/Apollo JIT cache + persisted-document plans only pay back when processes survive across requests. Fluid is the default; disabling it on AI workloads is almost always wrong.

## Frequent gotchas

- **Single-provider lock-in.** "We're using AI Gateway" doesn't imply failover — the provider list still has to be configured. A single-provider gateway is a thinner wrapper, not multi-provider resilience.
- **Sandbox-per-request.** `new Sandbox(...)` inside a per-request handler with no `id` argument creates a fresh microVM each time. Cheaper to pool when isolation allows.
- **BYOK fallback cost invisible.** AI Gateway with BYOK silently falls back to system credits on 429 / provider outage; cost migrates from "free BYOK" to "billed credits" without a separate signal unless tracked.
- **Observability Events runaway.** Captured every tool call + every streamed delta at 100% sampling — events SKU climbs above 30% of bill. Cap span cardinality before scaling traffic.

## Cross-references

- [external-api-critical-path](../support-topics/external-api-critical-path.md) — sequential vs parallel calls; AI Gateway is one external API among others
- [fluid-compute-caveats](../support-topics/fluid-compute-caveats.md) — module-state hazards and shared-instance caveats
- [function-duration-io-and-after](../support-topics/function-duration-io-and-after.md) — `after()` for post-response tool logging
- [observability-events-cost-attribution](../support-topics/observability-events-cost-attribution.md) — when Observability Events climb above 20% of bill
- [use-cache-remote-shared-origin-data](../support-topics/use-cache-remote-shared-origin-data.md) — caching shared LLM context or embedding lookups
- `https://vercel.com/docs/ai-gateway` — provider configuration, failover chain
- `https://vercel.com/docs/vercel-sandbox` — `sandbox.get(name)` and active-compute billing
