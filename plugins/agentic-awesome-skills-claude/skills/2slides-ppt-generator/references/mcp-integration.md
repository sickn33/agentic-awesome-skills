# MCP Integration Guide

2slides provides an MCP (Model Context Protocol) server for seamless integration with Claude Desktop and other MCP-compatible AI agents.

## What is the MCP Server?

The 2slides MCP server exposes the same API functionality as direct API calls, but through a standardized tool interface that Claude can use directly without requiring script execution.

**Available Tools:**
1. `slides_generate` - Generate slides from content
2. `slides_create_like_this` - Generate slides from reference image
3. `slides_create_pdf_slides` - Generate custom-designed slides (NEW)
4. `slides_generate_narration` - Add AI voice narration (NEW)
5. `slides_download_pages_voices` - Export slides and voices as ZIP (NEW)
6. `themes_search` - Search available themes
7. `jobs_get` - Check job status

**Note:** New tools (3-5) may require MCP server update to latest version.

## Installation & Configuration

2slides MCP server supports two integration modes:

### Mode 1: Streamable HTTP Protocol (Recommended)

Simplest setup using HTTP endpoint. No local installation required.

**Step 1:** Get your API key from https://2slides.com/api

**Step 2:** Configure Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "2slides": {
      "url": "https://2slides.com/api/mcp?apikey=YOUR_2SLIDES_API_KEY"
    }
  }
}
```

**Step 3:** Restart Claude Desktop completely

**Advantages:**
- ✅ No Node.js or npm required
- ✅ Always uses latest version
- ✅ Faster setup
- ✅ No local dependencies

---

### Mode 2: NPM Package (stdio)

Uses local npm package for MCP server.

**Step 1:** Get your API key from https://2slides.com/api

**Step 2:** Configure Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "2slides": {
      "command": "npx",
      "args": ["2slides-mcp"],
      "env": {
        "API_KEY": "YOUR_2SLIDES_API_KEY"
      }
    }
  }
}
```

**Step 3:** Restart Claude Desktop completely

**Requirements:**
- Node.js and npm installed
- Internet connection for first-time package download

---

### Verify Installation

After restart, the 2slides tools should be available. Test by asking:
"Search for business themes using 2slides"

## When to Use MCP vs Direct API

### Use MCP Server When:
- Working in Claude Desktop or other MCP-compatible environments
- Want seamless tool integration without script management
- Prefer Claude to handle API calls directly
- Need real-time interaction and feedback

### Use Direct API Scripts When:
- Working in Claude Code CLI
- MCP server is not configured or available
- Need more control over parameters and error handling
- Integrating into custom workflows or automation
- Need to batch process multiple requests

## MCP Tool Details

### slides_generate

Generate slides from user content.

**Parameters:**
- `userInput` (string, required): Content to convert
- `themeId` (string, required): Theme ID from themes_search
- `responseLanguage` (string, optional, default: "Auto"): Language name
- `mode` (string, optional, default: "sync"): "sync" or "async"

**Example:**
```
First search for a theme:
Use themes_search with:
- query: "business"

Then generate with the theme ID:
Use slides_generate with:
- userInput: "Introduction to Python: Variables, Functions, Classes"
- themeId: "theme_abc123"
- mode: "sync"
```

### slides_create_like_this

Generate slides matching a reference image.

**Parameters:**
- `userInput` (string, required): Content for slides
- `referenceImageUrl` (string, required): URL or base64 of reference image
- `responseLanguage` (string, optional, default: "Auto"): Language name
- `aspectRatio` (string, optional, default: "16:9"): width:height format
- `resolution` (string, optional, default: "2K"): "1K", "2K", or "4K"
- `page` (number, optional, default: 1): Number of slides (0 for auto-detection, max 100)
- `contentDetail` (string, optional, default: "concise"): "concise" or "standard"

**Example:**
```
Use slides_create_like_this with:
- userInput: "Sales Report Q4 2025"
- referenceImageUrl: "https://example.com/template.jpg"
- resolution: "2K"
- page: 0  # Auto-detect slide count
- contentDetail: "standard"
```

### themes_search

Search for available themes.

**Parameters:**
- `query` (string, required): Search keyword
- `limit` (number, optional, default: 20, max: 100): Max results

**Example:**
```
Use themes_search with:
- query: "business"
- limit: 10
```

**Note:** Query parameter is required. Search with keywords like "business", "professional", "creative", "education", "modern" to find appropriate themes.

### slides_create_pdf_slides

Generate custom-designed slides from text without a reference image.

**Parameters:**
- `userInput` (string, required): Content for slides
- `responseLanguage` (string, optional, default: "Auto"): Language name
- `aspectRatio` (string, optional, default: "16:9"): width:height format
- `resolution` (string, optional, default: "2K"): "1K", "2K", or "4K"
- `page` (number, optional, default: 1): Number of slides (0 for auto-detection, max 100)
- `contentDetail` (string, optional, default: "concise"): "concise" or "standard"
- `designSpec` (string, optional): Design specifications

**Example:**
```
Use slides_create_pdf_slides with:
- userInput: "Sales Report Q4 2025"
- designSpec: "modern minimalist, blue color scheme"
- resolution: "2K"
- page: 0  # Auto-detect slide count
```

### slides_generate_narration

Add AI voice narration to completed slides.

**Parameters:**
- `jobId` (string, required): Job ID from slide generation (UUID format)
- `language` (string, optional, default: "Auto"): Language for narration
- `voice` (string, optional, default: "Puck"): Voice name (30 options available)
- `multiSpeaker` (boolean, optional, default: false): Enable multi-speaker mode

**Available Voices:**
Puck, Aoede, Charon, Kore, Fenrir, Phoebe, Asteria, Luna, Stella, Theia, Helios, Atlas, Clio, Melpomene, Calliope, Erato, Euterpe, Polyhymnia, Terpsichore, Thalia, Urania, Zeus, Hera, Poseidon, Athena, Apollo, Artemis, Ares, Aphrodite, Hephaestus

**Example:**
```
Use slides_generate_narration with:
- jobId: "abc-123-def-456"
- voice: "Aoede"
- multiSpeaker: true
- language: "English"
```

**Note:** Job must be completed before adding narration. Cost: 210 credits per page.

### slides_download_pages_voices

Download slides as PNG images and voice files as WAV in a ZIP archive.

**Parameters:**
- `jobId` (string, required): Job ID from slide generation

**Example:**
```
Use slides_download_pages_voices with:
- jobId: "abc-123-def-456"
```

**Note:** Completely FREE (no credits). Download URL valid for 1 hour.

### jobs_get

Check status of async job.

**Parameters:**
- `jobId` (string, required): Job ID from async generation

**Response includes:**
- Slide generation status
- Narration status (if applicable)
- Download URLs (when completed)

**Example:**
```
Use jobs_get with:
- jobId: "abc123..."
```

## Troubleshooting

### Tools Not Appearing

1. Verify configuration file syntax is valid JSON
2. For HTTP mode: Check API key is correctly in the URL
3. For npm mode: Ensure API key is correctly set in the `env` section
4. Restart Claude Desktop completely (quit fully, not just close window)
5. Check for error messages in Claude Desktop console

### API Key Issues

- Verify API key is active at https://2slides.com/api
- Check for typos in the configuration
- Ensure no extra quotes or spaces around the key
- For HTTP mode: API key must be in the URL query parameter

### HTTP Mode Issues

- Verify URL format: `https://2slides.com/api/mcp?apikey=YOUR_KEY`
- Check internet connectivity
- Ensure API key has no special characters that need URL encoding

### NPM Mode Issues

- Ensure `npx` is available (requires Node.js)
- Try running `npx 2slides-mcp` manually to check for errors
- Verify internet connection for package download
- Check Node.js version compatibility

## GitHub Repository

For more information, visit: https://github.com/2slides/mcp-2slides
