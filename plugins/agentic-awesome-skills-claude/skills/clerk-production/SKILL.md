---
name: clerk-production
description: 'Setting up or changing Clerk sign-in, organizations, roles or billing on Next.js, or sign-in that does nothing or lands wrong: Clerk in production.'
risk: critical
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

# Clerk in production: the choices its own skills cannot make

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Setting up or changing Clerk sign-in, organizations, roles or billing on Next.js, or sign-in that does nothing or lands wrong: Clerk in production.


This skill covers Clerk from the first setup on its development instance through production.

**Decide the product's access model before following Clerk's API guidance.** Clerk's own agent skills know the API. They cannot decide:

- where a session is verified, and what may read it;
- what a workspace is;
- where billing ends and authorization begins;
- which dashboard settings silently change what your code is allowed to do.

Those decisions are here.

**Where Clerk's defaults or quickstarts contradict this skill, this skill wins.** These mechanics use Next.js App Router, Next 16 (`proxy.ts` middleware), Clerk Core 3 (`@clerk/nextjs` v7), Supabase and Netlify. Apply `saas-authorization` for the access model, which carries to any identity provider.

**Use the product's integration notes, permission module and member home.** Integration notes hold dated provider configuration: instances, settings, slugs and read-backs. The permission module maps roles to permission strings. The member home is the sign-in destination, `/dashboard` unless the product names another.

## Clerk's own skills: get them, prefer them for the API

- **Use Clerk's own skills for its API.** The set comes from the GitHub repository `clerk/skills`:
  - `clerk` (a router);
  - `clerk-setup`, `clerk-nextjs-patterns`, `clerk-custom-ui`, `clerk-orgs`, `clerk-billing`, `clerk-webhooks`, `clerk-testing`;
  - `clerk-backend-api` (browse and call the Backend API);
  - `clerk-cli`.
- **Install and vendor the skills instead of relying on API memory.** Run `npx skills add clerk/skills` with the open `skills` CLI. Vendor them into the product's skills folder so they load whenever Clerk is touched, and prefer them over training-era memory of the API.
- **Pin the skills and update them deliberately.** A `skills-lock.json` records each skill's source, its path and a content hash. `npx skills update` refreshes them on purpose.
- **Refuse vendor suggestions that contradict this skill.** These include:
  - `createRouteMatcher` path lists;
  - `<SignedIn>` and `<SignedOut>`, which Core 3 deleted;
  - `<ClerkProvider dynamic>`;
  - rebuilt sign-in screens;
  - `clerk.signIn()` in the browser suite;
  - Clerk permissions with features attached;
  - a hand-written CSP.

## The choices

1. **Verify, never decode, always behind one session seam.** Use `SessionVerifier`. Tests substitute a mock verifier when `CLERK_SECRET_KEY` is absent; keyless mode is for development only. → `references/sessions-and-front-door.md § Sessions`
2. **Store Clerk ids only.** Read names and emails from Clerk at render time. Only the `workspaces` table holds a Clerk org or user id, and, where the product records authorship, one member table beside it holds the user id too (`saas-authorization`).
3. **Authorization lives with the data, not in a path list.** Clerk v7 deprecates `createRouteMatcher`, and `proxy.ts` only attaches the session. Every protected page and every action checks for itself; a check in a layout alone is not a check.
4. **Clerk's own components are the sign-in surface.** Use `<SignIn />`, `<SignUp />`, `<UserButton />`. They are dressed through `appearance`, never rebuilt.
5. **Sign-in lands on the member home, never on `/`.**
   - `signInFallbackRedirectUrl` and `signUpFallbackRedirectUrl` name the member home, and `afterSignOutUrl` is `/`.
   - The member home sends a signed-out visitor to `/sign-in` with a `redirect_url` back to itself.
   - The root `<ClerkProvider>` takes `nonce`, never `dynamic`: the root layout reads it from the request's `content-security-policy` header, the `'nonce-…'` in `script-src` (`references/sessions-and-front-door.md`).
6. **The front door reads no session.** `/` and every public page never call `auth()`, the seam or `<Show>`, and a signed-in visitor is never redirected away. The header's one button is labelled from the `__client_uat` cookie. → `references/sessions-and-front-door.md § The front door and the member home`
7. **In the organization shape, *Membership required* goes on at setup, before the first migration.** The authenticated harness then creates each test account's organization. In the individual shape, organizations stay off. → `references/organizations-and-billing.md § Organizations`
8. **Organization management is Clerk's own modal.** Never build a separate page. What it lacks goes in as a custom page inside it, whose Server Actions re-resolve the caller and recheck the permission.
9. **With Clerk Billing, plans and features live in a file the Clerk CLI applies, and a test reads each instance back against it.** The gated features are hidden from the pricing table and ride the session token, where `has()` reads them; one plan module maps them to capacities. A caller with no session that the server handles (an API token, a job) reads the subscription for the plan id and takes that plan's slugs from the plan list, never from the subscription's embedded `plan.features`; an anonymous visitor's action uses the allowance stamped on its resource (`saas-authorization`). Checkout is `<PricingTable for="organization">`, and no price is typed into application code. → `references/organizations-and-billing.md § Billing`
10. **Never attach a feature to a Clerk permission.** With billing enabled, Clerk gates permissions by feature, so a lapsed subscription silently removes a *capability* rather than a quota: a member loses permission to act in the middle of a session. Roles decide who may act, features decide how much, and they meet nowhere.
11. **The CSP comes from Clerk's middleware, never a hand-written policy.** → `references/csp-and-variables.md § The CSP header`
12. **Clerk's wording is not part of your contract.** Locate its controls by their element-key class (`.cl-<elementKey>`), never by their text.
13. **Read the gotchas before touching Clerk.** Read `references/gotchas.md`, since these can fail silently or look like a different problem:
    - a task that runs before the app;
    - Test mode as a dashboard toggle;
    - a development instance's silent `dev-browser-missing` refusal;
    - wording that is not in your tree;
    - the components Core 3 deleted;
    - the provider's `dynamic` and the server redirect that ignores `signInUrl`;
    - middleware that makes a page wait;
    - the bounce lost when members move off `/`;
    - a secret key in the publishable variable;
    - a provider-less surface linking into one that needs Clerk;
    - Clerk's menus opening behind a modal dialog, and a design token that loops through Clerk's own variable;
    - the plan tab that must match the workspace model;
    - the organization profile's navigation, hidden rather than unmounted below its breakpoint;
    - a dashboard feature's slug derived from its name, and a billing patch that moves features to Free;
    - a subscription read that carries only a plan's visible features;
    - the personal-data webhooks, and Clerk's own deletion paths;
    - production keys that refuse any host not on the instance's domain list, such as the host's default deploy subdomain, which still serves pages;
    - sign-in down while every page answers 200;
    - the production instance's DNS and legal consent.

## Setting it up, in order

**Apply every setup step on the development instance first.**

1. **Create the application.** The dashboard offers a long "Add authentication" prompt: don't paste it. In a repository it does not recognise, it scaffolds an app of its own in a subfolder (observed 2026-08). The page you want is *Configure → API keys*. Choose the sign-in methods: email, and Google if you want one-click sign-in.
2. **Set the workspace model before the first migration and billing.**
   - In the organization shape, turn *Organizations* on and set *Membership required* (the switch Clerk calls *Force organization selection*). Do it now, before the first migration and before billing.
   - In the individual shape, leave *Organizations* off.
   - **Turn off Clerk's own deletion paths.** Keep them off until the product can delete what a workspace owns. This covers an admin deleting an organization and a user deleting their own account. → `references/organizations-and-billing.md § Webhooks and personal data`
3. **Configure a second role only when the organization-shaped product has one.**
   - In *Configure → Organizations → Roles*, edit the default Member role and rename it, name and key, to the product's second role (for example `org:moderator`). A product whose second role is a plain member keeps `org:member`.
   - Leave Admin (`org:admin`) alone: Clerk gives it to whoever creates an organization, and an instance cannot be without it.
   - Define no Clerk permissions.
4. **Enable Test mode before running the authenticated browser suite.** Use *Configure → Instance → Test mode*: on.
   - Change the default verification code: it is the password to every test account on the instance.
   - Create one user with a `+clerk_test` address by hand, the fastest proof that Test mode is really on. → `references/authenticated-mile.md`

**The agent can make three setup changes through the Backend API.** For steps 2–4, it can use development's secret key and get read-backs the dashboard does not give. Clerk's Backend API spec was read `2026-11-02` (spec of `2026-08-20`):

- the admin's deletion path: `PATCH /v1/instance/organization_settings` with `admin_delete_enabled: false`, read back with `GET` on the same path;
- the second role: `PATCH /v1/organization_roles/{id}` with its new `name` and `key` (the key starts with `org:`, and a new key carries over to the organization settings where the role is the creator's or the default), read back with `GET /v1/organization_roles`;
- test mode: `PATCH /v1/instance` with `test_mode: true`. No `GET` returns it, so the `+clerk_test` user above is its proof.

The rest stays the owner's, in the dashboard.

5. **Configure billing only when the product bills, after organizations.** Use Free and one paid plan for organizations, written in a billing file (its `plans` block included) and applied in two commands: `npx clerk config patch --file <file> --dry-run`, read what it would send, then the same without `--dry-run`. *Manage billing* goes to the admin role alone. → `references/organizations-and-billing.md § Billing`
6. **Enable legal consent once the legal pages are live.** Use *Configure → Legal → Require express consent to legal documents*, with their URLs. The sign-up form then carries the consent checkbox.
7. **Configure OAuth application settings only for a member-authenticated MCP server.** See § MCP OAuth.
8. **Configure production's own instance at go-live.** It gets:
   - its own keys, which work only on the domains the instance is configured for, and its DNS records;
   - its own OAuth client for each social sign-in (development borrows Clerk's shared ones);
   - legal consent on;
   - a real Stripe account connected to Clerk Billing, and the billing file applied with the same two commands plus `--instance prod`, the dry run read first, when the product bills;
   - every dashboard setting above applied again and read back. An instance cloned from development drops the settings only the API sets (observed `2026-10-24`);
   - generated secrets generated afresh, never copied from development.

   → `references/csp-and-variables.md § The production instance`; the release around it is `release-gate`.

## Keep a record of every dashboard setting

**Record dated read-backs for settings and screenshots only where unreadable.** None lives in application code, and several silently change what that code may do. Put each in the integration notes:

- the plans and features: the billing file, and each instance's read-back against it (§ The choices, 9);
- the organization settings, `GET /v1/instance/organization_settings` with that instance's secret key: *Membership required*, automatic first organization, admin deletion off;
- for a member-authenticated MCP server, the OAuth settings, `GET /v1/instance/oauth_application_settings` (§ MCP OAuth);
- sign-in methods, legal consent, self-deletion and social providers, from the instance's public settings, `GET https://<frontend API host>/v1/environment`, which needs no key;
- a screenshot for the rest: *Roles* (each role's name and key, and who holds *Manage billing*), *Test mode* on (development only), *Webhooks* (the endpoint and its events, once the personal-data trigger fires).

`npx clerk config pull --instance <dev|prod>` prints an instance's configuration as JSON as well (Clerk CLI 4.0.0, read `2026-10-25`). **A screenshot records intended configuration, not the live value.** Read the live value back before relying on it.

## MCP OAuth

**Open the OAuth procedure when configuring a member-authenticated MCP server.** Read the procedure in `references/mcp-oauth.md` for scopes, PKCE, the exact audience, per-instance read-back and verifier behavior. Recheck live workspace access on every request.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A new user signs up on a phone against production and lands where they should, in the right organization and role. The served pages carry the production publishable key.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/sessions-and-front-door.md` | the session seam; ids only; the sign-in surface and redirects; the front door and the member home: the rule, its shape on this stack, what was rejected, the tests that pin it | adding sign-in; touching the root layout, a public page, the member home or a redirect |
| `references/organizations-and-billing.md` | organizations and the choose-organization task; roles and *Manage billing*; the organization modal and custom pages; Clerk Billing: the billing file and the CLI, in code (callers with no session included) and in tests; pricing; webhooks, personal data and Clerk's own deletion paths | adding organizations, a role, a plan, a limit, pricing or a deletion webhook |
| `references/csp-and-variables.md` | the nonce CSP and static headers; every Clerk variable and the env schema's Clerk checks; what to record; the production instance | adding a CSP or a third-party origin; adding or checking a Clerk key; going live |
| `references/authenticated-mile.md` | Clerk's half of a real-session browser suite: Test mode, test accounts, the testing token, organizations in `globalSetup`, signing in through `<SignIn />`, the signed-out-action trap, locators | writing or debugging an authenticated end-to-end test |
| `references/mcp-oauth.md` | issuer and client registration, scopes, audience, PKCE, per-instance read-back and verification | adding or changing member-authenticated MCP |
| `references/gotchas.md` | every Clerk gotcha, each with its symptom and receipt | before touching Clerk; when sign-in or an authenticated action seems to do nothing |

## When something is learned

- **Keep general Clerk lessons here with their receipts.** Include the date, what happened, the product named by kind.
- **Date what Clerk did or required.** Use "observed 2026-10", because the dashboard and its labels change without notice. When one changes, correct the line; never leave the old one beside the new.
- **Keep product-specific facts in its own integration notes.** This includes its instances, roles, slugs, confirmations and re-reads.

## Example

For organization billing, exercise the same route as an owner, a member and a signed-out visitor in a test tenant. Record the expected response and actual result for each role.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/clerk-production).
