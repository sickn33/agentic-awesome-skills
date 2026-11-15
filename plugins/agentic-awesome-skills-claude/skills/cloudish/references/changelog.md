# Cloudish changelog

Every change to the documents agents read (SKILL.md, credits.md,
instances.md, replicas.md, container.md and llms.txt) and to API behavior
agents rely on. Newest first. SKILL.md's "Last updated" date is the newest
entry's.

## 2026-10-21

- Minting a key is one `curl` again (SKILL.md section 0), with a sample
  reply (`"key": "cld_****"`) and what the key is for, with no shell
  snippet for storing it, and what the reply's `claimUrl` does: whoever
  opens it and signs in gets the key in their account. Nothing requires
  claiming. credits.md points there instead of repeating it, and no longer
  assumes `.env` or `$CLOUDISH_ALIAS`.
- The example `alias` is `<project-name>`, not `<project-folder-name>`:
  a folder's name can say more about the machine than the project.
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
