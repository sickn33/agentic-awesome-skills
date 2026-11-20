# Sources

## The person's references

Normalise everything into `refs/mine/` as image files:

- files they upload: copy them in;
- image URLs: download with a User-Agent header;
- a site: open it, screenshot the header and crop to the logo, or take its inline SVG, `og:image` or icon;
- an Are.na channel or block URL: `scripts/fetch_arena.mjs` takes the channel's slug or URL.

## Are.na

`fetch_arena.mjs` uses the public v3 API as a guest: no account, no token, no package.

- `GET https://api.are.na/v3/channels/<slug>/contents?per=100&page=N`. Pages of up to 100; `meta.has_more_pages`.
- The original image is `image.src` on Are.na's CDN. A request without a User-Agent gets a bot challenge, not the file.
- Guests get 30 API requests a minute (free accounts 120). A pull of 100 is a few API requests plus the downloads.
- Search on v3 is Premium only. The older v2 channel search still answers guests:
  `GET https://api.are.na/v2/search/channels?q=<words>&per=20` returns channels with their slugs and block counts, and
  `fetch_arena.mjs` pulls any of them by slug. The script also ships a short list of public logo channels
  (`--default`). Set `ARENA_TOKEN` to use the person's account.
- The official CLI (`arena download`) and Are.na's hosted MCP work too for someone already signed in.

## What the images are

People upload logos they found; the brands own them, not Are.na and not the uploader. Are.na's terms let it limit
bulk use. So:

- pull on the person's request, about 100 a run, from channels they chose or the defaults;
- keep them in a local folder for measuring, and never ship, commit, redistribute or show them beside the output;
- keep `manifest.json` (block, source, uploader) so every image's origin is known;
- never name a reference's brand anywhere.
