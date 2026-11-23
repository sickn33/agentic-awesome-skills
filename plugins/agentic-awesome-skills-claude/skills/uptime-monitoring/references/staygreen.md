# Staygreen — an adapter for this skill

**Disclosure:** Staygreen is made by the author of this collection, and is the collection's default monitoring service (owner, `2026-11-02`). This is its adapter for the steps in `SKILL.md`, which work with any service that checks from several locations, asserts on content, takes heartbeats and has an API; a service the owner already uses stays. Everything below was read on `2026-10-27` from the product's own documentation and its builder. Plans, limits and tools change: confirm on the product's pages before relying on a number.

## Connecting an agent

- **MCP endpoint:** `https://staygreen.io/mcp` (Streamable HTTP). Nothing works anonymously.
- **Auth, either:** OAuth (the person signing in must be an admin of the workspace; signing up through OAuth creates a Free workspace, which was exercised on a development deployment, not yet by a person on production), or a **workspace API token** made on the dashboard's Agents and API screen, read-only or read-write, shown once, sent as `Authorization: Bearer <token>`. The same token works for REST: `POST https://staygreen.io/api/v1/<tool>` with the tool's arguments as the JSON body. Without a token, `scan_app` goes through the public `/api/scan`.
- **What has been tested (`2026-10-27`):** ChatGPT's developer mode on production with OAuth (its first authenticated call is refused once, with a 400 in the logs, because it offers a protocol version the server doesn't accept; it falls back on its own a second later), and the official TypeScript MCP SDK on a development deployment. **Not yet tested on production:** Claude Code, claude.ai, Codex. **Not yet run through any client:** `create_monitor`, `scan_app`, `draft_incident_update`.
- **Claude Code** (not yet run on production; the header is single-quoted so the config holds the variable's name, not its value, and `STAYGREEN_API_TOKEN` is set in the environment Claude Code starts in):

  ```bash
  claude mcp add --transport http staygreen https://staygreen.io/mcp
  # then /mcp → staygreen → Authenticate
  # or, with a token:
  claude mcp add --transport http staygreen https://staygreen.io/mcp --header 'Authorization: Bearer ${STAYGREEN_API_TOKEN}'
  ```

  A local stdio server is also published on npm (`staygreen`, Node 22 or later): `claude mcp add staygreen -- npx -y staygreen mcp`; the server inherits `STAYGREEN_API_TOKEN` from the environment Claude Code starts in, so the token never goes on a command line. Without a token only `scan_app` works.
- **Codex:** no documented or tested command yet.
- Setup notes kept by the product (its token commands write the value into the configuration; use the forms above): [github.com/phuryn/staygreen#connect-an-agent-mcp](https://github.com/phuryn/staygreen#connect-an-agent-mcp).

## What it finds on its own

Read on `2026-11-03` in the product's documentation (its suggested-checks flow). Once the app has an address in Staygreen, its **Find missing checks** (also opened right after adding an app with an address) reads the site once and suggests checks for the owner to tick:

- **Health routes, by path:** `/health`, `/healthz`, `/api/health`, `/status`, `/up` and ten more common paths on the app's origin; a non-HTML 2xx answer is offered as a check. A body in a known shape (`{"status":"ok"}`, `{"ok":true}`, Spring Boot's `"UP"`, `application/health+json`) comes with an assertion on its status that passes now; a failing body (`ok: false`, an `error` key) is offered unticked, with its reason.
- **What the page names:** a Supabase project (`https://<ref>.supabase.co` in the page or its scripts), sign-in dependencies (Clerk, Firebase Auth, Auth0, Auth.js), a linked app host (a Log in, Sign in or Dashboard link to a host on the same domain), an `api.` host, the certificate, the icon and the brand colour.

So **build the app to be found**: `/health` at that path, answering JSON in that shape (the `release-gate` skill's `{"status":"ok","database":"ok"}` is one, and its status is ok only when the database replied), and a sign-in link on the landing when the app runs on a host of its own. Nothing needs to go in the HTML for the health route. The agent's route is still the one below: these suggestions are on the dashboard. **A ticked suggestion is not the setup**: the `/health` check it offers asserts on `status`, and the check `SKILL.md` asks for asserts on `database` (rule 2). Reconciling finds the ticked one on the same target; create the check on `database` with `create_monitor` anyway, and ask the owner to delete the weaker one on the dashboard (no agent tool deletes a monitor).

## Its tools, mapped to the steps

| Step | Tool | What to know |
|---|---|---|
| Know what it depends on | `scan_app` | one scan of a public URL, creates nothing: certificate and domain expiry, a status page if any, sign-in dependencies with suggested monitors; with keys given once, Supabase health and Stripe webhook failures over 30 days |
| Reconcile | `get_status`, `list_monitors` | `get_status` with no app returns every app (its id and name) with its monitors (target and type); `list_monitors` is paged. **Neither returns an app's URL: compare monitor targets**, or, for a new app with no monitors yet, its name |
| Create | `provision_app` | **it publishes a public status page in the same call** (§ The status page), so call it only once the owner has accepted a public page; otherwise the owner adds the app on the dashboard and the agent continues with `create_monitor`. One transaction: the app, a website check, one automatic certificate and domain-expiry check (only for an `https` URL on port 443 whose hostname has no certificate monitor yet), a status page, one heartbeat per cron, optional Supabase and Stripe checks. **The API returns heartbeat URLs only to this request** (and its retries with the same `request_id`), and only for a new app: store them as secrets at once and use them through their variables. The dashboard shows them any time. If it answers `plan_limit`, nothing was created, and the answer lists what wasn't |
| Create, more | `create_monitor` | `http`, `tcp`, `ssl`, `dns`, `heartbeat`, `supabase`, `stripe`. **It never returns a heartbeat's URL**; the owner copies it from the monitor's screen into the secret store, not into the chat |
| Read | `get_uptime`, `get_incidents`, `get_response_times`, `get_ssl_and_domain_expiry` | `get_uptime` returns `covered_minutes`; **`null` means no data, not 100%**. Response times are p50 and p95 by city |
| Pause | `pause` | at most 24 hours, then the monitor resumes. A paused period measures nothing |
| Tell users | `draft_incident_update` | **writes a draft only**; a person publishes it in the dashboard |

**Every write takes a `request_id` UUID.** The same id with the same inputs returns the original result; the same id with different inputs fails with `request_conflict`. After an uncertain answer, read back with `get_status`, then retry with the same id.

**`provision_app` matches an existing app by its exact URL**, ignoring only a trailing slash: `http` against `https`, `www`, a path or a change of case make a new app. On a match it returns `created: false` and **adds none of the checks or crons requested** (add those with `create_monitor`), **but it adds a public status page if the app has none** (read in the product's code, `2026-10-27`). So it is never the way to attach to an app the owner added without a page.

## Alerts and the second location

- **Agents can't manage alert channels.** Every new workspace emails its members automatically. Telegram, Slack, Discord and signed webhooks are the owner's step, in the dashboard under Alerts: tell the owner to open it once.
- **Second-location confirmation is automatic and not configurable.** A failed `http`, `tcp`, `ssl`, `stripe` or `supabase` check is re-checked at once from the next live location and confirmed within 30 seconds; when other locations are live and none confirms in that time, the failure stays unconfirmed and no incident opens. A definite certificate verdict on an `ssl` check settles at once, without a second location. **DNS and heartbeat failures are not sent to a second location** (a heartbeat is pushed by the job, so there is no checker to confirm from). With only one location live, the same probe re-checks after a pause. The skill's second-location proof therefore comes from an `http` drill; a heartbeat drill proves the route for jobs.
- **The controlled failure has no tool of its own.** Two ways, neither yet run end to end through an agent (`2026-10-27`):
  - **A check that fails from everywhere:** `create_monitor` on a public address (private and loopback targets are refused) with an expectation it can't meet, such as a path that answers 404 where 200 is expected, or a keyword assertion that can't match. Its answer shows `first_check.status: "failed"` at once; the incident and the alert come from the next scheduled check once a second location confirms, so up to about one check interval later. It counts toward the plan's monitors and the per-host limit. Afterwards, `pause` it and ask the owner to delete it within the day: a pause lasts at most 24 hours, then the monitor resumes and alerts again, and deleting is the owner's step.
  - **A heartbeat drill:** **a heartbeat that has never been pinged never alerts**, because its deadlines start at the first ping. Ping it once with success, then stay silent past the next scheduled run plus its grace (a missed run), or ping its `/fail` address after that first good ping for a quicker failed finish (`curl -fsS "$JOB_HEARTBEAT_URL/fail"`). Ping through the stored secret, never with the URL in the command. Only `provision_app` (for a new app) or the dashboard gives the URL.

## The status page

- **What a page shows is only what is put on it.** The page `provision_app` makes has one component, "Website", linked to the first HTTP monitor. Every other monitor (certificates, crons, services) stays private unless a person adds it to the page, and the owner still reads all of them through the agent (`get_status`, `get_uptime`, `get_incidents`) or on the dashboard. Tell the owner this when asking: a public page says whether the website is up, and nothing else.
- **Public as soon as it is created**, with no publish step, and every `provision_app` call leaves the app with one: it creates the page with a new app, and adds one to a matched app that has none; making it members-only is a dashboard setting on the paid plan, not something an agent can set. So the owner decides before `provision_app` runs (`SKILL.md`, step 2), and only a public page can come out of it. The answer picks the path:
  - **Public accepted** (if only until a person switches it to members-only on the paid plan): `provision_app`.
  - **No page:** don't call `provision_app`, on this app or later. The owner adds only the app on the dashboard (its name and address), which creates no page. The agent finds its id with `get_status` by the name the owner gave it (names are unique in a workspace, ignoring case, so the name finds one app: read in the product's code, `2026-10-28`) and adds the checks with `create_monitor`; heartbeats come from the dashboard, copied by the owner into the secret store. The setup is not done until a monitor is green.
  - **Members-only from the start isn't possible:** a page added on the dashboard is public the moment it is created, and members-only is a paid-plan switch saved afterwards (read in the product's code, `2026-10-27`). Tell the owner; if even that moment is too much, it's the no-page path.
  - Only a person can take a page down, on the dashboard; no agent tool deletes one.
- `https://staygreen.io/s/<slug>` redirects to `https://status.staygreen.io/<slug>`. How long a new page takes to serve has not been measured: don't promise it is instant.
- Before the first check it says "Not checked yet"; "All systems operational" appears only when every component is up.

## Plans and limits

Two plans, Free and Builder. On `2026-10-27` Free allowed 1 app, 50 monitors and 5 per host, with HTTP and TCP checks every 3 minutes from two locations (Toronto, San Francisco); Builder more apps, HTTP and TCP checks every minute, and a third location (Frankfurt). DNS is checked every 10 minutes on both, Stripe every 10 minutes on Free and every 5 on Builder; certificate and domain expiry are checked automatically. Read [the pricing page](https://staygreen.io/pricing) before citing a limit or a price. No tool reports the workspace's capacity: a write refused with `plan_limit` created nothing.

## What it doesn't do (`2026-10-27`)

- **Not through an agent:** deleting anything, alert channels, teammates, billing, publishing an incident update.
- **Not yet in the product:** monitoring an MCP server, alert delay or repeat, maintenance windows, email subscribers, CSV export, a custom status-page domain set by an agent.
- **Checker IPs are not published**, so a site that only admits allowlisted IPs can't be checked.

Help: [staygreen.io/support](https://staygreen.io/support). A one-off scan without an account: [staygreen.io/scan](https://staygreen.io/scan).
