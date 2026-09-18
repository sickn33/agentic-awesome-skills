# Gemini Omni Flash Video (`gemini-omni-flash-preview`)

## Overview
Gemini Omni Flash generates and edits video. It supports text-to-video, image-to-video, subject-reference video, stateful multi-turn video editing, and editing a user's own uploaded video. **Every paid run requires explicit user cost approval before execution — see the skill's cost-approval rule.**

## Model Specification
- **Model ID**: `gemini-omni-flash-preview`
- **API**: Interactions API (`client.interactions.create`) — this model does not use the older `generate_videos` or `:predictLongRunning` methods.
- **Primary Use**: Text-to-video, image-to-video, subject-reference video, video editing.
- **Cost**: Billable per call, priced per output. Quote the current price from the live [pricing page](https://ai.google.dev/gemini-api/docs/pricing) and get explicit user approval before submitting — one approval covers exactly one run.
- **Aspect ratios**: `16:9`, `9:16` documented for aspect-ratio-controlled requests.
- **Reproducibility**: No `seed` parameter is documented for this model. Treat every generation as non-deterministic.

## Request Shape

### Text-to-Video (Python SDK, Interactions API)
```python
import base64
from google import genai

client = genai.Client()

# Quote cost and wait for explicit user approval before running!
interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A marble rolling fast on a chain reaction style track, continuous smooth shot.",
)
with open("generations/marble.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

### Control Aspect Ratio
```python
interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A futuristic city with neon lights and flying cars, cyberpunk style",
    response_format={
        "type": "video",  # optional
        "aspect_ratio": "9:16",  # supported: "9:16", "16:9"
    },
)
```

### Image-to-Video
Pass a reference image and instructions as separate `input` parts:
```python
import base64
from google import genai

client = genai.Client()

with open("generations/refs/start_frame.png", "rb") as f:
    frame_bytes = f.read()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "image", "data": base64.b64encode(frame_bytes).decode("utf-8"), "mime_type": "image/png"},
        {"type": "text", "text": "The scene animates smoothly as the character steps forward into the misty forest."},
    ],
)
with open("generations/forest.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

### Subject Reference (multiple reference images)
```python
interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "image", "data": cat_b64, "mime_type": "image/png"},
        {"type": "image", "data": yarn_b64, "mime_type": "image/png"},
        {"type": "text", "text": "A cat playfully batting at a ball of yarn."},
    ],
)
```

### Stateful Multi-Turn Video Editing
Chain an edit onto a prior generation with `previous_interaction_id` — this is the closest thing this model offers to controlled reruns, not a seed:
```python
# Turn 1: generate
res1 = client.interactions.create(model="gemini-omni-flash-preview", input="A woman playing violin outdoors.")

# Turn 2: edit the previous result
res2 = client.interactions.create(
    model="gemini-omni-flash-preview",
    previous_interaction_id=res1.id,
    input="Make the violin invisible.",
)
with open("generations/violin.mp4", "wb") as f:
    f.write(base64.b64decode(res2.output_video.data))
```

### Editing a User's Own Uploaded Video
```python
import time
from google import genai

client = genai.Client()

video_file = client.files.upload(file="Video.mp4")
while video_file.state == "PROCESSING":
    time.sleep(10)
    video_file = client.files.get(name=video_file.name)
if video_file.state == "FAILED":
    raise ValueError(video_file.state)

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "document", "uri": video_file.uri},
        {"type": "text", "text": "When the person touches the mirror, make the mirror ripple beautifully like liquid, and the person's arm turns into reflective mirror material"},
    ],
)
with open("generations/mirror.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

### Large Outputs: Retrieve via URI Instead of Inline Base64
For outputs too large for inline base64, request `delivery: "uri"` and poll the Files API until `ACTIVE`:
```python
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A beautiful sunset over a calm ocean.",
    response_format={"type": "video", "delivery": "uri"},
)

video_output = interaction.output_video
file_name = video_output.uri.split("/")[-1]

while True:
    f_info = client.files.get(name=f"files/{file_name}")
    if f_info.state.name == "ACTIVE":
        break
    if f_info.state.name == "FAILED":
        raise RuntimeError("Generation failed.")
    time.sleep(5)

video_bytes = client.files.download(file=video_output.uri)
with open("generations/output.mp4", "wb") as f:
    f.write(video_bytes)
```

### REST API (`curl`)
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
     "model": "gemini-omni-flash-preview",
     "input": "A marble rolling fast on a chain reaction style track, continuous smooth shot."
    }'
```

The response's `output_video.data` field holds base64-encoded video bytes (or `output_video.uri` when `delivery: "uri"` was requested); decode/download and write to the target file. The response envelope also includes an `id` field — log it so multi-turn edits can chain via `previous_interaction_id`.
