---
name: "design-how-make-motion"
description: "Turn an approved product story into a short motion video with a timing sheet, review cuts and measured export checks."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-motion"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Make a Product Motion Video

## When to Use

Use for a feature demo, launch video or explainer built around product screens, real outcomes and brand assets. Establish audience, channel, duration, output dimensions, font rights and available footage or screenshots.

## Workflow

1. Write one sentence that explains the outcome. Draft three hooks, choose one and assign every scene a purpose. Use a visible action or result as the opening. Establish one timebase with the frame boundaries, captions, planned cuts and stills.
2. Derive foregrounds, surfaces, typography and accent from the supplied brand. Verify caption contrast and legibility at export dimensions. Use licensed material and scrub customer data from demo content.
3. Render and inspect stills first. Use the project's approved renderer (for example an existing Remotion project), with frame-derived animation values. Keep the product and captions readable without audio.
4. Render a review cut. Check interruptions around each scene boundary, jumps outside planned cuts, typography, cropping, timing and intelligibility with audio muted. Check for drift, clipping and loudness against the destination's requirements when audio is present.
5. Render the final MP4 and requested thumbnail. Verify output dimensions, frame rate, duration, codecs, audio and representative frames on the final output. Report anything that remains unverified.

## Example

“Make a 20-second launch video from our screenshots.” Deliver a three-beat sequence using the approved brand and a silent-readable caption track, then compare the review cut and final export.

## Limitations

Needs a working renderer and user-approved tooling, inputs and licenses. If rendering is unavailable, deliver the timing sheet and storyboard with the missing verification named. Keep the files local unless publication was requested.

## Bundled resources

Copy the complete `template/` into a fresh project directory. Rename `gitignore.template` to `.gitignore` in the copy. Install its pinned dependencies from that copy with `npm ci`. Node, FFmpeg and Chromium are needed as described in the bundled [render pipeline](references/pipeline.md). Retain the MIT notice when redistributing the template. The original example composition is a runnable fixture. Follow [story](references/story.md), [theme](references/theme.md), [motion](references/motion.md), [audio](references/sound.md), and [review](references/review.md) for the production steps.

Run `npm run typecheck` and `npm run stills -- example` from the copied template before authoring. Use the bundled audio and review commands on your composition. Match Remotion's current licensing to the project and use only authorized brand inputs.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-motion) by Arlan Marat. See [MIT license](LICENSE).
