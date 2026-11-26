# Cloudish changelog

Every change to the documents agents read (SKILL.md, credits.md,
instances.md, replicas.md, container.md, minting.md and llms.txt) and to API
behavior agents rely on. Newest first. SKILL.md's "Last updated" date is the
newest entry's.

## 2026-11-24

- `POST /api/v1/keys` takes an optional `source`: a short free-text answer to
  what brought the agent to Cloudish (`user-request`, `plugin-request`,
  `skill-request`, `agent-choice`, `automation`, `evaluating`, or its own
  words). It replaces the optional `ref` link slug in SKILL.md's example.
  `?ref=` and the `ref` body field are no longer advertised or written;
  old copies that still send `ref` keep working (it is ignored).

## 2026-11-21

- Published documents name the platform's site, not the answering
  datacenter's. llms.txt's Website links and SKILL.md's claim and sign-in
  (OIDC) examples use the canonical `www.cloudish.ai`, derived from
  `cloudish.alias`, so a copy fetched from a datacenter host — or proxied
  from one by www.cloudish.ai — points at the same place after the alias
  moves. The claim URL an API response actually returns is unchanged and
  stays authoritative.
- SKILL.md's custom-domain step points the domain's `CNAME`/`A` record at
  the floating alias (`cloudish.ai`), not the datacenter that answered, so
  custom domains follow the alias on failover. Section 8 still names the
  datacenter that answered, since that is what it is about.

## 2026-11-18

- The GPU is described in instances.md only: what kind it is (an NVIDIA
  RTX 4060 on this deployment's on-prem datacenters, `gpu.model` in each
  config), the flat hourly price, the `409` `gpu_busy` behavior while
  another app holds it, and the CUDA image hint. SKILL.md links
  instances.md for sizes and pricing and no longer says anything about the
  GPU itself.

## 2026-11-15

- Mint tokens (`mnt_...`): a credential an orchestrator can hand an agent
  that may never deploy. It can only mint a child of the key that issued it
  (`POST /api/v1/keys`), bounded by `maxChildren`, `expiresInMinutes`,
  `childCredits` (funds each child from the issuer in the same request),
  per-child credit limits, a per-child daily quota and revocation
  (`POST`/`GET /api/v1/mint-tokens`, `DELETE /api/v1/mint-tokens/{id}`).
  An agent that never deploys never holds a spendable key. This is an
  advanced option; SKILL.md mentions it only as a footnote, and the new
  minting.md has the details.
- `GET /api/v1/me` and `GET /api/v1/credits` report the lower of a key's
  own daily quota and any ceiling set from above by the mint token that
  created it; the key cannot raise it.

## 2026-11-11

- SKILL.md section 9's claim example names this deployment's own site —
  `www.do.cloudish.ai` in do, `www.anton.cloudish.ai` in anton — instead of
  always `www.cloudish.ai`. A claim link is redeemed by the site backed by
  the datacenter whose database holds the challenge, so a key that lives
  in another datacenter is forwarded there first and gets that one's link
  (section 8 says which datacenter answered). The static copy bundled into
  a plugin shows the response's shape only, since it can't know which
  deployment will serve it.
- SKILL.md section 1's `runtimeClass` field now says how this datacenter
  runs apps by default — in a sandbox (`gvisor` in Seattle, or `kata` when
  the app asks), or that apps share the host's kernel. container.md's
  "Where a container runs" says the same thing in the same words, instead
  of always claiming there is no per-app sandbox. Both come from
  `configs/config-seattle.yaml`'s `runtime.docker.runtimeClassName`, so each
  datacenter's copy states its own.

## 2026-11-10

- Deploying an app accepts an optional `runtimeClass` — `gvisor`, or `kata`
  for a VM — as a hint for the sandbox technology its pods should run in.
  The only accepted values are those two; there is no `runc` value. A
  datacenter that supports that sandbox uses it; one that configures no
  sandbox ignores the hint and runs the app in its own default, so leaving
  it out is always safe. On a redeploy, leaving it out keeps the app's
  current hint. SKILL.md section 1 lists it with the other docker-app
  fields.

## 2026-11-07

- SKILL.md says that claiming can also bring the human's account a small
  credit bonus, which they can move into the key — a little to start with,
  not a replacement for buying credits. It's in the `claimUrl` note
  (section 0) and the claiming section (section 9). How much is set on the
  claiming side, so the document gives no number.
- SKILL.md's claiming section (section 9) says that the same link works
  for a human who already has a Cloudish account: the key is claimed into
  it, and the page can move credits the account already holds into the key,
  or buy more. credits.md's "When a key runs out" points there, so on a
  `402` an agent asks for a claim instead of assuming a purchase.

## 2026-11-06

- SKILL.md section 1's build poll now says to poll **only while `status` is
  `"running"`**, instead of "stop once `status` is `"succeeded"` or
  `"failed"`". The old wording listed the two states a loop should end on
  and said nothing about a response that isn't a build at all — a `401`, a
  `404`, or a timed-out request has no `status`, which is neither, so a
  loop written from it never stopped. Naming the one state to keep going on
  makes every other response the end of the poll.
- The source-build deploy example's response shows `"status": "running"`,
  which is what `POST /api/v1/projects` returns; it said `"pending"`, a
  state the server does not set.

- SKILL.md's database section (now "A database that persists") doesn't
  frame running the database in your app as a workaround, and says what a
  zero balance does: the app stops with status `out_of_credits`, the volume
  and its data are kept and aren't billed, and the app starts again once
  credits are added. Deleting the project is what destroys the data.
- The same section covers backups as an option, not a requirement: the app
  can expose admin endpoints to download and restore a backup (behind a
  secret), and automatic backups can go to a service you already have
  (Google Drive, Dropbox, an S3-compatible bucket) or to another app in a
  different datacenter. credits.md's "When a key runs out" and
  container.md's Storage bullet say the same about volumes surviving a
  zero balance.
- SKILL.md's database section ends with where Cloudish's commitments about
  that data are: the privacy policy, at `/privacy.md`.
- llms.txt's Optional list links the legal documents themselves, as text
  (`/terms.md`, `/privacy.md`), rather than the site's `terms` and
  `privacy` pages, which render those files.
- A `GET` or `HEAD` whose app container can't be reached is sent again after
  500ms and once more after 1.5s before answering `502` (`the application is
  not reachable`). An app with a volume is redeployed with Recreate — its old
  pod stops before the new one listens — so a page load landing in those few
  seconds used to get an error it could do nothing about. Other methods,
  requests whose body is streamed through, and websockets answer as before.

Fixes cloudishai/skills#9. The volume and backup notes answer part of
cloudishai/skills#10, whose availability and restore questions are still
open.

## 2026-11-01

- SKILL.md section 0's example `alias` is `<alias>`, not `<project-name>`:
  it only labels the key (the `{alias}` half of every project path), so
  minting one never waits on a project name. The paragraph says you get the
  name or a close variant, and can rename it later with `PATCH /api/v1/me`.
- Section 0 no longer leans on a project that doesn't exist yet at mint
  time: the alias is "a short name for what you're deploying", and an
  existing key is one "for this work" rather than "for this project".
- SKILL.md section 1 ends with how to take a deployment down:
  `DELETE /api/v1/projects/{owner}/{name}` stops the container and its
  billing, and the same name deployed again starts fresh; a volume is
  deleted with the project, so its data is gone.

## 2026-10-26

- On a datacenter with a GPU, an app can have it: \`"gpu": true\` on deploy,
  at a flat hourly price while it runs, one GPU app at a time (a \`409\`
  \`gpu_busy\` while another has it). That datacenter's SKILL.md and
  instances.md describe it; elsewhere nothing changes.
- Each app says how it runs, on deploy (SKILL.md section 1): \`"alwaysOn":
  true\` keeps it running, billed around the clock, and starts it as soon
  as it's deployed; otherwise it sleeps after \`sleepAfterMinutes\` without
  requests (15 unless set) and wakes on the next one, or on a
  \`wakeEveryMinutes\` schedule, for a bot or worker nothing sends requests
  to. \`PATCH /api/v1/projects/{owner}/{name}\` changes them without a
  redeploy. Both deploy examples show a choice, and the agent makes it.
- The key-wide \`PATCH /api/v1/me {"settings": {"idleTimeoutSeconds": ...}}\`
  is no longer documented. It still applies to apps that choose none of
  these.
- An app's \`status\` says why it's down: \`sleeping\`, \`out_of_credits\`
  (it starts again once its key has credits) or \`stopped\`, and its
  \`sleep\` how it runs. An always-on app's \`runway\` adds
  \`alwaysOnHoursLeft\`.
- Replicas follow their app's \`sleepAfterMinutes\` (replicas.md), and
  instances.md and llms.txt describe the choice.

## 2026-10-25

- `PUT /api/v1/projects/{owner}/{name}/secrets` also takes several secrets
  at once, as a map of names to values like a project's `env`, saved all
  or none and answered as `{"secrets": [...]}`. One `{"name", "value"}` is
  unchanged. A body of neither shape gets a 400 naming both.
- Saving or deleting secrets restarts a running app with the new values,
  and leaves an idle one idle. A secret change used to stop the app
  instead, or reach it only on its next request.
- SKILL.md's secrets section says all of this, and how to list
  (`GET …/secrets`, names only) and delete them.
- SKILL.md's description says "An AI agent creates its own API key", not
  "An agent": "agent" alone can mean a person.

## 2026-10-22

- llms.txt no longer links the website's docs for people, and
  `GET /api/v1/config` no longer returns a `docs` URL: everything an agent
  needs is in SKILL.md and its companion documents.

## 2026-10-21

- Minting a key is one `curl` again (SKILL.md section 0), with a sample
  reply (`"key": "cld_****"`) and what the key is for, with no shell
  snippet for storing it, and what the reply's `claimUrl` does: whoever
  opens it and signs in gets the key in their account. Nothing requires
  claiming. credits.md points there instead of repeating it, and no longer
  assumes `.env` or `$CLOUDISH_ALIAS`.
- The example `alias` is `<project-name>`, not `<project-folder-name>`:
  a folder's name can say more about the machine than the project.
- SKILL.md's intro no longer says Cloudish has no user-facing product (the
  website has a dashboard): everything from getting a key to deploying
  takes only the calls it shows, with nothing to install and no account to
  create.
- llms.txt is written for an agent choosing where to deploy: what it needs
  to finish a deploy with no human (a key, payment, a build, proof it
  worked, a URL), what runs, what it costs (from the same rates as
  instances.md), when another platform fits better, and AI Deploy Bench,
  an open-source benchmark run by Cloudish. It's the only llms.txt: the
  website serves a copy of it, so it no longer links the website's.

## 2026-10-20

- SKILL.md's description no longer claims tasks that are only about choosing
  a host; it applies to deploying, hosting or putting an app online, and to
  tasks naming Cloudish.
- SKILL.md states two rules up front: never print keys or secrets into
  chat, source or logs, and never report a deploy as succeeded until the
  build reached `succeeded` and the app's logs show it listening; its URL
  is worth trying, but some environments can't reach the apps' domain.
- SKILL.md section 0 mints a key with the same snippet as credits.md, so
  its example no longer prints the key; `alias` is in the example body,
  optional, and `. ./.env` loads the key in each shell.
- credits.md saves a new key to `.env` without capturing `curl`'s output in
  `$( )`: the response goes to a temporary `.env.new-key.json` that `jq`
  reads and `rm` removes, so the key still never shows in the agent's output.
  It still mints only when `.env` has no key, writes nothing when the
  request fails, gitignores `.env` and the temporary file first, and the alias (the project
  folder's name) is optional.
- The example image is pinned (`ghcr.io/acme/my-app:1.0.0`), and the intro
  and Postgres steps are reworded; what they say is unchanged.
- `ref` is the plugin, directory or link SKILL.md came from (`claude-plugin`,
  `chatgpt-plugin`, `producthunt`, ...), left out rather than guessed; it
  no longer asks for `user`.
- SKILL.md no longer points to `GET /search`; llms.txt still lists it. Each
  document takes `?links=relative`, which links the others as files beside
  it and leaves out SKILL.md's datacenter section, for copies bundled into
  a plugin.
- SKILL.md's credit transfer example is the parent key funding a sub-agent's
  key (`$PARENT_API_KEY`), not a stranger's key.
- `GET /search?q=your+question` searches these documents and lists every
  section with any of the words. SKILL.md and llms.txt mention it. A path
  with no document on it is now a `404` (the same JSON pointer as before),
  not a `200`.
- A key never goes below zero. Usage is charged only up to the balance it
  holds; whatever runs past that is never owed, so credits added after
  running out all land. credits.md says so under "Checking a balance".
- `POST /api/v1/keys` takes an optional `model` next to `agent` and `ref`,
  and `ref` can now be how you found Cloudish (`chatgpt-plugin`,
  `producthunt.com`, `user`). SKILL.md's example shows all three as
  placeholders; every one is optional.
- Runtimes and sub-agents can get child keys, funded by transfer; agents
  may fund them.

## 2026-10-19

- Apps on port `80` start again; they used to sit on the starting page
  forever. And when a container is running but nothing accepts connections
  on its `port`, the `503` now says so and names the port, instead of
  "timed out waiting for the container to start".
- The project owner pays for an app, whoever calls it. A request with your
  own key used to check your key's balance and could get `402` (or the
  offline page) even though the owner had credits. The `402`'s `alias` is
  now always the owner's.
- Request bodies: an app accepts up to 64 MB by default, set per app with
  `maxBodyMb` (up to 1024). Bodies over 1 MiB used to get `413` from the
  platform no matter what.
- `cloudish.app` is now the official domain for apps: an app's `url` is
  `https://<name>.cloudish.app/`. Keeping apps off `cloudish.ai`, where
  Cloudish's own account and admin sites live, means no app shares a site
  with them, which makes hosting apps safer. Older
  `https://<name>.on.<datacenter>.cloudish.ai/` URLs keep working; their
  responses carry `Deprecation: true` and a `Link` header with the new URL.
- `subdomain.url` is now an app's permanent URL on `cloudish.app`,
  `https://<name>.cloudish.app/`, which works whichever datacenter serves
  it: save and share that one. URLs you saved earlier keep working.
  (`subdomain.globalUrl`, briefly the field for it, is the same value.)
- Names are now global: naming a subdomain answers `409` when another
  datacenter's app already has the name.
- App URLs (`subdomain.url`, replica URLs) are now on `cloudish.app`:
  `https://<name>.do.cloudish.app/` and `https://<name>.anton.cloudish.app/`.
  Apps created before this also keep answering on their older
  `https://<name>.on.<datacenter>.cloudish.ai/`.
- Sign-in (OIDC): build `redirect_uri` from the host the request came in
  on, not a fixed URL. An app can answer on more than one hostname, and a
  sign-in has to come back to the one it started on.
- Started this changelog. SKILL.md now says when it was last updated and
  links here.
