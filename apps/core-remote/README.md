# AAS Core hosted MCP

The dedicated AAS Core Free account hosts the public `aas-core` Worker. OpenAI calls its existing Streamable HTTP endpoint. Stable AAS catalog releases can refresh this server without changing the plugin ZIP.

The release workflow uses the immutable published GitHub tag and verifies its catalog digest, file payloads, and published MCP tool definitions. It rejects incompatible tool changes, downgrades, and builds above the Workers Free size and asset limits. The deployment verifies live catalog identity and exercises all nine tools. If a known candidate fails the live checks, the deployment restores the previous Worker version. An unknown deployment result requires inspection.

For the initial catch-up, run **AAS Core catalog deploy** from protected main with the published tag and `deploy: false`. Set `AAS_CORE_CLOUDFLARE_API_TOKEN` in GitHub Actions to a token with Workers Scripts write access restricted to the dedicated account. Run the same tag with `deploy: true` and verify the live result. Then set the repository variable `AAS_CORE_AUTO_DEPLOY` to `true` to enable production deploys for future stable releases. Turn it off to pause automated deploys.

Use only the existing dedicated Workers Free account. The workflow uses a standard runner in the public repository and needs no paid service, billing credentials, or deployment access to other sites. Application throttles and the account's platform quota both apply. Rejected requests can still count against the platform allowance.

The OpenAI domain verification response and the reviewed demo are intentionally public and remain available at their existing URLs.
