---
name: azure-ai-translation-text-py
description: Azure AI Text Translation SDK for real-time text translation, transliteration, language detection, and dictionary lookup. Use for translating text content in applications.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure AI Text Translation SDK for Python

Client library for Azure AI Translator text translation service for real-time text translation, transliteration, and language operations.

## Installation

```bash
pip install azure-ai-translation-text
```

## Environment Variables

```bash
AZURE_TRANSLATOR_KEY=<your-api-key>
AZURE_TRANSLATOR_REGION=<your-region>  # e.g., eastus, westus2
# Or use custom endpoint
AZURE_TRANSLATOR_ENDPOINT=https://<resource>.cognitiveservices.azure.com
```

## Authentication

### API Key with Region

```python
import os
from azure.ai.translation.text import TextTranslationClient
from azure.core.credentials import AzureKeyCredential

key = os.environ["AZURE_TRANSLATOR_KEY"]
region = os.environ["AZURE_TRANSLATOR_REGION"]

# Create credential with region
credential = AzureKeyCredential(key)
client = TextTranslationClient(credential=credential, region=region)
```

### API Key with Custom Endpoint

```python
endpoint = os.environ["AZURE_TRANSLATOR_ENDPOINT"]

client = TextTranslationClient(
    credential=AzureKeyCredential(key),
    endpoint=endpoint
)
```

### Entra ID (Recommended)

```python
from azure.ai.translation.text import TextTranslationClient
from azure.identity import DefaultAzureCredential

client = TextTranslationClient(
    credential=DefaultAzureCredential(),
    endpoint=os.environ["AZURE_TRANSLATOR_ENDPOINT"]
)
```

## Basic Translation

```python
# Translate to a single language
result = client.translate(
    body=["Hello, how are you?", "Welcome to Azure!"],
    to=["es"]  # Spanish
)

for item in result:
    for translation in item.translations:
        print(f"Translated: {translation.text}")
        print(f"Target language: {translation.to}")
```

## Translate to Multiple Languages

```python
result = client.translate(
    body=["Hello, world!"],
    to=["es", "fr", "de", "ja"]  # Spanish, French, German, Japanese
)

for item in result:
    print(f"Source: {item.detected_language.language if item.detected_language else 'unknown'}")
    for translation in item.translations:
        print(f"  {translation.to}: {translation.text}")
```

## Specify Source Language

```python
result = client.translate(
    body=["Bonjour le monde"],
    from_parameter="fr",  # Source is French
    to=["en", "es"]
)
```

## Language Detection

```python
result = client.translate(
    body=["Hola, como estas?"],
    to=["en"]
)

for item in result:
    if item.detected_language:
        print(f"Detected language: {item.detected_language.language}")
        print(f"Confidence: {item.detected_language.score:.2f}")
```

## Transliteration

Convert text from one script to another:

```python
result = client.transliterate(
    body=["konnichiwa"],
    language="ja",
    from_script="Latn",  # From Latin script
    to_script="Jpan"      # To Japanese script
)

for item in result:
    print(f"Transliterated: {item.text}")
    print(f"Script: {item.script}")
```

## Dictionary Lookup

Find alternate translations and definitions:

```python
result = client.lookup_dictionary_entries(
    body=["fly"],
    from_parameter="en",
    to="es"
)

for item in result:
    print(f"Source: {item.normalized_source} ({item.display_source})")
    for translation in item.translations:
        print(f"  Translation: {translation.normalized_target}")
        print(f"  Part of speech: {translation.pos_tag}")
        print(f"  Confidence: {translation.confidence:.2f}")
```

## Dictionary Examples

Get usage examples for translations:

```python
from azure.ai.translation.text.models import DictionaryExampleTextItem

result = client.lookup_dictionary_examples(
    body=[DictionaryExampleTextItem(text="fly", translation="volar")],
    from_parameter="en",
    to="es"
)

for item in result:
    for example in item.examples:
        print(f"Source: {example.source_prefix}{example.source_term}{example.source_suffix}")
        print(f"Target: {example.target_prefix}{example.target_term}{example.target_suffix}")
```

## Get Supported Languages

```python
# Get all supported languages
languages = client.get_supported_languages()

# Translation languages
print("Translation languages:")
for code, lang in languages.translation.items():
    print(f"  {code}: {lang.name} ({lang.native_name})")

# Transliteration languages
print("\nTransliteration languages:")
for code, lang in languages.transliteration.items():
    print(f"  {code}: {lang.name}")
    for script in lang.scripts:
        print(f"    {script.code} -> {[t.code for t in script.to_scripts]}")

# Dictionary languages
print("\nDictionary languages:")
for code, lang in languages.dictionary.items():
    print(f"  {code}: {lang.name}")
```

## Break Sentence

Identify sentence boundaries:

```python
result = client.find_sentence_boundaries(
    body=["Hello! How are you? I hope you are well."],
    language="en"
)

for item in result:
    print(f"Sentence lengths: {item.sent_len}")
```

## Translation Options

```python
result = client.translate(
    body=["Hello, world!"],
    to=["de"],
    text_type="html",           # "plain" or "html"
    profanity_action="Marked",  # "NoAction", "Deleted", "Marked"
    profanity_marker="Asterisk", # "Asterisk", "Tag"
    include_alignment=True,      # Include word alignment
    include_sentence_length=True # Include sentence boundaries
)

for item in result:
    translation = item.translations[0]
    print(f"Translated: {translation.text}")
    if translation.alignment:
        print(f"Alignment: {translation.alignment.proj}")
    if translation.sent_len:
        print(f"Sentence lengths: {translation.sent_len.src_sent_len}")
```

## Async Client

```python
from azure.ai.translation.text.aio import TextTranslationClient
from azure.core.credentials import AzureKeyCredential

async def translate_text():
    async with TextTranslationClient(
        credential=AzureKeyCredential(key),
        region=region
    ) as client:
        result = await client.translate(
            body=["Hello, world!"],
            to=["es"]
        )
        print(result[0].translations[0].text)
```

## Client Methods

| Method | Description |
|--------|-------------|
| `translate` | Translate text to one or more languages |
| `transliterate` | Convert text between scripts |
| `detect` | Detect language of text |
| `find_sentence_boundaries` | Identify sentence boundaries |
| `lookup_dictionary_entries` | Dictionary lookup for translations |
| `lookup_dictionary_examples` | Get usage examples |
| `get_supported_languages` | List supported languages |

## Best Practices

1. **Batch translations** — Send multiple texts in one request (up to 100)
2. **Specify source language** when known to improve accuracy
3. **Use async client** for high-throughput scenarios
4. **Cache language list** — Supported languages don't change frequently
5. **Handle profanity** appropriately for your application
6. **Use html text_type** when translating HTML content
7. **Include alignment** for applications needing word mapping

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
