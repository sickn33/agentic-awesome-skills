# Product shapes — what a product declares first, and what each shape skips

Every stage after the brief reads the shape the product declares in its product section. The stages stay the same for every product; **a part of a stage the shape does not have is skipped, never the stage.** Declare the shape at the brief stage, before setup: the workspace model in particular decides how the identity provider is configured and how the workspace table is keyed, and is not something a product grows into halfway.

## The declarations

- **Workspace model** — *organization* or *individual*.
  - **Organization** (the default): every workspace is one identity-provider organization — a solo user's included, as an organization of one who never has to know the word. Roles live inside it. On Clerk, *Membership required* goes on at setup, before the first migration.
  - **Individual**: the workspace row is keyed to one identity-provider user. No organizations, no organization management, no second role.
  - Either way **everything belongs to a workspace, and nothing but the workspace table references the provider's organization or user id**, except one member table where the product records authorship. The product keys on its own row, never on a vendor's id. That is what keeps a change of identity provider a migration of one table, or two — and leaves an individual product a path to organizations, by changing that row's key rather than every domain table. (The model itself is the `saas-authorization` skill's.)
- **Billing** — *the identity provider's billing* (the default; on this stack Clerk Billing: the workspace pays through the provider) or *none*, for a product the owner makes free. A product charges its first real users otherwise (`propose` § 5). Every billing procedure behind this skill was proven on organization plans. **Billing in the individual shape (user plans) has not been built yet, so a product that charges takes the organization shape until a product writes and proves that recipe.**
- **Anonymous public** — *yes* or *no*: visitors who act without an account, identified by an anonymous token.
- **Embedded agents** — *yes* or *no*: Claude agents inside the product.
- **Member home** — the route sign-in lands on: `/dashboard`, or the product's own noun.

Then **the reopened defaults**: name every default choice (`default-choices.md`) this product changes — the choice, the trigger that fired, what replaces it, and the dated decision-log entry that holds the options and the reasoning. If it changes none, say so in one line.

## What each shape skips

- **No anonymous public** — every user signs in. Skip the anonymous-token half of authorization, its cookie secret variable, the anonymous half of the public browser journey, and the public-surface edge rule. The public surface is the landing and legal pages, plus pricing where the product bills.
- **Individual workspace model** — the workspace is one user. Skip organizations at setup, the organization half of the authenticated harness, the second role and organization management. The permission matrix has one member actor. The member still holds named permissions, and every action still checks one, so a second actor or a later move to organizations has a gate to meet.
- **No billing** — skip plan limits and every entitlement, and build no pricing at all: no pricing table, no pricing page, no Pricing link, no plan copy on the landing page. The landing and legal pages still land. A product with no billing has no entitlement code at all.
- **No surface that changes while a person watches it** — skip the polling feed.
- **No embedded agents** — skip everything about agents: their host, their cost ceilings, the live-model test run at release.
- **No public `POST` surface** — one edge flood rule, not two.

## The individual shape, as proven

Proven by a product on this stack (`2026-10-11`), without billing:

- The workspace row is keyed to the identity provider's user id and **created on first sight by an idempotent `ensure_workspace`**: the id's shape checked (`user_…` on Clerk), `insert … on conflict do nothing`, then a select.
- It is called from **the one session seam**, which requires the provider's two reads of the caller (`auth()` and `currentUser()` on Clerk) to name the same user, and reads an email only when it is the verified primary one.
- An integration test proves **one row under concurrent first calls**.
- The row is created on the first visit to the member home, never on `/`.
- The authenticated harness without organizations: each test account is its own workspace (the `test-harness` skill).
- Still open: its workspace reset is not yet proven, and it cannot bill (above).

## Which shape to propose

- A product with teams stays an organization.
- A solo product may be either. Organizations of one cost an onboarding task in front of the app (the choose-organization screen) and a harness that lands test accounts past it, and buy one workspace kind, one role set and one billing tab. The individual shape needs no organization management, no second role and no onboarding task, but cannot bill yet on this stack.
- The organization shape is the default: it stands until the product section declares otherwise. The choice is the owner's, recorded in the decision log like any other with real options.
