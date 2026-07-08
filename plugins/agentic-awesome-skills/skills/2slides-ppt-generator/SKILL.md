---
name: 2slides-ppt-generator
description: "AI-powered presentation generation via the 2slides API — create slides from text, match a reference image style, summarize documents into decks, add AI voice narration, and export pages/audio. Use for any \"make slides\", \"create a deck\", or \"slides from this document\" request."
category: api-integration
risk: safe
source: community
source_repo: 2slides/slides-generation-2slides-skills
source_type: community
date_added: "2026-06-05"
author: 2slides
tags: [presentations, slides, powerpoint, ai, api-integration, pdf, narration, document-summarization]
tools: [claude, cursor, gemini, codex, antigravity]
plugin:
  setup:
    type: manual
    summary: "Install Python requirements and configure a 2slides API key before running generation scripts."
    docs: SKILL.md
---

# 2slides Presentation Generation

## Overview

Generate professional presentations using the 2slides AI API. The skill supports content-based generation (theme-driven Fast PPT), style matching from a reference image, custom PDF design, document summarization, AI voice narration, and exporting pages/audio. It returns both an interactive slide URL and a downloadable PDF.

This skill is adapted from the official 2slides skill repository ([`2slides/slides-generation-2slides-skills`](https://github.com/2slides/slides-generation-2slides-skills)). It calls the hosted 2slides API and requires the user's own API key and credits.

## When to Use This Skill

- Use when the user asks to "create a presentation", "make slides", or "generate a deck" from text or an outline.
- Use when the user wants slides that match the style of a reference image ("create slides like this image").
- Use when the user wants custom-designed PDF slides without a reference image.
- Use when the user uploads a document and asks to "create slides from this document".
- Use when the user wants to add AI voice narration to generated slides, or export slides as PNG images and narration as WAV audio.
- Use when the user asks "what themes are available?" or wants to browse/select a theme.

## Setup Requirements

Users must have a 2slides API key and credits:

1. **Get API Key:** Visit https://2slides.com/api to create an account and API key
   - New users receive **500 free credits** (~50 Fast PPT pages)
2. **Purchase Credits (Optional):** Visit https://2slides.com/pricing to buy additional credits
   - Pay-as-you-go, no subscriptions
   - Credits never expire
   - Up to 20% off on larger packages
3. **Set API Key:** Store the key in environment variable: `SLIDES_2SLIDES_API_KEY`

```bash
read -r -s SLIDES_2SLIDES_API_KEY
export SLIDES_2SLIDES_API_KEY
```

4. **Install Script Dependencies:** From this skill directory, install the pinned local requirements before using the Python scripts:

```bash
python -m pip install -r requirements.txt
```

**Credit Costs:**
- Fast PPT: 10 credits/page
- Nano Banana 1K/2K: 100 credits/page
- Nano Banana 4K: 200 credits/page
- Voice Narration: 210 credits/page
- Download Export: FREE

See [references/pricing.md](references/pricing.md) for detailed pricing information.

## Workflow Decision Tree

Choose the appropriate approach based on the user's request:

```
User Request
│
├─ "Create slides from this content/text"
│  └─> Use Content-Based Generation (Section 1)
│
├─ "Create slides like this image"
│  └─> Use Reference Image Generation (Section 2)
│
├─ "Create custom designed slides" or "Create PDF slides"
│  └─> Use Custom PDF Generation (Section 3)
│
├─ "Create slides from this document"
│  └─> Use Document Summarization (Section 4)
│
├─ "Add voice narration" or "Generate audio for slides"
│  └─> Use Voice Narration (Section 5)
│
├─ "Download slides as images" or "Export slides and voices"
│  └─> Use Download Export (Section 6)
│
└─ "Search for themes" or "What themes are available?"
   └─> Use Theme Search (Section 7)
```

---

## 1. Content-Based Generation

Generate slides from user-provided text content.

### When to Use
- User provides content directly in their message
- User says "create a presentation about X"
- User provides structured outline or bullet points

### Workflow

**Step 1: Prepare Content**

Structure the content clearly for best results:

```
Title: [Main Topic]

Section 1: [Subtopic]
- Key point 1
- Key point 2
- Key point 3

Section 2: [Subtopic]
- Key point 1
- Key point 2
```

**Step 2: Choose Theme (Required)**

Search for an appropriate theme (themeId is required):

```bash
python scripts/search_themes.py --query "business"
python scripts/search_themes.py --query "professional"
python scripts/search_themes.py --query "creative"
```

Pick a theme ID from the results.

**Step 3: Generate Slides**

Use the `generate_slides.py` script with the theme ID:

```bash
# Basic generation (theme ID required)
python scripts/generate_slides.py --content "Your content here" --theme-id "theme123"

# In different language
python scripts/generate_slides.py --content "Your content" --theme-id "theme123" --language "Spanish"

# Async mode for longer presentations
python scripts/generate_slides.py --content "Your content" --theme-id "theme123" --mode async
```

**Step 4: Handle Results**

**Sync mode response:**
```json
{
  "slideUrl": "https://2slides.com/slides/abc123",
  "pdfUrl": "https://2slides.com/slides/abc123/download",
  "status": "completed"
}
```

Provide both URLs to the user:
- `slideUrl`: Interactive online slides
- `pdfUrl`: Downloadable PDF version

**Async mode response:**
```json
{
  "jobId": "job123",
  "status": "pending"
}
```

Poll for results:
```bash
python scripts/get_job_status.py --job-id "job123"
```

---

## 2. Reference Image Generation

Generate slides that match the style of a reference image.

### When to Use
- User provides an image URL and says "create slides like this"
- User wants to match existing brand/design style
- User has a template image they want to emulate

### Workflow

**Step 1: Verify Image URL**

Ensure the reference image is:
- Publicly accessible URL
- Valid image format (PNG, JPG, etc.)
- Represents the desired slide style

**Step 2: Generate Slides**

Use the `generate_slides.py` script with `--reference-image`:

```bash
python scripts/generate_slides.py \
  --content "Your presentation content" \
  --reference-image "https://example.com/template.jpg" \
  --language "Auto"
```

**Optional parameters (all values from [2slides API](https://2slides.com/api.md)):**
```bash
--language LANG                 # Auto, English, Spanish, Arabic, Portuguese, Indonesian,
                                 # Japanese, Russian, Hindi, French, German, Greek, Vietnamese,
                                 # Turkish, Polish, Italian, Korean, Simplified Chinese,
                                 # Traditional Chinese, Thai (default: Auto)
--mode sync|async                # default: sync for theme, async for reference-image
--aspect-ratio RATIO             # 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (default: 16:9)
--resolution 1K|2K|4K            # default: 2K
--page N                         # 0=auto, 1-100 (default: 1)
--content-detail concise|standard # default: concise
```

**Note:** This uses Nano Banana Pro mode with credit costs:
- 1K/2K: 100 credits per page
- 4K: 200 credits per page

**Step 3: Handle Results**

This mode always runs synchronously and returns:
```json
{
  "slideUrl": "https://2slides.com/workspace?jobId=...",
  "pdfUrl": "https://...pdf...",
  "status": "completed",
  "message": "Successfully generated N slides",
  "slidePageCount": N
}
```

Provide both URLs to the user:
- `slideUrl`: View slides in 2slides workspace
- `pdfUrl`: Direct PDF download (expires in 1 hour)

**Processing time:** ~30 seconds per page (30-60 seconds typical for 1-2 pages)

---

## 3. Custom PDF Generation

Generate custom-designed slides from text without needing a reference image.

### When to Use
- User wants custom design without providing a reference image
- User requests "create PDF slides"
- User wants to specify design characteristics
- Alternative to theme-based generation with more design flexibility

### Workflow

**Step 1: Prepare Content**

Structure the content clearly:

```
Title: [Main Topic]

Section 1: [Subtopic]
- Key point 1
- Key point 2

Section 2: [Subtopic]
- Key point 1
- Key point 2
```

**Step 2: Generate Slides**

Use the `create_pdf_slides.py` script:

```bash
# Basic generation
python scripts/create_pdf_slides.py --content "Your content here"

# With design style (API: designStyle)
python scripts/create_pdf_slides.py \
  --content "Sales Report Q4 2025" \
  --design-style "modern minimalist, blue color scheme"

# High resolution with auto page detection
python scripts/create_pdf_slides.py \
  --content "Marketing Plan" \
  --resolution 4K \
  --page 0 \
  --content-detail standard
```

**Optional parameters:**
```bash
--design-style "text"           # Design instructions (API: designStyle)
--language LANG                 # Same as generate_slides (default: Auto)
--aspect-ratio RATIO           # 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (default: 16:9)
--resolution 1K|2K|4K          # default: 2K
--page N                        # 0=auto, 1-100 (default: 1)
--content-detail concise|standard # default: standard
```

**Step 3: Handle Results**

Returns same structure as create-like-this:
```json
{
  "slideUrl": "https://2slides.com/workspace?jobId=...",
  "pdfUrl": "https://...pdf...",
  "status": "completed",
  "message": "Successfully generated N slides",
  "slidePageCount": N
}
```

**Notes:**
- Same credit costs as create-like-this (100 credits/page for 1K/2K, 200 for 4K)
- Processing time: ~30 seconds per page
- Automatically generates PDF
- Uses AI to create custom design based on content and specs

---

## 4. Document Summarization

Generate slides from document content.

### When to Use
- User uploads a document (PDF, DOCX, TXT, etc.)
- User says "create slides from this document"
- User wants to summarize long content into presentation format

### Workflow

**Step 1: Read Document**

Use appropriate tool to read the document content:
- PDF: Use PDF reading tools
- DOCX: Use DOCX reading tools
- TXT/MD: Use Read tool

**Step 2: Extract Key Points**

Analyze the document and extract:
- Main topics and themes
- Key points for each section
- Important data, quotes, or examples
- Logical flow and structure

**Step 3: Structure Content**

Format extracted information into presentation structure:

```
Title: [Document Main Topic]

Introduction
- Context
- Purpose
- Overview

[Section 1 from document]
- Key point 1
- Key point 2
- Supporting detail

[Section 2 from document]
- Key point 1
- Key point 2
- Supporting detail

Conclusion
- Summary
- Key takeaways
- Next steps
```

**Step 4: Generate Slides**

Use content-based generation workflow (Section 1). First search for a theme, then generate:

```bash
# Search for appropriate theme
python scripts/search_themes.py --query "business"

# Generate with theme ID
python scripts/generate_slides.py --content "[Structured content from step 3]" --theme-id "theme123"
```

**Tips:**
- Keep slides concise (3-5 points per slide)
- Focus on key insights, not full text
- Use document headings as slide titles
- Include important statistics or quotes
- Ask user if they want specific sections highlighted

---

## 5. Voice Narration

Add AI-generated voice narration to slides.

### When to Use
- User wants to add audio to slides
- User requests "add voice narration" or "generate audio"
- User wants presentations with spoken content
- User needs multi-speaker narration

### Prerequisites

**IMPORTANT:** The slide generation job must be completed before adding narration.

1. Generate slides first using any method (Section 1, 2, 3, or 4)
2. Get the job ID from the generation result
3. Ensure job status is "completed" before requesting narration

### Workflow

**Step 1: Choose Voice**

30 voices available including:
- Puck (default)
- Aoede
- Charon
- Kore
- Fenrir
- Phoebe
- And 24 more...

List all voices:
```bash
python scripts/generate_narration.py --list-voices
```

**Step 2: Generate Narration**

Use the `generate_narration.py` script with the job ID:

```bash
# Basic narration with default voice
python scripts/generate_narration.py --job-id "abc-123-def-456"

# Single speaker, specific voice
python scripts/generate_narration.py --job-id "abc-123-def-456" --voice Aoede

# Multi-speaker mode
python scripts/generate_narration.py --job-id "abc-123-def-456" --multi-speaker
```

**Parameters (aligned with [2slides API](https://2slides.com/api.md)):**
- `--job-id`: Job ID (required, UUID for Nano Banana)
- `--voice`: Voice name (default: Puck); use `--list-voices` for all 30
- `--language`: Narration language (default: Auto)
- `--multi-speaker`: Enable multi-speaker mode
- `--list-voices`: Print the supported voices without calling the API

**Step 3: Check Status**

Narration generation runs asynchronously:

```bash
python scripts/get_job_status.py --job-id "abc-123-def-456"
```

**Step 4: Handle Results**

Once completed, the job will include narration files. Use download endpoint (Section 6) to get audio files.

**Notes:**
- **Cost:** 210 credits per page (10 for text, 200 for audio)
- Processing time varies by slide count
- 30 voice options available
- Supports 19 languages plus auto-detection
- Multi-speaker mode uses different voices for variety

---

## 6. Download Export

Download slides as PNG images and voice narrations as WAV files.

### When to Use
- User wants to download slides as images
- User needs voice files separately
- User wants transcripts
- User needs slides in image format for other tools

### Workflow

**Step 1: Verify Job Complete**

Ensure slides (and optionally narration) are generated and job is completed.

**Step 2: Download Archive**

Use the `download_slides_pages_voices.py` script:

```bash
# Download with default filename (<job_id>.zip)
python scripts/download_slides_pages_voices.py --job-id "abc-123-def-456"

# Download to specific path
python scripts/download_slides_pages_voices.py \
  --job-id "abc-123-def-456" \
  --output "my-presentation.zip"
```

**Step 3: Extract Contents**

The ZIP archive contains:
- **Pages:** PNG files for each slide
- **Voices:** WAV audio files (if narration was generated)
- **Transcripts:** Text transcripts of narration

**Notes:**
- **Cost:** Completely FREE (no credits used)
- Download URLs valid for **1 hour only**
- Includes all pages and voice files
- High quality PNG export
- WAV format for audio

---

## 7. Theme Search

Find appropriate themes for presentations.

### When to Use
- Before generating slides with specific styling
- User asks "what themes are available?"
- User wants professional or branded appearance

### Workflow

**Search themes:**

```bash
# Search for specific style (query is required)
python scripts/search_themes.py --query "business"
python scripts/search_themes.py --query "creative"
python scripts/search_themes.py --query "education"
python scripts/search_themes.py --query "professional"

# Get more results
python scripts/search_themes.py --query "modern" --limit 50
```

**Theme selection:**

1. Show user available themes with names and descriptions
2. Ask user to choose or let them use default
3. Use the theme ID in generation request

---

## Using the MCP Server

If the 2slides MCP server is configured in Claude Desktop, use the integrated tools instead of scripts.

**Two Configuration Modes:**

1. **Streamable HTTP Protocol (Recommended)**
   - Simplest setup, no local installation
   - Configure: `"url": "https://2slides.com/api/mcp?apikey=YOUR_API_KEY"`

2. **NPM Package (stdio)**
   - Uses local npm package
   - Configure: `"command": "npx", "args": ["2slides-mcp"]`

**Available MCP tools:**
- `slides_generate` - Generate slides from content
- `slides_create_like_this` - Generate from reference image
- `themes_search` - Search themes
- `jobs_get` - Check job status

See [mcp-integration.md](references/mcp-integration.md) for complete setup instructions and detailed tool documentation.

**When to use MCP vs scripts:**
- **Use MCP** in Claude Desktop when configured
- **Use scripts** in Claude Code CLI or when MCP not available

---

## Advanced Features

### Sync vs Async Mode

**Sync Mode (default):**
- Waits for generation to complete (30-60 seconds)
- Returns results immediately
- Best for quick presentations

**Async Mode:**
- Returns job ID immediately
- Poll for results with `get_job_status.py`
- Best for large presentations or batch processing
- **Recommended polling:** Check every 20-30 seconds to avoid server strain

### Rate Limits

Different endpoints have different rate limits:

- **Fast PPT (generate):** 10 requests per minute
- **Nano Banana (create-like-this, create-pdf-slides):** 6 requests per minute

If rate limited, wait before retrying or check plan limits.

### Credit Costs

- **Fast PPT (generate endpoint):** 10 credits per page
- **Nano Banana 1K/2K (create-like-this, create-pdf-slides):** 100 credits per page
- **Nano Banana 4K:** 200 credits per page
- **Voice Narration:** 210 credits per page (10 for text, 200 for audio)
- **Download Export:** FREE (no credits)

### Purchasing Credits

2slides uses a pay-as-you-go credit system with no subscriptions required.

**Credit Packages:** (Current promotion: up to 20% off)
- 2,000 credits: $5.00
- 4,000 credits: $9.50 (5% off)
- 10,000 credits: $22.50 (10% off)
- 20,000 credits: $42.50 (15% off)
- 40,000 credits: $80.00 (20% off)

**New users receive 500 free credits** for onboarding (~50 Fast PPT pages).

**Credits never expire** - use them at your own pace.

**Purchase credits at:** https://2slides.com/pricing

### Download URL Expiration

All download URLs (PDF, ZIP archives) are valid for **1 hour only**. Download files promptly after generation.

### Language Support

Generate slides in multiple languages (use full language name):

```bash
--language "Auto"                # Automatic detection (default)
--language "English"             # English
--language "Simplified Chinese"  # 简体中文
--language "Traditional Chinese" # 繁體中文
--language "Spanish"             # Español
--language "French"              # Français
--language "German"              # Deutsch
--language "Japanese"            # 日本語
--language "Korean"              # 한국어
```

And more: Arabic, Portuguese, Indonesian, Russian, Hindi, Vietnamese, Turkish, Polish, Italian

### Error Handling

**Common error codes:**

1. **Missing API key**
   ```
   Error: API key not found
   Solution: Set SLIDES_2SLIDES_API_KEY environment variable
   ```

2. **RATE_LIMIT_EXCEEDED**
   ```
   Error: 429 Too Many Requests
   Solution: Wait 20-30 seconds before retrying
   Rate limits: Fast PPT (10/min), Nano Banana (6/min)
   ```

3. **INSUFFICIENT_CREDITS**
   ```
   Error: Not enough credits
   Solution: Add credits at https://2slides.com/api
   ```

4. **INVALID_JOB_ID**
   ```
   Error: Job ID not found or invalid
   Solution: Verify job ID format (must be UUID for Nano Banana)
   ```

5. **Invalid content**
   ```
   Error: 400 Bad Request
   Solution: Verify content format and parameters
   ```

---

## Script Parameter Reference (2slides API)

All scripts accept parameters that match [2slides API](https://2slides.com/api.md). Allowed values are defined in `scripts/api_constants.py` and enforced where applicable.

| Script | Key parameters | Allowed values (see script `--help` or api_constants.py) |
|--------|----------------|----------------------------------------------------------|
| `generate_slides.py` | `--language` | Auto, English, Spanish, Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German, Greek, Vietnamese, Turkish, Polish, Italian, Korean, Simplified Chinese, Traditional Chinese, Thai |
| | `--mode` | sync, async |
| | `--aspect-ratio` | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |
| | `--resolution` | 1K, 2K, 4K |
| | `--content-detail` | concise, standard |
| `create_pdf_slides.py` | Same as above + `--design-style` / `--design-spec` (free text) | |
| `generate_narration.py` | `--voice` | 30 voices (Puck, Aoede, Charon, …); use `--list-voices` |
| | `--language` | Auto, English, Spanish, Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German, Vietnamese, Turkish, Polish, Italian, Korean, Simplified Chinese, Traditional Chinese |
| | `--multi-speaker` | enabled when present |
| `search_themes.py` | `--query` (required), `--limit` (1–100) | |
| `get_job_status.py` | `--job-id` (required) | |
| `download_slides_pages_voices.py` | `--job-id` (required), `--output` (path) | |

---

## Additional Documentation

### API Reference
See [api-reference.md](references/api-reference.md) for:
- All endpoints and parameters
- Request/response formats
- Authentication details
- Rate limits and best practices
- Error codes and handling

### Pricing Information
See [pricing.md](references/pricing.md) for:
- Credit packages and pricing
- Cost examples and calculations
- Free trial details
- Refund policy
- Enterprise options

---

## Tips for Best Results

**Content Structure:**
- Use clear headings and subheadings
- Keep bullet points concise
- Limit to 3-5 points per section
- Include relevant examples or data

**Theme Selection:**
- Theme ID is required for standard generation
- Search with keywords matching presentation purpose
- Common searches: "business", "professional", "creative", "education", "modern"
- Each theme has unique styling and layout

**Reference Images:**
- Use high-quality images for best results
- Can use URL or base64 encoded image
- Public URL must be accessible
- Consider resolution setting (1K/2K/4K) based on quality needs
- Use page=0 for automatic slide count detection

**Document Processing:**
- Extract only key information
- Don't try to fit entire document in slides
- Focus on main insights and takeaways
- Ask user which sections to emphasize

---

## Security & Safety Notes

- **Credentials:** This skill reads the API key from the `SLIDES_2SLIDES_API_KEY` environment variable. Never hard-code the key in commands, commit it, or echo it back to the user. The scripts send it as a bearer/`apikey` value to `https://2slides.com` over HTTPS only.
- **Network + paid mutations:** Every generation call makes an outbound network request to the 2slides API and **spends the user's credits** (10–210 credits/page depending on mode). Treat generation, reference-image, custom-PDF, and narration calls as billable actions — confirm intent before generating large or high-resolution (4K) decks, and surface the expected page count/cost when it is non-trivial.
- **No destructive local actions:** The scripts only read content/files the user points to and write generated output (e.g. a downloaded ZIP) to the path the user specifies. They do not modify or delete unrelated files.
- **Input handling:** Reference-image and document inputs are sent to the 2slides service for processing. Do not submit confidential material the user has not authorized for third-party processing.
- **Download URLs expire in 1 hour** — fetch artifacts promptly and do not treat the URLs as durable storage.

## Limitations

- Requires a valid 2slides account, API key, and sufficient credits; this skill does not provision or pay for credits.
- Results are AI-generated drafts intended as a starting point, not a final, fact-checked deliverable — review content before use.
- This skill does not replace environment-specific validation or expert review. Stop and ask for clarification if the API key, required inputs, or intended cost/scope are missing.
- Rate limits apply (Fast PPT 10/min, Nano Banana 6/min); poll async jobs every 20–30s rather than tight-looping.

## Related Skills

- `@youtube-full` — fetch source material (transcripts) that can be summarized into a deck with this skill.
