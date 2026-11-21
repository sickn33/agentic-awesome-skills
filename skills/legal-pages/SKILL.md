---
name: legal-pages
description: 'Privacy policy, terms, a cookie banner, consent at sign-up, a public front door: legal pages drafted from what the code does, held to it by a test, with the owner''s facts and sign-off.'
risk: safe
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

# Legal pages: drafted from the code, held to it

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Privacy policy, terms, a cookie banner, consent at sign-up, a public front door: legal pages drafted from what the code does, held to it by a test, with the owner's facts and sign-off.


**Draft legal pages from what the code collects, stores and sends.** A confident guess can promise a deletion the code does not perform. Build the pages alongside the product, with a test that fails when they diverge. The owner supplies facts only they have and approves the text. This method keeps legal text true; it is not legal advice. The owner, or their counsel, decides what the pages say.

## When it applies

- **Write the pages before the first stranger is asked for anything.** During the build, this includes a sign-up, an email address or a payment. The pages land with the public front door, and until then the deploy's URL is shared with nobody (for a SaaS, stage 8 of `app-lifecycle`). Before that, a placeholder behind each legal link says the text comes before launch and holds no sentence of policy, so it promises nothing the code must match.
- **Change the page in the change that alters what it describes.** This includes providers, analytics tags, cookies, retention jobs and model providers reading what people type. The page changes in the same change, never before it and never after.
- **Check pages against code at go-live and as intent at review.** Apply `release-gate` for the go-live check and `intended-vs-implemented` to read them as documented intent at review. Neither is where they are written.

## What binds

1. **Every sentence matches what the code does today.** Each claim traces to a table, a cookie, a script or a provider call, and nothing describes a tag, a job or a feature still to come. The policy names an analytics tool only in the change that adds its tag.
2. **Draft from an inventory of the code, not from a template.** List what is collected and from whom, where it is stored and for how long, and every provider it reaches, from:
   - the environment schema's providers and the server's outbound calls;
   - the Content-Security-Policy's origins, which name every third party a browser page may reach;
   - the tables that hold personal data, and what each column is for;
   - what a visit stores in the browser: a browser test reads the cookie jar, `localStorage`, `sessionStorage` and IndexedDB after every public page;
   - the scheduled jobs that delete or expire data;
   - what people type to an embedded agent, which reaches the model provider under its own retention terms.
3. **When another product by the same company already has legal pages, start from them.** Keep the company's boilerplate (controller, rights, supervisory authority, governing law, accounts, acceptable use, payment, liability) and rewrite everything about processing from this product's inventory.
4. **A unit test pins the pages to the code.** The policy's list of providers lives in code beside the pages, and the test fails when the code reaches a provider the list does not name, or when an area the pages call unbuilt ships.
5. **Sell only what runs.** Use the one launch list for the plan table, terms, policy and footer. Mark unbuilt capabilities *Coming soon*, test both flag states, and keep production billing off while any sold capability is unbuilt. Apply `release-gate` § The paid-launch check for the list and test.
6. **No page promises a deletion no job performs.** A retention period on the page needs the job that enforces it, idempotent and with no public endpoint; until it exists, the gap is logged in the backlog and the page promises nothing.
7. **Use only essential cookies unless the visitor accepts the others.** Read § Consent and cookie disclosure before adding a non-essential cookie or a tag that requires consent.
8. **Require express consent to the terms and policy at sign-up.** A new account accepts the terms and the policy before it exists, through the identity provider's own setting where it has one (on Clerk, *Require express consent to legal documents*, switched on by the owner; `clerk-production`). Each page carries its last-updated date.
9. **Publish a contact address only once the mailbox exists.** An address that bounces is worse than none. Where established in the EU or UK, the operator must provide an email address allowing rapid contact. The e-Commerce rules require it (Directive 2000/31/EC, Art. 5(1)(c); UK SI 2002/2013, reg. 6(1)(c)). Where selling to EU consumers, provide the geographical establishment address, a telephone number and email address before the consumer is bound. This applies wherever the operator is established (2011/83/EU, Art. 6(1)(c), amended by 2019/2161, also covering services paid for with personal data). Then the mailbox exists, and the number answers, before the front door is shared with anyone; elsewhere, ask counsel before showing the postal address alone (`environments`, optional feature switches).
10. **The pages are public and read no session.** They render the same for everyone, signed in or not, and every page links to them in its footer, the sign-up included.

## Consent and cookie disclosure

**Get consent before loading a tag that requires it.** Sign-in, theme and security cookies serve essential functions. Analytics, advertising and most chat widgets can add non-essential cookies. Show a consent banner for any non-essential cookie or other tag requiring consent. Load the tag and other non-essential resources only after acceptance. Make refusal as easy as acceptance and let visitors change their choice later from the footer.

**Disclose each cookie in the change that adds it.** Name who sets it, its purpose and its lifetime in the policy. Prove that nothing covered by consent loads before acceptance. Analytics runs without cookies by default. The owner decides with counsel whether a cookieless tag still requires a banner where the product is offered. Apply `product-analytics` for vendor settings and browser proof.

## What the owner does by hand

**Ask the owner for each fact and approval by name.** The agent drafts, inventories, writes the test and wires the links. These remain the owner's:

1. **Ask for the controller's full legal identity and addresses.** Get the legal entity's full name, its registered address and the address it operates from where that differs, and, where one exists, its company number.
2. **Ask for a working email and any required telephone number.** Get an email address that receives mail, required in most cases, and a telephone number where the product sells to consumers in the EU, or is offered to them for personal data used beyond running it (rule 9).
3. **Confirm each provider's account, storage region and processing agreement.** For each provider the inventory found, confirm the account it runs under, the region its data is stored in, and that its data processing agreement is accepted (usually a click in its dashboard). A provider that acts as its own controller, as Microsoft says Clarity does, has no such agreement: the policy names it as a recipient acting as a controller, and counsel decides how the product's own role is described (`product-analytics`).
4. **Ask where the product is offered and which law governs.** Ask for the supervisory authority too.
5. **Ask how long each kind of data is kept.** The agent then builds the job the period needs (rule 6).
6. **Have the owner enable consent in the identity provider's dashboard.** Use its consent setting (rule 8).
7. **Have the owner read and approve the full text.** No URL a stranger is given serves the text before that approval.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The test fails for an unnamed provider; every public-page visit leaves only essential cookies and no stored browser id. Phone sign-up requires accepting the terms and policy first, and the owner approved the text with their own facts.

Related skills:

- `product-analytics` (cookieless analytics, and what changes when a cookie comes in)
- `app-lifecycle` (where the front door sits on the path)
- `release-gate` (the go-live check that the pages match the code)
- `intended-vs-implemented` (the pages read as documented intent at a review)
- `environments` (what is held about people, data that expires)
- `clerk-production` (the consent setting, the CSP)
- `ui-design` (what a screen may claim).

## Example

If analytics starts only after opt-in, record the active vendors and events from configuration and draft the privacy copy for counsel to verify.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/legal-pages).
