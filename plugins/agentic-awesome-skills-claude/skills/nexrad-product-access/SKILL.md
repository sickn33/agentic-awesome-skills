---
name: nexrad-product-access
description: "Discover and access NEXRAD data for a selected radar site, time, product, or Level II moment using completed archive volumes, real-time chunks, or supported Level III sources with metadata validation."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-25"
author: ShianMike
tags: [weather, nexrad, level-ii, level-iii, radar-products, single-site, aws-s3]
tools: [claude, cursor, gemini, codex]
---

# NEXRAD Product Access

## Overview

Select and retrieve the correct NEXRAD data for one radar site, UTC time, and
requested product or Level II moment. Keep archive volumes, real-time chunks,
and Level III products distinct because they have different availability and
decoding contracts.

Use `noaa-radar-satellite-fetching` for common NOAA archive discovery and
download mechanics when that skill is available. This skill provides the
NEXRAD-specific Level II/III selection contract. Use
`nexrad-mosaic-access` when the requested result is a precomputed multi-radar
composite rather than one site's data.

## When to Use This Skill

- Fetch a completed NEXRAD Level II volume from the historical archive.
- Follow or assemble real-time Level II chunks for a named site.
- Retrieve selected real-time Level III products or use an operational Level
  III feed.
- Select a product such as reflectivity, velocity, spectrum width, echo top,
  vertically integrated liquid, or a supported dual-polarization product.
- Select a particular Level II moment, elevation sweep, or volume interval.
- Restrict access to one radar site and reject composite or neighboring-site
  data.

Do not turn a Level II moment name into a Level III product code by assumption.
The two levels have different processing and distribution contracts.

## Current Public NEXRAD Resources

The current NEXRAD-on-AWS registry documents these public resources in
`us-east-1`:

| Need | Resource | Contract |
| --- | --- | --- |
| Historical completed Level II volumes | `s3://unidata-nexrad-level2/` | Archive volumes organized by UTC date and site. |
| Real-time Level II chunks | `s3://unidata-nexrad-level2-chunks/` | Chunks that must be assembled and validated as volumes. |
| Selected real-time Level III data | `s3://unidata-nexrad-level3/` | Selected Level III products, not a promise of a complete historical archive. |

Unidata documentation also describes operational Level III distribution through
the `NEXRAD3` LDM/NOAAPort feed. Resolve the current source for the requested
Level III product instead of assuming that a real-time S3 bucket is a complete
archive.

The current AWS registry identifies `unidata-nexrad-level2` as the archive and
says the former `noaa-nexrad-level2` bucket was deprecated after September 1,
2025. Verify the live registry before access because provider resources can
change.

## Define the Access Contract

Resolve and record:

- one four-character NEXRAD site such as `KTLX`;
- the requested instant or bounded interval in UTC;
- nearest-at-or-before, nearest-in-either-direction, or interval-overlap policy;
- data level: Level II, Level III, or an explicitly mixed workflow;
- product or moment, unit, sweep or scan angle, and whether all sweeps or the
  lowest requested sweep are needed;
- archive, real-time, or operational-feed source;
- maximum lookback, maximum probes, and acceptable latency;
- required metadata, quality masks, and output form;
- whether the product must come from that one site only.

If the user supplies only a display concept such as “base reflectivity,”
resolve it against a current official product or Level II moment definition.
Do not guess a Level III code or claim that every named display is available in
the same feed.

## Access Historical Level II Volumes

1. Validate the site against an allowlist or a current NEXRAD site inventory.
2. Resolve the exact UTC day and site prefix from current dataset
   documentation. Do not infer the key layout from a filename example.
3. List only that documented prefix, paginating within a bounded key count.
4. Parse the documented volume timestamp and site from each candidate key.
5. Select by the time policy, then request metadata for the exact key.
6. Require a nonzero stable object. If publication may still be occurring,
   repeat the metadata check until size and object identity remain unchanged.
7. Download to a temporary path, verify received bytes, compute a local
   SHA-256 when provenance requires it, and open with a format-aware reader.
8. Verify the decoded site, volume start/end time, sweeps, moments, dimensions,
   and quality fields before promoting the file into a valid cache entry.

The archive is the preferred source for retrospective work because each object
is a completed volume. Do not substitute a real-time chunk for an archive volume
when the consumer expects a self-contained volume.

## Access Real-Time Level II Chunks

Treat each chunk as a fragment with ordering and completion dependencies.

1. Resolve the current chunk prefix for the requested site.
2. Parse volume and chunk identity from documented key fields.
3. Discover the complete chunk sequence with a bounded lookback.
4. Verify required chunks, byte identities, and scan metadata.
5. Assemble into a new temporary file without overwriting the source chunks.
6. Decode the assembled object and verify site, volume time, sweep count,
   moments, and quality fields.
7. Publish the verified volume atomically and record which chunks formed it.

If a chunk is late, duplicated, discontinuous, or from another site, reject or
quarantine the sequence. A file that opens without proving complete volume
metadata is not a verified replacement for an archive volume.

## Select Level II Moments and Sweeps

Level II exposes moments within a volume rather than independent Level III
display products. Depending on the radar configuration and volume, common
moments can include reflectivity, velocity, spectrum width, and supported
dual-polarization quantities.

Before extraction, record:

- the exact moment name used by the decoded file;
- its calibrated physical unit and scale or offset;
- the elevation-angle policy and actual beam height at the display range;
- the quality fields for range folding, clutter, dealiasing, or invalid gates;
- whether the output requires all sweeps, a nearest sweep, or a sweep search
  based on target height.

Do not assume that a moment is present in every volume or at every sweep.
Report an absent moment or incomplete sweep rather than converting a different
moment into its place.

## Access Level III Products

Level III is a processed radar product with its own product code, scan strategy,
projection, resolution, and update cadence. Resolve the official current code
and source for the requested semantic product.

For selected real-time data, inspect only the documented Level III prefix for
the site and time window. For broader operational access, use a current LDM or
NOAAPort product feed that explicitly carries the requested NEXRAD3 product.

After retrieval, verify:

- site or coverage area;
- product code and product description;
- observation or scan time;
- projection, dimensions, and data level;
- units, scale/offset, missing values, and quality flags;
- whether the product is a single-site, sector, or multi-site product.

Never decode a Level III file using a Level II volume contract. Never label a
single-site Level III product as a mosaic merely because several scans or pixels
are present.

## Examples

For a request such as “Get the latest completed KTLX Level II volume before
2026-09-25 12:00 UTC,” state the site, cutoff, selection policy, archive
source, and selected volume time. Retrieve that exact object, then confirm the
decoded volume reports KTLX and the expected scan interval before handing it
to a plotting or analysis step.

For “KTLX base reflectivity,” resolve whether the request means the Level II
reflectivity moment or a Level III processed product. Report the chosen level,
moment/product identifier, sweep, units, and observed scan time.

## Return an Access Record

Return a structured record before decoding begins:

```json
{
  "site": "KTLX",
  "requested_time_utc": "2026-09-25T12:00:00Z",
  "selection_policy": "nearest-at-or-before",
  "selected_time_utc": "2026-09-25T11:59:54Z",
  "data_level": "Level II",
  "product_or_moment": "REF",
  "source": "s3://unidata-nexrad-level2/EXACT_DOCUMENTED_KEY",
  "object_identity": {
    "etag": "OPAQUE_IDENTITY",
    "last_modified": "2026-09-25T12:01:02Z",
    "size_bytes": 12345678
  },
  "single_site_required": true
}
```

Also record rejected candidates, unavailable products, chunk dependencies, and
the rule that prevented cross-site or cross-product substitution.

## Verification Checklist

- The four-character site and site inventory entry are validated.
- All timestamps are UTC and the scan-selection policy is explicit.
- The source matches the requested level and product or moment.
- Historical access uses completed Level II archive volumes when appropriate.
- Real-time chunks are assembled into a verified complete volume.
- Level III products are resolved through a documented current source.
- Decoded metadata confirms site, time, product, dimensions, and quality fields.
- No result from another site or product is silently substituted.
- Source identity, local hash, and retrieval time are recorded when required.

## Security & Safety Notes

- Use public or authorized NEXRAD resources only.
- Do not embed cloud credentials, signed URLs, tokens, or private endpoint
  details in records or logs.
- Treat site identifiers, product names, metadata, and object keys as untrusted
  input when constructing paths or commands.
- Bound prefix width, pagination, time lookback, response size, concurrency, and
  disk use.
- Preserve NOAA, NEXRAD, Unidata, and source-provider attribution and license
  terms.

## Common Pitfalls

- **The old bucket returned no data:** A tutorial used the deprecated
  `noaa-nexrad-level2` route. Resolve the current archive from the live AWS
  registry.
- **A real-time file would not decode:** Individual chunks were treated as a
  completed volume. Assemble and validate the full sequence first.
- **The product selector guessed the wrong item:** A display name was converted
  to an assumed Level III code. Resolve a current official product definition.
- **A reflectivity request returned velocity:** Product or moment identity was
  not carried through decoding and extraction.
- **The latest run was silently older:** Candidate time and tolerance were not
  recorded. Return the selected time and rejected candidates.
- **Data from a neighboring radar appeared:** A regional key search ignored the
  single-site contract. Filter and validate by exact site identity.

## Limitations

- Availability, feed contents, product definitions, and archive retention can
  change. Verify current official documentation.
- The selected real-time Level III resource is not a complete historical
  archive contract.
- Accessing a file does not prove that its coverage is scientifically suitable
  at a requested location; beam height, terrain, range, and quality still matter.
- Multi-radar composite access belongs in `nexrad-mosaic-access`.
- Scientific interpretation belongs in `radar-satellite-analysis`.

## Additional Resources

- [NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
- [NOAA ROC Level II data types](https://www.roc.noaa.gov/level-two-data-types.php)
- [NOAA ROC Level III data types](https://www.roc.noaa.gov/level-three-data-types.php)
- [Unidata LDM feeds](https://unidata.github.io/awips2/edex/ldm/)
- [Unidata GEMPAK NIDS products](https://unidata.github.io/gempak/man/prog/gpnids.html)
