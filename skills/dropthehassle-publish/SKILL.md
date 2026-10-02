---
name: dropthehassle-publish
description: "Publish a finished static site to a free HTTPS link with DropTheHassle: build it if needed, deploy, hand over the claim link, verify it is live, never spend money."
category: devops
risk: critical
source: "https://github.com/bosmdavid-gif/dropthehassle-skill"
source_repo: "bosmdavid-gif/dropthehassle-skill"
source_type: official
date_added: "2026-10-01"
license: "MIT"
license_source: "https://github.com/bosmdavid-gif/dropthehassle-skill/blob/main/LICENSE"
author: bosmdavid-gif
tags: [deploy, static-site, hosting, domain, mcp]
tools: [claude, cursor, codex, windsurf]
---

# DropTheHassle publish

## Overview

DropTheHassle (https://dropthehassle.com) hosts finished static files (HTML, CSS, JS, images) on a
free `name.dropthehassle.app` link with HTTPS, and can later put the same site on a real domain
with no DNS editing. A first deploy needs no account: it returns a live URL and a claim link. This
skill makes the agent check that the folder is a finished build, deploy it with the CLI or MCP
server, give the human the claim link, and verify the site is live. No DropTheHassle tool can pay,
and the agent must never try to. Adapted from the official skill, which also ships a local
preflight script and longer references: https://github.com/bosmdavid-gif/dropthehassle-skill

## When to Use This Skill

- Use when the user asks to publish, deploy, host or share a site they built with an AI tool and
  wants DropTheHassle, or wants it on a free link or their own domain without DNS work and has not
  picked another host.
- Use when the folder is static output: a hand-written `index.html`, or a Vite, Astro, Create React
  App, Nuxt generate, Next.js `output: 'export'` or TanStack Start SPA build.
- Do not use for apps that need a server at runtime (SSR, API routes, server functions, PHP). Say
  that DropTheHassle only hosts static files.

## How It Works

### Step 1: Find the finished folder

- Plain folder with `index.html` at the top: that is the site.
- Project with a `build` script or a `vite.config.*`, `next.config.*`, `astro.config.*` or
  `nuxt.config.*`: look for `index.html` in `dist/`, `build/`, `out/` or `.output/public/`. If
  there is none, install with the lockfile's package manager and run the build first. Next.js
  needs `output: 'export'` (writes `out/`).
- An `index.html` that loads `/src/main.tsx` or another `.ts`, `.tsx`, `.jsx` or `/src/` script
  is a dev entry. Build it.
- The DropTheHassle CLI and MCP server never run the build. On unbuilt source they stop and print
  the build command.

### Step 2: Check the limits

Before the site is claimed: 25 MB and 1,000 files, and no executables or archives
(`.exe .msi .apk .dmg .scr .bat .zip .rar .7z .iso`). Signed in: 100 MB and 5,000 files. One
network can create 5 new unclaimed sites per hour and 20 per day. `node_modules`, `.git` and
hidden files are left out, except `.well-known`.

### Step 3: Deploy

CLI, run on the project folder after the build (or on the plain site folder):

```bash
npx -y dropthehassle deploy .
```

It prints the live URL and a claim link, and writes `.dropthehassle.json` in that folder so the
next deploy from it updates the same site. That file holds the site's key: keep it out of git.
`--login` puts the site on the human's account after a browser approval; `--slug name` only works
with `--login`; `--code XXXX-XXXX` uses a 15-minute dashboard code for an existing site.

MCP, in Claude Code:

```bash
claude mcp add dropthehassle -- npx -y dropthehassle-mcp
```

Then call `deploy_site` with `folder` set to the absolute path. The hosted connector
`https://dropthehassle.com/mcp` cannot read the disk: send `files` inline as
`{path, content, encoding}` (`utf8` or `base64`). Account tools need the human's token from
dropthehassle.com, menu, Connect your AI, set as `DTH_TOKEN` by the human in their own config.

### Step 4: Hand over and verify

Tell the human the live URL and the claim link, and that the claim link works for 7 days. An
unclaimed site can be removed after that. Then check:

```bash
curl -s "https://dropthehassle.com/api/v1/check?host=NAME.dropthehassle.app"
```

`outcome` should be `live` and `secure` true. The same check is on
https://dropthehassle.com/is-my-website-down.

### Step 5: Domains, only if asked

Check names with the MCP `search_domain` tool or
`curl -s "https://dropthehassle.com/api/v1/domains/search?q=NAME.com"`, and report only names the
answer marks `available`, with the price it returned. Buying is the human's step: after they claim
the site, `get_checkout_link` returns a `checkout.stripe.com` link for them to open and pay.

## Examples

### Example 1: Vite project

```text
User: Put this site online.
Agent: No dist/ yet, so runs npm install && npm run build, then npx -y dropthehassle deploy .
       Reports: Live at https://yourname.dropthehassle.app, plus the claim link (7 days).
       Runs the live check: outcome "live", secure true.
```

### Example 2: Domain search

```text
User: Is there a .com for it?
Agent: Checks three names with search_domain, lists the available ones with the returned price,
       and asks which one they want. It does not create a payment link until they say so.
```

## Best Practices

- ✅ Deploy the build output, not the source, and rebuild before every redeploy.
- ✅ Run the CLI on the project folder so a rebuild of `dist/` does not delete the link file.
- ✅ Give the human the claim link word for word, with the 7-day note.
- ❌ Do not open, fill in or pay a payment link. A DropTheHassle payment link is always on
  `checkout.stripe.com`.
- ❌ Do not invent or commit a token, and do not loop new anonymous deploys.
- ❌ Do not rename the free link (`choose_link`) without an explicit yes for that exact name.

## Limitations

- Static files only. Server code does not run; a separate HTTPS backend can be linked with the
  `set_backend` tool (account token).
- `npx dropthehassle status` and `rollback` need a folder linked with `--login` or `--code`.
- On npm `dropthehassle-mcp` 0.4.2, `search_domain` needs a token; the hosted connector and the
  HTTP route above work without one.
- Cloud sandboxes (Claude Code on the web, Codex cloud) block dropthehassle.com by default: allow
  the domain or use the hosted connector.
- A plain deploy from a fresh machine creates a new site. Updating a claimed site needs a
  dashboard code or the token.

## Security & Safety Notes

- Deploying publishes the folder on a public URL. Confirm the folder holds only what the user wants
  public. Hidden files such as `.env` are left out, but secrets in JS bundles are not.
- `.dropthehassle.json` contains a site key. Never commit or publish it.
- The account token can deploy and create payment links but cannot pay. The human sets it in their
  own MCP config; the agent should not ask for it in chat.
- Never buy anything or create a payment link without the user asking.
