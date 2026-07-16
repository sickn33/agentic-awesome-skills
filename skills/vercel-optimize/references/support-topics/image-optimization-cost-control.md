---
id: image-optimization-cost-control
title: Image optimization cost control
status: active
candidateKinds: ["image_optimization"]
frameworks: ["*"]
priority: 90
citations: ["https://vercel.com/docs/image-optimization", "https://vercel.com/docs/image-optimization/managing-image-optimization-costs", "https://vercel.com/docs/image-optimization/limits-and-pricing"]
maxBriefChars: 850
---

## Investigation Brief
Image recommendations should distinguish real user-facing image work from wasteful transformations.

## Evidence To Check
Inspect the sampled files for raw image tags, dimensions, remote sources, repeated transforms, source image limits, icons, SVGs, GIFs, and existing framework image components.

## Do Not Recommend When
Do not route tiny icons, SVG UI assets, or animated GIFs through image optimization just because they are images. Do not change remote-source policy without checking the existing config.

## Verification
Name the image files or components, current rendering path, and the metric or scanner evidence that makes optimization material.
