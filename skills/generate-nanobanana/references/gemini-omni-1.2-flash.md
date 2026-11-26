# Gemini Omni Flash

Google's GA multimodal video generation and conversational editing model (`gemini-omni-1.2-flash`, upgrading `gemini-omni-1.1-flash`). Generates `3s`–`15s` clips (`10s` default) at 24 FPS with synchronized audio across `360p`, `720p` (default), `1080p`, and `4k`, and supports first-frame-to-video (`3s`–`15s`), first-and-last-frame keyframe interpolation (`3s`–`10s`), reference-to-video (up to 6 reference images or up to 3 reference videos), scene extension (`3s`–`10s` per turn, up to `30s` cumulative length), and multi-turn conversational video editing.

| Field | Value |
|---|---|
| Model ID | `gemini-omni-1.2-flash` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync for standard clips (inline base64); large outputs (>4MB / >720p) use `delivery: "uri"` via the Files API |
| Type | Video |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/omni |
| Cost | ~$0.10 / second at 720p ($17.50 / 1M video output tokens at ~5,792 tokens/s; $1.50 / 1M input tokens; $9.00 / 1M text output tokens) — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before running (see SKILL.md, Rules) |

`gemini-omni-1.1-flash` is superseded by `gemini-omni-1.2-flash` (`gemini-omni-flash-preview` and the Gemini API `veo-3.1-*-preview` endpoints were shut down on 2026-10-22; `veo-3.0-*` shut down 2026-06-30).

## Request (Python, `google-genai >= 3.2.0` SDK)

### Text-to-video (3s–15s, with aspect ratio & resolution control)
```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-1.2-flash",
    input=prompt,
    response_format={
        "type": "video",
        "aspect_ratio": "16:9",  # "16:9" (default) | "9:16"
        "resolution": "720p",    # "360p" | "720p" (default) | "1080p" | "4k"
        "duration": "10s",       # "3s" to "15s" ("10s" default)
    },
)
with open(output_path, "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

### First-frame-to-video (`3s`–`15s`) & first/last frame interpolation (`3s`–`10s`)
Gemini Omni 1.2 Flash binds uploaded images and videos to their roles using **natural language** based on their order in `input` (do **not** use deprecated `<FIRST_FRAME>`, `<LAST_FRAME>`, or `<IMAGE_REF_N>` tags):
```python
import base64
import mimetypes
from pathlib import Path
from google import genai

client = genai.Client()

frame_bytes = Path(image_path).read_bytes()
if frame_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
    mime_type = "image/png"
elif frame_bytes.startswith(b"\xff\xd8\xff"):
    mime_type = "image/jpeg"
elif frame_bytes[:4] == b"RIFF" and frame_bytes[8:12] == b"WEBP":
    mime_type = "image/webp"
else:
    mime_type, _ = mimetypes.guess_type(str(image_path))
if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
    raise ValueError(f"Unsupported starting-frame MIME {mime_type} for {image_path}")

interaction = client.interactions.create(
    model="gemini-omni-1.2-flash",
    input=[
        {"type": "image", "data": base64.b64encode(frame_bytes).decode("utf-8"), "mime_type": mime_type},
        {"type": "text", "text": f"Use this image as the starting frame. {prompt}"},
    ],
    response_format={"type": "video", "aspect_ratio": "16:9", "resolution": "720p", "duration": "5s"},
)
with open(output_path, "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```
For a seamless looping UI background video (`3s`–`10s`), pass the same image twice and prompt: `"Use the first image as the starting frame and the second image as the final frame."`

### Stateful editing & multi-turn video extension (`3s`–`10s` per turn, up to `30s` total)
Chain an edit or a continuation onto a prior generation without re-uploading the video (and optionally include up to 6 reference images):
```python
edited = client.interactions.create(
    model="gemini-omni-1.2-flash",
    previous_interaction_id=interaction.id,
    input="Make the violin invisible. Keep everything else the same.",  # or "Extend this video: the camera pans across the mountains."
)
```

### Extending an uploaded video
```python
video_file = client.files.upload(file="my_video.mp4")  # up to 15s

extended = client.interactions.create(
    model="gemini-omni-1.2-flash",
    input=[
        {"type": "video", "uri": video_file.uri},
        {"type": "text", "text": "Extend this video: the scene continues as dusk falls."},
    ],
    response_format={"type": "video", "duration": "10s"},
)
```

### Large outputs (>4MB / 1080p / 4K) — retrieve via verified Files URI with deadline
```python
import re
import time
from urllib.parse import urlparse
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-1.2-flash",
    input=prompt,
    response_format={"type": "video", "resolution": "1080p", "duration": "10s", "delivery": "uri"},
)

video_output = interaction.output_video
parsed = urlparse(video_output.uri or "")
match = re.fullmatch(r"/(?:v1(?:beta)?/)?(files/[a-z0-9-]+)", parsed.path)
if parsed.scheme != "https" or parsed.hostname != "generativelanguage.googleapis.com" or not match:
    raise RuntimeError(f"Untrusted or malformed video output URI: {video_output.uri}")
resource_name = match.group(1)

deadline = time.monotonic() + 600  # 10-minute bounded polling deadline
while time.monotonic() < deadline:
    f_info = client.files.get(name=resource_name)
    if f_info.state.name == "ACTIVE":
        break
    if f_info.state.name == "FAILED":
        raise RuntimeError("Video generation failed on Files API.")
    time.sleep(5)
else:
    raise TimeoutError(f"Timed out waiting for {resource_name}; check status before rerunning.")

video_bytes = client.files.download(file=resource_name)
with open(output_path, "wb") as f:
    f.write(video_bytes)
```

## Response handling

The inline path returns `output_video.data` as base64 — decode with `base64.b64decode` before writing; don't treat it as raw bytes. For videos larger than 4MB (such as `1080p` or `4k` outputs), use `delivery: "uri"`, poll `client.files.get` until `ACTIVE` (checking `FAILED` too), and download immediately — note that `output_video.uri` is only returned on the initial creation response, whereas a later `GET /v1/interactions/{id}` returns inline base64. Always verify the `.mp4` landed on disk and is non-empty before writing the sidecar, and log `interaction.id` in `response_id`.

## Notes

- **Reference media rules in 1.2:** Up to **6 reference images** work across new video generation (R2V), video editing, and prompt-based video extension (including `15s` clips). Reference videos are supported for new video generation only (up to 3 reference videos on `3s`–`10s` clips; max 1 reference video on `11s`–`15s` clips).
- **Natural-language media binding:** Do not use deprecated `<FIRST_FRAME>`, `<LAST_FRAME>`, `<IMAGE_REF_*>`, or `<VIDEO_REF_*>` tags. Refer to uploaded images/videos in plain natural language (`"Use this image as the starting frame..."`).
- **Explicit `task` hint (fallback only):** Leave `generation_config.video_config.task` unset by default (especially when extending a video with reference images, as `task="extend"` blocks reference images). Use `task` only if natural-language prompting is ambiguous.
- **Single-shot vs multi-shot default:** By default, Omni Flash crafts a multi-shot narrative. If the user wants one continuous shot, include `"In a single unbroken scene, no scene cuts"` in the prompt.
- **Cost & approval gate:** Billed per output token (~$0.10/sec at 720p; ~`$1.01` for a 10-second clip) with no free tier. Quote expected duration, resolution, and cost and wait for explicit approval before every call.
