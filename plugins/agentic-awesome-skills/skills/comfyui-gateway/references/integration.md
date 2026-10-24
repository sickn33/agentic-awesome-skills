# ComfyUI Gateway integration contract

These are implementation requirements and an isolated signature-verification
example. No gateway source, package, deployment image or workflow is bundled.
The proposed /jobs and /outputs paths require your own reviewed gateway contract.

## Submitting and polling

Use a server-side client with a least-privilege credential from a secret store.
Construct JSON with a JSON encoder, never shell interpolation of a prompt. Apply
connect/read deadlines, bounded response sizes and a maximum polling duration.
Check HTTP status and schema before reading jobId or output URLs. Handle all
terminal states using the server's documented spelling; timeout does not mean
that work stopped or billing ended. Retry submissions only with a documented
idempotency key reused for that same logical request.

Only download output URLs from the exact approved gateway origin/path; disable
redirects or revalidate each destination before forwarding credentials. Stream
with a byte limit into a newly created private file, without overwriting existing
paths; validate image format and declared digest where available. Treat response
filenames and metadata as untrusted. Do not send admin/API secrets to browsers.

## Webhook verification example

The following Node function checks a proposed `sha256=<hex>` signature over exact
raw request bytes. It is not a full receiver or a replay-protection mechanism.
Configure the same signing protocol on the actual sender before using it.

```javascript
const { createHmac, timingSafeEqual } = require('node:crypto');
function verifyWebhook(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > 1024 * 1024 ||
      typeof secret !== 'string' || secret.length === 0 ||
      typeof signature !== 'string' || !/^sha256=[0-9a-f]{64}$/.test(signature)) {
    return false;
  }
  const received = Buffer.from(signature.slice(7), 'hex');
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}
```

Capture raw bytes before JSON reserialization. With Express, use a route-specific
raw parser with a body-size limit and reject unsupported compression/content
types according to the signing contract. Parse and validate JSON only after
signature verification. Reject malformed headers without throwing on unequal
buffer lengths. Never default to a sample secret or skip verification on an empty
configuration. Read secrets from the configured secret store, without logging.

Require an authenticated event ID and suitable timestamp/expiry protocol where
supported. Persist deduplication and queue acceptance before returning success;
returning 200 before durable enqueue can silently lose work. A valid HMAC alone
does not prevent replay, authorize arbitrary output URLs or prove job ownership.

For n8n, verify at an authenticated ingress with access to raw bytes before any
workflow side effect. A blank Header Auth field is not HMAC validation;
JSON.stringify of a parsed item is not the original signed payload. Confirm the
actual n8n version's raw-body and header interfaces rather than inventing globals.

## Deployment review

Inventory the real source, lockfile, Dockerfile, images by digest, custom nodes
and model licenses before installation. Keep ComfyUI/Redis/storage off public
ports; publish only the authenticated TLS gateway. Use separate service and
administrative credentials; private output buckets; constrained callbacks/CORS;
resource quotas; tested backups and recovery. Do not enable anonymous bucket
downloads as an initialization shortcut. Treat volume deletion as destructive.

A remote generation proxy must verify user identity and entitlement, enforce
limits and select callbacks server-side before using its service credential.
An anonymous project API key alone does not establish an individual user's
identity. Do not accept caller-controlled workflow IDs or callback URLs without
explicit validation/authorization. Generic errors should omit upstream secrets
and internal addresses.

Multiple gateway workers targeting the same ComfyUI process share that process's
GPU. Setting CUDA_VISIBLE_DEVICES on a gateway worker does not select a GPU in a
separate ComfyUI process; configure each actual backend and routing explicitly.

## Sources and limits

- [ComfyUI routes](https://docs.comfy.org/development/comfyui-server/comms_routes)
- [Express body parsing and untrusted inputs](https://expressjs.com/en/resources/middleware/body-parser/)
- [Node timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)

No deployment or third-party dependency execution was performed by this guide.
