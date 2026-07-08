---
name: azure-ai-vision-imageanalysis-py
description: Azure AI Vision Image Analysis SDK for captions, tags, objects, OCR, people detection, and smart cropping. Use for computer vision and image understanding tasks.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure AI Vision Image Analysis SDK for Python

Client library for Azure AI Vision 4.0 image analysis including captions, tags, objects, OCR, and more.

## Installation

```bash
pip install azure-ai-vision-imageanalysis
```

## Environment Variables

```bash
VISION_ENDPOINT=https://<resource>.cognitiveservices.azure.com
VISION_KEY=<your-api-key>  # If using API key
```

## Authentication

### API Key

```python
import os
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.core.credentials import AzureKeyCredential

endpoint = os.environ["VISION_ENDPOINT"]
key = os.environ["VISION_KEY"]

client = ImageAnalysisClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(key)
)
```

### Entra ID (Recommended)

```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.identity import DefaultAzureCredential

client = ImageAnalysisClient(
    endpoint=os.environ["VISION_ENDPOINT"],
    credential=DefaultAzureCredential()
)
```

## Analyze Image from URL

```python
from azure.ai.vision.imageanalysis.models import VisualFeatures

image_url = "https://example.com/image.jpg"

result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[
        VisualFeatures.CAPTION,
        VisualFeatures.TAGS,
        VisualFeatures.OBJECTS,
        VisualFeatures.READ,
        VisualFeatures.PEOPLE,
        VisualFeatures.SMART_CROPS,
        VisualFeatures.DENSE_CAPTIONS
    ],
    gender_neutral_caption=True,
    language="en"
)
```

## Analyze Image from File

```python
with open("image.jpg", "rb") as f:
    image_data = f.read()

result = client.analyze(
    image_data=image_data,
    visual_features=[VisualFeatures.CAPTION, VisualFeatures.TAGS]
)
```

## Image Caption

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.CAPTION],
    gender_neutral_caption=True
)

if result.caption:
    print(f"Caption: {result.caption.text}")
    print(f"Confidence: {result.caption.confidence:.2f}")
```

## Dense Captions (Multiple Regions)

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.DENSE_CAPTIONS]
)

if result.dense_captions:
    for caption in result.dense_captions.list:
        print(f"Caption: {caption.text}")
        print(f"  Confidence: {caption.confidence:.2f}")
        print(f"  Bounding box: {caption.bounding_box}")
```

## Tags

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.TAGS]
)

if result.tags:
    for tag in result.tags.list:
        print(f"Tag: {tag.name} (confidence: {tag.confidence:.2f})")
```

## Object Detection

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.OBJECTS]
)

if result.objects:
    for obj in result.objects.list:
        print(f"Object: {obj.tags[0].name}")
        print(f"  Confidence: {obj.tags[0].confidence:.2f}")
        box = obj.bounding_box
        print(f"  Bounding box: x={box.x}, y={box.y}, w={box.width}, h={box.height}")
```

## OCR (Text Extraction)

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.READ]
)

if result.read:
    for block in result.read.blocks:
        for line in block.lines:
            print(f"Line: {line.text}")
            print(f"  Bounding polygon: {line.bounding_polygon}")
            
            # Word-level details
            for word in line.words:
                print(f"  Word: {word.text} (confidence: {word.confidence:.2f})")
```

## People Detection

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.PEOPLE]
)

if result.people:
    for person in result.people.list:
        print(f"Person detected:")
        print(f"  Confidence: {person.confidence:.2f}")
        box = person.bounding_box
        print(f"  Bounding box: x={box.x}, y={box.y}, w={box.width}, h={box.height}")
```

## Smart Cropping

```python
result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.SMART_CROPS],
    smart_crops_aspect_ratios=[0.9, 1.33, 1.78]  # Portrait, 4:3, 16:9
)

if result.smart_crops:
    for crop in result.smart_crops.list:
        print(f"Aspect ratio: {crop.aspect_ratio}")
        box = crop.bounding_box
        print(f"  Crop region: x={box.x}, y={box.y}, w={box.width}, h={box.height}")
```

## Async Client

```python
from azure.ai.vision.imageanalysis.aio import ImageAnalysisClient
from azure.identity.aio import DefaultAzureCredential

async def analyze_image():
    async with ImageAnalysisClient(
        endpoint=endpoint,
        credential=DefaultAzureCredential()
    ) as client:
        result = await client.analyze_from_url(
            image_url=image_url,
            visual_features=[VisualFeatures.CAPTION]
        )
        print(result.caption.text)
```

## Visual Features

| Feature | Description |
|---------|-------------|
| `CAPTION` | Single sentence describing the image |
| `DENSE_CAPTIONS` | Captions for multiple regions |
| `TAGS` | Content tags (objects, scenes, actions) |
| `OBJECTS` | Object detection with bounding boxes |
| `READ` | OCR text extraction |
| `PEOPLE` | People detection with bounding boxes |
| `SMART_CROPS` | Suggested crop regions for thumbnails |

## Error Handling

```python
from azure.core.exceptions import HttpResponseError

try:
    result = client.analyze_from_url(
        image_url=image_url,
        visual_features=[VisualFeatures.CAPTION]
    )
except HttpResponseError as e:
    print(f"Status code: {e.status_code}")
    print(f"Reason: {e.reason}")
    print(f"Message: {e.error.message}")
```

## Image Requirements

- Formats: JPEG, PNG, GIF, BMP, WEBP, ICO, TIFF, MPO
- Max size: 20 MB
- Dimensions: 50x50 to 16000x16000 pixels

## Best Practices

1. **Select only needed features** to optimize latency and cost
2. **Use async client** for high-throughput scenarios
3. **Handle HttpResponseError** for invalid images or auth issues
4. **Enable gender_neutral_caption** for inclusive descriptions
5. **Specify language** for localized captions
6. **Use smart_crops_aspect_ratios** matching your thumbnail requirements
7. **Cache results** when analyzing the same image multiple times

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
