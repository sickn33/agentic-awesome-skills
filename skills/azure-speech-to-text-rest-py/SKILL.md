---
name: azure-speech-to-text-rest-py
description: Azure Speech to Text REST API for short audio (Python). Use for simple speech recognition of audio files up to 60 seconds without the Speech SDK.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Speech to Text REST API for Short Audio

Simple REST API for speech-to-text transcription of short audio files (up to 60 seconds). No SDK required - just HTTP requests.

## Prerequisites

1. **Azure subscription** - [Create one free](https://azure.microsoft.com/free/)
2. **Speech resource** - Create in [Azure Portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices)
3. **Get credentials** - After deployment, go to resource > Keys and Endpoint

## Environment Variables

```bash
# Required
AZURE_SPEECH_KEY=<your-speech-resource-key>
AZURE_SPEECH_REGION=<region>  # e.g., eastus, westus2, westeurope

# Alternative: Use endpoint directly
AZURE_SPEECH_ENDPOINT=https://<region>.stt.speech.microsoft.com
```

## Installation

```bash
pip install requests
```

## Quick Start

```python
import os
import requests

def transcribe_audio(audio_file_path: str, language: str = "en-US") -> dict:
    """Transcribe short audio file (max 60 seconds) using REST API."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]
    
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json"
    }
    
    params = {
        "language": language,
        "format": "detailed"  # or "simple"
    }
    
    with open(audio_file_path, "rb") as audio_file:
        response = requests.post(url, headers=headers, params=params, data=audio_file)
    
    response.raise_for_status()
    return response.json()

# Usage
result = transcribe_audio("audio.wav", "en-US")
print(result["DisplayText"])
```

## Audio Requirements

| Format | Codec | Sample Rate | Notes |
|--------|-------|-------------|-------|
| WAV | PCM | 16 kHz, mono | **Recommended** |
| OGG | OPUS | 16 kHz, mono | Smaller file size |

**Limitations:**
- Maximum 60 seconds of audio
- For pronunciation assessment: maximum 30 seconds
- No partial/interim results (final only)

## Content-Type Headers

```python
# WAV PCM 16kHz
"Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000"

# OGG OPUS
"Content-Type": "audio/ogg; codecs=opus"
```

## Response Formats

### Simple Format (default)

```python
params = {"language": "en-US", "format": "simple"}
```

```json
{
  "RecognitionStatus": "Success",
  "DisplayText": "Remind me to buy 5 pencils.",
  "Offset": "1236645672289",
  "Duration": "1236645672289"
}
```

### Detailed Format

```python
params = {"language": "en-US", "format": "detailed"}
```

```json
{
  "RecognitionStatus": "Success",
  "Offset": "1236645672289",
  "Duration": "1236645672289",
  "NBest": [
    {
      "Confidence": 0.9052885,
      "Display": "What's the weather like?",
      "ITN": "what's the weather like",
      "Lexical": "what's the weather like",
      "MaskedITN": "what's the weather like"
    }
  ]
}
```

## Chunked Transfer (Recommended)

For lower latency, stream audio in chunks:

```python
import os
import requests

def transcribe_chunked(audio_file_path: str, language: str = "en-US") -> dict:
    """Stream audio in chunks for lower latency."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]
    
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
        "Transfer-Encoding": "chunked",
        "Expect": "100-continue"
    }
    
    params = {"language": language, "format": "detailed"}
    
    def generate_chunks(file_path: str, chunk_size: int = 1024):
        with open(file_path, "rb") as f:
            while chunk := f.read(chunk_size):
                yield chunk
    
    response = requests.post(
        url, 
        headers=headers, 
        params=params, 
        data=generate_chunks(audio_file_path)
    )
    
    response.raise_for_status()
    return response.json()
```

## Authentication Options

### Option 1: Subscription Key (Simple)

```python
headers = {
    "Ocp-Apim-Subscription-Key": os.environ["AZURE_SPEECH_KEY"]
}
```

### Option 2: Bearer Token

```python
import requests
import os

def get_access_token() -> str:
    """Get access token from the token endpoint."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]
    
    token_url = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    
    response = requests.post(
        token_url,
        headers={
            "Ocp-Apim-Subscription-Key": api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": "0"
        }
    )
    response.raise_for_status()
    return response.text

# Use token in requests (valid for 10 minutes)
token = get_access_token()
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
    "Accept": "application/json"
}
```

## Query Parameters

| Parameter | Required | Values | Description |
|-----------|----------|--------|-------------|
| `language` | **Yes** | `en-US`, `de-DE`, etc. | Language of speech |
| `format` | No | `simple`, `detailed` | Result format (default: simple) |
| `profanity` | No | `masked`, `removed`, `raw` | Profanity handling (default: masked) |

## Recognition Status Values

| Status | Description |
|--------|-------------|
| `Success` | Recognition succeeded |
| `NoMatch` | Speech detected but no words matched |
| `InitialSilenceTimeout` | Only silence detected |
| `BabbleTimeout` | Only noise detected |
| `Error` | Internal service error |

## Profanity Handling

```python
# Mask profanity with asterisks (default)
params = {"language": "en-US", "profanity": "masked"}

# Remove profanity entirely
params = {"language": "en-US", "profanity": "removed"}

# Include profanity as-is
params = {"language": "en-US", "profanity": "raw"}
```

## Error Handling

```python
import requests

def transcribe_with_error_handling(audio_path: str, language: str = "en-US") -> dict | None:
    """Transcribe with proper error handling."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]
    
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    
    try:
        with open(audio_path, "rb") as audio_file:
            response = requests.post(
                url,
                headers={
                    "Ocp-Apim-Subscription-Key": api_key,
                    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
                    "Accept": "application/json"
                },
                params={"language": language, "format": "detailed"},
                data=audio_file
            )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("RecognitionStatus") == "Success":
                return result
            else:
                print(f"Recognition failed: {result.get('RecognitionStatus')}")
                return None
        elif response.status_code == 400:
            print(f"Bad request: Check language code or audio format")
        elif response.status_code == 401:
            print(f"Unauthorized: Check API key or token")
        elif response.status_code == 403:
            print(f"Forbidden: Missing authorization header")
        else:
            print(f"Error {response.status_code}: {response.text}")
        
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None
```

## Async Version

```python
import os
import aiohttp
import asyncio

async def transcribe_async(audio_file_path: str, language: str = "en-US") -> dict:
    """Async version using aiohttp."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]
    
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json"
    }
    
    params = {"language": language, "format": "detailed"}
    
    async with aiohttp.ClientSession() as session:
        with open(audio_file_path, "rb") as f:
            audio_data = f.read()
        
        async with session.post(url, headers=headers, params=params, data=audio_data) as response:
            response.raise_for_status()
            return await response.json()

# Usage
result = asyncio.run(transcribe_async("audio.wav", "en-US"))
print(result["DisplayText"])
```

## Supported Languages

Common language codes (see [full list](https://learn.microsoft.com/azure/ai-services/speech-service/language-support)):

| Code | Language |
|------|----------|
| `en-US` | English (US) |
| `en-GB` | English (UK) |
| `de-DE` | German |
| `fr-FR` | French |
| `es-ES` | Spanish (Spain) |
| `es-MX` | Spanish (Mexico) |
| `zh-CN` | Chinese (Mandarin) |
| `ja-JP` | Japanese |
| `ko-KR` | Korean |
| `pt-BR` | Portuguese (Brazil) |

## Best Practices

1. **Use WAV PCM 16kHz mono** for best compatibility
2. **Enable chunked transfer** for lower latency
3. **Cache access tokens** for 9 minutes (valid for 10)
4. **Specify the correct language** for accurate recognition
5. **Use detailed format** when you need confidence scores
6. **Handle all RecognitionStatus values** in production code

## When NOT to Use This API

Use the Speech SDK or Batch Transcription API instead when you need:

- Audio longer than 60 seconds
- Real-time streaming transcription
- Partial/interim results
- Speech translation
- Custom speech models
- Batch transcription of many files

## Reference Files

| File | Contents |
|------|----------|
| references/pronunciation-assessment.md | Pronunciation assessment parameters and scoring |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
