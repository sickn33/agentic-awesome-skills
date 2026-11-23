# The portal and the review

From the publishing account to the months after publication, in the order the work happens. From OpenAI's `/deploy/submission`, `/deploy/app-review` and `/plugin-guidelines`, read on 2026-10-26, and what one product's submissions met in October 2026. The portal is `platform.openai.com/plugins`.

## Before the first upload

- **The publishing identity.** Verify it on the OpenAI Platform (organization settings → General): individual verification to publish under your own name, business verification for a company. Review enforces it, and the directory shows the identity chosen when the draft is created, whatever the ZIP says. **It must be the entity the privacy policy and terms name**, and the manifest's `author.name`. A product verified as an individual whose legal pages named a company was rejected: "We could not confirm that the verified individual or business owns this plugin, brand, or trademark" (2026-10-23). The fix was verifying the company and choosing it for the draft.
- **Permissions.** Organization owners can submit. Other members need Apps Management Write (`api.apps.write`), and `api.apps.read` to see drafts and review status.
- **A project with global data residency.** "Projects with EU data residency cannot submit plugins with MCP servers"; create a project with global residency in the same organization if there is none.
- **Production serves the plugin**: a public HTTPS endpoint (not a local or testing one), the surface enabled, any test mode off.
- **The domain-verification route.** The portal shows a token at connect time. Serve exactly that token, as plain text, not JSON, at `https://<challenge-base-host>/.well-known/openai-apps-challenge`, on the MCP host or an eligible parent domain (paths are ignored). Keep the token in configuration, not code, with an empty value answering `404`. If another plugin already uses that URL, use a parent origin or a different hostname rather than replacing its token. One product's verification survived deleting the draft and creating a new plugin, with no new token (October 2026).
- **The four listing URLs** answer `200` and "identify the same publisher as the submission", and the support page reaches a person.
- **One universal endpoint.** Template URLs, one per customer workspace, are only for developers OpenAI already has a relationship with.

## Create the draft

1. **Upload new or existing plugin**, choose the verified **Developer identity**, then **Upload plugin** with the ZIP. A server goes in the first ZIP: one cannot be added to a skills-only plugin later.
2. **Metadata & Skills** shows the package version and its findings. **Copy issues**, fix the package, **Upload plugin to fix issues**. Skill scans must finish before submission and can take up to 2 hours.
3. **Open MCPs and read the Authentication field before pressing Connect.** It comes from the uploaded version's `mcp.json`, and the portal has no editor for it. If it is not what the package declares, stop and fix the package before any sign-in: "Existing client registration can lock credential changes", and a draft that was taken for OAuth and signed in stayed OAuth through a new version; only a new plugin fixed it (`package.md § mcp.json`).

## Connect and scan

- **Connect**: check the URL and Authentication, complete the domain challenge, then connect and authenticate if the server requires it, with the test account. For a `provided` OAuth client, first register the portal's callback URL with the provider, and type the client secret into the portal's field, which shows unless `tokenEndpointAuthMethod` is `none`.
- **The scan imports** every tool's name, title, description, input and output schema, `securitySchemes`, `_meta` and annotations, any UI resource metadata with its CSP, and the server's `instructions`, and stores that snapshot with the draft. **Submitting sends the snapshot**, so rescan after the last deploy before submitting, and keep the server matching the snapshot until the decision.
- **"Authorization required" has two causes**: the server refusing the scanner, which called from outside ChatGPT's address ranges on 2026-10-23 (`server-and-auth.md § A surface with no sign-in`), and the portal taking a server without sign-in for an OAuth one. For the second, never sign in.
- **Findings.** Required setup and validation errors must be resolved; other automated findings can go to the review team for consideration. Only one MCP server can be connected per plugin.

## Review information

In Metadata & Skills → Review information → **Review details**. What the ZIP supplied is shown read-only and changes only with a new ZIP; the reviewer's credentials are typed here and never travel in the package.

- **The test cases**: the five and three from `plugin.json`. Run every one against the test account before submitting. Rejections cite outputs that do not match the expected behaviour, that add information the request did not ask for (personal identifiers included), or that fail on one of the surfaces the plugin is offered on (ChatGPT, Codex).
- **The video.** OpenAI asks for one that shows "the main use cases and tools across supported platforms", at a URL a reviewer can open. Record it against production: on the web through a custom connector, since an unapproved plugin runs only as a local install in the desktop app or Codex, and on each other surface the plugin is offered on. One product's ran about three minutes, narrated. Show every positive case, one negative case, ChatGPT's confirmation before a destructive tool, and what the user's audience or customers see between the calls. Host it unlisted at a URL that opens without an account; with embedding off on the video host, the portal's preview may be blank while the link itself works.
- **Release notes**: what this version changed, required at final submission.
- **The reviewer account**, for a server with sign-in:
  - A dedicated test account in a test organization or workspace, never a real user's, seeded with sample data, with the permissions and the plan every test case needs. A free plan's limit can fail a create case when the sample data already uses the allowance.
  - The login URL, workspace or tenant details, and step-by-step sign-in instructions.
  - It works immediately "without MFA approval, email or SMS codes, magic links, or private-network access". The guidelines ask for "a login and password", and sign-in that needs "a new account sign-up or 2FA through an inaccessible account" is rejected. So it is an email-and-password account, and someone has signed in with it from a fresh browser on another network and confirmed the provider sends no new-device code.
  - It does not expire, and it stays available for later reviews. If the credentials or the sign-in steps change, submit an updated draft.
- **Country availability and translations** come from the package (`package.md § plugin.json`).
- A plugin with UI that embeds pages in iframes needs a justification for each.

## Submit

**Submit for review**, then the policy attestations. Progress shows under Review status on the Plugins page, and feedback arrives by email. **Only one review can be active per plugin**: to change something under review, wait for the decision, or **Cancel Review**, fix it and resubmit.

OpenAI gives no estimate for a review and asks that nobody contact support to expedite one. One product's first submission took about three weeks to a first decision (October 2026); reports from other builders run from days to months. Include the plugin id in anything sent to support.

## Rejection and appeal

The rejection email names the checks that failed. The common ones, in OpenAI's own list: the reviewers could not connect with the URL and credentials given; a test case did not produce the expected result; replies carry user-related data the privacy policy does not name; annotations do not match behaviour. Add one more: an unverified or mismatched publishing identity. One product's first rejection (2026-10-23) cited three at once: identifiers the request did not need, fields the privacy policy did not name, and the identity (`tools-and-data.md § Replies` and § The privacy policy, and § Before the first upload above).

- **Fix, then submit a corrected ZIP**, which is what the submission page says. To argue instead, **appeal by replying to the rejection email** with the reasoning and any new information.
- **If the rejected plugin cannot take an update**, which OpenAI support called a known issue on 2026-10-19, the fallback is a new plugin: the same identity and domain, a new plugin id, the corrected package, and the Authentication field checked again before connecting.

## Publish

Approval does not publish. Open the approved version and **Publish plugin** when ready. A published plugin is found by its direct link or by searching its exact name; the directory's main pages and proactive suggestions are OpenAI's choice ("enhanced distribution"), never requested. **Before any press release or public announcement, write to press@openai.com** to coordinate. A country allowlist in the package applies from publication.

## After publication

**The server's tool metadata is now a versioned contract**, and OpenAI keeps checking it: it "scans your hosted MCP server daily", and **Rescan** (MCPs → Issues) runs one right after a deploy.

| Change | What to do | When users see it |
|---|---|---|
| a tool deleted | deploy | as soon as a scan sees it gone |
| a tool added | deploy, rescan | after it passes automated checks; unavailable until then |
| a tool's description, schema or annotations changed | deploy, rescan | after it passes; **the old definition stays live meanwhile**, tool by tool |
| `securitySchemes`, a tool's `_meta`, UI resource metadata or CSP | deploy | after the definition passes continuous review |
| the server's `instructions` | deploy | after the affected tools' checks pass |
| results only, or business data, with the contract unchanged | deploy | immediately |
| UI content at the same resource URI | deploy | immediately; ChatGPT may serve cached content for up to an hour |
| listing fields, assets, skills, review materials, countries | a new ZIP with a raised version, uploaded to the same plugin, reviewed, then published (the current version stays published meanwhile) | when the approved version is published |
| the server's origin (scheme, host, port) | a new plugin | when it is published |
| the server's path | SKILL.md § Where OpenAI's pages disagree | |

- **Keep the server compatible with the live definitions while an update is held.** A deploy takes effect at once, before any scan, while ChatGPT keeps calling with the old schema. Change schemas additively (a new optional argument), add a tool rather than reshape one, and roll back a deploy that breaks the live contract instead of waiting for review.
- **Appeal a tool finding** in the portal (Issues → Appeal). It covers the held tool changes from that scan, automatic updates pause while it is open (Withdraw appeal to change the server), and it does not cover package changes, authentication or the shared instructions. Fixing a valid finding and rescanning is usually faster.
- **A plugin first submitted through the earlier form**: open its published version, then … → **Download release ZIP**, and build the next version from that.
- **Each release that changes tools** also owes the privacy page (if a returned field changed), the routing evals, and the product's public docs page.
- **Removal is one-way.** Unpublishing without a replacement makes the plugin unavailable; deleting it removes it from the organization and from ChatGPT and Codex. OpenAI may remove inactive, unstable or non-compliant plugins, and investigates user reports.

## Before you submit

- [ ] The decisions in SKILL.md recorded in the product's decision log.
- [ ] `check_package.py` passes on the package and its ZIP, and a test pins the ZIP to the package.
- [ ] Every tool called in ChatGPT through a custom connector against production, with the date recorded.
- [ ] A `tools/call` carrying `_meta` succeeds (a test).
- [ ] Without sign-in: an outside `tools/list` succeeds and an outside call is refused. With sign-in: the portal's connect succeeds with the test account.
- [ ] No input asks for a key, password or code, and no reply carries one.
- [ ] Every reply leaf, nested and error ones included, is named on the privacy page (a test, both ways); no internal or diagnostic id the next call does not need.
- [ ] The hints match behaviour: irreversible effects in tools of their own, marked destructive; anything the public sees open-world.
- [ ] The five and three cases pass in the routing evals and with the test account; the video opens without an account.
- [ ] The four URLs answer `200` and name the same publisher; the support contact reaches a person.
- [ ] The domain token is served as plain text.
- [ ] The developer identity, the legal pages' entity and `author.name` are one entity; the project has global data residency.
- [ ] MCPs → Authentication reads what `mcp.json` declares, checked before Connect.
- [ ] The scan is current (run after the last deploy) and has no required findings.
- [ ] With sign-in: the reviewer account signs in from a fresh browser on another network with no emailed or texted code, its plan lets every case succeed, and its sample data is seeded.
- [ ] Production: the surface enabled, any test mode off.
- [ ] Release notes say what this version changed.
