# Organizations, roles, billing, and personal-data webhooks

The principle behind all of this is `saas-authorization`: a role says *who may act*, a feature says *how much*, and the two never touch. This file is how that holds on Clerk.

## Contents

- Organizations
- Roles
- The organization modal and custom pages
- Billing
- Webhooks and personal data

## Organizations

**In the organization shape (the default), every workspace is a Clerk organization**, a solo user's included. *Membership required* goes on at setup, before the first migration and before billing. Clerk calls the switch *Force organization selection*; the setting is `force_organization_selection`.

- **Reason:** one workspace kind, one role set, and one billing tab, so a plan is built in the right tab the first time.
- **Cost:** every new member meets Clerk's `choose-organization` screen before your app. Until they finish it, their session is **pending**, which `auth()` treats as signed out by default, so a protected page sends them back to sign-in.
  - A person continues through it in seconds.
  - A headless browser cannot, so the authenticated harness creates each test account's organization and lands it past the screen (`authenticated-mile.md`). The cost is known and handled, not avoided.
  - (`2026-08-31`.)
- **The organization a person is in is the workspace that owns their data.** From the phase that adds roles, the setting is load-bearing, so check it rather than assuming it.
- **`has({ feature })` evaluates whichever entity is active**, and with *Membership required* that is always the organization: the entity the workspace is keyed to. The subscription that pays and the workspace that is limited can then never disagree.
- **A sign-up that starts in an agent:** *Create first organization automatically* is an organization setting, covered by `mcp-server`.
- **In the individual shape, organizations stay off.** There is no task, no role and no organization management.

## Roles

- **Roles exist only inside an organization.** Clerk ships every instance two roles: **Admin** (`org:admin`) and **Member** (`org:member`).
  - **Leave Admin alone.** `org:admin` is the role Clerk gives whoever creates an organization; it is Clerk's own and cannot be removed.
  - **The second role is usually the default Member role renamed, key and all.** In *Configure → Organizations → Roles*, edit Member and change its name and its key to the product's second role (a live Q&A product's became `org:moderator`). A product whose second role *is* a plain member keeps `org:member`.
- **The product's permissions are strings in its own permission module, and the two roles map to them.** Every other role string holds nothing.
- **Do not define Clerk permissions, and never attach a feature to one.** Clerk's own permission system is for Clerk's components. When billing is on, Clerk *gates permissions by feature*, so a lapsed subscription would silently remove a capability. A live Q&A product would have lost `question:moderate` from every moderator, leaving every question in a live room `pending` for ever. (`2026-09-03`, building plans for that product.)
- **To sell team size, use a seat limit on the organization plan.** Clerk enforces it at invite time and it needs no code. Never sell a role as a feature.
- **Clerk's own billing operations check a system permission, *Manage billing* (`org:sys_billing:manage`),** on its pricing table, its checkout and the Billing tab of its organization modal, whatever the app's own role map says. Grant it to `org:admin` alone, in each instance, so it agrees with the app's own billing permission; the app's role map cannot override a dashboard grant.
  - System permissions are not in session claims (Clerk's roles and permissions guide, read `2026-10-25`), so the server's `has()` cannot test them. Never attach a feature to a permission to imitate one.
  - (`2026-10-23`, a monitoring product's checkout stage: its own checkout controls rendered only for its billing permission, while Clerk's table and modal enforced theirs.)
- **Record in the integration notes:** the roles on the instance, what each maps to in the permission module, and which roles hold *Manage billing*.

## The organization modal and custom pages

- **Organization management is Clerk's own modal**, never a page you build. Open it with `openOrganizationProfile()` or from `<OrganizationSwitcher />`.
  - Its Members tab invites with any role the instance defines, custom roles included.
  - (`2026-09-20`, a live Q&A product retired its own invitation form once Clerk's role picker offered its custom role.)
- **What the modal lacks goes in as a custom page inside it** (`OrganizationSwitcher.OrganizationProfilePage`). Its data moves only through Server Actions that re-resolve the caller and recheck the permission the page is shown under.
- **Match a custom page's layout to the modal's built-in pages.** Compose the kit inside the vendor layout. A live Q&A product used two kit primitives, one for the page and one for each section.
  - Remeasure the built-in pages at every capture width. In that example, the 17 px title at weight 700 with 24 px line height aligned with the close button (reported `2026-11-18`). Hairlines divided sections, with 13 px labels at weight 500 in a 176 px column.
  - The section stacked at 992 px and navigation collapsed at 768 px. Use the section's measured breakpoint for its layout. Use the kit's own divider token when the hairline is too faint in dark mode.
  - Capture each custom page beside a built-in page. Apply the `ui-design` skill's vendor layout rule under What to verify visually.
- **A dialog of yours inside Clerk's modal shares its keyboard.** `showModal()` moves the dialog into the top layer, not out of the DOM tree, so every bubbling key still reaches Clerk's handlers before your `onCancel` runs.
  - An open modal dialog therefore takes Escape on `window` in the capture phase, ahead of any listener a vendor puts on `document`, and stops it there with `stopImmediatePropagation()`.
  - Only an undismissable dialog also calls `preventDefault()`. A plain confirmation still closes, while the vendor behind it does not.
  - Test a refusal from the deepest place the component is really rendered, not in isolation.
  - (`2026-09-20`, a live Q&A product: one Escape on a dialog holding an API token shown once, inside Clerk's organization modal, closed Clerk's modal and destroyed the secret.)
  - The dialog primitive itself is `ui-design`.

## Billing

**Only when the product bills, and then through Clerk Billing alone.** The product's own billing never runs on a payment provider wired up by hand. So there is no payment webhook and no subscription table, and no price is typed into application code: the one place a price is written is the billing file below, which Clerk's CLI applies and a test reads back. A direct Stripe integration for another purpose is a product exception, declared as such.

What follows was proven on organization plans, by a live Q&A product (`2026-09-03`, with its pricing page reworked `2026-09-18`) and by a monitoring product that kept its plans in a file and ran a test-card drill (`2026-10-23`). It is the organization shape's recipe. The individual shape would use the *User Plans* tab, which has not been built yet, so an individual product declares billing *none* until someone writes and proves that recipe.

### Plans and features: one file, applied by the Clerk CLI

Plans and features live in a JSON file in the repository, applied to each instance with Clerk's CLI and never rebuilt by hand in the dashboard. (`2026-10-23`, a monitoring product applied its file to development this way; production takes the same commands with `--instance prod`. Read on `2026-10-25` in `clerk config patch --help`, CLI 4.0.0: `--file`, `--json`, `--instance <dev|prod|id>`, `--dry-run`, `--destructive`, `--yes`.)

1. **Organizations on, with *Membership required*, before billing is enabled.**
2. **Start the file from the instance** (`npx clerk config pull --keys billing --output <file>`). Its `billing` block holds `organization_enabled: true`, `user_enabled: false`, a `features` map and a `plans` map.
   - **A feature's key is its slug; its `name` is only a label.** (In the dashboard the slug is generated from the name when the feature is created: § Gotchas.)
   - Each plan has `payer_type: "org"`, its prices in cents (`amount`, `annual_monthly_amount`), `publicly_visible`, and the list of feature slugs it carries.
   - Free and one paid plan, both for organizations, even before the product means to charge: the plan module and the pricing page are where the limits are stated. Leave user billing off. A plan bought by a person belongs to a person, and a person owns no workspace data.
3. **Two kinds of feature, kept apart.**
   - **Gated features** are the slugs the code reads. One per gate, named for what the paid tier *adds* (a live Q&A product's were `rooms_10` and `participants_1000`: up to ten open rooms, up to a thousand participants per room). Each is `publicly_visible: false`, so the pricing table never shows a slug, and `include_in_jwt: true`, so `has()` sees it. Free carries none of them: Free is their absence, which is what makes the mapping fail safely. A feature named for what the free tier has inverts that.
   - **Display features** are the lines of a plan's visible copy: `publicly_visible: true`, `include_in_jwt: false`, read by no code. Copy can then be reworded without touching a slug the code gates on.
   - Hiding the gated features changes what a caller with no session can read (§ In code).
4. **Preview, then apply:** `npx clerk config patch --file <file> --dry-run`, read what it would send, then run it without `--dry-run`. Production is the same two commands with `--instance prod`.
   - **Always patch with the `plans` block.** A patch carrying only features re-attached every feature no plan listed to Free (`2026-10-23`, development). Hidden, they showed nowhere, but the instance no longer matched the file.
5. **Read it back.** Development in a test (§ The tests that pin it). Production, which no test should hold a key to, at go-live and after every production patch: `npx clerk config pull --instance prod --keys billing` compared with the file. Record both in the integration notes, dated: the plans, each gated slug and what it unlocks, and who applied production. (`2026-10-24`, the same product went live with production's slugs never read back, because its only read-back test refused a production key.)

Two things stay in the dashboard: connecting the production instance's Stripe account (development uses Clerk's test gateway), and granting *Manage billing* (§ Roles). **Prices are the owner's, changed in the file and applied.** A price edited in the dashboard alone fails the read-back until the file agrees.

### In code

- **One plan module is the single source of capacities.** It exports the slug constants, a Free and a paid capacity record, and a pure `entitlementsFrom(hasFeature)`.
  - That function maps each feature independently to its number. Holding nothing is Free, and an unknown slug grants nothing.
  - It imports nothing from Clerk, so the unit suite holds the whole table without a key.
- **The session seam reads it.** The `has` from `auth()`, called as `has({ feature })`, is passed to `entitlementsFrom`. Signed out is Free. The authenticated harness substitutes a verifier, so a test puts a plan on a request without a checkout.
- **Each quota is checked inside the transaction that creates the thing.**
  - The server passes the allowance the session proved to the SQL function, as a required parameter (for an anonymous action, the stamp on its resource: `saas-authorization`, `references/model.md`).
  - The function locks the owning workspace row `for update`, counts, and raises a named error at the limit.
  - The screen explains the limit; the database enforces it (`saas-authorization § Invariants`).
- **A caller with no session that the app server handles** (an API token, a job on the app's own server) has no `has()`. Only when the product has such callers:
  - read the owning organization's subscription (`clerkClient().billing.getOrganizationBillingSubscription(orgId)`) and the organization plan list (`billing.getPlanList({ payerType: "org", limit: 500 })`, cached for a few minutes). The list's page size defaults to 10 and caps at 500 (Clerk's Backend SDK reference, read `2026-10-25`), and a plan missing from the page reads as Free, so pass a `limit` above your plan count;
  - parse both with zod. A subscription whose status is not `active` is Free;
  - keep each item on an organization plan whose status is `active`, or `canceled` with `periodEnd` still ahead (a Unix timestamp in milliseconds, per `@clerk/backend` 3.26.1's own type docs, read `2026-10-25`; compare it with `Date.now()`). A cancel ends at the period's end, so dropping a canceled item cuts the paid period short;
  - **take each kept item's slugs from the plan list, matched by plan id, never from the item's own `plan.features`.** That embedded copy carried only the plan's publicly visible features, so with the gated features hidden (step 3 above) every machine call on a paid workspace read as Free;
  - feed the slugs through the same `entitlementsFrom`.

  A parse failure or any error is Free, and a Free that came from a failed read is never stored (`saas-authorization § Entitlements come from billing`).
- **A worker on another runtime** (a Worker, a probe box) never gets `CLERK_SECRET_KEY`, which can impersonate any user (`environments`). When it must know a plan to route work, it reads the plan mirror the app writes (`saas-authorization § Entitlements come from billing`), and an allowance it needs comes from the app server.
  - (`2026-10-06`, a live Q&A product's API tokens. `2026-10-23`, a monitoring product's test-card drill: Billing showed the paid plan while a monitor created through the workspace's API token got Free's interval. Then a cancel: Clerk marked the *item* canceled, left the subscription `active`, and the dashboard showed an end date a year out, so a rule that kept only active items would have ended the paid year that day.)
  - Clerk's Backend API reference (read `2026-10-25`) types an item's embedded `plan.features` and the plan list's `features` alike and says nothing of visibility, so the omission is observed behaviour, not documented. It does document that cancelling an item without `endNow` ends it at the end of the current billing period.
- **Checkout is Clerk's `<PricingTable for="organization" />`**, on `/pricing` and on the member billing screen, signed in or out.
  - **Signed out, it renders the cards with prices and zero buttons**, so the page supplies its own call to action.
  - **It opens on annual billing, and the SDK has no prop to change that** (observed `2026-10-23`). Pin it in the browser suite rather than simulating a second selector.
  - A server-rendered summary above it takes every capacity from the plan module, and so does the page's metadata description.
  - One line says that prices, payment and cancellation are handled by Clerk.
  - **Reopen** `for="organization"`: never while *Membership required* is on. The organization pays, an organization of one included, and a user-tab plan is unreachable then.
- **A landing page may print its own plan cards** when every name, price and visible line on them is read from the billing file, and the read-back test holds the instance to that file, so the cards can say nothing Clerk's table does not. Once the landing carries an analytics tag, its own cards are the only pricing it shows, where it shows any (`product-analytics`). Checkout stays Clerk's table. (`2026-10-24`, a monitoring product's owner: Clerk's signed-out cards hid most features behind *See all features* and carried no button.)
- **With no billing:** no pricing table, no pricing page, no Pricing link, no plan copy, no entitlement code.

### The tests that pin it

- **The plan module, as a unit:**
  - nothing held is Free;
  - an unknown slug, or one of the Free plan's own feature slugs, grants nothing;
  - each feature is independent;
  - **every gated slug is pinned as a string literal**, so a renamed slug fails here before it reaches an instance.
- **The billing file, as a unit:** every capacity a visible line states matches the plan module; gated features are hidden and in the token, display features visible and out of it; Free carries no gated slug; and no visible line sells what the product has not built (what a plan may sell: `release-gate`).
- **The instance against the file, as an integration test** on development, through `GET /v1/billing/plans`:
  - the file's organization plans, with Free as the default;
  - each plan's slugs, names and prices exactly as the file has them;
  - the paid plan carrying exactly the slugs the plan module gates on.

  It refuses a production key and skips loudly without one. A red read-back while someone is editing the file is that edit racing the test, not a code failure. (`2026-10-24`, a gate went red while the file held a label the instance did not have yet.)
- **A caller with no session, as a unit**, fed the shape Clerk actually returns: an item whose embedded plan carries only visible features still yields the paid entitlements through the plan list, and a canceled item keeps them until `periodEnd` and loses them at it.
- **No price in application code, as a unit:**
  - a currency-amount pattern, itself tested against sample prices, is scanned over every text file under `src/`, with no violation allowed. The billing file sits outside it;
  - the summary is rendered with the plan module mocked to unusual numbers, which proves it derives its capacities rather than copying them;
  - each pricing page mounts exactly one organization table, below the summary.
- **In the browser:**
  - the summary shows the module's capacities and no currency symbol;
  - Clerk's cards are found by `.cl-pricingTableCard`, never by their wording;
  - the paid card shows *an* amount, without the test copying it;
  - the table opens on annual;
  - the cards fit a phone and stack.
- **Under concurrency:** ten simultaneous creates against a limit of one leave exactly one winner.
- **An absence is assertable only once the surface is proved present** (loaded root, cards and prices). Otherwise "no buttons when signed out" passes against a table that never rendered. (`2026-09-18`, a false report of signed-out pricing buttons survived in the visual suite after the gate's copy was fixed.)
- **Never create a real charge from a test.** Unit tests substitute feature checks; browser tests use development sessions and seed data directly.

### Checked once by hand: the paid tier really grants more

The gate cannot prove what a payment does. Subscribe through the pricing table on development; Billing runs in test mode there, so use the test card `4242 4242 4242 4242`, never a real card. Then:

- do the thing the paid tier adds, in the browser **and through a workspace API token**, whose next request must see the paid allowance;
- cancel, and check that both keep the paid features until the end date Clerk shows.

If the paid tier is refused, one of three things is wrong:

- the plan sits in the *User Plans* tab instead of *Organization Plans*: check `for_payer_type` on `GET /billing/plans`;
- a feature slug does not match: compare the slugs against the literals in the plan module;
- only the API token is refused: its slugs are being read from the subscription item's embedded `plan.features` rather than from the plan list by plan id (§ In code).

### Gotchas

- **The plan's tab must match the workspace model.** In the organization shape the organization pays, and the plan is built in the *Organization Plans* tab with organizations already on.
  - Clerk keeps user plans and organization plans in separate tabs, and slugs are scoped per tab.
  - **A plan cannot move between tabs after it is created**, so a plan built in the wrong tab is a plan built twice.
  - `has({ feature })` evaluates whichever entity is active. Get the plan's tab and the workspace's entity out of step and the failure is silent.
  - The quietest version: plans in the *user* tab, while forced organization selection means every caller always has an organization active. The paid tier is then unreachable for everybody, with nothing in any log to say so.
  - (`2026-09-03`, building plans.)
- **In the dashboard, a feature's slug is generated from its display name when the feature is created.**
  - Call a feature "Up to 1,000 participants / room" there and Clerk slugs it `up_to_1_000_participants_room`, which matches nothing, and every paying account silently drops back to Free. Renaming the feature later keeps its slug; only editing the slug itself changes it (owner, `2026-11-07`).
  - In the billing file the key is the slug and the name is free text: one more reason to keep plans in the file. Reword any feature's name; never change a gated feature's key.
  - Gate only on slugs chosen for that purpose, never on a plan's display lines. Those are written to sell, and sometimes state numbers that contradict the plan they sit on.
  - Make the mapping **fail towards the free tier**, so an instance that has not caught up costs a customer rather than giving the product away.
  - (`2026-09-03`.)
- **A features-only patch re-attaches unused features to Free** (`2026-10-23`). Patch with the plans block.
- **A subscription read carries only a plan's visible features** (`2026-10-23`). A caller with no session reads its slugs from the plan list (§ In code).

## Webhooks and personal data

- **Until the product can delete a workspace, turn off Clerk's own deletion paths**: an admin deleting the organization from Clerk's modal (`admin_delete_enabled: false` in the organization settings) and a user deleting their own account (off in the instance's user settings, read back as `user_settings.actions.delete_self` from its public settings). Either deletion cuts the members off while the workspace's rows stay stored and its public pages stay up. Set both in each instance and read them back; turn one on again only when the webhook handling below exists. (`2026-10-21` and `2026-10-24`, a monitoring product, development then production.)
- **No Clerk webhook until the personal-data trigger fires**: before the first paying customer, or the first deletion request. Until then, `CLERK_WEBHOOK_SECRET` stays empty and no webhook route exists.
- **When it fires, consume `user.deleted` and `organization.deleted`.** Delete or anonymize what the workspace owns, and update the permissions, flows and environment notes.
  - Verify the signature (Clerk signs through Svix; `clerk-webhooks` has `verifyWebhook`).
  - Handle replays idempotently, and process only events you own.
  - Add the route to the member edge rule's excluded paths: a provider retries in bursts, and a refused webhook is a lost event (`saas-authorization § Webhooks`).
- Record the webhooks consumed in the integration notes, with a screenshot of the endpoint and its events.
