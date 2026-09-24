---
name: weather-data-reproducibility
description: "Record and verify provenance manifests for weather-data inputs and derived artifacts, including object identity, selections, software versions, transformations, and hashes."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-24"
author: ShianMike
tags: [weather, reproducibility, provenance, checksums, grib2, netcdf]
tools: [claude, cursor, gemini, codex]
---

# Weather Data Reproducibility

## Overview

Create a compact provenance manifest that identifies the exact weather inputs,
subsets, software, transformations, and output artifacts used by a run. Verify
the manifest before claiming that a result can be replayed or reproduced.

This skill records and checks lineage. It does not discover or download data by
itself; pair it with the appropriate model, observation, radar, or satellite
fetching skill.

## When to Use This Skill

- A map, sounding, time series, dataset, or benchmark must be auditable.
- Weather inputs came from mutable URLs, mirrors, byte-range subsets, or caches.
- A result must distinguish model initialization, forecast lead, and valid time.
- Temporary GRIB2, NetCDF, radar, satellite, or observation files will be
  deleted after processing.
- Two outputs differ and their inputs or processing environment must be compared.
- A publication or release needs machine-readable data and software provenance.

Do not claim bit-for-bit reproducibility merely because a source URL and run
time were logged.

## Reproducibility Contract

Decide which claim the workflow supports:

- **Traceable:** The source and processing history can be audited.
- **Replayable:** The same identified inputs can still be retrieved and the
  recorded procedure can be rerun.
- **Bitwise reproducible:** The rerun is expected to produce identical bytes in
  a pinned environment.
- **Scientifically reproducible:** Equivalent inputs and methods produce the
  same scientific conclusion within a stated tolerance.

Record the intended claim and its tolerance. Mutable remote objects, floating
software versions, lossy images, parallel reductions, and platform-dependent
code can make the stronger claims impossible.

## Minimum Manifest

Use a versioned JSON document. Keep request intent separate from the source that
was actually resolved.

```json
{
  "schema_version": 1,
  "created_utc": "2026-09-18T09:00:00Z",
  "claim": {"level": "replayable", "tolerance": null},
  "request": {
    "dataset": "hrrr",
    "product": "prs",
    "requested_valid_time": "2026-09-18T12:00:00Z",
    "variables": ["temperature", "relative_humidity"]
  },
  "resolved": {
    "initialization": "2026-09-18T06:00:00Z",
    "forecast_hour": 6,
    "valid_time": "2026-09-18T12:00:00Z",
    "provider": "aws"
  },
  "inputs": [
    {
      "role": "pressure_fields",
      "uri": "s3://bucket/exact-object-key",
      "object_identity": {
        "etag": "opaque-identity",
        "last_modified": "2026-09-18T07:01:02Z",
        "size_bytes": 987654321
      },
      "selection": {
        "inventory_uri": "s3://bucket/exact-object-key.idx",
        "inventory_sha256": "HEX_DIGEST",
        "byte_ranges": [[1000, 1999], [5000, 6999]]
      },
      "materialized_sha256": "HEX_DIGEST"
    }
  ],
  "processing": {
    "software": {"application": "1.2.3", "python": "3.13.7"},
    "parameters": {"point": [35.22, -97.44], "nearest_method": "model-aware"},
    "transformations": ["decode GRIB2", "convert K to degC"]
  },
  "artifacts": [
    {
      "path": "sounding.png",
      "media_type": "image/png",
      "size_bytes": 123456,
      "sha256": "HEX_DIGEST"
    }
  ]
}
```

Use `null` for an intentionally absent value and omit fields whose meaning is
unknown. Never fill a required-looking field with a guess.

## Identify Every Input

For each remote object or API response, record as available:

- provider, dataset, endpoint, bucket, and exact key or immutable URL;
- version ID, generation number, release, or dataset revision;
- ETag as opaque object identity, `Last-Modified`, and content length;
- provider-supplied checksum and checksum algorithm;
- a locally computed SHA-256 for downloaded or materialized bytes;
- response media type and content encoding;
- retrieval time and successful fallback provider;
- license or attribution identifier when required.

An S3 ETag is not always an MD5 digest, particularly for multipart or encrypted
objects. Store it for identity and compute a cryptographic content hash when
the actual bytes must be verified.

## Record the Selection

The source object alone is insufficient when only part of it was used. Record:

- GRIB2 inventory URI and inventory content hash;
- exact inventory rows, search expression, and inclusive byte ranges;
- Zarr group, array names, chunk keys, and coordinate slices;
- API query parameters and a hash or retained copy of the raw response;
- station identifier scheme and observation time interval;
- radar site/product and scan interval;
- satellite platform, product, sector, channel, and scan interval;
- requested coordinates plus the actual selected grid point and distance.

Preserve the order in which selected binary ranges were assembled. Hash the
materialized subset separately from the full remote object's identity.

## Record Weather Time Semantics

Use explicit UTC timestamps and name their meaning:

- models: initialization, forecast lead, and valid time;
- station observations: observation, correction, and ingestion time;
- radar: volume or product scan start and end;
- satellite: scan start, scan end, and file creation time;
- retrieval: when the client fetched the metadata and bytes.

Do not replace these with one ambiguous `timestamp` field. Record the calendar
and leap-second handling if the source or application requires it.

## Record Processing and Environment

Capture only details that can change the result:

- application version and source commit, including dirty-tree status;
- decoder and scientific library versions;
- runtime and operating-system or architecture details when relevant;
- command arguments or structured parameters;
- unit conversions, QC decisions, interpolation, coordinate selection, and
  aggregation rules;
- deterministic random seed when randomness is present;
- container image digest or environment lock-file hash when available.

Do not dump an entire environment full of unrelated packages merely because it
is easy. Prefer a lock file plus the versions of software that actually touched
the data.

## Hash and Write Atomically

The Python standard library is sufficient for local artifact hashes and a
canonical, atomically replaced JSON manifest:

```python
import hashlib
import json
import os
from pathlib import Path


def sha256_file(path, chunk_size=1024 * 1024):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest(path, manifest):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    payload = json.dumps(
        manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ) + "\n"
    temporary.write_text(payload, encoding="utf-8", newline="\n")
    os.replace(temporary, path)
```

Hash artifacts only after their writers are closed. If the manifest itself must
be signed, sign the canonical bytes using the project's established signing
workflow rather than inventing a custom scheme.

## Verify and Replay

Before replay:

1. Validate the manifest schema version and required fields.
2. Re-resolve every immutable object identity. Fail if an object changed unless
   the reproducibility contract explicitly permits an equivalent replacement.
3. Download or locate inputs and compare size plus a real checksum.
4. Reapply the recorded selection and confirm the materialized subset hash.
5. Recreate the pinned processing environment and transformations.
6. Produce artifacts in a new output directory.
7. Compare artifact hashes for bitwise claims or documented scientific metrics
   and tolerances for scientific claims.
8. Write a new run manifest that references, but does not overwrite, the
   original.

Report the first mismatch with its role, expected value, and actual value.

## Temporary Data Lifecycle

- Write the final artifact and its manifest before deleting request-owned input
  files.
- Keep cleanup in `finally` so failures and cancellation do not leak large
  GRIB2, NetCDF, radar, or observation files.
- Never delete a shared user cache as request cleanup.
- If raw inputs are deleted and the remote source is mutable or short-lived,
  label the run traceable rather than replayable.
- A manifest is small and should normally outlive transient downloads.

## Verification Checklist

- Request intent and resolved data identity are separate.
- Every timestamp is UTC and has explicit semantics.
- Every input has an exact locator, identity metadata, and content hash when
  bytes were materialized.
- Subset rules, inventory identity, byte ranges, and selected coordinates are
  recorded.
- Software versions and result-changing transformations are explicit.
- Final artifacts have size, media type, and SHA-256.
- The claimed reproducibility level matches what can actually be replayed.
- The manifest contains no secrets or machine-specific private information.

## Security & Safety Notes

- Never record credentials, authorization headers, cookies, signed-query
  strings, private bucket names, or secret environment variables.
- Redact user names and unnecessary absolute local paths before sharing a
  manifest.
- Treat a hash as an integrity value, not proof that an untrusted input is safe.
- Validate manifest paths before opening files; do not allow `..` traversal or
  writes outside the intended output directory.
- Keep TLS verification enabled when re-fetching inputs.
- Preserve license, attribution, redistribution, and access restrictions.

## Common Pitfalls

- **ETag was labeled SHA-256 or MD5:** ETag semantics depend on the provider and
  upload method. Store it as identity and compute a real local hash.
- **A model result cannot be recreated:** Initialization and forecast lead were
  collapsed into valid time. Record all three.
- **The same URI returns different bytes:** The remote object was mutable and no
  version or checksum was pinned. Downgrade the claim or retain the input.
- **A GRIB subset differs:** The inventory version, selected rows, or inclusive
  byte ranges were omitted.
- **The artifact hash changes across systems:** The process is scientifically,
  but not bitwise, reproducible. Define and test a numerical tolerance.

## Limitations

- A manifest cannot restore data that was deleted from a mutable source unless
  the input bytes or an immutable archive were retained.
- Exact replay may require licensed software, hardware, or provider access not
  captured in a public manifest.
- Provenance establishes lineage and integrity; it does not establish forecast
  skill, observational truth, or scientific validity.

## Additional Resources

- [W3C PROV overview](https://www.w3.org/TR/prov-overview/)
- [Amazon S3 object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html)
- [Amazon S3 checksum guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [CF metadata conventions](https://cfconventions.org/)
- [NetCDF Climate and Forecast conventions](https://www.ncei.noaa.gov/products/netcdf)
