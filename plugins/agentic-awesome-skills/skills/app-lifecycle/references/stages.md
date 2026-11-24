# The stages, one by one

Each stage: what it produces, when it is done, what doing it well looks like, the owner's part, and which skill holds the how. The guidance under *Doing it well* is distilled from the prompts that walked a live Q&A product through these stages; where it names that product's nouns (rooms, questions, upvotes, a moderator), read your own.

On the stack these were learned on, *the identity provider* is Clerk, *the database* Supabase Postgres, *the host* Netlify. The principle is stated first; the vendor detail after it is that stack's mechanism.

---

## 0 — Brief *(optional)*

**Produces:** the product section of the agent instructions — short, because every session reads it — with the shape declared, and the brief behind it (segments, value propositions, jobs to be done, use cases). Whatever the idea leaves open becomes an **open entry** in the decision log. No code, no design, no `.env`.

**Done when:** the product section and the brief describe the product in words the owner agrees with, the shape is declared, and every question the idea left open is an open entry in the decision log.

**Doing it well**

- **Ask what you need first; then write, stop, and list the open entries.** The owner's idea is a few sentences: who it is for, what they do with it, what they get. When the owner has already accepted a proposal and said go on every suggestion, write instead, and list what you decided as provisional entries for one read (`decisions.md`). (`2026-10-30`, an evals product.)
- **Where the idea does not settle something, do not guess.** Record it as an open entry with the options you see. A guess written into the brief reads as a decision.
- Declare the shape explicitly (`product-shapes.md`): workspace model, billing, anonymous public, embedded agents, member home. Every later stage reads it.
- The `product` pack's skills (`market-segments`, `beachhead-segment`, `value-curve`, `value-proposition`) can sharpen a draft; what they produce is a draft the owner confirms, not a decision.
- The strategy stays a stub until the owner has confirmed one (`strategy.md`).

**Skip it** when the product section and the brief already exist, or a workshop hands you the product.

**Templates:** `product-section.md`, `brief.md`, `decisions.md`.

---

## 1 — Screen options *(optional)*

**Produces:** open product and UX options on screens in the `propose` artifact, with picks recorded in the decision log.

**Done when:** each covered decision has a pick in the log, and the product section and brief agree with the picks.

**Doing it well**

- **Keep the options panel in the artifact:** every open decision a screen can show, plus other choices found while drawing it. With the `product` pack, `propose` § 7 says how picks come back. Without it, the person picks on the page where the host saves picks, or answers in the chat, and each pick goes into the page's file and the decision log in the same turn.
- **Show the behaviour a screen hides.** Where relevant, keep an actor-permissions panel in the artifact: who may do what and what is refused. For embedded agents, show which agent answers and which tool calls are allowed or refused.
- **Before the owner sees it, screenshot and check it** under the `ui-design` skill; then the owner picks. Record each pick, its options, reason and reopen trigger; update the product section and brief where needed.
- **Keep screens high fidelity in the same artifact.** Embed and compose existing kit CSS, or keep a new product's values in tokens. The next stage builds the kit from the picks.

**Skip it** when the accepted proposal settled these options, or no open choice needs a screen.

**How:** the `propose` skill (the `product` pack) and the `ui-design` skill. Without the `product` pack, the page is one self-contained HTML file holding only the open options on screens and their decisions, each with a recommendation, drawn under `ui-design`'s method.

---

## 2 — Design

**Produces:** the jobs map (the `ui-design` skill: each job in the user's words, its screen, that screen's one question and its primary action); the kit — tokens, primitives, and the kit's README (what it contains and why) — and artboards for the first screens, kept in the repository. Either two directions to pick from, or an existing design adopted. No code, no database, no `.env`.

**Done when:** the owner has picked a direction or adopted one, the kit, its README and the artboards are in the repository, every agent that will build screens loads the `ui-design` skill from `app-stack` installed in it (Codex too: `codex plugin list` shows the pack installed and enabled), with no copy of the skill in the repository, and **every raw value lives in the tokens and none in the kit's stylesheet**, with the method's kit floor held by a token-name test before any app screen is built.

**Doing it well**

- **Start from the jobs map**, the proposal's when there is one: the artboards draw the screens it names, and a screen with no job is cut. When the product replaces a tool the owner knows, start from that tool's structure.
- **Only the owner can approve skipping or deferring the design stage.** By default, a plan that runs setup first keeps design and its artboards before any app screen. Record any exception and its return trigger in the plan. (`2026-11-03`, an evals product: design was skipped by a recorded decision, "setup before design and screens", and nothing brought it back: no artboards, and its builder, Codex with no pack installed, never read the method, and the owner's click-through found five layout bugs.)
- **Design the first two screens with their empty states:** the member's main screen (desktop) and the public's, if the product has one (phone). For a live Q&A product those were the host's list of rooms and a participant's room page.
- **Two genuinely different directions**, shown as specimens on one page (the proposal's artifact when there is one), each with what it optimizes for and the trade-off. Stop; the owner picks — a single letter is enough. A direction the artifact already settled stands.
- **Decide theming with the direction:** one palette or two token sets. Either way the browser harness pins one colour scheme, and contrast floors are tested for every set that exists.
- After the pick: build the kit, rebuild the two screens from it, keep the artboards, commit, and stop again.
- Layout, copy, type, colour and what the kit contains are the agent's to propose. Real copy, an icon set, phone-first.
- The artifact's picks bind both directions.
- **Or adopt an existing design** when the product must match something that already exists (another site, a sibling product). There are no directions to invent: extract its colours, type, spacing, radii and motion as tokens, its layout and components as primitives, and say in the kit's README what came from where. Keeping brand colours still runs the kit stage and completes the method's kit floor before screens. **Where the source breaks a rule of the design method — a contrast floor, a raw value outside the tokens — keep the rule and say what you changed.**

**How:** the `ui-design` skill — its method is what the kit must satisfy, and it says which design skill leads at this stage.

---

## 3 — Screens on sample data

**Produces:** the approved design as a running app — the first screens, with realistic content and their empty states — built from the kit, with sample data behind the seams the real system will use. The member's main screen sits at its own route, the **member home**, never at `/`. No database, no sign-in.

**Done when:** the newcomer walkthrough, rendered-screen pass, app-screen screenshot critique at 1440/768/390 (three rounds at most), and scored Impeccable-style audit passed with P0 and P1 fixed (the `ui-design` skill; its local checklists work without the collections), then the owner approved the look and clicked through every screen state at phone and desktop width and what they asked for is in; the kit tests pass; nothing anywhere asks anyone to sign in.

**Doing it well**

- **The screens call the data and action functions the first real slice will make real, never the fixtures directly**, so the swap changes what is behind the seam and not the screens. **Invent no storage in the meantime.** The plan that later introduces the database names the workspace table, the authorization functions and the first migration; screens built before it read fixtures, never invented persistence.
- **The front door's screens come with the first screens**: the landing at `/`, the same for every visitor, pricing on display where the product bills (sample prices, marked as such), and a placeholder page behind each legal link that says the text comes before launch and holds no sentence of policy, so the first click-through shows the whole product. Stage 8 writes the legal pages from the code (`legal-pages`), and takes the sample prices down (block C) or replaces them from the billing file (block B), before any stranger sees them.
- **The sample data fills every screen**, every tab included, so the click-through never meets an empty one; the empty states are shown on purpose, beside it.
- **Add the kit tests the design method asks for:** always contrast floors parsed from the tokens for every set, and no colour literal in the kit's stylesheet; then the pins for whatever the kit contains (the dialog's declarations, the button variants, complete wrapping). Pin the browser harness's colour scheme, with a comment saying why.
- **Scaffold the app with Cache Components off.** `create-next-app` 16.4.3 turns `cacheComponents` and `partialPrefetching` on by default (read `2026-11-02` in the package), and the rules on this stack assume both off: the nonce CSP, `force-dynamic` on every live read, the server-read theme. Pass `--no-cache-components`, check that `next.config` has neither line, and pin it with a source guard (`test-harness`) until those rules have a Cache Components version. (`2026-10-31`, an evals product's fresh app had both on.)
- Compose every screen from the kit; extend a primitive rather than invent one. Public screens are phone-first.
- **A phone is a phone-sized viewport, not a resized window** — the `test-harness` skill says why.
- **Complete phase checks before previewing the first screens to the owner.** Plan briefly, build, commit and run it. Follow the plan's phase boundary, here by default. Apply `release-gate` § Stage and phase close for the full checks, including the `ui-design` walkthrough, rendered pass, critique and audit for the new journeys. Send the URL and actions for the look review and record the pending preview. The next phase can start as `SKILL.md` § Find the stage you are in says.
- **Invite owner adjustments while sample screens are cheapest to change.** Use a flat list of what should happen. Keep the preview open if the owner is away; feedback becomes stages of the phase in flight.

**How:** the `ui-design` skill; the `test-harness` skill for the kit tests and viewports.

---

## 4 — Setup

**Produces:** the identity provider's application (development instance; organizations on, in the organization shape; test mode on, with the owner's own verification code and a first test account), a **development database project** of its own (production's comes at go-live; a development branch of production instead is the owner's choice, `supabase-production`), the CLI reaching development by its connection string, and the keys in `.env`.

**Done when:** `.env` is filled with no placeholder left, the CLI and any optional diagnostic MCP connection name the development target, the development database is still empty, the app boots on the development keys, and test mode, the owner's verification code and the first test account are ready for stage 5's signed-in suite. A development branch of production has no MCP connection.

**The owner's part** — dashboard clicks the agent cannot make:

- **The identity provider's application**, on its development instance, with the sign-in options the owner wants. Skip any "add authentication" prompt the dashboard offers to paste: in a repository it does not recognise, it scaffolds an app of its own in a subfolder (Clerk, observed 2026-08-27). The page you want is its API keys.
- **Test mode, a verification code of your own and a first test account**, while you are in the development dashboard. Turn test mode on and **change the default verification code to one of your own**: it is the password to every test account on the instance. Create one test user with a test subaddress (`you+clerk_test@…` on Clerk, which never mails it and always accepts the test code; observed `2026-08-31`). The suite can create the user itself, but creating it by hand the first time is the fastest way to see that test mode is really on. Keep the code out of the chat and the repository.
- **In the organization shape, turn organizations on and require membership** (Clerk calls it *Membership required*; the switch reads "Force organization selection"). What it buys: one kind of workspace, one set of roles, one billing tab, and plans built in the right tab the first time. What it costs: every new member meets the provider's choose-organization screen before the app, and until they finish it their session is *pending*, which the provider treats as signed out, so a protected page sends them back to sign-in. A person continues through it in seconds; a headless browser cannot, which is why the browser harness creates each test account's organization and lands it past the screen — known and handled, not avoided. (`2026-08-31`, `2026-09-03`.) **In the individual shape, leave organizations off.**
- **The development database project and its connection string**, saved by the owner outside chat in an uncommitted development operator file. The unlinked CLI reaches development by that string. If development has its own project and logs or advisors are needed, use a read-only token scoped to that project in `SUPABASE_ACCESS_TOKEN`, outside chat and off the command line. A development branch of production uses the CLI alone and grants no parent-project MCP access. Apply `supabase-production` for setup. Keep `.env`, the CLI and any MCP connection pointed at development by naming the target every time.
- **The keys go into `.env` and nowhere else — never into the chat.** A key that touched the chat is rotated in its dashboard.

**Doing it well**

- **Use the unlinked CLI for database setup and migrations.** The CLI reaches each environment by its own connection string. A stand-alone development project may use a read-only MCP connection for logs or advisors, configured per machine and gitignored. Apply `supabase-production` § Applying a migration for the commands.
- **Then verify, don't assume:** the CLI's connection string names the development target and answers, the agent connection, where there is one, answers about the same one, nothing is linked, the development database has no tables, `.env` has no placeholders.

**How:** the `clerk-production`, `supabase-production` and `environments` skills.

---

## 5 — The first real slice

**Produces:** sign-in that lands on the member home, which sends a signed-out visitor to sign-in and back; workspaces; the first migration; the member's own resources; the public surface, if there is one — from the screen down to the table; the signed-in browser suite, with each journey of the slice as a test; and the core docs. It is the long stage.

**Done when** a person can:

- sign in as two members of different workspaces and **not see each other's data**;
- take the public action from a phone without an account, where there is an anonymous public;
- take the product's **once-only action and be refused it a second time** (for a live Q&A product: join a room, ask, upvote, and be refused a second upvote);
- submit `<script>alert(1)</script>` and **see it as text**;

— and each journey of the slice has a committed end-to-end spec, whose signed-in steps sign in through the provider's own component on its development instance, with an account per role. The signed-in suite **passes twice in a row**, as two separate invocations with their setup and teardown (a suite that only passes on a clean database is not a suite), and the public suite still passes without any identity variable. The architecture, flows, permissions and variables docs and the coverage map describe the slice (`shipping-artifacts`), and false doc lines are corrected. The coordinator's touched and new tests pass, and the plan's line records completion against this done-when. Nothing is deployed yet, so the release checklist is not owed.

**Doing it well**

- **When the product's content arrives from an integration** (events, traces, imports), the slice ships example data a workspace can load and remove, filling every screen: a product that starts empty can't be judged. (`2026-11-03`, an evals product's owner, at the first click-through: "Is the only option to see something generating data externally? … please allow demo mode.")
- **Stop if the setup does not point only at development.** Verify the CLI's connection string names development and nothing is linked, the optional read-only MCP answers about the same standalone project, the development database has no tables, and `.env` is filled. If development is a branch of production, ensure no MCP connection was configured for it.
- **Plan in one page; wait only for unresolved owner decisions.** The plan names the workspace table (keyed to the organization, or in the individual shape to the user), the authorization functions and the first migration.
- The first migration is applied by the CLI with the target spelled out, named after the version the migration ledger records.
- **The screens keep their shape;** what changes is where their data comes from and how people authenticate. Use the identity provider's own components, dressed to the design, never rebuilt.
- **Implement each slice journey once, then keep rerunning it through the gate.** Include multiple simultaneous actors where the product has them, such as a desktop member and anonymous phone users sharing a resource. Mocking the session does not test sign-in; paid or real-inbox steps stay in live or operator suites, with surrounding steps gated. Apply `test-harness` for setup, resets and separate browser configs. (`2026-11-14`, an evals product: stages 0–5 and six later stages passed 77 reviews and nine development deploys with no running-app browser test.)
- **In the organization shape**, the harness's global setup creates an organization per test account and lands it past the choose-organization screen, and gives each further role its membership in the first account's organization, so the journeys run as real members with different powers. **A sign-in that succeeds and a wait for the member URL that times out anyway is the symptom of a harness that did not.** In the individual shape there is no such screen and no second role: each test account is its own workspace.
- End with one summary: what exists, what the tests cover, what was left out, and how the owner checks it by hand.
- **Checking by hand without inboxes:** a Clerk development instance accepts any address shaped like `you+clerk_test@example.com` with the test code (observed 2026-08-31), so one person can be two members. "Phone" means the browser's device mode until there is a deploy.
- The example prompt for this stage also asked for a pass over the agent instructions at its end (the `agent-instructions` skill): it is the stage where the instructions first meet real code.
- **Then keep going.** The session does not end at the first summary: the owner uses the thing and asks for what is missing, as a flat list — each item what should happen, not how to build it ("Closing a room should block anonymous participants only; I should still be able to open it and reopen it"). That is the normal working mode from here on.

**How:** the `saas-authorization` skill (workspaces, the three functions, invariants as constraints, the threat model), `supabase-production`, `clerk-production`, `test-harness`.

---

## 6 — Browser proof

**Produces:** the permission matrix proven in the browser, by extending stage 5's suite: who may do what, what is refused, and what is not built yet.

**Done when:** every row of the matrix is exercised by a real member of its role; every page renders, refuses or sends to sign-in as its row says, for each role, a member of another workspace and a signed-out visitor; the coordinator's touched and new tests pass; the test docs and the coverage map describe the proof; and the permissions document holds a matrix the owner has read and a "not implemented yet" section the owner believes. Its dashboard part moved to stage 4.

**Doing it well**

- **Read the permission document against intent** — the part to slow down for. The matrix is the base for every future test and every automated code review; without it the agent cannot tell a bug from a feature. Two questions per row: *is this what I wanted?* and *does the code actually do this, or does the document only say so?* Unresolved permission-policy choices go to the owner as decisions; while the owner's read is pending, this done-when stays open without holding the next stage. A permission that exists in the model and is held by nobody belongs in "not implemented yet", not in the matrix as though it worked. A wrong row is fixed by a sentence ("a moderator should not be able to X"), and the agent changes the code and the document together.

**How:** the `test-harness` skill (the authenticated mile), `saas-authorization` (the matrix), `shipping-artifacts` (the permissions document).

---

## 7 — Publish

**Produces:** the repository on the code host, the first deploy with its environment, and `/health`. Still the development identity instance and the development database, no custom domain. **The URL is shared with nobody yet:** sign-up is open and the terms and privacy pages are placeholders until the front door.

**Done when:** the full gate, both browser suites included, and the phase review series passed before the deploying push; the deploy is green; the deployed `/health` reports the database; and the owner can sign in and use the app from a phone that has never seen their laptop. What of this holds stage 8 is in `SKILL.md` § Find the stage you are in.

**Doing it well**

- **Start the product's history at one commit holding its starting point** (starting from a template repository on GitHub, its *Use this template* button, not a clone). That commit is part of the product, so every review of the whole product includes it (`--subject HEAD`, `independent-review` § The subject). A folder whose history began in another repository (a clone or a fork: its first commit, `git log --max-parents=0 --format='%h %an %s'`, is not the product's) takes the same `--subject HEAD`; its tags and branches are that repository's, not the product's releases (`independent-review` § The subject). Its first push goes only to the repository the owner made for the product (the owner's part, below), never the one it was cloned or forked from.
- **Name the product branch at the first push**, in the release procedure, with the production branch's name (`<name>-prod`) for later.
- **Keep the host's build configuration in the repository**, and add nothing to it that the dashboard could drift from. Without a build command Netlify publishes the repository root as static files, and a repository root has no `index.html`, so every page 404s.
- **`/health` answers only when the configuration parsed and the database replied**, so one request says which half is wrong. Open it before anything else.
- **The host's environment** holds the set the app refuses to boot without, secrets marked secret. A public key compiled into the browser bundle is needed **at build time**, not only at run time. **`APP_URL` is the one that is easy to skip**: nothing local needed it to be right, the build goes green without it, and every request still fails — and it is the base for the share card, `robots.txt` and the sitemap, so a deploy that leaves it unset emits URLs that resolve nowhere but the machine that built them. Test variables do not belong on the host; nothing on the server reads them.
- **The completed phase gets its review series before the first deploying push** (the `independent-review` skill's subject rules cover the whole phase), because the host builds what you push; push the commit that round cleared (the `independent-review` skill).
- **No uptime monitor yet**: a development deploy nobody uses has nothing to watch. It is proposed once go-live's done-when holds (stage 9). (`2026-11-03`, an evals product's owner, of a monitor on development: "just a link in the footer".)
- **A worker deployed against the development database is scoped away from the test accounts' workspaces, or the suites move to a database of their own, before it starts** (`test-harness`).
- **When the build fails, read the log from the top.** "No config file was defined", a build command you did not write, or a type error in a file you fixed days ago all mean the host is building a commit that does not have your work: **the branch is not pushed.** From here, **committing is not publishing**: a commit is local, a push is what the world sees — and every push to this branch is now a deploy, so it gets a review round first.

**The owner's part:** the product's repository on the code host, private unless the owner wants the code public: the one *Use this template* made, when the product's first commit is that button's; otherwise, a clone or a fork included, new and empty, with nothing added when it is made (no README, licence or `.gitignore`), so what the first push sends is all it holds; the host's site and its environment, or a token the agent sets them with (time-boxed on Netlify, whose tokens reach the whole account: `environments`, `references/domain-and-provider-access.md`); and nothing for monitoring yet.

**How:** `release-gate` § Deploying pushes and production promotions, `environments` (branches, variables), `independent-review` (the round).

---

## 8 — The front door, roles and plans

**Produces:** three blocks, selected by the shape:

| Block | Applies when |
|---|---|
| **A. Organizations and the second role** | the workspace model is *organization* |
| **B. Billing** — paid limits and the pricing page | billing is the provider's billing, in the organization shape; skipped with *none* |
| **C. The public front door** — landing and legal | always |

**Block C never moves behind the product's further feature phases** (`SKILL.md` § Order the work by what the owner will see). Its screens were built at stage 3 on sample data; here they become true: the landing, and the legal pages written from the code (`legal-pages`) and approved. **Sample prices never reach a page a stranger can open.** A plan may split the stage, block C first, block B before go-live and block A once the product is worth it; block C then takes stage 3's pricing display down (the page, its links, any plan card, and every sample price in the source), and the public pages name no price until block B builds pricing from the billing file. A landing that names no price shows no plan cards, an analytics tag or not; plan cards come with block B, read from the billing file (`product-analytics`). When the owner already runs a product on the same stack, start from its front door.

**Done when** — read block by block: *(A)* organization boundaries and both roles are enforced server-side, and the second role's actions work on every surface that shows their effect; *(B)* every plan limit is enforced under concurrency, every capacity derives from the plan module, and signed-out visitors can read pricing from the billing file without an account; *(C)* signed-out visitors get the finished landing and legal pages, their text approved by the owner, **on a phone**, and, before block B, no price, pricing route or plan card; a pasted link renders a preview card; nothing reached by an unguessable id is indexable; and the coordinator's touched and new tests pass.

**The owner's part, first:** with blocks A and B, some of the work is **dashboard settings the agent cannot create, and each one silently changes what the code is allowed to do.** Do them before the build.

- **Organizations before billing.** Clerk keeps user plans and organization plans in two separate tabs, their slugs are scoped per tab, and a plan cannot be moved between them after it is created (observed 2026-09-03). Enable billing first and you build your plans in the wrong tab and build them again.
- **Check that membership is still required** rather than assuming it: from here that setting is load-bearing, because the organization a person is in is the workspace that owns their data.
- **The second role:** rename the provider's default member role to the product's second role (its name and key, e.g. a moderator), or keep the default where the second role *is* a plain member. Leave the admin role alone — it is what the creator of an organization gets, and an instance cannot be without it. Roles exist only inside an organization; there is no personal-workspace path to add in this phase — that is the individual shape, declared before setup, not grown here.
- **Do not define the provider's own permissions, and never attach a billing feature to one.** The product's permissions are strings in its own code, mapped from roles. With billing on, Clerk gates its permissions by feature, so a lapsed subscription would silently take a capability away — for a live Q&A product, a moderator's right to approve, leaving every question in a live room pending forever. **Roles decide who may act; features decide how much.**
- **Plans:** Free and one paid tier, in the organization tab, even before the product means to charge, because the plan module and pricing page are where the limits are stated. **Free carries nothing the code reads; Free is the absence of the paid features.** **Name a feature for what the paid tier adds, never for what the free tier has**: a slug mistyped, renamed or forgotten can then only cost somebody something they paid for, never grant anything. **The plans live in a billing file the provider's CLI applies**, where each feature's key is the slug the code reads; the gated features stay hidden from the pricing table, and each plan's visible lines are display-only features no code reads (Clerk, `2026-10-23`). Built by hand in the dashboard instead, a feature's slug is derived from its display name: "Up to 1,000 participants / room" slugs to `up_to_1_000_participants_room`, which matches nothing, and every paying account silently drops back to Free (observed 2026-09-03).
- **Should the second role be a paid feature?** The obvious form is a trap: gating the *act* on a feature means a lapsed card stops the act at the worst moment. To sell team size, sell it where it fails safely — a **seat limit on the organization plan**, which the provider enforces at invite time with no code.
- **Prices are the owner's**, written once in the billing file and applied by the provider's CLI. Application code never holds one: checkout is the provider's own table, the charge is the provider's, and a unit test refuses any currency literal in the app's source.
- **The identity provider's CLI** is signed in by the owner for the billing apply and its read-back, and signed out (`npx clerk auth logout`) once both are done: its session reaches every instance in the account, production included (`environments`, `references/domain-and-provider-access.md`).
- An optional public contact address stays empty until the mailbox exists; the legal pages then show the postal address alone, which is honest — an address that bounces is worse than none. Every contact detail the legal pages must give (`legal-pages`, rule 9) works before the front door is shared.

**Doing it well**

- **Gate on features, never on plan names and never on roles.** A caller holding no paid feature is on Free, and a missing or renamed feature fails towards Free. Limits are enforced inside the transaction, under concurrency (the `saas-authorization` skill).
- *(B)* **The provider's pricing table is checkout, on the pricing page, signed in or out.** Signed out it renders the cards with prices and no buttons, so the page supplies its own call to action, and a short server-rendered summary above it takes its capacities from the plan module the code enforces. The landing shows the same table, or plan cards of its own read from the billing file (`default-choices.md`, pricing), and only its own cards once it carries the analytics tag (`product-analytics`, rule 5).
- **The landing page is the same for every visitor and reads no session** (`default-choices.md`, the front door). Focus it on the members who will run the product; cover who it is for, the core benefit, the jobs and pains, a clear before and after, and the practical objections (no installation, any browser, and — only with billing — what the free plan includes). Research comparable products to sharpen the claim, but do not name competitors on the page.
- **Every public page is phone-first; assert the layout, not just the DOM**: one column at a phone width, no sideways scroll. **The public pages share one navigation**: a visitor who looks at the price, once there is one, must not lose the way in.
- **Legal pages** (the `legal-pages` skill): footer links to terms and a privacy policy written for the jurisdictions the product serves. When another product by the same company already has legal pages, start from them: keep the company's boilerplate, rewrite everything about processing from this product's code, and add a unit test that fails when the code reaches a provider the policy does not name. Essential cookies only.
- **Sell only what runs.** Read one launch list on every selling or promising page, show unbuilt items as *Coming soon*, and pass its standalone test before billing or promotion (`release-gate` § The paid-launch check). (`2026-10-23`, a monitoring product's paid plan was found selling four capabilities that were not built.)
- **Every sentence of the legal copy matches what the code does today.** The privacy policy names an analytics tool only in the change that adds its tag. (The live Q&A product's original ask requested the analytics sentence before the tag existed — exactly the overclaim this rule forbids.) A privacy policy is the one document where a confident guess is a legal problem: every claim in it should be traceable to a table, a cookie or a script. Once the pages are live, turn on the identity provider's express consent to legal documents with their URLs, so the sign-up form carries the checkbox.
- **Search and sharing:** an absolute metadata base, a title and description per page, a canonical per indexed page, a file-based preview image per segment, and the card asserted on the raw response body (`default-choices.md`, share cards). **Keep every resource reached by an unguessable id out of `robots.txt` and the sitemap**: its id is the only thing protecting it, so a crawler that indexed one would turn an unlisted resource into a search result while it is still open.
- Use the providers' development and test modes for test users, invitations, roles and subscriptions; **never create a real charge.**

**Check by hand the things a test cannot see:**

- **The paid tier really grants more** *(block B)*: subscribe through the pricing table in test mode (Clerk's development billing takes the card `4242 4242 4242 4242`, never a real one), then do the thing the paid tier adds, in the browser and, where the product has them, through an API token. Cancel, and check that both keep the paid features until the period's end. If it is refused, the plan sits in the user tab instead of the organization tab, or a feature slug does not match — check the plan's payer type in the billing API and compare the slugs with the literals in the plan module. If only the token is refused, its entitlements are read from the subscription alone (the `clerk-production` skill).
- **The front door on a real phone**, not a resized window. A responsive rule that never fires — wrong breakpoint, wrong nesting, a block that ended up inside a `@keyframes` — leaves every DOM assertion green while the page is unreadable on the device it was written for. (`2026-09-04`, a live Q&A product shipped one and a screenshot caught it; the suite now measures left edges and overflow rather than visibility.)
- **A pasted link**: drop the site's URL into a chat and look at the card. An empty one usually means `APP_URL` is unset on the deploy, so the image URL resolved to localhost.

Then **read the permission document again**, as in stage 6. With block A it has grown a column for the second role and rows for its job; the questions are the same.

**How:** `clerk-production` (organizations, roles, billing), `saas-authorization` (roles versus entitlements, quotas), `ui-design` (what a screen may claim), `test-harness` (layout assertions, raw-response cards), and `default-choices.md` for the front door, pricing, legal and share-card defaults.

---

## 9 — Go live

**Produces:** production resources, separate from development — the identity provider's production instance with its own keys, email DNS and legal consent on; a real payment account connected to billing and the billing file applied to production, when the product bills; a production database with every migration applied through the CLI against production's own connection URL, the CLI never linked, and the ledger read again (the `supabase-production` skill); the host's production environment with **generated secrets generated afresh, never copied from development**, set only at the promotion, after the product branch is pinned to development values — and the production branch, with the custom domain on the production site. Each dashboard change gets its screenshot.

**Enter it** when the owner says the product is ready for a real audience, after the front door and its legal pages are live.

**Done when:** the production URL serves the reviewed commit (probed by something the release both adds and removes), every runtime beside the app runs production's build on production's keys, `/health` answers ok, the served pages carry the identity provider's production publishable key (`pk_live_` on Clerk), a stranger can sign up on a phone with the legal consent shown and that account is read back in production's identity instance and database, every token belongs to one environment, is scoped and recorded, the time-boxed ones revoked and the identity provider's CLI signed out, and production's secret keys made for the setup are deleted, or, where it used production's own, those are rotated (`environments`, `references/domain-and-provider-access.md` § Before the first users), nothing sold is unbuilt (production billing waits until that holds), the legal pages match the code, their test green and their text approved by the owner (`legal-pages`), no doc still describes production as unbuilt, and the environment record holds the verified production mapping with its date. The same list is the `release-gate` skill's go-live.

**Doing it well:** the first release's review covers the whole product, with `--subject HEAD` (`independent-review` § The subject), and runs **before** the production branch exists; the whole-repository audits are proposed. On the owner's **go**, creating the production branch from the commit the round cleared *is* the promotion, in the order the `release-gate` skill's go-live step 3 gives: apply what is pending, pin the product branch to development values, create the production branch, set production's values and deploy again, then attach the custom domain to the production site if it isn't there yet. From then on the product branch never builds with production's values: give its deploy context the development values, or build it on a development site of its own (the `environments` skill). Otherwise it starts writing to production. Hosted CI is proposed as its own change.

- **Once the done-when holds, propose the uptime monitor** (the `uptime-monitoring` skill; Staygreen, made by this collection's author, unless the owner already uses another service), on the owner's go: a monitor on production's `/health`, who gets paged, and a status page the owner chose before it was created: public by default, linked from the footer of every page and opening in a new tab, or members-only, or none. The footer link is its own change, reviewed and released like any other once the status page's address exists. The monitor is needed either way: where creating it would publish a page the owner declined, the owner creates that part on the service's dashboard. Record it in the integration notes with a screenshot. A production deploy nobody watches is a deploy that is down. The owner's part: the monitoring service's account, the alert channels only a person can add, and the part of the monitor whose creation would publish a page the owner declined (`uptime-monitoring`, steps 4 and 5).

**The owner's part** — the clicks that commit the account (`environments`, `references/domain-and-provider-access.md`): the zone and its nameservers, DNSSEC off first; the production database project (`supabase-production`); the production identity instance, its own OAuth client for each social sign-in, its legal-consent switch and, when the product bills, the payment account connected (`clerk-production`); every token the agent uses, made and recorded as § Who holds what there says; the identity provider's CLI, signed in for production's billing apply and its read-back and signed out once both are done; the setup's own secret keys, made for it; the time-boxed tokens revoked and those keys deleted once the rest of go-live's done-when is checked; and the go each production step waits for (`release-gate`, go-live).

**How:** the `release-gate` skill (go live), `environments`, `supabase-production`, `clerk-production`.

---

## 10 — Every release after

**Produces:** the release checklist with evidence, the independent review over the whole unreleased range, the audits proposed on the release's changes, the owner's **go**, the promotion, and the checks after it. At each release the agent instructions get their pass (the `agent-instructions` skill), the plan's status is brought current, the previous release's narrative moves to the history, and finished stage briefs move with it.

**Done when:** the post-promotion checks pass.

**How:** the `release-gate` skill; `independent-review` for the review loop.

---

## 11 — What comes next

**Produces:** a proposal, not a build. The agent proposes the capability whose trigger has fired (`capabilities.md`), the owner says go, and the next phases go into the plan — each stage with its own done-when. There is no default stage here and no example prompt, on purpose: what the later phases hold depends on the product.
