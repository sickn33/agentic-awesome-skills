---
name: launch-check
description: "Passive pre-launch check of a live URL for AI-built apps: exposed secret keys, open Supabase/Firebase tables, security headers, phone layout, search and speed."
category: security
risk: safe
source: "https://github.com/Ces107/agent-forge/tree/main/skills/launch-check"
source_repo: Ces107/agent-forge
source_type: official
date_added: "2026-10-21"
author: Ces107
tags: [security, pre-launch, vibe-coding, supabase, firebase, security-headers, seo, audit]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Ces107/agent-forge/blob/main/LICENSE"
---

# Launch Check

## Overview

A pre-launch report card for apps and sites built with AI tools (Lovable, Bolt, Replit, Cursor, v0, Claude).
`scripts/launch_check.py` loads a live URL the way a visitor's browser does, scans what it downloaded, and scores
four areas 0-100: security, phone design at 375 px, being found by Google and AI search, and speed and basics.
It ends with a plain-English "fix this first" list. The agent runs the tool and explains its findings; it does not
judge the site by reading it.

## When to Use This Skill

- Use when the user asks "is my app safe to launch", "is my site ready", or wants a pre-launch checklist.
- Use when the user asks whether an API key leaked into the frontend ("did I leak my Stripe/OpenAI key").
- Use when the user asks whether their Supabase or Firebase database is open to anyone.
- Do not use for authenticated flows, API fuzzing or penetration testing (see Limitations).

## How It Works

### Step 1: Find Python

Python 3.9+ is required (standard library only). Try `python3 --version`, then `python --version`, then
`py -3 --version` on Windows, and call the first that works `<PY>`. `<DIR>` is the folder that holds this SKILL.md.

### Step 2: Run the check

```bash
<PY> "<DIR>/scripts/launch_check.py" https://the-app.com --report launch-report.html
```

Options:

- `--owner-check`: only when the user confirms they own the site. If the page contains a Supabase URL with its
  public anon key (or a Firebase databaseURL), it lists which tables exist and reads at most 1 row per table
  (GET only, at most 20 tables, never writes, row contents never printed or saved). Without the flag it only
  reports that a database was found.
- `--repo .`: also scan the local project for committed `.env` files and secrets in tracked files.
- `--prompt`: print only the fix list as a prompt for the AI that built the app. `--json`: everything.
- `--skip phone,search,speed`: faster partial run. `--fail-under 80`: exit 1 below this score.

Phone design and page-load metrics need Playwright (`<PY> -m pip install playwright`, then
`<PY> -m playwright install chromium`). Ask the user before installing it. Without it, phone design is skipped
with a note and the rest still runs.

### Step 3: Read the output

- PASS / WARN / FAIL per area = 80+ / 50-79 / under 50. SKIP = the area could not run (reason in a `note:` line).
- Overall score = weighted mean (security 40 %, the other three 20 % each). Any exposed secret or open table caps it at 39.
- Verdict: NOT READY (a HIGH security finding or score under 50), ALMOST READY, or READY TO LAUNCH.
- Secrets are always cut to their first 4 characters, for example `sk_l...(50 chars)`.
- Exit code 0 = ready, 1 = findings, 2 = bad URL or the site could not be loaded (HTTP 403 usually means bot protection: use a preview URL).

### Step 4: Fix and re-run

1. Exposed secret key (Stripe, OpenAI, Anthropic, AWS, Supabase service_role): it is already public. Move the call
   server-side, keep the key in a server environment variable, and rotate the key in the provider dashboard.
2. Open table or open Firebase: enable Row Level Security or database rules with per-user policies, then re-run
   with `--owner-check` until the table is no longer listed.
3. Missing headers (CSP, HSTS, X-Frame-Options, nosniff): set them in the host config or server middleware.
4. Paste the `--prompt` output into the AI that built the app, redeploy, and re-run until READY TO LAUNCH.

## Examples

### Example 1: Full check with an HTML report

```bash
python3 scripts/launch_check.py https://my-app.example --report launch-report.html
```

```text
SCORE 30/100  NOT READY: 5 things to fix before you launch
FAIL  Security                0  Anyone can see your Stripe secret key in your website's code (+7 more)
WARN  Phone design           77  The page is wider than a phone screen (+4 more)
FIX THIS FIRST
 1. HIGH   Anyone can see your Stripe secret key in your website's code
              in /assets/index-4f9c2a.js   value sk_l...(50 chars)
```

### Example 2: Owner check of the database, fix list only

```bash
python3 scripts/launch_check.py https://my-app.example --owner-check --prompt
```

## Best Practices

- ✅ Run the tool; base every statement on its output.
- ✅ Use `--owner-check` only after the user confirms they own the site.
- ✅ Treat an exposed secret as compromised: rotation is required, deleting it from the code is not enough.
- ❌ Do not print or store full secret values or table rows.
- ❌ Do not call a good score "secure": it means these common launch mistakes were not found.

## Limitations

- Not a penetration test: no login flows, no API fuzzing, no server-side auth or paywall checks, no write tests.
- Scripts served from another host (CDN subdomain) are not scanned; the report says how many were skipped.
- Secret patterns cover the common providers; custom tokens and keys inside source maps are not detected.
- Sites behind bot protection may answer 403; rate limits (429) are not counted as broken links.
- Phone design and speed need a Chromium browser through Playwright.

## Security & Safety Notes

- Passive by default: it downloads only what a browser does (the page, its same-site scripts, links on the home
  page, `/favicon.ico`, `robots.txt`, `sitemap.xml`, `llms.txt`, and up to 5 same-site pages for the search
  check). It never probes hidden paths such as `/.env` or `/admin`.
- Network access is limited to the URL the user passes and that site's public files; with `--owner-check`, also
  the Supabase project or Firebase database that page references, read-only. Nothing is sent anywhere else
  (no telemetry, no third-party API).
- Hostile-input handling: http(s) only, redirects and scripts only on the same site, size and count caps,
  terminal output stripped of control characters, HTML report fully escaped. It never uses a service_role key.
- `scripts/polish_audit.py` (phone design) and `scripts/geo_audit.py` (search) are bundled helpers that
  `launch_check.py` runs with `--json`.

## Common Pitfalls

- **Problem:** Exit code 2 with HTTP 403.
  **Solution:** The site blocks automated visitors; run the check on a preview or staging URL.
- **Problem:** Phone design shows SKIP.
  **Solution:** Playwright or Chromium is not installed; install it (with the user's approval) or accept the partial report.

## Related Skills

- `@security-audit` - Broader code-level security review of a repository.
- `@nextjs-supabase-auth` - Implementing Supabase auth and Row Level Security correctly.
