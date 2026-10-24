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

## When to Use
Use this skill when a user requests building any frontend interface (website, app screen, UI component) and you want to apply a specific, opinionated design aesthetic instead of generic defaults.

## How to Use This Skill

When a user asks you to build a frontend interface (web or app):
1. **Identify the Style (Fuzzy Matching)**: Look for keywords in their prompt (e.g., "minimal", "glass", "retro"). You do not need an exact match. Use your semantic understanding to map their request to one of the 48 styles. For example:
   - "Apple style" or "VisionOS" -> `spatial-design`, `bento-ui`, or `glassmorphism`
   - "Windows 8" or "Metro" -> `tile-design`
   - "Terminal" or "Hacker" -> `sci-fi-interface` or `brutalist-typography`
   - "Bauhaus" or "Clean" -> `swiss-design`
   - "Cyber" or "Matrix" -> `cyberpunk-ui`
   If they don't specify a style, choose one that best fits the project context.
2. **Read the Style Reference**: Check the **Style Index** below to find the correct path for the chosen style. Use an available file-reading tool to read its specific `SKILL.md`.
3. **Pick a Palette**: If the user explicitly defined a theme or colors, **use their requested colors**. If they did NOT specify colors, use a suitable palette below as an optional starting point, then verify contrast for every actual foreground/background pair.
4. **Execute**: Write the code following the specific principles of the chosen style. Do not blend styles unless requested.

## Universal Color Palettes
If the user provides their own colors, use them. Otherwise, these ten illustrative palettes are optional starting points. No award provenance is claimed. Adapt their colors for the selected style, brand and measured contrast, and define reusable color tokens.

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

## Example

**User request:**

> Review this interface with @design-it, identify the highest-impact design problems, and propose an implementation-ready improvement.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.


## Implementation boundaries

The style references are visual studies and partial snippets, not complete compiled applications. Imports, package versions, licensed fonts and image assets must be supplied by the project. `Color(hex:)` is a custom extension; use an explicitly implemented parser or RGB initializers. Framework APIs and shadow support vary by version and platform; legacy React Native shadow props do not describe all New Architecture capabilities.

Define the referenced CSS tokens in the project (for example `--bg-primary`, `--primary-text`, `--text-primary`, `--secondary-base`, `--bg-surface` and `--cta-highlight`); palette names alone do not declare these variables. A palette or native material does not establish contrast compliance.

Keep semantic buttons, labels, focus, keyboard activation and useful navigation even when the decoration looks raw or text-only. Empty callbacks, container-only buttons and gesture-only examples demonstrate appearance; connect real actions and cancellation-safe interaction state before use. Do not announce decorative duplicate text, glows, scanlines or icons as repeated content. Respect text scaling, safe areas and reduced-transparency settings. Avoid fixed layouts that clip essential content at narrow widths.

Animation is optional. Prefer stable essential text and controls, pause decorative loops when hidden, dispose controllers and stop loops on unmount, and provide a static reduced-motion version. Web animation examples should include a targeted fallback such as:

```css
@media (prefers-reduced-motion: reduce) {
  .aurora-blob, .cyber-y2k-btn, .max-sticker, .tile-live-content {
    animation: none;
    transition: none;
  }
}
```

Use the corresponding native reduced-motion setting and keep a readable fallback for gradient/masked text. Styling choices do not replace accessibility testing on the target device.

Implementation references: [Flutter component theme migration](https://docs.flutter.dev/release/breaking-changes/component-theme-normalization), [Flutter child color filters](https://api.flutter.dev/flutter/widgets/ColorFiltered-class.html), [Android RenderEffect](https://developer.android.com/reference/android/graphics/RenderEffect), and [SwiftUI inner shadow style](https://developer.apple.com/documentation/swiftui/shadowstyle/inner(color:radius:x:y:)).
