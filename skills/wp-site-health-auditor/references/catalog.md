# WP Site Health item catalog

Extended list of less-common WordPress Site Health items, organized by
category. Items in the main `SKILL.md` recipe list are NOT duplicated here.

## Security

### Passwords need updating — Tier 1
Users with weak or reused passwords. Inform the admin, list affected users:
```
wp user list --field=user_login | while read u; do echo "$u: $(wp user meta get "$u" session_tokens | wc -c)"; done
```
No automated fix — the admin must ask each user to update via
`wp user reset-password <user>` or Users > Profile.

### The site is not using a persistent connection (not an object cache) — Tier 3
Persistent database connections (`mysqli.persist`). Purely informational;
most shared hosts disable this and there is no performance downside for
standard WP installs. No action needed.

### File permissions should be reviewed — Tier 2
`wp-config.php` and `/wp-content/` directory permissions. Draft the expected
permissions:
```bash
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 600 wp-config.php
chmod 400 .htaccess # if Apache; nginx ignores it
```
The user must verify with their host that the filesystem supports these
permissions (some managed WP hosts lock permissions).

## Performance

### Indexed autoloaded options found — Tier 2
Autoloaded options larger than 1 MB. List the worst offenders:
```
SELECT option_name, LENGTH(option_value) AS size
FROM wp_options
WHERE autoload = 'yes'
ORDER BY size DESC
LIMIT 20;
```
If a plugin is the source, report the plugin name. Cleaning involves:
- `wp option delete <key>` (only if the option is safe to delete — confirm
  with the plugin author first).
- Disabling autoload: `wp option update <key> <value> --autoload=no`.

### Can not process scheduled maintenance jobs (wp_cron) — Tier 2
`DISABLE_WP_CRON` is set but no system cron is running. Fix by either:
1. Setting up a real system cron job (recommended):
   ```
   * * * * * wget -q -O - https://example.com/wp-cron.php
   ```
2. Removing `define('DISABLE_WP_CRON', true);` from `wp-config.php`

### Background updates failed — Tier 2
Automatic background updates for core/plugins/themes. Check:
```
wp core check-update
wp plugin list --update=available
```
If `DISALLOW_FILE_MODS` is true, background updates are blocked. Only
override if the user explicitly wants auto-updates:
```php
define('DISALLOW_FILE_MODS', false); // wp-config.php
```

## SEO

### llms.txt generation not configured — Tier 1
The site is missing an `llms.txt` file at the domain root. Install and
activate an SEO plugin that supports it, or create a manual file via
wp-admin > SEO > Settings. Not a ranking factor, but recommended for
AI crawler discoverability.

### No XML sitemap detected — Tier 1
Install an SEO plugin with sitemap support (Yoast, Rank Math, etc.) or
a dedicated sitemap plugin. Enable sitemap generation from the plugin
settings screen (no WP-CLI toggle reliably available across plugins).

### Social preview images missing — Tier 2
Open Graph / Twitter Card meta tags not set. Requires theme integration
or an SEO plugin. Draft the OG meta tags if the theme uses `wp_head()`:
```php
add_action('wp_head', function () {
    if (has_post_thumbnail()) {
        echo '<meta property="og:image" content="' . esc_url(get_the_post_thumbnail_url()) . '" />';
    }
});
```

## Privacy

### Privacy policy page not set — Tier 1
The site has no privacy policy page. Create one:
```
wp post create --post_type=page --post_title="Privacy Policy" --post_status=draft
```
Then set it under Settings > Privacy or via:
```
wp option update wp_page_for_privacy_policy <page-id>
```

### Privacy policy page is outdated — Tier 2
The privacy policy page was created before the site's current privacy
guidance generation date. Re-run the guidance generator in
Tools > Export Personal Data and update the page content. No WP-CLI
command for this — manual step.

## Diagnostics / hard-to-classify

### Requirement mis-match with Xdebug extension — Tier 3
Xdebug is loaded but is not required for production. If the user didn't
intentionally install it, suggest removal via host panel or php.ini:
```
; php.ini
; zend_extension=xdebug.so  (comment out or remove)
```

### ZipArchive / gzinflate / BCMath / Imagick missing — Tier 2
Missing PHP extensions that some plugins or WordPress itself need.
List missing extensions and suggest installation via host panel or:
```
sudo apt install php-zip php-gd php-bcmath php-imagick
```
(Command varies by OS — draft the correct one for the user's environment.)

## Items deliberately excluded from this catalog

- **SQL Server version** — WP core already reports this as Passed or
  Informational; no user action exists.
- **Active theme up to date** — Already green in Site Health; no action.
- **Plugin updates available** — Handled by `wp plugin update --all`.
