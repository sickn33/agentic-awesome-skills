# ComfyUI Gateway troubleshooting

Diagnose the actual reviewed implementation and version. This tree has no gateway
runtime, fixed environment-variable contract, automatic retry policy, database
schema or included workflow. The names below are diagnostic categories, not
promises that a particular gateway implements them.

## Connection failures

Record the failing component, origin, status and sanitized error. From its own
network namespace, test the intended approved address with bounded requests:

```bash
curl --fail --silent --show-error --connect-timeout 3 --max-time 10 \
  http://127.0.0.1:8188/system_stats
```

This native ComfyUI read is local and may reveal system details: do not publish
its output. Container localhost refers to that container. Confirm Docker host
mapping and actual WSL network mode rather than assuming a DNS nameserver is the
Windows host address. Do not solve connection problems by opening all-source
firewall rules, exposing an unauthenticated listener or disabling TLS validation.
Use a trusted CA and narrow approved network access.

## OOM and slow jobs

Identify whether allocation fails during model load, sampling, decoding or a
custom node. Measure VRAM and inspect sanitized backend logs. Reduce the actual
failing workload (resolution, batch, concurrency), consider supported offloading
or tiled decoding, and retest image quality. Step count generally affects duration;
there is no universal per-step accumulation or fixed VRAM guarantee. Check flags
against the pinned backend's help; do not assume a model-count cache flag exists.
Quantized models require compatible code, hardware and reviewed model artifacts.

A cold start, disk load, GPU contention, queue delay and CPU fallback have
different remedies. Measure each before increasing timeout or concurrency. Map
workers to actual backend processes/devices; gateway environment variables do not
reconfigure a separate backend's GPU.

## Webhooks and authentication

Keep certificate verification enabled. Confirm approved origin/DNS/IP routing,
network policy, exact raw-byte HMAC protocol and secret-store configuration without
printing secrets. Acknowledge after durable acceptance; deduplicate replays. Do
not widen callback allowlists to fix a rejection. Retry only within the sender's
actual bounded policy; no particular timeout/retry count is bundled here.

For 401/403, verify credential presence, expiry, issuer/audience and intended role.
Do not disable authentication, switch to an admin key or mint an ad-hoc admin JWT
as a general repair. Decoding a JWT does not validate its signature or claims.
Never paste tokens, environment files, Redis passwords or full authenticated curl
verbose output into diagnostics.

## Storage, database and restart recovery

Verify private storage permissions for the specific service identity. Avoid broad
recursive chown/chmod and public bucket access. Separate bucket listing from object
read/write permissions; use non-sensitive disposable test objects only when an
explicit write test is approved. Do not overwrite shared keys or fixed /tmp paths.

Inspect schema and live job/worker state before any repair. A running job may still
be computing; a client timeout/restart is not proof it failed. Prefer documented
reconciliation/cancel APIs. Do not update every running row with a guessed SQL
schema. For corruption, stop coordinated writers, obtain a consistent backup
(including WAL semantics), test recovery into a new private file and validate it
before any replacement. Preserve the original for investigation.

Redis-backed queues still need correct persistence, memory policy and recovery
configuration. Evicting queue keys can lose work; Redis presence alone does not
prove durability. Local in-memory queues lose state on restart unless separately
persisted. Rate limits protect resources; investigate abusive traffic and quota
scope before increasing them. Use bounded backoff and Retry-After where documented.

## Limits

Commands and diagnostics depend on the real runtime, deployment, permissions and
backend version. This guide does not install packages, alter firewall/storage,
recover a live database or certify operational behavior. Record actual evidence
and unresolved causes rather than converting guesses into a successful diagnosis.
