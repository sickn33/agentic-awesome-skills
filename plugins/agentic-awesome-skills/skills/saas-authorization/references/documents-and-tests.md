# The documents and the tests that hold the model

The core docs (architecture, permissions, flows, variables, the coverage map) are defined by `shipping-artifacts`; that definition is the minimum. This file is what each must say about authorization on top of it, and the tests that prove what they say. The docs are written by the agent in the same change as the code they describe, and each opens with "Current implementation, `<date>`."

## Contents

- The permissions doc
- The architecture doc's authorization sections
- The flows doc
- Authorization test matrix
- Rules that came from bugs
- Reading the matrix against intent

## The permissions doc

Updated in the same change as any route, role or permission. Read it before adding one. Five sections:

1. **Identity and ownership.**
   - Member sessions prove workspace membership. The anonymous cookie, if there is one, proves only that the same visitor returned.
   - Public actions never use session claims as identity; member actions never read the anonymous cookie; no route carries both.
   - Name the module that verifies sessions behind the session seam, and the three functions by their real names.
   - State the workspace model: an organization, or one user.
   - In the organization shape, the active-organization claim says where the caller is acting, never who owns what they asked for. Resolve from the URL, then check membership, and answer a stranger with the same 404 as a missing id.
   - List any other first-party cookie (a theme preference, for instance) with its attributes and the statement that it carries no identifier and needs no consent.
   - List the identity provider's cookies too, **measured on a signed-out visit**: a provider loaded in the root layout sets them for every visitor, not only members (on Clerk: `clerk-production § What to record about Clerk`).
2. **Roles and capabilities.**
   - A table of **capability × actor**. The actors are every actor the product has: the anonymous public, each role, and **a member of *another* workspace**. The capabilities are every one it has or is going to have. Each cell names the permission string that gates it.
   - Below the table: the permission strings, and which roles map to each.
   - In the organization shape, roles are the identity provider's organization roles (on Clerk, `org:admin` and the product's second role). Every other role string holds nothing.
   - In the individual shape there is no role: the member column is the user the workspace is keyed to, and actions are still gated by permission strings.
   - The doc says that screens read permission-derived booleans, one per permission, and never role names. A control is shown under the same permission its action checks, and so is every sentence about that control.
3. **What is not implemented yet.** Grouped by the phase or capability that owns it, each entry saying what stands in for it today. A permission that exists in the model and is held by nobody belongs here, not in the matrix as though it worked.
4. **The database's access posture.** On this stack: RLS on with zero policies, the app's server the only holder of the secret key, tenant isolation by the three functions rather than RLS. Grants revoked, invoker views, a security-definer function only where the access model allows one, and the catalog suite that proves it. Any legacy grant the suite pins as debt is in the backlog with a revisit trigger. The mechanics: `supabase-production`.
5. **Roles versus entitlements.**
   - Which questions a role answers (who may act) and which a plan feature answers (how much).
   - Where entitlements are read from: on Clerk Billing, through the session's `has({ feature })`, failing towards the free tier; for an API token or an agent's grant, the subscription and the provider's plan list. Any plan mirror, what writes it, and the statement that no permission or quota reads it. Any allowance stamped on a resource for anonymous actions, the one exception (`model.md` § Entitlements come from billing): written from a member's verified session, never refreshed from a failed read, and a missing stamp passes the free allowance, never a null.
   - The statement that no feature is attached to a provider permission.
   - A product with no billing says so in one line.
   - Write it even when it feels obvious. It is the rule a later phase breaks by accident, and prose is all that guards it.

## The architecture doc's authorization sections

The architecture doc documents what exists. What is planned is a backlog row, never a paragraph there.

- **Stack and boundaries.** Say explicitly what is *not* there. On this stack: no browser database key, no identity token forwarded to the database, no realtime subscription. Also: all live reads dynamic and uncached, the CSP and how it is made, framing denied (and any surface that must be framed, with its own policy), and pages reached by an unguessable id `noindex`.
- **Routes.** A table of route · behaviour and access: the permission it checks, or *public*. Missing and not-owned return the same 404. The health route is public and returns a count, never a row.
- **Ownership and authorization.** It covers:
  - the workspace table;
  - the three functions by their real names;
  - what the anonymous bootstrap does and does not do: it sets a cookie, creates no row and completes no action;
  - RLS deny-all as a backstop, never as the isolation;
  - **which writes must go through SQL functions** because a direct update would bypass a counted quota.
- **Data and invariants.**
  - The ownership chain (`workspaces → …`), and a table of guarantee · enforcement (constraint, lock or function).
  - **The lock order wherever more than one lock exists**, because the second author will not guess it.
- **Plans and entitlements** (only when the product bills). This section names:
  - the plan module by path;
  - each feature slug the code gates on, with what it unlocks and the free value it falls back to;
  - the seam that reads the entitlement;
  - which SQL function receives each allowance as a parameter;
  - any stamped allowance: which write stamps it, and how long a lapsed plan's stamp outlives it.

  A product with no billing says so in one line.
- **Rate limits.**
  - The edge rules by surface, with their numbers.
  - The per-actor budgets: surface · key (member id, anonymous token) · budget · what a refusal returns (`429` + `Retry-After` on a route, a structured delay from a Server Action).
  - The note that an edge refusal never reaches the action and arrives in the browser as a rejected call, caught by one client wrapper.
- **Feeds.** What each public read returns and withholds: the allowlist DTO.
- **Known risks.** Each one tied to the file and line where it lives, with the mitigation or the backlog row.

## The flows doc

Only the journeys where permissions, data integrity, external side effects, money, privacy or operational safety are exercised. Each flow states:

- the actor and the precondition;
- the success outcome;
- the steps across UI → server → data → jobs → providers;
- **the authorization check at each protected step, with its deny case**;
- every trust-boundary crossing;
- **what an uncertain retry does.** A request id and a desired final state make a retry safe; a toggle does not.

**The first flows to document**, in the product's own nouns:

- sign-in and workspace creation;
- create and close the primary resource;
- the anonymous public's first action, if there is one: the cookie bootstrap, then the action that creates the row;
- the once-only action, and its refused second attempt;
- anything that changes what a public surface shows.

**Later, one section per capability as it lands:**

- moderation or approval;
- bans and invitations;
- billing and quota refusals;
- email, with its receipt and retry;
- jobs and tokens.

Every flow that reaches a provider names the variable pair it needs and what happens when the pair is empty.

## Authorization test matrix

**Prove cross-tenant refusal on every data route.** Run the other tests where the change uses or affects the corresponding mechanism.

| Test | Where to run it | What it proves |
|---|---|---|
| Cross-tenant | Every route that touches data | A member of A, holding B's ids, is refused, with the same 404 as a missing id. |
| The invariant | Once-only actions and quotas | The once-only action is refused the second time. For a quota, ten simultaneous creates against a limit of one leave exactly one winner. |
| The sanitizer | Rendering untrusted text | `<script>alert(1)</script>` renders as text. |
| Idempotency | Retried or replayed requests and jobs | Two runs act once. |
| Token scope | Routes and tools that accept tokens | A token does only what its scope and its workspace allow. |

The invariants and races run against the real database through the real SQL functions, with identity faked behind the same seam as the identity provider. A browser suite signed in as **each role from one organization**, beside the anonymous public, exercises the matrix with real members. Which harness makes what real, and the gate: `test-harness`. The identity provider's half of a real-session suite: `clerk-production § The authenticated mile`.

## Rules that came from bugs

- **A same-origin check must survive the headers a real browser sends, not a clean `Origin`.** Read `Sec-Fetch-Site` first and fall back to `Origin` only when no fetch metadata is sent. Test with the header set captured from the deployed app (`threat-model.md § The origin check`). (`2026-10-03`, every real sign-in through an embedded panel was refused on production, and the unit test's clean `Origin` is why it passed.)
- **A refusal through an RPC is asserted by HTTP status, error code and message together.**
  - PostgREST answers a call that matches no function signature with `PGRST202` and a 404, before Postgres checks any privilege.
  - So a test that expects only a 404 for a missing or foreign target passes against a schema without the function.
  - Likewise, a denial probe sent with the wrong argument names proves nothing about grants.
  - Call with the real argument names and assert all three.
  - (`2026-09-16`, written into a product's deny-all proof so a missing function could not pass for an ownership check that worked.)
- **A gateway rejection is not proof of database denial.** A missing key skips loudly; a configured key rejected with HTTP 401 fails. Admit the key before asserting the database's permission-denied code (`42501`). (`2026-09-16`, a stale key let the RLS suite pass without reaching Postgres.) The mechanics: `supabase-production`.
- **A missing quota is an error, never an entitlement** (`model.md § Invariants`). A test that passes no quota must be refused, not granted a default. (`2026-09-16`.)
- **Don't assert a control that exists only in some states with a conditional.** Move the coverage to a harness that has the state. A conditional assertion passes exactly when the control is absent.

## Reading the matrix against intent

The permission matrix is the base for every future test and every automated code review. Without it, an agent cannot tell a bug from a feature. Once it exists, the owner reads it as the person who decided what the product is, asking two questions per row:

1. *Is this what I wanted?*
2. *Does the code actually do this, or does the document only say so?*

The "not implemented yet" section is where the honest answers accumulate. If a row is wrong, the fix is a sentence ("a moderator should not be able to X"), and the agent changes the code and the document together. Read it again after every phase that adds a role or a capability.

Checking the code against the matrix mechanically is `intended-vs-implemented`.
