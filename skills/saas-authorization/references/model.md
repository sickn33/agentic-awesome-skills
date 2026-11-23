# The authorization model

Each section gives the principle first, then the mechanism on Next.js (App Router) + Supabase + Clerk. The Clerk and Supabase mechanics in depth are in `clerk-production` and `supabase-production`.

## Contents

- Workspaces, and the two shapes
- Two credentials, never mixed
- Deterministic code decides what is risky or hard to undo
- The three functions
- The active organization is not the owner
- Permissions, roles, and what a screen shows and says
- Entitlements come from billing
- Roles and entitlements never touch
- Invariants are database constraints
- Ids, 404s and what public surfaces may read
- Authorization lives with the data, not in a path list

## Workspaces, and the two shapes

**Everything belongs to a workspace, and the product declares what a workspace is** before the first migration. Every domain table hangs off a workspace or off something that does.

- **Organization shape (the default).** A workspace is one organization in the identity provider, and every workspace is one, a solo user's included: a solo user is an organization of one and never has to know the word. Roles live inside the organization.
  - **Reason:** one workspace kind, one role set, one billing tab.
  - **Cost:** an onboarding step in front of the app. On Clerk that is the `choose-organization` task, which leaves the session *pending* until finished. A headless sign-in must land test accounts past it (`clerk-production`).
  - A product with teams stays an organization. A solo product may too, as organizations of one.
- **Individual shape.** A workspace is one user. There are no organizations, no second role, no organization management and no onboarding task. Its permission matrix has one member actor.
- **Nothing references the identity provider's org id or user id except the `workspaces` table**, and, where the product records authorship, one member table. The product keys on its own row, never on a vendor's id.
  - **Reason:** a change of identity provider is then a migration of one table, or two.
  - **Authorship** (who wrote a note, who labelled a row) gets that member table: a row holding only the workspace, the provider's user id and the product's own member id, made on the member's first write, never read for authorization and never a copy of a name, an email or a role. Author columns reference that row. (`2026-10-31`, an evals product left authorship out of its first version because this rule gave it no recipe.)
  - It also leaves an individual-shape product a path to organizations: a later move changes that row's key, not every domain table.

**The individual shape on this stack.** It was proven by a product on this stack on `2026-10-11`, without billing.

- The workspace row is keyed to the Clerk user id.
- It is created on first sight by an idempotent `ensure_workspace` function. The function checks the id's `user_…` shape, runs `insert … on conflict do nothing`, then selects.
- It is called from the one session seam. The seam requires `auth()` and `currentUser()` to name the same user, and reads an email only when it is the verified primary one.
- An integration test proves exactly one row under concurrent first calls.
- The row is created on the first visit to the member home, never on `/`.

Billing in this shape (Clerk's User Plans tab) has not been built yet. A product of this shape declares billing *none* until a product writes and proves that recipe.

## Two credentials, never mixed

- **A member session proves a member of a workspace.** It is verified server-side on every request, never decoded and trusted. On Clerk: `auth()` behind one seam, which tests replace with a mock verifier (`clerk-production`).
- **An anonymous token proves "the same visitor as before", and nothing more.** It exists only when the product has an anonymous public: visitors who act without an account.
  - It is a cookie, issued on the visitor's first action: random and unguessable, one row per token, with the hash stored and never the plaintext.
  - **Inside another product's cross-site frame** (a meeting side panel, a chat app), a `Lax` cookie is not sent. Give the embedded surface its own cookie, `SameSite=None; Secure; Partitioned`, with its own name and path, and have the bootstrap confirm it came back in a second request that reads it: a browser that refuses third-party partitions drops it silently, making the visitor someone new on every request. The framed surface also needs its own framing policy, never a hole in the general one (`clerk-production`, `references/csp-and-variables.md`). (`2026-09-20`, a live Q&A product's first build embedded in two meeting vendors' side panels: designed in from the start, not found by an incident.)
  - Whether to also sign it with a server secret, so a forged cookie dies before it costs a database hit, is decided when building it.
  - A signing secret is a value you generate, not one anybody can look up, so generate it when you add it (`environments`). Rotating it makes every visitor a new visitor: their old rows are orphaned, not lost.
- **Member routes never trust the anonymous token. Public routes never read session claims. No route carries both.**
- **Any other first-party cookie**, such as a theme preference, is listed in the permissions doc with its attributes. The doc states that it carries no identifier and needs no consent.

## Deterministic code decides what is risky or hard to undo

A screen, a client, a prompt or a model may propose an action. Whenever the action crosses a trust boundary or can't be taken back, deterministic server code decides whether it happens. That covers authorization, money, sending, deleting and changing someone's records. The deciding code is a tool, a database constraint, a hook, or the orchestration logic that interprets what was proposed.

- **Enforcement scales with the risk.** A two-way door can rest on judgement, such as drafting an email the person reviews. A one-way door cannot, such as sending it.
- **The three functions and the database constraints below are this rule applied.** The rule is stated generally so that it also covers what neither names.
- **Embedded agents are the case it was written for.** The agent proposes; deterministic code decides.
  - A tool takes its identity from the session's caller, resolved by the three functions, never from an id the model supplies.
  - Whatever a tool must refuse, it refuses in code.
  - A conversation history the client sends is a claim too.
  - The mechanics: `embedded-agents-messages-api`, `embedded-agents-agent-sdk`.

## The three functions

**No route reads raw claims.** Every route and action reaches identity and ownership through three functions, named by their real names in the architecture doc:

- **`resolve<Thing>(publicId)`** → the thing and its owning workspace, from the URL. Public routes start here.
- **`requireVisitor(thingId, cookie)`** → the anonymous visitor row, after a valid token returns in a cookie. Only when the product has an anonymous public.
  - The bootstrap issues only the cookie. It never admits a visitor, never creates a row and never completes an action; the visitor's first real action creates the row.
  - **Issue that cookie from a route handler, never a Server Action.** Setting a cookie in a Server Action makes Next re-render the current page and its layouts (Next's own guide to mutating data), so a step meant to write one header costs a full render. (`2026-09-25`, a live Q&A product measured a bootstrap response still open after 20 s.)
- **`requireWorkspaceAccess(workspaceId, auth, permission)`** → throws unless the caller holds the permission in *that* workspace.
  - In the organization shape the caller holds it through an organization member's role that grants it.
  - In the individual shape the caller holds it by being the user the workspace is keyed to, who holds every permission the product defines.
  - **The permission is still checked in both shapes**, so a second actor, or a later move to organizations, has a gate to meet.

The order on every protected request is: resolve the thing from the URL, find its workspace, check the caller's permission in that workspace, then act.

## The active organization is not the owner

**The `org_id` claim is the caller's *active* organization, not the owner of what they are looking at.** It says where the caller is acting, never who owns the thing they asked for. Resolve the resource from the URL, find its workspace, then check membership. Answer a stranger with the same 404 as a missing id.

## Permissions, roles, and what a screen shows and says

- **Permissions are strings; roles map to them. Check permissions, not roles.**
  - In the organization shape, roles are the identity provider's organization roles. On Clerk that is `org:admin` and the product's second role, usually the default member role renamed, key and all. Every other role string holds nothing.
  - In the individual shape there is no role. The member is the user the workspace is keyed to, and actions are still gated by permission strings.
  - The map lives in one module, the permission module (`authz.ts`, say), and the identity provider's own permission system is not used for it (§ Roles and entitlements never touch).
- **Screens read permission-derived booleans, one per permission, never role names.**
- **A screen gates a control on the *same* permission the action behind it checks**, not on a neighbouring one that happens to be granted to the same roles today. Today's coincidence becomes tomorrow's hole the moment one role gains the neighbour without the other. (`2026-09-16`, a control was shown under one permission while its action checked another.)
- **What a screen *says* is gated too.** Suppose a console has worked out that two roles need different words. It owes that split to every state it renders, not only the state where the difference was noticed.
  - A control the caller cannot see is a gap. A sentence promising them the control is a lie they will act on.
  - **Assert it as the capability**, not state by state: no state offers this caller anything their permissions withhold. The defect is always in the state nobody enumerated.
  - (`2026-09-17`, two lifecycle states promised the second role actions reserved for the first.)
  - What a screen may claim in general is `ui-design`.
- **A permission that exists in the model and is held by nobody** belongs in the permissions doc's "not implemented yet" section, not in the matrix as though it worked.
- **Organization management is the identity provider's own UI**, never a page you build.
  - What it lacks goes in as a custom page inside it. That page's data moves only through server actions that re-resolve the caller and recheck the permission the page is shown under.
  - (`2026-09-20`, a live Q&A product retired its own invitation form once Clerk's role picker offered its custom role.)
  - On Clerk: `clerk-production § Organizations`.

## Entitlements come from billing

- **Entitlements are read on the server from the billing provider. No permission or quota decision reads them from your database (one exception below) or from a client claim.** On Clerk Billing that is the verified session's `has({ feature })`, mapped to numbers by one plan module (`clerk-production § Billing`).
- **A sessionless anonymous action consuming a member's plan** enforces an allowance **stamped on the resource it governs** when a member acts on it, read from that member's verified session at that moment. The stamp is a required parameter of the member's write, never refreshed from a failed read (keep the old stamp or refuse); a resource without a stamp passes the free allowance, never a null. The architecture doc says how long a lapsed plan's stamp outlives it, and tests pin the missing-stamp and failed-read paths. This exception does not cover API tokens, agent grants or a routing-only plan mirror below. (`2026-11-07`, a live Q&A product: read in its code, anonymous actions consumed a resource allowance stamped from a member's verified read.)
- **Gate on features, not plan names, and fail towards the free tier.** A slug that is missing, renamed or unknown grants nothing. A dashboard that has not caught up then costs a customer something, rather than giving the product away.
- **Name a feature for what the paid tier *adds*.** Free is the absence of every gated feature; that is what makes the mapping fail safely. A feature named for what the free tier has inverts it: the base limit would need a feature too, and its absence would mean nothing.
- **There is no subscription table and no payment webhook.** The product's own billing is the billing provider's (on this stack, Clerk Billing), never a payment provider wired up by hand. A plan mirror (below) is not a subscription table: it holds a plan name for routing, and nothing decides an allowance from it.
  - Calling a payment provider directly for something else, such as another business's billing the product supports, is a product-specific exception. It is declared in the product's shape.
- **A product with no billing has no entitlement code at all**: no pricing table, no pricing page, no plan copy.
- **A caller with no session** (an API token, an agent's grant) has no session `has()`. Only when the product has such callers:
  - read the owning workspace's subscription from the billing provider's backend API, and parse it strictly;
  - **take each subscribed plan's features from the provider's plan list, matched by plan id**, not from the copy embedded in the subscription. On Clerk that copy carried only the features shown on the pricing table, so with the gated features hidden every API-token call on a paid workspace read as free (`2026-10-23`, a monitoring product's test-card drill);
  - keep an item that is active, or cancelled with its period end still ahead: a cancel ends the paid period at its end, not on the day;
  - feed the slugs through the same mapping. A parse failure, an inactive subscription or any error is the free tier.
  - (`2026-10-06`, a live Q&A product's API-token entitlements; the mechanics: `clerk-production § Billing`.)
- **A background worker with no session that must know a workspace's plan** (to route work only a paid plan gets, say) reads a **plan mirror**: a column the app writes only from a verified read. It holds no billing-provider key.
  - The app writes it when a verified session's plan disagrees with the stored one. Never from a simulated plan (a development override), and never from a failed read: a request whose read failed still fails closed to the free tier, but that result is marked unread and is not stored.
  - **No permission or quota decision reads the mirror.** It routes work; the allowance a request gets still comes from the provider.
  - (`2026-10-24`, a monitoring product: its probes had no session, so they treated every monitor as free, and a location only the paid plan checks from would have checked nothing. A review then found that a failed read would have stored the free plan for a paying workspace.)
- **The server passes the allowance the session proved** (for an anonymous action, the resource's stamp: § Entitlements come from billing) to the database function that enforces it, as a required parameter (§ Invariants).

## Roles and entitlements never touch

They answer different questions:

- **A role says *who may act*.** It is authorization, and in the organization shape it lives in the workspace's organization.
- **A feature says *how much*.** It is billing, it belongs to whoever pays, and it is the same for every member of a workspace.

So a feature can never identify *which* member may do something, and a role can never carry a limit.

**Gating a capability on a feature means a lapsed card silently removes it, at the worst possible moment.** Take a live Q&A product where moderation was offered as a paid feature. A lapsed subscription would leave every question in a live room stuck *pending*, on stage, in front of an audience: billing reaching into authorization at the worst possible moment.

To sell team size, sell it where it fails safely. A seat limit on the organization plan is enforced by the identity provider at invite time and needs no code. **Sell scale, not permission.**

**The mechanism that makes this easy to do by accident:** with billing enabled, Clerk gates its own permissions by feature. Never attach a feature to a Clerk permission, and keep the product's permissions in its own module. (`2026-09-03`, building organizations, roles and plans for a live Q&A product; `clerk-production`.)

Write this down in the permissions doc even when it feels obvious. It is the rule a later phase breaks by accident, and prose is all that guards it.

## Invariants are database constraints

Application code checks are a race; the database is the one place a guarantee holds under concurrency.

- **A once-per-visitor action is a primary key.** An example is an upvote: the second attempt is refused by the key, not by an `if`.
- **A quota is checked inside the transaction that creates the thing.** The server passes the allowance as a required parameter to a SQL function. The function locks the owning workspace row `for update`, counts, and raises a named error at the limit (for example `room_limit_reached`). The screen explains the limit; the database enforces it.
- **A missing quota is an error, never an entitlement.** SQL's trailing-default rule may require a quota parameter to have a default. If it does, default it to null and reject null: the caller must supply the allowance the session proved, or the resource's stamp. For a resource with no stamp the server passes the free allowance itself, so a forgotten parameter is still refused. (`2026-09-16`, a defaulted quota parameter hid every caller that forgot to pass it.)
- **A limit of one can be a partial unique index; a limit of N cannot.** When a plan turns a constant into a number, the index becomes a counting check with the owning row locked. That is the same guarantee, still inside the transaction.
  - Say out loud in the architecture doc what that costs: a direct `update` to the table is no longer refused, so every write must go through the function.
  - (`2026-09-03`, building plan limits for a live Q&A product.)
- **State the lock order wherever more than one lock exists**, because the second author will not guess it.
- **Prove it under concurrency:** ten simultaneous creates against a limit of one leave exactly one winner.
- **Row-level security is a backstop, never the isolation.** On this stack RLS is on with zero policies and the server holds the only key, so tenant isolation is the three functions (`supabase-production`).

The product's own invariants are each a sentence a migration can be checked against: limits, ownership, lifecycle rules. They are written in one place in the product's instructions, and other documents point there.

## Ids, 404s and what public surfaces may read

- **Ids in URLs are unguessable.** A page reached by one is often protected by nothing else.
- **Not-found and not-owned return the same 404.** A different answer tells a stranger which ids exist.
- **Pages reached by an unguessable id are `noindex`**, carry a neutral share card, and are kept out of `robots.txt` and the sitemap. If a crawler indexed one, an unlisted resource would become a search result while it was still open. A resource's link preview must not offer another resource's identifier.
- **A public read returns an allowlist, never a row.** Public surfaces read through a snapshot function and a typed allowlist DTO. Nothing a member wrote for members can reach a public surface. Live updates on this stack are polling over that snapshot, not the database's realtime channel from the browser: that would reopen the browser's database boundary (`supabase-production`).
- **The health route returns a count, never a row.**

## Authorization lives with the data, not in a path list

- **Every protected page and every action checks for itself**, through the three functions.
  - Middleware attaches the session and protects nothing by path.
  - A check in a layout alone is not a check: the page checks.
  - On this stack Clerk v7 deprecates `createRouteMatcher`, and `proxy.ts` (Next 16's name for middleware) only attaches the session. (`2026-08-27`, building the first slice with sign-in and data.)
- **The front door reads no session.** `/` and every public page are the same for everyone. They never branch on who is signed in, and a signed-in visitor is never redirected away. The member home is its own route, which checks for itself.
  - **Reason:** what the front door shows is the same for everyone, so its first paint must not wait on the identity provider or the database.
  - The full rule, its tests and the stack's mechanics: `clerk-production § The front door and the member home`.
