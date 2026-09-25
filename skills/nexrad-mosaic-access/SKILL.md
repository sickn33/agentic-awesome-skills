---
name: nexrad-mosaic-access
description: "Access official NOAA/NCEP MRMS radar and multisensor composites for a region and time; validate product, grid, domain, quality, timestamp, and provenance."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-25"
author: ShianMike
tags: [weather, nexrad, mrms, mosaic, qpe, vil, vii, mesh, composite-products]
tools: [claude, cursor, gemini, codex]
---

# NEXRAD Mosaic Access

## Overview

Retrieve an existing NOAA/NCEP Multi-Radar/Multi-Sensor (MRMS) product without
confusing it with a single NEXRAD volume or a locally constructed mosaic.
MRMS provides timestamped 2D radar-only and multisensor products for regional
analysis. Select the exact product, domain, time, and file before downloading,
then validate the decoded grid and provenance. This skill covers access to
existing MRMS products; it does not build a custom multi-radar composite.

Use `nexrad-product-access` when the user needs one radar site's Level II or
Level III data. Use this skill when the requested object is already a mosaic or
multisensor analysis such as QPE, VIL, VII, or MESH.

## When to Use This Skill

- Access an official NEXRAD-derived national or regional mosaic.
- Retrieve MRMS radar-derived or multisensor precipitation products.
- Access VIL, VII, MESH, or MultiSensor QPE for a specified UTC time.
- Obtain a completed product for mapping or analysis without downloading every
  contributing radar volume.
- Compare mosaic products while preserving product identity, generation time,
  domain, and grid metadata.

Do not use this skill for a single-site sweep, a Level II moment, or a custom
mosaic that must be constructed from several radars. Route those tasks to
`nexrad-product-access` or a dedicated mosaicking workflow.

## Official MRMS 2D Access

NOAA/NCEP exposes the 2D product archive at:

```text
https://mrms.ncep.noaa.gov/2D/
```

The public index includes directories such as:

```text
https://mrms.ncep.noaa.gov/2D/MultiSensor_QPE_01H_Pass1/
https://mrms.ncep.noaa.gov/2D/VIL/
https://mrms.ncep.noaa.gov/2D/VII/
https://mrms.ncep.noaa.gov/2D/MESH/
```

These are representative examples, not a complete product catalog. NOAA/NSSL
describes the MRMS suite as containing 100+ products; available products and
distribution formats vary by product, version, domain, and feed. Consult the
current [NOAA/NSSL MRMS overview](https://www.nssl.noaa.gov/projects/mrms/),
product guide, and live NCEP index rather than treating this short list as an
allowlist.

Directories can contain a convenience link such as
`MRMS_<Product>.latest.grib2.gz` and timestamped compressed GRIB2 files. Some
products may also have regional directories such as `CONUS`, `GUAM`, or
`CARIB`; verify the selected product directory rather than assuming a domain.

For reproducible analysis, prefer an exact timestamped file. Use the `latest`
link only for a live snapshot, then record the exact timestamp, URL, redirect
target if any, content length, and retrieval time.

## Choose the Composite Product

Do not select a directory from a color image or a familiar abbreviation alone.
Read the current product description and metadata enough to confirm:

- product name and version;
- whether it is radar-only, multisensor, gauge corrected, or analysis based;
- accumulation or integration period;
- valid or scan time semantics;
- update cadence and latency;
- spatial domain and grid;
- missing, no-data, and quality semantics;
- units, scale, and packed-data representation.

Important distinctions include:

- **QPE:** accumulated precipitation estimate, not a reflectivity image.
- **VIL:** vertically integrated liquid from radar structure, not surface rain
  rate or hail mass.
- **VII:** vertically integrated ice from radar structure, not total
  precipitation.
- **MESH:** maximum expected size of hail for the product interval, not the
  current cloud-top temperature or a verified hail observation.

Use the current product documentation to confirm exact meaning. Do not infer a
product from its directory name alone.

## Define the Mosaic Request

Record:

- exact MRMS product and version;
- national, regional, or other available domain;
- exact valid time or bounded historical interval;
- `latest` or timestamped-file policy;
- variables, units, accumulation period, and quality fields;
- desired geographic crop and output grid policy;
- maximum lookback, file-size limit, and acceptable latency;
- whether the product is being treated as official mosaic truth, an analysis
  input, or a comparison target;
- required provenance and artifact policy.

If the user requests one storm's single-radar structure, this is the wrong
skill. A mosaic is useful for broad coverage and regional products but can
obscure site-level vertical or velocity structure.

## Access Workflow

1. Open or list the documented product directory under `/2D/`.
2. Match the exact product, domain, and timestamp policy.
3. Select an exact timestamped compressed GRIB2 file for retrospective work.
4. For `latest`, follow the convenience link only after recording the final URL
   and resolving its timestamped identity.
5. Request file metadata with a bounded HTTP `HEAD` or equivalent read-only
   check when the server supports it.
6. Download to a request-owned temporary path without executing content from
   the server path.
7. Verify received size and a provider checksum when present; otherwise compute
   and record a local SHA-256.
8. Decompress the `.gz` into a new temporary `.grib2` file. Do not decompress in
   place over a shared cache entry.
9. Open the GRIB2 with a format-aware decoder and verify product, reference
   time, forecast or valid time, grid, variables, units, and missing values.
10. Promote the verified product and record its source identity.

Keep compressed bytes, decoded values, and any reprojected or cropped artifact
as separate stages with separate hashes or identities.

## Handle Latest and Historical Time Correctly

`latest` is a moving convenience name. A later request can return different
bytes even though its URL is unchanged. For analysis and publication:

- resolve `latest` to the actual timestamped file;
- record retrieval time and product valid or scan time separately;
- use the timestamped file for replay;
- do not use the `latest` URL as immutable provenance;
- report latency between product time and retrieval time.

If the directory contains multiple passes, revisions, or accumulation windows,
select the exact contract required by the task. Do not choose the newest file
merely because its name sorts last.

## Validate the Mosaic Grid

Before interpreting or plotting, verify:

- domain and expected geographic extent;
- projection or GRIB coordinate definition;
- x/y orientation and scan mode;
- latitude and longitude coordinates after decoding;
- cell size, dimensions, and row or column ordering;
- time coordinate, units, and interval semantics;
- no-data, missing, and quality values;
- packed scale and offset or other calibration;
- consistency with the product's documented grid contract.

Do not transpose, flip, or relabel a grid based on visual appearance alone. A
plausible-looking map can still be spatially reversed or attached to the wrong
time.

## Preserve Product and Measurement Meaning

An MRMS product is a processed estimate or analysis. Keep these distinctions
visible:

- radar reflectivity or velocity input versus accumulated precipitation;
- radar-only estimate versus gauge-corrected multisensor analysis;
- valid time versus product generation or file publication time;
- missing radar coverage versus a physical zero;
- official composite product versus locally interpolated or blended fields;
- analysis value versus uncertainty or quality metadata.

Do not label an official mosaic as ground truth. It is a provider product with
its own assumptions, coverage, latency, and quality limitations.

## Reliability and Cache Behavior

- Cache by product, domain, timestamped source URL, byte identity, and local
  checksum—not by `latest` or a friendly timestamp alone.
- Retry timeouts and transient server failures with bounded backoff and jitter.
- Honor service limits and avoid parallel directory-wide downloads.
- Keep partial compressed or decompressed files outside accepted cache entries.
- Publish a complete file atomically only after decoder validation.
- Remove request-owned temporary files after the final artifact and provenance
  record are durable; never delete a shared user cache as request cleanup.

For large regional or national products, check available disk space and memory
before download and decode. Crop only after validating the native grid unless
the source supports a documented range request that preserves the same bytes.

## Examples

For “the latest MRMS one-hour multisensor QPE over CONUS before a given UTC
time,” verify that the product/domain exists, choose a completed timestamp,
and record valid time separately from retrieval time. Decode the GRIB2 and
confirm accumulation units, grid orientation, and missing-value encoding
before mapping it.

For “show the latest MRMS VIL,” resolve `latest` to its timestamped file and
label the result as vertically integrated liquid, not surface rainfall.

## Return a Mosaic Access Record

```json
{
  "provider": "NOAA/NCEP MRMS",
  "product": "MultiSensor_QPE_01H_Pass1",
  "domain": "CONUS",
  "requested_time_utc": "2026-09-25T12:00:00Z",
  "selected_timestamped_url": "https://mrms.ncep.noaa.gov/2D/.../EXACT_FILE.grib2.gz",
  "retrieved_at_utc": "2026-09-25T12:03:14Z",
  "compressed_size_bytes": 12345678,
  "compressed_sha256": "HEX_DIGEST",
  "decoded_grid": {
    "dimensions": [WIDTH, HEIGHT],
    "projection": "DECODED CRS OR PRODUCT CRS",
    "time_semantics": "VERIFIED PRODUCT TIME"
  },
  "latest_used": false
}
```

Do not put a fabricated domain, grid, or time into this record. Omit unknown
fields or use `null` when the schema permits it.

## Verification Checklist

- Product, version, domain, and time contract are explicit.
- An official composite product is not confused with a single-site volume.
- Exact timestamped identity is recorded even when access starts from `latest`.
- Compressed bytes and decoded GRIB2 are validated separately.
- Product, reference time, valid time, grid, units, and missing values are
  verified after decoding.
- Radar, multisensor, gauge-corrected, or analysis semantics are preserved.
- Missing coverage is not converted to a physical zero.
- The final artifact and provenance identify the exact source file.

## Security & Safety Notes

- Use public or authorized MRMS resources only.
- Never execute or import content based only on a remote filename. Decode with
  explicit format-aware libraries and bounded resource use.
- Do not expose private endpoints, credentials, signed query strings, or tokens
  in records or logs.
- Validate product and domain values before constructing URLs; do not allow path
  traversal from untrusted input.
- Preserve NOAA/NCEP attribution and applicable data-use terms.

## Common Pitfalls

- **`latest` changed after the analysis:** A moving convenience link was stored
  as immutable provenance. Resolve and retain the timestamped file identity.
- **A missing-data region became zero:** The no-data sentinel was treated like a
  physical value. Apply and verify the product's missing-data contract.
- **A VIL image was called rainfall:** The processed quantity was relabeled.
  Preserve VIL as vertically integrated liquid.
- **A domain was assumed:** The requested regional directory may not exist for
  that product. Inspect the actual product directory.
- **A single radar became a mosaic:** A site product was labeled composite
  without combining or retrieving multiple contributions.
- **The map was flipped:** Grid orientation or scan mode was guessed from
  appearance. Validate decoded coordinate metadata.

## Limitations

- Product availability, version, directory layout, and update cadence can
  change. Verify current official documentation.
- An official mosaic does not expose every native Level II moment or sweep.
- Provider mosaics have their own quality, coverage, latency, and algorithmic
  limitations and are not direct observations.
- This skill accesses existing composites; it does not construct a custom
  multi-radar mosaic or perform meteorological verification.

## Additional Resources

- [NOAA/NCEP MRMS 2D product directory](https://mrms.ncep.noaa.gov/2D/)
- [NOAA/NSSL MRMS overview and product suite](https://www.nssl.noaa.gov/projects/mrms/)
- [MRMS VIL example directory](https://mrms.ncep.noaa.gov/2D/VIL/)
- [MRMS VII example directory](https://mrms.ncep.noaa.gov/2D/VII/)
- [MRMS MultiSensor QPE example directory](https://mrms.ncep.noaa.gov/2D/MultiSensor_QPE_01H_Pass1/)
- [NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
