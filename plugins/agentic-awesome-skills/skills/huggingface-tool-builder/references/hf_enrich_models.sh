#!/usr/bin/env bash

set -euo pipefail

show_help() {
    cat << 'USAGE'
Stream model IDs on stdin, emit one JSON object per line (NDJSON).

Usage:
  hf_enrich_models.sh [MODEL_ID ...]
  cat ids.txt | hf_enrich_models.sh
  baseline_hf_api.sh 50 | jq -r '.[].id' | hf_enrich_models.sh

Description:
  Reads newline-separated model IDs and fetches basic metadata for each.
  Outputs NDJSON with id, downloads, likes, pipeline_tag, tags.
  Uses HF_TOKEN for auth if the environment variable is set.

Examples:
  hf_enrich_models.sh gpt2 distilbert-base-uncased
  baseline_hf_api.sh 50 | jq -r '.[].id' | hf_enrich_models.sh | jq -s 'sort_by(.downloads)'
  HF_TOKEN=your_token hf_enrich_models.sh microsoft/DialoGPT-medium
USAGE
}

if [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

headers=()
if [[ -n "${HF_TOKEN:-}" ]]; then
    headers=(-H "Authorization: Bearer ${HF_TOKEN}")
fi

emit_error() {
    local model_id="$1"
    local message="$2"
    jq -cn --arg id "$model_id" --arg error "$message" '{id: $id, error: $error}'
}

process_id() {
    local model_id="$1"

    if [[ -z "$model_id" ]]; then
        return 0
    fi

    local url="https://huggingface.co/api/models/${model_id}"
    local response
    response=$(curl -s "${headers[@]}" "$url" 2>/dev/null || true)

    if [[ -z "$response" ]]; then
        emit_error "$model_id" "request_failed"
        return 0
    fi

    if ! jq -e . >/dev/null 2>&1 <<<"$response"; then
        emit_error "$model_id" "invalid_json"
        return 0
    fi

    if jq -e '.error' >/dev/null 2>&1 <<<"$response"; then
        emit_error "$model_id" "not_found"
        return 0
    fi

    jq -c --arg id "$model_id" '{
        id: (.id // $id),
        downloads: (.downloads // 0),
        likes: (.likes // 0),
        pipeline_tag: (.pipeline_tag // "unknown"),
        tags: (.tags // [])
    }' <<<"$response" 2>/dev/null || emit_error "$model_id" "parse_failed"
}

if [[ $# -gt 0 ]]; then
    for model_id in "$@"; do
        process_id "$model_id"
    done
    exit 0
fi

if [[ -t 0 ]]; then
    show_help
    exit 1
fi

while IFS= read -r model_id; do
    process_id "$model_id"
done
