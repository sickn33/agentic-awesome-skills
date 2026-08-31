# Favicon removal & stale CDN caches (Vercel)

Lovable ships a default `favicon.ico`, and browsers auto-request it from site
root even when `index.html` links a different icon. Browser and CDN layers can
therefore keep showing the old icon after a replacement deployment. Treat the
cleanup as both a file-path and cache-verification problem.

## 1 · Overwrite in place, don't delete

Prefer replacing the same path in the deployment instead of deleting it. The
production URL then keeps returning a valid icon while the new bytes establish
a new content identity; browsers that request `/favicon.ico` implicitly do not
fall back to an old cached asset merely because the HTML link changed.

If no real brand icon is ready, use the bundled helper to write a valid
transparent 1×1 ICO. It resolves the physical project root, rejects a symlinked
`public/` directory or favicon target, writes an exclusive same-directory
temporary file with no-follow semantics where available, then atomically
renames it into place.

<!-- security-allowlist: writes a 70-byte ICO into the project's public/, local only -->
```bash
node "<skill-dir>/scripts/write-transparent-favicon.js" "$PWD"
```

## 2 · Link all icon flavours in `index.html`

Browsers may request `/favicon.ico` even without a link, so keep that path and
the modern/Apple entry points available:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

`apple-touch-icon.png` must be a real PNG (recommended 180×180). A solid brand-
colour square is an acceptable placeholder; flag it for later replacement.

## 3 · Keep unversioned icon URLs revalidatable (`vercel.json`)

Vercel documents `public, max-age=0, must-revalidate` as its default response
policy and recommends long-lived `immutable` caching for content-hashed assets.
The standard favicon entry points below are not content-hashed, so keep them
revalidatable unless the HTML points at a versioned filename:

- `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png` →
  `public, max-age=0, must-revalidate`
- A content-hashed asset such as `/favicon-a1b2c3.svg` may use
  `public, max-age=31536000, immutable`.

```json
{
  "headers": [
    {
      "source": "/favicon.ico",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/favicon.svg",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/apple-touch-icon.png",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
```

Never mark an unversioned icon URL `immutable`: it tells browsers not to
revalidate for the max-age lifetime, so a replacement may not propagate for up
to a year. Use `immutable` only on content-hashed URLs.

## 4 · Verify after deploy

<!-- security-allowlist: remote curl header check of own domain, read-only -->
```bash
curl -sI https://YOUR-DOMAIN/favicon.ico \
  | grep -i "cache-control\|etag\|x-vercel-cache"
```

Expect the replacement ETag and `Cache-Control: public, max-age=0,
must-revalidate` on the unversioned icon URLs.

If the confirmed production domain still serves the old edge response, verify
the linked Vercel project and team first, ask for explicit approval, then purge
that project's CDN cache:

<!-- security-allowlist: explicit remote cache purge for the confirmed Vercel project; requires user approval -->
```bash
vercel cache purge --type cdn
```

Re-run the header check after the purge. Do not purge a project inferred only
from the current directory or a preview URL.

**Gotcha — the staging URL:** a `*.vercel.app` preview may be SSO-protected
(`_vercel_sso_nonce` 302) and wrap deploys in a provider frame that injects
platform branding. Always verify icons on the real custom domain.

## Official references

- [Vercel Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers)
- [Vercel CDN cache](https://vercel.com/docs/caching/cdn-cache)
- [Vercel cache purge CLI](https://vercel.com/docs/cli/cache)
