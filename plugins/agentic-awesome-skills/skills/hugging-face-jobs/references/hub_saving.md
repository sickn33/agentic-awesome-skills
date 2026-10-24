# Persisting job results

_Modified in the local catalog review: corrected default visibility, token assumptions and ephemeral-storage overclaims._

Ephemeral job files need an explicit persistence path when required after execution. Choose an owner-approved private Hub repository, configured durable volume or scoped external store before launching. Logs and intentionally mounted durable storage are separate from ephemeral scratch files; do not claim that every result is necessarily lost or that a Hub token is always needed.

## Hub output

Check namespace, repository type and visibility. For a new output, create a new private repository with `exist_ok=False`; a collision is a reason to inspect, not overwrite. For an explicitly requested update, inspect the existing revision/files/visibility, preserve unrelated content and record the expected/final commit. Passing `private=True` while reusing an existing public repo does not guarantee a privacy change.

Use only a scoped write credential from the approved secret facility. Upload explicitly selected artifacts, never broad folders containing tokens, private inputs, caches or logs. A generic upload does not always create a repository automatically; check the chosen library operation. Dataset source fields and sample prompts may be confidential even when generated responses seem harmless. Confirm model/data licenses and human-data disclosure before publication. Default private output does not replace data-use permission.

Prefer atomic commits where supported; otherwise disclose partial uploads and verify every expected file/config, row count, checksum and final revision. Retain enough provenance to distinguish attempted from complete runs. Retry only within a bounded, authorized attempt budget, and inspect whether the previous upload committed before retrying.

## External stores and APIs

Use approved account/destination and scoped credentials. Avoid overwriting unrelated object keys. Requests need TLS verification, bounded timeouts and HTTP/application success checks; use idempotency or unique run IDs when supported. Sending output to an arbitrary endpoint is publication/data disclosure, not an automatic workaround for storage limits.
