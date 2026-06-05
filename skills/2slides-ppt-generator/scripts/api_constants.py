#!/usr/bin/env python3
"""
2slides API allowed parameter values. Aligned with https://2slides.com/api.md
"""

API_BASE_URL = "https://2slides.com/api/v1"

# responseLanguage (all endpoints that accept it)
RESPONSE_LANGUAGES = [
    "Auto",
    "English",
    "Spanish",
    "Arabic",
    "Portuguese",
    "Indonesian",
    "Japanese",
    "Russian",
    "Hindi",
    "French",
    "German",
    "Greek",
    "Vietnamese",
    "Turkish",
    "Polish",
    "Italian",
    "Korean",
    "Simplified Chinese",
    "Traditional Chinese",
    "Thai",
]

# aspectRatio (create-like-this, create-pdf-slides)
ASPECT_RATIOS = [
    "1:1",
    "2:3",
    "3:2",
    "3:4",
    "4:3",
    "4:5",
    "5:4",
    "9:16",
    "16:9",
    "21:9",
]

# resolution (create-like-this, create-pdf-slides)
RESOLUTIONS = ["1K", "2K", "4K"]

# contentDetail / contentMode
CONTENT_DETAILS = ["concise", "standard"]

# mode (generate, create-like-this, create-pdf-slides)
MODES = ["sync", "async"]

# generate-narration: Supported Voices (30 total, from API doc)
NARRATION_VOICES = [
    "Puck",
    "Aoede",
    "Charon",
    "Kore",
    "Fenrir",
    "Zephyr",
    "Leda",
    "Orus",
    "Callirrhoe",
    "Autonoe",
    "Enceladus",
    "Iapetus",
    "Umbriel",
    "Algieba",
    "Despina",
    "Erinome",
    "Algenib",
    "Rasalgethi",
    "Laomedeia",
    "Achernar",
    "Alnilam",
    "Schedar",
    "Gacrux",
    "Pulcherrima",
    "Achird",
    "Zubenelgenubi",
    "Vindemiatrix",
    "Sadachbia",
    "Sadaltager",
    "Sulafat",
]
