# Browser to API — Reference

Exhaustive reference for every script, flag, file format, and configuration knob the skill exposes.

## Scripts

All scripts are Node ESM (`type: module`). They depend only on the Node standard library. `discover.mjs` is the top-level dispatcher; the others are stage scripts the dispatcher calls in order. Run an individual stage with `discover.mjs --stage <name>` for debugging or partial reruns.

### `discover.mjs --run <path> [flags]`

Top-level dispatcher. Runs `load → filter → normalize → infer → emit` in order. With `--stage <name>`, runs only that stage (assumes prior stages already wrote their intermediate file).

### `open-swagger-ui.mjs (--run <path> | --spec <path>) [flags]`

Preview an emitted OpenAPI spec in a local Swagger UI checkout. The script serves the Swagger UI `dist/` assets and the generated spec from one local HTTP origin, injects a per-run `swagger-initializer.js`, opens the browser by default, and keeps the server alive until interrupted.

- `--run <path>` loads `<run>/api-spec/openapi.yaml`, falling back to `openapi.json`.
- `--spec <path>` previews an explicit OpenAPI YAML/JSON file.
- `--swagger-ui <path>` points at a Swagger UI checkout/package directory. If omitted, the script tries `$SWAGGER_UI_DIR`, `~/Developer/swagger-ui`, and `node_modules/swagger-ui-dist`.
- `--host <host>` defaults to `127.0.0.1`.
- `--port <port>` defaults to a random free port.
- `--no-open` prints the URL without opening a browser.

### `load.mjs <run-path> <out-dir> [bodies-dir]`

- Reads `cdp/network/requests.jsonl` and `cdp/network/responses.jsonl`.
- Pairs by `requestId`. Drops `OPTIONS` (CORS preflight) and pure redirects (status 3xx with `Location` and no body — recorded as metadata on the *next* request in the chain when the requestId carries forward, otherwise dropped).
- Drops resource types that are not `XHR`, `Fetch`, or `Document` (skips `Image`, `Stylesheet`, `Font`, `Media`, `Manifest`, `Other`, `Script` unless the URL clearly looks like an API endpoint).
- **Body join**: if a `browse network` capture dir is provided (via `--bodies` or auto-detected at `<run>/cdp/network/bodies/`), each subdir's `request.json` + `response.json` are read and joined to paired rows by `requestId`. The browse-network `id` field IS the CDP requestId for XHR/Fetch resource types, so the join is exact (not URL-or-timestamp matching). Bodies that look like JSON are parsed; otherwise the raw string is preserved.
- Output: `intermediate/paired.jsonl` — one row per pair with `{ method, url, status, reqHeaders, reqBody, respHeaders, respBody, contentType, type, ts }`.

### `filter.mjs <run-path>`

- Reads `intermediate/paired.jsonl`.
- Applies `--include` / `--exclude` / `--origins`.
- Applies built-in exclude list (analytics hosts, sourcemaps, service workers, fonts/CSS that snuck through).
- Output: `intermediate/filtered.jsonl`.

### `normalize.mjs <run-path>`

- Templatizes paths. Detection order per segment:
  1. UUID v1–v5 → `{id}` (`string`, `format: uuid`).
  2. Pure integer → `{id}` (`integer`).
  3. Hex/base62 ≥ 8 chars → `{id}` (`string`).
  4. If the same position varies across multiple samples and is short alpha → `{slug}` (`string`).
  5. Otherwise the segment is left static.
- Groups paired samples by `(origin, method, templatedPath)`.
- Collects query parameters across samples; marks `required: true` only when every sample carries the param.
- If two pre-normalization templates would collapse but yield divergent response status/content-type signatures, they're kept split and flagged.
- Output: `intermediate/endpoints.jsonl` — one row per endpoint with `{ origin, method, path, samples[], queryParams, statusCodes, normalizationFlags }`.

### `infer.mjs <run-path>`

- For each endpoint, runs JSON-Schema inference across request bodies and (when present) response bodies.
- Merge rules: required = present-in-all, types = union of observed types, arrays infer item schema, enum detected when ≤ 8 distinct values across ≥ 5 samples.
- Format hints: `date-time` (ISO-ish), `uri`, `email`, `uuid`.
- Picks a representative sample (most-recent successful 2xx) and writes redacted request/response example to `samples/`.
- Output: `intermediate/endpoints.with-schemas.jsonl`.

### `emit.mjs <run-path>`

- Builds the OpenAPI 3.1 document.
- Hoists structurally-identical schemas into `components.schemas` keyed by structural hash, with names derived from path tokens (`Item`, `Item_List`, etc.) — falls back to `Schema1`, `Schema2` if no path hint applies.
- Writes `openapi.yaml`, `openapi.json`, `report.md`, `confidence.json`.

## File formats

### `intermediate/paired.jsonl`

```json
{
  "requestId": "12345.678",
  "method": "GET",
  "url": "https://api.example.com/v1/items/42?page=2",
  "origin": "https://api.example.com",
  "path": "/v1/items/42",
  "query": { "page": "2" },
  "status": 200,
  "type": "Fetch",
  "contentType": "application/json",
  "reqHeaders": { "accept": "application/json" },
  "reqBody": null,
  "respHeaders": { "content-type": "application/json" },
  "respBody": null,
  "ts": 1714400000000
}
```

`reqBody` is the verbatim `postData` from `Network.requestWillBeSent` (parsed if JSON). `respBody` is `null` unless a `browse network` capture dir was joined in (see below) — `browse cdp` does not embed bodies.

### Joining `browse network` bodies

`browse network on` is a separate command from the `browse` CLI that writes per-request `request.json` + `response.json` files (with full bodies) to a temp directory. Discover joins these into the trace by `requestId`.

Workflow:

```bash
# during capture, alongside browser-trace
browse network on
# ...drive...
# IMPORTANT: snapshot the dir before it gets reused
cp -r "$(browse network path | jq -r .path)" .o11y/<run>/cdp/network/bodies/
browse network off
```

Internals (matched in `lib/io.mjs` + `load.mjs`):

- The browse-network entry's `request.json.id` field equals the CDP `requestId` for XHR/Fetch resource types. The join is by exact `requestId`, not URL or timestamp.
- For Document loads, the `id` field is a non-CDP UUID and won't match — those bodies are silently skipped (Documents aren't useful for API spec inference anyway).
- `response.json` from `browse network` may have empty `status` / `headers` / `mimeType` for some loads — that's fine, those are taken from the CDP firehose. Only `body` is read.
- The capture dir is shared per `browse` daemon session (`/tmp/.../browse-default-network/`). Run `browse network on` then snapshot the dir before another `browse network on` overwrites it.

### `intermediate/endpoints.jsonl`

```json
{
  "endpointKey": "GET https://api.example.com/v1/items/{id}",
  "origin": "https://api.example.com",
  "method": "GET",
  "path": "/v1/items/{id}",
  "rawPaths": ["/v1/items/42", "/v1/items/97"],
  "pathParams": [{ "name": "id", "in": "path", "schema": { "type": "integer" } }],
  "queryParams": [{ "name": "page", "in": "query", "required": false, "schema": { "type": "string" } }],
  "statusCodes": [200, 200, 404],
  "samples": [/* indices into paired.jsonl */],
  "normalizationFlags": []
}
```

### `confidence.json`

```json
{
  "endpoints": [
    {
      "key": "GET /v1/items/{id}",
      "samples": 7,
      "statusCodes": [200, 404],
      "responseBodyKnown": false,
      "requestBodyKnown": false,
      "normalizationFlags": [],
      "confidence": "medium"
    }
  ]
}
```

`confidence` is a coarse bucket: `low` (1–2 samples or normalization flags), `medium` (3–9 samples, no flags), `high` (≥ 10 samples, multi-status, no flags).

## CLI flags (full)

| Flag | Default | Notes |
|---|---|---|
| `--run <path>` | required | Resolves `cdp/network/{requests,responses}.jsonl` underneath |
| `--out <path>` | `<run>/api-spec` | |
| `--bodies <path>` | auto | `browse network` capture dir to join into the trace. Auto-detected from `<run>/cdp/network/bodies/` when present |
| `--include <regex>` | none | Repeatable. ORed together. Applied after `--origins` |
| `--exclude <regex>` | (defaults) | Repeatable. Combined with built-in defaults |
| `--origins <list>` | none | Comma-separated. If set, anything *not* matching is dropped before include/exclude |
| `--format <yaml\|json\|both>` | `both` | Format of the emitted spec |
| `--title <string>` | derived | `info.title` in the OpenAPI doc |
| `--redact <list>` | (defaults) | Comma-separated extra header names / JSON keys to scrub. Adds to defaults; never replaces |
| `--min-samples <n>` | `1` | Drop endpoints below this threshold (still listed in the report) |
| `--stage <name>` | (all) | One of `load`, `filter`, `normalize`, `infer`, `emit` |

## Swagger UI preview flags

| Flag | Default | Notes |
|---|---|---|
| `--run <path>` | required unless `--spec` is set | Resolves a browser-trace run and previews `<run>/api-spec/openapi.yaml` or `openapi.json` |
| `--spec <path>` | required unless `--run` is set | Explicit OpenAPI YAML/JSON path |
| `--swagger-ui <path>` | auto | Checkout/package dir containing either `dist/index.html` or `index.html` + `swagger-ui-bundle.js` |
| `--host <host>` | `127.0.0.1` | Preview server bind host |
| `--port <port>` | random | Preview server bind port |
| `--no-open` | false | Print the URL without launching the browser |

## Default exclude list

URLs matching these patterns are dropped before any analysis (regex, applied to the full URL):

- Analytics: `segment\.(io\|com)`, `mixpanel\.com`, `google-analytics\.com`, `googletagmanager\.com`, `datadog(hq)?\.com`, `sentry\.io`, `amplitude\.com`, `fullstory\.com`, `hotjar\.com`, `intercom\.io`, `clarity\.ms`, `cloudflareinsights\.com`, `doubleclick\.net`, `facebook\.com/tr`
- Static-only file extensions: `\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|css|map|mp4|webm|mp3)(\?|$)`
- Service worker / metadata: `/sw\.js`, `/service-worker\.js`, `/manifest\.json$`, `/robots\.txt$`, `/favicon\.ico$`

Override granularly via `--include` (which wins over default `--exclude`).

## Default redactions

Headers (case-insensitive): `authorization`, `cookie`, `set-cookie`, `x-csrf-token`, `x-xsrf-token`, `x-api-key`, `proxy-authorization`, plus any header name matching `*token*`, `*secret*`, `*signature*`.

Body keys: `password`, `token`, `secret`, `api_key`, `apiKey`, `accessToken`, `refreshToken`, `creditCard`, `ssn`.

Body values (regex): JWTs (`^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`), email addresses (`@` + TLD), phone numbers (E.164-ish).

Redacted values are replaced with `"<redacted>"` so type information is preserved for schema inference.

## Path templating heuristics

Per-segment classifier in `scripts/lib/path-template.mjs`:

| Pattern | Replacement | OpenAPI schema |
|---|---|---|
| 8-4-4-4-12 hex (UUID) | `{id}` | `{ type: string, format: uuid }` |
| `\d+` | `{id}` | `{ type: integer }` |
| `[A-Za-z0-9]{8,}` (no vowels-only / dictionary check) | `{id}` | `{ type: string }` |
| Same-position alpha tokens varying across ≥ 2 samples | `{slug}` | `{ type: string }` |

When multiple variable segments exist in one path, names are suffixed: `{id}`, `{id2}`, `{id3}`. The `--name-params` flag (future) will use sibling segment hints (`/products/42` → `{productId}`).

## Confidence flags

Possible entries in `normalizationFlags`:

- `divergent-response-shape` — pre-normalization paths collapsed to the same template but had structurally different responses. The skill keeps them split and emits both.
- `single-sample` — endpoint observed exactly once.
- `single-status` — only one status code observed; spec lists only that response.
- `mixed-content-types` — different `content-type` values across samples.
- `request-body-only-on-some-samples` — POST/PUT seen with and without a body.

## OpenAPI extensions

The emitter writes a few `x-*` extensions on each operation:

- `x-confidence`: `{ samples, statusCodes, normalizationFlags }`
- `x-origin`: the origin this operation was observed on (when multiple servers are listed)
- `x-observed-auth`: array of auth-shaped header names seen on this endpoint (e.g. `["authorization", "x-api-key"]`)
- `x-sample-count`: total number of paired samples backing the operation

These extensions are stripped from `report.md` (which is human-facing) but preserved in the YAML/JSON.

## Configuration via env

| Var | Default | Effect |
|---|---|---|
| `O11Y_ROOT` | `.o11y` | Inherited from `browser-trace`. Used only when `--run` is bare run id rather than a full path |
| `DISCOVER_ENUM_MAX_DISTINCT` | `8` | Max distinct values to consider a field an enum |
| `DISCOVER_ENUM_MIN_SAMPLES` | `5` | Min samples before enum detection runs |
| `SWAGGER_UI_DIR` | auto | Optional Swagger UI checkout/package dir for `open-swagger-ui.mjs` |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `paired.jsonl` is empty | trace contains no `Network.requestWillBeSent` events for XHR/Fetch | re-run `browser-trace` exercising the dynamic flows; static-only sites won't yield endpoints |
| `openapi.yaml` has only `paths: {}` | every paired request was filtered out | check `--origins` and the default exclude list; pass `--include '.*'` to bypass filtering |
| Path templating collapses too aggressively | numeric IDs being misread as enums, or dictionary words misread as slugs | add `--exclude` for the noisy paths and re-run, or file an issue with the trace |
| Schemas show `type: "string"` for everything | request/response bodies aren't valid JSON or weren't captured | check `paired.jsonl` for `reqBody`/`respBody` content — if `null`, bodies weren't in the trace |
| Spec validator complains about `info.version` | derived version is `0.1.0-discovered` which some tools dislike | pass `--version 0.1.0` (TODO) or post-edit the file |
| `Swagger UI not found` | no local Swagger UI checkout/package was detected | clone `https://github.com/swagger-api/swagger-ui` to `~/Developer/swagger-ui`, or pass `--swagger-ui <path>` / set `SWAGGER_UI_DIR` |
