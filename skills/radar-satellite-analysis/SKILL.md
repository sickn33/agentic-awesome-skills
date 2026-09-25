---
name: radar-satellite-analysis
description: "Interpret weather radar and satellite observations by validating product metadata and geometry, deriving storm and cloud structures, tracking evolution, and quantifying uncertainty."
category: analysis
risk: safe
source: self
source_type: self
date_added: "2026-09-25"
author: ShianMike
tags: [weather, radar, satellite, nexrad, goes, nowcasting, storm-analysis, remote-sensing, uncertainty]
tools: [claude, cursor, gemini, codex]
---

# Radar and Satellite Analysis

## Overview

Analyze radar and satellite weather products as remote-sensing observations,
not as ground truth. Validate scan time, geometry, calibration, quality flags,
and coverage before interpreting a feature. Then separate what the instrument
directly measures from what a meteorological inference suggests.

This skill consumes already retrieved and decoded products. Use it after
`noaa-radar-satellite-fetching` or an equivalent source-specific skill. It does
not discover buckets, download files, repair outages, or make a product
scientifically suitable by naming it radar or satellite data.

## When to Use This Skill

- Interpret NEXRAD reflectivity, velocity, spectrum width, or multi-moment
  volumes.
- Track storm growth, decay, splits, mergers, rotation, anvils, or cloud-top
  evolution over time.
- Analyze GOES visible, infrared, water-vapor, or derived cloud and convection
  products.
- Combine radar structure with satellite cloud-top evidence while preserving
  each sensor's limitations.
- Produce a short-term precipitation or severe-weather nowcast from a sequence
  of observations.
- Explain why a radar or satellite feature is—or is not—supported by the data.

Do not infer a surface hail size, wind speed, rainfall rate, or lightning count
from a single proxy without stating the retrieval assumptions. Do not use a
single still image to claim a storm's future track or intensity.

## Define the Remote-Sensing Analysis Contract

Before interpreting pixels, beams, or profiles, record:

- event, target phenomenon, region, and UTC interval;
- radar site, product level, scan/volume interval, elevation angles, moments,
  and resolution—or satellite platform, product, sector, channel, scan mode,
  and resolution;
- the measurement height or viewing geometry;
- the quality masks, calibration or scaling, and missing-data policy;
- the temporal cadence and the allowed lag between radar, satellite,
  observations, and model guidance;
- the feature definition and the expected output: structure, motion,
  intensity proxy, nowcast, or uncertainty map;
- the criteria for a confident, tentative, or inconclusive interpretation.

Keep observation time, scan start/end time, file creation time, retrieval time,
and analysis time separate. A file created quickly after a scan is not a newer
measurement.

## Validate the Products Before Interpretation

### Common checks

1. Confirm the radar site or physical satellite, product identity, sector,
   channel or moment, and expected dimensions from the decoded metadata.
2. Verify the time interval, scan start and end, coordinate reference system,
   and geolocation. For GOES fixed grids, use the product's geostationary
   projection metadata rather than treating scan `x` and `y` as latitude and
   longitude.
3. Apply the product's documented scale, offset, fill values, calibration, and
   quality flags before computing statistics or thresholds.
4. Inspect missing scans, partial volumes, data gaps, saturated or invalid
   values, and spatial coverage. Do not smooth over a gap without labeling it.
5. Record the resolution, footprint, and observation uncertainty. A high pixel
   count is not a high spatial resolution if the beam or channel is coarse.

### Radar-specific checks

- Confirm site, volume start/end time, sweep count, moments, and elevation
  angles. Level II, Level III, and real-time chunk products are not
  interchangeable encodings.
- Account for range-dependent beam width, beam height above the radar, terrain
  blockage, range folding, attenuation, clutter, anomalous propagation, and
  velocity dealiasing where relevant.
- Determine whether a feature is sampled by one low-level sweep, several
  elevation angles, or a full vertical column. Do not compare a low-level echo
  top with a satellite cloud top as if they were the same physical surface.
- Keep base reflectivity, column-integrated liquid, echo top, and derived
  products distinct. Their thresholds and physical meanings are not
  interchangeable.

### Satellite-specific checks

- Confirm platform, instrument, product short name, channel or RGB product,
  sector, scan mode, and scan interval from file attributes.
- Apply channel-specific calibration and quality flags. Brightness
  temperature, reflectance, cloud-top temperature, and land-surface
  temperature are different quantities.
- Treat cloud-top parallax as a viewing-geometry problem. A high cloud can be
  displaced from its surface footprint, especially near the edge of a sector.
- Distinguish visible, infrared, water-vapor, and derived RGB products. Their
  interpretation depends on reflectance, emission, atmospheric absorption, and
  daylight or scan mode.

## Analyze Radar Structure

### Reflectivity and precipitation proxies

Use reflectivity to describe the location and organization of precipitation
echoes, then qualify the interpretation with beam height, range, attenuation,
and sampling. Look for features such as:

- high-reflectivity cores and their relationship to weaker surrounding echo;
- echo overhangs, weak-echo regions, bounded weak-echo regions, and vertical
  development;
- bow, hook, line, multicell, or training structures when the geometry supports
  that description;
- echo-top or vertically integrated liquid patterns that are relevant to the
  stated question.

Do not call a reflectivity threshold hail, tornado, or destructive wind. Those
are conditional interpretations requiring velocity, cloud-top, lightning,
surface, or model context. Convert reflectivity to rain rate only with an
explicit relation, sample assumptions, and uncertainty bounds; a reflectivity
lookup is not a universal precipitation truth.

### Velocity and rotation

Analyze radial velocity as a radar-relative measurement. State whether the
field is gate-to-gate shear, environmental shear, storm-relative radial flow, or
a derived couplet. Consider dealiasing, range folding, noise, side lobes,
velocity folding artifacts, and the fact that a velocity signature can have
multiple meteorological explanations.

For rotation or mesocyclone interpretation, use the appropriate temporal,
azimuthal, and vertical support and compare the result with neighboring scans.
A single couplet is a candidate feature, not a confirmed tornado. Do not use
radial velocity as a direct measurement of the environmental wind vector
without accounting for viewing geometry.

### Three-dimensional organization

When a volume supports it, align elevation angles and analyze vertical
structure: low-level inflow, mid-level rotation, updraft organization, echo
top, overhang, and bounded weak-echo regions. Account for increasing beam
volume and decreasing resolution with height. A feature that appears vertically
stacked may be a sampling or attenuation artifact; check adjacent sites or
scans before asserting a continuous structure.

## Analyze Satellite Cloud and Storm Structure

Use satellite data to describe cloud-top and environmental context, not to
replace radar precipitation structure. Depending on the product, examine:

- cloud-top temperature, brightness-temperature gradients, and overshooting
  top candidates;
- anvil extent, spreading direction, and relationship to upper-level outflow;
- deep-convective cloud shields and mesoscale convective systems;
- visible-texture changes, cloud-top lowering or warming, and inferred growth or
  decay only with a time sequence;
- water-vapor patterns, upper-level moisture, and potential convective
  environments when the product and resolution support those claims.

An infrared cold cloud top is not, by itself, proof of severe weather, hail,
or a particular updraft strength. A very cold top can reflect a high cloud
whose emission and viewing geometry differ from a nearby lower cloud. State the
proxy, the threshold, and the alternative explanation.

## Track Evolution and Motion

For a time sequence, use a consistent feature-identification and tracking
method. Track cell or cloud-system centers, echoes or anvils, growth and decay,
merges and splits, and changes in shape or intensity proxy. Distinguish motion
from the steering flow and from apparent motion caused by parallax, changing
scan geometry, or inconsistent feature definitions.

Estimate motion over multiple scans and report the method, time interval,
position uncertainty, and whether the feature was occluded or lost. A single
displacement between scans is not a reliable nowcast. If a forecast window is
short, say so and show the persistence or extrapolation assumption.

## Combine Radar and Satellite Carefully

Align the products in time and space before joining them. Radar can provide
precipitation structure, radial motion, and vertical echoes; satellite can
provide broad cloud shield, cloud-top context, anvils, and environmental
patterns. Their footprints, resolution, viewing geometry, and quality are not
identical.

Use a joint interpretation only when the evidence is complementary. For
example, a radar core beneath a rapidly developing cold cloud top can support a
convective-growth diagnosis, but it still does not establish surface hail or a
confirmed tornado. Preserve each source's quality mask and contribution in the
final result instead of collapsing them into an opaque score.

For multi-radar mosaics, resolve overlapping beams using a documented rule.
Never average dBZ values or velocity fields across sites without a physical and
quality-aware rule. A mosaic should show coverage and the selected source for
each pixel or cell.

## Quantify Uncertainty and Avoid Overclaiming

Remote-sensing interpretation has several uncertainty sources: beam geometry,
attenuation, parallax, threshold choice, temporal resolution, feature tracking,
instrument calibration, cloud microphysics, and incomplete coverage. When the
task is operational or safety-relevant, report the strongest alternative
interpretation and the observations that would distinguish it.

Use a bounded nowcast horizon and show how the result changes with alternate
motion, persistence, growth, or decay assumptions. Do not turn a qualitative
feature label into a precise probability without a calibration method. If the
images are too sparse, ambiguous, or poorly geolocated, report that the
feature is unconfirmed rather than filling the gap with narrative certainty.

## Examples

When asked whether a storm intensified over an hour, align successive radar
volumes and satellite scans, verify time and geolocation, and track one
consistent feature definition. Report measured reflectivity and cloud-top
changes separately from inferred intensification, include data gaps and
uncertainty, and do not infer surface hail from a cold cloud top alone.

For a suspected velocity couplet, inspect neighboring scans and available
elevation angles, confirm radial-velocity convention and dealiasing quality,
and call it a possible rotation signature unless the evidence supports a
stronger conclusion.

## Output Contract

Return a traceable analysis with:

1. the radar site or satellite platform, product, channel/moment, scan interval,
   region, and time range;
2. the preprocessing, calibration, geolocation, quality masking, and temporal
   alignment steps;
3. the observed feature locations, structure, motion, and evolution with the
   supporting pixels or beams identified;
4. a clear separation between direct measurements, derived indices, and
   meteorological interpretation;
5. uncertainty, alternative explanations, and coverage limitations;
6. figures or maps that preserve timestamps, color scales, units, and source;
7. provenance for the raw or materialized products and every derived artifact.

Avoid a report that says only "severe storm," "heavy rain," or "rapidly
developing convection" without a location, time, measured proxy, and evidence
beneath the label.

## Verification Checklist

- Radar site or satellite platform and product metadata are confirmed.
- Scan start/end time, retrieval time, and analysis time are distinct.
- Geolocation, projection, scale/offset, calibration, and quality flags are
  applied.
- Beam height, beam width, range, terrain, attenuation, and radar artifacts are
  considered where relevant.
- Satellite channel meaning, scan mode, daylight dependence, and parallax are
  considered.
- Radar and satellite claims remain separate unless their alignment and
  complementary evidence are explicit.
- Feature tracking uses multiple scans and reports its motion assumptions.
- Derived products include units, thresholds, coverage, and uncertainty.

## Security & Safety Notes

- Use only public or authorized radar and satellite products.
- Do not expose AWS credentials, signed URLs, private bucket names, tokens, or
  restricted provider metadata in reports or logs.
- Treat filenames, metadata, and product attributes as untrusted input; validate
  them before constructing paths or visualizations.
- Bound scan counts, image sizes, decoding concurrency, and generated artifact
  resolution.
- Preserve NOAA, NEXRAD, GOES, and other provider attribution and license terms.

## Common Pitfalls

- **The file creation time was used as measurement time:** A delayed or
  reprocessed product was placed at the wrong point in a storm timeline. Parse
  scan start and end time.
- **A cold cloud top became a hail claim:** An infrared proxy was treated as a
  direct hail measurement. State the proxy and supporting evidence.
- **Radar and satellite features did not line up:** Scan intervals, parallax,
  geolocation, or beam height were ignored. Align the observations first.
- **A reflectivity pixel became a rain rate:** A threshold or lookup relation
  was used without its assumptions and uncertainty. Keep the measured quantity
  separate from the estimate.
- **A storm “rapidly intensified” from two frames:** A gap, feature mismatch, or
  inconsistent threshold was mistaken for growth. Use a longer sequence and
  tracking evidence.
- **Radar mosaics hid artifacts:** Values were averaged across sites or a blocked
  beam was treated as a complete field. Retain quality and source information.

## Limitations

- Radar and satellite products are remote-sensing observations with sampling,
  calibration, attenuation, parallax, and coverage limitations.
- A single product cannot uniquely identify every convective or microphysical
  process.
- Historical gaps, instrument outages, scan strategy changes, and provider
  product changes cannot be repaired by interpretation alone.
- This skill does not retrieve products, perform numerical model comparison, or
  replace official warning and emergency-management guidance.

## Additional Resources

- [NOAA Radar Operations Center interface documents](https://www.roc.noaa.gov/wsr88d/BuildInfo/Files.aspx)
- [NOAA NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
- [NOAA GOES on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-goes/)
- [NOAA GOES-R documents](https://www.ospo.noaa.gov/resources/documents/goes-r.html)
