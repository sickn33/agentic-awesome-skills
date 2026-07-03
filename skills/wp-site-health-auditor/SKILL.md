---
name: wp-site-health-auditor
description: "Turns a WordPress Site Health report into a risk-tiered, backup-first fix plan with exact WP-CLI/PHP snippets. Use for site health, recommended improvements, or critical issue reports."
category: development
risk: critical
source: self
source_type: self
date_added: "2026-07-03"
author: whoisabhishekadhikari
tags: [wordpress, site-health, wp-cli, seo, performance, security, hardening]
tools: [claude, cursor, codex, gemini]
---

# WP Site Health Auditor

## When to Use This Skill

- The user pastes a WordPress Site Health report (`Tools > Site Health`), as text or screenshot
- The user pastes raw Site Health debug info (`Tools > Site Health > Info`) and asks what's wrong
- The user mentions "site health", "recommended improvements," or "critical issues" for a WordPress site
- The user asks to clean up, harden, or speed up a WP install based on that screen

Turns a WordPress Site Health report (Critical issues / Recommended improvements / Passed tests) into a
prioritized, risk-tiered fix plan — then executes the safe fixes and hands off the rest with exact
commands or code.

## ⚠️ Safety — read before touching any file

This skill edits `wp-config.php`, `.htaccess`, and `php.ini`-equivalent settings, and deletes plugins and
themes. All three are one bad edit away from a white-screen-of-death or a broken upload path. **Never skip
this section, even for a one-line change, even if the user is in a hurry.**

**Before any edit or deletion, in this order:**
1. **Back up the specific file(s) you're about to touch**, not just "have a backup somewhere":
   ```
   cp wp-config.php wp-config.php.bak-$(date +%Y%m%d-%H%M%S)
   cp .htaccess .htaccess.bak-$(date +%Y%m%d-%H%M%S)
   ```
   If shell access isn't available, tell the user to download the current file via SFTP/host file
   manager first, and don't proceed until they confirm they have it.
2. **Confirm a full site/database backup exists** before deleting any plugin or theme, or running
   `wp search-replace`. If the user doesn't have one and has a backup plugin active (UpdraftPlus, etc.),
   trigger a backup first: `wp updraftplus backup` or the plugin's own WP-CLI command, or tell them to
   click "Backup Now" and wait for confirmation before continuing.
3. **Never run `wp search-replace` without `--dry-run` first**, and always show the dry-run output to the
   user before running it for real. This command rewrites the database in place — a wrong pattern can
   corrupt serialized data across every table it touches.
4. **After any PHP file edit, lint it before reloading the site**:
   ```
   php -l wp-config.php
   ```
   For `.htaccess` changes, run `apachectl configtest` if available, or check the site immediately.
   A syntax error in `wp-config.php` takes the entire site down immediately. Do not skip the lint check to
   save a step.
5. **Change one thing at a time, then verify the site still loads** (homepage + wp-admin) before making
   the next change. Don't batch multiple Tier 2 file edits into one pass — if something breaks, you want to
   know which change did it.
6. **Give the user the exact rollback command** alongside every edit:
   ```
   cp wp-config.php.bak-<timestamp> wp-config.php
   ```
   State this even if nothing goes wrong — it costs one line and saves a panicked user later.

If the user says "just do it, skip the backup" — still create the backup silently as part of the edit
sequence and tell them you did. Refuse to skip step 1 or step 4 entirely; those two are non-negotiable
regardless of urgency, since the failure mode (corrupted `wp-config.php`, dead site) is worse than the ten
seconds a backup costs.

## Why this exists

The Site Health screen is diagnostic, not prescriptive. It tells the site owner *that* something is wrong
(e.g. "you should use a persistent object cache") but not *how* to fix it, and it mixes items that are
one-click-safe (deactivate a plugin) with items that require host-level changes (php.ini, object cache
backend) or are purely informational (SQL server version — no action needed). This skill sorts that out —
safely.

## Phase 1 — Parse the report

Input is usually one of:
- Pasted plain text copied from `Tools > Site Health` (Status tab)
- Pasted plain text from `Tools > Site Health > Info` (the debug data export)
- A screenshot of the Status tab
- WP-CLI output (`wp site-health check` is not a core command; note that up front, don't invent one — see Phase 4)

Extract three buckets exactly as WordPress labels them:
1. **Critical issues** (red) — always fix first, always confirm before touching.
2. **Recommended improvements** (yellow) — the bulk of real work; triage by risk tier below.
3. **Passed tests** (green) — skip. Do not "fix" or re-verify passed tests unless the user asks. Do not
   invent problems with green items — a common failure mode is treating "SQL server is up to date" as
   something to act on. It isn't.

If the report is a screenshot, transcribe item titles + category tags (Security/Performance/SEO/Privacy)
verbatim before triaging — don't paraphrase the WordPress-generated title, it's used for the fix lookup in
Phase 3.

If no report was pasted and the user just says "audit my site health," ask them to paste the Status tab
text (fastest) rather than guessing — Site Health results are host- and config-specific and guessing wastes
a turn.

## Phase 2 — Risk-tiered triage

Classify every non-passed item into one of three tiers before touching anything. Present this triage table
to the user first for anything above Tier 1 count of 3+ items — don't silently start deactivating plugins.

**Tier 1 — Safe, reversible, auto-fixable in wp-admin or via WP-CLI**
No data loss risk, no downtime, fully reversible. Still back up per the Safety section before deleting
anything. Fix directly once the user confirms the item list.
- Remove inactive plugins/themes (they aren't running, deactivation already happened — this is just
  deletion of dead code)
- Turn off `WP_DEBUG` display in production (`WP_DEBUG_DISPLAY`, not `WP_DEBUG` itself if the user still
  wants logging)
- Enable search engine indexing / fix robots visibility toggle
- Update the site tagline off "Just another WordPress site"

**Tier 2 — Requires host/server-level access — Claude drafts the change, user or host applies it**
Cannot be fixed purely from wp-admin; needs php.ini, .htaccess, wp-config.php, or hosting panel access.
Draft the exact snippet, explain where it goes, remind the user of the backup + lint steps above, and flag
that a server restart or host support ticket may be needed.
- Permalink structure change (migration — existing URLs break without redirects; require a redirect plan and CDN/cache flush before applying)
- `post_max_size` < `upload_max_filesize` mismatch
- Persistent object cache not available (Redis/Memcached)
- Page cache not detected
- PHP version/module changes
- HTTPS/SSL configuration
- Loopback/REST API failures caused by firewall or security plugin blocking

**Tier 3 — Informational / host-dependent, no fix exists or none needed**
Report as informational only. Do not attempt a fix, do not suggest one unless directly asked.
- SQL server version notices when already current
- "Autoloaded options are acceptable" type passed-adjacent info
- Anything already green in Passed tests

## Phase 3 — Fix recipes by item

Match the WordPress-generated item title (case-insensitive substring match is fine) to a recipe below.
Every recipe below assumes the Safety section has already been followed for that file. If an item doesn't
match anything here, say so explicitly rather than fabricating a fix — Site Health's item set changes
across WP core versions and this list isn't exhaustive (see `references/catalog.md` for the fuller list
including rarer items).

### You should remove inactive plugins / themes — Tier 1
```
# confirm full site backup exists first (Safety step 2)
wp plugin list --status=inactive --field=name
wp plugin delete <plugin-slug>

wp theme list --status=inactive --field=name
wp theme delete <theme-slug>
```
Never delete the currently active theme's parent if the active theme is a child theme. Never delete
Twenty Twenty-Five (or the current default core theme) if it's the only fallback theme — WordPress needs
at least one broken-theme fallback; recommend keeping one bundled default even if inactive.
Confirm the exact plugin/theme names with the user before deleting — inactive isn't the same as unused;
some plugins are intentionally kept inactive as a staged rollback.

### post_max_size smaller than upload_max_filesize — Tier 2
This breaks large file uploads (post data gets truncated before the file size limit is even reached).
Fix by raising `post_max_size` to be >= `upload_max_filesize`, typically with headroom for form overhead.

Where to set it (pick whichever the host supports, in this order of preference):
1. Host control panel PHP settings (cPanel "Select PHP Version" > Options, Plesk, etc.) — no code needed,
   safest option, skip the file-backup steps entirely.
2. `php.ini` (if the user has server access) — back up first (`cp php.ini php.ini.bak-<timestamp>`):
   ```ini
   upload_max_filesize = 64M
   post_max_size = 128M
   ```
3. `.htaccess` (Apache + mod_php only, not on PHP-FPM/nginx) — back up first:
   ```apache
   php_value upload_max_filesize 64M
   php_value post_max_size 128M
   ```
   A malformed `.htaccess` directive can 500 the entire site. Run `apachectl configtest` if available
   before reloading, or check the live site immediately after saving.
4. `.user.ini` (CGI/FastCGI hosts; not mod_php) — back up first, create or edit `.user.ini`
   in the WordPress root:
   ```ini
   upload_max_filesize = 64M
   post_max_size = 128M
   ```
   ⚠️ **Do not use `ini_set()` in `wp-config.php` for these directives** — `upload_max_filesize`
   and `post_max_size` are `PHP_INI_PERDIR`, which means they can only be set before the
   request starts (php.ini, .htaccess, .user.ini). `ini_set()` calls silently fail for both,
   leaving the problem unfixed.

Always set `post_max_size` strictly greater than `upload_max_filesize`. Confirm the current values first
(`wp cli info` doesn't show these — check `phpinfo()` or the host panel) rather than assuming defaults.

### You should use a persistent object cache — Tier 2
Requires a caching backend (Redis or Memcached) installed at the server level — this is not something a
plugin alone can create out of nothing.
1. Confirm with the user's host whether Redis or Memcached is available (many managed WP hosts include one).
2. If available, install a drop-in client plugin: Redis Object Cache or WP Redis (Redis), or Memcached
   Object Cache (Memcached). `wp plugin install redis-cache --activate` then `wp redis enable`. This writes
   an `object-cache.php` drop-in to `wp-content/` — confirm no existing `object-cache.php` is being
   overwritten (check first with `ls wp-content/object-cache.php`); if one exists, back it up before enabling.
3. If not available, this is a hosting-tier limitation — report it as such rather than trying to fake a
   fix; don't recommend switching hosts unprompted, just flag it as the blocker.

### Page cache is not detected — Tier 2
1. Check if the host provides server-level page caching (many managed WP hosts do, and it may already be
   active but not reporting the headers Site Health looks for — worth confirming with the host before
   installing a redundant plugin).
2. If not, install one page-cache plugin (not a full plugin stack) — WP Super Cache, W3 Total Cache, or
   the host-recommended one. `wp plugin install wp-super-cache --activate` then enable caching from its
   settings screen (no reliable WP-CLI toggle across cache plugins — flag manual step to user).
3. Avoid stacking two caching plugins; if one is already active but not detected, check the plugin's own
   status page before adding another. Some cache plugins also write rules into `.htaccess` — back it up
   first per the Safety section before activating.

### Your site is not set to output debug information — usually already passing; if failing — Tier 1
Back up `wp-config.php` first, lint after editing:
```php
// wp-config.php
define( 'WP_DEBUG', false );         // set to true only while actively debugging
define( 'WP_DEBUG_DISPLAY', false ); // never show errors to visitors
define( 'WP_DEBUG_LOG', true );      // logs to wp-content/debug.log instead
```

### REST API / loopback requests / background updates failing — Tier 2
Usually a security plugin, firewall, or `.htaccess` rule blocking internal requests. Steps:
1. Temporarily deactivate security/firewall plugins one at a time, re-check Site Health after each.
2. Check hosting-level firewall (Cloudflare, Sucuri, host WAF) isn't blocking the site from calling itself.
3. Verify `wp-config.php` doesn't have `define('DISALLOW_FILE_MODS', true)` set incorrectly for background
   updates specifically, if that's the failing item. Back up before removing/editing that line.

### HTTPS not fully active — Tier 2
```
wp option get siteurl
wp option get home
```
Both must be `https://`. Also check for mixed-content (http:// hardcoded in content/theme). Confirm a full
database backup exists, then dry-run before applying for real:
```
wp search-replace 'http://olddomain.com' 'https://olddomain.com' --dry-run
```
Only remove `--dry-run` after the user has reviewed the dry-run output and confirmed the replacement count
and matched rows look correct.

## Phase 4 — What NOT to invent

- There is no `wp site-health` WP-CLI command in WordPress core as of this writing — don't fabricate one.
  Fixes are applied via the specific commands above, not a single audit-and-fix CLI call.
- Don't claim a fix is complete without the user (or a re-run of Site Health) confirming it — server-level
  changes (Tier 2) especially can silently fail to apply depending on host restrictions.
- Don't guess PHP/server values (current `upload_max_filesize`, cache backend availability, etc.) — ask or
  have the user check `phpinfo()` / host panel rather than assuming common defaults are in place.
- Don't skip or shortcut the Safety section for any reason, including "it's a small change" — file
  corruption risk doesn't scale with edit size; a single dropped semicolon in `wp-config.php` is as fatal
  as a large edit.

## Phase 5 — Output format

Give the user:
1. **Triage table**: item | category | tier | one-line fix summary
2. **Tier 1 fixes**: execute directly (with confirmation + backup for deletions), show before/after
3. **Tier 2 fixes**: exact snippet + exactly where it goes + backup command + lint/verify command + rollback
   command + note that a host restart or support ticket may be required; don't mark these "done" until the
   user confirms the site still loads
4. **Tier 3 / unrecognized items**: one line each, informational only
5. Recommend re-running Site Health after Tier 1/2 changes to confirm the yellow items clear.

Keep the whole response scannable — this is a punch list, not an essay. Use the table + short recipe
blocks above, not prose paragraphs, unless the user asks for more explanation on a specific item.

## Reference

`references/catalog.md` — extended list of less-common Site Health items (SEO category items like llms.txt
generation, Privacy items, rarer Security items) with the same tier classification, for reports that
include items not covered above.

## Limitations

- Cannot execute anything itself against a live site — every WP-CLI/PHP snippet is drafted for the user or
  their host to run; this skill has no shell access to the user's actual server.
- Cannot verify current PHP/server values (upload limits, cache backend availability, HTTPS status) —
  relies on what the user reports back after checking `phpinfo()` or their host panel.
- Does not cover multisite-specific Site Health variations or WooCommerce-specific health checks; both add
  extra items this skill's recipe list doesn't include.
- The item catalog (main file + `references/catalog.md`) reflects WordPress core's Site Health checks as of
  mid-2026 — item titles/wording can change across core versions, so an unmatched item should be reported
  as unmatched, not force-fit to the closest recipe.
- Does not replace a full security audit or compromise scan — Site Health flags configuration hygiene
  issues, not signs that a site has already been broken into.
