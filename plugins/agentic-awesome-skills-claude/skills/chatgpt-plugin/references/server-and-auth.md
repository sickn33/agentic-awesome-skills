# The server as ChatGPT calls it

What ChatGPT adds to any remote MCP server: what each request carries, what its OAuth client needs, how a tool says it needs sign-in, how a server without sign-in knows who is calling, and how to test it all before approval. OpenAI's `/build/auth`, `/reference` and `/deploy/connect-chatgpt` pages, read on 2026-10-26, unless a line says otherwise.

## What every request carries

ChatGPT puts hints in `params._meta`:

| Key | Sent on | What it is |
|---|---|---|
| `openai/locale` | `initialize` and tool calls | the requested locale, BCP 47 (older clients send `webplus/i18n`) |
| `openai/userAgent` | tool calls | a best-effort user-agent hint |
| `openai/userLocation` | tool calls | a coarse location: `city`, `region`, `country`, `timezone`, `longitude`, `latitude`, any of them missing |
| `openai/subject` | tool calls | an anonymized user id, "for the purposes of rate limiting and identification" |
| `openai/session` | tool calls | an anonymized conversation id |
| `openai/organization` | tool calls | an anonymized ChatGPT organization id, when there is one |

What arrived on 2026-10-27, on a developer-mode connector signed in by OAuth: a `tools/call` carried `openai/organization`, `openai/request_id`, `openai/session`, `openai/subject` and `openai/userLocation`, and also `callId`, `itemId`, `progressToken`, `sessionId`, `traceparent`, `tracestate` and `windowId`; no `openai/locale` or `openai/userAgent`, and `initialize` carried no `_meta`. The session and subject came again as headers, `x-openai-session` and `x-openai-subject`, beside W3C trace headers and Datadog's, so anything that logs request headers holds those ids too. The User-Agent was `openai-mcp/1.0.0`.

- **Accept `_meta` in the params of every request.** The MCP specification reserves it on every request (a client's `progressToken` lives there too). A server that validates `params` strictly, refusing keys it does not know, would answer each of ChatGPT's tool calls with `-32602 Invalid params`. A monitoring product's server had exactly that parser, found in its code on 2026-10-26 because its other clients had never sent `_meta`; ChatGPT's tool calls do carry it (above), and only a fix shipped before ChatGPT's first call kept the refusal from being seen. Be strict about a tool's `arguments`, never about `params`. A test sends `initialize` with `openai/locale` and a `tools/call` with every key above, and expects both to succeed.
- **Keep none of it unless a feature needs it**, and name on the privacy page what is kept. Logging the key names that arrived, never their values, is enough to see what ChatGPT sends; the names are the caller's text too, so log one that looks like an id, an address or a key as `?`, and give the logging an end date the privacy page states.
- **Hints, not facts.** `userAgent` and `userLocation` are never grounds for an authorization decision, and the server works without them. On 2026-10-02 a server without sign-in received `openai/subject`, `openai/session` and `openai/userLocation` with a country and no time zone, so a default that needed the user's local time came out in UTC; that product names a new room after the event instead.
- **`openai/subject` is an identity only when OpenAI sent the request**: § A surface with no sign-in.
- **ChatGPT tries MCP 2.0 first.** On 2026-10-27 a connection's first request carried `MCP-Protocol-Version: 2026-07-28` and an `Mcp-Method` header. The server, which speaks `2025-11-25` and `2025-06-18`, refused it `400`; within a few seconds (one to four, across three connections) ChatGPT sent a classic `initialize` with no version header, asked for `2025-11-25`, and went on with it. That `400` is what it falls back on, so a server without `2026-07-28` answers an unknown version header with it, and logs the refused version and the `Mcp-Method` value, a method name. MCP Events need `2026-07-28`.

## OAuth

ChatGPT runs the authorization-code flow with PKCE as the MCP client. What it needs from the server and its authorization server:

**The protected-resource document** (RFC 9728) names `resource`, the exact MCP URL, and `authorization_servers`, the authorization server's exact `issuer`. An unauthenticated request gets `401` with `WWW-Authenticate: Bearer resource_metadata="<that document's URL>"`, which is how ChatGPT finds it.

**The authorization server's metadata** (`/.well-known/oauth-authorization-server` or `/.well-known/openid-configuration`):

| Field | Rule |
|---|---|
| `issuer` | the canonical identifier, the same string in `authorization_servers` |
| `authorization_endpoint`, `token_endpoint` | required |
| `code_challenge_methods_supported` | **must include `S256`**: "MCP servers are unsupported when their authorization server metadata omits this field or does not advertise `S256`" |
| `client_id_metadata_document_supported: true` | offers CIMD, which ChatGPT prefers when it is available (the package's `client.mode` can still choose DCR) |
| `registration_endpoint` | offers DCR: ChatGPT registers once per connection and reuses that client |
| `token_endpoint_auth_methods_supported` | for CIMD, ChatGPT uses `none` (a public client) or `private_key_jwt`, signed with a key whose JWKS is served at `/oauth/jwks.json` on the client metadata's origin |
| `scopes_supported` | ChatGPT requests the advertised OIDC scopes (`openid`, `email`, `profile`) by default, so enable every advertised scope for the client, however it was created |
| `authorization_response_iss_parameter_supported` | **only if `iss` comes back in every response**: below |

**The audience.** ChatGPT appends `resource=<the MCP URL>` to both the authorization and the token request. The authorization server copies it into the token (usually `aud`), and the MCP server checks signature, `iss`, `aud`, expiry and scopes on every call.

**`iss` and the redirect URI (RFC 9207).** This is a choice, not a requirement, and it decides which client id and redirect ChatGPT uses:

| The authorization server | ChatGPT's redirect URI | Its CIMD client id |
|---|---|---|
| advertises `authorization_response_iss_parameter_supported: true`, returns `iss` in **every** success and error response, exactly equal to `issuer` (no normalizing of slashes, ports or case), and the same issuer is in `authorization_servers` | `https://chatgpt.com/connector_platform_oauth_redirect` | `https://chatgpt.com/oauth/client.json` |
| does not | `https://chatgpt.com/connector/oauth/{callback_id}` | `https://chatgpt.com/oauth/{callback_id}/client.json` |

Advertising support and then omitting `iss` from one response, or returning a different string, makes ChatGPT reject that response. So set the flag only after seeing `iss` on an error response too. Either way, copy the exact redirect URI the server's management page shows into the provider's allowlist. Servers published before callback-specific redirects keep the stable one. On 2026-10-27 a custom connector to an authorization server that returns `iss` used the stable client id, with no registration step; its document names one redirect URI on `chatgpt.com`, the `authorization_code` and `refresh_token` grants, `private_key_jwt` (RS256) as its token-endpoint preference, and no scopes.

**Keep the client valid.** If the authorization server expires, deletes or replaces the registered client or its secret, users and reviewers get `invalid_client` when they connect. Access and refresh tokens rotate normally.

**What ChatGPT cannot do**: client-credentials, service-account or JWT-bearer grants; custom API keys; customer-provided mTLS certificates. A server whose only credential is a long-lived API token needs OAuth before it can be a directory plugin; the portal has no API-key flow either (`package.md § mcp.json`).

**Ask for the least.** Users are told every permission requested, and requests are limited to what the plugin needs to work: request only the scopes the listed tools use.

**Optional, and worth it for a product with accounts:**

- **Sign-up inside the sign-in window.** A ChatGPT user who has no account yet meets the product's sign-in in ChatGPT's window. When the provider can create the account there and the first authenticated call creates whatever the product needs, nobody has to leave ChatGPT. Prove it with a fresh sign-up that ends in a successful tool call against production.
- **`id_token_hint`.** On reauthorization, to add scopes, ChatGPT may send the earlier ID token, so a provider that issued one and honours the hint skips a fresh login.
- **Several accounts.** One authenticated, read-only tool marked `_meta["openai/profile"]: true`, with the profile schema as its `outputSchema`, lets users tell connected accounts apart.
- **Enterprise domain restrictions**: OIDC discovery, `openid` and `email` advertised and enabled, and a UserInfo endpoint returning `email` and `email_verified: true`.

Most OAuth 2.1 providers meet all of this once discovery, CIMD (or DCR) and the `resource`-to-audience copy are on.

## Which tools need sign-in: securitySchemes

Declare it on every tool, even when the whole server has one policy: "Stick to per-tool declarations." A tool without the array inherits whatever default the server advertises.

| `securitySchemes` | Means |
|---|---|
| `[{ "type": "noauth" }]` | callable anonymously |
| `[{ "type": "oauth2", "scopes": ["…"] }]` | needs sign-in with those scopes |
| both | starts anonymous; signing in unlocks more (the package's `auth.type` is `mixed`) |

Mirror it in `_meta.securitySchemes` for clients that read only `_meta`. For ChatGPT to show its sign-in prompt on a tool, it needs both halves: the metadata (the array and the protected-resource document) and, at run time, an error result whose `_meta["mcp/www_authenticate"]` carries a `WWW-Authenticate` value with `error` and `error_description`. Whatever a tool declares, the server verifies the token on every call.

## A surface with no sign-in

A product with accounts should default to OAuth. A surface with none is a product decision with costs, recorded in the product's decision log: a second front door, its own limits, its own lifetime for what it creates, and a disclosure burden. A live Q&A product built one so a ChatGPT user could open a room without an account; these are what it took.

- **The identity is `openai/subject`, and it is OpenAI's statement only when OpenAI sent the request.** Check the caller first, by OpenAI's published egress ranges (`developers.openai.com/api/docs/guides/ip-addresses`; one product fetched the connector list hourly, kept the previous list through a failed refresh, anything but a `200` whose list parses, and refused every call with no list) or by mTLS: a leaf certificate chaining to OpenAI's Connectors intermediate CA, with SAN `mtls.prod.connectors.openai.com`. Opened to any caller, anyone can claim anyone's subject. The ranges did not cover every ChatGPT call: on 2026-10-27 five calls from a developer-mode connector matched none of the connector list's 287 prefixes, all IPv4, checked against the host's client-address header. The host had no AAAA record, so they came over IPv4, from addresses the list does not publish; that server's refresh did not check the response status, so this is strong evidence rather than proof. Before relying on the check, see ChatGPT's calls pass it from every surface you test on, and before reading a miss as IPv6, check that the host has an AAAA record at all.
- **Gate tool calls, not discovery.** On 2026-10-23 OpenAI's portal scanned the server from outside those ranges: an endpoint that refused everything from outside got "Authorization required" in the portal, which would not submit the draft ("Scan tools before submitting"). `initialize`, `ping`, `tools/list` and notifications return only the public tool list, so they answer anyone; `tools/call` stays behind the check. Three tests: an outsider lists the tools; an outsider's call with a forged subject is refused and creates nothing; and the set of methods that answer outsiders equals what the privacy page says works from anywhere.
- **The address checked must be the caller's.** With a CDN's proxy in front of the host, every caller was the proxy's edge: ChatGPT's connector check was refused ("MCP server refused access") and every per-address limit fell on a few shared addresses, while every page still answered `200` (October 2026). Keep the host's DNS records unproxied, or trust the proxy's client-address header only on an origin that refuses traffic not sent through the proxy.
- **No subject, no action**: a tool error, and nothing created.
- **A test mode that never reaches production.** Off the platform no subject arrives, so local evals need a flag that admits any caller under a fixed test identity. Give it its own flag beside the one that enables the surface; apply the `environments` skill's loopback app-URL guard in the env schema, unit-tested both ways under `NODE_ENV=production`. Put both on the pre-submission list: surface on in production, test mode off.
- **Declare `auth.type: "none"` in the package, and never complete an OAuth sign-in in the portal** (`package.md § mcp.json`). An address check on tool calls is not a sign-in; a server that does require sign-in is never declared `none`.

## Shared addresses and limits

ChatGPT calls from OpenAI's shared egress, so every ChatGPT user of a plugin arrives from the same few addresses. A per-address limit on the MCP route throttles all of them together. Limit per user (the token's user, or the subject on a surface without sign-in) and set any edge backstop for the MCP path well above what one client sends: an order of magnitude above a single user's budget is a reasonable start. Decide it before the listing, not after the first busy day.

## Testing before approval

Before approval a plugin runs only from a local source, installed from a local marketplace in ChatGPT's desktop app or in Codex; on 2026-10-23 a personally uploaded ZIP offered only "Open in desktop app" on the web. So on the web the real client is a custom connector against production.

1. **MCP Inspector** (`npx @modelcontextprotocol/inspector@latest`): every tool with representative, edge, missing-identifier and empty inputs; schema validation, authentication errors, annotations, the model-readable result.
2. **In ChatGPT**: Plugins → + → Add custom MCP server → name, description, the URL with its path → authentication → "I understand and want to continue" → **Create as a plugin**. Install it, start a new conversation, type `@` and pick it. Run an evaluation set of direct requests, indirect ones, follow-ups that reuse ids from an earlier result, writes that need confirmation, and requests that should call nothing; record the tool, arguments, result and confirmation for each, and the date. After changing tool metadata: deploy, open the connection, **Refresh**, confirm the metadata changed, new conversation, rerun. The API Playground (Tools → Add → MCP Server) shows raw requests and responses.
3. **The complete plugin, from a local source**: add the package to a local marketplace, install it from the Plugins Directory, and run the set again with the skills in play: each skill activates for its intended requests, similar phrasing behaves the same, unsupported requests do not activate the plugin, and every starter prompt completes.
4. **Routing evals that run in CI or on demand**, the five and three review cases from one file: each run through `codex exec --json` with the server attached, a read-only sandbox and tool approval set to approve, resuming the thread for a follow-up case, checking which tools fired. Pass the prompt on standard input with no shell: through `cmd.exe`, a prompt was split at `&` (2026-10-02). It is evidence about the metadata, not a promise about ChatGPT. Run it against a local server in the test mode above, or with a test account's token.
5. **The video**, last, against production: `portal-and-review.md § Review information`.
