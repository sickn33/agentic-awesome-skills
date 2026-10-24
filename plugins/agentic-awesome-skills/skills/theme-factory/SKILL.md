---
name: theme-factory
license: Apache-2.0
description: "This skill provides a curated collection of professional font and color themes, each with carefully selected color palettes and font pairings. Once a theme is chosen, it can be applied to any artifact."
risk: critical
source: community
date_added: "2026-02-27"
---


# Theme Factory Skill

_Modified in the local catalog review: clarified selection scope, portability and contrast; corrected showcase text contrast._

This skill provides a curated collection of professional font and color themes, each with carefully selected color palettes and font pairings. Once a theme is chosen, it can be applied to any artifact.

## Purpose

To apply consistent, professional styling to presentation slide decks, use this skill. Each theme includes:
- A cohesive color palette with hex codes
- Complementary font pairings for headers and body text
- A distinct visual identity suitable for different contexts and audiences

## Usage Instructions

To apply styling to a slide deck or other artifact:

1. **Show the theme showcase**: Display the `theme-showcase.pdf` file to allow users to see all available themes visually. Do not make any modifications to it; simply show the file for viewing.
2. **Use the user’s preference**: Apply an already selected theme or supplied brand palette. Ask once only if the request leaves a material style choice unresolved.
3. **Choose within scope**: If the user delegated styling, select a suitable theme and state the choice; no extra approval is needed for reversible styling.
4. **Apply the theme**: Once a theme has been chosen, apply the selected theme's colors and fonts to the deck/artifact

## Themes Available

The following 10 themes are available, each showcased in `theme-showcase.pdf`:

1. **Ocean Depths** - Professional and calming maritime theme
2. **Sunset Boulevard** - Warm and vibrant sunset colors
3. **Forest Canopy** - Natural and grounded earth tones
4. **Modern Minimalist** - Clean and contemporary grayscale
5. **Golden Hour** - Rich and warm autumnal palette
6. **Arctic Frost** - Cool and crisp winter-inspired theme
7. **Desert Rose** - Soft and sophisticated dusty tones
8. **Tech Innovation** - Bold and modern tech aesthetic
9. **Botanical Garden** - Fresh and organic garden colors
10. **Midnight Galaxy** - Dramatic and cosmic deep tones

## Theme Details

Each theme is defined in the `themes/` directory with complete specifications including:
- Cohesive color palette with hex codes
- Complementary font pairings for headers and body text
- Distinct visual identity suitable for different contexts and audiences

## Application Process

After a preferred theme is selected:
1. Read the corresponding theme file from the `themes/` directory
2. Apply the specified colors and fonts consistently throughout the deck
3. Choose readable foreground/background pairs, then measure contrast at actual text sizes. Palette membership alone does not guarantee a usable pair. Do not use light Arctic Frost Ice Blue on white, Tech Innovation Cyan on white, or muted Golden Hour/Desert Rose accents as small body text on dark backgrounds.
4. Maintain the theme's visual identity across all slides

## Create your Own Theme
To handle cases where none of the existing themes work for an artifact, create a custom theme. Based on provided inputs, generate a new theme similar to the ones above. Give the theme a similar name describing what the font/color combinations represent. Use any basic description provided to choose appropriate colors/fonts. After generating the theme, show it for review and verification. Following that, apply the theme as described above.

## When to Use
Use to apply one of the supplied color/font palettes to a requested presentation, document or other artifact, or to create a custom palette when the user delegates styling.

## Portability and output checks

Fonts are recommendations, not bundled assets. Check availability and permitted embedding in the target environment; use a suitable fallback without installing or downloading fonts automatically. Preserve existing brand and semantic colors, chart meaning and content. Style only the requested artifact, keep its editable source and inspect its final export for text clipping, fallback fonts, contrast and missing glyphs. The bundled PDF illustrates palette samples; its swatches are not blanket text-color recommendations. Create custom palettes in the task workspace, not inside the installed skill tree.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
