---
name: weather-model-data-fetching
description: "Retrieve numerical weather prediction data from public AWS S3 and HTTP archives using GRIB2 inventories, byte ranges, Herbie, provider fallbacks, and verified caching."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-18"
author: ShianMike
tags: [weather, grib2, aws-s3, herbie, noaa, nwp]
tools: [claude, cursor, gemini, codex]
---

# Weather Model Data Fetching

## Overview

Fetch numerical weather prediction data without treating a multi-gigabyte GRIB2
file as one indivisible download. Prefer an existing project adapter or Herbie;
use direct object-store byte ranges only when the supported path cannot express
the request.

This skill covers transport, inventory selection, caching, and verification. It
does not interpret the forecast or decide whether a model is meteorologically
appropriate.

## When to Use This Skill

- A task needs GFS, GEFS, HRRR, RAP, NAM, IFS, or similar model output.
- Data lives in a public AWS S3 bucket, NOMADS, or a public cloud mirror.
- The input is GRIB2 and only selected variables or levels are needed.
- A point, sounding, time series, map, or batch job needs a reliable fetch path.
- A download is missing, partial, unexpectedly large, slow, or hard to resume.

Do not activate this skill for ordinary weather-forecast questions that do not
require model files.

## Define the Request First

Resolve these values before downloading:

- model and product;
- initialization cycle in UTC;
- forecast hour and therefore valid time (`valid = initialization + lead`);
- ensemble member when applicable;
- variables, vertical levels, and surface fields;
- point, region, or full-grid output;
- cache location and when the downloaded data may be deleted.

Confirm that the cycle is complete, the forecast hour exists for that cycle,
and the requested location is inside the model domain. A recent `404` often
means the cycle is not published yet; step back to a completed cycle instead of
retrying indefinitely.

## Choose the Smallest Retrieval Route

1. Reuse the project's existing fetch/cache abstraction when it already handles
   the model.
2. Use Herbie for a supported GRIB2 model. It discovers AWS, NOMADS, Google,
   Azure, and other configured sources and understands their key layouts.
3. Use a provider-native point or Zarr endpoint when the task needs a tiny
   spatial slice from many times or members.
4. Use direct S3 or HTTPS object access when the key is known and no suitable
   adapter exists.

Do not recursively list a large public bucket to discover one run. Build the
documented prefix for the model, cycle, product, forecast hour, and member, then
probe that exact object and its inventory.

Use an explicit provider priority and record the provider that succeeded. A
fallback must refer to the same model run, product, member, and forecast hour;
never silently substitute a different forecast.

## Subset GRIB2 by Inventory

GRIB2 files contain consecutive messages. A companion inventory such as
`.idx`, `.grib2.idx`, or `.grb2.inv` records each message's starting byte.

1. Fetch the small inventory first.
2. Inspect its actual rows before writing a regex.
3. Select exact variables, levels, and forecast-step records.
4. Set each selected message's end byte to one less than the next message's
   start; request the final selected message through EOF when no end is known.
5. Coalesce adjacent selected messages into one range.
6. Issue one `Range: bytes=START-END` request per range. S3 does not support
   multiple ranges in one `GetObject` request.
7. Require `206 Partial Content` and a matching `Content-Range`. If a server
   answers `200`, do not append the whole object as though it were a fragment.
8. Pin the object's length and identity (`ETag` and/or `Last-Modified`) while
   downloading. Discard fragments if the object changes.
9. Assemble into a temporary file, verify it with a GRIB decoder, then rename
   atomically into the cache.

A GRIB message contains one field over its grid. Message-range subsetting saves
variables and levels, not geography. A point request still downloads the full
grid for every selected message unless the provider offers a point, regional,
Zarr, or other chunked endpoint.

## Herbie Example

Use the current `search` argument; `searchString` is deprecated. Start from the
inventory, fail on an empty match, and keep the download directory explicit.

```python
from pathlib import Path

from herbie import Herbie

PRESSURE_FIELDS = (
    r":(?:HGT|TMP|RH|SPFH|UGRD|VGRD):\d+(?:\.\d+)? mb:"
)


def fetch_hrrr_pressure_run(initialization, forecast_hour, cache_dir):
    cache_dir = Path(cache_dir)
    h = Herbie(
        initialization,
        model="hrrr",
        product="prs",
        fxx=forecast_hour,
        priority=["aws", "nomads", "google", "azure"],
        save_dir=cache_dir,
        verbose=False,
    )

    selected = h.inventory(PRESSURE_FIELDS)
    if selected.empty:
        raise RuntimeError("inventory matched no pressure-level fields")

    downloaded = h.download(PRESSURE_FIELDS, errors="raise")
    path = Path(downloaded) if downloaded is not None else None
    if path is None or not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError("GRIB2 subset was not materialized")

    return path, {
        "model": h.model,
        "product": h.product,
        "initialization": h.date.isoformat(),
        "forecast_hour": h.fxx,
        "valid_time": h.valid_date.isoformat(),
        "provider": h.grib_source,
        "remote_object": str(h.grib),
        "messages": len(selected),
    }
```

For xarray output, call `h.xarray(search, ...)` and handle either one
`xarray.Dataset` or a list of incompatible GRIB hypercubes. Merge only groups
whose coordinates and dimensions are compatible, and close every dataset when
finished.

## Public AWS S3 Diagnostics

NOAA Open Data buckets allow unsigned reads. `--no-sign-request` prevents the
AWS CLI from loading credentials; it does not disable TLS verification.

```bash
aws s3 ls --no-sign-request s3://noaa-hrrr-bdp-pds/hrrr.YYYYMMDD/conus/

aws s3api get-object --no-sign-request \
  --bucket noaa-hrrr-bdp-pds \
  --key "hrrr.YYYYMMDD/conus/hrrr.tHHz.wrfprsfFF.grib2" \
  --range "bytes=START-END" fragment.grib2
```

Use these commands to inspect a documented public object or reproduce one
known range. For normal multi-message assembly, reuse Herbie or the project's
tested downloader instead of scripting binary concatenation in shell.

## Complete Sounding Contract

A pressure-level file alone may not contain a usable surface row. Before
building a vertical profile, require:

- all published isobaric levels for geopotential height, temperature, a
  moisture variable (dew point, relative humidity, or specific humidity), and
  U/V wind;
- surface pressure and terrain or surface height;
- 2 m temperature and moisture;
- 10 m U/V wind.

Some providers split pressure and surface fields into separate products. Fetch
and join the companion product from the same run, or reject the request with a
list of missing fields. Do not fabricate a ground row or silently reduce the
profile to a short mandatory-level list.

After decoding, sort pressure monotonically, remove duplicate levels, normalize
units and longitude conventions, and run the consuming project's profile QC.

## Point and Batch Extraction

- On one-dimensional latitude/longitude grids, labeled nearest selection may be
  sufficient.
- On projected or curvilinear grids with two-dimensional coordinates, use the
  project's model-aware nearest-cell routine; verify the selected latitude,
  longitude, and distance.
- For many points from one model hour, fetch and decode once, then reuse it.
- For many hours, members, or regional slices, compare the GRIB route with a
  chunked Zarr or provider-native endpoint before scaling up.

## Reliability, Cache, and Cleanup

- Cache by provider, object key, object identity, and field selection. A
  filename alone is not enough provenance.
- Retry timeouts, `408`, `429`, and transient `5xx` responses with bounded
  exponential backoff and jitter; honor `Retry-After`.
- Do not retry permission errors, malformed inventories, or impossible model
  coordinates as transient failures.
- Bound concurrency. More range workers can increase throttling and make
  cancellation slower.
- Keep partial files separate from valid cache entries and resume only when the
  remote object identity still matches.
- For a one-shot render or export, isolate data in a request-specific temporary
  directory and remove it in `finally` after the derived artifact is durable.
- For an interactive viewer, retain data until the final consumer closes. Never
  delete a shared user cache as request cleanup.

Measure discovery, inventory, transfer, decode, point extraction, and rendering
separately. A slow end-to-end request is not evidence that GRIB decoding is the
bottleneck.

## Verification Checklist

- The resolved initialization time, forecast hour, valid time, product, and
  member match the request.
- The selected inventory is nonempty and contains every required field/level.
- The response status, byte ranges, lengths, and object identity are consistent.
- The final file is nonempty and opens with the intended GRIB decoder.
- Decoded variables, units, level count, grid coordinates, and valid time are
  plausible and explicit.
- A point result reports the actual selected grid coordinate.
- Cancellation leaves no file that can be mistaken for a complete cache hit.
- Cleanup preserves the requested final artifact and removes only data owned by
  that request.

## Security & Safety Notes

- Fetch only public datasets or resources the user is authorized to access.
- Do not put cloud credentials in code, URLs, logs, examples, or skill files.
- Keep certificate verification enabled; never solve TLS errors with
  `--no-verify-ssl`.
- Validate inventory-derived ranges against the remote object length before
  allocating buffers or writing files.
- Bound requested cycles, members, forecast hours, concurrency, disk usage, and
  retries before a large batch.
- Follow provider usage policies and preserve required dataset attribution.

## Common Pitfalls

- **No data for the newest run:** The cycle is still publishing. Use the newest
  completed cycle and report the fallback.
- **Subset is as large as the full file:** The inventory was missing, the regex
  was too broad, or the server ignored `Range`.
- **xarray returns a list:** The selected messages form multiple incompatible
  hypercubes. Process them separately or merge only compatible groups.
- **Point extraction is still expensive:** GRIB message ranges are not spatial
  chunks. Use a point/regional service or Zarr when available.
- **A cached file opens but has missing fields:** Validate the inventory contract
  and object identity before accepting a cache hit.

## Limitations

- Provider key layouts, retention windows, model schedules, and Herbie templates
  can change; verify them against current provider documentation.
- Variable subsetting requires a usable remote inventory. Without one, download
  the full object or use a different provider.
- This skill does not validate forecast skill, scientific suitability, or
  proprietary-provider credentials and quotas.

## Additional Resources

- [Herbie documentation](https://herbie.readthedocs.io/)
- [Herbie source and model templates](https://github.com/blaylockbk/Herbie)
- [NOAA fast GRIB2 downloads with inventories](https://nomads.ncep.noaa.gov/info.php?page=fastdownload)
- [Amazon S3 `GetObject` byte ranges](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)
- [NOAA HRRR on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-hrrr-pds/)
- [NOAA GFS on the AWS Registry of Open Data](https://registry.opendata.aws/noaa-gfs-bdp-pds/)
