---
name: seo-image-gen
description: "Generate SEO-focused images such as OG cards, hero images, schema assets, product visuals, and infographics. Use when image generation is part of an SEO workflow or content publishing task."
risk: unknown
source: "https://github.com/AgriciDaniel/claude-seo"
date_added: "2026-03-21"
argument-hint: "[og|hero|product|infographic|custom|batch] <description>"
user-invokable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebFetch
  - Write
---

# SEO Image Gen: AI Image Generation for SEO Assets (Extension)

Generate production-ready images for SEO use cases using Gemini's image generation
via the banana Creative Director pipeline. Maps SEO needs to optimized domain modes,
aspect ratios, and resolution defaults.

## When to Use
- Use when generating OG images, hero images, schema visuals, infographics, or similar SEO assets.
- Use when image generation is part of a broader SEO or publishing workflow.
- Use only when the required image-generation extension is available.

## Architecture Note

This skill has two components with distinct roles:
- **SKILL.md** (this file): Handles interactive `/seo image-gen` commands for generating images
- **Agent** (`agents/seo-image-gen.md`): Audit-only analyst spawned during `/seo audit` to assess existing OG/social images and produce a generation plan (never auto-generates)

## Prerequisites

This skill requires the banana extension to be installed:
```bash
./extensions/banana/install.sh
```

**Check availability:** Before using any image generation tool, verify the MCP server
is connected by checking if `gemini_generate_image` or `set_aspect_ratio` tools are
available. If tools are not available, inform the user the extension is not installed
and provide install instructions.

## Quick Reference

| Command | What it does |
|---------|-------------|
| `/seo image-gen og <description>` | Generate OG/social preview image (1200x630 feel) |
| `/seo image-gen hero <description>` | Blog hero image (widescreen, dramatic) |
| `/seo image-gen product <description>` | Product photography (clean, white BG) |
| `/seo image-gen infographic <description>` | Infographic visual (vertical, data-heavy) |
| `/seo image-gen custom <description>` | Custom image with full Creative Director pipeline |
| `/seo image-gen batch <description> [N]` | Generate N variations (default: 3) |

## SEO Image Use Cases

Each use case maps to pre-configured banana parameters:

| Use Case | Aspect Ratio | Resolution | Domain Mode | Notes |
|----------|-------------|------------|-------------|-------|
| **OG/Social Preview** | `16:9` | `1K` | Product or UI/Web | Clean, professional, text-friendly |
| **Blog Hero** | `16:9` | `2K` | Cinema or Editorial | Dramatic, atmospheric, editorial quality |
| **Schema Image** | `4:3` | `1K` | Product | Clean, descriptive, schema ImageObject |
| **Social Square** | `1:1` | `1K` | UI/Web | Platform-optimized square |
| **Product Photo** | `4:3` | `2K` | Product | White background, studio lighting |
| **Infographic** | `2:3` | `4K` | Infographic | Data-heavy, vertical layout |
| **Favicon/Icon** | `1:1` | `512` | Logo | Minimal, scalable, recognizable |
| **Pinterest Pin** | `2:3` | `2K` | Editorial | Tall vertical card |

## Generation Pipeline

For every generation request:

1. **Identify use case** from command or context (og, hero, product, etc.)
2. **Apply SEO defaults** from the use cases table above
3. **Set aspect ratio** via `set_aspect_ratio` MCP tool
4. **Construct Reasoning Brief** using the banana Creative Director pipeline:
   - Load `references/prompt-engineering.md` for the 6-component system
   - Apply domain mode emphasis (Subject 30%, Style 25%, Context 15%, etc.)
   - Be SPECIFIC and VISCERAL: describe what the camera sees
5. **Generate** via `gemini_generate_image` MCP tool
6. **Post-generation SEO checklist** (see below)

### Check for Presets

If the user mentions a brand or has SEO presets configured:
```bash
python3 ~/.claude/skills/seo-image-gen/scripts/presets.py list
```
Load matching preset and apply as defaults. Also check `references/seo-image-presets.md`
for SEO-specific preset templates.

## Post-Generation SEO Checklist

After every successful generation, guide the user on:

1. **Alt text**:Write descriptive, keyword-rich alt text for the generated image
2. **File naming**:Rename to SEO-friendly format: `keyword-description-widthxheight.webp`
3. **WebP conversion**:Convert to WebP for optimal page speed:
   ```bash
   magick output.png -quality 85 output.webp
   ```
4. **File size**:Target under 200KB for hero images, under 100KB for thumbnails
5. **Schema markup**:Suggest `ImageObject` schema for the generated image:
   ```json
   {
     "@type": "ImageObject",
     "url": "https://example.com/images/keyword-description.webp",
     "width": 1200,
     "height": 630,
     "caption": "Descriptive caption with target keyword"
   }
   ```
6. **OG meta tags**:For social preview images, remind about:
   ```html
   <meta property="og:image" content="https://example.com/images/og-image.webp" />
   <meta property="og:image:width" content="1200" />
   <meta property="og:image:height" content="630" />
   <meta property="og:image:alt" content="Descriptive alt text" />
   ```

## Cost Awareness

Image generation costs money. Be transparent:
- Show estimated cost before generating (especially for batch)
- Log every generation: `python3 ~/.claude/skills/seo-image-gen/scripts/cost_tracker.py log --model MODEL --resolution RES --prompt "brief"`
- Run `cost_tracker.py summary` if user asks about usage

Approximate costs (gemini-3.1-flash):
- 512: ~$0.02/image
- 1K resolution: ~$0.04/image
- 2K resolution: ~$0.08/image
- 4K resolution: ~$0.16/image

## Model Routing

| Scenario | Model | Why |
|----------|-------|-----|
| OG images, social previews | `gemini-3.1-flash-image-preview` @ 1K | Fast, cost-effective |
| Hero images, product photos | `gemini-3.1-flash-image-preview` @ 2K | Quality + detail |
| Infographics with text | `gemini-3.1-flash-image-preview` @ 2K, thinking: high | Better text rendering |
| Quick drafts | `gemini-2.5-flash-image` @ 512 | Rapid iteration |

## Error Handling

| Error | Resolution |
|-------|-----------|
| MCP not configured | Run `./extensions/banana/install.sh` |
| API key invalid | New key at https://aistudio.google.com/apikey |
| Rate limited (429) | Wait 60s, retry. Free tier: ~10 RPM / ~500 RPD |
| `IMAGE_SAFETY` | Rephrase prompt - see `references/prompt-engineering.md` Safety section |
| MCP unavailable | Fall back: `python3 ~/.claude/skills/seo-image-gen/scripts/generate.py --prompt "..." --aspect-ratio "16:9"` |
| Extension not installed | Show install instructions: `./extensions/banana/install.sh` |

## Cross-Skill Integration

- **seo-images** (analysis) feeds into **seo-image-gen** (generation): audit results from `/seo images` identify missing or low-quality images; use those findings to drive `/seo image-gen` commands
- **seo-audit** spawns the seo-image-gen **agent** (not this skill) to analyze OG/social images across the site and produce a prioritized generation plan
- **seo-schema** can consume generated images: after generation, suggest `ImageObject` schema markup pointing to the new assets

## Reference Documentation

Load on-demand. Do NOT load all at startup:
- `references/prompt-engineering.md`:6-component system, domain modes, templates
- `references/gemini-models.md`:Model specs, rate limits, capabilities
- `references/mcp-tools.md`:MCP tool parameters and responses
- `references/post-processing.md`:ImageMagick/FFmpeg pipeline recipes
- `references/cost-tracking.md`:Pricing, usage tracking
- `references/presets.md`:Brand preset management
- `references/seo-image-presets.md`:SEO-specific preset templates

## Response Format

After generating, always provide:
1. **Image path**:where it was saved
2. **Crafted prompt**:show what was sent to the API (educational)
3. **Settings**:model, aspect ratio, resolution
4. **SEO checklist**:alt text suggestion, file naming, WebP conversion
5. **Schema snippet**:ImageObject or og:image markup if applicable

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
