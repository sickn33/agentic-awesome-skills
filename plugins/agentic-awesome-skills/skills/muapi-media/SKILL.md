---
name: muapi-media
description: "Generate images and videos with MuAPI's schema-driven asynchronous media API while protecting keys, polling, and output downloads."
category: media
risk: critical
source: self
source_type: self
date_added: "2026-08-26"
author: Anil-matcha
tags: [muapi, image-generation, video-generation, media-api]
tools: [claude, codex, cursor, gemini]
---

# MuAPI Media

## Overview

Use MuAPI's unified asynchronous API for image and video generation when a
workflow needs model choice without a separate integration for every provider.
The catalog and each model's input schema are authoritative; this skill does
not guess fields, bundle an SDK, or hide a billable generation request. For a
capability overview, see the [MuAPI AI video API](https://muapi.ai/ai-video-api).

## When to Use This Skill

- Use when the user explicitly asks to generate an image or video with MuAPI.
- Use when an existing media workflow needs a hosted asynchronous API and can
  send an authorized HTTPS request.
- Use when the user needs to compare or switch among current media models
  without changing the surrounding submit-and-poll workflow.
- Do not use this skill for text chat or for a provider whose current schema
  has not been fetched and checked.

## Preconditions

1. Confirm that the user is authorized to send the prompt and any reference
   media to a third-party service.
2. Explain that generation may be billable and obtain approval immediately
   before the generation request.
3. Require `MUAPI_API_KEY` in the environment. Never ask the user to paste it
   into chat, source files, command history, or logs.
4. Confirm the requested media type, output location, and whether the user
   wants a single generation or an explicitly approved batch.

## API Contract

| Operation | Method and endpoint |
| --- | --- |
| List current models | `GET https://api.muapi.ai/api/v1/models` |
| Read one model's schema | `GET https://api.muapi.ai/api/v1/models/{model}` |
| Submit a generation | `POST https://api.muapi.ai/{catalog endpoint}` |
| Poll a prediction | `GET https://api.muapi.ai/api/v1/predictions/{request_id}/result` |

Generation and prediction requests use:

```text
x-api-key: $MUAPI_API_KEY
Content-Type: application/json
```

The catalog returns a model name, category, endpoint, and other metadata. The
endpoint value already includes `/api/v1/`; append it to `https://api.muapi.ai`
without adding a second version prefix. Model input and output fields vary, so
read the selected model's schema immediately before preparing a request.

## How It Works

### 1. Discover and validate a model

Use a temporary directory for response files and keep credentials out of every
file. The catalog lookup is read-only:

```bash
workdir=$(mktemp -d "${TMPDIR:-/tmp}/muapi-media.XXXXXX")

curl --fail --silent --show-error \
  --header "Accept: application/json" \
  "https://api.muapi.ai/api/v1/models" \
  --output "$workdir/models.json"

jq -r '
  .models[]
  | select(((.category // "") | ascii_downcase | test("image|video|audio|3d")))
  | [.name, .category, .endpoint]
  | @tsv
' "$workdir/models.json"
```

Select a model from the current catalog, then fetch its detailed schema. Do
not copy a payload from a different model just because the names look similar:

```bash
export MUAPI_MODEL="<model name from the catalog>"

curl --fail --silent --show-error \
  --header "Accept: application/json" \
  "https://api.muapi.ai/api/v1/models/${MUAPI_MODEL}" \
  --output "$workdir/model.json"

jq '.input_schema.schemas.input_data' "$workdir/model.json"
```

Check required fields, types, enum values, size limits, and the output schema.
If the model requires an image or video input, use the exact documented field
and an authorized HTTPS input URL; do not invent an upload contract.

### 2. Prepare one reviewed request

Set the key only in the environment and stop before submission if it is absent:

```bash
test -n "${MUAPI_API_KEY:-}" || {
  echo "Set MUAPI_API_KEY before generation." >&2
  exit 1
}

export MUAPI_PROMPT="A small paper boat crossing a calm pond at sunrise, steady camera"

# Add only fields confirmed by model.json. This example uses a prompt field;
# many models also require duration, resolution, aspect ratio, or an input URL.
jq -n \
  --arg prompt "$MUAPI_PROMPT" \
  '{prompt: $prompt}' \
  > "$workdir/request.json"
```

Review the model, requested parameters, destination, and estimated cost with
the user. Do not put `MUAPI_API_KEY` in `request.json`.

### 3. Submit exactly once

Resolve the catalog endpoint and make one POST. Do not automatically retry a
generation POST after a timeout: the original task may have been accepted.

```bash
model_endpoint=$(jq -er --arg name "$MUAPI_MODEL" '
  .models[]
  | select(.name == $name)
  | .endpoint
  | select(type == "string" and startswith("/api/v1/"))
' "$workdir/models.json")

curl --fail --silent --show-error \
  --request POST \
  "https://api.muapi.ai${model_endpoint}" \
  --header @- \
  --header "Content-Type: application/json" \
  --data "@$workdir/request.json" \
  --output "$workdir/submit.json" <<EOF
x-api-key: ${MUAPI_API_KEY}
EOF

request_id=$(jq -er '
  .request_id // .id // .data.request_id // .data.id // .output.id
  | select(type == "string" and length > 0)
' "$workdir/submit.json")
```

Keep the request ID for diagnosis. Never print request headers or the key.

### 4. Poll with a finite deadline

Poll the original request ID, accept only documented terminal states, and stop
after a bounded number of attempts. The response shape can vary, so use the
selected model's output schema when extracting the result URL:

```bash
result_url="https://api.muapi.ai/api/v1/predictions/${request_id}/result"

for attempt in $(seq 1 120); do
  curl --fail --silent --show-error \
    "$result_url" \
    --header @- \
    --output "$workdir/result.json" <<EOF
x-api-key: ${MUAPI_API_KEY}
EOF

  status=$(jq -r '.status // .data.status // .output.status // "unknown"' \
    "$workdir/result.json")
  case "$status" in
    completed|succeeded|success) break ;;
    failed|error|canceled|cancelled|timeout)
      jq -r '.error // .data.error // .output.error // "MuAPI generation failed"' \
        "$workdir/result.json" >&2
      exit 1
      ;;
  esac
  sleep 2
done

test "$status" = completed \
  || test "$status" = succeeded \
  || test "$status" = success
```

Do not create a second paid task merely because polling was interrupted. First
poll the known request ID again and inspect its sanitized status.

### 5. Download without the API key

Extract an HTTPS output URL using the model's output schema. Download it with
a fresh request that has no MuAPI header, validate the file, and only then
return or publish it:

```bash
output_url=$(jq -er '
  .output.outputs[0]
  // .data.output.outputs[0]
  // .outputs[0]
  // .data.outputs[0]
  // .output.video
  // .data.output.video
  | select(type == "string" and startswith("https://"))
' "$workdir/result.json")

curl --fail --silent --show-error \
  "$output_url" \
  --output "$workdir/output.bin"

test -s "$workdir/output.bin"
file "$workdir/output.bin"
```

Do not add `x-api-key` to this request. Reject non-HTTPS output URLs, avoid
following unvalidated redirects, and use a downloader that checks each
redirect destination and DNS result when the service returns a redirecting or
user-controlled URL. Never execute a downloaded file as code.

## Examples

### Read-only model discovery

```bash
curl --fail --silent --show-error \
  "https://api.muapi.ai/api/v1/models" \
  | jq -r '.models[] | [.name, .category, .endpoint] | @tsv'
```

### One text-to-video request

```text
1. Discover a current Text to Video model.
2. Fetch its detailed input_schema and confirm that prompt and the requested
   duration/resolution fields are accepted.
3. Obtain approval, submit one POST with MUAPI_API_KEY, and save request_id.
4. Poll the result endpoint at most 120 times.
5. Download the HTTPS output without the API key and validate the video file.
```

## Best Practices

- Treat the live model catalog and detailed schema as authoritative.
- Keep each generation request explicit and obtain approval before billable
  work.
- Submit one POST per task; retry only bounded, idempotent GET polling.
- Use a finite polling deadline and preserve the request ID on failure.
- Keep API keys in the environment or an approved secret manager.
- Use temporary files with restrictive local permissions and remove sensitive
  response data after the workflow finishes.
- Validate HTTPS output URLs, size, content type, and basic image/video decode
  before handing media to another tool.
- Respect prompt rights, model restrictions, and the user's consent for any
  uploaded reference media.

## Limitations

- This is an instruction-only skill; it does not install an SDK or background
  worker.
- Models, schemas, prices, output retention, and supported fields can change;
  the live catalog is authoritative.
- Generation is asynchronous and may take minutes or fail after submission.
- Output URLs can expire and may not be reusable as permanent asset links.
- A successful HTTP response does not guarantee a valid or usable media file.
- This skill does not replace human review of media quality, rights, safety, or
  provider policy compliance.

## Security & Safety Notes

- Treat prompts and reference media as data sent to a third party; obtain
  consent and avoid unnecessary personal or confidential information.
- Never log, echo, commit, or include `MUAPI_API_KEY` in JSON payloads or
  process arguments; pass authenticated curl headers through protected stdin or
  a protected config file.
- Do not forward the API key to output hosts, redirects, browser URLs, or
  user-controlled domains.
- Do not use this workflow for bulk generation, file hosting, or unrelated
  network transfers without explicit authorization.
- Keep generated media in a controlled output directory and inspect it before
  opening or sharing it.

## Common Pitfalls

- **Problem:** The API returns a validation error.
  **Solution:** Fetch the selected model's current schema and rebuild the
  payload from its required fields and allowed values.
- **Problem:** A timeout occurs immediately after POST.
  **Solution:** Preserve the request ID if available and poll it before
  considering any resubmission.
- **Problem:** The output is HTML, JSON, or an empty file.
  **Solution:** Check the HTTPS URL, response status, content type, file size,
  and basic media decode before treating it as generated output.
- **Problem:** A download request would send the API key to a CDN.
  **Solution:** Create a fresh header-free download request and validate every
  redirect destination.

## Additional Resources

- [MuAPI API reference](https://muapi.ai/docs/api-reference) for authentication,
  request lifecycle, and endpoint details.
- [MuAPI AI video API](https://muapi.ai/ai-video-api) for current video
  capabilities and model-oriented discovery.
