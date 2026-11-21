---
name: saas-authorization
description: 'Adding sign-in, a role, a route that touches data, API tokens, a webhook or job, or ''is this secure'': who may do what in a multi-tenant SaaS.'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# SaaS authorization: who may do what, and the threats every app has

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Adding sign-in, a role, a route that touches data, API tokens, a webhook or job, or 'is this secure': who may do what in a multi-tenant SaaS.


**Decide who may act on what across every tenant boundary.** This skill covers authorization and the threat classes every multi-tenant app has, whatever it does.

**Keep the principle and substitute your stack's mechanism.** Each principle precedes the Clerk, Supabase or Next mechanism. Apply `clerk-production` and `supabase-production` for vendor mechanics in depth.

## What binds, in order

1. **Declare the product's shape before the first migration.** What a workspace is (an organization, or one user), whether it bills, whether it has an anonymous public, whether it embeds agents. Everything below reads through it. Write it down before the first migration, in the product's agent instructions, where every session reads it.
2. **Apply this skill for the model and threat classes.**
3. **Record intended permissions as a capability-by-actor matrix.** Use the product's permissions doc (`references/documents-and-tests.md`). It is the intent an audit compares the code against (`intended-vs-implemented`, `security-audit-static`). Beside it sit the architecture doc (what exists: routes, ownership, invariants, known risks), the flows doc (the journeys where permissions, money or personal data are exercised) and the backlog (deferred work, each with the trigger that reopens it). What each must say about authorization is in the same file; `shipping-artifacts` defines the core set.
4. **Use vendor agent skills for APIs, never for the access model.** Where their defaults contradict this skill, this skill wins. Examples: RLS policies written to match an access model, `@supabase/ssr` and a browser key, a middleware path list deciding who may see a page.

## The model on one page

Read `references/model.md` for each full rule, reason and receipt.

1. **Everything belongs to a workspace, and the product keys on its own row.** Every domain table hangs off a workspace or off something that does. Only the `workspaces` table holds the identity provider's org or user id, with one exception, authorship (who wrote a note, who labelled a row), which gets one table of its own: a member row holding only the workspace, the provider's user id and the product's own member id, made on the member's first write, never read for authorization and never a copy of a name, an email or a role; author columns reference that row, so a change of provider is two tables.
2. **Two credentials, never mixed.** A member session, verified server-side on every request and never decoded and trusted. An anonymous token (a cookie: random, one row per token, hash stored), only when the product has an anonymous public. Member routes never trust the token; public routes never read session claims; no route carries both.
3. **Deterministic code decides whatever crosses a trust boundary or can't be taken back.** This includes authorization, money, sending, deleting, changing someone's records. A screen, a client, a prompt or a model may *propose* the action; a tool, a constraint, a hook or the orchestration code decides it. A two-way door can rest on judgement. A one-way door cannot.
4. **Three functions carry the model; no route reads raw claims.** `resolve<Thing>(publicId)` → the thing and its workspace. `requireVisitor(thingId, cookie)` → the anonymous visitor row. `requireWorkspaceAccess(workspaceId, auth, permission)` → throws unless the caller holds that permission in *that* workspace.
5. **Check permissions, not roles.** Permissions are strings; roles map to them. A screen gates a control on the *same* permission its action checks, not on a neighbouring one the same roles hold today.
6. **What a screen *says* is gated too.** Assert it as a capability: no state offers this caller anything their permissions withhold.
7. **The active-organization claim says where the caller is acting, not who owns what they asked for.** Resolve the resource from the URL, find its workspace, then check membership.
8. **Entitlements come from billing, read on the server.** No permission or quota decision reads them from your database or a client claim, except an anonymous action's allowance, stamped on its resource from a member's verified session (`references/model.md`). A caller with no session that the server handles (an API token, a job) reads the subscription for the plan, and the provider's plan list for that plan's features, never the subscription's embedded copy. A background worker that must know a plan may read a mirror the app writes only from a verified read, and only to route work. Gate on features, not plan names, and fail towards the free tier.
9. **Roles and entitlements never touch.** A role says *who may act*; a feature says *how much*. A feature never decides which member may act, and a role never carries a limit. Gate a capability on a feature and a lapsed card removes it mid-session. Sell scale, not permission.
10. **Invariants are database constraints, not application code.** A once-only action is a primary key. A quota is checked inside the transaction that creates the thing. A missing quota is an error, never an entitlement. A limit of N is a lock and a count, and then every write must go through the function.
11. **Ids in URLs are unguessable, and not-found and not-owned return the same 404.**

## The threat classes

| Class | The rule | Depth |
|---|---|---|
| Untrusted text | Plain text unless rich text is needed, and then a server-side allowlist sanitizer. Validate shape on client and server, and escape on render. A CSP header. An origin check on every mutation, reading `Sec-Fetch-Site` first. Every route handler reads its body through one helper that has its own byte ceiling, counted while the body streams | `references/threat-model.md § Untrusted text` |
| Abuse and floods | Per-IP flood limits at the host's edge (one rule per surface: member, public). Per-actor budgets in the app, answered by `429` + `Retry-After` or a structured delay. One client wrapper for refused calls. Turnstile only where abuse shows | `§ Abuse and floods` |
| Cross-tenant access | Every query scoped by workspace through the three functions, and a cross-tenant test on every route that touches data | `§ Cross-tenant access` |
| Origin bypass | A secret header from the proxy, checked by the app. It needs a host that accepts a proxy. Until then, trust no forwarded header | `§ Origin bypass` |
| Leaked tokens | `prefix_<kid>.<secret>`, stored as `kid` + `HMAC(pepper, owner ‖ secret)`. Shown once, compared in constant time, revoked by tombstone. Scoped and workspace-owned | `§ Leaked tokens and credentials` |
| Leaked database | Ids and hashes, not identities: no emails, no profile copies, no IPs. Logs hold ids, never bodies | `§ Leaked database` |
| Anonymous identity | The token *is* the visitor. A surface that needs enforceable identity refuses to work without the cookie, and says what the cookie is for | `§ Anonymous identity` |
| Webhooks | Verify signatures, handle replays idempotently, process only events you own | `§ Webhooks` |
| Scheduled work | No public cron endpoint. Each run idempotent: a unique key per run, or a receipt per unit of work claimed under a lease | `§ Scheduled work` |
| Secrets | Never in the repo, a URL, a log line or a client bundle. `server-only` on every module that imports one. A leaked key is rotated before anything else; a planned rotation reaches every holder before the old value is revoked | `§ Secrets` |
| Calls to customer-supplied addresses | Only `https`, resolved once and refused unless public (no loopback, private, link-local or metadata address), connected to the address checked, every redirect checked again, time and size capped, nothing of yours sent | `§ Calls to customer-supplied addresses` |
| Customer secrets | Encrypted before they reach the database, under a key held outside it, bound to their row; decrypted only where used; never shown back, logged or returned | `§ Customer secrets at rest` |
| Embedded agents | What an agent can do is bounded by its tools, never by its prompt. Each run and each actor has a cost ceiling | `§ Embedded agents` |

## Order of work

- **The plan that introduces the database names the workspace table, the three functions and the first migration.** Screens built before it read fixtures behind the seams the real system will use, never invented persistence.
- **The first real slice proves the access model with the mechanisms it uses.** Two members of different workspaces cannot see each other's data. Where there is an anonymous public, a visitor takes the public action from a phone without an account. Run the applicable tests below and land them with the permissions doc in the same change.
- **Recheck authorization in every later identity, workspace, route or permission change.** For changes touching sign-in, workspaces, roles, a route or a permission, require the three functions, the same permission on the screen as in the action, and a cross-tenant test. The permissions doc changes in the same commit.
- **Decide whether a role or tier answers who or how much.** Do this before writing any code. A role goes into the permission map. A feature goes into the plan module and a quota parameter, never into a permission (`references/model.md § Roles and entitlements never touch`).
- **Propose `security-audit-static` on the release's changes before release.** It compares code against the permissions doc. The release procedure itself is `release-gate`.

## Authorization tests for data routes

- **Prove cross-tenant access is refused on every data route.** A member of workspace A, holding B's ids, is refused with the same 404 as a missing id.
- **Run mechanism-specific tests where the feature uses or changes that mechanism.** Prove once-only and quota invariants, including a race, where they apply. Prove script tags render as text where untrusted text is rendered, repeated runs act once where requests or jobs can replay, and tokens are confined to their scope and workspace where accepted. Use `references/documents-and-tests.md § Authorization test matrix`.

**A denial test must prove it reached the check it claims to test.** A `404` from a function that does not exist passes for an ownership check that works (`references/documents-and-tests.md § Rules that came from bugs`). Which harness runs each test is `test-harness`.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A member of one workspace, holding another workspace's ids, can neither see nor change its data, and a test in the gate proves it.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/model.md` | workspaces and the two shapes; the two credentials; deterministic enforcement; the three functions; the active organization; permissions and roles, and what screens show and say; entitlements; roles vs entitlements; invariants as constraints; unguessable ids and public reads | adding sign-in, a workspace, a role, a permission, a plan limit, or any route that touches data |
| `references/threat-model.md` | each threat class in depth, with the stack's mechanism: the body helper, the origin check, edge and per-actor limits, the origin seal, token storage, what the database may hold, the anonymous cookie, webhooks, jobs, secrets, calls to customer-supplied addresses, customer secrets at rest, agents | adding a public surface, a mutation, an API token, a webhook, a job, a secret or an agent; a security review |
| `references/documents-and-tests.md` | what the permissions, architecture and flows docs must hold about authorization; the required tests; the authorization rules that came from bugs; reading the matrix against intent | writing or checking those docs; writing an authorization test; reviewing a permission matrix |

## When something is learned

- **Keep general multi-tenant rules here with their receipts.** Include the date, what happened, the product named by kind.
- **Put vendor mechanisms in `clerk-production` or `supabase-production`.** This skill keeps the principle and a one-line pointer.
- **Keep product-specific facts in its own permissions and architecture docs.** Never put them here.
- **Give every testable rule a test.** Say what that test asserts.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/saas-authorization).
