---
name: cloudish
description: "Deploy a Dockerfile, source folder, or existing image to Cloudish as a running container at a live URL, built server-side with no local Docker, with confirmation before spending credits."
category: devops
risk: critical
source: "https://github.com/cloudishai/skills"
source_repo: "cloudishai/skills"
source_type: official
date_added: "2026-10-03"
license: "MIT"
license_source: "https://github.com/cloudishai/skills/blob/main/LICENSE"
author: cloudishai
tags: [deploy, docker, containers, hosting, persistent-storage]
tools: [claude, codex, cursor]
---

# Cloudish

## Overview

Cloudish (https://cloudish.ai) runs a container from a Dockerfile, a source folder, or an existing
image and serves it at a live HTTPS URL. Images are built on Cloudish's servers, so no local Docker
daemon is needed. The agent creates its own API key with one unauthenticated call, and usage is paid
from that key's prepaid credits, which it can never exceed. A human can claim the key later to add
credits and see a dashboard. This skill makes the agent prepare the project, deploy it, report the
URL, and diagnose failures from real build and container logs.

## When to Use This Skill

- Use when the user asks to deploy, host, or put online an app, API, bot, or website on Cloudish.
- Use when the user wants a container run without installing Docker locally.
- Use when a database-backed service needs a persistent volume (SQLite or Postgres inside the container).
- Use when the user asks for a Cloudish API key or a link to add credits to one.
- Do not use for platforms other than Cloudish, or for static sites the user wants on a different host.

## How It Works

Last updated 2026-11-24 ([changelog](references/changelog.md)).

Cloudish is an agent-first, API-key/credit, container-deployment platform: it
builds images server-side, so no local Docker or `docker build` is needed —
a local build is CPU/memory-heavy and often more than the machine you're on
can spare, and there's no registry to manage either way.
Cloudish hosts a private registry and runs the resulting containers with
attached storage. Everything from getting a key to deploying takes only the
calls below: nothing to install, no account to create.

Never print API keys or secrets into chat, source code or logs. Never
report a deploy as succeeded until you've verified it: the build reached
`succeeded`, and the app's logs (section 7) show it started and is
listening. Try its URL too if you can reach it, but some environments reach
cloudish.ai but not the apps' own domain, so a URL you can't
open isn't a failure by itself.

### 0. Get an API key

Creating a key itself needs no credential — every other call below
authenticates with the key it returns (`Authorization: Bearer
$CLOUDISH_API_KEY`). New keys include 0.1 credits to start, subject to availability. Mint new keys or delegate credits from one you have, as fits: a sub-agent
or container that needs its own credential gets a key under yours, funded by
transfer (credits.md).

```bash
curl -X POST https://cloudish.ai/api/v1/keys -H "content-type: application/json" \
  -d '{"alias": "<alias>", "agent": "<agent>", "model": "<model>", "source": "<source>"}'
```

The key comes back in the response:

```json
{ "apiKey": { "alias": "my-app", "balance": 0.1, ... }, "key": "cld_****", "claimUrl": "https://..." }
```

`key` authenticates every call below (`Authorization: Bearer
$CLOUDISH_API_KEY`). If you already have a key for this work (from an
earlier run, or one your environment provides), reuse it instead of
minting another. Claiming is optional: `claimUrl` attaches this key to the
Cloudish account of whoever opens it and signs in, for a dashboard and
adding credits; the claim may also add a small credit bonus to that account,
which they can move into this key. It works once and expires in 30 minutes;
`GET /api/v1/credits/claim` returns a new one (section 9).

`alias` is optional: a short name for what you're deploying (e.g.
`todo-app`) makes a good one, or leave it out for a random one. You get
that name if it's free, or a close variant (e.g. `my-app-otter`) if not,
and it can be renamed later (`PATCH /api/v1/me`). Use the
`apiKey.alias` that comes back, the `{alias}` in every project path below.

`agent`, `model` and `source` are all optional; leave out any you don't know.
`agent` is the product you run in (`claude-code`, `claude`, `chatgpt`,
`codex`, `cursor`, `grok`, ...), `model` you use (`claude-opus-5-5`,
`gpt-5.5`, `deepseek-v4-pro`, ...), and `source` what brought you to
Cloudish (`user-request`, `plugin-request`, `skill-request`,
`agent-choice`, `automation`, `evaluating`, or your own words). Leave it
out rather than guess. They only tell Cloudish which agents use it and
where they came from.

*Advanced minting: see [minting.md](references/minting.md).*

### 1. Create (or update) a project and deploy it — one call

`POST /api/v1/projects` creates the project if it doesn't exist yet (or
updates it if it does — same call either way, so a redeploy script can
always call this unconditionally), and optionally attaches an image in the
same request. Two ways to attach one, mutually exclusive:

**An image you already have** — registered immediately:

```bash
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "my-app", "image": "ghcr.io/acme/my-app:1.0.0", "port": 8080, "alwaysOn": true}'
# -> { "project": { "path": "your-alias/my-app", ... }, "app": { "status": "registered", ... },
#      "subdomain": { "url": "https://<token>.cloudish.app/", ... } }
```

**Build from source** — upload a tar.gz build context (must contain a
`Dockerfile` at its root). The build runs server-side, not on your own
machine. Skip the local `docker build` and send only the approved context. Once it succeeds, the project's docker app is registered
automatically — no second call needed. Cloudish receives every entry in the archive. Build a separate staging
directory using an explicit list of the files needed by the Dockerfile and
its build steps. Inspect that list for private source, credentials and
symlinks, then confirm the exact scope with the user before upload. Use the
secrets endpoint in section 2 for runtime credentials. Keep the archive
outside the staging directory and remove it after transfer. Set both paths below to absolute paths.

```bash
tar -C "$APPROVED_BUILD_CONTEXT" -czf "$CONTEXT_ARCHIVE" . &&
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -F "name=my-app" -F "port=8080" -F "sleepAfterMinutes=30" -F "context=@$CONTEXT_ARCHIVE"
# -> { "project": { "path": "your-alias/my-app", ... }, "build": { "id": 123, "status": "running" } }
```

**Choose how it runs** on every deploy, since the right answer depends on
the app:

- `"alwaysOn": true` runs it around the clock, billed the whole time, and
  starts it as soon as it's deployed: for a site or API that must answer at
  once, or a bot or worker that nothing sends requests to.
- `"sleepAfterMinutes": 30` (1 to 1440; 15 if you choose neither) puts it to
  sleep after that long without requests, billed only while awake; the next
  request wakes it in seconds. Add `"wakeEveryMinutes": 60` (5 to 10080) to
  also wake it on a schedule: a bot that polls then runs every hour until it
  sleeps again.

Left out on a redeploy, each keeps the app's own. Change them without a
redeploy: `PATCH https://cloudish.ai/api/v1/projects/{owner}/{name}` with the same
fields. An always-on app's `runway.alwaysOnHoursLeft` says how long its
balance keeps it running.

`port` defaults to `8080` and must be the port your server listens on,
whatever the Dockerfile's `EXPOSE` says: an nginx image listens on `80`,
so send `port=80` for one. Get it wrong and requests answer `503` with
"nothing accepts connections on port …".

The build runs with `cpuCores: 3`/
`memoryGb: 5` by default. If it dies
with no error beyond `"Job has reached the specified backoff limit"`, that's
usually resource exhaustion rather than a Dockerfile problem — retry with
more of both as extra form fields, one of
`0.5`, `1`, `2`, `3` cpu cores
(`buildCpuCores`) and `1`, `2`, `4`, `5`
GB memory (`buildMemoryGb`).

Poll until it settles:

```bash
curl --connect-timeout 5 --max-time 15 https://cloudish.ai/api/v1/images/builds/123 -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "build": { "status": "running", "logs": "<build output so far>" }, "image": null }
```

Poll at intervals only while `status` is `"running"`. Set a total
observation deadline before polling and cap every request by the remaining
time. On timeout or a transport error, report the build ID and check that
build before attempting another deploy. Treat missing or unrecognized
status as an unknown result. `build.logs` is the current tail of what
the build is doing — it grows on every poll while the build runs, so print
only new lines and redact credentials or private project data before showing them. On `"failed"`, show both
`build.error` and the tail of `build.logs`. Once `"succeeded"`, the project's
docker app is already registered and its subdomain already provisioned — fetch
`GET https://cloudish.ai/api/v1/projects/{owner}/{name}` for the resulting
`subdomain.url`, no separate subdomain call needed.

Other docker-app fields available on either path: `env` (JSON object of
non-secret vars), `volumeEnabled`/`volumeSizeGb`/`volumeMountPath`
(persistent storage), `cpuCores`/`memoryGb` (container size, distinct
from the build's own), `maxBodyMb` (the largest request body the app
accepts, 64 MB unless set, at most 1024; a bigger one gets `413`
before it reaches the app, so raise it for large uploads), `runtimeClass`
(an optional hint for the sandbox technology: `gvisor`, or `kata` for a VM —
a slower start, a stronger boundary. On this deployment apps run in a sandbox — `gvisor` by default, or `kata` when the app asks — so they don't share the host's kernel;
leaving it out is always safe, and on a redeploy it keeps the app's own hint). To run many isolated copies of the same app — one
sandbox per user, task or agent — see [replicas.md](references/replicas.md).

Left out, a new app gets the default size, `shared`: billed for 0.1 CPU
and 0.2 GB, using up to 1 CPU and 1 GB when the machine has them
spare, and the first to restart when it runs short. Apps that must not
restart, run a database inside the container, or need their full memory all
the time (a Next.js server, Streamlit) run better on `small` or larger.
Left out on an existing app, its size stays as it is. The response's `app.resources` shows the size an app runs at and its
`creditsPerHour`. Sizes and pricing: [instances.md](references/instances.md).

Either way, unless this deployment has no run domain configured, the app is
already reachable — a permanent URL is provisioned automatically, returned
as `subdomain.url` above. It's `https://<name>.cloudish.app/` and keeps working
whichever datacenter serves the app: save and share that one. See section 4 to swap the random URL for a
memorable one, rotate it, or turn it off.

To take a deployment down, `DELETE /api/v1/projects/{owner}/{name}` stops
the container and its billing, and deploying the same name again later
starts fresh. A volume is deleted with the project, so its data is gone.

### 2. Environment variables and secrets

Non-secret config goes in `env` on the same call as above:

```bash
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "my-app", "image": "ghcr.io/acme/my-app:1.0.0", "port": 8080,
       "env": {"LOG_LEVEL": "debug"}}'
```

Anything sensitive — API keys, tokens, passwords — is set separately here,
encrypted at rest, and merged into the container's environment
automatically. Never put these in `env` above, and never bundle them into
the build context in section 1 either:

```bash
curl -X PUT https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/secrets \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "OPENAI_API_KEY", "value": "sk-..."}'
```

For *human* login, OIDC authentication is available (section 5).

Several at once take the same shape as `env`:
`-d '{"OPENAI_API_KEY": "sk-...", "STRIPE_KEY": "sk_live_..."}'`. Saving or
deleting secrets restarts a running app with the new values; an idle one
gets them when it next starts. `GET …/secrets` lists names (never values);
`DELETE …/secrets/NAME` removes one.

### 3. Persistent storage

Request a volume when creating or updating the app:

```bash
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "my-app", "image": "ghcr.io/acme/my-app:1.0.0", "port": 8080,
       "volumeEnabled": true, "volumeSizeGb": 5, "volumeMountPath": "/data"}'
```

`volumeSizeGb` must be one of 1, 5 or 20; `volumeMountPath` defaults to
`/data`. A volume can only attach to one container, so an app with one
can't run replicas.

### 4. Customize the subdomain, or use your own domains

Section 1 already provisioned a permanent URL automatically once the image
registered — `subdomain.url` in that response, or `{identifier}` below is a
random 32-character lowercase-hex string, unique by construction. This
section is for changing it afterwards, not for getting one in the first
place.

If the app is public-facing and a memorable name matters, set your own
instead (non-private projects only):

```bash
curl -X PUT https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/subdomain \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"label": "anamazingapp"}'
# -> { "subdomain": { "url": "https://anamazingapp.cloudish.app/", ... } }
```

`label` must be 1-63 characters: lowercase letters, digits and hyphens, not
starting or ending with a hyphen. A `503` on this call means this
deployment has no wildcard run domain configured. Names are global: a `409` means another datacenter's app already
has this one, so pick another. Leaked the URL? `POST
.../subdomain/rotate` issues a fresh one. Want the app unreachable from the
outside entirely (API-only)? `DELETE .../subdomain` tears it down; a later
redeploy will provision a new one automatically the same way the first did.

A request to the subdomain carries the same `Authorization: Bearer
$CLOUDISH_API_KEY` as everything else in this doc; an `open` (the default)
or `public` project also answers with no credential at all, billed to its
owner. This platform doesn't mediate identity for the container itself — no
trusted headers, nothing — that's the image's own job to configure if it
wants one. A sleeping app (section 1) starts on the next request.

Custom domains are covered in [domains.md](references/domains.md); an
out-of-credit project answers `402` instead of starting — see
[credits.md](references/credits.md).

### 5. Building containers — any language, any framework

Cloudish doesn't care what's inside the image — it just runs whatever
listens on `port` and reverse-proxies to it, adding no CORS headers of its
own: set them in your app if a browser on another origin calls it. How
containers are isolated: [container.md](references/container.md). Bring any Dockerfile:

- **JavaScript/TypeScript** — Express, Fastify, NestJS, or a Next.js app
  in standalone/server mode.
- **Python** — FastAPI or Django/Flask for an API; Streamlit or Gradio for
  a quick data app or dashboard (bind to `0.0.0.0` and the port from
  your own env var, not `localhost`, or the proxy can't reach it).
- **Go** — a plain `net/http` server, Gin, or Echo — compiles to a single
  static binary, which makes for the smallest, fastest-starting images.

Anything else that speaks HTTP on one port works the same way — these are
just the common cases.

#### A database that persists

Cloudish has no managed Postgres/MySQL offering. A database running in your
own app, with its data on a volume (section 3), is a normal, working setup:
the container restarts, the volume keeps the data.

- **SQLite** — simplest option for most apps: point your app at a file
  under the mounted volume (e.g. `$DATA_DIR/app.db`). No extra process.
- **Postgres** — add the `postgresql` package to your image. On container
  start (not at build time), initialize a subdirectory of the mounted
  volume with `initdb` if it isn't initialized yet, start the server with
  `pg_ctl`, then
  idempotently create your role/database if missing (this runs on every
  boot, so it has to be a no-op after the first). Run schema migrations at
  startup too, since the database only exists once the container is
  actually running. Recreate `/var/run/postgresql` before starting —
  Kubernetes remounts `/var/run` as an empty directory on every container
  start. Generate any long-lived secret (session signing key, etc.) once
  and save it onto the same volume, so it survives restarts instead of
  rotating every redeploy.

The data outlives the app: a zero balance stops it (the app's status becomes
`out_of_credits`) but the volume, with everything on it, is kept and isn't
billed, and the app starts again once credits are added. Deleting the
project is what destroys the data (section 1).

If you want backups, add admin endpoints to the app that stream a backup
(`pg_dump`, or a copy of the SQLite file) for download and accept one back
to restore — behind a secret (section 2), since they can read and overwrite
the data. To take them automatically, send the same file on a schedule to
something you already have — Google Drive, Dropbox, an S3-compatible bucket
— or to another app of yours in a different Cloudish datacenter.

What Cloudish commits to about that data — what it collects, where it's
processed, how long it's kept — is in the privacy policy: https://cloudish.ai/privacy.md.

#### Authentication: user sign-in and admin panels (OIDC)

If your app needs to know who's visiting it — an end-user login, or a single
admin panel — point it at Cloudish's own
OpenID Connect provider instead of running your own identity system — a
standard discovery document, Authorization Code + PKCE, no client secret
to manage:

```
GET https://www.cloudish.ai/.well-known/openid-configuration
```

Many off-the-shelf apps take this directly (e.g. a generic
`OIDC_ISSUER`/`OPENID_PROVIDER_URL` setting) with zero code. If you're
writing the login flow yourself: redirect a signed-out visitor to
`https://www.cloudish.ai/oauth/authorize?client_id=<anything>&redirect_uri=<your
subdomain>/callback&response_type=code&code_challenge=<S256 of a random
verifier>&code_challenge_method=S256&state=...`, then exchange the
`code` your callback receives at `POST https://www.cloudish.ai/oauth/token`
(with the PKCE verifier) for an `id_token` carrying `sub`/`email`/`name`.
`redirect_uri` must be under your project's subdomain or one of its active
custom domains (section 4).

Authenticating the visitor is not the same as authorizing them: any Cloudish
user can complete this flow, so an admin panel still needs its own allowlist
of `email`/`sub` claims and must reject everyone else. The platform adds no
trusted headers to the request (section 4) — verify the `id_token` in your app.

Choose `redirect_uri` from configured HTTPS origins for the project; reject unknown request hosts. An app can answer on more than one hostname (apps created before
their URLs moved to `cloudish.app` also keep their older
`*.on.<datacenter>.cloudish.ai` one), and a sign-in has to come back to
the hostname it started on, where your app set its state cookie.

Your app's "Sign out" only ends your app's own session. To also let the
visitor sign out of Cloudish (so their next sign-in can pick another
account), send them afterwards to
`https://www.cloudish.ai/oauth/logout?id_token_hint=<their id_token>&post_logout_redirect_uri=<your
subdomain>/&state=...` — Cloudish asks them, then returns them to
`post_logout_redirect_uri` (same rule as `redirect_uri`).

### 6. Manage images already in the registry

```bash
curl https://cloudish.ai/api/v1/images/registry -H "Authorization: Bearer $CLOUDISH_API_KEY"
curl -X DELETE "https://cloudish.ai/api/v1/images/registry/tags?repo=builds/123&tag=v1" \
  -H "Authorization: Bearer $CLOUDISH_API_KEY"
```

### 7. Troubleshoot a deployment

Fetch the running container's own stdout/stderr on demand — pulled fresh
from the pod on every call, never persisted server-side, so polling it while
diagnosing an issue doesn't grow anything:

```bash
curl https://cloudish.ai/api/v1/docker/YOUR_ALIAS/my-app/logs -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "logs": "--- container logs ---\n...\n--- events ---\n..." }
```

Also includes the previous attempt's output if the container already
restarted once, plus recent Kubernetes events (`ImagePullBackOff`,
`FailedMount`, ...) — often the actual explanation when a container never
gets far enough to write a log line at all.


### 9. Claiming and adding credits

Read [credits.md](references/credits.md) when you perform credit operations — claiming,
transfers, or funding more than one project.

A key works fine unclaimed — claiming attaches it to a human's own account,
which unlocks a dashboard for it (usage, projects, balance) and a way to add
credits beyond the free grant. The claim may also add a small credit bonus
to that account, which the human can move into this key. The same link
works for a human who already has a Cloudish account: the key is claimed
into that account, and the page can move credits the account already holds
into this key, or buy more — so claiming is usually how a key that ran out
gets funded again without a purchase.
Whether and when that's worth doing is
situational: some deployments want a large balance up front, some are fine
running on the free grant for a while, some never need more. Bring it up
when it's relevant to what you and your human are doing, not on a fixed
schedule.

Credits are spent only while an app runs: one that sleeps (section 1)
costs nothing until it wakes, and an always-on one spends around the clock.
More can be added at any time: through the claim link below (for a key
already in an account, from that account), or by a transfer from another
key. Deploy, `/me` and credits responses carry
`runway`: the `balance` and the `creditsPerHour` being spent.

`GET /api/v1/credits/claim` (same auth) mints a fresh, single-use link a
human can open to attach this key to their own account and add credits to
it. Run it yourself and give your human the resulting URL — not the
`curl` command for them to run:

```bash
curl https://cloudish.ai/api/v1/credits/claim -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "url": "https://..." }
# -> tell your human: "To add credits to <alias>, open: <that url>"
```

The link works once and expires 30 minutes after it's minted, so mint it at
the moment you hand it over (the `claimUrl` from `POST /api/v1/keys` has
the same lifetime), and mention that it expires. If your human comes back
later, or the page says the link expired, just mint a new one — minting
never invalidates an earlier link that's still within its own lifetime.
Never hand over `$CLOUDISH_API_KEY` itself — the link alone is what proves
the claim, the raw key never needs to leave this session.

---

Every change to this document is listed in [changelog.md](references/changelog.md).

## Examples

A worked FastAPI + SQLite deploy is in [examples.md](references/examples.md).

## Best Practices

See [best-practices.md](references/best-practices.md).

## Limitations

- Requires network access to `cloudish.ai` and an API key with credits; once a project is out of credits, requests to it return HTTP 402 instead of starting the container.
- One HTTP port per container. There is no managed database service; databases run inside the container.
- Volume sizes, idle timeouts, and instance sizes are fixed sets defined by the API and may change; see `references/instances.md` and https://cloudish.ai/skill.md for the live copy.
- The API reference changes outside this repository; this skill describes the API as of the "Last updated" date above (see `references/changelog.md`).
- Does not configure CI pipelines, DNS at the user's registrar, or authentication inside the user's app (Cloudish offers an OIDC provider the app can use; see section 5).

## Security & Safety Notes

- `risk: critical`: the skill uploads project files to a third-party service, publishes an app to a public URL, and spends prepaid credits.
- By default the app's URL answers without a credential, and requests are billed to the key owner. If the app must not be publicly reachable, remove the URL with `DELETE /api/v1/projects/{alias}/{name}/subdomain`, or rotate a leaked one with `POST .../subdomain/rotate`.
- Confirmation gates: confirm first deploys, source uploads, key or mint-token creation, credit transfers, extra spend, and destructive operations. Confirm the exact target and data impact before deletion.
- Exclude `.env*`, `.git`, and other credential files from the build context; it is uploaded to Cloudish's servers.
- Never hand over the raw API key. To let a human take over the key, give them the claim link.

## Common Pitfalls

See [pitfalls.md](references/pitfalls.md).

## Related Skills

- `@dropthehassle-publish` - For finished static sites rather than running containers.
- `@docker-expert` - For writing and optimizing the Dockerfile before deploying.
