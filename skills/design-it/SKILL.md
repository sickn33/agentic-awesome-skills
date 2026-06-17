---
name: design-it
description: "Routes frontend design tasks to 48 specific UI styles. Triggers for websites, app screens, or UI components requesting a specific aesthetic."
category: frontend
risk: safe
source: self
source_type: self
date_added: "2026-06-17"
author: community
tags: [design, ui, frontend]
tools: [claude, cursor, gemini]
---

# Design-It: Sophisticated UI Style Router

This is the main entry point for the **design-it** skill system. Instead of falling back to generic "AI slop" aesthetics, you have access to 48 distinct, deeply opinionated design styles.

## How to Use This Skill

When a user asks you to build a frontend interface (web or app):
1. **Identify the Style (Fuzzy Matching)**: Look for keywords in their prompt (e.g., "minimal", "glass", "retro"). You do not need an exact match. Use your semantic understanding to map their request to one of the 48 styles. For example:
   - "Apple style" or "VisionOS" -> `spatial-design`, `bento-ui`, or `glassmorphism`
   - "Windows 8" or "Metro" -> `tile-design`
   - "Terminal" or "Hacker" -> `sci-fi-interface` or `brutalist-typography`
   - "Bauhaus" or "Clean" -> `swiss-design`
   - "Cyber" or "Matrix" -> `cyberpunk-ui`
   If they don't specify a style, choose one that best fits the project context.
2. **Read the Style Reference**: Check the **Style Index** below to find the correct path for the chosen style. Use the `view_file` tool to read its specific `SKILL.md`.
3. **Pick a Palette**: If the user explicitly defined a theme or colors, **use their requested colors**. If they did NOT specify colors, you MUST choose from one of the **10 Universal Palettes** below.
4. **Execute**: Write the code following the specific principles of the chosen style. Do not blend styles unless requested.

## Universal Color Palettes
If the user provides their own colors, use them. Otherwise, you MUST use one of these 10 award-winning, highly sophisticated palettes to avoid generic neon/purplish gradients. When picking a palette, stick to these exact hex codes and establish CSS variables for them.

1. **Yacht Club** (Nautical / Classic Elegance)
   - Backgrounds: `#F9F6F0`
   - Primary Text/Accents: `#1B2A49`
   - CTA/Highlights: `#C85A32`
   - Secondary Base: `#E2D8C9`
2. **Desert Mirage** (Warm / Organic)
   - Backgrounds: `#F4EFEA`
   - Primary Text/Accents: `#2D2B2A`
   - CTA/Highlights: `#A65E44`
   - Secondary Base: `#8C8781`
3. **Industrial Chic** (Strong / Minimalist)
   - Backgrounds: `#D1D1D1`
   - Primary Text/Accents: `#111111`
   - CTA/Highlights: `#9A3B3B`
   - Secondary Base: `#757575`
4. **Monochromatic Brown** (Comfort / Nostalgic)
   - Backgrounds: `#D9CBBF`
   - Primary Text/Accents: `#4A362D`
   - CTA/Highlights: `#7A4C3A`
   - Secondary Base: `#948275`
5. **Earth-Grounded Elegance** (Calm / Sustainable)
   - Backgrounds: `#F7F5F0`
   - Primary Text/Accents: `#3A4B3A`
   - CTA/Highlights: `#8A9A86`
   - Secondary Base: `#D3CEC4`
6. **Minimalist Slate** (Professional / Tech)
   - Backgrounds: `#F4F4F9`
   - Primary Text/Accents: `#2B303A`
   - CTA/Highlights: `#5C6B73`
   - Secondary Base: `#C0C5C1`
7. **Midnight Luxury** (Premium / Dark Mode)
   - Backgrounds: `#0A0A0A`
   - Primary Text/Accents: `#F5F5F0`
   - CTA/Highlights: `#B59A5F`
   - Secondary Base: `#1C1C1C`
8. **Sophisticated Neutral** (Upscale / Lifestyle)
   - Backgrounds: `#E6E2DD`
   - Primary Text/Accents: `#1F1C1B`
   - CTA/Highlights: `#524036`
   - Secondary Base: `#B8B0A8`
9. **Warm Tech** (Corporate / Modern)
   - Backgrounds: `#EAEAEA`
   - Primary Text/Accents: `#1C252E`
   - CTA/Highlights: `#C28F79`
   - Secondary Base: `#2C3E50`
10. **Modern Editorial** (Magazine / High Contrast)
    - Backgrounds: `#F9F9F9`
    - Primary Text/Accents: `#121212`
    - CTA/Highlights: `#D44A3A`
    - Secondary Base: `#8F8F8F`

## The 60-30-10 Rule
- **60%**: Backgrounds / Secondary Base
- **30%**: Primary Text / Accents
- **10%**: CTA / Highlights

---

## Style Index (48 Styles)

To use a style, you MUST read its file at `<style-folder>/SKILL.md` relative to this file's directory.

### Modern UI
- `minimalism`
- `flat-design`
- `flat-design-2`
- `material-design`
- `glassmorphism`
- `neumorphism`
- `skeuomorphism`
- `claymorphism`
- `aurora-ui`
- `bento-ui`

### Depth & 3D
- `3d-ui`
- `isometric-design`
- `layered-design`
- `floating-ui`
- `spatial-design`

### Typography
- `swiss-design`
- `editorial-design`
- `typography-first`
- `brutalist-typography`

### Retro & Historical
- `brutalism`
- `neo-brutalism`
- `retro-design`
- `y2k-design`
- `cyber-y2k`
- `vaporwave`
- `synthwave`
- `frutiger-aero`
- `retro-futurism`

### Modern Trends
- `dark-mode`
- `monochromatic-ui`
- `gradient-design`
- `duotone-design`
- `color-blocking`
- `soft-pastel`
- `high-contrast`
- `vibrant-maximalism`
- `maximalism`

### Futuristic
- `cyberpunk-ui`
- `sci-fi-interface`
- `holographic-ui`
- `ai-native-ui`
- `spatial-computing-ui`

### Data & Product
- `dashboard-design`
- `card-based-design`
- `widget-based-design`
- `tile-design`
- `data-dense-design`
- `command-center-ui`

## Web vs App Implementation
- **Web (React/Vue/HTML)**: Use CSS variables natively. Prioritize CSS grid/flexbox for layout. Use CSS transitions for hover states.
- **App (React Native/Flutter/SwiftUI)**: Map the palettes to the framework's theme engine. Use platform-specific shadows (elevation) and animations instead of CSS transitions. Maintain the core visual principles while adapting to mobile constraints.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

