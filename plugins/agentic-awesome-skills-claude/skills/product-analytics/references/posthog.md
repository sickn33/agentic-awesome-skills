# PostHog for event analytics

**Keep PostHog cookieless and within the same landing-page boundary.** These are PostHog's own docs, read on `2026-10-29`:

- **Enable cookieless mode in both code and the project settings.** Set `cookieless_mode: 'always'` in `posthog-js` init and switch on *Enable cookieless tracking* in project settings (Settings, Project, Web analytics), without which cookieless events are ignored. PostHog says this needs no banner unless something else on the site uses cookies; the consent question (`SKILL.md` § The default, and the option) still applies.
- **Cookieless PostHog counts each visitor as new every day.** Session replay and surveys are off for anyone who has not consented. For recordings, keep Clarity beside it.
- **Start PostHog only in Clarity's tag component behind the same check.** It runs only on the landing page, never from `instrumentation-client.ts` or a provider in a layout, as PostHog's Next.js guide does, and with `mask_personal_data_properties: true` and `custom_personal_data_properties` listing every parameter the agent named that PostHog's own list lacks (an email platform's subscriber id other than Klaviyo's `_kx`, such as Mailchimp's `mc_eid`), both held by a unit test. A source guard fails on any import of `posthog-js` outside that component. The test environment gives PostHog a fake key, so `SKILL.md` § What binds, rule 5's browser test first sees its request from the landing page, then fails on one to its host (or the proxy path) wherever it fails on `*.clarity.ms`. PostHog past the landing page is a new decision for the owner, built and reviewed as its own change.
- **`on_reject` captures nothing until the visitor has chosen.** Apply `legal-pages` § Consent and cookie disclosure for the banner and `SKILL.md` § Consent decision and analytics proof.
- **Have the owner choose the cloud by where users are.** PostHog has US and EU clouds (`https://eu.i.posthog.com`). PostHog recommends a reverse proxy through the product's own domain before production, which it says typically captures 10 to 30% more events; the CSP then admits only that domain.

**Admit PostHog's origins only once it is wired.** Apply `clerk-production` for the CSP. PostHog's docs name `*.posthog.com`, plus `worker-src 'self' blob: data:`, or only the product's own domain behind a reverse proxy (read on `2026-10-29`).

## Reading it back

**Add the vendor's server at user or local scope.** Keep the credential out of committed MCP config. This is PostHog's own server (read on `2026-10-29`).

- **Connect to PostHog's hosted MCP server read-only.** Use its hosted server at `https://mcp.posthog.com/mcp`, which its docs say routes to the project's region (its repository names `mcp-eu.posthog.com` for EU projects). Sign in by OAuth, or with a personal API key made from the *MCP Server* preset, and connect read-only (`?readonly=true`), because the agent is there to read. In Claude Code: `claude mcp add --transport http --scope user posthog "https://mcp.posthog.com/mcp?readonly=true"`. Calling it is free; the queries count as ordinary PostHog usage, and its AI-backed tools may bill as PostHog AI spend.

## What the owner does by hand

1. **Create the PostHog project in the chosen US or EU cloud.**
2. **Switch on PostHog's cookieless tracking.** Use *Enable cookieless tracking* in Settings, Project, Web analytics.
3. **Give the agent PostHog's API key and host for production's variables.**
4. **Approve MCP OAuth or create a key from its preset.** Use the *MCP Server* preset for the personal API key.

**Have the owner accept PostHog's processing agreement.** Ask for the consent decision and approval of the policy line. Apply `legal-pages`.
