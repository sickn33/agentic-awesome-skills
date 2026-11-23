# MCP OAuth

**Apply these OAuth settings only for a member-authenticated MCP server.** Outside agents must reach it as signed-in members, with Clerk as authorization server. This section holds only Clerk settings. Apply `mcp-server` for callers, the route, limits, tools, directories, clients and package. That skill also covers agent-started sign-up through *Create first organization automatically*, an organization setting rather than an OAuth one. (`2026-10-06`, a live Q&A product's MCP OAuth stage, development and production. Every setting failed silently, or would have, the first time.)

Use *OAuth applications → Settings* (observed `2026-10-06`); these settings can fail silently.

- **Create no OAuth application by hand.** MCP clients register themselves (DCR) or identify by a metadata URL (CIMD). Clerk says a DCR client appears under *OAuth applications → Applications* after its first sign-in. A CIMD client may not appear at all (Backend API observed `2026-10-27`; the dashboard was not checked). A manual application is only for a client that can do neither. It needs the consent screen on and the same scopes, because instance defaults do not rewrite its scopes. (`2026-10-27`, after ChatGPT signed in by CIMD, the Backend API's `GET /v1/oauth_applications` listed none; the dashboard was not checked.)
- **Enable CIMD support and admit any compatible CIMD client.** Set Client admission to *Any compatible CIMD client*. That is `client_id_metadata_documents_advertised` `true`, with `client_id_metadata_documents_only_allow_pre_registered_clients` and `client_id_metadata_documents_block_implicitly_allowed_clients` both `false`. When the switch goes on, the dashboard preselects *pre-registered and previously connected clients*, which refuses every new client.
- **Enable published DCR support even though Clerk labels it deprecated.** Set `dynamic_oauth_client_registration` on; Clerk labels it *Deprecated*. Many MCP clients still register only through DCR.
- **Set default scopes for identity and, where applicable, organizations.** Use `openid`, `profile`, `email`, plus `user:org:read` in the organization shape.
  - Without `user:org:read`, the consent screen asks for no organization, and every connection is refused `organization_required`.
  - The dashboard shows `offline_access` and will not remove it. It is not stored in `default_scopes`, and it only lets a client that asks for it refresh. ChatGPT asks for it (observed `2026-10-27`).
- **Require PKCE.** Turn `pkce_required` on.
- **Enable JWT access tokens and include the audience.** Turn on `oauth_jwt_access_tokens` and *Include Audience* (`aud_claim_enabled`, off by default).
  - The route requires its own exact URL as the resource in `aud`: `<APP_URL>/api/mcp` by default, or the path the product chose instead (one product mounts it at `/mcp`).
  - The protected-resource metadata describes that path, never the origin root.
- **Apply, then re-read.** Use `PATCH`, then `GET /v1/instance/oauth_application_settings`, with that instance's own secret key. Record the re-read in the integration notes: development and production separately, dated.
- **An instance cloned from development does not carry these settings.** (Observed `2026-10-24`.) Apply and re-read them on the clone as on any new instance. (`2026-10-24`, a production instance made from development's settings had DCR, CIMD and `aud_claim_enabled` off and no default scopes.)
- **No new environment variable.** The publishable key gives the issuer, the secret key verifies tokens and reads membership, and `APP_URL` gives the resource and the discovery URLs.

**Allow for all four OAuth verification behaviours in the route.**

- **Discovery's `claims_supported` is not the shape of the JWT Clerk emits.** The list omits `client_id` and `scope`, which a real grant can carry. Run a real DCR + PKCE grant before changing which claims the route requires. (`Undated`: A real grant carried `client_id` and `scope`, which the list omits.)
- **A JWKS or network failure while verifying is a retryable `503`, never an invalid-token `401`.** A `401` sends the client back through the whole OAuth flow.
- **An unknown `kid` never reaches Clerk's verifier.** Given a `kid` it has not cached, `verifyToken` fetches the JWKS from the Backend API with the secret key, and an unauthenticated caller chooses the `kid`. Check the unverified header's `kid` against the key list last loaded, refresh that list at most once a minute, and refuse the rest as invalid.
- **Offline JWT verification does not see a revoked grant until the token expires.** It remains unseen until token expiry, a day by default. Recheck workspace access on every request through `requireWorkspaceAccess`, never from the token's claims alone.
