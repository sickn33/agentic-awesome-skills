---
name: nexrad-radar-visualization
description: "Plot NEXRAD Level II/III site scans and decoded radar mosaics with correct radar geometry, map grids, units, quality masks, timestamps, and provenance."
category: analysis
risk: safe
source: self
source_type: self
date_added: "2026-09-25"
author: ShianMike
tags: [weather, nexrad, radar-plotting, ppi, velocity, dual-pol, cross-section, visualization]
tools: [claude, cursor, gemini, codex]
---

# NEXRAD Radar Visualization

## Overview

Create scientifically legible plots from verified NEXRAD single-site products
and decoded radar mosaics. Preserve site or domain, product, observation or
valid time, units, geometry, quality masking, and color meaning so a visually
compelling image cannot hide a wrong quantity or misleading spatial
interpretation.

Use this skill after `nexrad-product-access` or another trusted source has
provided a decoded site product. Use `nexrad-mosaic-access` to retrieve an
official MRMS composite before plotting it. This skill does not discover or
download radar files.

## When to Use This Skill

- Plot base reflectivity, radial velocity, spectrum width, or another decoded
  Level II moment for one NEXRAD site.
- Plot a Level III product selected by product code and scan time.
- Plot a decoded NOAA/NCEP MRMS or other documented NEXRAD-derived gridded
  composite while preserving its grid, coverage, and product semantics.
- Create a lowest-elevation PPI, a specified-elevation PPI, or a sweep chosen
  for a target height.
- Plot dual-polarization moments with appropriate units and masks.
- Create RHI, cross-section, tilt, storm-relative, or multi-sweep views.
- Build a time sequence or animation from a verified scan series.
- Export the plot with a stable color scale, map context, metadata, and
  provenance.

Do not use a plot to hide a missing sweep, unverified product, invalid gate mask,
geolocation error, or unsupported extrapolation.

## Define the Visualization Contract

Record:

- radar site and site coordinates;
- data level and exact product or moment;
- observation, volume, or product time in UTC;
- source identity and local content hash when required;
- intended view: PPI, RHI, cross-section, tilt, comparison, or animation;
- sweep or angle policy;
- map projection, bounds, range rings, and landmark context;
- physical units, color scale, display range, and normalization policy;
- invalid, missing, folded, clutter, or otherwise masked gates;
- for gridded mosaics, the provider, product/domain, grid projection and
  orientation, valid-time semantics, and source/coverage or quality fields;
- output format, dimensions, background, and whether figures are for analysis or
  publication.

If the user asks only for “a radar image,” produce a useful default: a
single-site PPI with site marker, UTC time, product, units, color bar, range
rings, and missing-data treatment visible. For a decoded mosaic, use a map view
with the product, domain, valid time, units, legend, and missing-data treatment
visible. Ask only when product, site/domain, or time would materially change
the result and cannot be inferred safely.

## Validate Before Plotting

1. Confirm the decoded site, product or moment, time, units, dimensions, and
   projection.
2. Apply scale, offset, calibration, fill values, and quality flags before
   interpolation, contouring, or thresholding.
3. Confirm that the requested sweep exists. For a target-height sweep, compute
   or obtain beam height as a function of range and show which elevation is
   nearest.
4. Preserve no-data and invalid-data cells as masked values. Do not replace them
   with zero, minimum reflectivity, or an opaque background that resembles weak
   echo.
5. Confirm that map coordinates and radar polar coordinates share the correct
   projection and origin.
6. Record whether velocity is dealiased and whether dual-polarization fields have
   their documented quality masks.

## Plot a PPI

For a plan-position indicator:

1. Select the requested sweep or the lowest usable sweep under a stated policy.
2. Convert range and azimuth to the selected map projection.
3. Mask invalid, below-threshold display, folded, clutter-contaminated, and
   missing gates according to an explicit policy.
4. Render the measured product with a documented, perceptually ordered color
   scale appropriate to the quantity.
5. Overlay radar location, requested site label, range rings or distance scale,
   north arrow when orientation could be ambiguous, and optional geographic
   context.
6. Put product, site, UTC time, units, sweep or product code, range, and color bar
   in the figure itself.

For reflectivity, do not imply that every dBZ color boundary is a categorical
precipitation type. Keep the measured reflectivity label visible and put any
rain-rate relation in a separate, explicitly derived layer.

For velocity, use a diverging scale centered on zero unless the product's
documented semantics require another convention. Radial velocity points toward
or away from the radar according to the data convention; it is not a full wind
vector. Do not draw environmental wind arrows from radial velocity without an
explicit deconvolution or retrieval method.

## Plot Dual-Polarization Moments

Preserve the physical unit for each field, such as differential reflectivity in
dB, differential phase in degrees, correlation coefficient as a unitless
quantity, and specific differential phase with its documented units and scale.

Keep raw dual-polarization fields separate from hydrometeor classification. If a
classification is displayed, state the input moments, thresholds, quality
masking, and whether the classification is measured, retrieved, or heuristic.

Do not normalize each sweep independently before an animation or comparison;
that can make a changing storm look stationary. Use one declared scale for the
whole sequence unless a separate panel is explicitly labeled.

## Choose a Sweep for a Target

Lowest-level products emphasize near-surface structure but are vulnerable to
terrain, clutter, biological targets, and beam broadening. Higher sweeps sample
different heights and can miss low-level features.

When selecting a sweep by target height:

1. use the radar elevation angles and a documented beam-height relationship;
2. solve for the nearest sweep at the requested range and height;
3. label the selected elevation and estimated sampling height;
4. show the choice on a vertical cross-section when the selection is material.

Do not call the lowest sweep a surface observation. Its beam samples a volume
whose center height varies with range and whose width increases away from the
radar.

## Plot RHI, Cross-Sections, and Tilts

An RHI or cross-section is a derived view assembled from multiple sweeps or
volumes. Preserve source volume identity, azimuth or line orientation,
horizontal-distance coordinate, vertical coordinate, interpolation method, and
beam-height geometry.

Do not connect gates across large angular gaps, missing sweeps, or incompatible
volumes without showing the gap. Avoid implying sub-beam vertical resolution.
For a storm tilt sequence, use the same cross-section line or documented tracking
logic across times and show how the line moves.

## Create Time Sequences

For an animation or loop:

- use a verified chronological scan sequence;
- preserve the requested cadence and mark skipped or duplicated scans;
- keep site, product, color scale, map bounds, and range constant;
- show UTC time on every frame or in a clearly visible persistent timestamp;
- do not duplicate a stale frame to fill a gap without labeling the hold;
- stop at the last verified frame when the stream ends.

An animation is not evidence of temporal evolution unless frames are aligned,
correctly timed, and generated from the same product and projection.

## Plot a Precomputed Mosaic

For an MRMS or other decoded NEXRAD-derived grid:

1. Verify product identity, domain, valid or accumulation time, units, grid
   projection, dimensions, coordinate orientation, and decoded extent.
2. Apply the product's scale, offset, fill values, quality flags, and coverage
   mask before rendering. Preserve missing coverage as missing; do not turn it
   into zero-valued precipitation or reflectivity.
3. Render the documented geographic extent and coordinate grid. Reproject only
   with an explicit transformation and retain the native grid metadata.
4. Label the exact product, provider, domain, valid-time interval, units, and
   color scale. Show coverage or source attribution when supplied with the
   decoded data.
5. Keep official provider products distinct from locally constructed mosaics;
   use `nexrad-mosaic-construction` for construction and label its output as a
   local analysis.

Do not apply single-radar azimuth/range geometry or sweep labels to an MRMS
grid. Do not claim a mosaic represents every native radar moment or elevation.

## Design the Figure

Use the minimum visual elements needed to interpret the measurement:

- product and unit;
- site or mosaic domain and UTC/valid time;
- sweep, angle, or product code;
- color bar with fixed limits and an explicit missing-data color;
- radar location and range context for site plots, or geographic extent and
  orientation for gridded plots;
- relevant masks or quality annotation;
- source and processing note when the figure leaves the controlled environment.

Avoid decorative terrain or boundaries that obscure gates, imply high
resolution, or dominate the measured field. Do not crop away the radar site,
range rings, or color bar without replacing the lost context.

For a multi-panel figure, label each panel by product and time and state whether
the panels share a scale. Use consistent geometry across panels so a viewer can
compare evolution without reorienting the scene.

## Examples

Given a decoded KTLX volume, render the lowest usable reflectivity sweep with
the site, Level II moment, observed UTC time, dBZ units, color bar, range rings,
and invalid gates visibly masked. Read the timestamp and product metadata from
the volume rather than inventing them.

When comparing two velocity scans, first verify they are from the same site,
product, units, and sweep policy. Use one shared diverging color scale, show
each scan's actual UTC time, and leave missing gates masked rather than filling
them with zero velocity.

When plotting an MRMS composite, retrieve the exact product and timestamp with
`nexrad-mosaic-access`, validate its native grid and valid-time semantics, and
show its provider, domain, units, legend, and missing-data mask. Do not apply
single-site sweep geometry or present the composite as a custom mosaic.

## Export and Verify

For static output, verify the actual rendered file—not only the plotting call.
Open or inspect the image and confirm:

- nonblank data and expected radar coverage;
- correct orientation and site position;
- readable labels, units, timestamp, and color bar;
- no clipped legends or accidental all-background panels;
- correct color limits and no unintended missing-data substitution;
- aspect ratio that does not distort distance;
- file format, dimensions, and checksum for publication workflows.

For interactive output, also test zoom, time selection, product switching, and
the behavior when a sweep or scan is unavailable.

Record the plotting-library versions, projection, transformations, display
limits, masks, output path, and input identity. Pair the figure with
`weather-data-reproducibility` when it must be regenerated later.

## Output Contract

Return or publish:

1. the requested image, animation, or interactive view;
2. the exact site or mosaic domain, provider, product or moment, sweep if
   applicable, and UTC/valid time shown;
3. units, color range, missing-data policy, and quality masks;
4. projection, native grid or beam/sampling geometry, and processing
   transformations;
5. verified output path or attachment and its media type;
6. limitations that materially affect interpretation.

Do not return a plot without enough metadata for another analyst to understand
what is being displayed.

## Verification Checklist

- Site, product, moment, time, and sweep are verified from decoded metadata.
- Units, calibration, scale/offset, and missing values are applied correctly.
- PPI geometry uses the radar location and correct projection.
- Velocity uses a meaningful diverging scale and is labeled radial.
- Sweep selection states the elevation and target or beam height.
- Cross-sections disclose interpolation and source volumes.
- Animation frames are ordered, aligned, and consistently scaled.
- Invalid gates are masked rather than plotted as real weak echo.
- The rendered artifact was visually inspected after export.

## Security & Safety Notes

- Plot only public or authorized radar products.
- Do not expose credentials, signed URLs, private bucket names, or sensitive
  station details in images or logs.
- Treat metadata and product names as untrusted input; escape labels and use
  controlled output paths.
- Bound image dimensions, animation frame count, interpolation work, and memory
  use.
- Preserve provider attribution and do not imply NOAA endorsement.

## Common Pitfalls

- **The reflectivity map is displaced:** Fixed display coordinates or the wrong
  radar origin were used. Reproject the polar data explicitly.
- **Velocity colors imply storm motion:** Diverging radial velocity was
  interpreted as a full wind vector. Label the quantity as radial velocity.
- **The animation flickered between storms:** Every sweep was independently
  normalized. Use one fixed scale across verified frames.
- **Missing gates appeared as weak echoes:** No-data values were plotted as the
  minimum color. Mask them and show a distinct background.
- **The lowest sweep was called surface data:** Range-dependent beam height was
  ignored. State the beam geometry and sampling height.
- **A cross-section invented vertical detail:** Sparse sweeps were smoothly
  interpolated without gaps. Preserve resolution limits and missing sectors.

## Limitations

- Radar plots display remote-sensing observations and processed products, not
  direct surface truth.
- Display quality cannot repair terrain blockage, attenuation, calibration
  problems, or a wrong product selection.
- A static image cannot establish future motion or storm behavior.
- This skill does not fetch data, construct mosaics, or replace scientific
  interpretation and verification.

## Additional Resources

- [NOAA ROC Level II data types](https://www.roc.noaa.gov/level-two-data-types.php)
- [NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
