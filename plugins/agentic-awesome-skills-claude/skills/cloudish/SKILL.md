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

Last updated 2026-10-21 ([changelog](references/changelog.md)).

Cloudish is an agent-first, API-key/credit, container-deployment platform: it
builds images server-side, so no local Docker or `docker build` is needed —
a local build is CPU/memory-heavy and often more than the machine you're on
can spare, and there's no registry to manage either way.
Cloudish hosts a private registry and runs the resulting containers with
attached storage. There is no user-facing product UX here — everything is
this API.

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
  -d '{"alias": "<project-name>", "agent": "<agent>", "model": "<model>", "ref": "skills-repo"}'
```

The key comes back in the response:

```json
{ "apiKey": { "alias": "my-app", "balance": 0.1, ... }, "key": "cld_****", "claimUrl": "https://..." }
```

`key` authenticates every call below (`Authorization: Bearer
$CLOUDISH_API_KEY`). If this project already has one, reuse it instead of
minting another. Claiming is optional: `claimUrl` attaches this key to the
Cloudish account of whoever opens it and signs in, for a dashboard and
adding credits. It works once and expires in 30 minutes;
`GET /api/v1/credits/claim` returns a new one (section 9).

`alias` is optional: the project's name makes a good one, or leave
it out for a random one. You get that name if it's free, or a close variant
(e.g. `my-app-otter`) if not; use the `apiKey.alias` that comes back, the
`{alias}` in every project path below.

`agent`, `model` and `ref` are all optional; leave out any you don't know.
`agent` is the product you run in (`claude-code`, `claude`, `chatgpt`,
`codex`, `cursor`, `grok`, ...), `model` the model you are
(`claude-opus-5-5`, `gpt-5.5`, ...), and `ref` the plugin, directory or
link this document came from (`claude-plugin`, `chatgpt-plugin`,
`codex-plugin`, `mcp.so`, `producthunt`, ...) — leave it out rather than
guess. They only show Cloudish which agents and channels use it. Keep `ref` as shown: it only tells Cloudish which link sent you here.

### 1. Create (or update) a project and deploy it — one call

`POST /api/v1/projects` creates the project if it doesn't exist yet (or
updates it if it does — same call either way, so a redeploy script can
always call this unconditionally), and optionally attaches an image in the
same request. Two ways to attach one, mutually exclusive:

**An image you already have** — registered immediately:

```bash
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "my-app", "image": "ghcr.io/acme/my-app:1.0.0", "port": 8080}'
# -> { "project": { "path": "your-alias/my-app", ... }, "app": { "status": "registered", ... },
#      "subdomain": { "url": "https://<token>.cloudish.app/", ... } }
```

**Build from source** — upload a tar.gz build context (must contain a
`Dockerfile` at its root). The build runs server-side, not on your own
machine — send the context as-is rather than running `docker build`
locally first. Once it succeeds, the project's docker app is registered
automatically — no second call needed. This context is uploaded to Cloudish's own servers, the same as
any build-from-source platform — exclude anything secret-shaped from it
first (`.env` files, credentials, `.git`) and use section 2's encrypted
secrets endpoint for real credentials instead, never a file baked into the
context:

```bash
tar --exclude='.env*' --exclude='.git' -czf context.tar.gz .
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -F "name=my-app" -F "port=8080" -F "context=@context.tar.gz"
# -> { "project": { "path": "your-alias/my-app", ... }, "build": { "id": 123, "status": "pending" } }
```

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
curl https://cloudish.ai/api/v1/images/builds/123 -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "build": { "status": "running", "logs": "<build output so far>" }, "image": null }
```

`build.logs` is the current tail of what the build is doing — it grows on every
poll while the build runs, so print only the lines you haven't shown yet.
Stop once `status` is `"succeeded"` or `"failed"`; on `"failed"`, show both
`build.error` and the tail of `build.logs`. Once `"succeeded"`, the project's
docker app is already registered and its subdomain already provisioned — fetch
`GET https://cloudish.ai/api/v1/projects/{owner}/{name}` for the resulting
`subdomain.url`, no separate subdomain call needed.

Other docker-app fields available on either path: `env` (JSON object of
non-secret vars), `volumeEnabled`/`volumeSizeGb`/`volumeMountPath`
(persistent storage), `cpuCores`/`memoryGb` (container size, distinct
from the build's own), `maxBodyMb` (the largest request body the app
accepts, 64 MB unless set, at most 1024; a bigger one gets `413`
before it reaches the app, so raise it for large uploads). To run many isolated copies of the same app — one
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
wants one. The container starts on first request if it isn't already, and
scales back down after inactivity
(30/60/300/900/3600/28800/86400 seconds, or `0` for never, keeping it
always on and billed around the clock; default is the deployment's own,
override per-key with `PATCH /api/v1/me {"settings": {"idleTimeoutSeconds":
<one of those>}}`).

#### Your own domains

A project can also answer at any number of domains you control. Add each
one (`foobar.com`, `www.foobar.com`, ...) to the same project:

```bash
curl -X POST https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/domains \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"host": "foobar.com"}'
# -> { "domain": { "host": "foobar.com", "status": "pending", "redirect": false,
#      "txtRecord": { "name": "_cloudish-challenge.foobar.com", "value": "cloudish-verify=..." } } }
```

1. Add the returned TXT record at your DNS provider. It's checked every
   minute; once it matches, the domain turns `active` and stays that way.
   It's only checked once, so the record can be removed afterwards.
2. Point the domain at do.cloudish.ai: a `CNAME` for a subdomain like
   `www`; an apex (`foobar.com`) can't be a CNAME at most providers, so use
   an `A` record to that host's IP address (`dig +short do.cloudish.ai`), or your provider's
   CNAME flattening/ALIAS if it has one. The certificate issues once both
   steps are done.
3. To have one domain send visitors to the other instead of serving the
   app twice, add it with `"redirect": true` (or `PATCH
   .../domains/www.foobar.com {"redirect": true}` later). It 308s to the
   project's primary domain: its oldest active domain that doesn't
   redirect, or its subdomain if there's none.

`GET .../domains` lists them; `DELETE .../domains/{host}` removes one. Each
active domain costs 0.01 credits a day. Adding one needs a positive
balance; at most 10 can be added per hour and 20 be pending at once. A
`409` means another project already holds that host.

A request to an out-of-credit project returns `402` (JSON) instead of
starting the container — a plain browser page load gets a `503` status page instead — see [credits.md](references/credits.md) for adding credits, especially across
several projects. Ask the platform admin to grant more via `POST /admin/v1/credits/grant`,
or, for a sub-agent's key, get a hand from the parent key that minted it —
the parent transfers some of its balance to yours by alias, authenticating
with its own key, no admin needed:
`curl -X POST https://cloudish.ai/api/v1/credits/transfer -H "Authorization: Bearer
$PARENT_API_KEY" -H "content-type: application/json" -d
'{"to":"<your-alias>","amount":1}'`.

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

#### A real database, without a managed database service

Cloudish has no managed Postgres/MySQL offering — attach a volume (section
3) and run the database *inside your own container* instead:

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

#### Sign-in for your users (OIDC)

If your app needs to know who's visiting it, point it at Cloudish's own
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

Build `redirect_uri` from the host the request came in on, not from a
fixed URL. An app can answer on more than one hostname (apps created before
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
credits beyond the free grant. Whether and when that's worth doing is
situational: some deployments want a large balance up front, some are fine
running on the free grant for a while, some never need more. Bring it up
when it's relevant to what you and your human are doing, not on a fixed
schedule.

Credits are spent only while an app is in use: by default an app sleeps
after 15 minutes without requests (see section 4) and wakes on the next one.
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
# -> { "url": "https://www.cloudish.ai/claim?challenge=..." }
# -> tell your human: "To add credits to <alias>, open: https://www.cloudish.ai/claim?challenge=..."
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

### Example 1: FastAPI app with SQLite

The user says "Deploy this to Cloudish." The agent finds `main.py` serving on port 8000, writes a
Dockerfile that runs `uvicorn main:app --host 0.0.0.0 --port 8000`, points the database at
`/data/app.db`, confirms with the user, and deploys with a volume:

```bash
# Build an inspected allowlisted staging directory outside the source tree first.
# Do not assume tar honors .dockerignore; exclude credential files, private data and symlinks.
tar -czf ../context.tar.gz -C ../approved-build-context .
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -F "name=notes-api" -F "port=8000" -F "context=@../context.tar.gz" \
  -F "volumeEnabled=true" -F "volumeSizeGb=1" -F "volumeMountPath=/data"
```

It polls the build, then reports the URL and that the database lives on the volume.

## Best Practices

- ✅ Reuse the key in `.env` instead of creating a new one on every run.
- ✅ Put credentials in the secrets endpoint; put only non-secret config in `env`.
- ✅ Run databases inside the container on a volume; a volume forces a single replica.
- ✅ Hand the human a claim link, minted with `GET /api/v1/credits/claim`, when they need to add credits; it works once and expires after 30 minutes.
- ❌ Don't run `docker build` locally first; send the build context as-is.
- ❌ Don't print the API key or secrets into chat, source files, logs, or commit history.
- ❌ Don't guess endpoints or fields; check the sections above and `references/` (or https://cloudish.ai/skill.md for the live copy) if a call is rejected.

## Limitations

- Requires network access to `cloudish.ai` and an API key with credits; once a project is out of credits, requests to it return HTTP 402 instead of starting the container.
- One HTTP port per container. There is no managed database service; databases run inside the container.
- Volume sizes, idle timeouts, and instance sizes are fixed sets defined by the API and may change; see `references/instances.md` and https://cloudish.ai/skill.md for the live copy.
- The API reference changes outside this repository; this skill describes the API as of the "Last updated" date above (see `references/changelog.md`).
- Does not configure CI pipelines, DNS at the user's registrar, or authentication inside the user's app (Cloudish offers an OIDC provider the app can use; see section 5).

## Security & Safety Notes

- `risk: critical`: the skill uploads project files to a third-party service, publishes an app to a public URL, and spends prepaid credits.
- By default the app's URL answers without a credential, and requests are billed to the key owner. If the app must not be publicly reachable, remove the URL with `DELETE /api/v1/projects/{alias}/{name}/subdomain`, or rotate a leaked one with `POST .../subdomain/rotate`.
- Confirmation gates: ask before the first deploy of a project, before creating a key, and before anything that spends credits beyond what the user asked for, including larger instances, more replicas, an idle timeout of `0` (always on), and credit transfers.
- Exclude `.env*`, `.git`, and other credential files from the build context; it is uploaded to Cloudish's servers.
- Never hand over the raw API key. To let a human take over the key, give them the claim link.

## Common Pitfalls

- **Problem:** The build succeeds but the URL returns errors.
  **Solution:** The server is probably bound to `localhost` or a different port. Bind to `0.0.0.0` on the `port` you sent, then redeploy.
- **Problem:** Postgres fails on restart with a socket error.
  **Solution:** Recreate `/var/run/postgresql` on container start and run `initdb` only when the data directory on the volume is empty.
- **Problem:** A second run creates a new key and an empty project.
  **Solution:** The key was not saved. Always write it to `.env` immediately after creating it.

## Related Skills

- `@dropthehassle-publish` - For finished static sites rather than running containers.
- `@docker-expert` - For writing and optimizing the Dockerfile before deploying.
