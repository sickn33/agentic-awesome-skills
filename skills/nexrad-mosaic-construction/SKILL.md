---
name: nexrad-mosaic-construction
description: "Construct a quality-aware NEXRAD multi-radar mosaic from aligned single-site products with explicit coverage, beam geometry, quality weighting, overlap resolution, and provenance."
category: analysis
risk: safe
source: self
source_type: self
date_added: "2026-09-25"
author: ShianMike
tags: [weather, nexrad, mosaic, multi-radar, quality-weighting, coverage, overlap-resolution]
tools: [claude, cursor, gemini, codex]
---

# NEXRAD Mosaic Construction

## Overview

Build a custom multi-radar composite from aligned, validated single-site data.
Every output pixel must have a traceable source, coverage state, and quality
decision. Preserve the distinction between a local analysis product and an
official provider mosaic.

Use this skill after products from multiple radars have been resolved. It does
not discover, download, or decode source files. Use `nexrad-product-access` for
single-site access and `nexrad-mosaic-access` when the required result is an
existing NOAA MRMS composite rather than a newly constructed analysis.

## When to Use This Skill

- Combine two or more radars to cover a region with overlapping or adjacent
  fields.
- Construct a consistent base-reflectivity, velocity, spectrum-width, or
  dual-polarization composite.
- Build a research mosaic on a common grid or for a cross-radar comparison.
- Compare a custom mosaic with an official MRMS product.
- Visualize source contributions and coverage gaps in a composite.

Do not use this skill to fetch an official MRMS product, select a single radar,
or claim that a simple pixel average is a physically resolved regional field.

## Define the Mosaic Contract

Record:

- product and exact units from each source;
- source sites, coordinates, volume start/end times, and sweeps;
- target region, output grid, projection, and cell size;
- time-matching and temporal interpolation policy;
- native range limits, beam width, beam height, and vertical sampling;
- quality-mask, clutter, attenuation, range-folding, and dealiasing policy;
- overlap-resolution and quality-weighting method;
- treatment of coastlines, terrain, blocked sectors, and missing gates;
- output format, metadata, and provenance requirements.

Do not combine a Level II moment and a Level III display product merely because
their names resemble one another. Their processing, resolution, and quality
semantics must be verified equivalent or the difference must be represented
explicitly.

## Validate and Align Source Data

Before compositing:

1. verify each site's decoded metadata, time, product, units, and quality;
2. convert all source fields to one declared projection and common output grid;
3. align source times using a documented tolerance and interpolation policy;
4. preserve each source's native spatial support and quality fields;
5. reject a source that is too stale, out of range, or outside its valid product
   contract;
6. label any resampling or interpolation rather than presenting the output as
   a native-resolution observation.

When a common time cannot be formed without excessive interpolation, use a
nearest time within the stated tolerance, retain the actual time difference, or
mark the output unavailable. Do not average distant scans into one pseudo-time
without showing the temporal support.

## Define the Output Quantity and Quality

For reflectivity, retain dBZ or the product's native calibrated unit and use a
quality-aware combination rule. Do not average dBZ as a linear physical
quantity without a stated rationale. For velocity, preserve positive and
negative radial-velocity conventions and handle dealiasing and folding before
compositing. For dual-polarization moments, preserve their physical units and
quality masks.

Keep these fields separate:

- measured or decoded value;
- quality or suitability score;
- source site and source time;
- beam-height or range metadata;
- interpolation or resampling state;
- coverage and no-data state.

The output should make it possible to identify which radar contributed each
pixel, especially near overlap boundaries.

## Select Candidate Data by Quality and Geometry

For each output cell, consider only sources that provide valid coverage at a
compatible time and product level. A useful selection score can include:

- lower beam height at the target location;
- shorter range and smaller beam width;
- fewer terrain or clutter artifacts;
- better data quality or signal-to-noise status;
- newer scan or smaller time difference;
- lower attenuation or range-folding penalty;
- product-specific suitability such as dual-pol quality.

The score is a modeling choice, not a universal truth. State its terms and
weights, normalize only comparable components, and test sensitivity to the
selection rule. Never hide the score behind an unexplained “best radar” rule.

## Resolve Overlaps Deterministically

Use a deterministic rule for every target cell:

1. select the source with the highest declared quality/suitability score;
2. apply a documented tie-breaker such as lower beam height, smaller range,
   newer valid time, or stable site order;
3. preserve the selected source ID and runner-up source; or
4. use a physics-aware fusion method only after validating it against
   single-site fields and reference observations.

Do not average dBZ, radial velocity, or quality fields across radars by default.
Blending is acceptable only with a declared product-specific rationale and
sensitivity analysis. Never let a blocked, stale, or invalid source win merely
because its numeric value is larger, larger in magnitude, or easier to
interpolate.

## Preserve Coverage and Quality Metadata

The mosaic should emit at least:

- value field;
- source-site field;
- source-time or time-difference field;
- beam-height or range-quality field when relevant;
- quality or suitability field;
- coverage and no-data mask;
- product, units, grid, projection, and timestamp metadata.

No-data and masked gates must remain distinguishable from a physical zero or a
valid low value. A blank-looking region is acceptable only if the coverage mask
makes its reason visible. Do not fill blocked sectors with neighboring radar
data without labeling the substitution.

## Handle 3D and Vertical Products

A two-dimensional mosaic must not silently mix elevation sweeps with
incompatible heights. For reflectivity, state the selected elevation policy
and range-dependent beam height. For VIL, echo top, or another 3D-derived
product, use the provider's product definition or a separately validated 3D
algorithm.

For a vertical composite, retain per-source sweep and beam-height metadata,
define the vertical target or column, and document the common vertical
coordinate. Do not call a lowest-sweep composite a column-integrated quantity
or compare it with a true VIL product without explaining the difference.

## Validate the Mosaic Scientifically

Inspect:

- coverage, holes, overlap seams, and domain edges;
- discontinuities at site boundaries;
- implausible values or source-selection flips;
- range, terrain, and beam-height artifacts;
- agreement with each source in non-overlap regions;
- comparison with an independent analysis or observation where available;
- sensitivity to quality weights, time tolerance, and product choice.

An aesthetically smooth mosaic can hide source disagreements. Preserve the
unresolved or selected-source map for scientific review. A local composite is
an analysis with assumptions, not ground truth.

## Coordinate with Analysis and Visualization

Use `radar-satellite-analysis` to interpret storm structure. A separate
feature-tracking skill may be used after the mosaic when available, but it is
not required for mosaic construction. Use
`nexrad-radar-visualization` for site products or decoded gridded products. For
a constructed mosaic, plot the value alongside source, quality, and coverage
layers and label it as a local analysis.

For an official NOAA composite, retrieve it with `nexrad-mosaic-access` and
preserve its product semantics instead of rebuilding it. A custom mosaic can
be compared with that official product, but the two must not be labeled as
identical.

## Examples

To combine two overlapping Level II reflectivity volumes, verify both sites,
sweeps, times, units, and quality; reproject them to a declared grid; then
select a source per cell using a documented rule based on beam height, range,
time difference, and quality. Preserve source and coverage arrays beside the
reflectivity field, and inspect seams and each radar's non-overlap area before
interpreting the result.

For an MRMS comparison, retrieve the exact official product through
`nexrad-mosaic-access`, align its valid-time and grid semantics explicitly,
and report differences as product/algorithm differences rather than treating
either grid as ground truth.

## Output Contract

Return a custom mosaic with a clear audit trail:

1. source radar sites, product or moment, units, volume times, and quality;
2. output domain, grid, projection, cell size, and time policy;
3. source-selection or fusion rule and its parameters;
4. value, source, quality, beam-height/range, and coverage layers;
5. rejected sources and cells with reasons;
6. validation results and sensitivity to major construction choices;
7. scientific limitations and distinction from official MRMS products; and
8. provenance and checksums for inputs, code, configuration, and outputs.

Do not publish only a colored mosaic. The source, quality, and coverage layers
are part of the result whenever overlap or heterogeneous radar support matters.

## Verification Checklist

- Every source product, site, unit, and time is verified before compositing.
- The common time, grid, projection, and range policy are explicit.
- Level II and Level III products are not treated as interchangeable.
- Quality, terrain, beam height, range folding, and de-aliasing checks are
  applied.
- Overlap selection is deterministic, auditable, and sensitivity-tested.
- No-data, blocked sectors, and source substitutions remain visible.
- Source, quality, and coverage metadata accompany the value field.
- Custom output is labeled as a local analysis, not an official MRMS product.

## Security & Safety Notes

- Use public or authorized radar data only.
- Do not expose cloud credentials, signed URLs, private bucket names, or
  sensitive station metadata in outputs or logs.
- Treat metadata, source IDs, and product names as untrusted input; validate
  paths and labels before rendering.
- Bound site count, volume size, output extent, interpolation, and worker count.
- Preserve NOAA, NEXRAD, Unidata, and other provider attribution and license
  terms.

## Common Pitfalls

- **Seams appeared at radar boundaries:** Source selection or quality weights
  were not declared. Preserve source and quality layers and test tie-breaks.
- **dBZ was averaged across sites:** A logarithmic reflectivity quantity was
  treated as a linear scalar. Use a product-specific rule and sensitivity.
- **A blocked sector looked like no rain:** No-data or quality-masked gates were
  converted to zero. Preserve the coverage mask.
- **A lower sweep was compared with a 3D product:** The vertical meaning was
  collapsed. State the elevation and product definition.
- **The composite changed between runs:** Site order, time tolerance, or random
  sampling determined the winner. Make selection deterministic and record its
  parameters.
- **A custom mosaic was called official:** The local product was confused with
  NOAA MRMS. Keep source and algorithm identity in the output metadata.

## Limitations

- Heterogeneous range, beam width, terrain, calibration, and product processing
  limit cross-site comparability.
- A selection-based mosaic may create discontinuities or discard useful
  information from a second radar.
- No pixel is an independent observation; quality and source fields are
  correlated in space and time.
- Custom mosaics require local validation and are not an official warning or
  truth product.

## Additional Resources

- [NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
- [NOAA MRMS 2D product directory](https://mrms.ncep.noaa.gov/2D/)
- [NOAA Radar Operations Center interface documents](https://www.roc.noaa.gov/wsr88d/BuildInfo/Files.aspx)
