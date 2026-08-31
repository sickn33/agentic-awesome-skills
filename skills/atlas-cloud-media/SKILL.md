---
name: atlas-cloud-media
description: "Generate Atlas Cloud images and videos through its asynchronous media API with schema-first model selection and credential-safe polling."
category: media
risk: critical
source: self
source_type: self
date_added: "2026-08-12"
author: binyangzhu000-sudo
tags: [atlas-cloud, image-generation, video-generation, media-api]
tools: [claude, codex, cursor, gemini]
---

# Atlas Cloud Media

## Overview

Use Atlas Cloud's asynchronous media API to generate images or videos. This
source-only skill describes model discovery, schema validation, task
submission, bounded polling, and safe output retrieval; it does not bundle an
SDK, executable, or hosted runtime.

## When to Use This Skill

- Use when the user explicitly asks to generate an image or video with Atlas
  Cloud.
- Use when an existing workflow needs an Atlas Cloud image or video generation
  request and can make HTTPS calls.
- Use when model-specific parameters must be discovered before submission.
- Do not use this skill for OpenAI-compatible text chat; that API has a
  different base URL and contract.

## Preconditions

1. Confirm the user is authorized to send the prompt and any reference media
   to a third-party service.
2. Explain that generation is paid and obtain approval before submitting a
   billable request.
3. Require `ATLASCLOUD_API_KEY` to be present in the environment. Never ask the
   user to paste it into chat, source files, command history, or logs.
4. Confirm the output directory and whether the user wants image generation,
   video generation, or both.

## API Contract

| Operation | Method and endpoint |
| --- | --- |
| List models | `GET https://api.atlascloud.ai/api/v1/models` |
| Generate image | `POST https://api.atlascloud.ai/api/v1/model/generateImage` |
| Generate video | `POST https://api.atlascloud.ai/api/v1/model/generateVideo` |
| Poll task | `GET https://api.atlascloud.ai/api/v1/model/prediction/{id}` |

Generation and polling requests use these headers:

```text
Authorization: Bearer $ATLASCLOUD_API_KEY
Content-Type: application/json
```

The model catalog is public. Each catalog entry includes a `schema` URL; fetch
that schema and validate parameters against it before sending a paid request.
Do not guess parameters from another model, because names such as `size`,
`ratio`, `aspect_ratio`, `image`, and `image_url` are model-specific.

## Workflow

### 0. Create a Private Per-Run Workspace

Run the remaining shell snippets in the same shell session. Create a private
directory before writing prompts, responses, prediction IDs, or signed URLs;
the parameter expansion in later steps fails closed when this setup was skipped.

```bash
umask 077
atlas_tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/atlas-cloud-media.XXXXXXXX") || exit 1
chmod 700 -- "$atlas_tmp_dir"
trap 'rm -rf -- "$atlas_tmp_dir"' EXIT
```

### 1. Discover and Validate a Model

Fetch the catalog, filter by `type` (`Image` or `Video`), and match the user's
requested capability. Read the selected entry's `schema`, verify that all
required fields are present, and show the model and billable action to the user
before submission.

Example discovery request:

```bash
curl --fail --silent --show-error \
  "https://api.atlascloud.ai/api/v1/models" \
  --output "${atlas_tmp_dir:?run private workspace setup first}/models.json"

jq -r '.data[] | select(.type == "Image") | [.model, .displayName, .schema] | @tsv' \
  "$atlas_tmp_dir/models.json"
```

### 2. Submit One Generation Task

Build the JSON body in a file so that quoting is deterministic and request
details can be reviewed without exposing the API key.

Image example using a catalog-confirmed model:

```bash
jq -n \
  --arg model "qwen-image-3.0/text-to-image" \
  --arg prompt "A paper-cut city map in blue and white, clean editorial style" \
  '{model: $model, prompt: $prompt, size: "1024*1024", n: 1}' \
  > "${atlas_tmp_dir:?run private workspace setup first}/request.json"

curl --fail --silent --show-error \
  --request POST \
  "https://api.atlascloud.ai/api/v1/model/generateImage" \
  --header "Authorization: Bearer $ATLASCLOUD_API_KEY" \
  --header "Content-Type: application/json" \
  --data @"$atlas_tmp_dir/request.json" \
  --output "$atlas_tmp_dir/submit.json"
```

Video example using a catalog-confirmed model:

```bash
jq -n \
  --arg model "bytedance/seedance-2.0-fast/text-to-video" \
  --arg prompt "A small paper boat crossing a calm pond, locked camera" \
  '{
    model: $model,
    prompt: $prompt,
    duration: 4,
    resolution: "480p",
    ratio: "16:9",
    generate_audio: false,
    watermark: false
  }' > "${atlas_tmp_dir:?run private workspace setup first}/request.json"

curl --fail --silent --show-error \
  --request POST \
  "https://api.atlascloud.ai/api/v1/model/generateVideo" \
  --header "Authorization: Bearer $ATLASCLOUD_API_KEY" \
  --header "Content-Type: application/json" \
  --data @"$atlas_tmp_dir/request.json" \
  --output "$atlas_tmp_dir/submit.json"
```

Check that `.data.id` is a non-empty string before polling. Treat a non-2xx
response or a missing ID as submission failure; do not retry a billable request
automatically because the original task may still have been accepted.

### 3. Poll with a Deadline

Poll every three seconds. Accept `completed` or `succeeded` as success, stop on
`failed` or `timeout`, and stop after ten minutes. Preserve the prediction ID
for diagnostics, but never log request headers or the API key.

```bash
prediction_id=$(jq -er '.data.id | select(type == "string" and length > 0)' \
  "${atlas_tmp_dir:?run private workspace setup first}/submit.json")

for attempt in $(seq 1 200); do
  sleep 3
  curl --fail --silent --show-error \
    "https://api.atlascloud.ai/api/v1/model/prediction/$prediction_id" \
    --header "Authorization: Bearer $ATLASCLOUD_API_KEY" \
    --output "$atlas_tmp_dir/prediction.json"

  status=$(jq -r '.data.status // "unknown"' "$atlas_tmp_dir/prediction.json")
  case "$status" in
    completed|succeeded) break ;;
    failed|timeout)
      jq -r '.data.error // "Atlas Cloud generation failed"' \
        "$atlas_tmp_dir/prediction.json" >&2
      exit 1
      ;;
  esac
done

test "$status" = "completed" || test "$status" = "succeeded"
```

### 4. Download and Verify the Output

Read the first HTTPS URL from `.data.outputs`. Atlas output URLs are temporary,
so download promptly. Do not send `Authorization` or any other Atlas request
headers to the output host. Reject non-HTTPS URLs and inspect the downloaded
file's content type and size before treating it as a valid deliverable.

```bash
output_url=$(jq -er '.data.outputs[0] | select(startswith("https://"))' \
  "${atlas_tmp_dir:?run private workspace setup first}/prediction.json")

curl --fail --silent --show-error --location \
  "$output_url" \
  --output "$atlas_tmp_dir/output.bin"

test -s "$atlas_tmp_dir/output.bin"
file "$atlas_tmp_dir/output.bin"

# ATLAS_OUTPUT_DIR must be the user-approved destination. Resolve it to a
# physical directory, copy into an exclusive same-directory temporary file,
# then create the final name with one atomic hard-link operation. `ln` fails if
# any target already exists, including a dangling symlink.
atlas_output_dir=$(cd -- "${ATLAS_OUTPUT_DIR:?set the approved output directory}" && pwd -P) || exit 1
atlas_output_path="$atlas_output_dir/atlas-output.bin"
if ! (
  set -eu
  umask 077
  atlas_publish_tmp=$(mktemp "$atlas_output_dir/.atlas-output.XXXXXXXX")
  trap 'rm -f -- "$atlas_publish_tmp"' EXIT
  cp -- "$atlas_tmp_dir/output.bin" "$atlas_publish_tmp"
  chmod 644 -- "$atlas_publish_tmp"
  ln -- "$atlas_publish_tmp" "$atlas_output_path"
); then
  printf '%s\n' "Refusing to overwrite or redirect $atlas_output_path" >&2
  exit 1
fi
```

Rename the file only after its detected type is known. Report the local path,
model ID, dimensions or duration, and whether the output passed basic playback
or decode validation.

## Failure Handling

- `401` or `403`: stop and ask the user to verify access. Do not print or rotate
  the key automatically.
- `400` or `422`: fetch the model's current schema and correct the payload. Do
  not blindly resubmit.
- `429`: stop and report rate limiting; respect any `Retry-After` value.
- `5xx` or network timeout: first poll a known prediction ID. Do not create a
  second paid task unless the user approves the possible duplicate charge.
- `failed` or `timeout`: report the sanitized service error and prediction ID;
  do not claim an output was generated.
- Missing or invalid media: keep the original response for diagnosis, do not
  overwrite an existing destination, and do not mark the task complete.

## Best Practices

- Use the public catalog and per-model schema immediately before generation.
- Keep request and response artifacts in one private per-run directory and let
  the exit trap remove them, especially prediction payloads with signed URLs.
- Submit one task at a time unless the user explicitly approves a batch and its
  cost.
- Keep prompts, reference-media rights, and provider content policies visible
  in the approval step.
- Use short polling intervals only while a task is active; always enforce a
  deadline.
- Download expiring outputs promptly and validate them locally.
- Never forward the Atlas bearer token to CDN or user-supplied URLs.

## Limitations

- This source-only skill provides operational instructions, not an installed
  Atlas Cloud client, bundled script, queue worker, or retry service.
- Available models, schemas, prices, and output retention can change; the live
  catalog is authoritative.
- Model availability does not guarantee a prompt or reference asset is allowed.
- Generation is asynchronous and may take several minutes.
- Basic file checks do not replace human review of media quality, factual
  accuracy, rights, or safety.

## Security & Safety Notes

- Treat prompts and uploaded media as data sent to a third party; obtain user
  consent first and avoid unnecessary personal or confidential information.
- Keep credentials in environment variables or an approved secret manager.
- Redact authorization headers and signed output URLs from logs and bug reports.
- Never execute downloaded media as code, and never use this workflow for bulk
  hosting or unrelated file transfer.
- Follow applicable laws, provider policies, and intellectual-property rights.

## Common Pitfalls

- **Problem:** A payload copied from another model returns a validation error.
  **Solution:** Fetch the selected catalog entry's current `schema` and rebuild
  the request from that schema.
- **Problem:** A network timeout causes a duplicate paid request.
  **Solution:** Preserve and poll the original prediction ID before considering
  a resubmission.
- **Problem:** The downloaded file is HTML or JSON instead of media.
  **Solution:** Check the HTTP status, content type, file signature, and size
  before renaming or publishing it.
- **Problem:** Output download leaks the API key to another host.
  **Solution:** Use a fresh download request with no Atlas authorization header.

## Related Skills

- `@video-router` - Decide whether a request should use generated video before
  submitting a billable task.
- `@image-studio` - Plan and review image-production work around generated
  assets.
