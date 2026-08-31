---
name: liuguang-banlan-ui
description: Builds two parameterized UI modes—流光溢彩白 (iridescent white) and 五彩斑斓黑 (colorful black)—with OKLCH, WebGL/CSS fallback, vision gating, screenshot QA, and total/per-color intensity reports. Use when a UI request names either mode or needs measured color parameters.
category: creative
risk: critical
source: self
source_type: self
date_added: "2026-08-15"
author: 3516027002att-ui
tags: [ui, frontend, oklch, webgl, accessibility]
tools: [codex, claude, cursor, gemini]
---

# 流光斑斓 UI 工坊

## Overview

Use one skill with two explicit modes, not a generic material library. Preserve a stable information workspace while treating the spectral field as a controlled environmental layer. Keep the implementation parameterized so every output can report total color intensity, per-color intensity, OKLCH values, peak opacity, spatial scale, phase, and measured coverage.

Read [style-contract.md](references/style-contract.md) before choosing a mode or changing palette semantics. Read [verification.md](references/verification.md) before claiming visual or screenshot validation.

## When to Use

- Use when a user names 流光溢彩白 or 五彩斑斓黑, asks for one unified skill covering both, or needs a reusable parameterized starter.
- Use when the final report must include total color intensity, each color's intensity, OKLCH values, and screenshot measurements.
- Do not use for a generic theme-token library or an unparameterized visual mockup.

## Workflow

### 1. Classify the request

- Map “流光溢彩白” to `opal` and “五彩斑斓黑” to `obsidian`.
- If both are requested, keep one shared implementation and two explicit theme manifests.
- Inspect the existing project, framework, route, build system, and uncommitted work before copying starter assets.
- Use the smallest appropriate change surface; do not replace an existing design system without authorization.

### 2. Gate visual verification

- Confirm that the executing model can directly inspect images before taking a screenshot-based visual claim.
- If native image inspection is unavailable, continue with code and deterministic pixel checks but mark the result `visual-unverified`; never infer visual quality from DOM or CSS alone.
- Record `modelVision`, `screenshotCapture`, `deterministicPixelMetrics`, and `visualVerificationMode` in the final report.

### 3. Establish the scene and structure

- Choose a neutral, information-dense workbench domain such as field research, inventory, monitoring, or operations.
- Use a continuous three-pane or similarly coherent workspace: navigation, queue/list, detail, metadata, and one signature observation band.
- Keep color in the field, ribbon, markers, and state accents; keep text, controls, boundaries, and semantic hierarchy stable.
- Prefer restrained surfaces and weak fills. Avoid turning every region into a floating card.

### 4. Implement the parameter contract

Maintain a serializable manifest with these top-level fields:

```js
{
  schemaVersion, mode, label, preset, seed,
  overallColorIntensity,
  base: { oklch },
  colors: [{
    id, label, oklch, srgbFallback,
    intensity, peakOpacity, lightnessBias,
    fieldScale, phase,
    measuredCoverage, effectiveShare
  }],
  field: { scale, octaves, warpStrength, motionSpeed, staticTime, ditherStrength, luminanceCap },
  output: { colorSpace, p3Enhancement, reducedMotion }
}
```

- Keep every intensity in `[0, 1]`; make `overallColorIntensity` the global budget and `colors[].intensity` the per-color budget.
- Use OKLCH as the authoring space and provide an sRGB fallback for non-OKLCH contexts.
- Keep the seed, static frame, phases, and field scales deterministic; do not use random per render.
- Expose sliders for the global intensity and every configured color. Make reset, JSON export, and copy actions available.

### 5. Build the spectral field

- Use a procedural fBm/domain-warp field or an equivalent continuous field; keep it behind the interface with `pointer-events: none`.
- Use broad flowing hue regions or ribbons, not obvious radial blobs, spotlight circles, or hard rainbow bands.
- Upload the complete palette and per-color field scales to the renderer. Apply the dark-mode luminance cap after palette mixing.
- Provide a CSS fallback with comparable visual intent when WebGL is unavailable.
- Pause or freeze motion when the document is hidden or `prefers-reduced-motion` is active.
- Keep the renderer local and dependency-light; do not require remote fonts, images, or APIs for the starter.

### 6. Preserve interaction and accessibility

- Keep semantic headings, labels, focus-visible states, keyboard escape behavior, and readable contrast.
- Test navigation, record/list selection, tab selection, parameter panel open/close, slider input, reset, export, and copy fallback.
- Make the workbench responsive at a narrow mobile viewport; collapse navigation and metadata without losing the primary record flow.

### 7. Validate and report

- Scaffold a clean starter with `scripts/scaffold_template.py` when a neutral implementation is needed.
- The bundled helpers parse only the restricted data-literal assignment used by
  the starter. They reject expressions, function calls, duplicate keys,
  unsupported syntax, trailing statements, and oversized manifests without
  executing JavaScript. Keep runtime theme configs data-only as well.
- Run `scripts/validate_manifest.py` on each theme config before rendering.
- Capture desktop and mobile screenshots with a real browser. Inspect them directly if visual capability is available.
- Run `scripts/measure_preview.py` on the pure field screenshot and retain measured chromatic ratio, luminance statistics, per-color coverage, and effective share.
- Report configured parameters separately from measured values; do not imply that pixel attribution is an exact shader contribution.
- Use `partial`, `visual-unverified`, or `blocked` when a required capability or native check is unavailable.

## Limitations and capability states

- WebGL is optional. The starter switches to a CSS spectral fallback when a WebGL context cannot be created or shader/program setup fails; fallback rendering is parameterized but is not pixel-identical to the shader.
- Native image inspection and browser screenshot capture are runtime capabilities, not guaranteed by this skill. If either is unavailable, keep the result visual-unverified and report the missing capability explicitly.
- The deterministic measurement helper requires the optional Python packages listed in scripts/requirements.txt. Without them it exits with an unavailable-capability message instead of producing a misleading report.
- Manifests may contain 3 to 12 colors. The renderer uploads every configured entry up to that validated limit, while the shader ignores only unused capacity slots.
- Configured values, fallback values, and measured pixel attribution describe different things; do not treat measured per-color coverage as an exact decomposition of shader energy.

## Anti-pattern guardrails

- Do not rename the two modes into a vague “reusable UI material” abstraction.
- Do not use pure white as the only white-mode signal, black crush as the only dark-mode signal, or RGB neon as a shortcut to “colorful”.
- Do not hide weak structure behind full-page glass, excessive blur, or giant gradients.
- Do not report visual success from screenshot dimensions, DOM state, or static CSS alone.
- Do not include private project names, links, repository identifiers, or source-chat contents in generated assets or reports.

## Bundled resources

Use the bundled starter under `assets/starter/` as a neutral base. Copy only the selected mode when integrating into an existing project, and preserve the existing project’s content and build conventions.

### scripts/

- `scaffold_template.py`: copy the neutral starter for `opal`, `obsidian`, or both.
- `manifest_parser.py`: statically parse the restricted data-only manifest grammar without executing JavaScript.
- `validate_manifest.py`: validate required manifest fields and ranges.
- `measure_preview.py`: measure a rendered pure-field PNG against the configured OKLCH palette.

### references/

- `style-contract.md`: mode-specific visual rules and recommended parameter ranges.
- `verification.md`: visual-capability gate, browser QA, pixel measurement, and report schema.

### assets/

`starter/` contains a neutral static workbench, shared renderer, and both theme variants. Treat it as output material, not as documentation to paste into context wholesale.
