---
name: web-media-getter
description: "One query across free image / video / GIF APIs (stock + historical/archival + GIF engines), returning normalized, license-tagged results with optional top-K download + attribution sidecar. The retrieval peer to local semantic search and generative media."
risk: safe
source: community
source_type: community
source_repo: connerkward/web-media-getter-skill
date_added: "2026-06-16"
author: Conner K Ward
license: MIT
tags:
  - media
  - images
  - video
  - gif
  - stock
  - archival
  - attribution
tools:
  - claude-code
  - antigravity
  - cursor
  - gemini-cli
  - codex-cli
---
## When to Use

Use when a task needs a REAL or ARCHIVAL photo / clip (hero, texture, reference, historical footage) or a reaction / animated GIF, rather than a generated one — fan out across free image/video/GIF sources in one query and download license-tagged results.

_Source: [connerkward/web-media-getter-skill](https://github.com/connerkward/web-media-getter-skill) (MIT)._

# web-media

Query many free image/video sources in one fan-out, get a normalized result list,
optionally download top-K with an attribution sidecar. Zero-dep stdlib script.

**Script:** `webmedia.py` (in this dir). **Keys:** `PEXELS_API_KEY`, `PIXABAY_API_KEY`
in `central/.env` (optional — the 5 no-key sources work without them).

## Sources

| Source | Key? | Best for | Media |
|--------|------|----------|-------|
| openverse | none | CC web images (Flickr, museums) | image |
| wikimedia | none | factual / historical / landmark photos | image |
| internetarchive | none | **historical/archival** images + films | image, video |
| loc | none | historical US prints/photos | image |
| nasa | none | space imagery + video | image, video |
| pexels | free key | modern stock photos + **short video clips** | image, video |
| pixabay | free key | modern photos/illustrations + **short clips** | image, video |
| klipy | free key | **GIFs** — recommended (free, unlimited, Tenor drop-in) | gif |
| giphy | free key | **GIFs** — biggest library (prod key needs approval) | gif |

GIF sources fire only with `--type gif`. Keys: `KLIPY_API_KEY`, `GIPHY_API_KEY`
in `central/.env`. (tenor adapter removed — Google EOL'd the API 2026-06-30.)
**klipy** is the one to get (free + unlimited);
its adapter is **unverified — assumes Tenor-compatible** request/response;
verify against docs.klipy.com when you key it. `webmedia.py "shrug" --type gif --count 6 --json`

## Usage

```bash
webmedia.py "1950s street scene" --type image --count 8 --json
webmedia.py "rocket launch" --type video --source nasa,internetarchive
webmedia.py "car factory 1930s" --source all --download --out /tmp/cars
```

- `--source all` (default) | `nokey` (no-key only) | comma list (`wikimedia,pexels`)
- `--type image|video` · `--count N` · `--json` · `--download --out DIR`
- `--download` fetches each result's direct media URL and writes `attribution.json`
  (source, author, license, url, page_url) alongside the files.

## Record schema

`{source, title, url, thumb, dl, page_url, author, license, w, h, type}` —
`dl` is the directly-downloadable media URL (None when only a page exists).

## The video caveat (important)

Archival sources (Internet Archive, Europeana, LoC) host **whole films/documentaries**,
not single shots. So:
- **Modern single clip** → `pexels` / `pixabay` (born as short clips, direct MP4). Done.
- **Historical single shot** → retrieve the IA film here, then extract the shot:
  - **Twelve Labs** Marengo search (free 600 min) — pass the IA public MP4 URL, get a
    timestamped moment for "car on assembly line", clip with ffmpeg. Semantic, cheap.
  - or **PySceneDetect** (free, local) to cut the film into shots, then rank keyframes
    with CLIP via the `muser` skill. Fully offline.

## Audio: freesound + audio QA

`webmedia.py` is image/video. For **sound effects** (real, CC-licensed) and for
**judging audio** (since Claude can't hear), two sibling scripts live in
`central/scripts/`:

- **`freesound-fetch.py "<query>" [count] [max_sec] [out_dir]`** — searches freesound.org
  and downloads short hq-mp3 previews. Prints one JSON line per file with
  `license`/`user` for attribution. Key: `FREESOUND_API_KEY` in `central/.env`
  (token-based read; full originals would need OAuth — previews suffice for SFX).
- **`audio-judge.py <file> "<target>"`** — sends the clip to OpenAI `gpt-audio`
  (audio-native) and returns JSON `{heard, score, matches, suggestion}`, enabling a
  generate/fetch → judge → iterate loop. Auto-sources a real `sk-` `OPENAI_API_KEY`
  from `.env` (ignores a local `lm-studio` stub env var). Pads sub-2s clips so the
  speech-tuned model doesn't refuse. **Caveat:** it reliably *describes* audio and
  filters obvious mismatches, but it is NOT a trustworthy judge of subjective qualities
  like "grating" — it labels nearly any beep "sharp/high-pitched". Use it to cull, not
  to make the final aesthetic call; confirm by ear.

## Where this fits

This is the **internet-retrieval** capability — peer to `muser` (local semantic search)
and `fal` (generate). A future `media` router would fan out across all three and rank
candidates by relevance (CLIP), handing aesthetic spreads to `lookdev`. Don't build that
router until the model demonstrably mis-routes without it.

## Limitations

- Results depend on third-party API availability, quotas, credentials, and license metadata quality.
- License tags and attribution fields must still be reviewed before commercial or public use.
- Relevance ranking can find plausible assets, but final aesthetic fit, brand safety, and audio suitability require human inspection.
