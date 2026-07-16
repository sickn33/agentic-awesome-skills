# Persistent storage with Buckets

Spaces are stateless. All data is wiped on restart / rebuild. For state that must survive (user uploads, generations, dynamic feeds, logs, growing databases): mount an HF **Bucket** — S3-like object storage living at `hf://buckets/<ns>/<bucket>`.

Buckets are paid (per-TB storage). Check `whoami.canPay` and confirm with the user before creating one. Pricing + free tier: https://huggingface.co/storage.

Full docs: https://huggingface.co/docs/hub/storage-buckets.

## Create + attach

```bash
hf buckets create <ns>/<bucket-name>                                # --private optional
hf spaces volumes set <ns>/<space> -v hf://buckets/<ns>/<bucket-name>:/data
```

After this, writes to `/data/` in the Space are durable. Reads come from the bucket via the Xet storage backend.

To make the bucket files publicly addressable: leave the bucket public. Public bucket files are served at `https://huggingface.co/buckets/<ns>/<bucket>/resolve/<path>` (HTTP 302 redirect to a signed CDN URL). The Space writes once and the public URL works forever — no streaming proxy needed.

## Write-durable, read-fast pattern

For a feed-style Space (e.g. a community jam where users save generations and browse a public timeline), don't re-scan disk on every request. Module-level disk scan → in-memory list → every write appends to both:

```python
import os, json, uuid
from datetime import datetime, timezone

BUCKET_ID = "<ns>/<bucket-name>"
BUCKET_URL = f"https://huggingface.co/buckets/{BUCKET_ID}/resolve"
_feed = []

def _load_feed():
    root = "/data/songs"
    if not os.path.isdir(root):
        return
    for sid in os.listdir(root):
        meta = f"{root}/{sid}/meta.json"
        if os.path.isfile(meta):
            _feed.append(json.load(open(meta)))
    _feed.sort(key=lambda s: s["created_at"], reverse=True)

_load_feed()                                       # one scan at startup

@app.api(name="save", time_limit=60)
def save(audio_bytes: bytes, title: str):
    sid = uuid.uuid4().hex[:12]
    d = f"/data/songs/{sid}"; os.makedirs(d, exist_ok=True)
    open(f"{d}/audio.wav", "wb").write(audio_bytes)
    meta = {"id": sid, "title": title,
            "url": f"{BUCKET_URL}/songs/{sid}/audio.wav",
            "created_at": datetime.now(timezone.utc).isoformat()}
    json.dump(meta, open(f"{d}/meta.json", "w"))
    _feed.insert(0, meta)                          # cache stays current — no re-scan
    return meta

@app.api(name="feed", concurrency_limit=10)
def feed(): return _feed[:50]                      # zero disk I/O
```

Reference Space using this pattern: https://huggingface.co/spaces/victor/ace-step-jam

## Anti-pattern: bucket as model-weights cache

**Do NOT** `snapshot_download(..., local_dir="/data/weights")` and load checkpoints from there. Bucket I/O is S3-paced; reading a 22 GB `safetensors` from `/data` during `from_pretrained` stalls past any `@spaces.GPU` duration cap.

For model weights, let HF Hub re-download to local container disk on each cold start. With `HF_HUB_ENABLE_HF_TRANSFER=1` (set in the runtime by default) this is fast — typically much faster than streaming the same bytes through bucket I/O at request time.

Bucket I/O is fine for occasional metadata reads (the feed pattern above) or saving user information. It is *not* fine as the path your model loader streams gigabytes through every cold start.

## Cache redirects

`/home/user/.cache` is read-only on ZeroGPU. Redirect transient caches at the top of `app.py`, before any library import that uses them:

```python
import os
os.environ.setdefault("HF_HOME", "/data/.cache/huggingface")   # or /tmp on non-bucket Spaces
os.environ.setdefault("HF_MODULES_CACHE", "/tmp/hf_modules")
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
```

Missing redirections fail silently or at first matplotlib / transformers / diffusers import.

## Write access from the Space

The Space's `HF_TOKEN` secret needs write permission on the bucket. Set via Settings → Secrets in the Space UI, or `hf spaces secrets set <id> HF_TOKEN=<token>`.

## Security note

Public bucket files are publicly accessible forever at their resolve URL. **Don't write PII** to a public bucket. If you need durable but private storage (e.g. per-user history requiring an HF login), keep the bucket private and gate reads through your Space's own auth.
