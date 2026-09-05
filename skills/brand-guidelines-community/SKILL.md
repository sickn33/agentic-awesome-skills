---
name: brand-guidelines-community
description: "To access Anthropic's official brand identity and style resources, use this skill."
risk: none
source: community
date_added: "2026-02-27"
---

## Compatibility and maintenance

Compatibility alias of `brand-guidelines-anthropic`; use that ID for new references when no existing contract requires this one. The full instructions and support files remain local so existing installations
continue to work offline. This is one shared procedure, not an additional capability.
Preserve the callable ID when an existing manifest or client configuration uses it.
Modified in AAS on 2026-09-05; original metadata and license notices are retained.

# Anthropic Brand Styling

## Overview

Use this bundled Anthropic-specific styling reference only when the user requests that brand. It is a local snapshot, not a live authoritative brand-asset service.

**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, Anthropic brand, visual formatting, visual design

## Brand Guidelines

### Colors

**Main Colors:**

- Dark: `#141413` - Primary text and dark backgrounds
- Light: `#faf9f5` - Light backgrounds and text on dark
- Mid Gray: `#b0aea5` - Secondary elements
- Light Gray: `#e8e6dc` - Subtle backgrounds

**Accent Colors:**

- Orange: `#d97757` - Primary accent
- Blue: `#6a9bcc` - Secondary accent
- Green: `#788c5d` - Tertiary accent

### Typography

- **Headings**: Poppins (with Arial fallback)
- **Body Text**: Lora (with Georgia fallback)
- **Note**: Fonts should be pre-installed in your environment for best results

## Features

### Smart Font Application

- Use Poppins font to headings (24pt and larger)
- Use Lora font to body text
- Choose a fallback to Arial/Georgia if custom fonts unavailable
- Verify readability in the actual exported format

### Text Styling

- Headings (24pt+): Poppins font
- Body text: Lora font
- Smart color selection based on background
- Preserves text hierarchy and formatting

### Shape and Accent Colors

- Non-text shapes use accent colors
- Cycles through orange, blue, and green accents
- Maintains visual interest while staying on-brand

## Technical Details

### Font Management

- Uses system-installed Poppins and Lora fonts when available
- Use a documented fallback to Arial (headings) and Georgia (body)
- No font installation required - works with existing system fonts
- For best results, pre-install Poppins and Lora fonts in your environment

### Color Application

- Uses RGB color values for precise brand matching
- Applied via python-pptx's RGBColor class
- Verify exported colors in the destination application

## When to Use
Use for an Anthropic-branded artifact explicitly requested by the user. Preserve a
different existing brand rather than applying these colors globally. This directory
contains instructions and a license, not a styling script or bundled fonts.

## Example and prerequisites
For a requested slide, inspect installed fonts, apply the relevant colors in the
actual authoring tool and export a preview. If Poppins/Lora are unavailable, disclose
the chosen fallback and inspect line wrapping and contrast. Expected result: a
reviewable branded draft, not automatic font installation or trademark approval.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
