---
name: youtube-transcript
description: "Fetch YouTube transcripts through DeepAPI or local fallback tooling and save clean text output."
category: research
risk: safe
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [youtube, transcripts, research]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# YouTube Transcript (via DeepAPI, yt-dlp fallback)

## When to Use

- Use when the user asks for a YouTube transcript, captions, subtitles, or spoken-content extraction.
- Use when DeepAPI or a local fallback can fetch the transcript safely.

Fetch a YouTube video's transcript and save a clean raw `.txt` file. Primary path is DeepAPI `POST /v1/scrape/youtube/transcript`. It runs server-side, so it avoids the local-IP bot flagging that plagues yt-dlp.

## Save location
- If the user is in a real project/working dir → save there.
- Otherwise (no dir given, or cwd makes no sense) → save to `~/Downloads`.
- **Always name the file `Channel_Title` with spaces replaced by `_`** (e.g. `David_Ondrej_title_of_video.txt`). If metadata is unavailable, fall back to the video ID.

## Primary path — DeepAPI

`DEEPAPI_API_KEY` must already be present in the environment. Do not read shell
startup files or print secrets:

```bash
test -n "$DEEPAPI_API_KEY" || { echo "DEEPAPI_API_KEY is not set"; exit 1; }
BASE=${DEEPAPI_API_BASE_URL:-https://deepapi.co}
```

Run the scrape (keep the Idempotency-Key; retries must reuse the SAME one):

```bash
IDK=$(uuidgen)
curl -s --max-time 120 "$BASE/v1/scrape/youtube/transcript" \
  -H "Authorization: Bearer $DEEPAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{"url": "VIDEO_URL", "maxCostUsd": "0.05", "waitForFinishSecs": 60}' \
  > /tmp/yt_transcript.json
```

- Non-English videos: add `"language": "de"` (etc.) to the body.
- `status: running` → wait `next.afterSecs`, then `curl "$BASE$(jq -r '.next.path' /tmp/yt_transcript.json)" -H "Authorization: Bearer $KEY"` until `succeeded` or `failed`.

Extract the text and save it:

```bash
jq -r '.status' /tmp/yt_transcript.json                # succeeded | running | failed
jq -r '.output[0].text' /tmp/yt_transcript.json > "$OUT/$NAME.txt"
jq -r '.debitMicrousd' /tmp/yt_transcript.json         # cost (50000 = $0.05)
```

`.output[0].segments` also has timed segments (`startSecs`, `durationSecs`, `text`) if the user wants timestamps. Empty `output` = video has no captions; report it, don't retry.

For the `Channel_Title` filename, get metadata with a quick `yt-dlp --print "%(channel)s|%(title)s" --skip-download "URL"`; if that fails, use the video ID.

## When to fall back to yt-dlp

- `DEEPAPI_API_KEY` missing from the environment.
- HTTP 402 `insufficient_credits` (tell the user to top up at deepapi.co/credits first; fall back only if they're unavailable).
- DeepAPI request `failed` twice.

Tell the user whenever you fall back — a fallback means the product missed a real use case.

## Fallback path — yt-dlp (local)

```bash
OUT="$(pwd)"            # or ~/Downloads if cwd makes no sense
META=$(yt-dlp --print "%(channel)s|%(title)s" --skip-download "URL")
NAME=$(echo "$META" | tr '| ' '__' | tr -cd '[:alnum:]_.-')   # "Channel_Title", spaces -> _, strip unsafe chars
yt-dlp --skip-download --write-subs --write-auto-subs \
  --sub-langs "en.*" --sub-format json3 \
  -o "$OUT/$NAME.%(ext)s" "URL"
```

- Fall back `channel` → `uploader` → `uploader_id` if `channel` is null.
- `--skip-download` = captions only. `--write-subs` + `--write-auto-subs` = manual first, auto as fallback.
- **Always use `json3`, never VTT/SRT** — auto VTT repeats every line twice (rolling captions).

Flatten json3 → raw text:

```bash
python3 - "$OUT" <<'PY'
import json, html, re, glob, sys, pathlib
f = glob.glob(sys.argv[1] + "/*.json3")
if not f: sys.exit("no json3 file")
data = json.load(open(f[0], encoding="utf-8"))
parts = ["".join(s.get("utf8","") for s in e.get("segs") or []) for e in data.get("events", [])]
txt = re.sub(r"\s+", " ", html.unescape(" ".join(p.strip() for p in parts if p.strip()))).strip()
out = pathlib.Path(f[0]).with_suffix(".txt")
out.write_text(txt, encoding="utf-8"); print(out)
PY
```

### yt-dlp failure handling
- Non-English / unknown language: run `yt-dlp --list-subs "URL"` first, then set `--sub-langs`.
- Newer yt-dlp may need `deno` on PATH for YouTube extraction.
- On first failure: run `yt-dlp -U` once, retry once, then stop.
- **429 / "Sign in to confirm you're not a bot"** = IP flagged. STOP — do NOT retry in a loop (makes it worse).
- Never fall back to downloading audio for Whisper unless the user explicitly asks.

## Output

Report the saved path; print the text if short. If DeepAPI was used, also report the cost in dollars.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
