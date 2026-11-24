# AAS Core hosted MCP

The dedicated AAS Core Free account hosts the public `aas-core` Worker. OpenAI calls its existing Streamable HTTP endpoint. Stable AAS catalog releases can refresh this server without changing the plugin ZIP.

The release workflow uses the immutable published GitHub tag and verifies its catalog digest, file payloads, and published MCP tool definitions. It rejects incompatible tool changes, downgrades, and builds above the Workers Free size and asset limits. The deployment verifies live catalog identity and exercises all nine tools. If a known candidate fails the live checks, the deployment restores the previous Worker version. An unknown deployment result requires inspection.

For the initial catch-up, run **AAS Core catalog deploy** from protected main with the published tag and `deploy: false`. Set `AAS_CORE_CLOUDFLARE_API_TOKEN` in GitHub Actions to a token with Workers Scripts write access restricted to the dedicated account. Run the same tag with `deploy: true` and verify the live result. Then set the repository variable `AAS_CORE_AUTO_DEPLOY` to `true` to enable production deploys for future stable releases. Turn it off to pause automated deploys.

Use only the existing dedicated Workers Free account. The workflow uses a standard runner in the public repository and needs no paid service, billing credentials, or deployment access to other sites. Application throttles and the account's platform quota both apply. Rejected requests can still count against the platform allowance.

The OpenAI domain verification response and the reviewed demo are intentionally public and remain available at their existing URLs.

### Codex plugin update

Both packages use the registered `/mcp` URL. The 0.1.8 tools accept existing arguments, add optional selection handles and expose the comparison tool. Clients that pin the complete 0.1.7 schema can use `/mcp/v1`. The automated smoke checks both contracts. Package the contents of that directory, including the registered app mapping and logo. Upload the ZIP as a new version of the existing AAS Core plugin after the registered endpoint passes the deployed smoke test.

For an audited selection, begin the first search with `startSelection: true`. Pass the returned private `selectionHandle` to subsequent searches, comparisons, composition, inspection and export. Treat it as a bearer credential. It is isolated from other workflows, held in memory for up to 20 minutes, and may expire earlier on eviction. A client can start a fresh transport session during that interval. On expiry, start a new selection and repeat the actual lookup and review operations. A comparison reads the catalog records in order and records each looked-up skill in the trace.

### Reading aggregate usage

In the existing Free account, open Durable Objects Data Studio for the QuotaGuard namespace and the named object `quota`. Run:

```sql
SELECT date(day * 86400, 'unixepoch') AS utc_day, tool, outcome, code,
       calls, round(1.0 * elapsed_ms / calls) AS mean_ms
FROM daily_tools
ORDER BY day DESC, tool, outcome;
```

The table spans 30 UTC days. Rows older than that are deleted on the next measured request. Filter to search calls to calculate the empty-result share. Count successful inspections and exports separately. Throttling counts are best-effort and can be lost on eviction before the next flush. Known deployment smoke sessions are excluded from completed tool metrics; rejections before session identification may include tests. Counters cover both public endpoints and count operations. They cannot identify people, installs or the calling host. This uses the existing SQLite-backed Free binding with no log pipeline, external analytics, model calls or billing-plan change.
