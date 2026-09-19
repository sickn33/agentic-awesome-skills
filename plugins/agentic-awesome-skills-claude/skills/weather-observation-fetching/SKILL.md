---
name: weather-observation-fetching
description: "Retrieve surface and upper-air weather observations from authoritative APIs and archives with station identity, time, units, and quality flags preserved."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-19"
author: ShianMike
tags: [weather, observations, metar, radiosonde, noaa, quality-control]
tools: [claude, cursor, gemini, codex]
---

# Weather Observation Fetching

## Overview

Retrieve measured surface and upper-air weather reports without losing station
identity, observation time, units, raw values, or provider quality flags. Pick
the source by observation type and retention need, then validate the returned
records before normalization.

This skill covers METARs, historical surface observations, radiosondes, and
station metadata. It excludes model output, radar volumes, and satellite
imagery.

## When to Use This Skill

- A task needs recent METAR observations for named stations or a small region.
- Historical hourly or synoptic surface data is needed from NOAA NCEI.
- A sounding workflow needs observed radiosonde profiles rather than model
  profiles.
- Station identifiers, relocations, instruments, or metadata must be resolved.
- A fetch returned duplicate, stale, unit-ambiguous, or quality-flagged values.

Do not use forecast products as observations, and do not substitute a nearby
model grid point for a missing station report without explicit approval.

## Choose the Source

| Need | Preferred source | Notes |
| --- | --- | --- |
| Recent aviation surface reports | NOAA Aviation Weather Center Data API | Query a small station/time set; use published cache files for bulk current data. |
| Historical global surface reports | NOAA NCEI Integrated Surface Database (ISD) | Preserve USAF/WBAN identity, units, and QC fields. |
| Historical or recent radiosondes | NOAA NCEI IGRA | Use the station inventory and retain level and QC metadata. |
| Station history and identifier changes | NOAA NCEI station history/HOMR | Resolve moves, renames, and observing-platform changes. |

Prefer an existing project adapter when it already handles the provider's
schema, retries, and cache. Record the exact endpoint or archive object used.

## Define the Observation Request

Resolve these values before fetching:

- observation type and variables;
- station identifier system, not just the identifier string;
- start and end instants in UTC, including interval inclusivity;
- maximum acceptable observation age;
- raw, decoded, or both output forms;
- required quality flags and policy for rejected values;
- output units and missing-value representation;
- cache location and retention.

For spatial queries, also define the search geometry, distance limit, and how a
station is selected. Return the selected station and distance rather than
silently using the nearest report.

## Fetch Recent METARs

The Aviation Weather Center exposes machine-readable METAR data under
`/api/data/metar`. Send a descriptive user agent, keep the query narrow, and
handle a valid `204 No Content` separately from an error.

```python
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def fetch_metars(stations, hours=2):
    station_ids = sorted({station.strip().upper() for station in stations})
    if not station_ids or any(len(station) != 4 for station in station_ids):
        raise ValueError("use one or more four-character ICAO station IDs")
    if not 1 <= hours <= 24:
        raise ValueError("hours must be between 1 and 24 for this narrow query")

    query = urlencode({
        "ids": ",".join(station_ids),
        "format": "json",
        "hours": hours,
    })
    request = Request(
        f"https://aviationweather.gov/api/data/metar?{query}",
        headers={"User-Agent": "weather-observation-fetching/1.0 contact@example.org"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            if response.status == 204:
                return []
            records = json.load(response)
    except HTTPError as exc:
        if exc.code == 429:
            raise RuntimeError("AWC rate limit reached; honor Retry-After") from exc
        raise

    if not isinstance(records, list):
        raise RuntimeError("unexpected METAR response shape")
    return records
```

Replace the example contact address with an appropriate project contact. For a
large current snapshot, download the provider's compressed cache file once
instead of issuing many station queries.

## Fetch Historical Surface Data

For ISD:

1. Resolve the station using the current station inventory and its USAF/WBAN
   identifiers.
2. Confirm that the station's coverage overlaps the requested time range.
3. Use bulk HTTPS files for a large historical request; avoid one network call
   per observation.
4. Preserve the original report and source/QC codes before converting units.
5. Treat trace values, missing sentinels, and calm or variable winds according
   to the data format documentation.
6. Join station metadata by both identifier and effective date when station
   history matters.

Do not assume one station identifier always represents an unchanged location or
instrument throughout its archive.

## Fetch Radiosonde Profiles

For IGRA:

1. Search the station inventory by identifier or location and verify the
   station's record period.
2. Fetch the station file covering the requested dates rather than scraping an
   interactive page.
3. Select by the report's UTC time and retain nominal, launch, and release times
   when the source supplies them.
4. Preserve pressure, height, temperature, moisture, wind, level type, and QC
   fields. Standard and significant levels are both scientifically relevant.
5. Sort the profile only after parsing; do not invent levels or interpolate
   across large gaps during acquisition.
6. Report an absent launch or incomplete profile explicitly.

Many upper-air stations usually report near 00 and 12 UTC, but the archive is
the authority. Do not manufacture a schedule or select a different day solely
because a nominal time is missing.

## Normalize Without Erasing Provenance

Each normalized record should retain:

- provider and dataset;
- station identifier plus identifier scheme;
- station latitude, longitude, elevation, and metadata effective date;
- observation time in UTC and, when available, receipt or ingestion time;
- raw report or raw archive row;
- decoded values with explicit units;
- provider quality flags and local QC decisions;
- retrieval time, source URL/object, and response identity.

Store original and converted values side by side when a conversion could affect
rounding. Never use the HTTP `Last-Modified` timestamp as the observation time.

## Quality Control and Deduplication

- Treat provider flags as data, not decoration. Define which flags are accepted,
  rejected, or retained with warnings.
- Deduplicate on provider identity, station, observation time, and report type.
  When corrected reports exist, preserve the correction lineage.
- Check physical ranges only after handling missing and trace encodings.
- Verify wind direction conventions, temperature scales, pressure units, and
  precipitation accumulation periods before combining sources.
- Keep station time, observation time, and ingestion time distinct.
- Flag stale reports against the request's maximum age rather than returning
  them as current conditions.

## Reliability and Caching

- Honor provider request limits, `Retry-After`, and published bulk-download
  guidance.
- Retry timeouts, `408`, `429`, and transient `5xx` failures with bounded
  backoff and jitter.
- Cache immutable archive files by URL/object identity and current API responses
  for no longer than their update cadence permits.
- Write downloads to a temporary path, validate content and expected date range,
  then rename atomically.
- Keep partial files separate from accepted cache entries.
- For one-shot processing, remove request-owned temporary observations in
  `finally` only after the derived artifact and provenance record are durable.

## Verification Checklist

- The station identifier scheme and station metadata are explicit.
- All selected observations fall inside the requested UTC interval.
- The report time, receipt time, and retrieval time are not conflated.
- Units, missing sentinels, trace values, and QC flags are handled explicitly.
- Raw reports or rows remain available for audit.
- Duplicate and corrected reports follow a documented rule.
- A no-data response is distinguished from provider failure.
- The final result reports stale, incomplete, or rejected observations.

## Security & Safety Notes

- Use only public endpoints or data the user is authorized to access.
- Do not place API keys, credentials, signed URLs, or private station data in
  examples, logs, caches, or provenance manifests.
- Keep TLS certificate verification enabled.
- Encode query parameters rather than concatenating untrusted station input into
  a URL.
- Bound station count, time span, response size, retries, and parallelism.
- Follow provider terms, rate limits, and attribution requirements.

## Common Pitfalls

- **The latest METAR is old:** The station has not reported recently. Apply the
  maximum-age contract and report staleness.
- **A station lookup returns the wrong site:** ICAO, WMO, USAF/WBAN, and IGRA
  identifiers were treated as interchangeable. Preserve the identifier scheme.
- **Temperatures look extreme:** Missing sentinels or units were converted as
  real values. Parse format metadata before unit conversion.
- **A sounding has too few levels:** Only mandatory levels were retained or the
  launch was incomplete. Preserve significant levels and surface data.
- **An archive record moved:** Station history changed. Join metadata by its
  effective period and record the selected version.

## Limitations

- Provider schemas, retention windows, station inventories, and usage limits can
  change; consult current official documentation.
- Quality flags identify known conditions but do not guarantee that a
  measurement is scientifically suitable for a particular analysis.
- This skill does not perform radar retrieval, satellite retrieval, model-data
  fetching, or forecast verification.

## Additional Resources

- [NOAA Aviation Weather Center Data API](https://aviationweather.gov/data/api/)
- [NOAA NCEI Integrated Surface Database](https://www.ncei.noaa.gov/products/land-based-station/integrated-surface-database)
- [NOAA NCEI Integrated Global Radiosonde Archive](https://www.ncei.noaa.gov/products/weather-balloon/integrated-global-radiosonde-archive)
- [NOAA NCEI station histories](https://www.ncei.noaa.gov/products/land-based-station/station-histories)
