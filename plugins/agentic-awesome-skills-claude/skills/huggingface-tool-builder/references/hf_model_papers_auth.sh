#!/usr/bin/env bash

# Hugging Face Model Papers Tool with Authentication
# Fetches papers referenced by Hugging Face models using HF_TOKEN if available

set -euo pipefail

# Help function
show_help() {
    cat << EOF
Hugging Face Model Papers Tool with Authentication

This tool fetches papers referenced by Hugging Face models.
Supports authentication via HF_TOKEN environment variable.

Usage:
    $0 [OPTIONS]

Options:
    MODEL_ID            Specific model to analyze (e.g., microsoft/DialoGPT-medium)
    --trending [N]      Show papers for top N trending models (default: 5)
    --help              Show this help message

Environment Variables:
    HF_TOKEN            Hugging Face API token (optional, for private models)

Examples:
    # Get papers for a specific model
    $0 microsoft/DialoGPT-medium

    # Get papers with authentication
    HF_TOKEN=your_token_here $0 your-private-model

    # Get papers for top 3 trending models
    $0 --trending 3

EOF
}

# Function to make authenticated API calls
hf_api_call() {
    local url="$1"
    local headers=()

    # Add authentication header if HF_TOKEN is set
    if [[ -n "${HF_TOKEN:-}" ]]; then
        headers+=(-H "Authorization: Bearer $HF_TOKEN")
    fi

    curl -s "${headers[@]}" "$url" 2>/dev/null || echo '{"error": "Network error"}'
}

# Function to extract papers from text
extract_papers() {
    local text="$1"
    local title="$2"

    echo "$title"

    # Find ArXiv URLs
    local arxiv_urls=$(echo "$text" | grep -oE 'https?://arxiv\.org/[^[:space:]\])]+' | head -5)
    if [[ -n "$arxiv_urls" ]]; then
        echo "ArXiv Papers:"
        echo "$arxiv_urls" | sed 's/^/  • /'
    fi

    # Find DOI URLs
    local doi_urls=$(echo "$text" | grep -oE 'https?://doi\.org/[^[:space:]\])]+' | head -3)
    if [[ -n "$doi_urls" ]]; then
        echo "DOI Papers:"
        echo "$doi_urls" | sed 's/^/  • /'
    fi

    # Find arxiv IDs in format YYYY.NNNNN
    local arxiv_ids=$(echo "$text" | grep -oE 'arXiv:[0-9]{4}\.[0-9]{4,5}' | head -5)
    if [[ -n "$arxiv_ids" ]]; then
        echo "ArXiv IDs:"
        echo "$arxiv_ids" | sed 's/^/  • /'
    fi

    # Check for paper mentions
    if echo "$text" | grep -qi "paper\|publication\|citation"; then
        local paper_mentions=$(echo "$text" | grep -i -A1 -B1 "paper\|publication" | head -6)
        if [[ -n "$paper_mentions" ]]; then
            echo "Paper mentions:"
            echo "$paper_mentions" | sed 's/^/  /'
        fi
    fi

    if [[ -z "$arxiv_urls" && -z "$doi_urls" && -z "$arxiv_ids" ]]; then
        echo "No papers found in model card"
    fi
}

# Function to get model papers
get_model_papers() {
    local model_id="$1"

    echo "=== $model_id ==="

    # Get model info from API with authentication
    local api_url="https://huggingface.co/api/models/$model_id"
    local response=$(hf_api_call "$api_url")

    if echo "$response" | grep -q '"error"'; then
        echo "Error: Could not fetch model '$model_id'"
        if [[ -z "${HF_TOKEN:-}" ]]; then
            echo "Note: This might be a private model. Try setting HF_TOKEN environment variable."
        fi
        return 1
    fi

    # Parse basic info
    local downloads=$(echo "$response" | jq -r '.downloads // 0')
    local likes=$(echo "$response" | jq -r '.likes // 0')
    echo "Downloads: $downloads | Likes: $likes"

    # Get model card
    local card_url="https://huggingface.co/$model_id/raw/main/README.md"
    local card_content=$(curl -s "$card_url" 2>/dev/null || echo "")

    if [[ -n "$card_content" ]]; then
        extract_papers "$card_content" "Papers from model card:"
    else
        echo "Could not fetch model card"
    fi

    # Check tags for arxiv references
    local arxiv_tag=$(echo "$response" | jq -r '.tags[]' 2>/dev/null | grep arxiv || true)
    if [[ -n "$arxiv_tag" ]]; then
        echo "ArXiv from tags: $arxiv_tag"
    fi

    echo
}

# Function to get trending models
get_trending_models() {
    local limit="${1:-5}"

    echo "Fetching top $limit trending models..."

    local trending_url="https://huggingface.co/api/trending?type=model&limit=$limit"
    local response=$(hf_api_call "$trending_url")

    echo "$response" | jq -r '.recentlyTrending[] | .repoData.id' | head -"$limit" | while read -r model_id; do
        if [[ -n "$model_id" ]]; then
            get_model_papers "$model_id"
        fi
    done
}

# Main
if [[ $# -eq 0 ]]; then
    echo "Error: No arguments provided"
    show_help
    exit 1
fi

if [[ "$1" == "--help" ]]; then
    show_help
    exit 0
elif [[ "$1" == "--trending" ]]; then
    if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
        get_trending_models "$2"
    else
        get_trending_models 5
    fi
else
    get_model_papers "$1"
fi
