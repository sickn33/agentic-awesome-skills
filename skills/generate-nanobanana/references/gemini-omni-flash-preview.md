# Gemini Omni Flash Video (`gemini-omni-flash-preview`)

## Overview
Gemini Omni Flash generates and edits videos (3 to 10 seconds). It supports text-to-video, first-frame-to-video, reference-guided video generation, and video style editing. **All paid video runs require explicit user cost approval before execution.**

## Model Specification
- **Model ID**: `gemini-omni-flash-preview`
- **Primary Use**: Text-to-video, image-to-video, video editing
- **Ballpark Cost**: Per-second pricing (must quote cost and get explicit approval before submitting)
- **Supported Video Durations**: 3 to 10 seconds
- **Supported Aspect Ratios**: `16:9`, `9:16`, `1:1`

## Request Shape

### Python SDK (`google-genai`)
```python
import time
from google import genai
from google.genai import types

client = genai.Client()

# Quote cost and wait for explicit user approval before running!
# Submit the video generation task
operation = client.models.generate_videos(
    model="gemini-omni-flash-preview",
    prompt="A smooth continuous shot of ocean waves crashing against cliffs during golden hour sunset. Sound design: gentle wind and crashing waves.",
    config=types.GenerateVideosConfig(
        duration_seconds=5,
        aspect_ratio="16:9",
        seed=481047
    )
)

# Poll the operation until completion
while not operation.done:
    time.sleep(5)
    operation = client.operations.get(operation)

# Download and save the resulting video asset
video_result = operation.result.generated_videos[0]
with open("generations/waves_5s.mp4", "wb") as f:
    f.write(video_result.video.video_bytes)
```

### First-Frame / Image-to-Video
```python
import time
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

# Upload starting frame image via Files API if needed
uploaded_frame = client.files.upload(file="generations/refs/start_frame.png")

operation = client.models.generate_videos(
    model="gemini-omni-flash-preview",
    prompt="<FIRST_FRAME> The scene animates smoothly as the character steps forward into the misty forest.",
    config=types.GenerateVideosConfig(
        duration_seconds=5,
        aspect_ratio="16:9",
        seed=481047
    )
)

while not operation.done:
    time.sleep(5)
    operation = client.operations.get(operation)
```

### REST API (`curl`)
```bash
# Step 1: Submit job (returns operation object)
cat > /tmp/video_request.json << 'EOF'
{
  "prompt": "Cinematic shot of neon lights in Tokyo street rain",
  "videoConfig": {
    "durationSeconds": 5,
    "aspectRatio": "16:9",
    "seed": 481047
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-omni-flash-preview:predictLongRunning" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/video_request.json > /tmp/video_op.json

# Step 2: Poll operation status using returned operation name
# GET https://generativelanguage.googleapis.com/v1beta/operations/<OPERATION_NAME>
```
