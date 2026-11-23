# Clerk gotchas

Read these before touching Clerk. Each one failed silently, or looked like a different problem, the first time. Each is dated, because Clerk changes without notice. When one stops being true, correct the line rather than adding a new one beside it.

## Contents

- A Clerk *task* runs before the app does
- Test mode is a dashboard toggle, and the whole authenticated suite hangs off it
- A development instance occasionally refuses a Server Action, silently
- Clerk's visible wording is not in your tree
- Below its breakpoint the organization profile hides its navigation instead of unmounting it
- Clerk v7 deleted `<SignedIn>` and `<SignedOut>`
- `<ClerkProvider dynamic>` reads the session into every page it wraps
- The server's sign-in redirect does not read the provider's `signInUrl`
- The middleware can make a page wait that asks for nothing
- Moving members off `/` removes the bounce nobody wrote down
- The secret key fits in the publishable variable
- A surface that skips `ClerkProvider` cannot link into one that needs it, in the same tab
- Clerk's menus open behind a modal `<dialog>`
- A design token named like one of Clerk's variables loops
- The plan's tab must match the workspace model
- A dashboard feature's slug is derived from its display name; a features-only patch moves features to Free
- A subscription read carries only a plan's visible features
- Personal-data webhooks, and Clerk's own deletion paths
- Production keys work only on the domains the instance is configured for
- Sign-in can be down while every page answers 200
- The production instance's DNS and legal consent

## A Clerk *task* runs before the app does

With `force_organization_selection` on, a new member meets Clerk's `choose-organization` screen first. Until it is finished, the session is **pending**, which `auth()` treats as signed out by default, so a protected route sends the member back to sign-in.

- Finishing the task is an onboarding step in front of the app.
- A headless sign-in needs an account already past it (`authenticated-mile.md`).
- Read the instance's settings rather than assuming a feature is off because the app does not use it.

(`2026-08-31`, the authenticated journey stalled behind the task.)

## Test mode is a dashboard toggle, and the whole authenticated suite hangs off it

`+clerk_test` addresses take `TEST_VERIFICATION_CODE` only while the instance has Test mode **on**. With it off, Clerk mails a real code instead, and every sign-in stalls at `/sign-in/factor-one` with "Incorrect code" (`form_code_incorrect` from `attempt_first_factor`). Nothing hints that a *setting* is the cause.

- The user is fine (verified, unlocked), and the keys are fine.
- `clerkSetup()` still returns a testing token. That token is bot protection, not Test mode, so forcing it onto the requests changes nothing.
- **Rule this in first** when the authenticated suite goes red at sign-in while the public suite stays green.

(`2026-09-03`, running the app after a key rotation.)

## A development instance occasionally refuses a Server Action, silently

One authenticated mutation `POST` came back `200` with `x-clerk-auth-status: signed-out` and `x-clerk-auth-reason: dev-browser-missing`, three seconds after sign-in.

- It carried `__clerk_db_jwt` and `__session` cookies byte-identical to the requests Clerk accepted 200 ms before and 140 ms after it.
- `@clerk/backend` reaches that branch only when the dev-browser cookie is *absent*. So the inputs and the verdict disagree, and nothing in `proxy.ts` (a bare `clerkMiddleware` with no route matching) is party to it.
- **Rule the harness out first:** an action before the identity provider's client script loads also answers signed out; wait after **every navigation** to prevent that cause (`test-harness`, `references/rules-from-bugs.md`). It does not explain the refusal above, three seconds after sign-in with byte-identical cookies. (`2026-11-07`, a live Q&A product: its backlog recorded such refusals in three of six gates, mechanism unknown, while its harness waited only for the URL.)

**What makes it expensive is the aftermath, not the refusal.**

1. `auth()` reports signed out, and the action's own `redirect("/sign-in")` runs.
2. `<SignIn/>` bounces the page straight back, because the browser *is* signed in.
3. The form clears exactly as it does on success.

The write never happened, the screen says nothing, the server log says nothing, and the suite fails much later, on the missing row.

**Rule it in whenever an authenticated action appears to have done nothing.** Have the authenticated harness record any signed-out Server Action response and throw it in `afterEach`. That names the cause but does not prevent it.

(`2026-09-17`, one gate run; the same test passed in the runs before and after it.)

## Clerk's visible wording is not in your tree

Clerk's English labels load from its CDN at runtime, and `node_modules` holds only localization keys. So the wording is not part of your contract.

- A vendor release can reword a button. Every `getByText` naming it then fails against a working product, with nothing in `git log` or `npm ls` to explain it.
- Locate Clerk's controls by their element-key class (`.cl-<elementKey>`), the same keys `appearance` targets.

(`2026-09-20`, *Manage organization* became *Manage*, and six authenticated specs timed out at once.)

## Below its breakpoint the organization profile hides its navigation instead of unmounting it

The section buttons stay in the DOM, hidden behind a menu button (`cl-navbarMobileMenuButton`); a lookup by name resolves and then waits for visibility until the timeout. Opening the menu renders a second copy of every button: open it first and scope the lookup to visible elements. (A live Q&A product, two gate runs, observed `2026-09-20`; the Clerk version was not recorded.)

## Clerk v7 deleted `<SignedIn>` and `<SignedOut>`

They throw *"not available in @clerk/nextjs Core 3"* at render, and a page built from them 500s with only a digest in the browser.

- **Branch on the server instead:** `auth()` (or the product's `currentCaller()`) and a redirect. The decision belongs where the data is, on a member route, never on `/`.
- `<Show>` in a public page brings the session wait back (`sessions-and-front-door.md`).
- `<UserButton />`, `<OrganizationSwitcher />` and `<PricingTable />` are all still there.

Clerk's own skills still describe the deleted pair, for Core 2 projects.

(`2026-09-03`, building organizations and plans.)

## `<ClerkProvider dynamic>` reads the session into every page it wraps

It is the documented way to make auth state available during server rendering, and Clerk's setup skill shows it. On the root layout it puts a session lookup before a signed-in visitor's first byte; without a session cookie `auth()` is local, so a signed-out visitor gains nothing measurable from removing it (measured `2026-11-07`, `sessions-and-front-door.md`). **The provider takes the CSP `nonce` and nothing else.**

## The server's sign-in redirect does not read the provider's `signInUrl`

`auth().redirectToSignIn()` and `auth.protect()` take the sign-in address from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`. Without it, they send a development instance to Clerk's Account Portal, on a different domain from the app's own `/sign-in`. Set the variable, or redirect to `/sign-in?redirect_url=…` yourself.

## The middleware can make a page wait that asks for nothing

`clerkMiddleware` still runs on `/` to write the CSP. A browser whose short-lived session token has expired gets a token refresh or a handshake redirect before any page renders, even on a page that reads no session. Only a page outside the middleware avoids it, and that page loses the nonce policy (`csp-and-variables.md § The CSP header`).

## Moving members off `/` removes the bounce nobody wrote down

Picture a product whose `/` sent signed-in members to their screen, and whose sign-in landed on `/`. It has links, emails and Clerk settings that assume that bounce.

When the member home moves to its own route, update with it:

- `signInFallbackRedirectUrl`;
- `signUpFallbackRedirectUrl`;
- every `redirect_url`.

Otherwise a member signs in and lands on the marketing page.

## The secret key fits in the publishable variable

Nothing in Clerk or Next refuses it.

- An `sk_…` in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into every client chunk at build and served by `next dev`.
- A check on the first request is too late, because static chunks are served without it.
- The env schema run from `next.config.ts` refuses it at build.
- If a build or a dev server ever ran with the secret in the public variable, rotate it.

The full entry, and how to derive a development publishable key, is `csp-and-variables.md § Variables`. (`2026-10-10`.)

## A surface that skips `ClerkProvider` cannot link into one that needs it, in the same tab

Leaving Clerk out of the layout for a heavy public surface is a real saving on phones: the proxy marks the path, and the root layout skips the provider there. But the root layout does not re-render on a client-side navigation. So a same-tab `<Link>` from that surface to anything that needs Clerk (sign-in, a pricing table, the console) arrives with the provider-less layout and fails, and nothing goes red.

- Make every such link a full navigation or a new tab.
- Pin it with a unit test that fails on any same-tab link leaving the surface.
- Never put a Clerk component on a screen there.

(`2026-09-25`, a live Q&A product took about 238 KB of script off its audience pages this way. The broken links were found by the independent review round, not by a failing test.)

## Clerk's menus open behind a modal `<dialog>`

Clerk portals its menus (the organization switcher's, the user button's) to `<body>`. Inside a dialog opened with `showModal()`, which sits in the top layer and makes the rest of the page inert, those menus open behind it: unseen and untouchable, with nothing in the console. Wrap the dialog's contents in `<UNSAFE_PortalProvider getContainer={() => dialogRef.current}>` so they portal into it, and let the dialog scroll an inner box so a menu wider than it is not clipped. (`2026-10-24`, a monitoring product's owner on a phone: the switcher in the mobile drawer never appeared.)

## A design token named like one of Clerk's variables loops

Clerk's components define their own CSS custom properties. Pass `appearance.variables.colorPrimary: "var(--accent)"` while Clerk also defines `--accent`, and the value refers to itself: the primary button turned transparent. Alias the kit's token through a name of the product's own (`--clerk-primary: var(--accent)`) and pass that. (`2026-10-22`.)

## The plan's tab must match the workspace model

Plans live in separate *User* and *Organization* tabs, slugs are scoped per tab, and a plan cannot move between tabs after it is created. `has({ feature })` evaluates the **active** entity.

The quietest failure: plans in the user tab, while forced organization selection keeps an organization always active. The paid tier is then unreachable for everyone, with nothing in any log. Read `for_payer_type` off `GET /billing/plans`.

The full entry: `organizations-and-billing.md § Billing › Gotchas`. (`2026-09-03`.)

## A dashboard feature's slug is derived from its display name; a features-only patch moves features to Free

In the dashboard, the slug is generated from the display name when the feature is created, so a feature named for its sales line gets a slug no code reads, and every paying account drops to Free in silence. Renaming it later keeps the slug; only editing the slug itself changes it (owner, `2026-11-07`). In the billing file the Clerk CLI applies, the key is the slug and the name is only a label, so keep plans in the file. A patch carrying only the `features` block re-attached every feature no plan listed to Free: always patch with the `plans` block.

- Pin the gated slugs as literals in a test, and read the instance back against the file.
- Gate only on slugs chosen for that purpose, never on display lines.
- Fail towards the free tier.

The full entry: `organizations-and-billing.md § Billing`. (`2026-09-03`, the dashboard; `2026-10-23`, the patch.)

## A subscription read carries only a plan's visible features

With the gated features hidden from the pricing table, `getOrganizationBillingSubscription` showed a paid workspace none of them, so every API-token call read as Free while the browser showed the paid plan. A caller with no session takes its slugs from the organization plan list by plan id, and keeps a canceled item until its `periodEnd`. (`2026-10-23`, a monitoring product's test-card drill; `organizations-and-billing.md § In code`.)

## Personal-data webhooks, and Clerk's own deletion paths

When the personal-data trigger fires (before the first paying customer, or the first deletion request), Clerk webhooks `user.deleted` and `organization.deleted` delete or anonymize what the workspace owns. Until then, `CLERK_WEBHOOK_SECRET` stays empty and no webhook route exists, **and Clerk's own deletion paths are off**: an admin deleting the organization, a user deleting their own account. Either would cut members off while their workspace's rows stay stored and its public pages stay up (`organizations-and-billing.md § Webhooks and personal data`).

## Production keys work only on the domains the instance is configured for

A production instance's keys refuse sign-in on a host the instance isn't configured for. A production site that also answers on the host's default subdomain (`*.netlify.app`) serves its pages there, but nobody can sign in. When production sign-in fails, check in this order: the host is one of the domains the instance is configured for (its domain list in the Clerk dashboard); Clerk's DNS records still verify; the social-login credentials have not changed. (`2026-10-24`, a monitoring product's cutover to production keys.)

## Sign-in can be down while every page answers 200

The production instance signs in through records on your own domain (`clerk.`, `accounts.`, `clkmail.` and two `clk*._domainkey.` CNAMEs). When they stop resolving, or are proxied in a DNS move, sign-in, sign-up and every OAuth grant fail, while `/health` and every page still answer `200`. Keep them DNS-only, and give the external monitor a check on the sign-in host as well as `/health`. (`2026-10-23`, a live Q&A product's production outage: its Clerk records stopped resolving behind pages that all answered 200.)

## The production instance's DNS and legal consent

The production instance needs its email DNS records. Turn on *Require express consent to legal documents* at sign-up. Both are dashboard settings a person confirms and records (`csp-and-variables.md § The production instance`).
