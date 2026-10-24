# Pronunciation Assessment

Evaluate pronunciation quality of speech input using the REST API for short audio.

## Limitations

- Maximum 30 seconds of audio (vs 60 seconds for regular transcription)
- Requires reference text to compare against

## Headers

Add the `Pronunciation-Assessment` header with Base64-encoded JSON parameters:

```python
import base64
import json
import os
import requests

def transcribe_with_pronunciation_assessment(
    audio_file_path: str,
    reference_text: str,
    language: str = "en-US"
) -> dict:
    """Transcribe with pronunciation assessment."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]

    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"

    # Build pronunciation assessment parameters
    pron_params = {
        "ReferenceText": reference_text,
        "GradingSystem": "HundredMark",
        "Granularity": "Word",
        "Dimension": "Comprehensive",
        "EnableProsodyAssessment": True
    }

    # Base64 encode the JSON
    pron_header = base64.b64encode(
        json.dumps(pron_params).encode("utf-8")
    ).decode("utf-8")

    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
        "Pronunciation-Assessment": pron_header
    }

    params = {"language": language, "format": "detailed"}

    with open(audio_file_path, "rb") as audio_file:
        response = requests.post(url, headers=headers, params=params, data=audio_file, timeout=(10, 90))

    response.raise_for_status()
    return response.json()

# Usage
result = transcribe_with_pronunciation_assessment(
    "greeting.wav",
    "Good morning.",
    "en-US"
)

# Access pronunciation scores
if result.get("RecognitionStatus") == "Success" and result.get("NBest"):
    nbest = result["NBest"][0]
    print(f"Accuracy: {nbest['AccuracyScore']}")
    print(f"Fluency: {nbest['FluencyScore']}")
    print(f"Prosody: {nbest.get('ProsodyScore', 'N/A')}")
    print(f"Completeness: {nbest['CompletenessScore']}")
    print(f"Overall: {nbest['PronScore']}")
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ReferenceText` | **Yes** | Text the pronunciation is evaluated against |
| `GradingSystem` | No | `FivePoint` (0-5) or `HundredMark` (0-100). Default: `FivePoint` |
| `Granularity` | No | `Phoneme`, `Word`, or `FullText`. Default: `Phoneme` |
| `Dimension` | No | `Basic` (accuracy only) or `Comprehensive`. Default: `Basic` |
| `EnableMiscue` | No | Enable omission/insertion detection. Default: `False` |
| `EnableProsodyAssessment` | No | Enable prosody scoring. Default: `False` |
| `ScenarioId` | No | GUID for custom point system |

## Grading Systems

### FivePoint (Default)
- Returns floating-point scores from 0.0 to 5.0

### HundredMark
- Returns floating-point scores from 0.0 to 100.0
- More intuitive for most applications

## Granularity Levels

### Phoneme (Default)
Shows scores at full-text, word, and phoneme levels:
```json
{
  "AccuracyScore": 95.0,
  "Words": [
    {
      "Word": "good",
      "AccuracyScore": 100.0,
      "Phonemes": [
        {"Phoneme": "g", "AccuracyScore": 100.0},
        {"Phoneme": "uh", "AccuracyScore": 95.0},
        {"Phoneme": "d", "AccuracyScore": 100.0}
      ]
    }
  ]
}
```

### Word
Shows scores at full-text and word levels only.

### FullText
Shows score at full-text level only.

## Response with Pronunciation Assessment

```json
{
  "RecognitionStatus": "Success",
  "Offset": 700000,
  "Duration": 8400000,
  "DisplayText": "Good morning.",
  "SNR": 38.76819,
  "NBest": [
    {
      "Confidence": 0.98503506,
      "Lexical": "good morning",
      "Display": "Good morning.",
      "AccuracyScore": 100.0,
      "FluencyScore": 100.0,
      "ProsodyScore": 87.8,
      "CompletenessScore": 100.0,
      "PronScore": 95.1,
      "Words": [
        {
          "Word": "good",
          "Offset": 700000,
          "Duration": 2600000,
          "AccuracyScore": 100.0,
          "ErrorType": "None",
          "Feedback": {
            "Prosody": {
              "Break": {
                "ErrorTypes": ["None"],
                "BreakLength": 0
              },
              "Intonation": {
                "ErrorTypes": [],
                "Monotone": {
                  "Confidence": 0.0
                }
              }
            }
          }
        },
        {
          "Word": "morning",
          "Offset": 3400000,
          "Duration": 5700000,
          "AccuracyScore": 100.0,
          "ErrorType": "None"
        }
      ]
    }
  ]
}
```

## Score Definitions

| Score | Description |
|-------|-------------|
| `AccuracyScore` | How closely phonemes match native speaker pronunciation |
| `FluencyScore` | How well speech matches native speaker's use of silent breaks |
| `ProsodyScore` | Naturalness including stress, intonation, speaking speed, rhythm |
| `CompletenessScore` | Ratio of pronounced words to reference text |
| `PronScore` | Overall pronunciation quality (weighted aggregate) |

## Error Types

When `EnableMiscue` is true, words include `ErrorType`:

| ErrorType | Description |
|-----------|-------------|
| `None` | Word pronounced correctly |
| `Omission` | Word in reference was skipped |
| `Insertion` | Extra word not in reference |
| `Mispronunciation` | Word pronounced incorrectly |

## Complete Example with All Features

```python
import base64
import json
import os
import requests

def full_pronunciation_assessment(
    audio_path: str,
    reference_text: str,
    language: str = "en-US"
) -> None:
    """Full pronunciation assessment with detailed output."""
    region = os.environ["AZURE_SPEECH_REGION"]
    api_key = os.environ["AZURE_SPEECH_KEY"]

    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"

    pron_params = {
        "ReferenceText": reference_text,
        "GradingSystem": "HundredMark",
        "Granularity": "Word",
        "Dimension": "Comprehensive",
        "EnableMiscue": True,
        "EnableProsodyAssessment": True
    }

    pron_header = base64.b64encode(
        json.dumps(pron_params).encode()
    ).decode()

    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
        "Pronunciation-Assessment": pron_header
    }

    with open(audio_path, "rb") as f:
        response = requests.post(
            url,
            headers=headers,
            params={"language": language, "format": "detailed"},
            data=f,
            timeout=(10, 90)
        )

    response.raise_for_status()
    result = response.json()

    if result.get("RecognitionStatus") != "Success" or not result.get("NBest"):
        print(f"Recognition failed: {result['RecognitionStatus']}")
        return

    nbest = result["NBest"][0]

    print(f"\n=== Overall Scores ===")
    print(f"Accuracy:     {nbest['AccuracyScore']:.1f}")
    print(f"Fluency:      {nbest['FluencyScore']:.1f}")
    print(f"Prosody:      {nbest.get('ProsodyScore', 'N/A')}")
    print(f"Completeness: {nbest['CompletenessScore']:.1f}")
    print(f"Overall:      {nbest['PronScore']:.1f}")

    print(f"\n=== Word-Level Analysis ===")
    for word in nbest["Words"]:
        error = word.get("ErrorType", "None")
        accuracy = word.get("AccuracyScore", 0)
        marker = "" if error == "None" else f" [{error}]"
        print(f"  {word['Word']}: {accuracy:.1f}{marker}")

# Usage
full_pronunciation_assessment(
    "user_speech.wav",
    "The quick brown fox jumps over the lazy dog.",
    "en-US"
)
```
