# Working over MCP, Workspace Transfers, and Custom Domains

## Working over MCP (signed in)

Call `whoami` and `list_websites` first, and continue an existing site (the
folder's linked one, if `doctor` shows a link) rather than creating a second
one. After `create_website` for a project on disk, run `webly link
<websiteId>` in the project folder so later sessions find it.

**Workspaces.** `whoami` → `workspaces: "all"` means this connection works in
every workspace your person belongs to. `list_workspaces` names them with their
role in each. A site id works in any workspace, so site tools need nothing more.
Tools that act on a whole workspace (`create_website`, `list_websites`,
`get_billing`…) take its slug as `workspace`. If they have several, ask which
one before creating a site, and on `400 workspace_required` ask; never guess.
`workspaces: "one"` means the connection is limited to one workspace. If they
need another (`list_workspaces` shows `canUse: false`), they reconnect: in
Claude Code `/mcp` → webly → re-authenticate, and pick All my workspaces.
When the owner asks for a team workspace photo, `set_workspace_photo` takes a
public image `url` or the file as `base64` (PNG, JPEG, WebP or GIF, 2 MB);
`remove_workspace_photo` clears it. A personal workspace shows the person's own
profile photo, which they change in the dashboard.

**REST without MCP** (scripts, hosts with no MCP): `webly login` opens the
browser to the same sign-in and workspace choice, then `webly api GET /websites
--workspace <slug>` (or any `/v1` path, `--data` for a JSON body) calls the API
as the person. The token stays in the helper; never ask for it or print it.
`webly logout` revokes it.

1. Framework sites (typed React, the default): `put_source_file` /
   `str_replace` (no lease needed). Static sites: `search_source` and
   `str_replace` with `{ path, edits }` for small text edits; `deploy_files`
   only for a few small whole files, with `expectedHeadVersion` set to the version
   `read_source_files` returned (`400 base_required` without it). If someone
   wrote since, your change is merged onto theirs (`merged` in the response);
   `409 merge_conflict` means you both changed the same lines: tell the person
   whose change it is (`theirsBy`), re-read, re-apply, resend. `force` only
   when the person asks. For a folder on disk (a build's `dist/`, anything with
   bundles or images), call `begin_deploy` with the site's id and straight away
   run `webly deploy <folder> --ticket <ticket> --message "<what changed>"` (the
   ticket lasts 5 minutes and one deploy; never echo it back to the person). The
   message is one line saying what changed ("Button reads Start here"); the
   site's History shows it, so the people sharing the site can tell your
   version from everyone else's. The helper builds the project
   if needed, uploads it (up to 2000 files; images and video over 1 MiB go
   straight to storage, up to the plan's per-file limit), links
   the folder and prints the draft URL. Never put a bundle's bytes in a tool
   call or an API key in a shell command. If it stops with **`would_revert`**,
   the deploy would undo changes made to the site since this folder last
   deployed it (the paths are listed): read them with `read_source_files`,
   merge them into the local project, rebuild, and deploy again with a new
   ticket; or tell the person what would be undone and, only with their OK,
   deploy with a new ticket and `--force`. If it stops with **`would_remove`**,
   the site has files the folder doesn't (listed): add them to the folder, or
   only with the person's OK deploy with `--force`. A clone of the site's git
   mirror (`get_git_access`) deploys the same way: the helper keeps the images
   listed in `.webly/media.json` and takes its base from the git history; when
   it says the clone is behind, `git pull` first. If the result has `replaced`, tell
   the person the site had changed elsewhere and earlier versions are kept. Each write
   makes a new draft version; the live site doesn't change. Writes are
   Prettier-formatted, so copy `str_replace` text from `read_source_file`.
2. `check_head` runs the quality gate (lint, typecheck, bundle, render). Fix
   every diagnostic.
3. Show the person the draft URL (`https://draft--{subdomain}.webly.site`, not
   public, not indexed).
4. `publish_website` only after they say yes to that exact site and version.
   It waits for a running build; `202` with `status: "building"` means Webly is
   still building (not a failure): publish that version again in about 15
   seconds, and tell the person it's still building.
   `rollback_website` / `unpublish_website` if something is wrong live.

New sites get a short generated address (`zen-wreath-y76r.webly.site`); don't pass
`subdomain` unless the person asks for a specific one (up to 56 characters; a taken
one is a `409`, not a variant). On Free each site can change its webly.site
address once (`rename_subdomain`; Hobby and Pro unlimited), so run
`check_subdomain` first and rename only to the exact name the person asked for.
On Hobby and Pro the workspace also has a namespace
and each published site answers at `urls.vanity`
(`https://fall-out-boy.kev.webly.site`, the label from the site's name, unique only
within the namespace). Share `urls.primary`: the primary address (a custom domain
when one is live, else the vanity, else the flat address, unless the owner chose a
webly.site address as primary); `urls.all` lists every
address the site answers at. `rename_vanity`
changes a site's label; `get_namespace` / `check_namespace` / `rename_namespace`
handle the namespace. Renames are scarce (Hobby 5, Pro 10, lifetime), so rename
only to the exact name the person asked for, and tell them old vanity addresses
stop working. The new addresses need about a minute for HTTPS: check
`get_namespace` until `certificate` is `active`, then tell them they're live.
On `402`, give them `details.upgradeUrl`.

A team workspace has one owner (`whoami` → `owner`). Ownership of the workspace
itself (not moving a website) changes only in the dashboard's People page, by the
owner; you can't do it, so send them there. The card and subscription stay with
the workspace.

New content, including blog posts and repeating content (products, team, FAQs),
goes in the site's source files; don't create collections or blog posts, the CMS
is deprecated. A site that already reads collections or a managed blog keeps
using those tools for that content until the owner asks to move it. Forms
post with `formAction('name')`, never `mailto:`, and never ask for card
numbers, passwords, ID numbers or health details (submissions are plain text).
If the owner wants an email per submission, turn it on with
`set_form_notifications` (off by default). Emails go out on Hobby and Pro;
on Free the choice is saved: give the owner `upgradeUrl`. Name the email
field `email` so replying to an alert answers the visitor. Each workspace takes
1,000 submissions a month on Free (10,000 Hobby, 100,000 Pro); past that they're
held: hidden, no alerts, and deleted at the monthly reset unless the owner
upgrades. When `list_forms` shows `quota.held`, tell the owner and give them
`upgradeUrl`.
Details are in llms.txt.

`403` names the missing capability in `details.capability`: the grant was
narrower than the task, so tell them which access level covers it. `401` /
`invalid_token`: call a Webly tool again to re-trigger sign-in; don't start a
second attempt while one is waiting. Other people and agents may edit the
same site at once. Prefer `str_replace` for small edits. Send `baseVersion`
(the `version` your read returned) with `put_source_file` /
`delete_source_file`: their edits to other lines are merged with yours;
`409 merge_conflict` means you both changed the same lines — read the file
again, re-apply your change keeping theirs, resend with the new version.
`wait_for_changes` shows what others wrote since a version. Publish with
`version` set to the one the person previewed. History is linear, so the
versions between the last publish and that one go live with it (newer ones stay
unpublished); the response's `alsoPublishes` lists the ones other people or
agents wrote (who, app, message). Tell your person what of theirs went live.
Publishing an older version puts nothing new live, and `alsoPublishes` is empty.

Git: `get_git_access` gives a read-only clone of a signed-in site's source and
history (one commit per version). Its token lasts one minute, so run its
`clone` (or `pull` inside the clone) straight away as
`WEBLY_GIT_TOKEN=<token> <clone>`, never with the token in the URL. Check `headVersion` with `get_website`
before asking again. Never `git push`; write through the tools.

## Duplicate or move a site

Hobby and Pro, in both workspaces (`402 plan_required` otherwise: give the
person `details.upgradeUrl`). `duplicate_website` copies a site 1:1: every
version, media, CMS, form submissions and settings, passwords; it is published
if the original is, gets its own addresses, and custom domains stay with the
original. `move_website` moves a site into another workspace your person
admins, at once: everything comes along, it gets a **new** webly.site address
there and the old one stops working, so confirm first and share the new
`urls.primary`. `list_move_destinations` lists the workspaces your person
admins and whether the site fits (`reason`: `site_limit`, `storage_limit`,
`plan_required`); ask which one. Both need a signed-in person (OAuth) to reach
another workspace. For someone else's workspace, `start_website_transfer`
returns a code their admin redeems with `accept_website_transfer`.

## Custom domains

Needs a signed-in account (MCP) on Hobby (5 domains) or Pro (25). On Free,
`add_domain` is `402 domain_limit`: give the owner `details.upgradeUrl`.
"Connect example.com to my site":

1. Pick the site with `list_websites`. Never guess it from the hostname.
2. For a bare domain, ask first:
   - **`www.example.com` (recommended).** It works with every DNS provider.
     The person then forwards `example.com` to it at their registrar, which is
     free and takes a minute.
   - **`example.com` directly.** Only if their DNS provider supports CNAME
     flattening or ALIAS at the root (Cloudflare, Namecheap, Porkbun…).
   For a subdomain such as `shop.example.com`, just add it.
3. Call `add_domain`, then `connect_domain`. If it returns a `url`, give the
   person that link first: they sign in at their DNS provider (Cloudflare for
   any hostname; GoDaddy and others for www once they support it) and approve,
   and the records are set for them. They open it in the browser where they
   use Webly. With Cloudflare (`method: "oauth"`) Webly also forwards the
   bare domain of a www domain if they allow redirects on Cloudflare's screen
   and nothing is served there yet (if `apexForward` isn't ok after
   verifying, give it to them). If records of theirs are in the way, nothing
   is replaced until they approve the exact changes shown after signing in;
   approving switches the hostname at once, so for a site live today offer the
   manual records (TXT first) to move without downtime. When you
   `remove_domain` and the response has `dnsCleanup`, ask whether to delete the
   records Webly added too, and if yes give them `dnsCleanup.url`.
   Otherwise, or as the fallback, give the required `dns.records` **exactly as
   returned**, as a Type / Name / Value table. For a www domain, also give the
   `apexForward` forwarding rule. Provider tips:
   - Type only the Name shown (`www`, or `@` for the root). GoDaddy and
     Namecheap add the domain themselves.
   - On Cloudflare, set the record to "DNS only" (grey cloud).
   - Moving a domain that is live elsewhere? Keep its current record and add
     only the optional TXT records. Then:
     1. Poll `verify_domain` until the domain is `active`. That means ownership
        is verified and the certificate is deployed. Step 2 isn't enough.
        `domain-watch` can't show this yet, because the old host still answers.
     2. Ask the person to switch the CNAME.
     3. Run `webly domain-watch <hostname>` to confirm traffic now reaches
        Webly.
4. Start watching in the background right away. Don't wait for the person to
   say they're done:
   `webly domain-watch <hostname>` as a background task. It prints `dns`,
   `https` and `live` as each happens and exits once the domain is live.
   Without a shell, call `verify_domain` every `next.checkAgainSeconds`.
   Every domain response has `next` with the step (1 DNS record, 2 HTTPS
   certificate, 3 live) and what to do. Tell the person when each step
   completes.
5. Once live: confirm `https://<hostname>` loads. The first domain to go live
   on a site becomes its primary address by itself (`isPrimary`), unless a
   primary was already chosen (another domain, or a webly.site address picked
   with `set_primary_address`); every other address redirects to the primary.
   If another domain is already primary, offer
   `set_primary_domain` to switch, or `set_primary_address` if they want a
   webly.site address to be the primary (their custom domains then redirect
   to it; say so). If it's
   `failed`, relay `failureMessage`, have them fix the record, then call
   `verify_domain` again. If the domain is active but their browser says the
   server "could not be found" right after removing and re-adding it, their
   DNS cached the gap: it clears within the zone's negative-cache time (30
   minutes by default on Cloudflare), or sooner if they flush their DNS cache and
   the stale answer was cached on their device (not by their router or ISP).

Adding a domain publishes nothing and takes nothing offline. The
`*.webly.site` address keeps working.
