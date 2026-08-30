# Favicon removal & stale CDN caches (Vercel)

Lovable ships a default `favicon.ico`, and browsers auto-request it from site
root even when `index.html` links a different icon. On Vercel this one file
routinely survives cleanup — `200 OK` with `x-vercel-cache: HIT` and a stale
ETag under `Cache-Control: public, max-age=0, must-revalidate` — for hours after
the file is deleted and even after dashboard purges. Treat favicon removal as a
cache problem, not a file problem.

## 1 · Overwrite in place, don't delete

Deleting a static file from `public/` does not reliably evict Vercel's edge
copy. Overwriting the same path with replacement content forces a new ETag, so
clients revalidate and the stale icon stops serving — no purge required.

If no real brand icon is ready, write a valid transparent 1×1 ICO:

<!-- security-allowlist: writes a 70-byte ICO into the project's public/, local only -->
```bash
node -e '
const fs = require("fs");
const b = Buffer.alloc(6 + 16 + 40 + 8);   // header + dir entry + DIB + pixels
b.writeUInt16LE(1, 2);   b.writeUInt16LE(1, 4);   // type, count
b.writeUInt8(1, 6);      b.writeUInt8(1, 7);      // width, height
b.writeUInt16LE(1, 10);  b.writeUInt16LE(32, 12); // planes, bpp
b.writeUInt32LE(40 + 8, 14);                     // image size
b.writeUInt32LE(22, 18);                         // offset to DIB
b.writeUInt32LE(40, 22);   // biSize
b.writeInt32LE(1, 26);     // width
b.writeInt32LE(2, 30);     // height (xor + and mask)
b.writeUInt16LE(1, 34);    // planes
b.writeUInt16LE(32, 36);   // bpp
b.writeUInt32LE(0, 38);    // compression
b.writeUInt32LE(8, 42);    // sizeImage (xor 4 + and 4)
fs.writeFileSync("public/favicon.ico", b);
'
```

## 2 · Link all icon flavours in `index.html`

Browsers always request `/favicon.ico` even without a link, so the path must
exist and the modern/Apple entry points should too:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

`apple-touch-icon.png` must be a real PNG (recommended 180×180). A solid brand-
colour square is an acceptable placeholder; flag it for later replacement.

## 3 · Add cache headers (`vercel.json`)

Vercel's default `public, max-age=0, must-revalidate` for static files makes
every page load revalidate the favicon. Cache what is final and keep what may
still be replaced revalidatable:

- `/favicon.svg`, `/apple-touch-icon.png` — final brand assets →
  `public, max-age=31536000, immutable`
- `/favicon.ico` — an old-format fallback that may later be swapped for real art
  → `public, max-age=86400` (no `immutable`)

```json
{
  "headers": [
    {
      "source": "/favicon.ico",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }]
    },
    {
      "source": "/favicon.svg",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/apple-touch-icon.png",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

✅ Never mark an unversioned URL `immutable` while a placeholder may still be
swapped — `immutable` tells browsers not to revalidate for the max-age lifetime,
so a later replacement won't propagate for up to a year. Use `immutable` only on
versioned URLs (e.g. `/favicon-<hash>.svg`) or once content is final.

## 4 · Verify after deploy

<!-- security-allowlist: remote curl header check of own domain, read-only -->
```bash
curl -sI https://YOUR-DOMAIN/favicon.ico \
  | grep -i "cache-control\|etag"
```

Expect a new ETag (and, for `/favicon.svg`, `Cache-Control: public,
max-age=31536000, immutable`). `/favicon.ico` should stay revalidatable
(`public, max-age=86400`).

**Gotcha — the staging URL:** a `*.vercel.app` preview may be SSO-protected
(`_vercel_sso_nonce` 302) and wrap deploys in a provider frame that injects
platform branding. Always verify icons on the real custom domain.
