# API Workflow: Creative Engine

```
last-verified: 2026-09-02 · ttl-days: 180 · refresh: check replicate.com/docs for HTTP API changes
changes: 2026-09-02, status list gains canceled/aborted; published limits are 600 creates/min + 3,000/min elsewhere with no documented concurrency cap (waves stay operator practice); 1-hour API retention confirmed and expired output reads null; Prefer: wait sync shortcut added; 404 can now mean a provider sunset (the Sora 2 API ended 2026-09-24)
```

The ONE copy of the Replicate calling workflow, file conventions, campaign manifest,
vision-QA mechanics, and handoff contracts. Every mode points here. Model IDs and
payloads live ONLY in `references/MODEL_REGISTRY.md`.

Load this file before the first generation of a session; you won't need it again until
something fails.

---

## 1. The async call pattern

Every Replicate generation is async: create a prediction, poll, download.

### Create

```bash
curl -s -X POST "https://api.replicate.com/v1/models/{owner}/{model}/predictions" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": { ...payload from MODEL_REGISTRY.md... }}'
```

The model path goes in the **URL**. The body contains ONLY `{"input": {...}}`; never
`model`, `model_owner`, or `version` keys. Response (HTTP 201) includes `"id"` and
`"urls": {"get": ...}`.

### Poll

```bash
curl -s "https://api.replicate.com/v1/predictions/{id}" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN"
```

Poll every 5s (images) / 10s (video). `status` walks `starting` → `processing` →
`succeeded` | `failed` | `canceled` (stopped after it began) | `aborted` (stopped before
it started). On `succeeded`, read `output` (URL or array of URLs). On `failed`, read
`error`. Treat `canceled`/`aborted` like `failed`: nothing to download.

**Sync shortcut for images:** add the header `Prefer: wait` (or `Prefer: wait=N`, N up to
60 seconds) to the create call and Replicate holds the request open. If the model
finishes in time the response already carries `output`; if not, you get the prediction
in `starting`/`processing` and fall back to polling as above. Worth it for single images
(15-40s); pointless for video.

Typical wall-clock: images 15-40s · draft video ~20-40s · production video 1-3min ·
premium video 3-10min. Fire independent generations in parallel (task agents or
backgrounded curl). A batch takes as long as its slowest member, not the sum.

### Download: within 1 hour, no exceptions

For predictions created through the API, Replicate removes the inputs, output files,
and logs **one hour** after completion (predictions made in the web UI are kept
indefinitely; the API is the strict case). After that the file URL 404s and the
prediction's `output` reads `null`. Download the file to its campaign path (section 3)
IMMEDIATELY on success, before presenting anything to the user. A "great result" that
wasn't downloaded is a regeneration cost.

```bash
curl -s -o "{local_path}" "{output_url}"
```

### Errors

| HTTP / state | Meaning | Action |
|--------------|---------|--------|
| 401 | bad/missing token | Check `REPLICATE_API_TOKEN`; offer prompt-only mode |
| 404 | model ID wrong, renamed, or sunset by its provider (Sora 2 / Sora 2 Pro ended 2026-09-24; a delisted model can still answer the API metadata check) | `scripts/verify_models.sh`; fix MODEL_REGISTRY.md (roster block AND the role map) |
| 422 | invalid parameter | Cross-model cheat sheet in MODEL_REGISTRY.md: param names differ per family |
| 429 | rate limited | Wait 60s; reduce wave size |
| `failed`, vague error | content filter or transient | Rephrase flagged terms; retry once; then check replicate.com/predictions logs |
| `output: null` on `succeeded` | silent failure, or you re-read the prediction more than 1 hour after it finished | Within the hour: treat as failed, retry once. Later: it expired. Regenerate |

### Rate limits / batching

Replicate's published limits are **600 prediction creates per minute** and **3,000
requests per minute** on every other endpoint; exceeding either returns `429`. No
per-account concurrency cap is documented, so wave size is operator practice, not a
platform rule: batch in **waves of 5-8** and wait for a wave before launching the next;
it keeps a mid-batch failure cheap to resume and contains provider-side capacity errors
(which surface as `failed`, not `429`). For 20+ asset campaigns, write the manifest
first (section 4) so a mid-batch failure is resumable.

---

## 2. Vision QA mechanics

(The QA *policy*, which is to score everything, regenerate at most twice below 7 and
present the best with a critique, lives in SKILL.md. This is the how.)

**Images:** after download, `Read` the local file directly. Judge it against the rubric
(creative-kit.md constraints + the anti-slop checklist in VISUAL_INTELLIGENCE.md Part 4
+ the request's own spec: platform ratio, text space, focal point).

**Video:** extract three frames: the first frame (the thumbnail/hook), the midpoint and a frame from the last moments:

```bash
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 clip.mp4)
MID=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", d/2}')
ffmpeg -y -i clip.mp4 -frames:v 1 f1.png 2>/dev/null
ffmpeg -y -ss "$MID" -i clip.mp4 -frames:v 1 f2.png 2>/dev/null
ffmpeg -y -sseof -0.2 -i clip.mp4 -frames:v 1 f3.png 2>/dev/null
```

(`-ss` before `-i` seeks to the midpoint; `-sseof -0.2` seeks to 0.2 seconds before the end.) `Read` each frame. If ffmpeg is not
installed, `Read` the prediction's thumbnail/cover URL if present, and say so in one line
in the note: "Reviewed from the thumbnail only; install ffmpeg for full-frame review."

**Scoring:** one integer 1-10 plus a one-line reason per failed dimension, kept in the
manifest. The score is honest, not ceremonial, and not shown to the client. A 6 with a
named flaw beats an unexamined 8.

**Multi-model comparisons:** QA each candidate, then present **pre-ranked** with stated
reasons and no scores or model names ("Option A: cleanest product fidelity but flat
lighting. Option B: best motion, slight label warp at 3s, recommended"). Never dump
three URLs and ask "which one?"

---

## 3. File output conventions

Files-first: every asset is downloaded and saved BEFORE it is summarized in chat, and
every asset appends one line to `./brand/assets.md`.

### Directory layout

```
creative-output/
├── explorations/<project>/          direction-1.png … direction-5.png
├── product-photos/<product>/        hero/ detail/ lifestyle/ ecommerce/ flat-lay/ edits/
├── videos/<product>/                drafts/ production/ premium/ sequence/ approved/
├── social-graphics/<campaign>/      instagram/ linkedin/ x/ tiktok/ youtube/ pinterest/
├── talking-heads/<campaign>/        presenter-pack/ generation/ audio/ lip-sync/ approved/
├── ad-creative/<campaign>/          assets named by matrix cell ID (see ad-creative mode)
└── exports/<campaign>/              final deliverables + manifest.yaml
```

Campaign work may equally live under `./campaigns/<name>/creative/` when the campaign
directory already exists. Follow the campaign, don't create a second tree.

### Naming

```
[type]-[descriptor]-[ratio]-v[N].[ext]          general
hero-walnut-desk-16x9-v2.png
reveal-orbit-kling-9x16-v1.mp4                  video: include model shortname
MA-H2-B-9x16-v1.mp4                             ad assets: ALWAYS the matrix cell ID
```

Iterations increment `vN`; never overwrite earlier versions.

### Logging

Append to `./brand/assets.md` per asset:
`- [2026-06-10] [creative] creative-output/videos/acme/production/reveal-orbit-kling-16x9-v2.mp4: production reveal, kling, ~$1.12`

---

## 4. Campaign manifest (resume after failure)

For any batch of 3+ assets, write the manifest BEFORE generating and update it per
asset. This is what makes a failed batch resumable instead of restartable.

`creative-output/exports/<campaign>/manifest.yaml`:

```yaml
campaign: spring-launch
created: 2026-06-10
brand_kit: ./brand/creative-kit.md
style_lock: ./creative-output/explorations/spring-launch/style-lock.md   # if locked
assets:
  - id: hero-still
    file: product-photos/acme/hero/hero-floating-16x9-v1.png
    role: image-default            # role, resolved via MODEL_REGISTRY.md
    model: google/nano-banana-2    # what actually ran
    prompt: "…full prompt verbatim…"
    seed: 41782                    # if the model supports seeds
    ratio: "16:9"
    cost: 0.067
    qa_score: 8
    status: done                   # pending | generating | done | failed
  - id: MA-H2-B-9x16
    file: ad-creative/spring-launch/MA-H2-B-9x16-v1.mp4
    role: video-production
    status: pending
totals:
  spent: 0.07
  budget: 10.00
```

**Resume rule:** on re-entry, read the manifest, skip `done`, retry `failed` once,
generate `pending`. Prompts and seeds in the manifest are what make regenerated assets
match their siblings.

---

## 5. Handoff contracts

### Receiving a brief (from /boring-marketing-positioning-angles, /boring-marketing-direct-response-copy, /boring-marketing-paid-ads…)

```yaml
creative_brief:
  subject: what to create
  audience: who it is for
  message: key communication point
  platform: where it ships
  style_notes: visual direction, if any
  ad_matrix: ./campaigns/<name>/ad-matrix.json   # if ad work, see ad-creative mode
```

### Delivering (to /boring-marketing-content-atomizer, /boring-marketing-paid-ads, /boring-marketing-email-sequences…)

```yaml
creative_delivery:
  campaign: spring-launch
  manifest: creative-output/exports/spring-launch/manifest.yaml
  assets:
    - path: creative-output/videos/acme/approved/reveal-final-16x9.mp4
      type: video
      duration: 5s
      ratio: "16:9"
      qa_score: 8
  brand_kit: ./brand/creative-kit.md
  style_locked: true
```

The manifest is the canonical record; the delivery block is a pointer plus the approved
subset. It goes to the calling skill, never into the client-facing text.

---

## 6. No-token fallback (prompt-only mode)

If `REPLICATE_API_TOKEN` is unset, do not block. Say so once, then run the same
workflow (brand kit, mode judgment, prompt construction) and deliver, per asset, a
copyable block (the model is a recommendation the client will run, so naming it here is
fine): the exact prompt, the recommended role + current model for it (named
from MODEL_REGISTRY.md), ratio/duration/settings, and any reference-image instructions.
Save prompts to the campaign directory so a later token upgrade can execute them
verbatim. The prompt engineering and creative direction are the product; the API call
is just the last step.
