---
name: imagen
description: "AI image generation skill powered by Google Gemini, enabling seamless visual content creation for UI placeholders, documentation, and design assets."
risk: critical
source: "https://github.com/sanjay3290/ai-skills/tree/main/skills/imagen"
date_added: "2026-02-27"
license: Apache-2.0
license_source: "https://github.com/sanjay3290/ai-skills/blob/281d88df199357e3091a3be5c743a0fca9a9ae1b/LICENSE"
---

# Imagen - AI Image Generation Skill

## Overview

This skill bundles a reviewed standard-library helper for an explicitly selected supported Gemini image model; model availability and pricing must be checked before an authorized call. It enables seamless image creation during any Claude Code session - whether you're building frontend UIs, creating documentation, or need visual representations of concepts.

**Cross-Platform**: Works on Windows, macOS, and Linux.

## When to Use This Skill

Use within the actual host's image-tool workflow and authorized provider scope when:
- User requests image generation (e.g., "generate an image of...", "create a picture...")
- Frontend development requires placeholder or actual images
- Documentation needs illustrations or diagrams
- Visualizing concepts, architectures, or ideas
- Creating icons, logos, or UI assets
- Any task where an AI-generated image would be helpful

## How It Works

1. Takes a text prompt describing the desired image
2. Calls Google Gemini API with image generation configuration
3. Saves the generated image to a specified location (defaults to current directory)
4. Returns the file path for use in your project

## Usage

### Python (Cross-Platform - Recommended)

```bash
# Basic usage
python scripts/generate_image.py --model "$GEMINI_MODEL" "A futuristic city skyline at sunset" "./generated-image.png"

# With custom output path
python scripts/generate_image.py "A minimalist app icon for a music player" "./assets/icons/music-icon.png"

# With custom size
python scripts/generate_image.py --size 2K "High resolution landscape" "./wallpaper.png"
```

## Requirements

- `GEMINI_API_KEY` environment variable must be set
- Python 3.10+ (standard library helper, no pip install needed)
- Explicit reviewed `GEMINI_MODEL` or `--model`; verify supported size/API schema
- Existing authorized private output directory and a new `.png` filename

## Data, cost and output checks

Prompts are transmitted to Google and may incur provider charges; approve the service/data and cost scope first. Do not auto-install credentials, retry an uncertain billable call or overwrite files. The bundled helper refuses redirects, bounds response bytes and validates PNG MIME/signature; it is not a full image decoder or proof of visual correctness. The socket timeout is not a guaranteed total wall-clock budget. Review dimensions, content and rights after delivery, and publish only when authorized. Use the host's purpose-built image tool where its contract requires it.

[Current Gemini image API](https://ai.google.dev/gemini-api/docs/image-generation); [upstream provenance](UPSTREAM-NOTICE.md).

## Output

Generated images are saved as PNG files. The script returns:
- Success: Path to the generated image
- Failure: Error message with details

## Examples

### Frontend Development
```
User: "I need a hero image for my landing page - something abstract and tech-focused"
-> Generates and saves image, provides path for use in HTML/CSS
```

### Documentation
```
User: "Create a diagram showing microservices architecture"
-> Generates visual representation, ready for README or docs
```

### UI Assets
```
User: "Generate a placeholder avatar image for the user profile component"
-> Creates image in appropriate size for component use
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## API compatibility caveat

This helper implements the generateContent envelope; the current linked image guide demonstrates the Interactions API, whose endpoint, request fields and response shape differ. Do not pass a model advertised only for Interactions to this helper or assume its imageSize options are supported. Verify the selected model explicitly supports the helper's generateContent schema before any billable request; otherwise use a reviewed provider adapter or the host image tool. No API call or platform compatibility test was performed here. Prompt command-line arguments can appear in process listings/history, so use only non-sensitive prompts with this interface. Partial output may remain after a disk-write error; inspect it privately and choose a new path rather than automatically retrying the provider.
