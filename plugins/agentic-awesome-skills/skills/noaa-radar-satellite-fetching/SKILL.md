---
name: noaa-radar-satellite-fetching
description: "Retrieve NOAA NEXRAD and GOES products from public cloud archives using verified site, product, channel, sector, and scan-time selection."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-24"
author: ShianMike
tags: [weather, noaa, nexrad, goes, radar, satellite, aws-s3]
tools: [claude, cursor, gemini, codex]
---

# NOAA Radar and Satellite Fetching

## Overview

Retrieve NOAA NEXRAD radar and GOES satellite objects from public cloud
archives while preserving the product, platform, spatial sector, and scan-time
identity. Discover through narrow prefixes, choose by observation time rather
than upload time, and validate the downloaded scientific file before use.

This skill covers raw or provider-produced radar and satellite products. It
does not retrieve numerical model output or ordinary station observations.

## When to Use This Skill

- A task needs NEXRAD Level II archive volumes or real-time chunks.
- A task needs selected NEXRAD Level III products.
- GOES ABI, GLM, or another GOES-R product is needed for a time and region.
- A download must select the nearest completed scan within a tolerance.
- A public S3 key, satellite assignment, radar site, channel, or sector is
  uncertain or has changed.

Do not activate this skill merely to display a third-party map tile or to answer
a general weather question.

## Define the Product Contract

For NEXRAD, specify:

- Level II archive, Level II real-time chunks, or a named Level III product;
- four-character radar site, such as `KTLX`;
- desired scan time in UTC and nearest/previous/next selection policy;
- maximum time tolerance;
- full volume or exact product code;
- raw file retention and decoder.

For GOES, specify:

- physical satellite number or operational role, such as East or West;
- instrument and product level/short name;
- Full Disk, CONUS, Mesoscale 1, or Mesoscale 2 sector where applicable;
- ABI channel or derived product;
- desired scan time in UTC and tolerance;
- calibration form needed, such as radiance or brightness temperature.

Resolve an operational role to a physical satellite using current NOAA
documentation at request time. East and West assignments change over a
satellite program's lifetime.

## Current Public AWS Routes

Consult the AWS Registry of Open Data before hard-coding a bucket. As of this
skill's publication:

- NEXRAD Level II archive: `s3://unidata-nexrad-level2/`
- NEXRAD Level II real-time chunks: `s3://unidata-nexrad-level2-chunks/`
- selected NEXRAD Level III real-time data: `s3://unidata-nexrad-level3/`
- GOES imagery and metadata: satellite-specific buckets such as
  `s3://noaa-goes18/` and `s3://noaa-goes19/`

The former `noaa-nexrad-level2` bucket was deprecated and scheduled to become
unavailable on September 1, 2025. Do not copy that retired route from old
tutorials.

## Discover with Narrow Prefixes

NEXRAD Level II archive objects are organized by UTC date and site. GOES
objects are organized by product, year, day of year, and hour. List only the
smallest prefix that can contain the requested scan.

```bash
aws s3 ls --no-sign-request \
  s3://unidata-nexrad-level2/YYYY/MM/DD/KXXX/

aws s3 ls --no-sign-request \
  s3://noaa-goes19/ABI-L2-CMIPC/YYYY/DDD/HH/
```

Replace every placeholder with a validated value. Include the adjacent hour or
UTC day only when the time tolerance crosses that boundary. Paginate listings
and bound the total keys inspected.

Use real-time chunk buckets only when the consumer is designed to assemble and
validate chunks. Prefer completed archive volumes for ordinary historical or
post-event processing.

## Select by Scan Time

Object `Last-Modified` is publication metadata, not the measurement time.

- For NEXRAD, parse the site and scan timestamp from the documented object name,
  then confirm time and site from the decoded volume header.
- For GOES-R, filenames encode platform plus scan start (`s`), end (`e`), and
  creation (`c`) timestamps. Select by scan start or interval overlap, not file
  creation time.
- Default to the closest scan at or before the requested instant for a
  retrospective view. Allow a future scan only when the caller explicitly asks
  for nearest-in-either-direction behavior.
- Reject every candidate outside the stated tolerance.
- When sectors overlap, require the requested sector instead of choosing solely
  by time.

This standard-library helper extracts GOES-R scan timestamps without opening
the NetCDF payload:

```python
import re
from datetime import datetime, timezone
from pathlib import PurePosixPath


GOES_TIMES = re.compile(
    r"_s(?P<start>\d{14})_e(?P<end>\d{14})_c(?P<created>\d{14})"
)


def parse_goes_times(object_key):
    match = GOES_TIMES.search(PurePosixPath(object_key).name)
    if not match:
        raise ValueError(f"unrecognized GOES-R filename: {object_key}")

    def parse(value):
        return datetime.strptime(value, "%Y%j%H%M%S%f").replace(
            tzinfo=timezone.utc
        )

    return {name: parse(value) for name, value in match.groupdict().items()}
```

Treat filename parsing as discovery. After download, verify the corresponding
time coverage and platform attributes inside the file.

## Download and Validate

1. Record bucket, exact key, size, ETag, and `Last-Modified` before transfer.
2. Download to a request-owned temporary path. For public buckets, use unsigned
   S3 access rather than supplying credentials.
3. If the object might still be publishing, require stable metadata or pin a
   conditional request to the observed object identity.
4. Verify the received byte count and a provider checksum when one is supplied.
   Otherwise compute and record a local SHA-256 digest.
5. Open the object with an existing format-aware decoder.
6. Verify site/platform, product, scan interval, and expected dimensions or
   radar sweeps before renaming it into the cache.

Reuse an installed NEXRAD or NetCDF reader. Do not build a binary radar or
satellite decoder merely to fetch a file.

## Radar-Specific Checks

- Confirm that the radar site is the requested site and was operational at the
  scan time.
- Treat Level II volumes, real-time chunks, and Level III products as different
  contracts; they are not interchangeable encodings.
- Verify volume start time, end time when available, sweep count, moments, and
  elevation angles after decoding.
- Keep range folding, missing gates, quality masks, and velocity ambiguity
  explicit.
- A radar's nominal coverage radius does not guarantee useful low-level data at
  a location. Consider distance, beam height, terrain blockage, and outages.

## Satellite-Specific Checks

- Confirm the physical satellite, instrument, product short name, sector, scan
  mode, channel, and time coverage from NetCDF attributes.
- Do not treat ABI fixed-grid `x` and `y` coordinates as latitude and longitude.
  Use the file's geostationary projection metadata.
- Apply scale/offset, fill values, data-quality flags, and product-specific
  calibration according to NOAA documentation.
- A Mesoscale file is not identified only by its small dimensions; distinguish
  Mesoscale 1 and 2 explicitly.
- Do not blend files from different scan modes, sectors, satellites, or product
  levels without recording the transformation.

## Reliability, Cache, and Cleanup

- Cache by bucket, key, and object identity, not a friendly timestamp alone.
- Retry timeouts, `408`, `429`, and transient `5xx` responses with bounded
  backoff and jitter.
- Bound time tolerance, adjacent-hour listings, pagination, concurrency, and
  disk usage.
- Keep partial downloads separate from valid cache entries.
- Use event notifications for continuous real-time ingestion when appropriate;
  do not repeatedly scan broad prefixes.
- For a one-shot image or export, delete request-owned raw objects in `finally`
  only after the final artifact and provenance manifest are durable.
- Never delete a shared user cache as request cleanup.

## Verification Checklist

- The source bucket is current and documented by NOAA or its data distributor.
- Radar site or physical satellite and operational role are explicit.
- Product level, code/short name, sector, channel, and scan mode match the
  request.
- The selected scan satisfies the direction policy and maximum time tolerance.
- Object size and identity match the downloaded bytes.
- The format-aware decoder opens the file and confirms internal metadata.
- Geolocation uses the product's real coordinate reference system.
- Temporary data cleanup preserves the requested artifact and manifest.

## Security & Safety Notes

- Fetch only public data or resources the user is authorized to access.
- Never embed AWS credentials, signed URLs, private endpoints, or notification
  subscription tokens in code or logs.
- Keep TLS verification enabled; `--no-sign-request` does not disable TLS.
- Validate site, product, channel, sector, and time inputs against allowlists
  before constructing object prefixes or local paths.
- Bound response size and available disk space before downloading high-rate
  radar or satellite streams.
- Preserve NOAA attribution and do not imply NOAA endorsement.

## Common Pitfalls

- **Old NEXRAD examples return no data:** They reference the retired Level II
  bucket. Resolve the current bucket from the registry.
- **The right minute shows the wrong image:** Creation time was used instead of
  scan start/end time.
- **GOES East points to the wrong bucket:** An operational role was hard-coded
  to a satellite number. Resolve the assignment for the requested date.
- **The map is displaced:** Fixed-grid scan angles were treated as geographic
  coordinates. Apply the geostationary projection.
- **A real-time radar volume will not decode:** Individual chunks were treated
  as a completed archive volume. Assemble and validate them or use the archive.

## Limitations

- Buckets, satellite assignments, product availability, scan modes, and naming
  conventions can change; verify current official documentation.
- This skill retrieves source products but does not guarantee meteorological
  suitability, perform mosaicking, or implement scientific calibration.
- Historical gaps and instrument or site outages cannot be repaired by provider
  fallback.

## Additional Resources

- [NEXRAD on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-nexrad/)
- [NOAA GOES on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-goes/)
- [NOAA GOES-R documents](https://www.ospo.noaa.gov/resources/documents/goes-r.html)
- [NOAA STAR guide to satellite filenames](https://www.star.nesdis.noaa.gov/atmospheric-composition-training/satellite_data_decoding_data_file_names.php)
- [NOAA Radar Operations Center interface documents](https://www.roc.noaa.gov/wsr88d/BuildInfo/Files.aspx)
