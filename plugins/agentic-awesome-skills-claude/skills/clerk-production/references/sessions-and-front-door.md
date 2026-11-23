# Sessions, the sign-in surface, and the front door

## Contents

- Sessions
- The sign-in surface and redirects
- The front door and the member home

## Sessions

- **Verify, never decode.** A Clerk session is verified server-side on every request, never decoded and trusted. That rules out reading a JWT's payload in the browser, and reading claims off a cookie by hand.
- **One seam.** Every server path that needs the caller goes through one session module (call it `SessionVerifier`). It is the only place `auth()` is called for identity and entitlements.
  - Tests substitute a mock verifier when `CLERK_SECRET_KEY` is absent, so the unit and integration suites need no Clerk key.
  - Keyless mode (Clerk running without keys) is for development only.
- **The seam returns what the three authorization functions need**: the user id, and the active organization id with its role in the organization shape. It also returns the entitlements: the `has` from `auth()`, called as `has({ feature })`, passed to the plan module's mapping. Signed out is the free tier (`organizations-and-billing.md § Billing`).
- **The individual shape's seam** requires `auth()` and `currentUser()` to name the same user. It reads an email only when it is the verified primary one, and creates the workspace row on first sight through an idempotent database function (`saas-authorization`).
- **Store Clerk ids only.** Read names and emails from Clerk at render time; never copy a profile into your database. Only the `workspaces` table holds a Clerk org or user id, and, where the product records authorship, one member table beside it holds the provider's user id too (`saas-authorization`).
- **Authorization lives with the data, not in a path list.**
  - Clerk v7 deprecates `createRouteMatcher`.
  - `proxy.ts` (Next 16's name for middleware) runs a bare `clerkMiddleware` that attaches the session and writes the CSP. It protects nothing by path.
  - Every protected page and every action checks for itself through the seam and the three functions. The check is in the page, never only in a layout.
  - (`2026-08-27`, building the first slice with sign-in and data.)
- **Branch on the server.** Use `auth()` (or the product's `currentCaller()`) and a redirect, on a member route. Core 3 deleted `<SignedIn>` and `<SignedOut>` (`gotchas.md`), and the decision belongs where the data is anyway.

## The sign-in surface and redirects

- **Clerk's own components are the sign-in surface**, never rebuilt: `<SignIn />`, `<SignUp />`, `<UserButton />`. As the shape uses them, so are `<OrganizationSwitcher />`, `<PricingTable />` and Clerk's organization modal.
  - They are dressed through `appearance.variables`, referencing the design kit's tokens.
  - The authenticated browser suite signs in through `<SignIn />` itself, so that it notices when the component stops working (`authenticated-mile.md`).
- **Sign-in lands on the member home, never on `/`.**
  - `signInFallbackRedirectUrl` and `signUpFallbackRedirectUrl` name the member home (`/dashboard` unless the product names another route).
  - `afterSignOutUrl` is `/`.
  - The member home sends a signed-out visitor to `/sign-in?redirect_url=<itself>`.
- **Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,** or redirect to `/sign-in?redirect_url=…` yourself. The server's sign-in redirect does not read the provider's `signInUrl` (`gotchas.md`).
- **The root layout's `<ClerkProvider>` takes the request's `nonce`, never `dynamic`.** `dynamic` would read the session into every page it wraps (`gotchas.md`). **The nonce comes from the request headers:** Clerk's middleware sets its policy on the request too (`csp-and-variables.md § The CSP header`), so the root layout reads `content-security-policy` with `headers()` and passes the `'nonce-…'` value from its `script-src` directive, or from `default-src` when there is no `script-src`. Clerk's own `dynamic` path reads the same header, after an `x-nonce` one (`@clerk/nextjs` 7.9.23, `DynamicClerkScripts` and its `utils`, read `2026-11-02`). (`2026-10-31`, an evals product: this line did not say where the nonce came from, and finding it took reading Clerk's source.)
- **When the member home moves off `/`, move every redirect with it**: the two fallback URLs, every `redirect_url`, links and emails (`gotchas.md`).

## The front door and the member home

**The rule.** `/` and every public page (legal, pricing, anything a stranger may open) render the same for everyone and read no session:

- nothing under them calls `auth()`, `currentUser()`, the session seam or `<Show>`;
- the root `<ClerkProvider>` takes the `nonce` but never `dynamic`;
- a signed-in visitor on `/` stays there, never redirected away.

**The member home is its own route** (`/dashboard` unless the product names another).

- It calls the session seam itself; the check is in the page, never only in a layout.
- It sends a signed-out visitor to `/sign-in?redirect_url=<itself>`.
- It is where sign-in and sign-up land.
- In the individual shape, the workspace row is created on the first visit there, never on `/`.

**Use the App Router shape below for pages that share the app layout.** Apply `product-analytics` § What binds for a standalone static landing document; it follows the same session and redirect boundary.

- **One root layout**, holding `<html>`, the theme cookie and the provider. Several root layouts would reload the page between them.
- **`app/(public)/layout.tsx`** holds the public header and footer and reads nothing.
- **`app/(app)/layout.tsx`** holds `<UserButton />`, plus `<OrganizationSwitcher />` in the organization shape. Every page under it checks for itself.
- **The public header has one button to the member home, a plain `<a href>`.** A default `<Link>` prefetches a dynamic route down to its nearest `loading.js`, which would run member code on every landing view, and a full page load out of the landing page is what its analytics tag needs (`product-analytics`).
- **A small client component labels that button from `document.cookie`.**
  - A `__client_uat` or `__client_uat_<suffix>` cookie that is neither empty nor `0` reads as signed in.
  - The server renders the signed-out label, so without JavaScript the button still works.
  - The label is a guess used for nothing else. A stale cookie says "signed in", and the member home sends the visitor to sign-in at no cost, because both labels open the same page.
  - **Read the cookie with `useSyncExternalStore`**: a `subscribe` that does nothing, the cookie test as the client snapshot, and `false` as the server snapshot, so hydration starts from the signed-out label. Not `useEffect` plus `setState`, which Next 16's default lint fails (`react-hooks/set-state-in-effect`; `2026-10-31`, an evals product). (`2026-11-07`, a live Q&A product, medians of 20 on a local production build, Next 16 with a Clerk development instance: the cookie was readable at 43 ms, before first paint at 124 ms; Clerk's client had a user at 621 ms. Waiting for Clerk client state swaps the header about half a second after the page appears; production network and instance were not measured.)

**The App Router landing renders per request.** The nonce CSP and the theme cookie render every page in that layout per request; Next's CSP guide says a nonce needs dynamic rendering.

- What the rule removes is session-dependent page work: Backend API calls and workspace writes a session seam in the root layout can put before the first byte. **Do not promise a signed-out speed gain:** `auth()` without a session cookie was local in the measurement; the signed-in visit gained, and the other reasons are architectural. (`2026-11-07`, a live Q&A product: two local production builds of one commit, Next 16 with a Clerk development instance, medians of 20. Signed-out TTFB was 262 versus 257 ms, no measurable gain; signed in, `/` answered in 22 ms versus 283 ms for the old redirect plus the member home's TTFB — not a measure of the session read alone. Production network and instance were not measured.)
- One wait remains outside the page. Clerk's middleware still runs on `/` to write the CSP, and a browser whose session token has expired gets a token refresh or a handshake redirect before any page renders (`gotchas.md`).

**Rejected:**

- **Redirecting signed-in visitors from `/`.**
  - In `proxy.ts` it is the path list § Sessions forbids.
  - On the page, it is the session read this rule removes.
  - On the client, the landing shows and then jumps.
- **A "Sign in" link beside a "Dashboard" link.** Two hrefs make a wrong guess cost something.

**The tests that pin it:**

- A source guard: nothing under `src/app/(public)/`, `src/app/layout.tsx` or any component the landing composes imports `@clerk/nextjs/server` or the session seam, calls `auth()` or `currentUser()`, or renders `<Show>`, and the root provider has no `dynamic`. When analytics is opted into the shared App Router, apply `product-analytics` § What binds for the additional source guard, regardless of where the component mounts or whether its project id is set.
- A unit test of the cookie parser: plain and suffixed names, `0`, empty, absent.
- In the public browser suite, `/` renders the landing with and without Clerk's cookies, and with JavaScript off, with no redirect.
- In the authenticated suite (`authenticated-mile.md`):
  - signing in lands on the member home directly;
  - a signed-in visit to `/` stays on `/`;
  - a signed-out request to the member home lands on `/sign-in` with a `redirect_url`.

**Reason:** a stranger's first paint must not wait on Clerk or the database to decide what to show, when what it shows is the same for everyone. And a member gets one address that is theirs.

**Reopen:** never for the session read. A static or CDN-cached `/` reopens the nonce CSP and the server-read theme. Taking `/` out of the middleware reopens "the nonce policy comes from Clerk's middleware" (`csp-and-variables.md § The CSP header`). Say which, in the product's declared shape.

**Receipts.**

- `2026-10-21`: the pattern was first proven on a different stack, a Node relay serving static HTML, so the pattern carries and the mechanics above are this stack's. Until `2026-10-17` that product's `/` kept its hero hidden until Clerk had loaded. After the split, its `/` loads no Clerk, a header script labels one member-home button from `__client_uat`, and browser tests assert that the landing renders with Clerk's cookies set and no auth request, and that a signed-in user can return to `/`.
- `2026-10-22`: the first product on this stack to build it, a monitoring product, pinned it with the source guard above and a public browser test that a signed-out visit to the member home lands on sign-in with the way back kept. The cookie-label unit, the JavaScript-off landing and the two signed-in assertions were still unwritten there; they are the halves to add first. Two earlier products on this stack had read the session on `/` before it painted.
