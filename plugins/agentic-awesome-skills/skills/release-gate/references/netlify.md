# Netlify — what happens to a request around the app

The host mechanics behind the release rules, for a Next.js (App Router) app on Netlify with Cloudflare as DNS only. On another host the questions are the same — what answers before the app, what the edge can and cannot limit, which header carries the client's address, whether deferred work survives the response — and the answers are that host's.

Platform facts here are dated. Netlify changes plans and features without notice: read its current docs before relying on a number, and correct the line when it moves.

## The site

- **Connected through the GitHub integration on the production branch** named in the release doc.
- **Per-branch values are deploy contexts, and every plan has them; scopes are another feature.** A variable can hold a different value for production, deploy previews, branch deploys or one named branch on any plan; limiting a variable to *Builds*, *Functions*, *Runtime* or *Post processing* is the scopes feature, Pro and Enterprise only (Netlify's docs, read 2026-10-25). So giving the product branch development's values never needs a paid plan. The simpler shape is still two sites, each building only its own branch, with deploy previews and branch deploys off; Netlify was seen ignoring `skip_prs` and `allowed_branches` when a site was created through its API, so set them right after creation and read them back. (`2026-10-23`, a monitoring product created both its sites that way.)
- **Build settings live in `netlify.toml`, not the dashboard** — command `npm run build`, publish `.next`, the Node major the app runs on — so a fresh site cannot come up unconfigured.
- **`@netlify/plugin-nextjs` is the adapter** that turns the build into functions and edge functions. **Whether to pin it is a release decision**, recorded in the backlog: unpinned, every rebuild may re-derive the edge chain, and a control you did not touch can change behaviour with no diff to show for it (`SKILL.md § Verify`).
- **Netlify does not read `.env`.** Every variable in the variables doc has to be set in the site's own environment, and `NEXT_PUBLIC_*` values are needed **at build time**, because they are compiled into the browser bundle (`environments`, `references/variables.md`).
- **The build is not gated on hosted CI** (`go-live.md § Guards and hosted CI`).

## How Netlify's edge works

Netlify is the edge: with Cloudflare DNS-only (below), everything that happens to a request before the app sees it happens here. A request passes these layers in this order, and **a layer that answers ends the chain** (as recorded on 2026-09-18):

1. **Firewall Traffic Rules** — allow or block by client IP range or geolocation, before everything else. Basic on every plan: 2 rules per ruleset with 3 IPs or 3 geolocations each on Free, Starter and Personal; 10 rules with 50 each on Pro and Enterprise; 500 rules and team-wide policies only on Enterprise with High-Performance Edge. **Enough to shut out one abusive address a person has identified; not a WAF.**
2. **WAF** — Netlify's managed OWASP Core Rule Set, anomaly-scored per request (injection, XSS, protocol abuse, scanner signatures), in log-only or blocking mode per site. **Enterprise with High-Performance Edge only.**
3. **Rate limiting** — the layer every plan has (below).
4. Password protection · edge functions that run **before** the cache · the edge cache · edge functions that run after it · the durable cache · the image CDN · **serverless functions, which is where the Next.js app runs** · redirects and rewrites · static files · 404.

So on the plans a new product starts on, **the WAF is not there, and an origin seal has nothing to hang on.** (An origin seal is a proxy in front of the host adding a secret header that the app requires on every production request, health check exempt; it presumes a proxy Netlify does not support.) What is there is rate limiting, which is enough for floods, and the two-rule firewall, which is enough to block a single address by hand — set in the Netlify UI and recorded in the integrations doc with a screenshot when it is used.

### Rate limiting

A rule is declared either **inline**, in an edge function's `config` — `rateLimit: { windowLimit, windowSize, aggregateBy: ["ip", "domain"], action }` — or as a `[[redirects]]` entry with a `[redirects.rate_limit]` block in `netlify.toml`. Three things exist **only** in the inline form: `method`, `excludedPath` and `onError`. That is why a rule that must match `POST` and leave `GET` alone is an edge function that does nothing:

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

As recorded on 2026-09-18:

- **The platform enforces the limit before the function runs.** A refused request gets a `429` and never reaches Next, **with no `Retry-After` header**.
- **Enforcement lags by up to ten seconds**, so a smoke sees the first `429` a little past the number rather than at it. (`2026-09-14`, a live Q&A product's first smoke: the first `429` arrived at request 78 for a limit of 60, and at 620 for 600 — the lag, not a wrong number.)
- `action: "rewrite"` sends refused requests to a path instead of a status.
- **Rules are validated in the deploy's post-processing step, and each valid one is listed in the deploy log. An invalid rule is logged, not failed** — read the log after touching them.
- Rules per site: two code-based rules on Free, Starter and Personal, five on Pro and Enterprise, one hundred with High-Performance Edge, where rules can also be made in the UI. Know which plan the site is on before adding a third rule.

### An edge-refused Server Action never returns its `{ error }`

The action never ran, so the browser's awaited call **rejects** with Next's *"An unexpected response was received from the server"*, and an unwrapped call ends as an unhandled rejection or Next's error screen.

- **Every awaited action goes through one client helper** (no `server-only`) that turns a rejection into the `{ error }` shape the screens already render, with a generic, honest message — the browser cannot read the status, so the message claims none.
- **An `error.tsx` boundary** catches whatever still throws.
- **A unit test**: a resolved call passes through, a rejected one becomes the message.
- **The structured retry delay comes only from the per-actor budget inside the action** — the edge sends none. HTTP routes answer `429` + `Retry-After` from that same budget.

(`2026-09-14`, a live Q&A product's edge-rule stage.)

### Why two rules, and why `POST`

In an App Router app every write is a Server Action, and Next sends each one as a `POST` to the page the caller is on; every read is a `GET`. **So limiting `POST` is limiting writes**, without moving anything under `/api/`.

A **member surface** and a **public surface** get separate rules because the public one is often a shared IP — an office, a classroom, a venue's Wi-Fi is one address — and a number that is right for a person is wrong for a hall. The numbers are the product's: state them in the integrations doc and **pin them in a unit test that imports both configs**. When a webhook route arrives, add it to the member rule's `excludedPath` — a provider retries in bursts, and a refused webhook is a lost event. A product with no public `POST` surface needs one rule.

### What the edge cannot do, and where it goes instead

- **Per-actor fairness** (a member id, an anonymous token) is a database-backed budget inside the action, with its budgets in the architecture doc (`saas-authorization`).
- **Bot challenges** are Turnstile, only where abuse shows.
- **A WAF and an origin seal** wait on a plan or a host that has them.

### An app-side per-IP limit trusts one header: `x-nf-client-connection-ip`

The edge rules are the flood limit. When a product also needs a per-IP budget in its own code — an anonymous action with no token to key on — **read only the address Netlify sets.** While Cloudflare is DNS-only, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` and every other forwarded header are whatever the caller sent.

- Validate it as an IP and normalise IPv4-mapped IPv6.
- Fall back to loopback only when the app URL is local; **refuse a deployed request with no usable address** rather than giving it a shared bucket.
- **Store a daily keyed hash, never the address** — a leaked database holds ids and hashes, not identities.

(`2026-10-01`, a live Q&A product's anonymous start limits.)

### Work deferred with Next's `after()` relies on the runtime supplying `waitUntil`

`@netlify/plugin-nextjs` documents it as supported; as of 2026-10-07 a live Q&A product had not yet seen it work on a deploy, so **treat it as unverified**. If it is lost, the response is unaffected and only the deferred writes go missing — so a post-deploy smoke checks for the row its own call wrote. `after()` also throws outside a request scope (a unit test calling a handler directly), so catch that and count the work as unscheduled rather than failing the response. (`2026-10-07`, a usage log.)

### Verifying it

**Nothing runs locally — `next dev` has no edge.** The proof is the deploy log plus the smoke (`npm run smoke -- <url>`), which:

- trips the member rule with **write-free `POST`s** (a signed-out `POST` that redirects to sign-in, or one to an id that does not exist, writes nothing);
- checks that `GET /health` still answers while the address is refused — the rules count `POST`s only;
- checks that the other surface is still open — two rules, not one;
- runs **last**, because it refuses your own address for a minute.

**Re-run it after every deploy, not only the one that added the rules**: across deploys of byte-identical configuration the same rule has been seen to enforce, stop enforcing and enforce again. (`2026-09-17` and `2026-09-18`, a live Q&A product: identical edge configuration enforced, stopped enforcing, then enforced again, with no diff to explain it; the likeliest cause is the unpinned adapter.)

### A redirect target with no query string of its own inherits the original one

On Netlify, a redirect written to drop a query parameter — a vendor's credential, a malformed code — arrives carrying it again, and loops. **Give every such target a nonempty query of its own, and pin that in a unit test**; the local gate has no Netlify edge to reproduce it. (`2026-09-22`, measured on a live Q&A product's production: a fresh third-party install looped through ten `307`s until the target carried its own marker.)

## Cloudflare — DNS only

DNS only, proxy disabled. **Netlify does not support Cloudflare's proxy in front of it** — no certificate provisioning behind it, a cache that outlives a deploy — so Cloudflare's WAF, under-attack mode and the transform rule an origin seal needs are outside this architecture. Introducing a proxy is a hosting decision, not a configuration, and until it is taken `CF-Connecting-IP` is caller-supplied and never trusted. Which hosts can sit behind it, and the domain's order: `environments`, `references/domain-and-provider-access.md`.
