---
name: deed-page
description: "Publish an HTML file or static folder to a permanent public https://<slug>.deed.page/ URL with one curl request. No account; the first publish returns a token for updates."
category: devops
risk: critical
source: "https://github.com/f-o-x11/deed-page-skill"
source_repo: "f-o-x11/deed-page-skill"
source_type: official
date_added: "2026-10-20"
license: "MIT"
license_source: "https://github.com/f-o-x11/deed-page-skill/blob/main/LICENSE"
author: Avatar 8 LLC
tags: [deploy, static-site, hosting, publish, html, curl]
tools: [claude, cursor, codex, gemini]
---

# deed.page publish

## Overview

deed.page hosts static files (HTML, CSS, JS, images) at `https://<slug>.deed.page/`. A publish
is one `curl` request: no account, API key, email code, or claim link. The agent picks the slug,
and the site stays up until someone deletes it. The first publish returns a token, which is the
only key that can update or delete that site. Adapted from the official skill:
https://github.com/f-o-x11/deed-page-skill

## When to Use This Skill

- Use when the user asks to publish, host, deploy, share online, "put this online" or "give me a
  link" for something the agent generated: an HTML report, dashboard, slide deck, landing page,
  prototype, game, or docs folder.
- Use when the user wants deed.page, or wants a link without creating an account and has not
  picked another host.
- Use when the agent runs unattended and cannot ask a human for a code or a click.
- Do not use for secrets or private data: Free sites are public.
- Do not use for apps that need a server at runtime (SSR, API routes, databases). deed.page serves
  static files only.

## How It Works

### Step 1: Pick a slug

Lowercase letters, digits and hyphens, 1 to 63 characters, no leading or trailing hyphen. Add a
random suffix so the name is unlikely to be taken. `hello`, `my-page`, `my-app` and `my-site` are
reserved.

```bash
set -e
UPLOAD_DIR="$(mktemp -d)" || exit 1
SLUG="report-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')"
REF="${DEED_REF:-skill-agentic-awesome-skills}"
```

`REF` is stored for attribution only and does not change the publish. Set the `X-Client` header
to the agent's name, for example `Claude Code`, `Codex` or `Cursor`.

### Step 2: Confirm what goes public

Before the first publish, tell the user the file or folder will be public at a guessable URL, and
check that it holds no `.env` files, keys, tokens or personal data.

### Step 3: Publish

Do not expose the returned token in shared tool logs. Capture responses into an owner-only private file, parse only public status/URL fields and retain the token through an approved secret mechanism. Build the optional authorization header as a protected curl config file rather than shell word-splitting an expanded string:

```bash
umask 077
: > "$UPLOAD_DIR/headers.conf"
if [ -n "${DEEDPAGE_TOKEN:-}" ]; then
  case "$DEEDPAGE_TOKEN" in *[!A-Za-z0-9._~-]*) echo "Unexpected token characters" >&2; exit 1;; esac
  printf 'header = "Authorization: Bearer %s"\n' "$DEEDPAGE_TOKEN" > "$UPLOAD_DIR/headers.conf"
fi
```

The upload snippets below illustrate the request; add protected response capture before running them. Verify current provider limits, privacy and retention; “permanent” is a provider claim, not an availability guarantee.

A single HTML file is stored as `index.html`:

```bash
curl -sS -T report.html "https://deed.page/v1/sites?slug=$SLUG&ref=$REF" \
  -H "X-Client: <agent name>" \
  --config "$UPLOAD_DIR/headers.conf"
```

A folder: its contents go to the site root, so it should contain `index.html`:

```bash
tar -C ./site -czf "$UPLOAD_DIR/site.tar.gz" . &&
curl -sS -T "$UPLOAD_DIR/site.tar.gz" "https://deed.page/v1/sites?slug=$SLUG&ref=$REF" \
  -H "X-Client: <agent name>" \
  --config "$UPLOAD_DIR/headers.conf"
```

A successful response:

```json
{"ok":true,"url":"https://<slug>.deed.page/","slug":"<slug>","version":"v1","permanent":true,"token":"<returned once>"}
```

### Step 4: Answer the user

- Reply with the `url` field.
- The first publish returns `token` once. Keep it in the session environment as `DEEDPAGE_TOKEN`
  and tell the user to store it safely. Never write it into a published page, a commit or a log.
- To update the same site, run the same publish command with `DEEDPAGE_TOKEN` set. Each publish
  is a new version; the Free plan keeps the last 10.

### Step 5: Delete, only when asked

```bash
curl -sS -X DELETE "https://deed.page/v1/sites/$SLUG" -H "Authorization: Bearer $DEEDPAGE_TOKEN"
```

## Examples

### Example 1: Share a generated report

```text
User: Publish this report and give me the link.
Agent: Confirms report.html has no private data, picks q3-report-7f3a2c, runs the single-file
       curl above, and replies with https://q3-report-7f3a2c.deed.page/ plus a note to save the
       returned token if they want to update or delete the page later.
```

### Example 2: Update a built site

```text
User: I changed the copy, push it again.
Agent: Rebuilds, tars dist/ and re-runs the folder publish with DEEDPAGE_TOKEN set. The URL stays
       the same and the response shows version v2.
```

## Best Practices

- ✅ Publish the build output (`dist/`, `build/`, `out/`), not the source folder.
- ✅ Use a random slug suffix and keep the same slug for updates.
- ✅ Keep the token out of files, commits and published pages.
- ❌ Do not publish anything the user has not agreed to make public.
- ❌ Do not delete a site unless the user asks for that exact slug.
- ❌ Do not loop new publishes on errors; read the error code first.

## Limitations

- Static files only. Server code does not run.
- Free plan: 25 sites, 25 MB per site, 60 publishes per hour, 4 MB per single request. Larger
  sites use the manifest upload flow at https://deed.page/docs.
- A lost token cannot be recovered unless the owner attached an optional recovery email. The site
  stays online either way.
- Cloud sandboxes that block outbound network access need `deed.page` allowed.
- Errors: 400 `slug_invalid` (fix the slug), 409 `slug_taken` (use the `suggestion` field or a
  new suffix), 409 `version_conflict` (re-read and retry), 422 `content_rejected` (remove the
  file, do not retry), 429 (wait `retry_after` seconds).

## Security & Safety Notes

- Publishing puts files on the public internet. Confirm the folder contents first; hidden files
  are not a safe place for secrets.
- The token can update and delete the site. Keep it in an environment variable for the session
  and never print it into output that gets shared or committed.
- `DELETE` is irreversible for the live site. Run it only on an explicit request.
- The service is operated by Avatar 8 LLC. Abuse reports: https://deed.page/abuse

## Common Pitfalls

- **Problem:** 409 `slug_taken` on the first publish.
  **Solution:** Use the `suggestion` field from the response or generate a new suffix.
- **Problem:** The update created a new site instead of a new version.
  **Solution:** Reuse the same `SLUG` and send `DEEDPAGE_TOKEN` as a Bearer token.
- **Problem:** The page loads but CSS is missing.
  **Solution:** Tar the folder contents with `tar -C ./site ... .` so `index.html` is at the root.

## Related Skills

- `@dropthehassle-publish` - Static hosting with a claim link and custom domains.
- `@cloudflare-pages` - Deploy to the user's own Cloudflare account.
- `@vercel-deployment` - Deploy frameworks that need serverless functions.
