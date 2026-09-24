---
name: weather-model-run-discovery
description: "Resolve the newest complete numerical weather prediction cycle and forecast objects across provider mirrors without downloading full payloads."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-24"
author: ShianMike
tags: [weather, nwp, model-cycle, aws-s3, nomads, herbie]
tools: [claude, cursor, gemini, codex]
---

# Weather Model Run Discovery

## Overview

Resolve a numerical weather prediction run before downloading model fields.
Probe exact objects or narrow prefixes, verify a request-specific completion
contract, and return the newest qualifying initialization with its source
metadata.

This skill decides *which run and objects exist*. Use
`weather-model-data-fetching` afterward to transfer or subset the data.

## When to Use This Skill

- An application needs the newest usable GFS, GEFS, HRRR, RAP, NAM, or similar
  model cycle.
- The nominal latest cycle returns `404`, has only early forecast hours, or is
  still changing.
- Equivalent AWS, NOMADS, Google, Azure, or other mirrors must be compared
  without silently mixing runs.
- A scheduled job needs a bounded fallback to an older complete cycle.
- The resolved run and provider must be recorded for later reproduction.

Do not activate this skill when the initialization is already fixed or when the
task is to download, decode, or interpret model variables.

## Define Complete Before Probing

Collect the following request contract:

- model, domain, product, and ensemble member;
- legal UTC cycle hours and cycle interval;
- required forecast hours;
- required companion objects, such as pressure and surface products;
- required inventory or index sidecars;
- provider priority and whether cross-provider fallback is allowed;
- maximum lookback, maximum probes, and freshness requirement.

A run is complete only when every sentinel required by the consumer exists.
Examples include:

- one product at one forecast hour for a single-image job;
- both pressure-level and surface files for a sounding;
- the terminal forecast hour needed by a time series;
- every required member for an ensemble statistic.

The presence of forecast hour zero does not prove that a run is complete.

## Discovery Workflow

1. Normalize the current time and all candidate initialization times to UTC.
2. Enumerate only legal cycles, newest first, within the lookback bound.
3. Build documented object keys for the exact model, product, member, and
   forecast hour. Never recursively scan an entire bucket.
4. Probe exact objects with `HeadObject`, HTTP `HEAD`, or a narrow paginated
   prefix listing. A probe should retrieve metadata, not the model payload.
5. Require every sentinel and sidecar in the completion contract. Reject zero-
   length or obviously placeholder objects.
6. For a live mirror that may expose objects before publication finishes,
   repeat the metadata probe after a short bounded interval and require stable
   size and object identity.
7. Select the first complete candidate. A fallback provider must refer to the
   same initialization, product, member, and forecast hour.
8. Emit a resolution record before starting the download.

Use a provider's documented cycle status page as supporting evidence, not as a
substitute for probing the exact objects the consumer requires.

## Minimal Resolver Example

Keep provider-specific key construction separate from the selection rule. This
example accepts a metadata-only `probe` callback so it can be used with S3,
HTTP, or a test fixture.

```python
from datetime import datetime, timedelta, timezone


def candidate_cycles(now, cycle_hours, lookback):
    now = now.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
    allowed = sorted(set(cycle_hours), reverse=True)
    candidates = []
    for days_back in range((lookback // 24) + 2):
        day = (now - timedelta(days=days_back)).date()
        for hour in allowed:
            cycle = datetime(day.year, day.month, day.day, hour, tzinfo=timezone.utc)
            if cycle <= now and now - cycle <= timedelta(hours=lookback):
                candidates.append(cycle)
    return sorted(set(candidates), reverse=True)


def resolve_latest(now, cycle_hours, lookback, required_objects, probe):
    """Return one complete run; probe(uri) returns metadata or None."""
    attempts = []
    for cycle in candidate_cycles(now, cycle_hours, lookback):
        requested = required_objects(cycle)
        found = {name: probe(uri) for name, uri in requested.items()}
        missing = [name for name, metadata in found.items() if not metadata]
        attempts.append({"cycle": cycle.isoformat(), "missing": missing})
        if not missing:
            return {
                "initialization": cycle.isoformat(),
                "objects": [
                    {"role": name, "uri": requested[name], **found[name]}
                    for name in requested
                ],
                "attempts": attempts,
            }
    raise LookupError(f"no complete run within {lookback} hours: {attempts}")
```

The caller must make `required_objects` express the real completion contract;
checking a single convenient file defeats the purpose of discovery.

## Public S3 Diagnostics

For public NOAA Open Data buckets, inspect exact objects without loading AWS
credentials:

```bash
aws s3api head-object --no-sign-request \
  --bucket BUCKET \
  --key "EXACT/DOCUMENTED/OBJECT"

aws s3api list-objects-v2 --no-sign-request \
  --bucket BUCKET \
  --prefix "MODEL.DATE/DOMAIN/PRECISE-RUN-PREFIX" \
  --max-items 100
```

Paginate narrow listings. S3 returns at most one page at a time, and a
successful listing still needs defensive response parsing. `403` and `404`
from `HeadObject` can be intentionally nonspecific; distinguish a missing
public object from a permission or endpoint error before falling back.

## Resolution Record

Return enough information for the fetcher and provenance layer to use the exact
same objects:

```json
{
  "requested_at_utc": "2026-09-18T08:45:00Z",
  "model": "hrrr",
  "product": "prs",
  "initialization": "2026-09-18T06:00:00Z",
  "required_forecast_hours": [0, 6, 18],
  "provider": "aws",
  "objects": [
    {
      "role": "pressure_f018",
      "uri": "s3://bucket/exact-key",
      "size_bytes": 123456,
      "etag": "opaque-object-identity",
      "last_modified": "2026-09-18T07:12:34Z"
    }
  ],
  "fallback_cycles_rejected": []
}
```

Keep ETags as opaque identity values. They are not guaranteed to be full-file
MD5 checksums.

## Reliability and Caching

- Cache positive results only briefly enough for the model cadence and
  publication latency. Cache negative probes for a shorter interval.
- Retry timeouts, `408`, `429`, and transient `5xx` responses with bounded
  exponential backoff and jitter; honor `Retry-After`.
- Bound lookback and total probes so a provider outage cannot create an
  unbounded bucket walk.
- Do not treat one mirror's lag as proof that the run is absent everywhere.
- Do not mix objects from different providers unless their run identity and
  product semantics have been verified equivalent.
- Record rejected cycles and missing sentinels so fallback is visible.

## Verification Checklist

- Candidate cycles are legal for the requested model and expressed in UTC.
- Every required product, member, forecast hour, and sidecar is present.
- Object sizes are nonzero and stable when a stabilization check is required.
- The resolved provider and exact object identities are recorded.
- The selected run satisfies the user's freshness and lookback bounds.
- No model payload was downloaded merely to discover availability.
- A failure reports which cycles were checked and which sentinels were absent.

## Security & Safety Notes

- Probe only public datasets or resources the user is authorized to access.
- Never embed cloud credentials, signed URLs, session tokens, or private
  endpoint details in a resolution record.
- Keep TLS verification enabled. Unsigned public S3 access is not the same as
  disabling certificate verification.
- Bound prefix width, pagination, retries, and request rate before probing.
- Treat provider object names and metadata as untrusted input when writing logs
  or constructing local paths.

## Common Pitfalls

- **Newest cycle has `f000`:** Later required forecast hours are still
  publishing. Test the actual terminal sentinels.
- **A provider fallback changes the forecast:** The fallback changed a product,
  member, or cycle as well as the mirror. Reject it.
- **A listing found an object but the download changes:** The publisher was
  still updating it. Require stable metadata or conditional reads.
- **Discovery is slow and expensive:** The prefix is too broad or pagination is
  unbounded. Construct exact keys wherever possible.
- **Local time selected the wrong day:** Perform cycle arithmetic in UTC and
  convert only for display.

## Limitations

- Publication schedules, provider retention, key layouts, and mirror status can
  change; verify them against current provider documentation.
- Metadata stability reduces the chance of a partial publication but does not
  prove that the model contents are scientifically valid.
- This skill does not fetch GRIB2 fields, decode model data, or assess forecast
  quality.

## Additional Resources

- [NCEP NOMADS data availability](https://nomads.ncep.noaa.gov/)
- [NCEP NOMADS status](https://nomads.ncep.noaa.gov/status.php)
- [Herbie latest model run guidance](https://herbie.readthedocs.io/en/latest/user_guide/tutorial/latest.html)
- [Amazon S3 `HeadObject`](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html)
- [Amazon S3 `ListObjectsV2`](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html)
- [Amazon S3 conditional requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-requests.html)
