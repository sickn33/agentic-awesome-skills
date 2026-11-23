# The authenticated mile: Clerk's half of a real-session browser suite

Everything before this suite can be tested without an identity; this is the suite that buys one. It runs a real Clerk development instance and a real session:

- sign-in through `<SignIn />`;
- the member's own screens;
- one account per role, in one organization in the organization shape;
- the anonymous public beside them.

It fakes only mail, using `+clerk_test` addresses with a fixed code.

The harness design is `test-harness`: what each harness makes real, the separate config, the shared web server, and the gate. That includes why this suite runs in the local gate, and why hosted CI runs everything except it. This file holds the Clerk mechanics the design depends on.

## Contents

- Two variables, one value to set
- In the dashboard
- `globalSetup`, organization shape
- `globalSetup`, individual shape
- Signing in
- Signing in for screen captures
- Locators
- Rules that came from bugs
- Done when

## Two variables, one value to set

- **`TEST_ADMIN_EMAIL`** is a Clerk test address carrying the `+clerk_test` subaddress (`you+clerk_test@example.com`).
- **`TEST_VERIFICATION_CODE`** is the code a development instance accepts for every such address while **Test mode** is on.

There is no mailbox and no real person's account. Every further account (a second admin, one per additional role) is derived from the first address, so there is one value to set and no way to set it half-way. Neither variable is in the app's env schema; the suite checks them itself (`csp-and-variables.md § Variables`).

## In the dashboard

On the **development** instance only:

- ***Configure → Instance → Test mode*: on.** This is what lets an agent sign in as somebody. Change the default code (`424242`) while you are there: it is the password to every test account on the instance.
- **Optionally, create the first `+clerk_test` user by hand** (*Users → Create user*). The suite creates it when missing, but doing it once by hand is the fastest way to see that Test mode is really on.
- **Use development instances and test accounts only.** Never run an authenticated test or smoke with a real user's credentials, and never against production.

## `globalSetup`, organization shape

It runs before any browser opens, and does five things:

1. **Fetches Clerk's testing token.** Bot protection refuses a headless browser without it.
2. **Creates the test users** if the instance lacks them.
3. **Creates an organization for each and lands it past Clerk's `choose-organization` task.** With *Membership required*, a session without an organization is pending, and `auth()` treats it as signed out (`organizations-and-billing.md § Organizations`).
4. **Gives each secondary role its membership in the first admin's organization**, so the permission matrix is exercised by real members with different powers.
5. **Deletes everything those accounts own.**

The teardown deletes it again. A run starts from nothing and leaves nothing, and **running it twice in a row is the check that this is true**.

## `globalSetup`, individual shape

Proven once, `2026-10-11`, by a product on this stack. It is shorter:

1. **Refuses to start** unless `TEST_ADMIN_EMAIL` carries `+clerk_test` and `TEST_VERIFICATION_CODE` and `CLERK_SECRET_KEY` are set.
2. **Calls `clerkSetup()`** for the testing token.
3. **Finds the test user through the Backend API** (`GET /v1/users?email_address=…`). It creates the user when missing, with `POST /v1/users`, `skip_password_requirement` and `skip_legal_checks`.

There is no organization, no task to land past and no second-role membership.

**It never creates the workspace row.** The app's session seam creates it on first sight, the path a real user takes.

**The reset is not yet proven in this shape:** nothing the first product's suite asserted depended on rows an earlier run left. A suite whose assertions do depend on them deletes what the test account's workspace owns, in `globalSetup` and in the teardown, as above.

## Signing in

- **Sign in through Clerk's own `<SignIn />`, not `clerk.signIn()`.** Clerk's components *are* the sign-in surface, and this is the suite that has to notice when one stops working. Clerk's own testing guidance steers away from UI sign-in, for speed (read `2026-10-24`); here the component is the thing under test, so this rule wins.
- **Wait for `prepare_first_factor` before filling the code, never for the input to appear.** Clerk's verification-code box renders while the code is still being sent. The field is the pixels; `prepare_first_factor` is the event. (`2026-08-31`, verification outran code preparation.)
- **After every navigation, wait for Clerk to load before the first click** (`window.Clerk?.loaded === true`), as a person's first click does. Wrap the fixture's `page.goto` so no test can forget. The stored session token is long expired by the time a test opens a page, and Clerk's script replaces it once it loads; a Server Action sent before then answers signed-out. (`2026-10-24`, a monitoring product: a click 0.8 s after `goto` failed two runs of three under a parallel review's load.)
- **Record any Server Action response carrying `x-clerk-auth-status: signed-out`, and throw it in `afterEach`.** That makes a development instance's silent refusal name itself (`gotchas.md`, the `dev-browser-missing` entry). It names the cause; it does not prevent it.
- **What it asserts about the front door:**
  - signing in lands on the member home directly;
  - a signed-in visit to `/` stays on `/`;
  - a signed-out request to the member home lands on `/sign-in` with a `redirect_url` (`sessions-and-front-door.md`).

## Signing in for screen captures

**A sign-in token gets a capture crawl into a development test account.** With that instance's secret key, call Clerk's Backend API `POST /v1/sign_in_tokens` with the test user's `user_id`, then open the app's sign-in URL with `?__clerk_ticket=<token>` in Playwright. Run it after `globalSetup`, with the testing token `clerkSetup()` fetched (bot protection refuses the headless browser without it), and as a test user `globalSetup` has already landed past `choose-organization` in the organization shape: a headless crawl cannot finish that task, so a session still pending means setup didn't run, and the crawl stops rather than capturing Clerk's screen. Wait for Clerk to load before capturing. The token is a credential: keep it out of the chat, the walkthrough's handoff and commits. This complements the testing token and test accounts above; the authenticated suite still exercises `<SignIn />`. (`2026-11-04`, observed on an evals product: this signed-in capture path enabled the newcomer walkthrough of every route and dialog.)

## Locators

- **Clerk's visible wording is not in your tree, so it is not part of the contract.** Its English labels load from Clerk's CDN at runtime, and `node_modules` holds only localization keys.
  - A vendor release can reword a button. Every `getByText` naming it then fails against a working product, with nothing in `git log` or `npm ls` to explain it.
  - Locate Clerk's controls by their element-key class (`.cl-<elementKey>`), the same keys `appearance` targets. The pricing table's cards, for example, are `.cl-pricingTableCard`.
  - (`2026-09-20`, *Manage organization* became *Manage* and six authenticated specs timed out at once.)
- **A vendor's element keys, state classes and painted surfaces are measured from the rendered DOM**, never inferred from types, docs or names. Locators account for live counts, actual tabs and readiness conditions. (`2026-09-17`, guessed Clerk locators, colour readings and a disappearing active pill each invented a different defect.)

## Rules that came from bugs

- **A Playwright worker inherits the environment of the process that spawned it, and nothing after.** Clerk's testing token must therefore be fetched in `globalSetup`, which runs before any worker exists. Fetch it in a *setup project* instead and the next worker starts without it. (`2026-08-31`.)
- **An identity provider can put a screen in front of yours.**
  - With organizations on, a new account meets the `choose-organization` task before the app, and a task-pending session is signed out as far as `auth()` is concerned.
  - A person clicks through it in seconds; a headless sign-in cannot. That is why `globalSetup` lands the accounts past it.
  - **The symptom of a harness that did not:** a sign-in that succeeds, and a `waitForURL` that times out anyway.
  - (`2026-08-31`, the authenticated journey stalled behind the task.)
- **Rule out Test mode first when `e2e:auth` goes red at sign-in while the public suite stays green.**
  - With Test mode off, Clerk mails a real code, and every sign-in stalls at `/sign-in/factor-one` with "Incorrect code" (`form_code_incorrect` from `attempt_first_factor`). Nothing hints that a *setting* is the cause.
  - The user is fine (verified, unlocked) and the keys are fine.
  - `clerkSetup()` still returns a testing token. That token is bot protection, not test mode, so forcing it onto the requests changes nothing.
  - (`2026-09-03`, running the app after a key rotation.)
- **Run the authenticated suite and the visual suite one at a time.** They share one set of test accounts, and each resets what those accounts own, so one wipes the other's fixtures mid-run (`test-harness`).
- **Never create a real charge.** Browser tests use development sessions and seed data directly. A paid tier is checked by hand once, with the test card (`organizations-and-billing.md § Billing`).

## Done when

- `npm run e2e:auth` (or the product's equivalent) passes **twice in a row**. A suite that passes only on a clean database is not a suite.
- The public suite still passes without any of the test variables.
- The test docs and the coverage map describe what now exists.
- The permissions doc holds a matrix the owner can read, and a "not implemented yet" section they believe (`saas-authorization`).

**Shape the journey for real use.** One sequence a real person performs, end to end, with more than one actor in it at the same time wherever the product has more than one. A member on a desktop and the anonymous public on phones, in the same room, is a very different test from either half alone. It is the half no unit test can reach.
