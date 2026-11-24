# The CSP header, Clerk's variables, and the production instance

## Contents

- The CSP header
- Variables
- What to record about Clerk
- The production instance

## The CSP header

Every app needs a CSP header (`saas-authorization § Untrusted text`). This is how it is made on this stack. **The nonce policy comes from Clerk's middleware, never from a hand-written one.** The middleware writes a policy Clerk's own scripts satisfy, while a hand-written policy has to keep up with every origin Clerk's sign-in loads from.

- **In `src/proxy.ts`:**

  ```ts
  clerkMiddleware(handler, {
    contentSecurityPolicy: {
      strict: true,
      directives: {
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "img-src": ["'self'", "data:"],
      },
    },
  });
  ```

  - Clerk merges these directives into its own rather than replacing them.
  - **`img-src data:` is there for Clerk itself.** `<SignIn />` and `<SignUp />` draw a `data:` SVG, which the default policy refused with a console error on every visit (`2026-10-22`). A browser test loads sign-in and sign-up and fails on any CSP refusal.
  - `strict: true` issues a per-request nonce with `'strict-dynamic'`.
  - Next's own scripts carry the nonce too, because the policy is also set on the request headers Next reads.
  - A nonce needs dynamic rendering, which app pages already have. That is why `/` renders per request when it is an App Router page (`sessions-and-front-door.md § The front door and the member home`).
- **A third-party origin joins the directives only once its integration is wired.** For example, cookieless Microsoft Clarity adds `connect-src https://*.clarity.ms` and `img-src data: https://*.clarity.ms https://c.bing.com` once a project id is set.
- **The static headers go in `next.config.ts` `headers()`, on `/:path*`:**
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin`, so no page, same-origin or not, hands its path and query (an id, an invitation ticket) to the next; never `no-referrer`, which makes the browser send `Origin: null` (`saas-authorization`, threat model);
  - `X-Frame-Options: DENY`.
- **A surface that must be framed gets its own policy and its own branch in the proxy**, never a hole in the general one.
- **Serve a standalone static landing document with its own CSP.** Apply `product-analytics` § What binds for this setup outside Clerk middleware. Serve the same protections as static response headers and admit only the sources the document uses. Keep the nonce policy on Clerk's app pages.
- **Prove the headers on raw responses** from `/` and from a page reached by an id. Check `frame-ancestors 'none'` and `referrer-policy: strict-origin` on both. On every response carrying Clerk's policy, check that `content-security-policy` contains `'nonce-` and that two requests get different nonces.

Receipts:

- `2026-09-15`, a production-readiness review found no CSP or `X-Frame-Options` header on a live Q&A product's production.
- A later product on the same stack deferred its CSP, believing Clerk's scripts needed a nonce-aware policy someone would have to write. The middleware *is* that policy.

**What the middleware costs:** it runs on `/` too when the landing page uses the shared App Router, so a browser with an expired session token gets a refresh or a handshake redirect before any page renders, even a page that reads no session. Only a page outside the middleware avoids that, and such a page loses the nonce policy (`gotchas.md`).

## Variables

| Name | Used by | Scope | Source | Risk if leaked |
|---|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ClerkJS in the browser. Needed at **build** time, because it is compiled into the bundle. Must be the `pk_…` key: the env schema refuses an `sk_…` value here, at build | client | Clerk → *API keys* | low (public by design) |
| `CLERK_SECRET_KEY` | verifying sessions; the Backend API; verifying MCP OAuth tokens | server | Clerk → *API keys*, rotated in the dashboard | **critical**: impersonation |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | the server's sign-in redirect (`auth().redirectToSignIn()`, `auth.protect()`), which does not read the provider's `signInUrl` | client | you: `/sign-in` | none |
| `CLERK_WEBHOOK_SECRET` | verifying webhook signatures. Only once the personal-data trigger fires; empty until then | server | Clerk → *Webhooks* | high: forged deletions |
| `TEST_ADMIN_EMAIL` | **tests only**: the account the authenticated suite signs in as. Must carry the `+clerk_test` subaddress; every further test account is derived from it. Not in the app's env schema | test | you (any address, as long as it is `+clerk_test`) | none: Clerk never sends mail to it |
| `TEST_VERIFICATION_CODE` | **tests only**: the code a **development** instance with Test mode on accepts for every `+clerk_test` address (`424242` unless changed, and it should be changed) | test | Clerk → *Configure → Instance → Test mode* | none on its own, but it is the password to every test account on the instance |

**The env schema's Clerk checks.** The general contract is in `environments`. It runs from `next.config.ts` at build and dev start, treats an empty value as unset, and lists every problem without echoing a value. The Clerk half:

- **Each key's shape is checked:** `pk_(test|live)_` for the publishable key and `sk_(test|live)_` for the secret.
- **Every `NEXT_PUBLIC_*` key refuses a secret-shaped value.** A unit test pins the refusal, and pins that the message does not contain the secret.
- **Why at build, not at boot:** a `NEXT_PUBLIC_*` value is inlined into the client bundle when the build runs, and static chunks are served without any per-request check. A boot check comes after the leak.
- **A host that scopes secrets away from the build** (Netlify's variable scopes) still gets the `NEXT_PUBLIC_*` half validated at build. The server-only remainder is checked at boot.

**The secret key fits in the publishable variable, and nothing in Clerk or Next refuses it.**

- Both keys sit side by side on the *API keys* page, and `.env` is filled by hand.
- An `sk_…` pasted into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into every client chunk at build, and served by `next dev`.
- ClerkJS's *invalid publishable key* comes only after the bundle exists.
- If only the secret is at hand, a development publishable key is `pk_test_` + base64 of `<frontend-api-host>$`. Confirm the instance from `https://<frontend-api-host>/v1/environment`.
- **If a build or a dev server ever ran with the secret in the public variable, rotate it.**
- (`2026-10-10`, a product's `.env` held the secret in both variables; caught before anything was built with it.)

**MCP OAuth needs no new variable:** the publishable key gives the issuer, the secret key verifies tokens, and `APP_URL` gives the resource (`mcp-oauth.md`).

## What to record about Clerk

In the product's integration notes, kept current, dated:

- **The instances:** development keys locally, a production instance for the deploy.
- **The components in use**: `<SignIn />`, `<SignUp />`, `<UserButton />`, and as the shape uses them `<OrganizationSwitcher />`, `<PricingTable />` and the organization modal. Note that they are dressed through `appearance.variables` referencing the kit's tokens.
- **The workspace model.** In the organization shape, organizations on with *Membership required*. In the individual shape, organizations off.
- **In the organization shape, the roles on the instance** and what each maps to in the permission module.
- **With Clerk Billing:**
  - which billing tab the plans live in, the one matching the workspace model (the tabs are permanent);
  - the billing file, the exact feature slugs the code gates on with the plan each belongs to, and each instance's read-back against the file, dated (`organizations-and-billing.md § Billing`);
  - which roles hold *Manage billing*.
- **That no feature is attached to a Clerk permission.**
- **The test accounts** the authenticated suite creates: one per role, in one organization.
- **The webhooks consumed**: none until the personal-data trigger, and Clerk's own deletion paths off until then.
- **The cookies Clerk sets, signed-out visitors included.** With the provider in the root layout, a signed-out visit to any page ends with `__client_uat` (and, on a development instance, `__clerk_db_jwt`), each also under a suffixed name, on your host, plus Cloudflare's `__cf_bm` and `_cfuvid` on Clerk's frontend API host. The privacy page names them. (`2026-10-22`, measured on a signed-out visit to a legal page.)
- **The MCP OAuth re-read**, per instance, when the product is an MCP server.
- **The production instance's email DNS records and the legal-consent setting**, confirmed by a person.
- **A dated read-back of each dashboard setting**, or a screenshot where nothing can read it (`SKILL.md § Keep a record of every dashboard setting`).

## The production instance

At go-live, as part of production resources kept separate from development (`release-gate`, `environments`), the production instance gets:

- **its own keys**, none shared with development. **They work only on the domains the instance is configured for**: a production site that also answers on the host's default subdomain refuses sign-in there (`2026-10-24`);
- **its DNS records** (`clerk.`, `accounts.`, `clkmail.` and two DKIM CNAMEs), DNS-only, with the sign-in host watched by the external monitor (`gotchas.md`);
- **its own OAuth client for each social sign-in.** A development instance signs in with Google on Clerk's shared credentials; production needs a client in your own Google Cloud project, its id and secret entered in Clerk. To rotate its secret: make a new one in the client, paste it into Clerk, then delete the old (`2026-10-24`);
- ***Require express consent to legal documents*** on at sign-up, with the legal pages' URLs. The legal pages land before the first stranger is asked for anything, and every sentence on them is checked against what runs today;
- **a real Stripe account connected to Clerk Billing**, when the product bills, in the dashboard. Its plans come from the same billing file, applied with `--instance prod` after a dry run and read back (`organizations-and-billing.md § Billing`);
- **every other dashboard setting applied again and read back**: organizations and *Membership required*, roles and *Manage billing*, the deletion switches, the OAuth settings. **An instance cloned from development does not carry the settings that only the API sets**: production's OAuth settings came across with DCR, CIMD and the audience claim off and no default scopes (`2026-10-24`);
- **generated secrets generated afresh**, never copied from development. Each dashboard change gets its screenshot.

**Once a production branch exists, the product branch never builds with production's values.** On Netlify, either give its branch deploy context the development values (deploy contexts exist on every plan; the *scopes* Builds, Functions and the rest are Pro and Enterprise only, read `2026-10-25` in Netlify's environment-variable docs), or build it on a development site of its own, as a monitoring product did (`2026-10-23`). Otherwise it starts writing to production. The pattern is `environments`.
