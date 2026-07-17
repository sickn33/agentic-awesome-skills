# Frozen hostile corpus v1

This directory contains one rejected exploit fixture and one accepted boundary
control for each of the 32 canonical archive and input classes in
`manifest.json`. Paths in the manifest are relative to this directory and every
fixture is bound by SHA-256.

`generate-fixtures.mjs` constructs USTAR archives directly and writes bounded
JSON or JSONL inputs. It never extracts an archive or executes fixture content.
The numeric boundaries used by the pairs are frozen in
`manifest.json.fixtureContract`.

Regenerate and verify deterministically with Node.js 22 or 24:

```sh
node verification/aas-v1/baseline/v1/hostile/generate-fixtures.mjs
node verification/aas-v1/baseline/v1/hostile/verify-fixtures.mjs
```

The verifier parses archive headers and gzip streams in memory. It does not
materialize archive members. It also rejects any symlink, device, FIFO, socket,
or other special entry that appears in the corpus directory itself.
