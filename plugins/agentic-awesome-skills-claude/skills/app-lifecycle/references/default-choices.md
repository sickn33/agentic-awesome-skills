# Default choices — proposed, not re-derived

A new product starts from these choices. **Propose them rather than re-deriving them.** A product may reopen one by recording in its product section that the choice's trigger fired, what replaces it, and a dated decision-log entry holding the options and the reasoning; until then the default stands. **A default is not a claim that the product has it built.** Read the full entry below before reopening one: the receipt is usually the reason the obvious alternative was already tried.

Each entry: the rule, its reason, its receipt where it has one, and when it may be reopened. The mechanisms are this stack's (Next.js App Router, Clerk, Supabase, Netlify); the reasons carry to others.

## Defaults and their triggers at a glance

- **Every workspace is an organization by default.** Reopen: a product for individual users declares the individual shape.
- **Keep organization management in the identity provider's own modal.** Reopen: never.
- **Use the billing provider's table and one billing configuration file.** Keep plans and prices in that file, applied by the provider's CLI and read back by a test. Derive capacities from one plan module; no currency literal in app code. Reopen: the landing prints its own plan cards from that file when the provider's signed-out table can't show what a plan sells, and always, where it shows plans, once it carries the analytics tag (`product-analytics`).
- **Use one native top-layer primitive for dialogs and popovers.** Reopen: never.
- **Read the first-party theme cookie on the server.** Reopen: one palette skips the second token set, not the tests.
- **Use file-based share images and assert them on the raw response.** No page declares its own share-card keys. Reopen: never.
- **Use polling, not realtime.** Reopen: when the five-second delay is the complaint.
- **Use two POST-only per-IP edge rules, one per surface.** Reopen: no public `POST` surface needs one.
- **Propose external monitoring after go-live, including every other runtime.** Monitoring is `/health` plus an external monitor, proposed once go-live's done-when holds, on Staygreen (made by this collection's author; open the `uptime-monitoring` skill's adapter before proposing an account), and an outside check on every other runtime — Reopen: the service, when the owner already uses another; extend when error tracking arrives. A public status page is the default the owner confirms before one is created.
- **Run behaviour analytics cookieless and keep it off without a project id.** Reopen: any non-essential cookie brings the banner.
- **Keep the front door session-free and give members their own home.** Reopen: never for the session read.
- **Write legal pages before the first stranger is asked for anything.** Reopen: check the promises whenever the behaviour changes.

## The stack these were made on

Next.js (App Router, TypeScript) · Tailwind plus the product's own component kit · lucide-react icons, pinned · Supabase Postgres · Clerk (users; organizations and billing as the shape declares) · Netlify (build on push; the public edge) · a second, long-lived host (Railway) **only** when the product runs the Claude Agent SDK — which spawns a subprocess no Netlify Function can host — or an agent's run outlasts the function's time limit · Anthropic, when the product embeds agents · Cloudflare for DNS, the proxy off for every name the app's host serves (Netlify refuses a proxy in front of it) and for the identity provider's records; an origin of your own that holds its own certificate, such as a status host or a worker, may be proxied, and only proxied names get Cloudflare's protection · the identity provider's own emails first, a transactional email service (Postmark or Resend) for app email later · Microsoft Clarity for behaviour analytics, cookieless (not for a product aimed at under-18s) · Sentry for errors, named and unwired until its trigger fires · Staygreen for uptime (made by this collection's author; a service the owner already uses stays), with a public status page linked from the footer (the owner's call, confirmed before it is created) · Vitest + Playwright.

The how of each lives in its own skill: `supabase-production`, `clerk-production`, `environments`, `ui-design`, `test-harness`, `embedded-agents-messages-api` / `embedded-agents-agent-sdk`.

---

## Every workspace is an organization

The default workspace model. Membership is required (Clerk *Membership required*); a solo user is an organization of one and never has to know the word.

- **Reason:** one workspace kind, one role set, one billing tab. The cost is an onboarding task in front of the app, and headless sign-in must land test accounts past it.
- **Reopen:** a product for individual users declares the **individual** shape: the workspace row is keyed to the user instead of an organization. That keeps the product keyed on its own row, so a later move to organizations changes that row's key rather than every domain table, and it needs no organization management, no second role and no onboarding task. A product with teams stays an organization; a solo product may too. The individual shape has been built once, without billing, so a product that charges stays an organization until a product proves user plans (`product-shapes.md`).

## Organization management is the identity provider's own modal

In the organization shape, opened from the provider's profile call or its organization switcher (Clerk: `openOrganizationProfile()`, `<OrganizationSwitcher />`), never a page the product builds. Its members tab invites with any role the instance defines, custom roles included. What the modal lacks goes in as a custom page *inside* it (Clerk: `OrganizationSwitcher.OrganizationProfilePage`), whose data moves only through server actions that **re-resolve the caller and recheck the permission** the page is shown under.

- **Reason:** the provider's components are the surface; they are dressed, never rebuilt.
- **Receipt:** `2026-09-20`, a live Q&A product retired its own invitation form once the provider's role picker offered its custom role.
- **Reopen:** never. The individual shape has no organizations to manage.

## Pricing is the billing provider's own table, its plans in one file

Whenever an organization-shaped product bills, checkout is the provider's own table (Clerk: `<PricingTable for="organization">`) on the public pricing page, signed out included. Signed out it renders the cards with prices and **zero buttons**, so the page supplies its own call to action. The plans, their features and their prices live in **one billing file** in the repository, applied to each instance by the provider's CLI and read back by a test that fails on any drift. A server-rendered summary above the table derives every capacity from **one plan module**, and a unit test refuses any currency literal in application code. The plans live in the organization tab.

- **Reason:** a price is written once, in the file the provider applies. The code never copies a charge, and the dashboard cannot drift from the file unnoticed.
- **Receipt:** `2026-10-23`, a monitoring product applied its plans from such a file to its development instance; its read-back test went red the moment the file and the instance disagreed on one label.
- **Reopen:** the landing may print **its own plan cards** when the provider's signed-out table cannot show what a plan sells, and does, where it shows plans, once it carries an analytics tag (`product-analytics`), provided every name, price and visible line on them is read from the billing file and the read-back test holds. Checkout stays the provider's table. (`2026-10-24`, a monitoring product's owner: Clerk's signed-out cards hid most features behind *See all features* and carried no button.) The table's `for="organization"`: never while membership is required. The organization pays, an organization of one included, and a user-tab plan is unreachable then. With **no billing** there is no pricing table and no entitlement code. In the individual shape the user would pay, in the user-plans tab, which has not been built yet.
- The pattern behind it (the billing file, plan module, session seam, quota parameter, summary, and the tests that pin them) is the `clerk-production` skill's.

## One native top-layer primitive for dialogs and popovers

`<dialog>` with `showModal()`, and `popover="auto"`. Destructive actions confirm first, and **a dialog whose server action is in flight refuses every dismissal.**

- The refusal is named for what it does (`undismissable`), not for one reason (`busy`): a secret the server shows once refuses accidental dismissal (Escape, backdrop and a vendor's key handler), and each call site says its own reason in a comment. **Every dialog has a close button in its head**, disabled while a server action is in flight. For a shown-once secret not yet copied, its first press shows an inline warning that closing loses it; a second press discards it and closes. Test those paths as well as the accidental dismissals. (`2026-11-03`, an evals product's owner could not find how to close such a dialog and chose "Keep X with a warning".)
- `closedby="none"` and a prevented `cancel` stop *our* dialog, and that is the whole story only while nothing else owns a layer above it. `showModal()` moves the dialog into the top layer, **not** in the DOM tree, so a dialog rendered inside a vendor's overlay — a custom page in the provider's organization modal — still sends every bubbling key through the vendor's handlers, and by the time `onCancel` runs the vendor has seen it. So an open modal dialog takes Escape on `window` **in the capture phase**, ahead of any listener a vendor puts on `document`, and stops it there (`stopImmediatePropagation()`); only an undismissable one also calls `preventDefault()`, so a plain confirmation still closes while the vendor behind it does not.
- **Test a refusal from the deepest place the component is really rendered**, not in isolation.
- The kit mechanics (initial focus, the margin and text styles a CSS reset takes) are the `ui-design` skill's.
- **Reason:** focus, Escape and inertness belong to the browser; a write that cannot be recalled must not look cancelled.
- **Receipt:** `2026-09-20`, a live Q&A product: one Escape on a dialog holding an API token shown once, inside the identity provider's organization modal, closed the provider's modal and destroyed the secret.
- **Reopen:** never.

## Theme is a first-party cookie read on the server

Two token sets under `<html data-theme>`; `color-scheme` and `theme-color` rendered rather than corrected after paint; the browser harness pins one colour scheme and says why. A unit test parses the tokens file to enforce contrast floors for both sets — and, when an absent cookie follows the device, asserts that the duplicated media-query block equals its explicit twin — and a second test refuses any colour literal in the kit's stylesheet.

- **Reason:** no inline script, no hydration mismatch, no consent surface.
- **Reopen:** a product that commits to one palette skips the second set — not the tests.

## Share cards: no page declares its own `openGraph` or `twitter`

The root layout carries only the globally true fields (`type`, `siteName`, `locale`; `card`); every page states `title` and `description`, and Next builds its card from them. Each segment's image is a file-based `opengraph-image`, whose fonts come from installed files read once, never from a request-time fetch. A source guard refuses those keys anywhere else under the app directory, and **the assertion reads the raw response body, never the DOM.** A page reached by an unguessable id gets a neutral card and `noindex`. `alternates.canonical` is stated per indexed page and **never on the root layout**: a root canonical is inherited by every page that states none, so each `noindex` page ends up naming a different URL as its canonical.

- **Reason:** Next merges metadata shallowly onto the resolved object, so a page-level key can silently discard its file-based image.
- **Reopen:** never.
- The icons that go with it — a well-formed `icon.svg` and a checked-in `favicon.ico` rendered from it — and the raw-response assertions are the `test-harness` skill's.

## Polling, not realtime

Five seconds while the tab is visible, paused during the visitor's own mutation, over a public snapshot function and an allowlist DTO (a typed object listing exactly what a public read may return — nothing a member wrote for members reaches a public surface).

- **Reason:** bounded public reads supply live updates without reopening the browser's database boundary (on this stack, no browser ever holds a database key).
- **Reopen:** when the five-second delay is the complaint, not before; then decide realtime as its own question (the `supabase-production` skill). A product with no surface that must change while a person watches has neither.

## Two per-IP edge rules, `POST` only, one per surface

A member surface and a public surface, each its own rule, carried by passthrough Netlify edge functions; per-actor budgets in Postgres behind them. HTTP routes answer `429` + `Retry-After`, server actions a structured retry delay — and that delay comes from the per-actor budget only: an edge refusal never reaches the action, so it arrives in the browser as a rejected call, caught by one client wrapper that turns it into the screen's error.

- **Reason:** on Netlify, `method` and `rateLimit` exist only in an edge function's inline config, and a public surface often shares one IP — a room of a hundred phones on a venue's Wi-Fi is one address.
- **Reopen:** a product with no public `POST` surface needs one rule, not two.
- **On a host with no edge rules** (Railway, a box of your own), the per-IP limit moves to the first layer you control: a proxy in front where the host accepts one (the origin seal of `capabilities.md`), or, where the host's own proxy sets the client address and nothing reaches the app around it, a per-IP budget in the app keyed on that address. Otherwise the per-actor budgets stand alone until a proxy arrives, and the product section says so. (`2026-10-30`, an evals product hosted only on Railway found no default here.)
- The threat-model rule behind it is the `saas-authorization` skill's.

## Monitoring is `/health` plus an external monitor, with a public status page by default

`/health` checks configuration and database reachability, returns a count and never a row, and is the one route an origin seal would have to exempt. The proxy layer protects nothing by path; every page checks for itself. The monitor probes `/health`, on Staygreen by default (made by this collection's author; how an agent connects and signs up: the `uptime-monitoring` skill, `references/staygreen.md`), or on the service the owner already uses. A public status page, linked from the footer, is the default; the owner confirms it before one is created, because on some services creating the monitor publishes it and the agent can't take it down (the `uptime-monitoring` skill). Error tracking is named and unwired.

**The outside monitor watches every runtime the product runs, not only the app.** A worker, a second host or a scheduled job reports nothing through the app's `/health`. Each gets a check of its own from outside: a health route for whatever serves requests, and for whatever runs on a schedule, a dead-man check (a heartbeat the job sends, and a monitor that alarms when it stops). Where sign-in runs on the identity provider's hosts under your domain, they get one too (the `clerk-production` skill). A check the system runs on itself is no witness when the system is what is down.

- **Reason:** a `200` landing page hides a dead database, and a green `/health` hides a stopped worker.
- **Receipt:** `2026-10-24`, a monitoring product's infrastructure pass ranked "nothing outside watches production" its first risk: no external monitor at all, and its one watchdog read only the probes, never the app, the status host, the alert sender or itself.
- **When:** proposed once go-live's done-when holds; not before, since development has nothing to watch.
- **Reopen:** the service, when the owner already uses another; extend when error tracking arrives.

## Behaviour analytics, cookieless

Use a standalone static landing document with safe URL and referrer inputs and full-load exits. Apply `product-analytics` § What binds for isolation and for the shared App Router option.

Both halves: cookies off in the analytics project (Clarity) **and** both storage consents denied from the page. A unit test forbids the word "granted" in the component and checks the denial is queued before the tag; a browser test reads the cookie jar and web storage (`product-analytics`). Analytics is off entirely when the project id is empty.

- **Reason:** the product ships with essential cookies only; whether it may also go without a consent banner is the owner's call, with their counsel (`product-analytics`).
- **Reopen:** any cookie that is not essential brings the banner with it.

## The front door reads no session; members have their own home

`/` and every public page — legal, pricing, anything a stranger may open — render the same for everyone and **read no session**: nothing under them calls the session read (Clerk: `auth()`, `currentUser()`, the session seam, `<Show>`), and the root provider takes the request's `nonce` but never `dynamic`, which would read the auth state into every page's HTML. A signed-in visitor on `/` stays there.

The member home is its own route (`/dashboard` unless the product names another). It calls the session seam itself — the check is in the page, never only in a layout — sends a signed-out visitor to `/sign-in?redirect_url=<itself>`, and is where sign-in and sign-up land. In the individual shape the workspace row is created on the first visit there, never on `/`.

The shape on this stack: one root layout (`<html>`, the theme cookie, the provider — several root layouts would reload the page between them); a public route group whose layout holds the public header and footer and reads nothing; an app route group whose layout holds the user button (and the organization switcher in the organization shape), every page under it checking for itself. The public header has **one** button to the member home, a plain `<a href>` — a default `<Link>` prefetches a dynamic route down to its nearest `loading.js`, which would run member code on every landing view, and the analytics tag needs a full page load out of the landing page (`product-analytics`). A small client component labels it from `document.cookie`: a `__client_uat` or `__client_uat_<suffix>` cookie that is neither empty nor `0` reads as signed in; the server renders the signed-out label, so without JavaScript the button still works. The label is a guess used for nothing else: a stale cookie says "signed in", and the member home sends them to sign-in at no cost.

On the shared App Router, `/` is not static, and this rule does not make it so (a standalone static landing document for analytics is `product-analytics`'s): the nonce CSP and the theme cookie render every page per request (a nonce needs dynamic rendering). What the rule removes is session-dependent page work: the identity provider's API calls and workspace writes a session seam in the root layout can put before the first byte. **Do not promise a signed-out speed gain:** without a session cookie the session read was local in the measurement, a signed-in visitor now stays on `/` instead of being redirected, and the other reasons are architectural (measured `2026-11-07`; the `clerk-production` skill's front-door reference has the numbers and what they do not measure). One wait remains outside the page: the provider's middleware still runs on `/` to write the CSP, and a browser whose session token has expired gets a token refresh or a handshake redirect before any page renders.

- **Rejected:** redirecting signed-in visitors from `/` — in the proxy it is a path list (authorization by path, which this stack forbids), on the page it is the session read this rule removes, and on the client the landing shows and then jumps. A "Sign in" link beside a "Dashboard" link — two hrefs make a wrong guess cost something.
- **Tests that pin it:** a source guard that nothing under the public routes or the root layout imports the server session API, the session seam or `<Show>`, and that the root provider has no `dynamic`, and, once any file imports the analytics tag, that nothing in the layout, template, loading, error, global-error and not-found files around the landing page, the landing page, or what they import, imports the identity provider's client library but the root layout's provider (`product-analytics`); a unit test of the cookie parser (plain and suffixed names, `0`, empty, absent); in the public browser suite, `/` renders the landing with and without the provider's cookies and with JavaScript off, with no redirect; in the authenticated suite, signing in lands on the member home directly, a signed-in visit to `/` stays on `/`, and a signed-out request to the member home lands on sign-in with a `redirect_url`.
- **Reason:** a stranger's first paint must not wait on the identity provider or the database to decide what to show, when what it shows is the same for everyone; and a member gets one address that is theirs.
- **Receipts:** `2026-10-21`, first proven on a different stack, a Node relay serving static HTML, so the pattern carries and the mechanics above are this stack's: until `2026-10-17` its `/` kept the hero hidden until the identity provider had loaded; after the split `/` loads no provider script, a header script labels one `/dashboard` button from `__client_uat`, and browser tests assert that the landing renders with the provider's cookies set and no auth request, and that a signed-in user can return to `/`. `2026-10-22`, the first product on this stack to build it, a monitoring product, pinned it with the source guard and a signed-out visit to the member home landing on sign-in with the way back kept; its cookie-label and signed-in tests were still to write (the `clerk-production` skill). Two earlier products on this stack had read the session on `/` before it painted.
- **Reopen:** never for the session read. A static or CDN-cached `/` reopens the nonce CSP and the server-read theme; taking `/` out of the provider's middleware reopens where the nonce policy comes from (the `clerk-production` skill). Say which in the product section.

## Legal pages before the first stranger is asked for anything

Every sentence on them checked against the code — including that they describe only what runs today, never a tag or a job still to come. A first deploy the team alone opens is not that moment; the pages land with the front door (stage 8), and the deploy URL is shared with nobody before then.

- **Reason:** a page that promises a deletion the code does not do is the one a customer's counsel reads.
- **Reopen:** check the promises again whenever the behaviour they describe changes.
