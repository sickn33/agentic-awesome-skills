---
name: azure-ai-transcription-py
description: Azure AI Transcription SDK for Python. Use for real-time and batch speech-to-text transcription with timestamps and diarization.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure AI Transcription SDK for Python

Client library for Azure AI Transcription (speech-to-text) with real-time and batch transcription.

## Installation

```bash
pip install azure-ai-transcription
```

## Environment Variables

```bash
TRANSCRIPTION_ENDPOINT=https://<resource>.cognitiveservices.azure.com
TRANSCRIPTION_KEY=<your-key>
```

## Authentication

Use subscription key authentication (DefaultAzureCredential is not supported for this client):

```python
import os
from azure.ai.transcription import TranscriptionClient

client = TranscriptionClient(
    endpoint=os.environ["TRANSCRIPTION_ENDPOINT"],
    credential=os.environ["TRANSCRIPTION_KEY"]
)
```

## Transcription (Batch)

```python
job = client.begin_transcription(
    name="meeting-transcription",
    locale="en-US",
    content_urls=["https://<storage>/audio.wav"],
    diarization_enabled=True
)
result = job.result()
print(result.status)
```

## Transcription (Real-time)

```python
stream = client.begin_stream_transcription(locale="en-US")
stream.send_audio_file("audio.wav")
for event in stream:
    print(event.text)
```

## Best Practices

1. **Enable diarization** when multiple speakers are present
2. **Use batch transcription** for long files stored in blob storage
3. **Capture timestamps** for subtitle generation
4. **Specify language** to improve recognition accuracy
5. **Handle streaming backpressure** for real-time transcription
6. **Close transcription sessions** when complete

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
