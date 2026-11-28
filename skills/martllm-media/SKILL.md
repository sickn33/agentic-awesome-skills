---
name: martllm-media
description: "Generate images and videos through MartLLM's media API with live model discovery, a free price quote, a hard cost cap and bounded job polling."
category: media
risk: critical
source: self
source_type: self
date_added: "2026-11-28"
author: al-global-tech
tags: [martllm, image-generation, video-generation, media-api]
tools: [claude, codex, cursor, gemini]
---

# MartLLM Media

## Overview

Use MartLLM's media API to generate an image or a video from a prompt, or a
video from a first-frame picture. MartLLM is one API key for image and video
models from many makers. This source-only skill describes model discovery,
schema reading, a free price quote, a capped paid request, bounded polling and
safe download; it does not bundle an SDK, executable or hosted runtime.

The distinction from other media skills is the quote step: every MartLLM media
request accepts `"validate": true`, which returns the exact price without
making or charging anything, and `max_cost`, which makes the paid request fail
at no charge if it could cost more.

## When to Use This Skill

- Use when the user explicitly asks to generate an image or video with MartLLM.
- Use when a workflow already has a `MARTLLM_API_KEY` and needs a picture or a
  short clip made from a prompt or a first frame.
- Use when the user wants the price of an image or video request before paying.
- Do not use this skill for chat or text completion; MartLLM serves those on
  `POST /v1/chat/completions` with a different contract.

## Preconditions

1. Confirm the user is authorized to send the prompt and any reference picture
   to a third-party service.
2. Explain that generation is paid and get approval for the quoted
   `max_cost_usd` ceiling before the paid request in step 4.
3. Require `MARTLLM_API_KEY` in the environment (keys are created at
   `https://martllm.com/dashboard/keys`). Never ask the user to paste it into
   chat, source files, command history or logs.
4. Confirm the output directory and whether the user wants an image or a video.
5. Requires `curl` and `jq`.

## API Contract

| Operation | Method and endpoint | Key |
| --- | --- | --- |
| List image models | `GET https://api.martllm.com/v1/models?type=image` | no |
| List video models | `GET https://api.martllm.com/v1/models?type=video` | no |
| Read one model's options | `GET https://api.martllm.com/v1/models/{id}` | no |
| Hold a reusable quote | `POST https://api.martllm.com/v1/quote` | yes |
| Quote or make an image | `POST https://api.martllm.com/v1/images/generations` | yes |
| Quote or start a video | `POST https://api.martllm.com/v1/video/generations` | yes |
| Poll a video job | `GET https://api.martllm.com/v1/video/generations/{id}` | yes |
| Ask to stop a video job | `DELETE https://api.martllm.com/v1/video/generations/{id}` | yes |
| Download a result | `GET https://api.martllm.com/v1/media/artifacts/{id}/{n}` | yes |

Each model entry has `id`, `available`, `endpoints`, `input_modalities`,
`pricing` and `nsfw`. `GET /v1/models/{id}` adds `parameters`, a JSON Schema
of the request (for example `aspect_ratio`, `resolution`, `duration_seconds`,
`image_url`). Send only fields that schema lists, with values it allows.

## Workflow

### 0. Create a Private Per-Run Workspace

Run the remaining snippets in the same shell session.

```bash
umask 077
mm_tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/martllm-media.XXXXXXXX") || exit 1
chmod 700 -- "$mm_tmp_dir"
trap 'rm -rf -- "$mm_tmp_dir"' EXIT
test -n "${MARTLLM_API_KEY:-}" || { echo "MARTLLM_API_KEY is not set" >&2; exit 1; }
```

### 1. Discover a Model

The catalog changes daily, so never write a model id from memory. List the
models that are available now (no key needed):

```bash
curl --fail --silent --show-error --connect-timeout 10 --max-time 60 \
  "https://api.martllm.com/v1/models?type=video" \
  --output "${mm_tmp_dir:?run workspace setup first}/models.json"

jq -r '.data[] | select(.available and (.nsfw | not))
  | [.id, (.input_modalities | join("+")), "\(.pricing.usd)/\(.pricing.unit)"] | @tsv' \
  "$mm_tmp_dir/models.json"
```

Use `type=image` for pictures. A video model whose `input_modalities` includes
`image` can start from a first frame. When the user names no model, the ids
`best-price:image`, `best-price:text-to-video` and `best-price:image-to-video`
pick the cheapest model that can take the request now; the quote in step 3
names the model that was picked.

Read the chosen model's options before building a request:

```bash
model_id="<id from the list>"
curl --fail --silent --show-error --connect-timeout 10 --max-time 60 \
  "https://api.martllm.com/v1/models/$model_id" \
  | jq '.parameters.properties, .pricing'
```

### 2. Build the Request Body

Build the body in a file so quoting is deterministic and the request can be
reviewed without exposing the key.

Video from a prompt:

```bash
jq -n --arg model "$model_id" \
  --arg prompt "A small paper boat crossing a calm pond, locked camera" \
  '{model: $model, prompt: $prompt, duration_seconds: 5}' \
  > "${mm_tmp_dir:?run workspace setup first}/request.json"
media_url="https://api.martllm.com/v1/video/generations"
```

Image from a prompt (`n` is 1 to 10):

```bash
jq -n --arg model "$model_id" \
  --arg prompt "A paper-cut city map in blue and white, clean editorial style" \
  '{model: $model, prompt: $prompt, n: 1}' \
  > "${mm_tmp_dir:?run workspace setup first}/request.json"
media_url="https://api.martllm.com/v1/images/generations"
```

For image to video, add `image_url` with a public `https://` link to the first
frame, and only if the model's schema lists it.

### 3. Get and Hold the Price (Free)

Send the same body with `"validate": true` for an uncharged preview, or use
`POST /v1/quote` when the user is ready to approve a price. A quote is free,
lasts 15 minutes and is consumed by one matching request. Its `quote_id`
prevents the price from moving between approval and submission.

```bash
jq '. + {validate: true}' "$mm_tmp_dir/request.json" > "$mm_tmp_dir/quote-request.json"

curl --silent --show-error --connect-timeout 10 --max-time 60 \
  --request POST "$media_url" \
  --header @- \
  --header "Content-Type: application/json" \
  --data @"$mm_tmp_dir/quote-request.json" \
  --output "$mm_tmp_dir/quote.json" <<EOF
Authorization: Bearer ${MARTLLM_API_KEY}
EOF

jq '{valid, id, quote_id, model, cost_usd, max_cost_usd, expires_at, defaults_applied, error}' "$mm_tmp_dir/quote.json"
```

Show the user the model, the settings (`defaults_applied` lists settings that
were filled in), `cost_usd` (the listed price) and `max_cost_usd` (the most the
request can be billed and the amount held). Show `expires_at`, and stop unless
the user approves that ceiling before the quote expires.

### 4. Submit One Paid Request

Pin the model and `quote_id` the quote named. Send `max_cost` equal to the
approved `max_cost_usd` as a second ceiling. Do not change the quoted model,
prompt, image or settings; a mismatch is refused as `quote_mismatch`.
For a video, send an `Idempotency-Key` and keep it: the same request sent again
with the same key within 24 hours returns the same job instead of a second one.
Image requests do not take a key; an image request that failed was not charged.

```bash
jq --slurpfile q "$mm_tmp_dir/quote.json" \
  '. + {model: $q[0].model, quote_id: $q[0].quote_id, max_cost: $q[0].max_cost_usd}' \
  "$mm_tmp_dir/request.json" > "$mm_tmp_dir/paid-request.json"
idem_args=()
case "$media_url" in
  */video/generations)
    idem_key=$(uuidgen 2>/dev/null || od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
    idem_args=(--header "Idempotency-Key: $idem_key") ;;
esac

http_code=$(curl --silent --show-error --connect-timeout 10 --max-time 300 \
  --request POST "$media_url" \
  --header @- \
  --header "Content-Type: application/json" \
  "${idem_args[@]}" \
  --data @"$mm_tmp_dir/paid-request.json" \
  --output "$mm_tmp_dir/submit.json" --write-out '%{http_code}' <<EOF
Authorization: Bearer ${MARTLLM_API_KEY}
EOF
)
echo "$http_code"
```

- Image: HTTP 200 returns `data[].url` and `usage.cost_usd` (or
  `usage.cost_pending: true`). Go to step 6.
- Video: HTTP 202 returns `{"id": "<job id>", "status": "queued", ...}`.
  Report the job id and `poll_url`, then go to step 5.
- Any other code: show `jq -r .error.message "$mm_tmp_dir/submit.json"` and
  see Failure Handling. Do not resend a video with a new idempotency key.

### 5. Poll the Video Job with a Deadline

Poll every 10 seconds with a 15-minute wall-clock deadline. Statuses are
`queued`, `running`, `succeeded`, `failed`, `canceled` and `expired`.

```bash
job_id=$(jq -er '.id | select(type == "string" and length > 0)' \
  "${mm_tmp_dir:?run workspace setup first}/submit.json")
poll_url=$(jq -er '.poll_url | select(type == "string" and startswith("/v1/video/generations/"))' \
  "$mm_tmp_dir/submit.json")
deadline=$(( $(date +%s) + 900 ))
while :; do
  curl --silent --show-error --connect-timeout 10 --max-time 60 \
    "https://api.martllm.com$poll_url" \
    --header @- --output "$mm_tmp_dir/job.json" <<EOF
Authorization: Bearer ${MARTLLM_API_KEY}
EOF
  status=$(jq -r '.status // "unknown"' "$mm_tmp_dir/job.json")
  case "$status" in succeeded|failed|canceled|expired) break ;; esac
  [ "$(date +%s)" -ge "$deadline" ] && break
  sleep 10
done
echo "$status"
```

- `failed`, `canceled`, `expired`: report
  `jq -r .error.message "$mm_tmp_dir/job.json"` and the job id. The documented
  contract says these terminal states cost nothing, but a cancel is only a
  request: if the provider already made the clip, the job can still succeed
  and be billed.
- Still `queued` or `running` at the deadline: the job may still finish and be
  billed. Give the user the job id and ask whether to keep waiting or to send
  `DELETE` to the job URL. Never start a second job because the first is slow.
  The provider may complete and bill the job even if nobody polls it.

### 6. Download and Verify the Output

Result links are on `api.martllm.com` and need the same key. Image links are
kept about 15 minutes and video files about 3 hours, so download promptly.
Refuse any result URL that is not on `https://api.martllm.com/` so the key is
never sent to another host.

```bash
result_file="$mm_tmp_dir/submit.json"; result_path='.data[0].url'
[ -f "$mm_tmp_dir/job.json" ] && { result_file="$mm_tmp_dir/job.json"; result_path='.results[0].url'; }
output_url=$(jq -er "$result_path" "$result_file")
case "$output_url" in https://api.martllm.com/*) ;; *) echo "unexpected result host" >&2; exit 1 ;; esac

curl --fail --silent --show-error --connect-timeout 10 --max-time 300 \
  --proto =https --location --max-redirs 3 --proto-redir =https \
  "$output_url" --header @- --output "$mm_tmp_dir/output.bin" <<EOF
Authorization: Bearer ${MARTLLM_API_KEY}
EOF

test -s "$mm_tmp_dir/output.bin"
file "$mm_tmp_dir/output.bin"
```

Copy the file into the user-approved directory under a name that does not
already exist, and pick the extension from the detected type (`.png`, `.jpg`,
`.webp`, `.mp4`). With `n` above 1, download every entry of `data`.

### 7. Report the Result

Report the local path, the model that made it (`model` on the answer or job),
the cost (`usage.cost_usd`) and the request or job id. Right after a video job
succeeds, `usage.cost_usd` can be `null` with `"cost_pending": true` for a few
seconds; poll the job once more, or report `estimated_cost_usd` and that the
final cost is at most `max_cost_usd`. Every request is also listed at
`https://martllm.com/dashboard/logs`.

## Examples

```text
User request: Make a 5-second video of a paper boat on a pond with MartLLM.
Inputs: MARTLLM_API_KEY set, output directory ./out
Expected result (illustrative): the agent lists available video models, quotes
"best-price:text-to-video" for 5 seconds, shows the model and price, waits for
approval, starts one job capped at the quoted max_cost_usd, polls it, and saves
./out/paper-boat.mp4 with the model, cost and job id reported.
```

## Failure Handling

| HTTP | `error.code` | What to do |
| --- | --- | --- |
| 401 | `invalid_api_key`, `missing_api_key` | Stop and ask the user to check the key. Do not print it. |
| 402 | `insufficient_credits` | The balance cannot cover the request. The user adds credit at `https://martllm.com/dashboard/credits`. |
| 400 | `max_cost_too_low` | It could cost more than `max_cost`; nothing was charged. Quote again and get approval for the new price. |
| 400 | `quote_mismatch` | The paid request differs from the quote. Restore the quoted body or obtain a new quote and approval. |
| 400 | `quote_expired` | The 15-minute hold expired. Obtain a new quote and approval. |
| 400 | `invalid_request` | The message lists what the model accepts. Rebuild the body from the model's `parameters`. |
| 400 | `image_required` | The model needs a first frame: add `image_url` or pick a text-to-video model. |
| 400 | `wrong_endpoint` | The model is not served on that route; the message names the right one. |
| 404 | `model_not_found` | Pick an id from the live list in step 1. |
| 409 | `idempotency_key_reused` | That key was used for a different request; use a new key only for a new request. |
| 409 | `quote_used` | That quote already started a request. Do not reuse it; a new request needs a new quote. |
| 429 | `rate_limited` | Wait the seconds in `Retry-After`, then send the same request (a video with the same idempotency key). |
| 503 | `no_available_provider` | No seller can take it now. Try later or pick another model. |

A network timeout on a video submit in step 4 is not proof the request failed:
resend it with the same `Idempotency-Key`, never a new one, so an accepted job
is returned rather than started twice.

## Limitations

- This source-only skill provides operational instructions, not an installed
  client, bundled script, queue worker or retry service.
- Models, schemas, prices and retention times change; the live catalog and the
  quote are authoritative.
- A model being listed does not guarantee a prompt or reference picture is
  accepted by the seller that makes it.
- Video jobs are asynchronous and can take several minutes; long or 4K clips
  take longer.
- Basic file checks do not replace human review of quality, rights or safety.
- The account is prepaid; a request fails with `402` when the balance is too low.

## Security & Safety Notes

- Prompts and reference pictures are sent to MartLLM and to the third-party
  seller that makes the result; get user consent and leave out personal or
  confidential data that is not needed.
- Keep the key in `MARTLLM_API_KEY` or an approved secret manager. The snippets
  pass it on standard input (`--header @-`) so it is not in the process list.
- Send the key only to `https://api.martllm.com/`; refuse result URLs on other
  hosts.
- Redact authorization headers from logs and bug reports.
- Never execute downloaded media as code.
- Follow applicable laws, the content rules of the model's maker and
  intellectual-property rights. Leave out models marked `"nsfw": true` unless
  the user asked for one.

## Related Skills

- `@atlas-cloud-media` - Another hosted media API with a schema-first workflow.
- `@video-router` - Decide whether a request should use generated video before
  submitting a billable task.
- `@image-studio` - Plan and review image-production work around generated
  assets.

Docs: `https://martllm.com/docs/media`
