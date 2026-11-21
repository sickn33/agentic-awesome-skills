# The threat model: the classes every app has

Every multi-tenant app has these classes, whatever it does. Each section gives the rule, its reason, and the mechanism on Next.js (App Router) + Supabase + Clerk + Netlify. On another stack, keep the rule and find the equivalent mechanism.

## Contents

- Untrusted text
- Abuse and floods
- Cross-tenant access
- Origin bypass
- Leaked tokens and credentials
- Leaked database
- Anonymous identity
- Webhooks
- Scheduled work
- Secrets
- Calls to customer-supplied addresses
- Customer secrets at rest
- Embedded agents

## Untrusted text

- **Plain text unless the product needs rich text.** For rich text, if ever: a server-side sanitizer with an allowlist.
- **Validate shape on the client and on the server** (zod on this stack), and **escape on render**. Everything a person or a model wrote is rendered as plain text or sanitized markdown, never trusted as an instruction.
- **A CSP header**, with framing denied. On this stack the nonce policy is written by Clerk's middleware, never by hand (`clerk-production § The CSP header`).

### The origin check on every mutation

Read `Sec-Fetch-Site` first. Accept `same-origin` and refuse any other value. Compare `Origin` against the app's own URL only when the browser sends no fetch metadata.

- **Why `Sec-Fetch-Site` and not `Origin`:** a page served with `Referrer-Policy: no-referrer`, or a sandboxed frame, posts with `Origin: null`, even from a same-origin form or `fetch`. An Origin-equals-host check then refuses every real user, while a unit test sending a tidy `Origin` stays green. The browser sets `Sec-Fetch-Site` whatever the referrer policy, and it is `cross-site` for a form another site submits.
- **Test with the header set captured from the deployed app**, not a clean `Origin`:
  - `Origin: null` with `same-origin` passes;
  - `Origin: null` with `cross-site` is refused;
  - `Origin` decides alone only when `Sec-Fetch-Site` is absent.
- (`2026-10-03`, every real sign-in through an embedded panel was refused on production. The unit test's clean `Origin` is why it passed.)

### One body-reading helper, with its own byte ceiling

A route handler reads its body through one helper that counts bytes while the body streams, before any schema sees it:

- `415` when the body is not JSON;
- `413` past the ceiling;
- `400` when it is not valid JSON.

**Why a helper, and not the schema or the framework:**

- zod's limits apply only once the whole body is in memory.
- `Content-Length` can be absent or understated.
- The framework's limits are not this one. As documented on `2026-10-11`: Next caps Server Actions at 1 MB, and a body behind `proxy.ts` is buffered to 10 MB and then truncated, with only a server log line, never an error to the client.

(`2026-10-11`, the first review round of a product on this stack.)

## Abuse and floods

**Two layers, each doing what the other cannot.**

- **The host's edge limits floods per IP.** On Netlify: `POST` only, one rule per surface, a member surface and a public surface.
  - The public one is often a shared IP. An office, a classroom or a venue's Wi-Fi is one address, so a number that is right for a person is wrong for a hall.
  - The numbers are the product's, recorded in its integration notes and pinned in a unit test that imports both rule configs.
- **Per-actor limits live in the app.** They are keyed on the member id or the anonymous token, per surface, with budgets in Postgres. Their budgets are a table in the architecture doc: surface · key · budget · what a refusal returns.
  - HTTP routes return `429` + `Retry-After`.
  - Server Actions return a structured retry delay.
  - That delay comes **from the per-actor budget only**. A request the edge refuses never reaches the action, so it has no delay to report.
- **Turnstile (or any bot challenge) only where abuse shows.**

### Every awaited action goes through one client wrapper

**An edge-refused Server Action never returns its `{ error }`.** The action never ran. The browser's awaited call rejects with Next's *"An unexpected response was received from the server"*, and an unwrapped call ends as an unhandled rejection or Next's error screen.

- Every awaited action goes through one client helper (no `server-only`). It turns a rejection into the `{ error }` shape the screens already render, with a generic, honest message. The browser cannot read the status, so the message claims none.
- Add an `error.tsx` boundary for whatever still throws.
- A unit test: a resolved call passes through, and a rejected one becomes the message.
- (`2026-09-14`, building the edge-rule stage.)

### On Netlify (as documented 2026-10)

- **Why `POST`:** in an App Router app every write is a Server Action, sent as a `POST` to the page the caller is on, and every read is a `GET`. So limiting `POST` limits writes without moving anything under `/api/`.
- **The rule is a passthrough edge function**, because `method`, `excludedPath` and `onError` exist only in an edge function's inline `config`, never in `netlify.toml`:

  ```ts
  import type { Config } from "@netlify/edge-functions";

  export default async () => {}; // a passthrough: returning nothing sends the request on

  export const config: Config = {
    path: "/*",
    excludedPath: ["/p/*"], // the public surface has its own rule
    method: ["POST"],
    onError: "bypass", // a passthrough that fails must let the request through
    rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
  };
  ```

- **The platform enforces the limit before the function runs.** A refused request gets a `429` with no `Retry-After` and never reaches Next. Enforcement lags by up to ten seconds.
- **An invalid rule is logged, not failed.** Read the deploy log after touching rules.
- **The number of code-based rules per site depends on the plan.** It is two on the smallest plans, which is why there are two rules.
- **When a webhook route arrives, add it to the member rule's `excludedPath`.** A provider retries in bursts, and a refused webhook is a lost event.
- **An app-side per-IP limit trusts one header: `x-nf-client-connection-ip`.** Use one only for an anonymous action with no token to key on.
  - While Cloudflare is DNS-only, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` and every other forwarded header are whatever the caller sent.
  - Validate the address as an IP and normalise IPv4-mapped IPv6.
  - Fall back to loopback only when the app URL is local. Refuse a deployed request with no usable address, rather than giving it a shared bucket.
  - Store a daily keyed hash, never the address.
  - (`2026-10-01`, a live Q&A product's anonymous start limits.)
- **Verify on the deploy, because nothing runs locally.** `next dev` has no edge.
  - The proof is the deploy log plus a smoke test against the URL. It trips the member rule with write-free `POST`s and checks that the health route and the other surface still answer.
  - The smoke runs **last**, because it refuses your own address for a minute.
  - Re-run it after every deploy: across deploys of byte-identical configuration, the same rule has been seen to enforce, stop enforcing and enforce again (`2026-09-17` and `2026-09-18`).
  - The release procedure is `release-gate`.

## Cross-tenant access

- **Every query is scoped by workspace through the three functions** (`model.md § The three functions`).
- **A cross-tenant test on every route that touches data.** A member of workspace A, holding B's ids, gets the same 404 as a missing id.
- **Row-level security is not the isolation on this stack.** It is deny-all, a backstop (`supabase-production`).
- **A denial test must prove it reached the check.** On PostgREST, a call that matches no function (missing, not yet in the schema cache, or called with other argument names) answers `404` (`PGRST202`) before Postgres checks anything. A test expecting only a 404 for a foreign id therefore passes against a schema without the function. Assert status, error code and message together, and call with the real argument names (`documents-and-tests.md § Rules that came from bugs`).

## Origin bypass

**The pattern:**

1. The hosting URL stays reachable behind a proxy (Cloudflare).
2. A proxy transform rule adds a secret header.
3. Middleware rejects production requests without it, with the health check exempt.
4. Only then is `CF-Connecting-IP` trusted.

**On this stack it is blocked.** It presumes a proxy in front of the host, and Netlify does not support Cloudflare's proxy in front of it. Behind the proxy there is no certificate provisioning, and the proxy's cache outlives a deploy. So every name Netlify serves stays DNS-only at Cloudflare, and the WAF, under-attack mode and the transform rule are outside this architecture for the app. Netlify's own WAF is Enterprise-only (as documented 2026-10). An origin of your own that holds its own certificate (a status host, a worker) can sit behind the proxy, and is then protected by it.

Introducing a proxy is a hosting decision, not a configuration. Until it is made:

- trust no forwarded header (§ Abuse and floods);
- leave the seal secret unset;
- generate the seal secret only when the proxy is adopted.

## Leaked tokens and credentials

- **API tokens are `prefix_<kid>.<secret>`.**
  - Store the `kid` and `HMAC(pepper, owner ‖ secret)`.
  - Show the token once and compare in constant time.
  - Revoke by tombstone.
  - Tokens are scoped and workspace-owned.
  - The pepper is a server secret you generate. Rotating it invalidates every token.
- **Test token scope:** a token does only what its scope and its workspace allow.
- **A secret shown once dies with the dialog that shows it**, so that dialog refuses accidental dismissal, including Escape inside a vendor's overlay. Its head's close button warns inline before an uncopied secret is lost, and a second press discards it (the `ui-design` skill's dialog primitive). (`2026-09-20`, a live Q&A product: one Escape inside Clerk's organization modal closed it and destroyed a shown-once token. `2026-11-03`, an evals product's owner could not find how to close such a dialog and chose a close button with a warning.)
- **An OAuth caller (an outside agent over MCP) gets the grant a new API token carries.** So admit it by the permission that mints such a token, checked through the three functions on every call (`mcp-server`). Offline JWT verification does not see a revoked grant until the token expires, so recheck workspace access on every request (`clerk-production § MCP OAuth`).
- **A comment that states an invariant about a credential protects only the file it is written in.** For example: never parse, reflect or store X.
  - List every route that can receive that value, and check each one: the comment cannot.
  - A vendor may send a credential to more of your URLs than the one you registered as its callback.
  - (`2026-09-22`, a live Q&A product's install route kept such an invariant. The page next to it broke the invariant on a fresh install, in production.)

## Leaked database

**Assume the database leaks, and make it worth little.** Store ids and hashes, not identities:

- no emails, no profile copies, no IP addresses;
- for members, the identity provider's ids only. Read names and emails from the provider at render time;
- for the anonymous public, a token hash and whatever display fields the product adds;
- **logs hold ids, never bodies.**

List every table that holds something a person wrote. The privacy page has to name each one, and the erasure path has to reach it. Say what deleting a workspace cascades to, and prove the cascade in an integration fixture. Until a retention job exists, no screen and no legal page may promise automatic deletion.

## Anonymous identity

**The anonymous token *is* the visitor.** Without it, every action mints a new visitor, so a once-only action can be repeated and a ban means nothing.

- A surface that needs enforceable identity says so and refuses to work without a cookie.
- It must also say what the cookie is *for*. "Enable cookies" alone reads like a tracking demand.
- Rotating the cookie's signing secret is a panic button: every visitor becomes a new visitor, and their old rows are orphaned, not lost.

## Webhooks

- **Verify signatures** (Clerk signs through Svix), **handle replays idempotently**, and **process only events you own**.
- **The PII trigger:** before the first paying customer or the first deletion request, consume the identity provider's deletion events (`user.deleted`, `organization.deleted` on Clerk). Delete or anonymize what the workspace owns. Until then, no webhook route exists and its secret stays empty.
- **Until that handling exists, turn off the identity provider's own deletion paths**: an admin deleting the organization, a user deleting their own account. Either cuts the members off while the workspace's rows stay stored and its public pages stay up. (`2026-10-21` and `2026-10-24`, a monitoring product turned both off on each instance; on Clerk: `clerk-production § Webhooks and personal data`.)
- Exclude the webhook path from the member surface's edge rule (§ Abuse and floods).

## Scheduled work

- **No public cron endpoint.** A cron service runs the job code directly and exits. A database-scheduled job runs as the role that scheduled it; its SQL is its only authorization when that role bypasses RLS (`supabase-production`, scheduled SQL).
- **Each run is idempotent**, by one of two means. Test either the same way: runs twice, acts once.
  - **A run table**: a `job_runs` row with a unique key per run, for a job that acts once per period.
  - **A receipt per unit of work**: each unit (an event × a channel × a recipient, say) a unique row, claimed under a lease (`for update skip locked`), acted on only while the claim is fresh, and marked done only while it is still yours. A pass may then run any number of times, overlap another, or be missed and caught up by the next. (`2026-10-23`, a monitoring product's alert sender, on a one-minute cron.)
  - Where the unit's work is a call outside your system that cannot itself be made idempotent (an email through a provider with no idempotency key), the receipt narrows a duplicate to the one call whose answer never came back; it does not remove it. Say so wherever the product promises delivery. The `transactional-email` skill carries the whole pattern for email.
- A retention promise on a legal page is what makes a purge job necessary. Until the job exists, no page promises deletion.

## Secrets

- **Never in the repo, a URL, a log line, or a client bundle.**
- **`server-only` on every module that imports one**, so a client import fails the build.
- **Only variables marked public (`NEXT_PUBLIC_*`) reach the browser.** The env schema refuses a secret-shaped value in a public variable at build time, not at boot, because the value is inlined into the bundle when the build runs.
  - (`2026-10-10`, a product's `.env` held the Clerk secret key in the publishable variable; caught before anything was built with it.)
  - The Clerk specifics: `clerk-production § Variables`. The schema's contract: `environments`.
- **A value you generate** (a cookie secret, a token pepper, a seal secret) **is generated when it is added**, written into `.env` and named in the summary. Nobody can look it up, so an empty placeholder is a boot failure with no instruction attached.
- **A leaked key:** the planned-rotation order, done at once: the new value beside the old, every holder updated and redeployed, then the old revoked. If it is being used against you, revoke first and accept that every holder fails until it has the new value. Write it down in the product's environment log. The full order, and the keys it cannot rotate, are in the `environments` skill (§ Rotating).
- **A planned rotation runs the other way round**, so nothing breaks: the new value made beside the old where the provider allows two, put into every holder and each one deployed, checked working, and only then the old value revoked. Every runtime that holds a copy is a holder, not only the app's host. The procedure, and the list of holders it needs, is the `environments` skill's. (`2026-10-24`, a monitoring product rotated its identity provider's production secret on the app's host while a separately deployed worker still held the old key. It still worked, so nothing failed: half done, and set to break the worker's email the moment the old key was deleted.)

## Calls to customer-supplied addresses

A product that fetches an address a customer typed (a webhook target, the base URL of their API, a page to scan) makes that request from inside your network, with your server's reach. That is server-side request forgery when the address points inward. Treat every such address as hostile:

- **Allow `https` only**, on the ports the feature needs; `http` only where the product truly must.
- **Resolve the name and refuse every address that is not public:** loopback, the private ranges (`10/8`, `172.16/12`, `192.168/16`, `fc00::/7`), link-local (`169.254/16`, which holds the cloud metadata address `169.254.169.254`, and `fe80::/10`), shared address space (`100.64/10`), `0.0.0.0`, and the IPv4-mapped IPv6 form of each.
- **Connect to the address you checked.** A second lookup at connect time can answer differently (DNS rebinding), so the check and the connection use one answer: on Node, a custom `lookup` given to the HTTP client's agent that validates the address it returns. TLS still verifies the certificate against the hostname.
- **Follow no redirect automatically.** Check each hop's address the same way, with a small hop limit.
- **Cap the time and the size** of every response, and read only what the feature needs.
- **Send nothing of yours:** no cookies, no internal headers, no credential but the customer's own.
- **Report a failure in the customer's terms**, never the raw network error, which maps your network for whoever asks.
- **Test the refusals:** a name that resolves to `127.0.0.1`, a redirect to the metadata address, and a name that answers a public address on the first lookup and a private one on the second.

(`2026-10-30`, an evals product: calls to customer-supplied base URLs were day-one work, and no skill covered them.)

## Customer secrets at rest

A customer's credential the product holds to act for them (their model provider's API key, a webhook signing secret) is not the product's own secret (§ Secrets), and it lives in the database. So:

- **Encrypt it before it reaches the database**, with an authenticated cipher (AES-256-GCM, a fresh nonce every time) under a key held outside the database (the host's secret store, or a key service), with the key's version stored beside the ciphertext so the key can rotate.
- **Bind the ciphertext to its row**, with the workspace and the secret's id as associated data, so a ciphertext copied into another row does not decrypt.
- **Decrypt only in the code path that uses it**, on the server, just before the call; never into a response, a log line, an error or an analytics event.
- **Never show it back after it is saved.** Show its last four characters and when it was set; replacing it is a new save.
- **A runtime that only accepts the secret need not be able to read it.** Where the web app takes it and a worker uses it, the web app can seal it to the worker's public key, so a compromise of the web runtime yields no stored secret (`2026-10-31`, an evals product built it this way).
- **Deleting the workspace deletes them**, and rotating your key re-encrypts every row before the old key is retired.

## Embedded agents

Only when the product has them.

- **Anything an agent reads can carry instructions.** What the agent can do is therefore bounded by its tools, never by its prompt.
- **The agent proposes; deterministic code decides** (`model.md § Deterministic code decides`). A tool takes its identity from the session's caller, resolved by the three functions, never from an id the model supplies. Whatever a tool must refuse, it refuses in code. A conversation history the client sends is a claim too.
- **Everything a model reads or writes is untrusted text**, rendered as plain text or sanitized markdown.
- **Cost has two ceilings**: a turn limit and a budget on every run, and a per-actor budget on the route before anyone but the developer can reach it.
- The mechanics are in `embedded-agents-messages-api` and `embedded-agents-agent-sdk`.
