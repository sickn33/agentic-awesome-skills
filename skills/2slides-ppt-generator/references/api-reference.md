# 2slides API Reference

Complete API documentation for 2slides slide generation service.

## Base URL

```
https://2slides.com/api/v1
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Get your API key from: https://2slides.com/api

Store the API key in environment variable: `SLIDES_2SLIDES_API_KEY`

## Endpoints

### 1. Generate Slides

Generate slides from user input with optional theme selection.

**Endpoint:** `POST /slides/generate`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "userInput": "string (required) - Content to convert into slides",
  "themeId": "string (required) - Theme ID from themes/search",
  "responseLanguage": "string (optional, default: 'Auto') - Language code",
  "mode": "string (optional, default: 'sync') - 'sync' or 'async'"
}
```

**Supported Languages:**
Auto, English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文), Spanish, Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German, Vietnamese, Turkish, Polish, Italian, Korean

**Response (sync mode):**
```json
{
  "slideUrl": "https://2slides.com/slides/...",
  "pdfUrl": "https://2slides.com/slides/.../download",
  "status": "completed"
}
```

**Response (async mode):**
```json
{
  "jobId": "abc123...",
  "status": "pending"
}
```

**Notes:**
- **Sync mode**: Waits for generation to complete and returns the result directly (may take 30-60 seconds)
- **Async mode**: Returns immediately with a jobId to poll for results using `/jobs/{jobId}`

---

### 2. Create Like This (Reference Image)

Generate slides matching a reference image style (Nano Banana Pro mode).

**Endpoint:** `POST /slides/create-like-this`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "userInput": "string (required) - Content for slides",
  "referenceImageUrl": "string (required) - URL or base64 of reference image",
  "responseLanguage": "string (optional, default: 'Auto')",
  "aspectRatio": "string (optional, default: '16:9') - width:height format",
  "resolution": "string (optional, default: '2K') - '1K', '2K', or '4K'",
  "page": "number (optional, default: 1) - 0 for auto-detection, max 100",
  "contentDetail": "string (optional, default: 'concise') - 'concise' or 'standard'"
}
```

**Resolution Options:**
- **1K**: Standard quality
- **2K**: High quality (default)
- **4K**: Ultra high quality

**Content Detail Options:**
- **concise**: Brief, keyword-focused content
- **standard**: Comprehensive, detailed content

**Page Parameter:**
- Set to `0` to enable automatic slide count detection
- Set to specific number (1-100) for exact slide count

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "608f8997-5207-480c-9ff2-d2475cba6b9d",
    "status": "success",
    "message": "Successfully generated N slides",
    "downloadUrl": "https://...pdf...",
    "jobUrl": "https://2slides.com/workspace?jobId=...",
    "createdAt": 1770108913384,
    "updatedAt": 1770108934015,
    "slidePageCount": 3,
    "successCount": 3,
    "failedCount": 0
  }
}
```

**Response Fields:**
- `success`: Boolean indicating if request succeeded
- `data.jobId`: Unique job identifier
- `data.status`: Generation status ("success" or "failed")
- `data.message`: Human-readable status message
- `data.downloadUrl`: Direct PDF download URL (temporary, expires in 1 hour)
- `data.jobUrl`: View slides in 2slides workspace
- `data.slidePageCount`: Number of slides generated
- `data.successCount`: Number of successfully generated slides
- `data.failedCount`: Number of failed slides

**Notes:**
- This endpoint always runs synchronously
- Processing time: ~30 seconds per page
- Typical response time: 30-60 seconds for 1-2 pages
- Automatically generates PDF
- Matches the style and design of the reference image
- **Timeout recommendation**: Set timeout to `max(120, pages * 40)` seconds

---

### 3. Create PDF Slides

Generate custom-designed slides from text with optional design specifications.

**Endpoint:** `POST /slides/create-pdf-slides`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "userInput": "string (required) - Content for slides",
  "responseLanguage": "string (optional, default: 'Auto')",
  "aspectRatio": "string (optional, default: '16:9') - width:height format",
  "resolution": "string (optional, default: '2K') - '1K', '2K', or '4K'",
  "page": "number (optional, default: 1) - 0 for auto-detection, max 100",
  "contentDetail": "string (optional, default: 'concise') - 'concise' or 'standard'",
  "designSpec": "string (optional) - Design specifications (e.g., 'modern minimalist')"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "608f8997-5207-480c-9ff2-d2475cba6b9d",
    "status": "success",
    "message": "Successfully generated N slides",
    "downloadUrl": "https://...pdf...",
    "jobUrl": "https://2slides.com/workspace?jobId=...",
    "slidePageCount": 3,
    "successCount": 3,
    "failedCount": 0
  }
}
```

**Notes:**
- Similar to create-like-this but without reference image
- Uses AI to generate custom design based on content and design specs
- Same credit costs: 100 credits/page (1K/2K), 200 credits/page (4K)
- Processing time: ~30 seconds per page
- Always runs synchronously

---

### 4. Generate Narration

Add AI voice narration to slides in single or multi-speaker mode.

**Endpoint:** `POST /slides/generate-narration`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobId": "string (required) - Job ID from slide generation (UUID format)",
  "language": "string (optional, default: 'Auto') - Language for narration",
  "voice": "string (optional, default: 'Puck') - Voice name from available voices",
  "multiSpeaker": "boolean (optional, default: false) - Enable multi-speaker mode"
}
```

**Available Voices (30 total):**
Puck, Aoede, Charon, Kore, Fenrir, Phoebe, Asteria, Luna, Stella, Theia, Helios, Atlas, Clio, Melpomene, Calliope, Erato, Euterpe, Polyhymnia, Terpsichore, Thalia, Urania, Zeus, Hera, Poseidon, Athena, Apollo, Artemis, Ares, Aphrodite, Hephaestus

**Response:**
```json
{
  "success": true,
  "jobId": "abc123...",
  "status": "pending",
  "message": "Narration generation started"
}
```

**Notes:**
- Job must be completed before adding narration
- Job ID must be UUID format for Nano Banana jobs
- Cost: 210 credits per page (10 for text, 200 for audio)
- Runs asynchronously - poll with /jobs/{jobId}
- Multi-speaker mode uses different voices for variety
- 19 languages supported plus auto-detection

---

### 5. Download Slides Pages and Voices

Export slides as PNG files and voice narrations as WAV files in a ZIP archive.

**Endpoint:** `POST /slides/download-slides-pages-voices`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobId": "string (required) - Job ID from slide generation"
}
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://...zip...",
  "message": "Download ready"
}
```

**Archive Contents:**
- Pages: PNG files for each slide
- Voices: WAV audio files (if narration generated)
- Transcripts: Text files with narration transcripts

**Notes:**
- **Cost: Completely FREE** (no credits used)
- Download URL valid for **1 hour only**
- High quality PNG export
- WAV format for audio
- Includes all slides and voice files

---

### 6. Search Themes

Search for available presentation themes.

**Endpoint:** `GET /themes/search`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
```
query: string (required) - Search keyword
limit: number (optional, default: 20, max: 100)
```

**Response:**
```json
{
  "themes": [
    {
      "id": "theme_id_123",
      "name": "Professional Blue",
      "description": "Clean professional theme with blue accents",
      "previewUrl": "https://..."
    }
  ],
  "count": 1
}
```

---

### 7. Get Job Status

Retrieve the status and results of an async generation job.

**Endpoint:** `GET /jobs/{jobId}`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Path Parameters:**
```
jobId: string (required) - Job ID from async generation
```

**Response:**
```json
{
  "jobId": "abc123",
  "status": "completed|pending|failed",
  "slideUrl": "https://2slides.com/slides/...",
  "pdfUrl": "https://2slides.com/slides/.../download",
  "narrationStatus": "completed|pending|not_started",
  "error": "error message if failed"
}
```

**Status Values:**
- `pending`: Job is still processing
- `completed`: Slides are ready
- `failed`: Generation failed (see error field)

**Narration Status Values:**
- `not_started`: No narration requested
- `pending`: Narration is being generated
- `completed`: Narration is ready

**Polling Recommendation:**
Poll every 20-30 seconds to avoid server strain

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `INSUFFICIENT_CREDITS`: Account has insufficient credits
- `INVALID_JOB_ID`: Job ID not found or invalid format
- `RATE_LIMIT_EXCEEDED`: Too many requests (see rate limits below)
- `JOB_NOT_COMPLETED`: Job must complete before adding narration
- `INVALID_UUID`: Job ID must be UUID format (for Nano Banana jobs)

---

## Credit Costs

- **Fast PPT (generate endpoint)**: 10 credits per page
- **Nano Banana 1K/2K (create-like-this, create-pdf-slides)**: 100 credits per page
- **Nano Banana 4K**: 200 credits per page
- **Voice Narration**: 210 credits per page (10 for text, 200 for audio)
- **Download Export**: FREE (no credits)

## Purchasing Credits

2slides operates on a **pay-as-you-go credit system** with no subscriptions.

**Credit Packages** (Current promotion: up to 20% off):

| Credits | Price | Cost per 1,000 | Savings |
|---------|-------|---------------|---------|
| 2,000 | $5.00 | $2.50 | — |
| 4,000 | $9.50 | $2.38 | 5% |
| 10,000 | $22.50 | $2.25 | 10% |
| 20,000 | $42.50 | $2.13 | 15% |
| 40,000 | $80.00 | $2.00 | 20% |

**Key Benefits:**
- New users get **500 free credits** (~50 Fast PPT pages)
- **Credits never expire**
- No monthly subscriptions
- 3-day refund window
- Purchase at: https://2slides.com/pricing

**Example Costs:**
- 10-slide Fast PPT presentation: 100 credits ($0.25 with largest package)
- 10-slide Nano Banana 2K presentation: 1,000 credits ($2.00 with largest package)
- 10-slide presentation with narration: 2,100 credits ($4.20 with largest package)

## Rate Limits

Different endpoints have different rate limits:

- **Fast PPT (generate)**: 10 requests per minute
- **Nano Banana (create-like-this, create-pdf-slides)**: 6 requests per minute

**Best Practices:**
- Poll async jobs every 20-30 seconds to avoid server strain
- If rate limited (429 error), wait before retrying
- Check your plan's rate limits at https://2slides.com/api

## Download URL Expiration

All download URLs (PDF, ZIP archives) remain valid for **1 hour only**. Download files promptly after generation.

---

## Best Practices

### Content Formatting

**For best results, structure content clearly:**

```
Title: Introduction to AI

Section 1: Machine Learning
- Definition
- Key concepts
- Applications

Section 2: Deep Learning
- Neural networks
- Training process
- Use cases
```

### Choosing Sync vs Async Mode

- **Use sync** for quick generations (<5 slides)
- **Use async** for larger presentations (>5 slides)
- **Use async** when integrating into workflows that can poll

### Theme Selection

1. Search themes with relevant keywords
2. Preview themes if URLs available
3. Use theme ID in generation request
4. Leave theme blank for default styling

### Language Support

Specify `responseLanguage` to generate slides in different languages:
- `"Auto"` - Automatic language detection (default)
- `"English"` - English
- `"Simplified Chinese"` - 简体中文
- `"Traditional Chinese"` - 繁體中文
- `"Spanish"` - Español
- `"Arabic"` - العربية
- `"Portuguese"` - Português
- `"Indonesian"` - Bahasa Indonesia
- `"Japanese"` - 日本語
- `"Russian"` - Русский
- `"Hindi"` - हिन्दी
- `"French"` - Français
- `"German"` - Deutsch
- `"Vietnamese"` - Tiếng Việt
- `"Turkish"` - Türkçe
- `"Polish"` - Polski
- `"Italian"` - Italiano
- `"Korean"` - 한국어
