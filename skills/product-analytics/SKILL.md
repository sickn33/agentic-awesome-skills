---
name: product-analytics
description: 'Adding analytics, session recordings, heatmaps, ''what did users do'', Clarity or PostHog: behaviour analytics without analytics cookies, read back by the agent.'
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

# Product analytics: what people did, without analytics cookies

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Adding analytics, session recordings, heatmaps, 'what did users do', Clarity or PostHog: behaviour analytics without analytics cookies, read back by the agent.


**Start the next round from what people did after release.** Look at clicks, stopping points and things people never found. Set up analytics without analytics cookies, keeping only essential cookies, and let the agent read the data without asking for screenshots.

Every vendor fact carries the date it was read.

## The default, and the option

- **Default to Microsoft Clarity with cookies off.** Session recordings, one page each without cookies, and heatmaps, free, with the project's cookies switched off and storage consent denied from the page, so Clarity sets no cookie and cannot follow a visitor between visits. Not on a product aimed at people under 18, where Clarity says it shouldn't be used (Clarity's FAQ, read on `2026-10-29`).
- **Get the owner's consent decision before enabling a cookieless tag.** The EDPB reads ePrivacy Article 5(3) as covering scripts that have the browser send information (Guidelines 2/2023, § 33). Ask the owner to decide with counsel whether the tag requires consent where the product is offered, and never state it as settled. Follow § Consent decision and analytics proof.
- **Add PostHog when the question needs events.** Read `references/posthog.md` for anonymous, cookieless landing-page funnels and counts within a day. Queries count toward ordinary usage and AI-backed tools may incur charges. Retention, per-account use and experiments need an id that lasts (`identify()` or a stored id), which PostHog says makes it personal data and undoes cookieless mode. Ask the owner separately before adding a persistent id or expanding past the landing page, and build and review each as its own change. Apply `legal-pages` § Consent and cookie disclosure before adding cookies or any tag that requires consent.
- **Start with Clarity on the landing page (rule 5).** Both can run; add PostHog when a question names an event.

## What binds

1. **Off without a project id.** An empty id means no script, no request and nothing to consent to (`environments`, optional feature switches). Development leaves it empty, so the owner's own testing never lands in the data.
2. **Clarity's two halves, and only one of them is code.**
   - **Have the owner switch the project's cookies off.** Switch the project's cookies off in the dashboard, putting it in consent mode. Screenshot the setting when it is set.
   - **Define Clarity's queue and queue denial before the tag runs.** The agent adds a script before the tag: `window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments) }; window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' })`. Called before the queue exists, the denial throws, and nothing else notices. Clarity then gives each page view its own id, writes no `_clck` or `_clsk` cookie, and cannot follow anyone between visits.
   - **Read pages, flows and stopping points, not visitors or pages per session.** Without cookies each page view is its own session and every visitor counts as new. Since 31 October 2025 Clarity also applies consent mode by default to visitors from the EEA, the UK and Switzerland; the page's own denial makes every visitor the same, wherever Clarity places them (Clarity's docs, read on `2026-10-29`).
   - **Test the denial and measure storage with the tag running.** A unit test fails if `granted` appears anywhere in the component or denial is not queued before adding the tag's script. With the test project's id (§ What the owner does by hand), a browser test first proves that script loaded. An unknown id gets an empty answer and loads nothing. Then visit every tagged page and read the cookie jar, `localStorage`, `sessionStorage` and IndexedDB. The privacy policy promises both halves, and a person can flip the dashboard setting. Where the local gate runs no vendor, the browser test is guarded live (the `derive-tests` skill: behind an explicit flag), skipping loudly without a test id, and the `release-gate` checklist runs it at each release that touches a tagged page or the tag. On production, the page's half is the same build the unit test held, and the dashboard's half shows only in the dashboard, so its screenshot is the evidence (§ What the owner does by hand, step 2).
3. **Add the analytics policy sentence with the tag and gate its rendering.** Render it only when the project id is set, so no deploy names a tool that does not load. The legal test pins both states (apply `legal-pages`; `ui-design`, `references/screens.md`).
4. **The Content-Security-Policy admits the tool's origins only once it is wired.** Apply `clerk-production` for the CSP. Clarity's docs name `*.clarity.ms` and `c.bing.com` (read on `2026-10-29`). For PostHog, use `references/posthog.md`.
5. **Tag only the landing page, as a document of its own.** Default to a standalone static landing document served outside the app's client router. Clarity follows the browser's same-document history and records page addresses and referrers (`references/shared-app-router.md`).
   - **Load the tag only when its inputs are safe.** Tag the static landing document only at `/` with an empty query and fragment. Require an empty referrer or an origin-only HTTP(S) referrer, and keep sensitive values out of links on the document. Leave the tag off when any check fails.
   - **Open every exit as a full document load.** Use native links and forms for routes out of the landing document. Send `Referrer-Policy: strict-origin` across the site and verify the raw response on the landing page and a page reached through an id (apply `clerk-production` for the headers).
   - **Prove isolation with the tag running.** Verify a clean arrival starts the tag, then test that the query, fragment and unsafe referrer cases leave it off. Follow every same-origin link and submit every form that leaves the landing document. Assert a full load and no requests from the destination to the analytics host or its proxy path. Check sign-out, Back and reload for the same boundary.
   - **Use the shared App Router only when the owner chooses it.** Follow `references/shared-app-router.md` for that setup. Keep its checks for same-document history, URLs, referrers, exit links, identity-provider imports and the paths the browser test walks. Keep the tag off where isolation cannot be proved.

   **Tag another page only after the owner decides.** Use the tool's strictest masking and state it in the policy.
6. **The agent reads the data back itself.** Use the vendor's MCP server. The agent uses a token the owner made (§ Reading it back). The token is an operator value, one per environment, never in the app's runtime (`environments`).

## Consent decision and analytics proof

**Prove the analytics tag follows the consent choice.** Apply `legal-pages` § Consent and cookie disclosure for the banner, footer control and policy. Include them and the vendor settings below when explaining the change to the owner before adding a non-essential cookie. A unit test fails if the tag can load before consent. A browser test proves its scripts, requests and storage stay absent before acceptance and after refusal. When acceptance gates a cookieless tag, still queue storage denial before it starts and prove it runs cookieless.

**List the owner's dashboard steps by name for the tool.** Include the setting that turns cookies on if they are being added, the applicable data processing agreement, the data region and the retention period.

## Reading it back

**Read the data, answer the question and weigh it against each hypothesis.** Apply `propose`. Clarity's server is the vendor's own (read on `2026-10-29`). Add it at user or local scope, never to a committed MCP config, because the credential travels with it.

- **Read Clarity through Microsoft's own local MCP server.** Use Microsoft's `@microsoft/clarity-mcp-server`, run locally with `npx`. It reads the owner's API token from the `CLARITY_API_TOKEN` environment variable (version 2.0.1, read on `2026-10-29`), so the owner, with that variable loaded from the operator's file, adds the server in their own terminal as an environment value, never an argument: `claude mcp add -e CLARITY_API_TOKEN="$CLARITY_API_TOKEN" --scope user clarity -- npx -y @microsoft/clarity-mcp-server`. That leaves a plaintext copy in the owner's Claude Code configuration (`~/.claude.json`), so list it in the variables doc's copies table, and a rotation removes the server (`claude mcp remove --scope user clarity`) and adds it again with the new value (`environments`). Nobody pastes the token into the session. Its tools query the dashboard's metrics, list session recordings, and search Clarity's documentation. Clarity's export answers ten requests a project a day, about the previous one to three days, so a weekly read is seven daily reads, each kept in the repository's notes as counts and paths, with every id in an address replaced by `:id`; the agent spends the ten on the question asked, not on browsing.
For PostHog, follow `references/posthog.md` § Reading it back.

## What the owner does by hand

**Ask the owner for each dashboard action and decision by name.** The agent wires the tag, denial, tests, CSP and policy line. These remain the owner's:

### Clarity
1. **Create a Clarity project for the production site.**
2. **Switch Clarity's cookies off and screenshot the setting.** Use Settings, Setup, Advanced Settings, *Cookies*.
3. **Create a second Clarity project solely for tests.** Switch its cookies off too; its id goes in the test environment only.
4. **Resolve campaign and subscriber parameters before enabling shared App Router analytics.** In that setup, have Clarity support mask the named parameters in both projects or decide with counsel to record them. Keep any reply beside the cookies screenshot (`references/shared-app-router.md`).
5. **Provide the production id only after the consent decision and isolation checks.** For the shared router, also wait for the masking reply or counsel's decision. Give the id to the agent for production's variables. Development stays empty.
6. **Generate the read-back API token and add it in your own terminal.** Only a project admin can: Settings, Data Export, *Generate new API token*. Use § Reading it back; never paste it into the session or repository.

For PostHog, use `references/posthog.md` § What the owner does by hand.

**Decide consent and approve the policy line for either tool.** For Clarity, Microsoft says it operates as a data controller, so there is no processor agreement to accept. The policy names Microsoft as a recipient acting as controller with its own privacy statement. Counsel decides how the product's own collection role is described (Clarity's FAQ, read on `2026-10-29`). Apply `legal-pages` for the policy line.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Every tagged-page visit leaves no analytics cookie or stored browser id, and its recording appears in the dashboard. The agent answered a question about yesterday's visitors through MCP without asking the owner for a screenshot.

Related skills:

- `legal-pages` (the policy line, consent and cookie disclosure)
- `environments` (empty means off; the token as an operator value)
- `clerk-production` (the CSP)
- `propose` (weighing what people did against each hypothesis)
- `app-lifecycle` (when to propose it: a landing page exists and the privacy page can promise it).

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/product-analytics).
