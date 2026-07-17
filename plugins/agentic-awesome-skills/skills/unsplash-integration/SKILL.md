---
name: unsplash-integration
description: Integration skill for searching and fetching high-quality, free-to-use professional photography from Unsplash.
risk: safe
source: community
date_added: "2026-03-07"
---

# Unsplash Integration Skill

[Unsplash](https://unsplash.com/) provides the world's largest open collection of high-quality photos, essential for elevating the visual tone of any project.

## Context

Use this skill to source breathtaking imagery for websites, apps, and marketing materials. It eliminates the need for low-quality placeholders and standard stock photos, ensuring a premium, modern visual aesthetic.

## When to Use
Trigger this skill when:

- Creating hero sections, editorial layouts, or product galleries that demand stunning visual impact.
- Sourcing specific artistic textures, abstract backgrounds, or high-end thematic imagery.
- Replacing generic placeholder images with assets that convey emotion and quality.

## Execution Workflow

1. **Search Intentionally**: Define highly descriptive, artistic keywords (e.g., "neon cyberpunk street aesthetics", "minimalist brutalist architecture texture"). Avoid generic searches like "meeting room" or "happy people".
2. **Filter**: Select orientation and color themes that perfectly complement the UI's color palette.
3. **Retrieve via API**: With user-approved network access and credentials, use the image URLs returned in `photo.urls`; do not proxy or replace them with arbitrary direct URLs.
4. **Comply and Size**: Preserve required photographer/Unsplash attribution. When selection constitutes a download, call the returned `photo.links.download_location`; then use supported sizing parameters on the returned hotlinked URL.
5. **Verify**: Check current API terms, rate limits, license/attribution, alt text, crop behavior, and production-status requirements before release.

## Strict Rules

- **Project Fit First**: Use Unsplash only when external imagery is appropriate and approved; respect an existing asset library or art direction.
- **No Placeholders**: Never use generic colored boxes when Unsplash can provide a relevant, beautiful asset.
- **Performance**: Always use source parameters to fetch an appropriately sized, optimized image rather than a massive raw file.
- **No Silent Writes**: Do not download assets, add credentials, or modify project files without approval.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
