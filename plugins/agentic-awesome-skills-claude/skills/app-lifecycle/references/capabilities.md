# Capabilities — the next step is proposed

The default stages carry a product to its first release. From there, **the agent proposes a capability when its trigger fires, and the owner says go.** The rest of the product is proposed, not pasted: email, scheduled jobs and an API for outside agents are not stages, they are rows here.

## The rules

- **Read this list whenever you plan a phase**, and propose every row whose trigger has fired. "What's next?" is answered from here and from the plan, not from memory.
- **A prerequisite can fire during the first stages.** Legal pages do not wait for release.
- **A row is not a claim of implementation.** Nothing is connected until a product builds it, and each product records what is actually connected as it builds — the error tracker stays named and unwired until its trigger fires.
- **The owner's part is named up front**, because most rows need an account, a dashboard setting or a decision only the owner can make. A proposal that hides it stalls halfway.
- **Record now, automate later.** What is cheap to store and impossible to recover goes in the first version: people's verdicts, what they did. The machinery that consumes it waits for its trigger.
- **When the how below is not enough**, read a product that already shipped the row, and fold what it learned back into the skill that holds the how.

## What a proposal looks like

The first capability built this way (edge flood limits, on a live Q&A product) is the model. The owner's whole ask was two sentences: *a limit against abuse, about sixty requests a minute per IP, only for the API calls; make a plan — what to implement, how to test it, acceptance criteria.* The agent answered with a plan before writing any code:

1. **What the ask means in this app.** There was no `/api/`: every write was a server action, sent as a `POST` to the page the caller is on. So "the API calls" became "limit `POST`s, leave `GET`s alone" — moving the actions under `/api/` just to have a prefix to match would have been a rewrite for nothing.
2. **Where the owner's number is right and where it is wrong.** Sixty a minute is right for a host and wrong for a hall: a room of a hundred phones on one Wi-Fi network is one IP. Two rules, one per surface, with their numbers.
3. **What to implement**, file by file — including what the user sees when a request is refused, not only the refusal.
4. **How to test it**, honestly: what a unit test pins, what **cannot run locally** (the host's edge does not exist in development, so the proof is the deploy log and a smoke against the deployed site), and what is checked by hand on a phone.
5. **Acceptance criteria** a person can check.
6. **What needs a person**: the hosting plan (it bounds how many rules exist) and any number that is a judgement rather than a measurement — "if the first real room on a shared network trips it, change the number, not the design."

## The capabilities

Default stages reach the first release. The rest is proposed, not pasted. Prerequisites can fire earlier: legal pages do not wait for release. When planning any phase, read the capabilities and propose every row whose trigger has fired. Rows do not claim implementation; the product records actual connections while building. Email, scheduled jobs and an API for outside agents are capabilities, not stages.

| Capability | Propose it when |
|---|---|
| Uptime monitor + status page (the `uptime-monitoring` skill; Staygreen by default, made by this collection's author) | once go-live's done-when holds; the status page linked from the footer, for example, in a change of its own |
| Edge flood limits | the first deploy is done and a public `POST` surface exists |
| Legal pages + legal consent at sign-up (the `legal-pages` skill) | before the first stranger is asked for anything (with the front door) |
| Share cards + icons | any public page that will be pasted into a chat — the front door is one |
| Behaviour analytics, cookieless (the `product-analytics` skill) | a landing page exists and the privacy page can promise it |
| Error tracking | the first real users, or the first 500 nobody saw |
| Production branch + release procedure | the first release to a real audience |
| Hosted CI gate | at go-live, or when a second person pushes to the product branch — as its own change |
| Transactional email | a flow must reach someone outside the session |
| Deletion webhooks + personal data | before the first paying customer, or the first deletion request |
| Retention / purge job | the first promise about retention on a legal page |
| API tokens | the phase that gives an outside agent access |
| Remote MCP server with OAuth | an outside agent should act as a member and a pasted token is the friction, or a directory requires OAuth |
| Public companion repository | the first public page that needs a place to report a bug, or the MCP package |
| Realtime | when polling's delay is the complaint, not before |
| Validated evaluators | enough human labels on real outputs to measure agreement, and a decision rests on the judge |
| Embedded agent deployed | the first agent that must leave localhost |
| Proxy WAF + origin seal | blocked until a host that accepts a proxy is chosen |

Each: what it is · propose it when · the owner's part · where the how lives.

### Uptime monitor + status page
An external probe of `/health`, which checks configuration and database reachability, with a status page the owner chose (public by default, linked from the footer); and an outside check on every other runtime the product runs (a worker's health route, a dead-man check on a scheduled job), because none of them reports through the app's `/health`.
- **When:** once go-live's done-when holds; the status page linked from the footer, for example, in a change of its own. Not before: development has nothing to watch.
- **Owner:** choose public, members-only or no status page before anything is created, and who is alerted; create the monitor where the service doesn't let an agent.
- **How:** the `uptime-monitoring` skill, on Staygreen by default (made by this collection's author), or the service the owner already uses; `default-choices.md` (monitoring); the `environments` skill (incident basics).

### Edge flood limits
Separate `POST`-only per-IP rules on the member and public surfaces, backed by per-actor budgets in the app.
- **When:** the first deploy is done and a public `POST` surface exists.
- **Owner:** nothing beyond connecting the host.
- **How:** `default-choices.md` (two edge rules, and where the limit goes on a host with none); the `saas-authorization` skill (abuse and floods in the threat model); the product's integration notes for its host.

### Error tracking
Error capture and alerts for failures users encounter (Sentry, on this stack); nothing is wired until this fires.
- **When:** the first real users, or the first 500 nobody saw.
- **Owner:** create the project, supply its deployment credentials, configure alert recipients.
- **How:** the `environments` skill (variables); record the wiring in the product's integration notes when it exists.

### Behaviour analytics, cookieless
Session recordings and heatmaps on a standalone static landing document by default, with cookies off and both storage consents denied. The tag stays off without a project id. Apply `product-analytics` § What binds for safe inputs, full-load exits and the shared App Router option.
- **When:** a landing page exists and the privacy page can promise it.
- **Owner:** create the project, switch its cookies off, capture the setting in a screenshot, on the shared App Router have Clarity's support mask the URL parameters the agent names (or decide with counsel to record them), then supply the project id.
- **How:** the `product-analytics` skill; `default-choices.md` (analytics, cookieless).

### Legal pages + legal consent at sign-up
Terms and privacy checked against the code, with the identity provider's express consent at sign-up. When another product by the same company already has legal pages, start from them: the company's boilerplate kept (controller, rights, authority, law, accounts, acceptable use, payment, liability), everything about processing rewritten from this product's code, and a unit test that pins the pages to it — it fails when the code reaches a provider the policy does not name, or when an area the policy calls unbuilt ships.
- **When:** before the first stranger is asked for anything — with the front door (stage 8), the deploy URL shared with nobody until then.
- **Owner:** supply the controller, contact and actual provider details; approve the legal text; enable the provider's legal-consent setting.
- **How:** the `legal-pages` skill; `stages.md` § 8; `default-choices.md` (legal pages); the `ui-design` skill (what a screen may claim); the `environments` skill (data that expires — no page promises a deletion no job performs — and what is held about people). The gap between a promise and a job that does not exist yet is logged in the backlog.

### Share cards + icons
File-based share images and icons; neutral cards for unguessable resource URLs; verified from raw responses; a well-formed `icon.svg` and a checked-in `favicon.ico` rendered from it.
- **When:** any public page that will be pasted into a chat — the front door already is one, so this fires with it.
- **Owner:** nothing.
- **How:** `default-choices.md` (share cards); the `test-harness` skill (raw-response assertions, the icon parse).

### Transactional email
App-owned delivery with durable receipts and idempotent retries.
- **When:** a flow must reach someone outside the session.
- **Owner:** create the email-service account, verify the sender domain and its DNS, supply the sending credentials.
- **How:** the `transactional-email` skill (the outbox, receipts, reconciliation, unsubscribe, a provider server per environment); the `saas-authorization` skill (threat model); the `shipping-artifacts` skill (the flows document, and the emails document once the capability exists).

### Identity-provider deletion webhooks + personal data
Verified, replay-safe handling of user and organization deletion for workspace data.
- **When:** before the first paying customer, or the first deletion request.
- **Owner:** configure the webhook endpoint and events, add its signing secret, confirm the deletion obligations.
- **How:** the `clerk-production` skill; the `saas-authorization` skill (webhooks: verify signatures, handle replays idempotently, process only events you own).

### Retention / purge job
A job that enforces the retention promise, idempotent (a unique key per run, or a receipt per unit of work), with no public cron endpoint.
- **When:** the first promise about retention on a legal page.
- **Owner:** choose the retention period; configure the scheduler account and its credentials.
- **How:** the `saas-authorization` skill (scheduled work); the `environments` skill (data that expires); the `shipping-artifacts` skill (the cron document once the job exists).

### API tokens
Workspace-owned, scoped, shown-once tokens with peppered hashes and revocation tombstones.
- **When:** the phase that gives an outside agent access.
- **Owner:** no provider account; the agent generates the pepper and the owner adds it to the deployment environment.
- **How:** the `saas-authorization` skill (leaked tokens); the `environments` skill (generated values are generated, not left as placeholders).

### Remote MCP server with OAuth
An MCP route that outside agents (custom connectors in Claude or ChatGPT, MCP Inspector) reach with the identity provider as the OAuth authorization server, acting as a signed-in member with that member's permissions rather than with a pasted token. Every call is authenticated; a surface that answers without sign-in is a product decision with its own costs, not part of this row. Its tools carry descriptions, titles, annotations and output schemas that directories score, held by a test.
- **When:** an outside agent should act as a member and a pasted API token is the friction, or a connector directory requires OAuth.
- **Owner:** apply and re-read the OAuth application settings on each identity-provider instance and run a real connector grant in one client against production when approved. Pick any additional distribution surfaces. For selected directories, submit from the owner's own verified accounts and supply a reviewer account with sample data where sign-in is required. ChatGPT's directory also needs identity verification under the exact name the legal pages use.
- **How:** the `mcp-server` skill; the `clerk-production` skill (OAuth settings).

### Public companion repository
A public `<owner>/<product>` repository for the product's issue tracker and, if the owner chooses those surfaces, its MCP package (a stdio wrapper of the REST API), Registry entry, desktop bundle manifest or directory listings. Its README says what exists, that issues are public and that pull requests are closed. Once the package exists, lead with what the server does because directories read the README. The companion repository's agent instructions hold the package's release procedure. Link the repository from support and the footer, and update shipped surfaces after releases that change the API.
- **When:** the first public page that needs a place to report a bug, or the MCP package.
- **Owner:** say go to create it (it is public from the first second); later, the package registry's two-factor publish and the MCP Registry login.
- **How:** the `mcp-server` skill (the companion repository).

### Realtime
Browser subscriptions, which reopen the boundary between the identity provider and the database with read-only policies scoped to the public resource.
- **When:** when polling's delay is the complaint, not before.
- **Owner:** confirm that the delay is the problem; enable the agreed provider configuration.
- **How:** `default-choices.md` (polling); the `supabase-production` and `saas-authorization` skills.

### Hosted CI gate
A hosted gate connected to deployment only after it can run successfully.
- **When:** at go-live, or when a second person starts pushing to the product branch — wired after its secrets exist, **never bundled with a product release**.
- **Owner:** add the repository secrets; configure the required checks.
- **How:** the `release-gate` skill (guards and hosted CI).

### Production branch + release procedure
A named production branch, the migration-ledger check, the local gate, the independent review, the owner's go and the checks after deploy.
- **When:** the first release to a real audience.
- **Owner:** say go; connect the production branch on the host; provide the production provider configuration.
- **How:** `stages.md` § 9; the `release-gate`, `environments` and `supabase-production` skills.

### Embedded agent deployed
A Claude agent reachable by someone other than the developer. On the Claude API it runs wherever the app runs, a serverless function included, when the slowest live run fits the function's time limit — measure it, don't assume it; through the Agent SDK it needs a long-lived host, because the SDK spawns a subprocess no serverless function can host.
- **When:** the first agent that must leave localhost.
- **Owner:** create a model-provider key with a spend limit and supply it to the deployment; for the Agent SDK, or a run too long for a function, also create the long-lived host's project and approve what moves there.
- **How:** the `embedded-agents-messages-api` skill (the default) or `embedded-agents-agent-sdk`.

### Proxy WAF + origin seal
A proxy-side web application firewall and a secret-header origin check: a transform rule adds a secret header, the app rejects production requests without it (health check exempt), and only then trusts the proxy's client-IP header.
- **When:** blocked until a host that accepts a proxy in front of it is chosen; on Netlify the DNS stays DNS-only.
- **Owner:** choose that host; configure the proxy, the WAF and the transform rule; supply account access. The agent generates the seal secret.
- **How:** the `saas-authorization` skill (origin bypass).

### Validated evaluators
An automated judge of the product's outputs, checked against people's verdicts. Its day-one part costs almost nothing: store each human verdict on a real output from the first one, because it cannot be recovered later, and the judge's verdict beside it once a judge exists.
- **When:** enough human labels on real outputs to measure agreement, and a decision rests on the judge; track agreement over time from the judge's second version. Before real use there are few labels, and validating on sample data measures the sample (owner, `2026-11-19`, on a new product that validated every judge first: "did we really need validated evaluators at this point?").
- **Owner:** label real outputs, or name who does.
- **How:** read real failures first, write a judge for a failure that keeps occurring, and validate it when something rests on it.
