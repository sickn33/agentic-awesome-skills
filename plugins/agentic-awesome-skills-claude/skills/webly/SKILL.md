---
name: webly
description: "Publish a website or share files at a live URL in seconds with no account, then let the person claim it, edit it over Webly's MCP server, and publish drafts they approve."
category: devops
risk: critical
source: "https://github.com/Webly-AI/webly-plugin/tree/main/skills/webly"
source_repo: "Webly-AI/webly-plugin"
source_type: official
date_added: "2026-10-24"
license: "Apache-2.0"
license_source: "https://github.com/Webly-AI/webly-plugin/blob/main/LICENSE"
author: Webly
tags: [deploy, static-site, hosting, publish, file-sharing, mcp]
tools: [claude, codex, cursor, gemini]
metadata:
  publisher: Webly
  homepage: https://webly.ai
  docs: https://api.webly.ai/docs
  api-contract: https://api.webly.ai/llms.txt
  mcp-server: https://api.webly.ai/v1/mcp
---

# Webly

Webly hosts the websites and shared files and folders that agents publish. Without an account you can publish a site in
one command; it is live for 24 hours and can be claimed for 7 days. The same
machine can also share files (as many links as fit in 500 MiB, the site
included, each live for 24 hours) without giving up its site. Once the
person signs in (OAuth over MCP) the site is theirs: permanent, editable through
Webly's MCP tools, with drafts, a quality gate, rollback, custom domains, forms
and analytics.

`{api}/llms.txt` is the full contract, where `{api}` is the `api` that
`webly.mjs doctor` reports (`https://api.webly.ai` unless `WEBLY_API_URL` is
set). Read it before building a framework (React) site, forms or domains, or
before changing a site that already uses the CMS or a managed blog, and before
telling the person something is not supported. If this file and the live API disagree, trust the API.

The helper that does every deterministic step is `scripts/webly.mjs` in this
skill's folder (zero dependencies, Node 20+). Below, `webly` means
`node <this skill's folder>/scripts/webly.mjs`.

> Adapted from the official Webly skill
> (https://github.com/Webly-AI/webly-plugin/blob/e98872ddbc10361a1412289b4e843166a058dca2/skills/webly/SKILL.md),
> Apache-2.0, see `LICENSE` in this folder. Changes: repository frontmatter and
> the **When to Use This Skill**, **Runtime prerequisite**, **Examples**, and **Limitations** sections were added; the
> catalog bundles documentation and `LICENSE` only (`scripts/webly.mjs` is referenced at the pinned upstream commit below).

## When to Use This Skill

- Use when asked to "publish this", "host this", "deploy this", "put this
  online", "make a website", "share this as a web page" or "give me a link to
  this site".
- Use when asked to "share these files", "send these files" or "give me a
  download link".
- Use when asked to "keep my site", "claim my site", "make a Webly account",
  "connect Webly", "connect my domain" or "use my own domain".
- Use when working on a site hosted on Webly (`*.webly.site`), or at the start
  of a session where a Webly site or an unfinished Webly step is waiting on
  this machine.
- Do not use for secrets or private data: an anonymous site is public as soon
  as it is live.

## Runtime prerequisite

Pinned upstream reference: [Webly-AI/webly-plugin at e98872ddbc10361a1412289b4e843166a058dca2](https://github.com/Webly-AI/webly-plugin/tree/e98872ddbc10361a1412289b4e843166a058dca2).

This catalog entry bundles documentation and `LICENSE` only; `scripts/webly.mjs` is not bundled. Before using local CLI steps (`webly doctor`, `webly deploy`, `webly share`, `webly claim-link`), obtain user consent to fetch the pinned upstream helper from the immutable commit above, inspect its source, and verify its digest before running it, or use an already configured Webly MCP connection.

## Examples

- **Publish a static site:** "Publish `./site` and give me a preview URL." Verify `index.html` and public-only files exist, confirm whether a separately reviewed `webly` helper or Webly MCP server is available, deploy the folder, and return the live `*.webly.site` URL.
- **Claim and edit over MCP:** "Claim my anonymous site and update the hero heading." Check `list_websites` over the authenticated Webly MCP server, complete the claim flow if needed, apply the draft change, and publish only after the user approves the preview.

## Limitations

- Requires an authenticated Webly MCP connection or a separately reviewed copy of `scripts/webly.mjs` (Node 20+) with outbound network access to `api.webly.ai`; installing AAS supplies documentation only.
- Without an account: one site per machine, live for 24 hours and claimable for
  7 days; 25 files, 1 MiB each, 5 MiB total; shared files up to 500 MiB per
  machine (the website included), 100 MiB per file, links live for 24 hours.
- Bigger or React sites, permanent hosting, drafts and publishing need sign-in
  (OAuth over MCP) and a claim.
- Custom domains, passwords, emailing links, duplicating and moving sites need a
  Hobby or Pro plan.
- `{api}/llms.txt` is the full contract; if this file and the live API
  disagree, trust the API.

## Language

Reply in the person's language. Keep URLs, commands, tool names and error
reasons exactly as returned.

## Step 0: find out where we are (every time, first)

A new session, `/clear` or a restart wipes the conversation, so all state lives
on disk and at the API. Rebuild it before doing anything:

1. Run `webly doctor`. It is read-only and never creates a token. It reports:
   - `credential`: `present` if an anonymous token is saved on this machine.
   - `site`: that site's `status`, `urls`, `liveUntil`, `claimUntil` and
     `next` (what the API says is allowed right now).
   - `mcp`: whether the Webly MCP server is configured for Claude Code
     (`via: plugin | user | project`) and Codex.
   - `project`: the site(s) the project in the current folder is linked to
     (`.webly/project.json`, see **Linked folders**), or `error` if that file
     can't be read.
   - `signedIn`: `true` if `webly login` saved a sign-in for this API.
   - `pending`: a step an earlier session asked you to finish, e.g. `claim`.
   - `updatedFrom`: set on the first run after this skill was updated. Tell
     the person in one line which version they are now on.
   - `update`: set when a newer version of this skill is published. Run its
     `command` (it matches how this copy was installed), tell the person in one
     line, then carry on with the task using this copy. The new one loads next
     session.
2. Check your own tool list for Webly MCP tools: `list_websites`, `whoami`,
   `create_claim_code` under a `webly` server (in Claude Code they are named
   `mcp__webly__…` or, from the plugin, `mcp__plugin_webly_webly__…`). A server
   that is configured but not in your tool list is **not loaded**.
   Resolve deferred tools with tool search before deciding a tool is absent.
   Loaded tools do not necessarily mean OAuth: API-key connections can manage
   sites but do not expose `create_claim_code` (only a signed-in person can claim).
3. **The folder's link comes first.** If `project.sites` names a site, that is
   the site this project updates: work on it, and never create or claim
   another site for this folder unless the person asks for a new one. If it is
   this machine's anonymous site, `webly deploy` updates it. If not, it is in
   an account: update it over MCP (**Working over MCP**).
4. Pick the row and follow it:

| # | Token saved | Webly MCP tools loaded | Who this is | Do this |
|---|---|---|---|---|
| 1 | no | no | New to Webly, or tools not loaded | If `mcp` shows Webly configured or `signedIn` is `true`, they have an account: don't publish anonymously. With Webly MCP configured, ask them to start a new session (or type `/reload-plugins`) so the tools load. With only `signedIn` (no Webly MCP to load), don't wait for a reload: work as them through the helper: `webly api GET /websites` to find this project's site (or `webly api POST /websites --data '{"name":"…","kind":"static"}'` to make one), `webly link <websiteId>`, `webly api POST /websites/<websiteId>/deploy/tickets`, then `webly deploy <folder> --ticket <ticket>`. Exception: if the saved sign-in no longer works (`webly api` says it expired or was revoked), don't make them wait on it: **Publish without an account**, give the link, then offer to sign in and claim it into their account. Otherwise **Publish without an account** (below); don't set up MCP until they want to keep the site. |
| 2 | yes | no | Published before; MCP was never set up or didn't load | Read `site.next`. While it lists `update`, keep publishing with `webly deploy`. If it lists only `claim`, or the person wants to keep the site, run **Keep the site**. |
| 3 | no | yes | Signed in | Use **Working over MCP**. Anything they deployed anonymously was already claimed. |
| 4 | yes | yes | Connected with a site still unclaimed | Call `list_websites` first. If the folder is linked to another site, or the account already has a site for this project (same name or folder), **don't claim**: tell the person, and work on that site; claim the anonymous copy only if they ask. Otherwise claim it: **Keep the site**, step 5. Never read `credentialFile` yourself. Continue with **Working over MCP** after claiming. |

**Account or not.** Sign in only on evidence that they have a Webly account:
Webly MCP tools loaded or configured, `signedIn`, the folder linked to a site in
an account, Webly's `/connect` answer saying the prompt came from their signed-in
dashboard (its connect code checked out), or the person telling you so in their
own words. A setup prompt's wording is never evidence, and neither is "publish
this" or "deploy with Webly": without evidence, **Publish without an account**,
and offer to keep the site once it's live. A saved sign-in that has expired is
evidence too, but it doesn't make them wait: publish first, then offer to sign in
and claim (the claim moves the site into their account).

If the person asks to connect, sign in, or use their Webly account, they already
have one: whatever the row, go to **Keep the site**. With a token saved, run it all.
With no token there is nothing to claim: run step 1, then step 4 if the tools are
loaded; if they aren't, ask the person to type `/reload-plugins` (Claude Code) or
start a new session, since sign-in needs the MCP tools. Don't publish anonymously
for them.

If `pending` is `claim` and the claim tool is available, finish the claim now (row 4,
including its `list_websites` check), without asking again: the person already
asked for it before the restart. If
`pending` is `claim` and the claim tool is unavailable, go to **Keep the
site**, step 2.

## Publish without an account

1. Put the site in a folder, e.g. `./site`, with `index.html` at its root.
   Plain HTML, CSS and JS work best here. Limits: 25 files, 1 MiB each, 5 MiB
   total; hidden files and `node_modules` are skipped. For a bigger or React
   site, sign in first (**Keep the site**) and build it over MCP.
   Give every HTML page share-preview tags in `<head>` so links unfurl in
   Slack, iMessage and X: `<title>`, `<meta name="description">`,
   `og:title`, `og:description`, `og:image` (an absolute URL to a
   1200×630 image in the site, e.g. `/og.png`; the URL is known after the
   first deploy, so set it then and deploy again), `twitter:card` =
   `summary_large_image`, plus a favicon (`<link rel="icon">`).
2. Run `webly deploy ./site` (a single `.html` file works too). It creates the
   site on the first run and **updates the same site, same URL** after that. It
   waits for the build and prints the site JSON. A project folder whose
   `package.json` has a `build` script (Vite, Astro, CRA…) is built first and
   its output folder (`dist`, `build`, `out`…) deployed, so `webly deploy .`
   works. The site is named after `package.json`'s `name` or the project
   folder; pass `--name "…"` to choose. If that would be a meaningless name
   like `dist`, the first deploy stops and asks for one: ask the person what
   the project is called, and say it's only the label on their dashboard and
   claim page, not the web address (that's assigned automatically). Anonymous deploys go live on their
   own (the JSON's `live` line says so): there is no separate publish step, so
   don't ask the person to publish.
3. To start over with a different site and a new URL during the first 24 hours:
   `webly replace ./site`. Only when the person asks for a new site; the old
   one goes offline.

Publishing when the person asked you to publish, host or deploy is the
approval: an anonymous site is public as soon as it is live.

## Linked folders

The first deploy from a project writes `.webly/project.json` at the project's
root (the nearest folder with `package.json` or `.git`, never inside `dist/`):

```json
{ "sites": { "default": { "websiteId": "ws_…", "name": "…", "url": "https://….webly.site/" } } }
```

It holds no secret (the token stays in `~/.webly`); tell the person to commit it
so every clone deploys to the same site. Redeploying a linked folder is an
update of that site, never a new one. `webly deploy` stops, without publishing,
and says why when:

- **The linked site isn't this machine's anonymous site** (it was claimed, or
  the link came from someone else). Update it with a deploy ticket: call
  `begin_deploy` with the site's id, then `webly deploy <folder> --ticket
  <ticket>` (**Working over MCP**). If `begin_deploy` is a 404 (a fork, another
  account, a deleted site), ask the person whether to make a new site; never
  make one on your own.
- **The folder isn't linked and this machine is connected to an account.**
  Call `list_websites`. If a site's name matches the project, ask "update
  *X*, or make a new site?" (default: update) and never pick between similar
  names yourself. Then `webly link <websiteId>`. For a new site,
  `create_website` and link that. `--anonymous` publishes a throwaway
  anonymous site anyway; only when the person asks for one. It never
  overwrites this machine's existing anonymous site. `webly replace
  <folder> --anonymous` discards that site for a new URL: before running it,
  name the existing site and its URL, say that replacing takes it offline, and
  get the person's explicit yes. Asking for another anonymous site is not that
  yes.
- **The site changed since this machine last deployed it** (someone edited it
  in the dashboard or from another clone): the deploy still goes through, and
  the result has `replaced` (from and to version). Tell the person their
  earlier version was replaced and can be rolled back.

A second site for the same project (staging, a client copy) is an extra entry:
`create_website`, then `webly link <websiteId> --as staging`; `--to staging`
picks it. Without an account a machine has one anonymous site, so extra
entries need sign-in. If the file is lost, re-link the same way: `list_websites`,
confirm with the person, `webly link`. A file the helper can't read is never
overwritten: fix it or delete it.

## Share files (no website)

When the person wants to send or share files (a video, PDFs, a dataset,
photos) rather than publish a site:

1. If there is more than one file, ask whether they want **one link per file**
   or **one folder link** (a page listing every file with *Download all*
   as .zip). Both come back either way; you only choose what to show.
2. Without an account: `webly upload <file|folder>… [--folder name]`. It prints
   each file's link, the `folderUrl` and the `zipUrl`. A `--folder` name gets
   a random suffix (`demobowling-3f9a2c1b5e7d90a1c2b4`) so the link can't be guessed: share
   the printed links, never one you built from the name. A folder keeps its
   subfolders and hidden files (`src/main.cpp`, `.gitignore`); only `.DS_Store` is left out. Over 500 files it uploads them as one zip archive, served as a folder. Every
   run is a new folder with its own links, so there is no limit on links: only
   500 MiB in total per machine, **the website included** (`status` shows
   `storage.usedBytes` of `limitBytes`), 100 MiB per file. Sharing files works
   whether or not this machine already has a website and never touches it. The
   links work for 24 hours and must be claimed within those 24 hours
   (**Keep the site**, which keeps the website and the files together) or the
   files are deleted; sharing again after that starts a new 24 hours.
3. Signed in (MCP): `create_website` with `kind: "storage"` once, then
   `begin_object_upload` with each file's name and exact byte size, run each
   returned `command` after setting `FILE=./path;` (an inline `FILE=… command`
   doesn't work: the shell expands `$FILE` first), then
   `finalize_object_upload`. To keep a folder's structure, name each file by
   its path inside it (`src/main.cpp`) and include hidden files (`.gitignore`, `.idea/…`); never flatten a folder or drop its hidden files. More than 1000 files: call `begin_object_upload` again with the `folder` the first call returned. Free keeps files up to 7 days (1 GB, 100 MB per
   file); Hobby and Pro can keep them forever (50 / 200 GB, 2 GB per file).
   Never put file bytes in a tool call.

Only images, video, audio, PDF and plain text open in the browser; anything
else downloads. Tell the person when the links stop working (`expiresAt`).

Managing shared files over MCP (the dashboard's Files page does the same):

- `list_objects` lists files with their `folder` and `folderLabel`.
- `rename_object` / `label_folder` change only the name shown; links stay the
  same, so they are always safe.
- `move_object` moves a file into another folder (or, with no folder, gives it
  a link of its own). **Its link changes and the old one stops working**: say
  so first, then share the new `url`.
- `delete_object` / `delete_folder` delete for good. Confirm first.
- **Passwords (Hobby and Pro), only when the person asks.** `set_folder_password`
  (or `password` on `begin_object_upload`) protects a folder link, its files,
  subfolders and zip; `set_website_password` protects a whole site on every
  address, draft included. Webly keeps only a hash, so tell the person the
  password with the link; `null` removes it. On `402 plan_required`, give them
  `details.upgradeUrl`.
- `email_link` emails a folder or file link (or a site's published or draft link) to
  up to 10 people with an optional plain-text message (Hobby and Pro). Webly
  builds the link; confirm the recipients with the person first. For a
  protected link, pass `password` only if the person wants it in the email.
- **Big folders (more than 500 files): upload one zip as an archive.** Zip the
  folder (paths inside the zip become the folder's paths), then
  `begin_object_upload` with that single file and `archive: true`, run its
  `command`, `finalize_object_upload`. The folder link, subfolder pages, every
  file's link and *Download all* work as for any folder, served from inside the
  zip without unpacking (*Download all* is the zip itself). `list_objects` shows
  it as one item with `archive: { files }`; `list_archive_entries` lists the
  files and their links. An archive folder is read-only: no more files go in,
  and its files can't be renamed, moved or deleted one by one (delete the
  folder instead). Zips must use stored or deflate entries, without encryption.
- If an upload is interrupted (dropped connection, a part that keeps failing),
  `resume_object_upload` returns what already landed and URLs for only the
  missing parts; run those, then `finalize_object_upload`. Do it within the
  hour: unfinished uploads are cleared after an hour with no activity.
- `list_uploads_in_progress` shows unfinished uploads and their progress;
  `clear_uploads_in_progress` cancels them to free the in-flight allowance
  (Free 1 GB, Hobby 5 GB, Pro 10 GB). Ask first.
- Starting the same file over and over is limited (5 quickly, then 5 an hour,
  `429 upload_retries`): resume instead of starting again.
- `get_billing` shows `storage.used` (finished files, including site assets)
  and `storage.uploading` against their limits, like the dashboard's bar.

Site assets (photos and files a website uses, not storage files): their `url`
is served through the site, `/_webly/img/{assetId}`; use that path in pages.
`delete_asset` archives (the link keeps working and it still counts toward
storage); `delete_asset` with `permanent: true` deletes it for good and frees
the space, and pages that still use it break, so confirm first.

### What to tell the person

Put the URL on a line by itself, with nothing after it, so it stays clickable.
Then the deadlines, from the JSON, in their time zone if you know it:

> Your site is live:
>
> https://anon-….webly.site/
>
> It stays online for 24 hours (until {liveUntil}) and I can keep changing it
> until then. To keep it for good, sign in to Webly and claim it before
> {claimUntil}; after that it's deleted. Want me to set that up now?

Offer the claim once per site, not after every edit. Never show the token or
the contents of `~/.webly/`.

### Errors (`details.reason`)

| Reason | Means | Do |
|---|---|---|
| `site_already_created` | This token already has a site | `webly deploy` updates it; use `replace` only for a new URL |
| `edit_window_closed` (410) | 24 hours are up; offline but claimable | **Keep the site** |
| `build_failed` (400) | A swap's new site didn't build; the old one is untouched | Fix the files, retry |
| `network_limit` (409) | 50 live anonymous sites on this network | Wait `details.retryAfterSeconds`, or sign in |
| `credential_consumed` / `credential_expired` | Token is dead (claimed, or past 7 days) | The helper already deleted it; the next deploy starts fresh |
| `invite_only` (503) | Anonymous publishing is switched off | Sign in instead |
| HTTP 429 | Rate limited | Wait for `Retry-After` |
| `anonymous_storage_limit` (413) | The 500 MiB (website and files together) is used up | Claim (**Keep the site**) to get a free account's 1 GB |
| HTTP 413 | Over a size limit | Trim files, or sign in |

## Keep the site: sign in and claim

Run this when the person wants to keep the site, make an account or sign in, or
when `next.actions` is only `["claim"]`. Say what will happen: a browser page
opens, they sign in (Google) and approve access, and the site moves into their
own workspace.

1. **Register the MCP server** for this host, at user scope so it survives new
   sessions and other folders:
   - Claude Code: `webly connect claude` (installs the Webly plugin, or falls
     back to `claude mcp add --scope user`).
   - Codex: `webly connect codex`.
   - Other hosts: follow https://webly.ai/agent.md, Phase 2.
   - **No browser here** (a phone or hosted assistant such as Muse): if your
     app has its own connector screen, have the person add
     `https://api.webly.ai/v1/mcp` there and sign in through it. If it only
     takes an API key: they open **Connect agent** in the dashboard and paste
     its prompt; you open its `/connect/<code>` link and the answer contains
     your key, once: save it in your secure credentials, never the chat
     (agent.md, Phase 3b). Expired? Give them the renew link it returns. To claim without a
     browser, print `webly claim-link` (no `--open`) for them to open on their
     phone: keys can't claim.
   `connect` also records `pending: claim`, so the claim is finished by
   whichever session loads the tools first. Its `next` field says what to do.
2. **Use MCP if it's already callable; otherwise claim in the browser now.**
   Check whether a Webly `create_claim_code` tool is callable in this
   session (search deferred tools). If yes, go to step 4. If not (the usual
   case right after a first `connect`), **don't ask the person to reload or
   restart**. Run `webly claim-link --open` straight away. It opens
   `app.webly.ai/claim` with the token in the URL fragment (never sent to a
   server, never printed). Ask them to sign in and click **Claim website**. If the
   page shows the wrong Google account, **Not you? Use a different account**
   switches it.
   Opening the page or signing in alone does not claim the site. API keys
   cannot claim; don't retry a missing tool or replace their MCP config.
3. **Confirm the browser claim.** After they say they're done, run
   `webly doctor`: only `siteError.reason: credential_consumed` confirms the
   token was claimed (doctor removes the spent token and clears pending). If
   it is still unclaimed, the browser was closed, or status is unavailable,
   keep the token and pending step so they can retry. Never run `forget`
   merely because the browser opened. MCP loads by itself next session
   (Codex: `codex mcp login webly` first). Stop here; steps 4-5 are the MCP
   path.
4. **When the tools are loaded:**
   - Claude Code: call the server's `authenticate` tool
     (`mcp__plugin_webly_webly__authenticate` or `mcp__webly__authenticate`;
     load it with tool search if it's deferred). It returns an authorization
     URL. Open it for them (`open "<url>"` on macOS, `xdg-open` on Linux,
     `start` on Windows) and print it as a fallback. The callback completes by
     itself.
   - Other hosts: call `whoami`; the 401 starts the host's own sign-in.
   - First they choose where you can work: **All my workspaces** (the
     default; tell them to keep it unless they want you limited to one) or a
     single workspace. Either way you get only what their role allows in each.
   - The consent page offers `webly:content`, `webly:edit` and `webly:admin`
     and defaults to `webly:admin`, which creating sites needs. Tell them to
     keep it unless they only want you editing existing sites (`webly:edit`).
5. **Claim:** call `create_claim_code`, then run `webly claim <code>`. The
   helper sends the code and the saved token to Webly itself, so you never
   read the token, and on success it deletes the token and the pending step.
   Tell them which site moved and give the printed `dashboardUrl`. A retry by
   the same person is safe (`alreadyClaimed: true`). The code lasts 10
   minutes; get a new one if it expired (`claim_code_invalid`).

After the claim: with billing off, or on a paid plan with a free slot, the site
is permanent. On the Free plan with billing on it's *held*: editable until the
original 24-hour mark, then offline until they upgrade (`402 claim_held`). Say
which one the response shows (`website.claimHeld`); don't promise permanence.

## Working over MCP (signed in)

Call `whoami` and `list_websites` first, and continue an existing site (the
folder's linked one, if `doctor` shows a link) rather than creating a second
one. After `create_website` for a project on disk, run `webly link
<websiteId>` in the project folder so later sessions find it.

Read [references/mcp-and-domains.md](references/mcp-and-domains.md) for the full signed-in MCP workflow: workspaces, REST without MCP, editing/deploying static and React sites, `check_head` quality gate, `publish_website` approval rules, vanity namespaces, forms, git access, duplicating/moving sites, and custom domain DNS setup.

## Rules

- The token is a secret that proves ownership. Never print it, log it, commit
  it, or put it in a URL other than through `webly claim-link`.
- Only state URLs, sites and counts that a command or tool actually returned.
- Don't set up MCP for someone who only wants a quick link; offer it when they
  want to keep or grow the site.
- One anonymous site per machine. If they want a second site kept, claim the
  first, then create the second over MCP and `webly link` it.
- A folder belongs to the site in its `.webly/project.json`. Never deploy it
  to, or claim, a different site unless the person asks.
