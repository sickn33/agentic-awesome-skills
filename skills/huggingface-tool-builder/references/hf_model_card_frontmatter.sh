#!/usr/bin/env bash

set -euo pipefail

show_help() {
    cat << 'USAGE'
Fetch Hugging Face model cards via the hf CLI and summarize frontmatter.

Usage:
  hf_model_card_frontmatter.sh [MODEL_ID ...]
  cat ids.txt | hf_model_card_frontmatter.sh

Description:
  Downloads README.md for each model via `hf download`, extracts YAML
  frontmatter, and emits one JSON object per line (NDJSON) with key fields.
  Uses HF_TOKEN if set (passed to the hf CLI).

Output fields:
  id, license, pipeline_tag, library_name, tags, language,
  new_version, has_extra_gated_prompt

Examples:
  hf_model_card_frontmatter.sh openai/gpt-oss-120b
  cat ids.txt | hf_model_card_frontmatter.sh | jq -s '.'
  hf_model_card_frontmatter.sh meta-llama/Meta-Llama-3-8B \
    | jq -s 'map({id, license, has_extra_gated_prompt})'
USAGE
}

if [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

if ! command -v hf >/dev/null 2>&1; then
    echo "Error: hf CLI is required but not installed" >&2
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required but not installed" >&2
    exit 1
fi

token_args=()
if [[ -n "${HF_TOKEN:-}" ]]; then
    export HF_TOKEN # hf reads the environment; do not duplicate the token in argv.
fi

tmp_dir=$(mktemp -d)
cleanup() {
    rm -rf "$tmp_dir"
}
trap cleanup EXIT

emit_error() {
    local model_id="$1"
    if [[ ! "$model_id" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*(/[A-Za-z0-9][A-Za-z0-9_.-]*)?$ || "$model_id" == *..* ]]; then
        echo "Invalid model ID" >&2; return 1
    fi
    local message="$2"
    python3 - << 'PY' "$model_id" "$message"
import json
import sys

model_id = sys.argv[1]
message = sys.argv[2]
print(json.dumps({"id": model_id, "error": message}))
PY
}

parse_readme() {
    local model_id="$1"
    if [[ ! "$model_id" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*(/[A-Za-z0-9][A-Za-z0-9_.-]*)?$ || "$model_id" == *..* ]]; then
        echo "Invalid model ID" >&2; return 1
    fi
    local readme_path="$2"

    MODEL_ID="$model_id" README_PATH="$readme_path" python3 - << 'PY'
import json
import os
import sys

model_id = os.environ.get("MODEL_ID", "")
readme_path = os.environ.get("README_PATH", "")

try:
    with open(readme_path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
except OSError:
    print(json.dumps({"id": model_id, "error": "readme_missing"}))
    sys.exit(0)

try:
    import yaml
except ImportError:
    print(json.dumps({"id": model_id, "error": "PyYAML_required"}))
    sys.exit(1)
if not lines or lines[0].strip() != "---":
    print(json.dumps({"id": model_id, "error": "frontmatter_missing"}))
    sys.exit(0)
try:
    end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    out = yaml.safe_load("\n".join(lines[1:end]))
    if not isinstance(out, dict):
        raise ValueError("Expected mapping")
except (StopIteration, ValueError, yaml.YAMLError):
    print(json.dumps({"id": model_id, "error": "invalid_frontmatter"}))
    sys.exit(0)

result = {
    "id": model_id,
    "license": out.get("license"),
    "pipeline_tag": out.get("pipeline_tag"),
    "library_name": out.get("library_name"),
    "tags": out.get("tags", []),
    "language": out.get("language", []),
    "new_version": out.get("new_version"),
    "has_extra_gated_prompt": "extra_gated_prompt" in out,
}

print(json.dumps(result))
PY
}

process_id() {
    local model_id="$1"
    if [[ ! "$model_id" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*(/[A-Za-z0-9][A-Za-z0-9_.-]*)?$ || "$model_id" == *..* ]]; then
        echo "Invalid model ID" >&2; return 1
    fi

    if [[ -z "$model_id" ]]; then
        return 0
    fi

    local safe_id
    safe_id=$(printf '%s' "$model_id" | tr '/' '_')
    local local_dir="$tmp_dir/$safe_id"

    if ! hf download "$model_id" README.md --repo-type model --local-dir "$local_dir" "${token_args[@]}" >/dev/null 2>&1; then
        emit_error "$model_id" "download_failed"
        return 0
    fi

    local readme_path="$local_dir/README.md"
    if [[ ! -f "$readme_path" ]]; then
        emit_error "$model_id" "readme_missing"
        return 0
    fi

    parse_readme "$model_id" "$readme_path"
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
